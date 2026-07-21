import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./identity.js";
import { projects, spaces } from "./context-org.js";
import { memories } from "./memory.js";

/** Context generation and preflight tables (spec §12–13, §24, §27). */

export const contextRequests = pgTable(
  "context_requests",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id),
    projectId: text("project_id").references(() => projects.id),
    requestingIntegration: text("requesting_integration", {
      enum: ["web_app", "browser_extension", "mcp", "api", "internal"],
    }).notNull(),
    actorId: text("actor_id").notNull(),
    taskDescription: text("task_description").notNull().default(""),
    query: text("query").notNull().default(""),
    tokenBudget: integer("token_budget").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("context_requests_space_idx").on(t.spaceId)],
);

export const contextBundles = pgTable("context_bundles", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => contextRequests.id),
  renderedText: text("rendered_text").notNull(),
  receipt: jsonb("receipt").$type<Record<string, unknown>>().notNull(),
  totalEstimatedTokens: integer("total_estimated_tokens").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contextBundleItems = pgTable("context_bundle_items", {
  id: text("id").primaryKey(),
  bundleId: text("bundle_id")
    .notNull()
    .references(() => contextBundles.id),
  memoryId: text("memory_id")
    .notNull()
    .references(() => memories.id),
  layer: text("layer").notNull(),
  reason: text("reason").notNull(),
  estimatedTokens: integer("estimated_tokens").notNull(),
});

export const contextFeedback = pgTable("context_feedback", {
  id: text("id").primaryKey(),
  bundleId: text("bundle_id")
    .notNull()
    .references(() => contextBundles.id),
  actorId: text("actor_id").notNull(),
  rating: text("rating", { enum: ["useful", "partially_useful", "not_useful"] }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const preflightChecks = pgTable("preflight_checks", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  spaceId: text("space_id")
    .notNull()
    .references(() => spaces.id),
  projectId: text("project_id").references(() => projects.id),
  actorId: text("actor_id").notNull(),
  contentHash: text("content_hash").notNull(),
  passed: text("passed", { enum: ["true", "false"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const preflightFindings = pgTable("preflight_findings", {
  id: text("id").primaryKey(),
  checkId: text("check_id")
    .notNull()
    .references(() => preflightChecks.id),
  severity: text("severity", { enum: ["info", "warning", "error", "blocker"] }).notNull(),
  category: text("category").notNull(),
  explanation: text("explanation").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  violatedRuleMemoryId: text("violated_rule_memory_id").references(() => memories.id),
  deterministic: text("deterministic", { enum: ["true", "false"] }).notNull(),
});

export const preflightFeedback = pgTable("preflight_feedback", {
  id: text("id").primaryKey(),
  findingId: text("finding_id")
    .notNull()
    .references(() => preflightFindings.id),
  actorId: text("actor_id").notNull(),
  verdict: text("verdict", { enum: ["accepted", "dismissed"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
