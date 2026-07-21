import type { ConnectorManifest } from "@continuum/contracts";
import { createMockConnector } from "./mock-factory.js";

/**
 * The six MVP connector targets (spec §21), shipped as deterministic mocks.
 * Real provider adapters land behind feature flags once OAuth credentials are
 * configured and their flows are verified end to end — never before.
 */

function manifest(
  partial: Omit<ConnectorManifest, "logo" | "version" | "status">,
): ConnectorManifest {
  return { ...partial, logo: `connectors/${partial.id}.svg`, version: "0.1.0", status: "mock" };
}

export const mockGoogleDrive = createMockConnector(
  manifest({
    id: "mock-google-drive",
    displayName: "Google Drive (mock)",
    category: "documents",
    auth: "mock",
    oauthScopes: ["drive.readonly"],
    capabilities: ["search", "read", "sync_metadata", "sync_content"],
    entityTypes: ["document", "folder"],
    dataModes: ["live_only", "sync_metadata", "user_selected"],
    supportsWebhooks: false,
    rateLimitNotes: "mock: unlimited",
    dataRetentionNotes: "mock data only",
    permissionsDescription: "Read files you explicitly select.",
    requiredConfig: [],
  }),
  [
    {
      externalId: "doc-brand-guide",
      type: "document",
      title: "Northbank Brand Guide v4",
      content:
        "Voice: precise, calm, professional. Audience: small-business CFOs. Product name: Northbank Flex.",
      authorName: "Jordan Lee",
    },
    {
      externalId: "doc-campaign-brief",
      type: "document",
      title: "March Campaign Brief",
      content: "March newsletter scope, deliverables, and the compliance review checklist.",
      authorName: "Priya Sharma",
    },
  ],
);

export const mockGmail = createMockConnector(
  manifest({
    id: "mock-gmail",
    displayName: "Gmail (mock)",
    category: "email",
    auth: "mock",
    oauthScopes: ["gmail.readonly"],
    capabilities: ["search", "read", "draft"],
    entityTypes: ["email"],
    dataModes: ["live_only", "user_selected"],
    supportsWebhooks: false,
    rateLimitNotes: "mock: unlimited",
    dataRetentionNotes: "mock data only",
    permissionsDescription: "Search and read mail; drafts are never sent without confirmation.",
    requiredConfig: [],
  }),
  [
    {
      externalId: "email-feedback",
      type: "email",
      title: "Re: February newsletter feedback",
      content: "Jordan approved the February newsletter tone. Keep the evidence-led style.",
      authorName: "Jordan Lee",
    },
  ],
);

export const mockGoogleCalendar = createMockConnector(
  manifest({
    id: "mock-google-calendar",
    displayName: "Google Calendar (mock)",
    category: "calendar",
    auth: "mock",
    oauthScopes: ["calendar.readonly"],
    capabilities: ["search", "read", "sync_metadata"],
    entityTypes: ["event"],
    dataModes: ["sync_metadata", "live_only"],
    supportsWebhooks: false,
    rateLimitNotes: "mock: unlimited",
    dataRetentionNotes: "mock data only",
    permissionsDescription: "Read event titles and times.",
    requiredConfig: [],
  }),
  [
    {
      externalId: "event-compliance-review",
      type: "event",
      title: "Northbank compliance review",
      content: "March 17, 10:00 — compliance review for the March newsletter.",
    },
  ],
);

export const mockSlack = createMockConnector(
  manifest({
    id: "mock-slack",
    displayName: "Slack (mock)",
    category: "communication",
    auth: "mock",
    oauthScopes: ["channels:history", "channels:read"],
    capabilities: ["search", "read", "draft"],
    entityTypes: ["message"],
    dataModes: ["live_only", "sync_content"],
    supportsWebhooks: true,
    rateLimitNotes: "mock: unlimited",
    dataRetentionNotes: "mock data only",
    permissionsDescription: "Read messages in channels you approve.",
    requiredConfig: [],
  }),
  [
    {
      externalId: "msg-deadline-change",
      type: "message",
      title: "Slack message from Priya",
      content:
        "Heads up — legal pushed the March newsletter launch. New deadline is March 21, not March 14.",
      authorName: "Priya Sharma",
    },
  ],
);

export const mockNotion = createMockConnector(
  manifest({
    id: "mock-notion",
    displayName: "Notion (mock)",
    category: "knowledge",
    auth: "mock",
    oauthScopes: ["read_content"],
    capabilities: ["search", "read", "sync_content"],
    entityTypes: ["page"],
    dataModes: ["sync_content", "user_selected"],
    supportsWebhooks: false,
    rateLimitNotes: "mock: unlimited",
    dataRetentionNotes: "mock data only",
    permissionsDescription: "Read pages in workspaces you approve.",
    requiredConfig: [],
  }),
  [
    {
      externalId: "page-fizzpop-playbook",
      type: "page",
      title: "FizzPop Brand Playbook",
      content: "Energetic, playful, surprising. Emojis allowed. Audience: college students.",
    },
  ],
);

export const mockGitHub = createMockConnector(
  manifest({
    id: "mock-github",
    displayName: "GitHub (mock)",
    category: "development",
    auth: "mock",
    oauthScopes: ["repo:read"],
    capabilities: ["search", "read"],
    entityTypes: ["issue", "pull_request"],
    dataModes: ["live_only"],
    supportsWebhooks: true,
    rateLimitNotes: "mock: unlimited",
    dataRetentionNotes: "mock data only",
    permissionsDescription: "Read issues and pull requests in selected repositories.",
    requiredConfig: [],
  }),
  [
    {
      externalId: "issue-42",
      type: "issue",
      title: "Landing page: newsletter signup form",
      content: "Build the signup form for the Northbank March newsletter landing page.",
    },
  ],
);

export const allMockConnectors = [
  mockGoogleDrive,
  mockGmail,
  mockGoogleCalendar,
  mockSlack,
  mockNotion,
  mockGitHub,
];
