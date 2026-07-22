# Recovery Audit

Evidence-based classification of the codebase as inherited, from three parallel code audits,
direct file reading, and environment probes. Each feature is classified as **Working/verified**,
**Partially working**, **UI only**, **Mocked**, **Broken**, or **Missing**, with the telltale file.

## Summary

The repository is a well-architected **Phase-0 demo scaffold**. The _domain logic_ (memory
lifecycle, extraction, context compilation, preflight, authorization, connector gateway, Space
isolation) is real and unit-tested and deliberately store-agnostic. But **everything stateful runs
on in-memory fixtures**, and **authentication, onboarding, DB-backed persistence, real connectors,
and a polished app shell do not exist**. Nothing is deceptively presented: mocks self-label
`status: "mock"` and the UI footer reads "Demo build — running on deterministic local fixtures".

## Environment reality (drives architecture)

- Node 22.22, pnpm 10.33 — OK. `pnpm install` succeeds; postinstall builds all 14 packages.
- **Docker daemon is OFF and port 5432 is closed** — the documented `docker compose up` Postgres is
  unavailable in this sandbox. `psql` client is present. → dev/test use **PGlite**; prod uses `DATABASE_URL`.

## Feature classification

### Domain logic — Working/verified (logic), in-memory (storage)

| Feature                                                                | Class                                      | File                                      |
| ---------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| Memory lifecycle + approval state machine                              | Working (logic) / in-memory                | `packages/memory/src/service.ts`          |
| Injection-safe candidate extraction (pending-only)                     | Working                                    | `packages/memory/src/extraction.ts`       |
| ContextCompiler + Context Receipts                                     | Working                                    | `packages/context/src/compiler.ts`        |
| Deterministic preflight                                                | Working                                    | `packages/preflight/src/engine.ts`        |
| Authorization policies (resource-hiding `not_found`)                   | Working/verified                           | `packages/auth/src/policies.ts`           |
| Space isolation at store level (no list-all API)                       | Working/verified                           | `packages/memory/src/store.ts`            |
| Connector SDK + Gateway (capabilities, revocation, idempotency, audit) | Working (logic), uninvoked by apps         | `packages/connectors-core/src/gateway.ts` |
| MCP dev-token guard (prod hard-fail)                                   | Working/verified                           | `apps/mcp/src/auth.ts`                    |
| Drizzle schema (7 table groups)                                        | Working (defined), unwired                 | `packages/db/src/schema/*`                |
| DB seed script                                                         | Working (writes fixtures), not used by app | `packages/db/src/seed.ts`                 |
| Design-token system (light+dark, focus, motion, status)                | Working                                    | `packages/ui/src/tokens.css`              |

### Application surfaces

| Feature                                              | Class                  | Telltale                                                                     |
| ---------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| Dashboard/home, spaces, inbox, check, receipts pages | Partially working      | real services over the in-memory demo singleton (`apps/web/src/lib/demo.ts`) |
| Inbox approve/reject/keep actions                    | Working (vs in-memory) | `apps/web/src/app/(app)/inbox/actions.ts`                                    |
| Context generation + Receipt viewer                  | Working (vs in-memory) | `apps/web/src/app/(app)/receipts/page.tsx`                                   |
| Marketing landing tool logos / compiled-tone copy    | UI only                | static arrays in `apps/web/src/app/page.tsx`                                 |
| Space / Project switcher, command palette            | Missing                | static `NAV` list in `(app)/layout.tsx`                                      |

### Stateful/persistence + platform

| Feature                                                        | Class                                      | Telltale                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Real DB wired to services                                      | Missing                                    | only `@continuum/evals` in-memory env is used; `@continuum/db` imported by no running app code |
| Drizzle-backed store implementations                           | Missing                                    | only `createInMemory*` factories exist                                                         |
| Authentication (sign-in/up, sessions, OAuth, protected routes) | Missing                                    | no auth lib, no `middleware.ts`, no auth routes                                                |
| Onboarding flow                                                | Missing                                    | no route/component; only marketing explainer copy                                              |
| Onboarding progress persistence                                | Missing                                    | no DB/localStorage writes in web                                                               |
| Source-import pipeline (UI + wiring)                           | Missing (extraction engine itself Working) | `extractCandidates` called only in tests                                                       |

### Connectors

| Feature                                                   | Class                                        | Telltale                                                                          |
| --------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| Connector OAuth (any provider)                            | Missing                                      | zero `oauth`/`access_token`/`refresh_token` code; all six manifests `auth:"mock"` |
| Connectors integrated into app/MCP                        | Missing                                      | gateway/mocks referenced only by `gateway.test.ts`                                |
| Six connectors (Drive/Gmail/Calendar/Slack/Notion/GitHub) | Mocked (honestly labeled)                    | `packages/connectors/src/mocks.ts` `status:"mock"`                                |
| Connector health state                                    | Partially working (types) / Mocked (runtime) | enum real; `testConnection` returns hardcoded `healthy:true`                      |
| Credential vault                                          | Mocked                                       | in-memory `Map` (`packages/integrations/src/mocks.ts`)                            |
| Token refresh                                             | Missing                                      | no code                                                                           |
| Revocation                                                | Working (vs mock vault, uninvoked)           | `gateway.ts:199`                                                                  |

## What to preserve vs replace

**Preserve** (real, tested, store-agnostic): all domain packages (`memory`, `context`, `preflight`,
`auth` policies, `connectors-core`, `contracts`, `observability`), the Drizzle schema, the design
tokens, the MCP dev-token guard, and the honest mock connectors (as Demo Mode + contract-test twins).

**Replace / build**: DB-backed store implementations, real services wiring in `apps/web`,
authentication (Better Auth), onboarding, the app shell + DB-backed dashboard, the real
credential vault + connector OAuth orchestration, the real Google Workspace adapters, and the
Playwright e2e suite.
