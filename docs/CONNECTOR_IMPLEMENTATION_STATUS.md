# Connector Implementation Status

Honest, per-connector status. This file is the source of truth for what is real vs mock vs
placeholder. **A connector is never shown as "Connected" unless a real OAuth + retrieval flow has
been verified end to end.** Mocks are labeled `(mock)` / `status: "mock"` and only appear inside
clearly-labeled Demo Mode.

## Platform pieces

| Piece                                                                           | Status                                                                | Notes                                     |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| Connector SDK (`ContinuumConnector`, manifest schema, `NormalizedExternalItem`) | Real                                                                  | `packages/connectors-core`                |
| Connector Gateway (capability enforcement, revocation, idempotency, audit)      | Real                                                                  | `packages/connectors-core/src/gateway.ts` |
| InstallationStore                                                               | In-memory today → **Drizzle-backed (Phase 5)**                        |                                           |
| Credential vault                                                                | In-memory `Map` today → **AES-256-GCM versioned-key vault (Phase 5)** | outside-DB key, rotation                  |
| OAuth orchestration (connect/callback/refresh/revoke)                           | **Build in Phase 5** in the Gateway (not adapters)                    |                                           |
| Health states + last-sync                                                       | Types real, runtime mock → **real in Phase 5**                        | never a bare boolean                      |
| Source-import pipeline (item → normalize → extract → inbox)                     | **Build in Phase 5**                                                  | extraction engine already real            |

## Per-connector status

| Connector       | This pass          | Auth model                                          | Notes                                                                      |
| --------------- | ------------------ | --------------------------------------------------- | -------------------------------------------------------------------------- |
| Google Drive    | **Real (Phase 6)** | own OAuth, `drive.readonly`                         | search/read/normalize/import; credential-gated                             |
| Gmail           | **Real (Phase 6)** | own OAuth, `gmail.readonly`                         | search/read thread/normalize/import; no send scope in MVP                  |
| Google Calendar | **Real (Phase 6)** | own OAuth, `calendar.readonly` (or events.readonly) | search/read event/normalize/import                                         |
| Slack           | **Placeholder**    | —                                                   | honest manifest + "Coming soon"/"Setup required"; mock twin Demo-Mode-only |
| Notion          | **Placeholder**    | —                                                   | same                                                                       |
| GitHub          | **Placeholder**    | —                                                   | same                                                                       |

## Google login vs Google connector (must stay separate)

- **Login** (Better Auth): Google social provider, scopes `openid email profile` only. Grants
  identity, never Workspace data. Credentials: `GOOGLE_LOGIN_CLIENT_*`.
- **Connector** (Gateway): a distinct OAuth client, `GOOGLE_CONNECTOR_CLIENT_*`, with Drive/Gmail/
  Calendar readonly scopes, its own consent step, its own token storage (encrypted vault), and its
  own revocation. A login token is never reused as a connector token.

## Credential-gating rules

When `GOOGLE_CONNECTOR_CLIENT_ID/SECRET` are absent: show **"Setup required"**, never "Connected",
never a fake success. Demo Mode uses the labeled mock connector twin and says so. Real end-to-end
verification against live Google requires the user's connector OAuth app + a Google test account
(see the credential handoff in `RECOVERY_PLAN.md`).

## Connector status vocabulary (never a single boolean)

`not_configured` · `ready_to_connect` · `connecting` · `connected` · `verifying` · `syncing` ·
`healthy` · `permission_expired` · `rate_limited` · `provider_unavailable` · `failed` ·
`disconnected`.
