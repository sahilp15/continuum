# Implementation plan

Phases from the master spec §49, with current status. A phase is complete only when its
exit gate passes with all quality gates green (`pnpm check`).

## Phase 0 — Product foundation ✅ (this repository state)

Monorepo (pnpm + Turborepo, strict TS, ESLint no-any, Prettier, Vitest), CI, docker-compose
Postgres+pgvector, full docs suite, design tokens, provider mocks, Northbank/FizzPop seed
fixtures, issue backlog.

**Exit gate status**: repo installs and runs ✅ · CI configured ✅ · docs exist ✅ ·
Northbank/FizzPop load ✅ · landing visual direction documented ✅.

Delivered beyond Phase 0 (foundation vertical slice, all tested):
memory lifecycle + suggestions + injection-safe extraction; ContextCompiler + receipts;
deterministic preflight; centralized authz with resource hiding; connector SDK + gateway +
6 mock connectors; MCP server with 10 tools; eval framework (zero-contamination gate);
web app demo vertical (landing, home, spaces, inbox, check, receipts); extension core.

## Phase 1 — Tenancy & context boundaries (owner: P1)

Real authentication + sessions, org/membership CRUD on Postgres, Drizzle-backed
`AuthorizationStore`/`MemoryStore`, personal profile editing, Space/Project CRUD UI, audit
persistence, isolation tests against the real DB.
**Gate**: user creates Space+Project; unauthorized access blocked; Northbank/FizzPop
isolation tests pass on Postgres.

## Phase 2 — Source ingestion & memory (P1 + P2)

URL/text/document import, chunking + embeddings (mock provider), extraction to inbox,
version history UI, contradiction UX, Space profile editor.
**Gate**: import brand guide → approve rules → rules appear in Space profile;
injection tests pass.

## Phase 3 — Context Compiler hardening (P1)

Hybrid lexical+vector retrieval, budget tuning, feedback capture, expanded eval fixtures.
**Gate**: eval thresholds pass; receipts show sources; invalid memory excluded.

## Phase 4 — Connector foundation (P3)

Gateway OAuth/webhooks/sync jobs on Postgres, credential vault binding, health monitoring,
first real connector behind a flag.
**Gate**: mocks pass contract tests; one real connector verified end to end; revocation works.

## Phase 5 — MCP & API delivery (P3)

Remote MCP transport + OAuth, versioned API v1, structured rate limits.
**Gate**: compatible client retrieves authenticated Northbank context; unauthorized blocked.

## Phase 6 — Browser extension (P2)

WXT + React side panel over the existing adapter core; two-tab demo.
**Gate**: Northbank and FizzPop in separate tabs; no silent capture; visible fallback.

## Phase 7 — Preflight & governance (P1 + P3)

Provider-assisted checks, findings feedback, export/deletion flows, sensitivity UI, usage
limits, confirmed connector actions UX.
**Gate**: Northbank joke detected; FizzPop playful passes; export + deletion work.

## Phase 8 — Exceptional UI & landing (P2)

Final brand webfonts, 21st.dev research (documented in MOTION.md), scroll storytelling,
interactive Northbank/FizzPop demo, connector constellation, dark mode, accessibility +
performance audits, Playwright e2e.
**Gate**: landing feels designed; reduced-motion + mobile excellent; no template sections.

## Phase 9 — Closed beta readiness (all)

Analytics + error monitoring wiring, billing flags, onboarding polish, connector setup
docs, security + threat-model review, deployment, beta invitations.
**Gate**: new user → first useful context in <10 minutes; all §51 criteria pass;
contamination remains zero.

## Quality gates (after every phase)

`pnpm check` (format, lint, typecheck, unit+integration+security tests, build) + docs
updated + summary of changes/decisions/limitations/untested assumptions + next milestone
identified. Never claim a phase complete with failing checks.
