import { z } from "zod";
import { connectorCapabilitySchema, connectorDataModeSchema, sensitivitySchema } from "./enums.js";
import {
  connectorInstallationIdSchema,
  externalItemIdSchema,
  organizationIdSchema,
  spaceIdSchema,
} from "./ids.js";
import { isoDateTimeSchema } from "./tenancy.js";

/** Declarative connector manifest (spec §16). A connector must never perform an undeclared action. */
export const connectorManifestSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,48}$/, "connector ids are lowercase kebab-case"),
  displayName: z.string().min(1).max(100),
  category: z.enum([
    "ai_assistant",
    "email",
    "calendar",
    "communication",
    "documents",
    "knowledge",
    "project_management",
    "development",
    "crm",
    "design",
    "database",
    "automation",
    "other",
  ]),
  logo: z.string().max(200).default(""),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  auth: z.enum(["oauth2", "api_key", "none", "mock"]),
  oauthScopes: z.array(z.string()).default([]),
  capabilities: z.array(connectorCapabilitySchema).min(1),
  entityTypes: z.array(z.string()).min(1),
  dataModes: z.array(connectorDataModeSchema).min(1),
  supportsWebhooks: z.boolean().default(false),
  rateLimitNotes: z.string().max(1000).default(""),
  dataRetentionNotes: z.string().max(1000).default(""),
  permissionsDescription: z.string().max(2000).default(""),
  requiredConfig: z.array(z.string()).default([]),
  status: z.enum(["beta", "stable", "mock"]),
});
export type ConnectorManifest = z.infer<typeof connectorManifestSchema>;

export const normalizedPersonSchema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email().optional(),
  externalId: z.string().max(200).optional(),
});
export type NormalizedPerson = z.infer<typeof normalizedPersonSchema>;

export const normalizedPermissionSetSchema = z.object({
  visibility: z.enum(["private", "shared", "org", "public", "unknown"]),
  allowedEmails: z.array(z.string().email()).default([]),
});
export type NormalizedPermissionSet = z.infer<typeof normalizedPermissionSetSchema>;

export const externalItemTypeSchema = z.enum([
  "email",
  "message",
  "document",
  "event",
  "task",
  "contact",
  "person",
  "record",
  "issue",
  "pull_request",
  "comment",
  "folder",
  "page",
]);
export type ExternalItemType = z.infer<typeof externalItemTypeSchema>;

/** All connectors normalize provider data into this shape (spec §17). */
export const normalizedExternalItemSchema = z.object({
  id: externalItemIdSchema,
  organizationId: organizationIdSchema,
  spaceId: spaceIdSchema.optional(),
  connectorId: z.string(),
  installationId: connectorInstallationIdSchema,
  externalId: z.string(),
  externalParentId: z.string().optional(),
  type: externalItemTypeSchema,
  title: z.string().optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  author: normalizedPersonSchema.optional(),
  participants: z.array(normalizedPersonSchema).optional(),
  externalUrl: z.string().url().optional(),
  mimeType: z.string().optional(),
  createdAt: isoDateTimeSchema.optional(),
  updatedAt: isoDateTimeSchema.optional(),
  deletedAt: isoDateTimeSchema.optional(),
  permissions: normalizedPermissionSetSchema,
  sensitivity: sensitivitySchema.default("internal"),
  metadata: z.record(z.string(), z.unknown()).default({}),
  contentHash: z.string().optional(),
  version: z.string().optional(),
});
export type NormalizedExternalItem = z.infer<typeof normalizedExternalItemSchema>;

export const connectorInstallationSchema = z.object({
  id: connectorInstallationIdSchema,
  organizationId: organizationIdSchema,
  spaceId: spaceIdSchema.nullable().default(null),
  connectorId: z.string(),
  dataMode: connectorDataModeSchema,
  status: z.enum(["connected", "error", "revoked", "mock"]),
  /** Reference into the credential vault. Never the credential itself. */
  credentialRef: z.string().nullable().default(null),
  grantedScopes: z.array(z.string()).default([]),
  installedAt: isoDateTimeSchema,
  revokedAt: isoDateTimeSchema.nullable().default(null),
});
export type ConnectorInstallation = z.infer<typeof connectorInstallationSchema>;
