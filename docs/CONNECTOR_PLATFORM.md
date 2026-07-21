# Connector platform

Goal: grow from six connectors to 100+ without touching the memory engine. Provider
specifics live in adapters; everything else is shared infrastructure.

## Gateway (`packages/connectors-core/src/gateway.ts`)

Every connector call flows through the gateway, which owns: capability enforcement (a
connector may never perform an undeclared action), installation status + revocation
(credential destruction included), confirmation + idempotency for level-4 external writes,
audit events, and per-connector child loggers. OAuth flows, token refresh, webhook
verification, scheduled/incremental sync orchestration, rate limiting and backoff attach
here in Phase 4 — not in adapters, not in the memory engine.

## Data modes

`live_only` · `sync_metadata` · `sync_content` · `user_selected` — declared per manifest,
chosen per installation, shown to users in the connector directory ("what does this store?").

## Action safety levels

- **Levels 1–3 (MVP focus)**: search, read, draft.
- **Level 4 — confirmed action**: requires `confirmed: true`, an idempotency key, an audit
  record, and UX that shows the exact action, destination, and data. No silent sending, ever.
- **Level 5 — approved automation**: post-MVP.

## MVP connectors

Google Drive, Gmail, Google Calendar, Slack, Notion, GitHub — shipped today as
**deterministic mocks** (`packages/connectors`), fully implementing the SDK contract so the
product, tests, and demos work without credentials. Real adapters land behind feature flags
and are never claimed working until their OAuth + retrieval flow is verified end to end.
At least one real connector must work before closed beta. Public URL import, pasted text,
markdown/plain-text/PDF upload are source-import paths, not connectors.

## Path to 100 (stages)

1. Six native connectors (prove auth/search/sync/normalization/permissions/health)
2. Fifteen native (Outlook, OneDrive, Teams, Dropbox, Linear, Asana, ClickUp, Jira, HubSpot)
3. Documented connector SDK with contract-test kit
4. Automation bridges (Zapier, Make, n8n, Pipedream)
5. Connector registry (versions, security status, deprecation, revocation, metrics)
6. Marketplace — designed for, not built in, the MVP
