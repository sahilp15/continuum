import { z } from "zod";
import { sensitivitySchema, sourceAuthoritySchema } from "./enums.js";
import {
  connectorInstallationIdSchema,
  organizationIdSchema,
  sourceIdSchema,
  spaceIdSchema,
  userIdSchema,
} from "./ids.js";
import { isoDateTimeSchema } from "./tenancy.js";

/**
 * Layer 1 of the information model (spec §9): a source is evidence, not truth.
 * Imported text is always untrusted data — instructions inside it carry no
 * authority over system behavior.
 */
export const sourceSchema = z.object({
  id: sourceIdSchema,
  organizationId: organizationIdSchema,
  spaceId: spaceIdSchema,
  kind: z.enum(["url", "pasted_text", "upload", "connector_item"]),
  title: z.string().min(1).max(300),
  /** Normalized plain-text content. Raw provider payloads are never stored here. */
  content: z.string().max(500_000),
  externalUrl: z.string().url().nullable().default(null),
  connectorInstallationId: connectorInstallationIdSchema.nullable().default(null),
  authority: sourceAuthoritySchema,
  sensitivity: sensitivitySchema.default("internal"),
  contentHash: z.string().max(128).nullable().default(null),
  importedBy: userIdSchema.or(z.literal("system")),
  createdAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.nullable().default(null),
});
export type Source = z.infer<typeof sourceSchema>;
