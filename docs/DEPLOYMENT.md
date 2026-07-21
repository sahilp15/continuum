# Deployment

Nothing deploys without explicit human approval. This documents the intended shape.

## Environments

- **local** — mock providers, in-memory stores or docker-compose Postgres; no keys.
- **staging** — real Postgres + pgvector, mock LLM/billing providers, feature flags on.
- **production** — Phase 9 gate; requires the security review and threat-model review.

## Target topology

- `apps/web` → Node/edge host (Vercel or equivalent) with `DATABASE_URL` secret.
- `apps/mcp` → small Node service; remote MCP transport + OAuth (Phase 5).
- `apps/worker` → single Node process polling the PG job queue; scale horizontally later.
- PostgreSQL 17 + pgvector (managed). S3-compatible bucket for uploads/exports.

## Rules

- Secrets only via the platform's secret store; never in env files in git, never in logs.
- `NODE_ENV=production` disables every development auth path (enforced in code + tested).
- Migrations run explicitly (`pnpm db:migrate`) before rollout; no auto-migrate on boot.
- CI (`.github/workflows/ci.yml`) must be green — format, lint, typecheck, tests, build —
  before any deploy; cross-Space contamination failures block release unconditionally.
- Error monitoring + analytics providers are wired through `@continuum/integrations`
  abstractions; enabling them is a config change, not a code change.
