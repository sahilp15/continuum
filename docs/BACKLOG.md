# Issue backlog

Organized by phase and owner (P1 platform/memory, P2 product/interface, P3
connectors/MCP/quality). Each item becomes one GitHub issue with these acceptance criteria
plus "all quality gates green". ~½–2 days each.

## Phase 1 — Tenancy & boundaries

- [ ] **P1** Session auth (email magic link or OAuth): short-lived sessions, revocation,
      secure cookies. _AC: login/logout; `sessions` rows; revoked token rejected._
- [ ] **P1** Drizzle `AuthorizationStore` + `MemoryStore`. _AC: all existing package tests
      pass against Postgres via a store-swap test harness._
- [ ] **P1** Org/Space/Project CRUD services + audit persistence. _AC: isolation tests on
      real DB; audit rows for every mutation._
- [ ] **P2** Space/Project create+edit UI, Space switcher with always-visible active Space.
      _AC: keyboard accessible; active Space obvious on every screen._
- [ ] **P3** CI: Postgres service container job running DB-bound tests. _AC: green on PR._

## Phase 2 — Ingestion & memory

- [ ] **P1** URL import (SSRF-safe fetch, readability extraction). _AC: private-range URLs
      rejected; imported page becomes a source with hash._
- [ ] **P1** Upload pipeline (size limits, type validation, object storage, PDF/text/md).
      _AC: oversized/invalid rejected with useful errors._
- [ ] **P1** Chunking + embeddings via provider abstraction. _AC: chunks Space-scoped;
      mock embeddings deterministic._
- [ ] **P1** Extraction v2: people, decisions, terminology candidates. _AC: extraction
      evals; injection fixtures still pass._
- [ ] **P2** Memory Inbox v2: edit-before-accept, batch actions, keyboard review.
      _AC: j/k + a/r/t flows; conflict diff view._
- [ ] **P2** Space profile editor (voice, audience, rules, terminology, examples).
      _AC: edits create proposed→approved transitions, never silent writes._

## Phase 3 — Compiler hardening

- [ ] **P1** Hybrid retrieval (lexical + pgvector, Space-filtered pre-similarity).
      _AC: eval relevance thresholds; zero contamination._
- [ ] **P1** Budget tuning + per-surface defaults; receipt shows budget decisions.
- [ ] **P3** Eval fixture expansion (contradictions, expiry, receipts). _AC: thresholds in CI._

## Phase 4 — Connectors

- [ ] **P3** OAuth flow in gateway (PKCE, state, token refresh, vault binding).
- [ ] **P3** Sync jobs on PG queue with cursors; re-sync idempotent. _AC: no duplicates._
- [ ] **P3** Webhook receipt + verification architecture.
- [ ] **P3** First real connector (Google Drive user-selected mode) behind flag.
      _AC: real OAuth + retrieval verified; setup doc written._
- [ ] **P2** Connector directory UI (modes, permissions, health, disconnect).

## Phase 5 — MCP & API

- [ ] **P3** Remote MCP transport + OAuth authorization. _AC: unauthorized client blocked._
- [ ] **P3** API v1 (spaces, memory, context, preflight) with rate limits + idempotency.
- [ ] **P3** MCP conformance tests against a real client.

## Phase 6 — Extension

- [ ] **P2** WXT scaffold + side panel + sign-in.
- [ ] **P2** Space/Project switching per tab; insert/copy context; candidate capture.
      _AC: two-tab Northbank/FizzPop demo; clipboard fallback with visible warning._

## Phase 7 — Governance & preflight

- [ ] **P1** Export (account/Space) + deletion requests with verified purge.
- [ ] **P1** Provider-assisted preflight checks behind abstraction (tone, audience fit).
      _AC: clearly labeled non-deterministic; never a compliance conclusion._
- [ ] **P3** Confirmed connector actions UX (show action/destination/data; idempotent).

## Phase 8 — UI excellence

- [ ] **P2** 21st.dev research + license log in MOTION.md; webfont decision + self-hosting.
- [ ] **P2** Landing scroll storytelling v2 (thread, constellation, interactive demo).
- [ ] **P2** Dark mode QA, a11y audit (axe + keyboard), performance budget, Playwright e2e.

## Phase 9 — Beta readiness

- [ ] **P3** Analytics + error monitoring wiring; beta metric dashboards.
- [ ] **P3** Security review + threat model; incident-response doc.
- [ ] **P2** Onboarding flow (<10 min to first useful context).
- [ ] **All** Deployment + demo environment + beta invitations (requires human approval).
