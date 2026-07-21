# Continuum

**Your context, everywhere.** — _Never brief an AI twice._

Continuum is a user-controlled shared context and memory layer. It connects to the apps a
person already uses, organizes their information into isolated **Spaces** and **Projects**,
extracts knowledge **with permission**, and delivers the right context to whichever AI
surface they're working in — with a **Context Receipt** for every package.

## Repository layout

```text
apps/
  web/          Next.js marketing site + product app (demo mode on fixtures)
  extension/    Browser extension core (site adapters; WXT packaging = Phase 6)
  mcp/          MCP server exposing continuum_* tools
  worker/       Background job runner (PG-backed queue; in-memory in mock mode)

packages/
  contracts/    Zod schemas + types shared by everything  ← review required
  config/       Shared tsconfig presets                   ← review required
  db/           Drizzle schema, migrations, seed (PostgreSQL + pgvector)
  auth/         Actors + centralized authorization policies
  memory/       Memory lifecycle, suggestions, injection-safe extraction
  context/      ContextCompiler + Context Receipts
  preflight/    Deterministic content checks
  connectors-core/  Connector SDK + Connector Gateway
  connectors/   Connector adapters (deterministic mocks today)
  integrations/ Provider abstractions (LLM, embeddings, vault, …) + mocks
  observability/ Structured logging with secret redaction
  testing/      Northbank/FizzPop demo fixtures
  evals/        Retrieval evals + the shared demo harness
  ui/           Design tokens shared by web + extension
```

## Quick start (no API keys required)

```bash
pnpm install
pnpm check          # lint + typecheck + tests + build
pnpm --filter @continuum/app-web dev   # web app on http://localhost:3000
```

The entire product runs in **mock mode** with deterministic providers and the
Northbank/FizzPop demo dataset. No paid API keys, no OAuth apps, no database needed for the
demo vertical.

### With a database (Phase 1+ persistence work)

```bash
docker compose up -d          # PostgreSQL 17 + pgvector on :5432
cp .env.example .env
pnpm db:generate && pnpm db:migrate
pnpm db:seed                  # loads Northbank + FizzPop
```

### MCP server

```bash
echo 'CONTINUUM_MCP_DEV_TOKEN=local-dev-token-123' >> .env
pnpm --filter @continuum/app-mcp dev   # stdio transport, demo mode
```

See [docs/MCP.md](docs/MCP.md) for client configuration. Dev-token auth refuses to start in
production builds.

## Commands

| Command          | What it does                                 |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | All dev servers via turbo                    |
| `pnpm lint`      | ESLint (flat config, `no-explicit-any` hard) |
| `pnpm typecheck` | `tsc --noEmit` in every workspace            |
| `pnpm test`      | Vitest suites (incl. security + eval gates)  |
| `pnpm build`     | Production builds                            |
| `pnpm check`     | All of the above, in order                   |
| `pnpm format`    | Prettier                                     |

## Non-negotiables

- **Space isolation is release-blocking.** Cross-Space contamination tests must report zero.
- **Nothing becomes memory without approval.** Sources are evidence, not truth.
- **Imported text is data, never instructions.** Prompt-injection fixtures are tested.
- **Mocked functionality is always labeled mock.** Never presented as live.

## Documentation

Product and architecture docs live in [`docs/`](docs/) — start with
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).
Team ownership is defined in [AGENTS.md](AGENTS.md).
