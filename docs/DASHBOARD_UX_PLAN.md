# Dashboard UX Plan

The dashboard is the product surface. It answers seven questions: What am I working on? Which Space
is active? What changed recently? What needs my attention? Which apps are connected? Is my context
current? What should I do next? Every section reads **real persisted data** or shows a **truthful
empty state** — no fake alerts, no zero-value charts, no placeholder buttons that appear functional.

## Application shell

Built from reusable token-based components in `packages/ui` (no one-off per-screen styles).

**Sidebar** (collapses intelligently on small screens): Continuum logo, Home, Spaces, Projects,
Search, Memory Inbox, Preflight, Connectors, Context Receipts, Settings.

**Top bar**: active **Space switcher**, active **Project switcher**, global search, command palette
(⌘K), notifications, user menu. **The active Space is always visually obvious** — a persistent chip
in the top bar — so the user never believes they are in one Space while another is active. Switching
Space/Project is fast (cached, optimistic) and animated calmly (respecting reduced-motion).

## Dashboard sections (all DB-backed)

| Section                     | Data source                                                                                                                                                 | Empty state                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Continue working**        | active + recently-used Projects (name, Space, status, deadline, last activity, next action)                                                                 | "Create your first Project"    |
| **Attention required**      | real items only: memories awaiting approval, contradictions, expired connector permissions, failed syncs, upcoming deadlines, missing required project info | "Nothing needs your attention" |
| **Recent context activity** | context requests (which AI/app, Space, Project, time, Receipt link)                                                                                         | "No context requested yet"     |
| **Spaces**                  | user's real Spaces (type, active projects, connected sources, memory count, last activity, context health)                                                  | first-run guide                |
| **Connector health**        | real installation states + last successful sync                                                                                                             | "Connect an application"       |
| **Memory suggestions**      | a few high-value pending candidates with quick approve/review                                                                                               | "No suggestions right now"     |
| **Recent changes**          | actual audit/activity events (deadline updated, memory approved, source imported, connector connected, project created, conflict resolved)                  | "No recent changes"            |
| **Quick actions**           | Create Space, Create Project, Connect application, Import source, Add memory, Generate context, Run preflight                                               | always present                 |

## States

Every data region has explicit **loading** (skeleton only where it aids understanding, not for
near-instant ops), **empty** (helpful, guides the next step), **populated**, and **error** (says what
happened, whether data is safe, what to do, whether we retry) states. Immediate feedback for saving,
approving, rejecting, connecting, disconnecting, importing, syncing, and Space/Project switching.

## Empty dashboard (new user)

No meaningless charts. A guided path: (1) Create a Space → (2) Connect a source → (3) Import context
→ (4) Approve memory → (5) Generate the first context bundle. This mirrors the onboarding exit state
so the app feels continuous.

## Accessibility & responsive

Semantic landmarks, keyboard-navigable sidebar/top-bar/command-palette, visible focus, accessible
dialogs/menus, `aria-live` on approval/sync feedback, non-color status chips, correct heading
hierarchy. Mobile is intentionally designed (single-column first, sidebar → collapsible), not a
compressed desktop.

## Data plumbing

A request-scoped services factory resolves the session → Actor and builds domain services over the
Drizzle stores. Server components read via those services (Space-scoped, authorization-enforced);
mutations are server actions with `revalidatePath`/optimistic updates where safe. Demo Mode swaps in
the in-memory environment behind a persistent "Demo Mode" badge and never mixes with real records.

## As-built (Phase 4 — verified)

The DB-backed app shell and dashboard are implemented in `apps/web/src/app/(app)/*`:
`layout.tsx` (sidebar with the full nav + top bar with an always-visible **active Space switcher**
and user menu), `home/page.tsx` (dashboard: greeting + active Space, Attention-required, Quick
actions, Your Spaces, Recent context, Recent changes — all from the real DB with truthful empty
states). The active Space is a cookie read server-side (`lib/active-space.ts`); switching uses a
server action (`space-actions.ts`) + client `space-switcher.tsx`. Dashboard data comes from
`packages/db/src/queries.ts` (`listUserProjects`, `recentContextActivity`, `recentAuditActivity`)
plus per-Space authorized reads. New pages: `projects`, `connectors` (honest "Coming soon"/"Setup
required" — never a fake "Connected"), `settings` (profile editor). `spaces`, `spaces/[id]`, `inbox`
(+ paste import), `check`, `receipts` were rewired from the in-memory demo env to the real
`createDbEnvironment`. Verified by `apps/web/e2e/dashboard.spec.ts` (loads real data, creates + switches
a second Space, imports a source, approves a suggestion). Command palette + Project switcher are
deferred to the Phase 8 UI-refinement pass.
