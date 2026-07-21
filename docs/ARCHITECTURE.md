# Architecture

TypeScript monorepo (pnpm + Turborepo). Domain logic lives in packages; apps are thin
delivery surfaces over the same services.

```text
Connected Sources
      │
      ▼
Connector Gateway  (packages/connectors-core — capability enforcement, credentials, revocation)
      │
      ▼
Source Normalization → NormalizedExternalItem (packages/contracts)
      │
      ▼
Candidate Extraction (packages/memory — untrusted input, pending suggestions only)
      │
      ▼
User Review & Approval (apps/web Memory Inbox, MCP tools)
      │
      ▼
Canonical Memory (packages/memory lifecycle over MemoryStore)
      │
      ▼
ContextCompiler (packages/context — authz → scope → filter → rank → budget → receipt)
      │
      ├──► MCP (apps/mcp) ──► Claude & MCP clients
      ├──► API (Phase 5 versioned surface)
      └──► Browser extension (apps/extension) ──► ChatGPT / Claude / Gemini web
```

## Key decisions (ADR summary)

1. **Store interfaces + in-memory implementations first.** `MemoryStore`,
   `AuthorizationStore`, `InstallationStore`, `JobQueue` are interfaces. The deterministic
   in-memory implementations power tests, evals, demo mode, and local development with zero
   credentials; Drizzle-backed implementations bind to the schema in `packages/db` as
   Phase 1–2 lands. Services never know which store they're on.
2. **Authorization before retrieval, always.** Services take an `Actor`; policies live only
   in `packages/auth`. Resource-level authorization failures throw `not_found` so
   unauthorized callers can't distinguish "doesn't exist" from "not yours".
3. **Space scoping at the store level.** There is no "list all memories" API. Vector
   retrieval (pgvector, `source_chunks.embedding`) is Space-filtered _before_ similarity
   search — never global-then-filter.
4. **The demo harness is production code path.** `@continuum/evals` wires fixtures +
   services into `createDemoEnvironment()`; the web app, MCP server, and eval suite all
   exercise the same compiled services, so the demo can't drift from reality.
5. **Provider abstractions with deterministic mocks.** LLM, embeddings, object storage,
   billing, email, analytics, credential vault, search — all behind interfaces in
   `packages/integrations`. The full product runs without paid keys.
6. **Connector logic never leaks into the memory engine.** Provider-specific code lives in
   adapters (`packages/connectors`); the gateway enforces declared capabilities,
   confirmation + idempotency for writes, and credential destruction on revocation.
7. **PostgreSQL-backed job queue** (`jobs` table) rather than an external broker, until
   scale demands otherwise.

## Apps

- **web** — Next.js App Router + Tailwind v4. Marketing site + product app. Demo mode uses a
  per-process `DemoEnvironment` singleton (`src/lib/demo.ts`).
- **mcp** — `@modelcontextprotocol/sdk` server over stdio (remote HTTP + OAuth in Phase 5).
  Dev-token auth hard-fails in production.
- **worker** — job runner with retry/backoff/dead-letter; PG-backed queue lands Phase 2.
- **extension** — site adapters + per-tab Space scoping, typed and tested now; WXT + React
  packaging is Phase 6.

## Testing strategy

- Unit + integration tests per package (Vitest), including MCP client↔server round-trips.
- Security tests are ordinary tests marked by intent: isolation, precedence, injection,
  revocation, dev-auth-in-prod.
- `packages/evals` runs fixture-based retrieval evals; contamination must be zero.
- Playwright e2e for web arrives Phase 8.
