# PRD — Continuum MVP

## Product

Continuum is a user-controlled context and memory layer that gives ChatGPT, Claude, Gemini,
and productivity tools one shared understanding of who the user is, what they're working
on, and which information is approved and current.

Continuum does **not** merge the private native memories of external AI platforms. It
maintains its own canonical memory and supplies context to each surface through MCP, a
browser extension, an API, and manual copy/paste fallback.

## Initial target user

Freelance copywriters, ghostwriters, content strategists, fractional marketers, and
small-agency operators who manage 3+ clients, use 2+ AI assistants, and face real
consequences for mixing up client information. See master spec §3 for the full profile.

## Product model

- **Personal Profile** — user-level preferences; never overrides Space rules.
- **Space** — a strict security and retrieval boundary (client, company, class, personal).
- **Project** — an active initiative inside exactly one Space.
- **Session** — temporary context that never silently becomes permanent memory.

## Context precedence (deterministic)

1. Security/organization policies
2. Space compliance rules
3. Space hard rules
4. Current Project facts and decisions
5. Space approved facts
6. Space audience and voice
7. Personal Profile preferences
8. Historical examples
9. Unapproved or inferred information

Implemented in `@continuum/contracts` (`PRECEDENCE_ORDER`) and enforced by the
ContextCompiler's ranking.

## Core workflow (MVP definition)

Account → Personal Profile → first Space → import source (URL/paste/upload) → candidates →
review/approve → Project → connect an AI surface → request context → Context Receipt →
preflight output → new facts become candidates → approve → every surface sees the update.

## The core demo

Two seeded, deliberately opposite Spaces — **Northbank** (serious financial services; no
jokes; never guarantee returns; "Northbank Flex" exactly; required disclaimer) and
**FizzPop** (playful beverage brand; humor encouraged; emojis allowed). The user switches
between them, receives correct isolated context in each, changes the Northbank deadline
(March 14 → March 21) via a reviewed suggestion, and sees the update everywhere with
receipts. Fixtures: `packages/testing/src/fixtures.ts`.

## MVP success criteria

The 30-point working-MVP definition from the master spec §51, tracked in
`docs/IMPLEMENTATION_PLAN.md` phase gates. Non-negotiable: zero cross-Space contamination.

## Out of scope for MVP

Team plans, connector marketplace, automation bridges (Zapier/Make), >6 native connectors,
billing as a priority (feature-flagged only), model-assisted preflight beyond the provider
abstraction.
