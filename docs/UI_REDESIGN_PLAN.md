# UI Redesign Plan — Continuum product-level rebuild

Grounded in `UI_REDESIGN_AUDIT.md` (39 inspected screenshots). Companion docs:
`CONTINUUM_DESIGN_SYSTEM.md` (tokens/components), `MOTION_SYSTEM.md` (animation),
`ROUTE_BY_ROUTE_UX.md` (per-screen UX), `VISUAL_QA_CHECKLIST.md` (acceptance).

## 1. Visual direction

**Concept: continuity.** One continuous line — context flowing from tools, through user
approval, to every AI. Calm, precise, quietly futuristic; never crypto-dashboard, never
component-demo. Expressed through: a single connected-path motif (the existing line-drawn
mark, extended into hero + empty-state illustrations), restrained depth (one elevation step),
warm off-white light mode / charcoal dark mode, ONE signal-blue accent, editorial serif
display + quiet sans body, purposeful whitespace, and surface contrast instead of
card-inside-card. Full palette/typography in `CONTINUUM_DESIGN_SYSTEM.md`.

## 2. Information architecture & navigation

Sidebar groups (desktop, collapsible; mobile: sheet drawer):

- **Primary:** Home · Spaces · Projects · Search (command palette page-fallback)
- **Intelligence:** Memory Inbox (badge = real pending count) · Preflight · Context Receipts
- **Connections:** Connectors (badge only for real attention states)
- **Bottom:** Help · Settings · User menu

Top bar: page title/breadcrumb · **active-Space chip (always visible, accent-marked)** ·
Project switcher (when in Space context) · ⌘K trigger with visible shortcut · user menu.
Active route = accent left-rail marker + tinted text (not a pill per item). Collapsed sidebar
shows icons + tooltips; state persists (cookie). Skip-to-content link first in DOM.

## 3. Component inventory (reusable, one system)

Foundations via **shadcn/ui + Radix**: Button, Input/Textarea/Field, Select, DropdownMenu,
Dialog, Sheet (mobile nav + detail drawers), Tooltip, Popover, Command (⌘K), Toast (Sonner),
Badge/StatusChip (non-color icon + label), Tabs, Skeleton, Separator, Avatar.
Continuum-specific composites: `AppShell`, `SpaceChip`, `ProjectSwitcher`, `StatCell`,
`SectionHeader`, `EmptyState` (line-motif illustration + one action), `SuggestionCard`,
`ReceiptDocument`, `ConnectorCard` (12-state vocabulary), `ActivityRow`, `OnboardingRail`,
`GuidedChecklist` (new-user activation). All tokens-only styling — no hardcoded colors.

## 4. 21st.dev components — evaluation & decisions

| Component                         | Decision                | How                                                                                                                                               |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard Sidebar (Arun Dass)     | **Adapt pattern**       | Rebuild on shadcn sidebar primitives with Continuum groups above; take collapse behavior, active treatment, mobile sheet. Not its branding/items. |
| Command Palette (Jatin Yadav)     | **Adapt**               | Base on `cmdk` via shadcn Command; groups = Navigation/Actions/Switching/Search; real DB-backed search only; recents persisted per user.          |
| Onboarding Dialog (Patrick Xin)   | **Ideas only**          | Keep our full-screen route (persisted steps); borrow cross-fade step transitions + progress animation. No modal, no Embla dependency.             |
| Stepper (Origin UI)               | **Adapt**               | Titles+descriptions stepper as the persistent left onboarding rail (top bar on mobile).                                                           |
| Sticky Scroll Reveal (Aceternity) | **Adapt, landing only** | "How Continuum works" 5-beat story; capped section length; static stack fallback (reduced-motion / no JS).                                        |
| Text Reveal (Dillion Verma)       | **Adapt, once**         | Single landing statement tied to scroll progress; static under reduced motion.                                                                    |
| Scroll Cards (Shamsu Musthafa)    | **Concept only**        | Connector-story stacking cards with custom product-UI illustrations; never inside the app.                                                        |
| Stacked Activity Cards            | **Restrained concept**  | Optional expandable stack for dashboard "Recent activity" only; alerts never hidden behind animation.                                             |
| Everything else on 21st.dev       | **Not used**            | One coherent system beats many styles; each addition must earn its dependency.                                                                    |

License check (all of the above publish MIT terms on their 21st.dev pages) happens at adaptation
time and is recorded in `docs/MOTION.md` per AGENTS.md before landing marketing sections.

## 5. Dependencies introduced (complete list)

`tailwindcss` (already), `shadcn/ui` (generated source, not a runtime dep), `radix-ui`
primitives (per-component), `motion` (Motion for React), `lucide-react`, `next-themes`,
`cmdk`, `sonner`, `class-variance-authority`/`clsx`/`tailwind-merge` (shadcn plumbing),
`@radix-ui/react-*` as pulled by chosen components. **Not added:** GSAP, Three.js, WebGL,
Lenis, Embla, extra animation libs. Every dependency ships tree-shaken; marketing motion
sections are dynamically imported.

## 6. Performance budget & tactics

- Dashboard route JS delta from redesign ≤ ~60KB gz (motion + cmdk lazy where possible).
- Server components stay server components; client islands only for: sidebar state, palette,
  switchers, toasts, approval transitions, theme.
- Marketing scroll sections `next/dynamic` + `IntersectionObserver` mount.
- Lists paginate at 50 (inbox, receipts, activity); virtualize only if a real case exceeds ~200.
- No layout shift: fixed shell dimensions, skeletons preserve final layout, images sized.
- Transform/opacity animations only; no animated width/height where transform works.

## 7. Mobile behavior (intentional, not squeezed)

Drawer nav (Sheet) with the full grouped menu + user block; top bar = menu, title, Space chip,
⌘K; sticky bottom Back/Continue in onboarding; list→detail push pattern for inbox; forms
full-width with `text-base` inputs (no iOS zoom); touch targets ≥ 44px; breakpoints tested per
`VISUAL_QA_CHECKLIST.md` (320→1440).

## 8. Accessibility behavior

Semantic landmarks (`header/nav/main/aside`), skip link, focus-visible rings everywhere
(token-driven), Radix-managed dialog/menu focus traps, `aria-live="polite"` for approval/
import/connector results, `aria-current="page"` nav, non-color status (icon + text in every
StatusChip), contrast ≥ 4.5:1 body / 3:1 large text in BOTH themes, keyboard-complete palette
and inbox actions, reduced-motion variants for every animation.

## 9. Reduced motion

`prefers-reduced-motion: reduce` ⇒ scroll stories render static stacked; step transitions
become opacity-only ≤120ms; approval transitions become instant state swaps; sidebar collapse
uncelebrated. Implemented once in motion utilities (`MOTION_SYSTEM.md`), not per-component.

## 10. Dark/light strategy (fixes the audit's #1 defect)

`next-themes` with `attribute="data-theme"` + `enableSystem` — maps directly onto the existing
`[data-theme="dark"]` token block; add `color-scheme` to root; theme toggle in user menu +
palette; `suppressHydrationWarning` on `<html>`. Both themes are first-class in QA.

## 11. Implementation phases (each ends: `pnpm check` + `format:check` + e2e green, commit)

- **A. Audit & plan** — this document set + screenshots. ✅ (this commit)
- **B. Design system & primitives** — tokens v2 (signal-blue accent, dark parity), shadcn/Radix
  foundations, StatusChip/EmptyState/Skeleton/SectionHeader, motion utilities, next-themes.
- **C. App shell** — sidebar (groups/collapse/badges), top bar (Space chip, Project switcher,
  ⌘K, user menu, theme), mobile drawer, skip link. All routes adopt the shell.
- **D. Auth & onboarding** — split-panel auth pages; onboarding rail + step transitions +
  mobile sticky controls; connector step reflects real Google availability.
- **E. Dashboard** — new composition per `ROUTE_BY_ROUTE_UX.md` (Continue working / Attention /
  supporting column / activation checklist), all real data.
- **F. Product pages** — Inbox list→detail + keyboard flow; Receipts document view + history;
  Spaces/Projects view-mode polish; Connectors detail drawer; Settings sections; Preflight.
- **G. Landing** — hero refresh, sticky scroll story, text reveal, stacking connector cards,
  static fallbacks, truthful copy (drop "Demo build" footer).
- **H. Visual QA** — screenshot matrix re-run, `UI_SCREENSHOT_REVIEW.md`, keyboard sweep,
  responsive/contrast/reduced-motion/console checks, production build.

## 12. Screenshot-based acceptance criteria

Phase H re-captures the full matrix (every route × desktop-light/dark × mobile, plus states:
loading, empty, error, collapsed sidebar, palette open, drawer open, approval mid-flight) and
each is reviewed in `docs/UI_SCREENSHOT_REVIEW.md` (what works / weak / changed / remaining).
The 20 acceptance criteria from the rebuild directive are the exit gate, verified against
screenshots + the e2e suite; no criterion is marked done without visual evidence.
