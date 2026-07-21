import { index, integer, jsonb, pgTable, text, timestamp, vector } from "drizzle-orm/pg-core";
import { organizations } from "./identity.js";
import { spaces } from "./context-org.js";

/** Source tables (spec §9 layer 1, §27). Sources are evidence, not truth. */

export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id),
    kind: text("kind", {
      enum: ["url", "pasted_text", "upload", "connector_item"],
    }).notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    externalUrl: text("external_url"),
    connectorInstallationId: text("connector_installation_id"),
    authority: text("authority", {
      enum: ["user_stated", "user_approved_document", "connected_system", "inferred"],
    }).notNull(),
    sensitivity: text("sensitivity", {
      enum: ["public", "internal", "confidential", "highly_sensitive", "restricted"],
    })
      .notNull()
      .default("internal"),
    contentHash: text("content_hash"),
    importedBy: text("imported_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("sources_space_idx").on(t.spaceId)],
);

export const sourceVersions = pgTable("source_versions", {
  id: text("id").primaryKey(),
  sourceId: text("source_id")
    .notNull()
    .references(() => sources.id),
  version: integer("version").notNull(),
  contentHash: text("content_hash").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    // Denormalized Space scope so vector queries are always Space-filtered
    // BEFORE similarity search — never global retrieval filtered afterward.
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("source_chunks_space_idx").on(t.spaceId, t.sourceId)],
);

export const sourcePermissions = pgTable("source_permissions", {
  id: text("id").primaryKey(),
  sourceId: text("source_id")
    .notNull()
    .references(() => sources.id),
  visibility: text("visibility", {
    enum: ["private", "shared", "org", "public", "unknown"],
  }).notNull(),
  allowedEmails: jsonb("allowed_emails").$type<string[]>().notNull().default([]),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});
