# Route-by-route UX specification

Target experience per route. Every region lists its loading / empty / populated / error states.
All data is real; every state below is truthful or explicitly labeled.

## `/` Landing

Hero (line-motif, statement, two CTAs, honest tool chips) → Text Reveal statement → sticky
"How Continuum works" (Connect → Spaces → Approve → Every AI → Receipt, sticky visual updates
per beat) → stacking connector-story cards → receipt showcase (real ReceiptDocument component
with sample-labeled content) → security/consent strip → final CTA. Footer: truthful copy (no
"Demo build" line), links to Security/Docs. Static fallbacks for all scroll sections.

## `/sign-in` · `/sign-up`

Desktop: split panel — left = focused auth card (logo, heading, Google [only when configured,
else a quiet "email only for now" note], email+password, inline validation, privacy line);
right = restrained product visual (receipt snippet on the continuity line) that collapses away
below `lg`. Mobile: single column, inputs above keyboard, no decorative panel. Subtle one-shot
entrance (card fade-up 200ms, no per-field stagger). Errors inline + form-level `aria-live`.

## Onboarding (full-screen flow, 8 steps)

Desktop: left rail = Origin-UI-style stepper (titles + one-line descriptions, done/current/
upcoming, non-clickable ahead), right = active step card, max-w readable, save-state line
("Progress saved" after each commit). Mobile: compact top progress (step x of 8 + bar), one task
per screen, sticky bottom Back/Continue. Transitions per MOTION_SYSTEM. Step 4 (Connect a
source) reflects REAL availability: Google = "Ready to connect" when configured / "Setup
required" otherwise; Slack/Notion/GitHub = "Coming soon"; manual import always available and
never framed as lesser. OAuth cancel returns to step 4 with state intact. Completion: card
resolves into the dashboard which shows the GuidedChecklist continuing the journey.

## `/home` Dashboard

Top: greeting + SpaceChip context + ONE primary action (contextual: "Review inbox" when pending,
else "Generate context") + overflow quick-action menu.
Row 1 — **Continue working**: compact project list (name, Space, status, deadline, last
activity) from real data; empty → "Create your first Project".
Row 2 — **Attention required** (visually dominant): pending approvals, contradictions, failed/
expired connectors, upcoming deadlines; each row deep-links; empty → calm "Nothing needs your
attention".
Supporting column: Connector health (real states), Recent context requests (→ receipts), Recent
changes (humanized audit rows, expandable stack pattern).
Lower: Spaces overview cards, recent Context Receipts, quick actions.
New-user state: GuidedChecklist (Create Space → Connect/import → Approve → Project → Generate),
each step checked from real DB state. Sections differentiated by size/typography/soft surface —
not identical cards. Loading: skeletons for the two async-heavy regions only.

## `/inbox` Memory Inbox

Two-pane (desktop): left = filterable list (Space, type, confidence; badge count), right =
selected suggestion detail (proposed memory, Space/Project, type, confidence, conflict callout,
source excerpt with highlighted quote, View source). Actions: Approve (`a`), Edit & approve
(`e`), Keep temporary (`t`), Reject (`r`), navigation `j/k` — all also buttons; shortcuts
documented in a `?` popover. Mobile: list → detail push. Import panel moves to a "+ Import"
button (sheet) instead of permanently occupying the top. Approval motion per MOTION_SYSTEM;
`aria-live` announces results. Empty: "No suggestions right now" + import action. Error:
preserves entered edit text.

## `/receipts` Context Receipts

Generate panel (Space, task, budget) + **Receipt history list** (requesting app, Space, task,
time — real `context_requests`/`context_bundles` data; fixes audit gap). Selecting one opens the
**ReceiptDocument**: document-styled layout — header (who/when/Space/Project/task), sections for
Rules / Facts / Examples / Voice used, each item visually connected to its source (continuity
line), excluded-memories ledger with reasons, contradictions, sensitivity decisions, token
budget bar, feedback controls. Quick look = right Sheet; full page = `/receipts/[id]`.

## `/spaces` · `/spaces/[id]`

Index: Space cards (kind, counts, last activity, health) + create. Detail: identity header
(name, kind chip, description), read-mode blocks for Voice / Audience / Rules with single Edit
affordances (no always-on form), Projects list, connected sources, recent changes, memory
health. Cross-Space isolation cues: switching Space is always explicit, never implicit.

## `/projects`

List grouped by Space with status/deadline emphasis; create flow unchanged (real service).
Detail (Phase F): objective, status, deadline, related sources, important memory, recent
receipts, "Generate context" primary action. Timeline only for real chronological events.

## `/check` Preflight

Form + findings report: severity chips (icon + label), finding cards grouped by check type,
"what to fix" guidance, link into the Space's memory. Non-color severity signaling.

## `/connectors`

Header (title, one-line explanation, search/filter when >6 connectors, real connected count).
"Your connections": real installations — StatusChip (full vocabulary), granted scopes,
last-successful-request time, Browse & import, Disconnect (confirm dialog: what stops working,
imported data stays until deleted). Detail drawer: capabilities, scopes, data-storage behavior,
sync mode, last activity, health history, errors, disconnect, delete imported data.
"Available": Google (Ready to connect / Setup required with exact env-var guidance), others
Coming soon. Official marks only where verified; otherwise neutral glyphs. Never fake green.

## `/settings`

Sections: Profile (existing form, humanized) · Account (email, password change, active sessions
with revoke — Better Auth data) · Appearance (theme: system/light/dark) · Data & privacy
(export placeholder honestly labeled, delete account flow stub with clear "not yet available"
if unimplemented). No debug-monospace rendering.

## Error/global states

`error.tsx` keeps its honest recovery copy, restyled; `not-found` gets the line motif; offline/
failed fetch regions show inline retry without losing input.
