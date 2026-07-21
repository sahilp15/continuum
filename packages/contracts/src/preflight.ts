import { z } from "zod";
import { memoryIdSchema, preflightCheckIdSchema, spaceIdSchema } from "./ids.js";
import { isoDateTimeSchema } from "./tenancy.js";

export const preflightSeveritySchema = z.enum(["info", "warning", "error", "blocker"]);
export type PreflightSeverity = z.infer<typeof preflightSeveritySchema>;

export const preflightCategorySchema = z.enum([
  "banned_terminology",
  "required_terminology",
  "missing_disclaimer",
  "prohibited_claim",
  "deprecated_product_name",
  "incorrect_capitalization",
  "exact_name_rule",
  "outdated_date",
  "contradicts_approved_fact",
  "missing_call_to_action",
  "missing_project_requirement",
  "cross_space_mention",
  "tone_mismatch",
  "audience_mismatch",
  "unsupported_claim",
  "other",
]);
export type PreflightCategory = z.infer<typeof preflightCategorySchema>;

/**
 * A single preflight finding (spec §24). Model-assisted findings are never
 * presented as guaranteed legal, financial, or compliance conclusions.
 */
export const preflightFindingSchema = z.object({
  severity: preflightSeveritySchema,
  category: preflightCategorySchema,
  explanation: z.string().min(1).max(2000),
  excerpt: z.string().max(500),
  violatedRuleMemoryId: memoryIdSchema.nullable().default(null),
  violatedRuleText: z.string().max(2000).nullable().default(null),
  ruleSource: z.string().max(300).nullable().default(null),
  suggestedCorrection: z.string().max(2000).nullable().default(null),
  confidence: z.number().min(0).max(1),
  deterministic: z.boolean(),
});
export type PreflightFinding = z.infer<typeof preflightFindingSchema>;

export const preflightResultSchema = z.object({
  id: preflightCheckIdSchema,
  spaceId: spaceIdSchema,
  checkedAt: isoDateTimeSchema,
  findings: z.array(preflightFindingSchema),
  passed: z.boolean(),
});
export type PreflightResult = z.infer<typeof preflightResultSchema>;
