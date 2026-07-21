import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./identity.js";
import { projects, spaces } from "./context-org.js";
import { sources } from "./sources.js";

/** Memory tables (spec §10, §27). Every memory is scoped to org + Space. */

export const memories = pgTable(
  "memories",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id),
    projectId: text("project_id").references(() => projects.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    canonicalText: text("canonical_text").notNull(),
    structuredValue: jsonb("structured_value").$type<Record<string, unknown> | null>(),
    status: text("status", {
      enum: ["proposed", "approved", "rejected", "superseded", "expired", "deleted"],
    }).notNull(),
    priority: integer("priority").notNull().default(50),
    confidence: doublePrecision("confidence").notNull().default(1),
    sensitivity: text("sensitivity", {
      enum: ["public", "internal", "confidential", "highly_sensitive", "restricted"],
    })
      .notNull()
      .default("internal"),
    sourceAuthority: text("source_authority", {
      enum: ["user_stated", "user_approved_document", "connected_system", "inferred"],
    })
      .notNull()
      .default("user_stated"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    supersedesMemoryId: text("supersedes_memory_id"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    // Space-scoped retrieval is the hot path; the org index backs tenancy audits.
    index("memories_space_status_idx").on(t.spaceId, t.status),
    index("memories_org_idx").on(t.organizationId),
    index("memories_project_idx").on(t.projectId),
  ],
);

export const memoryVersions = pgTable(
  "memory_versions",
  {
    id: text("id").primaryKey(),
    memoryId: text("memory_id")
      .notNull()
      .references(() => memories.id),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    changedBy: text("changed_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("memory_versions_memory_idx").on(t.memoryId)],
);

export const memoryRelations = pgTable(
  "memory_relations",
  {
    id: text("id").primaryKey(),
    fromMemoryId: text("from_memory_id")
      .notNull()
      .references(() => memories.id),
    toMemoryId: text("to_memory_id")
      .notNull()
      .references(() => memories.id),
    relation: text("relation", {
      enum: ["supersedes", "contradicts", "supports", "duplicates", "relates_to"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("memory_relations_from_idx").on(t.fromMemoryId)],
);

export const memorySources = pgTable(
  "memory_sources",
  {
    id: text("id").primaryKey(),
    memoryId: text("memory_id")
      .notNull()
      .references(() => memories.id),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    excerpt: text("excerpt"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("memory_sources_memory_idx").on(t.memoryId)],
);

export const suggestions = pgTable(
  "suggestions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id),
    projectId: text("project_id").references(() => projects.id),
    memoryType: text("memory_type").notNull(),
    title: text("title").notNull(),
    proposedText: text("proposed_text").notNull(),
    structuredValue: jsonb("structured_value").$type<Record<string, unknown> | null>(),
    conflictsWithMemoryId: text("conflicts_with_memory_id").references(() => memories.id),
    previousValueText: text("previous_value_text"),
    sourceId: text("source_id").references(() => sources.id),
    sourceExcerpt: text("source_excerpt"),
    confidence: doublePrecision("confidence").notNull(),
    rationale: text("rationale").notNull(),
    suggestedExpiresAt: timestamp("suggested_expires_at", { withTimezone: true }),
    status: text("status", {
      enum: ["pending", "accepted", "edited", "kept_temporary", "rejected"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by").references(() => users.id),
  },
  (t) => [index("suggestions_space_status_idx").on(t.spaceId, t.status)],
);

export const suggestionActions = pgTable("suggestion_actions", {
  id: text("id").primaryKey(),
  suggestionId: text("suggestion_id")
    .notNull()
    .references(() => suggestions.id),
  action: text("action", {
    enum: ["accepted", "edited", "kept_temporary", "rejected"],
  }).notNull(),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  resultingMemoryId: text("resulting_memory_id").references(() => memories.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  memoryId: text("memory_id")
    .notNull()
    .references(() => memories.id),
  approvedBy: text("approved_by")
    .notNull()
    .references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
