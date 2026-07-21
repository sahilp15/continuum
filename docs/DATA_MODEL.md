# Data model

Schema: `packages/db/src/schema/` (Drizzle, PostgreSQL 17 + pgvector). Prefixed string IDs
(`mem_…`, `spc_…`) — self-describing in logs and receipts. Soft deletion via `deleted_at`;
verified purges via `deletion_requests`.

## Table groups

- **identity.ts** — `users`, `accounts`, `sessions`, `organizations`,
  `organization_members`, `invitations`
- **context-org.ts** — `personal_profiles`, `spaces`, `space_members`, `projects`,
  `project_members`
- **memory.ts** — `memories`, `memory_versions`, `memory_relations`, `memory_sources`,
  `suggestions`, `suggestion_actions`, `approvals`
- **sources.ts** — `sources`, `source_versions`, `source_chunks` (pgvector embedding,
  Space-denormalized), `source_permissions`
- **connectors.ts** — `connector_definitions`, `connector_installations`,
  `connector_scopes`, `connector_sync_jobs`, `connector_sync_cursors`,
  `connector_webhook_events`, `connector_health_events`, plus the external item index
  (`external_items`, `external_item_versions`, `external_item_permissions`,
  `external_item_relations`)
- **generation.ts** — `context_requests`, `context_bundles`, `context_bundle_items`,
  `context_feedback`, `preflight_checks`, `preflight_findings`, `preflight_feedback`
- **governance.ts** — `audit_events`, `usage_events`, `deletion_requests`, `exports`,
  `retention_policies`, `subscriptions`, `subscription_items`, `usage_limits`, `jobs`

## Invariants

- Every tenant-scoped table references `organizations`; Space-scoped data references
  `spaces`; a Project belongs to exactly one Space (FK).
- `source_chunks.space_id` is denormalized so vector queries filter by Space **before**
  similarity search.
- `connector_installations.credential_ref` is an opaque vault reference — never a secret.
- Memory status enum matches `@continuum/contracts` exactly; contracts are the source of
  truth for shapes, the DB for integrity.

## Workflows

```bash
docker compose up -d
pnpm db:generate   # emit SQL migrations from schema
pnpm db:migrate    # apply
pnpm db:seed       # Northbank + FizzPop fixtures
```
