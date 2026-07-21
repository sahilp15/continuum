import { z } from "zod";

/** Memory types supported by the canonical memory model (spec §10). */
export const memoryTypeSchema = z.enum([
  "hard_rule",
  "compliance_rule",
  "fact",
  "audience",
  "voice",
  "preference",
  "decision",
  "deadline",
  "relationship",
  "person",
  "organization",
  "product",
  "service",
  "terminology",
  "example",
  "anti_example",
  "project_state",
  "goal",
  "task",
  "process",
  "location",
  "reference",
]);
export type MemoryType = z.infer<typeof memoryTypeSchema>;

/** Memory lifecycle statuses. Only `approved` memory may be treated as canonical. */
export const memoryStatusSchema = z.enum([
  "proposed",
  "approved",
  "rejected",
  "superseded",
  "expired",
  "deleted",
]);
export type MemoryStatus = z.infer<typeof memoryStatusSchema>;

/**
 * Sensitivity labels. A requesting integration must be authorized for the
 * sensitivity level of every memory or source it receives.
 */
export const sensitivitySchema = z.enum([
  "public",
  "internal",
  "confidential",
  "highly_sensitive",
  "restricted",
]);
export type Sensitivity = z.infer<typeof sensitivitySchema>;

/** Ordered from least to most sensitive, used for allowance checks. */
export const SENSITIVITY_ORDER: readonly Sensitivity[] = [
  "public",
  "internal",
  "confidential",
  "highly_sensitive",
  "restricted",
];

export function sensitivityRank(level: Sensitivity): number {
  return SENSITIVITY_ORDER.indexOf(level);
}

/**
 * Deterministic context precedence (spec §5). Lower number wins.
 * A lower-priority layer must never override a higher-priority layer.
 */
export const precedenceLayerSchema = z.enum([
  "security_policy",
  "space_compliance_rule",
  "space_hard_rule",
  "project_fact",
  "space_approved_fact",
  "space_audience_voice",
  "personal_preference",
  "historical_example",
  "unapproved_inferred",
]);
export type PrecedenceLayer = z.infer<typeof precedenceLayerSchema>;

export const PRECEDENCE_ORDER: readonly PrecedenceLayer[] = [
  "security_policy",
  "space_compliance_rule",
  "space_hard_rule",
  "project_fact",
  "space_approved_fact",
  "space_audience_voice",
  "personal_preference",
  "historical_example",
  "unapproved_inferred",
];

export function precedenceRank(layer: PrecedenceLayer): number {
  return PRECEDENCE_ORDER.indexOf(layer);
}

/** Source authority describes how trustworthy a source is as evidence. */
export const sourceAuthoritySchema = z.enum([
  "user_stated",
  "user_approved_document",
  "connected_system",
  "inferred",
]);
export type SourceAuthority = z.infer<typeof sourceAuthoritySchema>;

/** Connector capability declarations (spec §16). */
export const connectorCapabilitySchema = z.enum([
  "search",
  "read",
  "sync_metadata",
  "sync_content",
  "draft",
  "create",
  "update",
  "send",
  "delete",
  "webhook",
  "export",
]);
export type ConnectorCapability = z.infer<typeof connectorCapabilitySchema>;

/** Connector data retrieval modes (spec §18). */
export const connectorDataModeSchema = z.enum([
  "live_only",
  "sync_metadata",
  "sync_content",
  "user_selected",
]);
export type ConnectorDataMode = z.infer<typeof connectorDataModeSchema>;

/** Connector action safety levels (spec §20). The MVP focuses on levels 1–3. */
export const actionLevelSchema = z.enum([
  "search",
  "read",
  "draft",
  "confirmed_action",
  "approved_automation",
]);
export type ActionLevel = z.infer<typeof actionLevelSchema>;
