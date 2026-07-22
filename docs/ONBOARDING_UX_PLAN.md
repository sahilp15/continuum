# Onboarding UX Plan

Goal: a new user experiences Continuum's value — a real Context Receipt from their own data — in
under ten minutes. Guided, fast, polished, useful. Not a long business form, never 30 questions
before value. Progress persists; users can go back, leave, and resume. Errors preserve entered data.
Nothing is auto-approved: imported source text becomes candidate memory only, approved with consent.

## Persistence model

Onboarding progress is stored in the database (`users.onboardingStatus` + an `onboarding_state`
record / `personal_profiles`), not localStorage. Each step commits its result, so a refresh or a
later session resumes at the right step with prior answers intact. `middleware.ts` routes users with
incomplete onboarding into the flow and completed users into the dashboard.

## Steps

1. **Welcome** — one-line explanation ("Continuum gives your AI tools one shared understanding of who
   you are and what you're working on"). Ask what best describes them (Freelancer / Agency /
   Consultant / Creator / Student / Developer / Other). Used only to personalize.
2. **Personal profile** — a few useful preferences: name, role, preferred writing style, common
   output types, general working preferences. Nothing unnecessary.
3. **Create the first Space** — explain Spaces keep worlds separate; ask name, type, short
   description, optional icon/initials. Uses the real Space-create service.
4. **Connect a real source** — offer real integrations, Google Workspace first (one OAuth,
   clearly-explained scopes for Gmail/Drive/Calendar). Show what Continuum can access, why, whether
   data is searched live or synced, what is stored, and how to disconnect. Skippable → manual import,
   with the difference made clear. Demo Mode is available but unmistakably labeled. OAuth cancellation
   and connector failure do **not** destroy onboarding progress.
5. **Import or select context** — select a Drive file / Gmail thread / Calendar event, or paste text,
   upload a document, or add a website. The real source is processed; no "import succeeded" before
   processing finishes.
6. **Review suggested memory** — show extracted candidate memories (brand voice, audience, facts,
   deadlines, people, rules, project details). Approve / edit / reject / keep temporary. Explain that
   Continuum does not permanently remember without permission.
7. **Create the first Project** — name, goal, optional deadline, optional source association.
8. **First useful result** — generate a real context bundle from the approved memory; show the
   generated context, the **Context Receipt**, the selected Space + Project, and the sources used. A
   refined completion transition (no confetti).

## Requirements

Progress persists after refresh · users can go backward · leave and resume · errors preserve entered
data · mobile is intentionally designed · keyboard navigation works · loading states are polished ·
empty states are helpful · external OAuth cancellation is handled · connector failure does not lose
progress · a clearly-labeled Demo Mode is available without being mistaken for a live connection.

## Reuse of existing real services

- Space/Project creation → the Space/Project services over Drizzle stores.
- Source import → the source-import pipeline (Phase 5) → `extractCandidates`
  (`packages/memory/src/extraction.ts`, injection-safe, pending-only).
- Review/approve → `memoryService.resolveSuggestion` / `approve`
  (`packages/memory/src/service.ts`).
- First result → `compiler.compile` (`packages/context/src/compiler.ts`) → Context Receipt.

## Exit gate

A brand-new user completes the flow and reaches their **first real Context Receipt** generated from
their own persisted, approved memory — verified by a Playwright walkthrough.

## As-built (Phase 3 — verified)

Implemented at `apps/web/src/app/(onboarding)/onboarding/*` (page + `actions.ts` + `stepper.tsx` +
layout). Progress persists in the `onboarding_state` table (`packages/db`) + `users.onboardingStatus`;
the `(app)` shell gates un-onboarded users into the flow, and completion routes to `/home`. The eight
steps run entirely on the real DB via `createDbEnvironment` (tenancy create, `importSource`,
`resolveSuggestion`, `generateContext`). Verified by `apps/web/e2e/onboarding.spec.ts`: a brand-new
user signs up, completes all steps, and reaches a real Context Receipt, then lands on the DB-backed
dashboard. Connectors in step 4 are honest "Coming soon"; manual paste/upload import is live and
needs no credentials.
