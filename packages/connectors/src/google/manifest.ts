import type { ConnectorManifest } from "@continuum/contracts";
import { GOOGLE_CONNECTOR_SCOPES } from "./oauth.js";

/**
 * The REAL Google Workspace connector manifest — one authorization covers
 * Drive, Gmail, and Calendar with readonly scopes only. Distinct from the
 * `mock-google-*` manifests (Demo Mode); no `(mock)` labeling here because this
 * adapter speaks to real Google APIs once its OAuth app is configured.
 */
export const googleWorkspaceManifest: ConnectorManifest = {
  id: "google-workspace",
  displayName: "Google Workspace",
  category: "documents",
  logo: "connectors/google-workspace.svg",
  version: "0.1.0",
  auth: "oauth2",
  oauthScopes: [...GOOGLE_CONNECTOR_SCOPES],
  capabilities: ["search", "read"],
  entityTypes: ["document", "folder", "email", "event"],
  dataModes: ["user_selected", "live_only"],
  supportsWebhooks: false,
  rateLimitNotes: "Google API per-user quotas apply; requests are low-volume and user-initiated.",
  dataRetentionNotes:
    "Continuum stores only items you explicitly import. Live search results are not persisted.",
  permissionsDescription:
    "Read-only access to Drive files, Gmail messages, and Calendar events. Continuum can never modify, send, or delete anything in your Google account.",
  requiredConfig: [],
  status: "beta",
};
