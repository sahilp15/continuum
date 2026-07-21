import { z } from "zod";
import {
  memoryStatusSchema,
  memoryTypeSchema,
  sensitivitySchema,
  sourceAuthoritySchema,
} from "./enums.js";
import {
  memoryIdSchema,
  organizationIdSchema,
  projectIdSchema,
  sourceIdSchema,
  spaceIdSchema,
  suggestionIdSchema,
  userIdSchema,
} from "./ids.js";
import { isoDateTimeSchema } from "./tenancy.js";

/**
 * The canonical memory record (spec §10). Every memory carries enough
 * provenance to be understandable, permissioned, and reversible.
 */
export const memorySchema = z.object({
  id: memoryIdSchema,
  organizationId: organizationIdSchema,
  spaceId: spaceIdSchema,
  projectId: projectIdSchema.nullable().default(null),
  type: memoryTypeSchema,
  title: z.string().min(1).max(300),
  /** Human-readable canonical statement, e.g. "Launch deadline is March 21". */
  canonicalText: z.string().min(1).max(4000),
  /** Optional machine-readable value, e.g. { date: "2026-03-21" }. */
  structuredValue: z.record(z.string(), z.unknown()).nullable().default(null),
  status: memoryStatusSchema,
  /** 0 = highest priority within its precedence layer. */
  priority: z.number().int().min(0).max(100).default(50),
  confidence: z.number().min(0).max(1).default(1),
  sensitivity: sensitivitySchema.default("internal"),
  sourceAuthority: sourceAuthoritySchema.default("user_stated"),
  validFrom: isoDateTimeSchema.nullable().default(null),
  validUntil: isoDateTimeSchema.nullable().default(null),
  createdBy: userIdSchema.or(z.literal("system")),
  approvedBy: userIdSchema.nullable().default(null),
  approvedAt: isoDateTimeSchema.nullable().default(null),
  /** Set when this memory replaces an older one. */
  supersedesMemoryId: memoryIdSchema.nullable().default(null),
  /** Approved memories this one is known to contradict. */
  contradictsMemoryIds: z.array(memoryIdSchema).default([]),
  /** Evidence trail: sources this memory was derived from. */
  sourceIds: z.array(sourceIdSchema).default([]),
  version: z.number().int().min(1).default(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.nullable().default(null),
});
export type Memory = z.infer<typeof memorySchema>;

export const memoryDraftSchema = memorySchema.omit({
  id: true,
  status: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  approvedBy: true,
  approvedAt: true,
});
export type MemoryDraft = z.input<typeof memoryDraftSchema>;

/**
 * A candidate memory suggestion awaiting user review (spec §11).
 * Session/candidate information must never silently become permanent memory.
 */
export const suggestionSchema = z.object({
  id: suggestionIdSchema,
  organizationId: organizationIdSchema,
  spaceId: spaceIdSchema,
  projectId: projectIdSchema.nullable().default(null),
  memoryType: memoryTypeSchema,
  title: z.string().min(1).max(300),
  proposedText: z.string().min(1).max(4000),
  structuredValue: z.record(z.string(), z.unknown()).nullable().default(null),
  /** The approved memory this candidate conflicts with, if any. */
  conflictsWithMemoryId: memoryIdSchema.nullable().default(null),
  previousValueText: z.string().max(4000).nullable().default(null),
  sourceId: sourceIdSchema.nullable().default(null),
  sourceExcerpt: z.string().max(2000).nullable().default(null),
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(1000),
  suggestedExpiresAt: isoDateTimeSchema.nullable().default(null),
  status: z.enum(["pending", "accepted", "edited", "kept_temporary", "rejected"]),
  createdAt: isoDateTimeSchema,
  resolvedAt: isoDateTimeSchema.nullable().default(null),
  resolvedBy: userIdSchema.nullable().default(null),
});
export type Suggestion = z.infer<typeof suggestionSchema>;
