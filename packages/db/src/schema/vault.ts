import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Credential vault storage (spec §25.6–7). Rows hold ONLY the AES-256-GCM
 * ciphertext and the key version that sealed it — never plaintext, never the
 * encryption key (keys live in `CONTINUUM_CREDENTIAL_KEYS`, outside the DB). The
 * primary key is the opaque `credential_ref` stored on
 * `connector_installations.credential_ref`. Revocation deletes the row.
 */
export const credentialSecrets = pgTable("credential_secrets", {
  ref: text("ref").primaryKey(),
  keyVersion: integer("key_version").notNull(),
  iv: text("iv").notNull(),
  ciphertext: text("ciphertext").notNull(),
  authTag: text("auth_tag").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
