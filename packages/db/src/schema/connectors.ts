import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./identity.js";
import { spaces } from "./context-org.js";

/** Connector platform tables (spec §15, §27). Credentials live in the vault, never here. */

export const connectorDefinitions = pgTable("connector_definitions", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  category: text("category").notNull(),
  version: text("version").notNull(),
  manifest: jsonb("manifest").$type<Record<string, unknown>>().notNull(),
  status: text("status", { enum: ["beta", "stable", "mock", "deprecated"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const connectorInstallations = pgTable(
  "connector_installations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    spaceId: text("space_id").references(() => spaces.id),
    connectorId: text("connector_id")
      .notNull()
      .references(() => connectorDefinitions.id),
    dataMode: text("data_mode", {
      enum: ["live_only", "sync_metadata", "sync_content", "user_selected"],
    }).notNull(),
    status: text("status", { enum: ["connected", "error", "revoked", "mock"] }).notNull(),
    // Opaque reference into the credential vault (spec §25.6–7).
    credentialRef: text("credential_ref"),
    // Optional installer metadata — not part of the ConnectorInstallation
    // contract, so nullable (the Gateway records the actor via the audit trail).
    installedBy: text("installed_by"),
    installedAt: timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("connector_installations_org_idx").on(t.organizationId)],
);

export const connectorScopes = pgTable("connector_scopes", {
  id: text("id").primaryKey(),
  installationId: text("installation_id")
    .notNull()
    .references(() => connectorInstallations.id),
  scope: text("scope").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const connectorSyncJobs = pgTable(
  "connector_sync_jobs",
  {
    id: text("id").primaryKey(),
    installationId: text("installation_id")
      .notNull()
      .references(() => connectorInstallations.id),
    mode: text("mode", { enum: ["full", "incremental", "webhook"] }).notNull(),
    status: text("status", {
      enum: ["queued", "running", "succeeded", "failed", "cancelled"],
    }).notNull(),
    itemsProcessed: integer("items_processed").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("connector_sync_jobs_installation_idx").on(t.installationId, t.status)],
);

export const connectorSyncCursors = pgTable("connector_sync_cursors", {
  id: text("id").primaryKey(),
  installationId: text("installation_id")
    .notNull()
    .references(() => connectorInstallations.id),
  stream: text("stream").notNull(),
  cursor: text("cursor").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const connectorWebhookEvents = pgTable("connector_webhook_events", {
  id: text("id").primaryKey(),
  installationId: text("installation_id")
    .notNull()
    .references(() => connectorInstallations.id),
  eventType: text("event_type").notNull(),
  // Verified + normalized payload only; raw provider payloads are retained
  // per the retention policy, never dumped here.
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const connectorHealthEvents = pgTable("connector_health_events", {
  id: text("id").primaryKey(),
  installationId: text("installation_id")
    .notNull()
    .references(() => connectorInstallations.id),
  status: text("status", { enum: ["healthy", "degraded", "failing"] }).notNull(),
  detail: text("detail"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

/** External item index tables (spec §17, §27). */

export const externalItems = pgTable(
  "external_items",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    spaceId: text("space_id").references(() => spaces.id),
    connectorId: text("connector_id").notNull(),
    installationId: text("installation_id")
      .notNull()
      .references(() => connectorInstallations.id),
    externalId: text("external_id").notNull(),
    externalParentId: text("external_parent_id"),
    type: text("type").notNull(),
    title: text("title"),
    content: text("content"),
    summary: text("summary"),
    author: jsonb("author").$type<Record<string, unknown> | null>(),
    externalUrl: text("external_url"),
    mimeType: text("mime_type"),
    sensitivity: text("sensitivity", {
      enum: ["public", "internal", "confidential", "highly_sensitive", "restricted"],
    })
      .notNull()
      .default("internal"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    contentHash: text("content_hash"),
    externalCreatedAt: timestamp("external_created_at", { withTimezone: true }),
    externalUpdatedAt: timestamp("external_updated_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("external_items_installation_external_idx").on(t.installationId, t.externalId),
    index("external_items_space_idx").on(t.spaceId),
  ],
);

export const externalItemVersions = pgTable("external_item_versions", {
  id: text("id").primaryKey(),
  externalItemId: text("external_item_id")
    .notNull()
    .references(() => externalItems.id),
  version: integer("version").notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const externalItemPermissions = pgTable("external_item_permissions", {
  id: text("id").primaryKey(),
  externalItemId: text("external_item_id")
    .notNull()
    .references(() => externalItems.id),
  visibility: text("visibility", {
    enum: ["private", "shared", "org", "public", "unknown"],
  }).notNull(),
  allowedEmails: jsonb("allowed_emails").$type<string[]>().notNull().default([]),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const externalItemRelations = pgTable("external_item_relations", {
  id: text("id").primaryKey(),
  fromItemId: text("from_item_id")
    .notNull()
    .references(() => externalItems.id),
  toItemId: text("to_item_id")
    .notNull()
    .references(() => externalItems.id),
  relation: text("relation", { enum: ["parent", "reply", "mentions", "attachment"] }).notNull(),
});
