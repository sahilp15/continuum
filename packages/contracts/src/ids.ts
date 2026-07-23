import { z } from "zod";

/**
 * All Continuum IDs are prefixed strings (`mem_…`, `spc_…`) so an ID is
 * self-describing in logs, receipts, and audit events without being guessable.
 */
export const idSchema = z.string().min(4).max(64);

export const organizationIdSchema = idSchema.startsWith("org_");
export const userIdSchema = idSchema.startsWith("usr_");
export const spaceIdSchema = idSchema.startsWith("spc_");
export const projectIdSchema = idSchema.startsWith("prj_");
export const sessionIdSchema = idSchema.startsWith("ses_");
export const memoryIdSchema = idSchema.startsWith("mem_");
export const suggestionIdSchema = idSchema.startsWith("sug_");
export const sourceIdSchema = idSchema.startsWith("src_");
export const connectorInstallationIdSchema = idSchema.startsWith("cin_");
export const credentialRefSchema = idSchema.startsWith("cred_");
export const contextBundleIdSchema = idSchema.startsWith("ctx_");
export const preflightCheckIdSchema = idSchema.startsWith("pfc_");
export const auditEventIdSchema = idSchema.startsWith("aud_");
export const externalItemIdSchema = idSchema.startsWith("ext_");

export type OrganizationId = z.infer<typeof organizationIdSchema>;
export type UserId = z.infer<typeof userIdSchema>;
export type SpaceId = z.infer<typeof spaceIdSchema>;
export type ProjectId = z.infer<typeof projectIdSchema>;
export type SessionId = z.infer<typeof sessionIdSchema>;
export type MemoryId = z.infer<typeof memoryIdSchema>;
export type SuggestionId = z.infer<typeof suggestionIdSchema>;
export type SourceId = z.infer<typeof sourceIdSchema>;
export type ConnectorInstallationId = z.infer<typeof connectorInstallationIdSchema>;
export type CredentialRef = z.infer<typeof credentialRefSchema>;
export type ContextBundleId = z.infer<typeof contextBundleIdSchema>;
export type PreflightCheckId = z.infer<typeof preflightCheckIdSchema>;
export type AuditEventId = z.infer<typeof auditEventIdSchema>;
export type ExternalItemId = z.infer<typeof externalItemIdSchema>;

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Generate a prefixed random ID, e.g. `newId("mem")` → `mem_k3f9…`. */
export function newId(prefix: string, length = 20): string {
  let body = "";
  for (let i = 0; i < length; i += 1) {
    body += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return `${prefix}_${body}`;
}
