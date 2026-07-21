# Connector SDK

`packages/connectors-core` exports the strongly typed contract every adapter implements.

## Interface

`ContinuumConnector`: `manifest`, `connect`, `disconnect`, `testConnection`, `search`,
`fetch`, and optional `sync`, `handleWebhook`, `executeAction`. Execution context provides
org/Space scope, the installation record, the credential vault, and a scoped logger —
adapters never receive raw secrets or global state.

## Manifest

Validated by `connectorManifestSchema` at registration: id (kebab-case), display name,
category, version, auth type, OAuth scopes, **capabilities** (`search`, `read`,
`sync_metadata`, `sync_content`, `draft`, `create`, `update`, `send`, `delete`, `webhook`,
`export`), entity types, data modes, webhook support, rate-limit/retention/permission
notes, required config, and status (`beta` | `stable` | `mock`).

## Normalization

All provider data becomes `NormalizedExternalItem` (contracts): stable external IDs, typed
entity kind, title/content/summary, people, permissions, sensitivity, content hash,
version. Raw payloads are retained only when required and under retention policy — never
exposed through the product.

## Writing a connector

1. Declare the manifest — only capabilities you actually implement.
2. Implement `search`/`fetch` first (live_only), then sync with cursors, then webhooks.
3. Normalize everything; map provider permissions honestly (`unknown` over guessing).
4. Ship a deterministic mock twin (see `createMockConnector`) for local dev + contract tests.
5. Contract tests: manifest validation, capability enforcement, revocation behavior,
   sync-cursor idempotency (re-sync must not duplicate items), webhook verification.
6. Real credentials stay behind a feature flag until the full flow is verified end to end.

Reference implementations: `packages/connectors/src/mocks.ts` (six mock connectors) and
`gateway.test.ts` for expected gateway behavior.
