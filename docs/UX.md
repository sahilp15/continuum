# UX

## Information architecture

Routes (target set; ✅ = built in demo mode):

```text
/                    ✅ landing
/home                ✅ dashboard (spaces, pending reviews, next actions)
/spaces              ✅ space list
/spaces/[id]         ✅ overview: projects, memory library, sources
/inbox               ✅ Memory Inbox (accept / keep temporary / reject)
/check               ✅ preflight
/receipts            ✅ context generation + Context Receipt viewer
/onboarding, /search, /connectors, /projects/[id], /settings/*   Phase 1–7
```

Global controls (Phase 1+): Space switcher, Project switcher, command palette (see spec
§36), search, notifications, user menu. **The active Space must always be obvious** — the
user never guesses which client is live.

## Principles

- Canonical approved memory must always look more authoritative than raw source evidence —
  status chips and struck-through superseded/rejected entries in the memory library.
- Review is calm: batch inbox, quiet counts, no modal per candidate. High-priority
  interruption is reserved for significant contradictions/deadlines.
- Receipts are first-class UI, not a debug view.
- Errors say: what happened, whether data is safe, what to do, whether we retry. No stack
  traces.
- Onboarding (Phase 1–2): useful result in under ten minutes; never 30 questions before
  value; demo data path always available; never auto-approve imports.

## Accessibility

Semantic HTML, keyboard navigable, visible focus (`--cn-focus-ring` global), labels on all
form controls, `aria-live` on check/receipt results, non-color status indicators (text
chips), reduced-motion kills all animation via token override + media queries. Automated
axe pass + manual keyboard sweep are part of the Phase 8 audit.

## Responsive

Desktop sidebar collapses to a horizontal scroll nav on mobile; pages are single-column
first and enhanced up. Phase 8 does the intentional mobile pass (not compressed desktop).
