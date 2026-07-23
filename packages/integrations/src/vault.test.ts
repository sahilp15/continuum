import { describe, expect, it } from "vitest";
import {
  createCredentialKeyring,
  createEncryptedCredentialVault,
  createInMemorySealedSecretStore,
  generateCredentialKey,
} from "./vault.js";

const KEY_V1 = `v1:${generateCredentialKey()}`;
const KEY_V2 = `v2:${generateCredentialKey()}`;

describe("credential keyring", () => {
  it("seals with the highest version and round-trips", () => {
    const keyring = createCredentialKeyring(`${KEY_V1},${KEY_V2}`);
    expect(keyring.activeVersion).toBe(2);
    const sealed = keyring.seal("super-secret-token");
    expect(sealed.keyVersion).toBe(2);
    expect(sealed.ciphertext).not.toContain("super-secret-token");
    expect(keyring.open(sealed)).toBe("super-secret-token");
  });

  it("uses a fresh IV per seal (no deterministic ciphertext)", () => {
    const keyring = createCredentialKeyring(KEY_V1);
    const a = keyring.seal("same");
    const b = keyring.seal("same");
    expect(a.iv).not.toEqual(b.iv);
    expect(a.ciphertext).not.toEqual(b.ciphertext);
  });

  it("cannot open a secret whose key version is not loaded", () => {
    const sealed = createCredentialKeyring(`${KEY_V1},${KEY_V2}`).seal("x");
    const onlyV1 = createCredentialKeyring(KEY_V1);
    expect(() => onlyV1.open(sealed)).toThrow(/no credential key for version v2/);
  });

  it("rejects tampered ciphertext (GCM auth tag)", () => {
    const keyring = createCredentialKeyring(KEY_V1);
    const sealed = keyring.seal("do-not-tamper");
    const flipped = Buffer.from(sealed.ciphertext, "base64");
    flipped[0] ^= 0xff;
    expect(() => keyring.open({ ...sealed, ciphertext: flipped.toString("base64") })).toThrow();
  });

  it("rejects a non-32-byte key and malformed entries", () => {
    expect(() => createCredentialKeyring("v1:c2hvcnQ=")).toThrow(/32-byte/);
    expect(() => createCredentialKeyring("not-a-key")).toThrow(/v1:/);
    expect(() => createCredentialKeyring("")).toThrow(/at least one key/);
    expect(() => createCredentialKeyring(`${KEY_V1},${KEY_V1}`)).toThrow(/duplicate/);
  });
});

describe("encrypted credential vault", () => {
  it("stores, retrieves, and revokes", async () => {
    const vault = createEncryptedCredentialVault({
      keyring: createCredentialKeyring(KEY_V1),
      store: createInMemorySealedSecretStore(),
    });
    await vault.store("cred_abc", "refresh-token-123");
    expect(await vault.retrieve("cred_abc")).toBe("refresh-token-123");
    await vault.revoke("cred_abc");
    expect(await vault.retrieve("cred_abc")).toBeNull();
  });

  it("never persists plaintext in the backing store", async () => {
    const store = createInMemorySealedSecretStore();
    const vault = createEncryptedCredentialVault({
      keyring: createCredentialKeyring(KEY_V1),
      store,
    });
    await vault.store("cred_abc", "PLAINTEXT-SECRET");
    const entries = await store.list();
    expect(entries).toHaveLength(1);
    const sealed = await store.get("cred_abc");
    expect(JSON.stringify(sealed)).not.toContain("PLAINTEXT-SECRET");
  });

  it("rotates old-version secrets onto the active key and still decrypts", async () => {
    const store = createInMemorySealedSecretStore();
    // Seal under v1 only.
    const v1Vault = createEncryptedCredentialVault({
      keyring: createCredentialKeyring(KEY_V1),
      store,
    });
    await v1Vault.store("cred_1", "one");
    await v1Vault.store("cred_2", "two");

    // Rotate under a keyring that has both v1 and v2 (active = v2).
    const rotatingVault = createEncryptedCredentialVault({
      keyring: createCredentialKeyring(`${KEY_V1},${KEY_V2}`),
      store,
    });
    const summary = await rotatingVault.rotate();
    expect(summary).toEqual({ total: 2, rotated: 2 });
    expect((await store.get("cred_1"))?.keyVersion).toBe(2);
    expect(await rotatingVault.retrieve("cred_1")).toBe("one");
    expect(await rotatingVault.retrieve("cred_2")).toBe("two");

    // A second rotation is a no-op (already on the active key).
    expect(await rotatingVault.rotate()).toEqual({ total: 2, rotated: 0 });

    // After rotation, a v2-only keyring can still open everything.
    const v2Only = createEncryptedCredentialVault({
      keyring: createCredentialKeyring(KEY_V2),
      store,
    });
    expect(await v2Only.retrieve("cred_1")).toBe("one");
  });
});
