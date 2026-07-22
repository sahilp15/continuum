/**
 * Real credential vault (spec §25.6–7): authenticated encryption for connector
 * credentials with a versioned, server-side key that supports rotation.
 *
 * Secrets are sealed with AES-256-GCM. The encryption keys live OUTSIDE the
 * database — they are loaded from the `CONTINUUM_CREDENTIAL_KEYS` environment
 * variable, never persisted with the ciphertext. The database only ever holds
 * the sealed blob plus the key VERSION used to seal it, so a database dump alone
 * cannot reveal any credential. Key material and plaintext are never logged.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { CredentialVaultProvider } from "./providers.js";

/**
 * A sealed secret: ciphertext plus everything needed to open it EXCEPT the key.
 * `keyVersion` selects which versioned key decrypts it (enabling rotation). All
 * binary fields are base64. This is what the {@link SealedSecretStore} persists.
 */
export interface SealedSecret {
  keyVersion: number;
  iv: string;
  ciphertext: string;
  authTag: string;
}

/**
 * Persistence for sealed secrets, keyed by an opaque credential ref. The store
 * only ever sees ciphertext — it can neither read nor write plaintext. `list`
 * exposes each ref's key version so rotation can find stale entries without
 * decrypting them.
 */
export interface SealedSecretStore {
  put(ref: string, sealed: SealedSecret): Promise<void>;
  get(ref: string): Promise<SealedSecret | null>;
  delete(ref: string): Promise<void>;
  list(): Promise<Array<{ ref: string; keyVersion: number }>>;
}

/** Versioned AES-256-GCM key material. Seals with the newest key, opens with
 *  whichever version sealed a given secret. */
export interface CredentialKeyring {
  readonly activeVersion: number;
  seal(plaintext: string): SealedSecret;
  open(sealed: SealedSecret): string;
}

const KEY_BYTES = 32; // AES-256
const IV_BYTES = 12; // GCM standard nonce length

/** Generate a fresh base64 AES-256 key — for local/dev setup of
 *  `CONTINUUM_CREDENTIAL_KEYS`. Never commit the output. */
export function generateCredentialKey(): string {
  return randomBytes(KEY_BYTES).toString("base64");
}

/**
 * Build a keyring from `CONTINUUM_CREDENTIAL_KEYS`, a comma-separated list of
 * `v<N>:<base64 32-byte key>` entries (e.g. `v1:AAAA…,v2:BBBB…`). The highest
 * version is the ACTIVE key used to seal new secrets; older versions are kept so
 * their existing ciphertext can still be opened until rotation re-seals it.
 */
export function createCredentialKeyring(raw: string): CredentialKeyring {
  const keys = new Map<number, Buffer>();
  for (const entry of raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const match = /^v(\d+):(.+)$/.exec(entry);
    if (!match) {
      throw new Error("CONTINUUM_CREDENTIAL_KEYS entries must look like 'v1:<base64 32-byte key>'");
    }
    const version = Number(match[1]);
    const key = Buffer.from(match[2]!, "base64");
    if (key.length !== KEY_BYTES) {
      throw new Error(
        `credential key v${version} must be a 32-byte AES-256 key (got ${key.length} bytes)`,
      );
    }
    if (keys.has(version)) throw new Error(`duplicate credential key version v${version}`);
    keys.set(version, key);
  }
  if (keys.size === 0) {
    throw new Error("CONTINUUM_CREDENTIAL_KEYS must define at least one key");
  }
  const activeVersion = Math.max(...keys.keys());

  return {
    activeVersion,
    seal(plaintext) {
      const key = keys.get(activeVersion)!;
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      return {
        keyVersion: activeVersion,
        iv: iv.toString("base64"),
        ciphertext: ciphertext.toString("base64"),
        authTag: cipher.getAuthTag().toString("base64"),
      };
    },
    open(sealed) {
      const key = keys.get(sealed.keyVersion);
      if (!key) {
        throw new Error(
          `no credential key for version v${sealed.keyVersion} — the key that sealed this secret is not loaded`,
        );
      }
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64"));
      decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
      // `final()` throws if the GCM tag fails — tampered ciphertext never opens.
      return Buffer.concat([
        decipher.update(Buffer.from(sealed.ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8");
    },
  };
}

/** A vault that additionally supports rotating every stored secret onto the
 *  active key. `rotate` is not part of the base provider interface. */
export type RotatableCredentialVault = CredentialVaultProvider & {
  /** Re-seal every secret not already on the active key version. Returns how
   *  many were re-sealed out of the total. */
  rotate(): Promise<{ total: number; rotated: number }>;
};

/**
 * The real {@link CredentialVaultProvider}: seals on `store`, opens on
 * `retrieve`, and destroys ciphertext on `revoke`. Drop-in for the Gateway's
 * `vault` dependency; back it with the in-memory store (tests) or the
 * Drizzle-backed store (app).
 */
export function createEncryptedCredentialVault(opts: {
  keyring: CredentialKeyring;
  store: SealedSecretStore;
  name?: string;
}): RotatableCredentialVault {
  const { keyring, store: secretStore } = opts;
  return {
    name: opts.name ?? "aes-256-gcm-credential-vault",
    async store(ref, secret) {
      await secretStore.put(ref, keyring.seal(secret));
    },
    async retrieve(ref) {
      const sealed = await secretStore.get(ref);
      return sealed ? keyring.open(sealed) : null;
    },
    async revoke(ref) {
      await secretStore.delete(ref);
    },
    async rotate() {
      const entries = await secretStore.list();
      let rotated = 0;
      for (const { ref, keyVersion } of entries) {
        if (keyVersion === keyring.activeVersion) continue;
        const sealed = await secretStore.get(ref);
        if (!sealed) continue;
        await secretStore.put(ref, keyring.seal(keyring.open(sealed)));
        rotated += 1;
      }
      return { total: entries.length, rotated };
    },
  };
}

/** In-memory sealed-secret store for unit tests and Demo Mode. Holds ciphertext
 *  only, exactly like the real store. */
export function createInMemorySealedSecretStore(): SealedSecretStore {
  const map = new Map<string, SealedSecret>();
  return {
    put(ref, sealed) {
      map.set(ref, { ...sealed });
      return Promise.resolve();
    },
    get(ref) {
      const sealed = map.get(ref);
      return Promise.resolve(sealed ? { ...sealed } : null);
    },
    delete(ref) {
      map.delete(ref);
      return Promise.resolve();
    },
    list() {
      return Promise.resolve(
        [...map.entries()].map(([ref, sealed]) => ({ ref, keyVersion: sealed.keyVersion })),
      );
    },
  };
}
