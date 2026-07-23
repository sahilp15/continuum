# Visual QA Checklist

Run at the end of every redesign phase; the FULL matrix gates Phase H. Evidence lives in
`docs/UI_SCREENSHOT_REVIEW.md` (every screenshot inspected and annotated: works / weak /
changed / remaining). Capture via the Playwright audit spec (`SHOT_DIR=… pnpm exec playwright
test _ui_audit`) extended per phase.

## Screenshot matrix (each × light + dark)

Routes: landing · sign-in · sign-up · every onboarding step (1–8) + completion · empty dashboard
(fresh user) · populated dashboard · spaces · space detail · projects · inbox (list, detail,
post-approval) · preflight (form + findings) · receipts (history + open ReceiptDocument) ·
connectors (unconfigured, ready-to-connect, connected, revoked) · connector detail drawer ·
settings · error state · not-found.
Shell states: collapsed sidebar · mobile drawer open · command palette open · Space switcher
open · toasts visible · loading skeletons (throttled) · every EmptyState.

## Viewports (no horizontal overflow at any)

1440 · 1280 · 1024 · 768 · 430 · 390 · 320. Check: no clipped dialogs, no inaccessible menus,
touch targets ≥ 44px, sticky controls don't cover content, inputs visible above mobile keyboard.

## Keyboard sweep (per route)

Tab order logical · skip-link first · focus visible everywhere (both themes) · Esc closes every
overlay · ⌘K opens palette, arrows + Enter work, Esc closes · inbox shortcuts (j/k/a/e/t/r) ·
no focus traps outside dialogs · `aria-current` on active nav.

## Accessibility checks

Landmarks + heading hierarchy valid (one h1/route) · dialogs/sheets announce + trap correctly ·
`aria-live` fires on approve/import/connector results (verify with screen reader or a11y tree) ·
contrast: body ≥ 4.5:1, large text ≥ 3:1, BOTH themes, including chips on soft surfaces ·
status never color-only · forms: labels bound, errors announced.

## Reduced motion

`prefers-reduced-motion: reduce`: landing scroll stories static and fully readable · no
spring/shimmer/parallax anywhere · transitions ≤120ms opacity-only · nothing conveyed by
animation alone. Capture landing + dashboard + onboarding under reduced motion.

## Honesty & data

No fake data, no placeholder buttons that look functional, no "Connected" without a verified
flow, mock/demo always labeled, empty states truthful, counts match the database.

## Technical gates

Browser console: zero errors/warnings on every route (the dev-overlay "2 Issues" from the audit
must be resolved and explained) · `pnpm check` + `pnpm format:check` green · production build
passes · full Playwright suite green (update selectors, keep behaviors) · no layout shift on
load (spot-check CLS in devtools) · dashboard bundle delta within budget (compare
`next build` output before/after).
