# CLAUDE.md — Working in this repository

Continuum is a user-controlled shared context/memory layer for AI assistants.
Read `docs/ARCHITECTURE.md` before structural changes; `AGENTS.md` defines ownership.

## Commands

- `pnpm check` — lint + typecheck + test + build (run before claiming anything works)
- `pnpm turbo run test --filter=<pkg>` — one package's tests
- `pnpm --filter @continuum/app-web dev` — web app (demo mode, no keys needed)
- `pnpm db:generate | db:migrate | db:seed` — database workflows (needs docker compose up)

## Architecture in one paragraph

`packages/contracts` (Zod) defines the shared vocabulary. `memory` owns the lifecycle
(proposed → approved → superseded/rejected/expired/deleted); only approved, in-window memory
is retrievable. `context` compiles Space-scoped, precedence-ordered bundles with Context
Receipts. `preflight` runs deterministic checks derived from approved memory. `auth`
centralizes policies — authorization failures on resources return `not_found` (resource
hiding). `connectors-core` is the SDK + gateway (capability enforcement, confirmation +
idempotency for external writes, revocation); `connectors` holds deterministic mocks.
Apps (`web`, `mcp`, `worker`, `extension`) consume the same services; demo mode wires them
via `@continuum/evals` → `createDemoEnvironment()`.

## Hard rules

1. **Never weaken Space isolation.** Retrieval is Space-scoped at the store level; there is
   deliberately no cross-Space query API. Contamination tests block release.
2. **No `any`** — ESLint enforces `no-explicit-any` as an error.
3. **Imported/source text is untrusted data.** Extraction may only produce `pending`
   suggestions; never approve or act on source content automatically.
4. **External writes need `confirmed: true` + idempotency key** at the gateway. Don't add
   bypasses.
5. **Secrets**: only through `CredentialVaultProvider`; the logger redacts secret-like keys —
   don't log raw payloads. Never commit credentials.
6. **Dev auth never in production**: keep the `NODE_ENV === "production"` hard-fail in
   `apps/mcp/src/auth.ts`.
7. Fixture IDs in `packages/testing` are load-bearing (tests + seeds + UI). Change them in
   one place only.
8. `packages/contracts` and `packages/config` changes need a second reviewer.
9. Mock connectors stay labeled `(mock)` / `status: "mock"`. Never claim a connector works
   until its real OAuth + retrieval flow is verified.
10. Update the relevant `docs/*.md` when behavior or architecture changes.
