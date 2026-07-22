import type { SealedSecret, SealedSecretStore } from "@continuum/integrations";
import { eq } from "drizzle-orm";
import type { ContinuumDatabase } from "../client.js";
import { credentialSecrets } from "../schema/index.js";

/**
 * Drizzle-backed {@link SealedSecretStore}. Persists ONLY AES-256-GCM ciphertext
 * and the key version that sealed it (see `schema/vault.ts`) — plaintext and the
 * encryption keys never touch the database. Compose with
 * `createEncryptedCredentialVault` from `@continuum/integrations` to get a real
 * `CredentialVaultProvider` for the connector Gateway.
 */
export function createDrizzleSealedSecretStore(db: ContinuumDatabase): SealedSecretStore {
  return {
    async put(ref, sealed) {
      const now = new Date();
      await db
        .insert(credentialSecrets)
        .values({
          ref,
          keyVersion: sealed.keyVersion,
          iv: sealed.iv,
          ciphertext: sealed.ciphertext,
          authTag: sealed.authTag,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: credentialSecrets.ref,
          set: {
            keyVersion: sealed.keyVersion,
            iv: sealed.iv,
            ciphertext: sealed.ciphertext,
            authTag: sealed.authTag,
            updatedAt: now,
          },
        });
    },
    async get(ref): Promise<SealedSecret | null> {
      const rows = await db
        .select({
          keyVersion: credentialSecrets.keyVersion,
          iv: credentialSecrets.iv,
          ciphertext: credentialSecrets.ciphertext,
          authTag: credentialSecrets.authTag,
        })
        .from(credentialSecrets)
        .where(eq(credentialSecrets.ref, ref));
      const row = rows[0];
      return row
        ? {
            keyVersion: row.keyVersion,
            iv: row.iv,
            ciphertext: row.ciphertext,
            authTag: row.authTag,
          }
        : null;
    },
    async delete(ref) {
      await db.delete(credentialSecrets).where(eq(credentialSecrets.ref, ref));
    },
    async list() {
      return db
        .select({ ref: credentialSecrets.ref, keyVersion: credentialSecrets.keyVersion })
        .from(credentialSecrets);
    },
  };
}
