import { z } from "zod";
import { precedenceLayerSchema, sensitivitySchema } from "./enums.js";
import {
  contextBundleIdSchema,
  memoryIdSchema,
  organizationIdSchema,
  projectIdSchema,
  sessionIdSchema,
  sourceIdSchema,
  spaceIdSchema,
} from "./ids.js";
import { isoDateTimeSchema } from "./tenancy.js";

/** Which surface is asking for context. Recorded on every bundle and receipt. */
export const requestingIntegrationSchema = z.enum([
  "web_app",
  "browser_extension",
  "mcp",
  "api",
  "internal",
]);
export type RequestingIntegration = z.infer<typeof requestingIntegrationSchema>;

/** Input to the ContextCompiler (spec §12). */
export const contextRequestSchema = z.object({
  organizationId: organizationIdSchema,
  spaceId: spaceIdSchema,
  projectId: projectIdSchema.nullable().default(null),
  sessionId: sessionIdSchema.nullable().default(null),
  requestingIntegration: requestingIntegrationSchema,
  taskDescription: z.string().max(4000).default(""),
  query: z.string().max(1000).default(""),
  outputType: z.string().max(100).default("general"),
  tokenBudget: z.number().int().min(200).max(32_000).default(4000),
  /** Highest sensitivity level the requesting integration may receive. */
  sensitivityAllowance: sensitivitySchema.default("confidential"),
});
export type ContextRequest = z.input<typeof contextRequestSchema>;

export const contextItemSchema = z.object({
  memoryId: memoryIdSchema,
  layer: precedenceLayerSchema,
  title: z.string(),
  text: z.string(),
  reason: z.string(),
  sourceIds: z.array(sourceIdSchema),
  estimatedTokens: z.number().int().min(0),
});
export type ContextItem = z.infer<typeof contextItemSchema>;

export const contextExclusionSchema = z.object({
  memoryId: memoryIdSchema.nullable(),
  title: z.string(),
  reason: z.enum([
    "rejected",
    "expired",
    "superseded",
    "deleted",
    "unapproved",
    "sensitivity_blocked",
    "budget_exceeded",
    "conflict_loser",
    "not_relevant",
  ]),
  detail: z.string().default(""),
});
export type ContextExclusion = z.infer<typeof contextExclusionSchema>;

/**
 * Every generated context package carries a receipt (spec §13) so the user can
 * always answer: what was used, where it came from, why it was selected, and
 * what conflicting information was excluded.
 */
export const contextReceiptSchema = z.object({
  bundleId: contextBundleIdSchema,
  spaceName: z.string(),
  projectName: z.string().nullable(),
  requestingIntegration: requestingIntegrationSchema,
  generatedAt: isoDateTimeSchema,
  rules: z.array(contextItemSchema),
  facts: z.array(contextItemSchema),
  audienceAndVoice: z.array(contextItemSchema),
  examples: z.array(contextItemSchema),
  personalPreferences: z.array(contextItemSchema),
  sources: z.array(z.object({ sourceId: sourceIdSchema, title: z.string() })),
  excluded: z.array(contextExclusionSchema),
  totalEstimatedTokens: z.number().int().min(0),
});
export type ContextReceipt = z.infer<typeof contextReceiptSchema>;

export const contextBundleSchema = z.object({
  id: contextBundleIdSchema,
  request: contextRequestSchema,
  /** Structured items, highest precedence first. */
  items: z.array(contextItemSchema),
  /** Human-readable context block ready to paste into an AI surface. */
  renderedText: z.string(),
  receipt: contextReceiptSchema,
  createdAt: isoDateTimeSchema,
});
export type ContextBundle = z.infer<typeof contextBundleSchema>;
