import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./identity.js";

/** Governance and commercial tables (spec §27). */

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    // Redacted structured detail; secrets are stripped before write.
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    requestingIntegration: text("requesting_integration"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_events_org_time_idx").on(t.organizationId, t.createdAt)],
);

export const usageEvents = pgTable("usage_events", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  kind: text("kind").notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deletionRequests = pgTable("deletion_requests", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  scope: text("scope", { enum: ["account", "space", "source", "memory"] }).notNull(),
  resourceId: text("resource_id").notNull(),
  requestedBy: text("requested_by").notNull(),
  status: text("status", {
    enum: ["pending", "soft_deleted", "purged", "cancelled"],
  }).notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  purgedAt: timestamp("purged_at", { withTimezone: true }),
});

export const exports = pgTable("exports", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  scope: text("scope", { enum: ["account", "space"] }).notNull(),
  resourceId: text("resource_id").notNull(),
  requestedBy: text("requested_by").notNull(),
  status: text("status", { enum: ["pending", "ready", "failed", "expired"] }).notNull(),
  storageKey: text("storage_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const retentionPolicies = pgTable("retention_policies", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  resourceType: text("resource_type").notNull(),
  retainDays: integer("retain_days").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  plan: text("plan", { enum: ["free", "pro", "team"] })
    .notNull()
    .default("free"),
  status: text("status", {
    enum: ["active", "trialing", "past_due", "canceled"],
  }).notNull(),
  externalCustomerRef: text("external_customer_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionItems = pgTable("subscription_items", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id")
    .notNull()
    .references(() => subscriptions.id),
  sku: text("sku").notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const usageLimits = pgTable("usage_limits", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  kind: text("kind").notNull(),
  monthlyLimit: integer("monthly_limit").notNull(),
});

/** PostgreSQL-backed job queue for the worker app (spec §26). */
export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status", {
      enum: ["queued", "running", "succeeded", "failed", "dead"],
    })
      .notNull()
      .default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    lockedBy: text("locked_by"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jobs_status_run_after_idx").on(t.status, t.runAfter)],
);
