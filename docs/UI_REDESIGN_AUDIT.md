# UI Redesign Audit — current state (evidence-based)

Captured 2026-07-23 against commit `8298951`: 39 screenshots — every route at desktop 1440×900
(light + dark) and mobile 390×844, plus all 8 onboarding steps. Capture spec:
`apps/web/e2e/_ui_audit.spec.ts` (rerunnable: `SHOT_DIR=<dir> pnpm exec playwright test _ui_audit`).
The screenshots were individually inspected; every finding below cites what was seen.

## Verdict

The app is functionally real (real DB data everywhere, honest connector states, no fake
controls) but **visually it is a generic developer dashboard**: one flat sidebar of text links,
identical white rounded cards for every content block, a nearly-empty top bar, a native
`<select>` as the Space switcher, and no dark mode in practice. Nothing is broken-dishonest;
plenty is under-designed.

## Systemic findings (apply to every route)

1. **Dark mode is unreachable.** `packages/ui/src/tokens.css` defines dark tokens only under
   `[data-theme="dark"]` / `.dark`, but nothing ever sets that attribute — there is no theme
   toggle and no `prefers-color-scheme` media fallback. The "dark" screenshots are pixel-identical
   to light. (Emulating `colorScheme: dark` changes nothing.)
2. **No active-route indication.** Sidebar links render identically whether current or not; on
   `/inbox` the "Memory Inbox" item looks exactly like the rest.
3. **Card-for-everything layout.** Every section on every page is the same `.panel` white rounded
   card — attention banner, quick actions, Space cards, forms, list rows. Hierarchy comes only
   from order, not from size/surface/typography.
4. **Top bar is nearly empty.** Just a dot + native `<select>` Space switcher. No page context, no
   command palette trigger, no user menu (user block sits at the sidebar bottom, showing a raw
   truncated email `audit-17847757…`), no notifications.
5. **Mobile navigation is a clipped link strip.** At 390px the header shows `Home Spaces Projects
Memo…` — the 5-link strip truncates mid-word, there is no drawer, and Settings/Connectors/
   Receipts/user menu are **unreachable on mobile**. The Space switcher crowds the same row.
6. **Typography is flat.** Display serif for headings + sans body exists (good bones) but scale
   steps are small, metadata uses a monospace that reads as debug output (`0 approved · 1
project`), and labels like "client Space" leak enum casing.
7. **No command palette, no keyboard shortcuts, no skip-to-content link.**
8. **Dev console shows issues.** The Next dev overlay badge reported "2 Issues" during capture —
   console must be inspected and cleaned in Phase H.
9. **No loading states anywhere** (server-rendered pages appear all-at-once; acceptable, but slow
   queries have no skeleton/pending affordance), and empty states vary in quality.

## Route-by-route findings

### `/` Landing (desktop + mobile)

- Hero is decent (badge, serif headline, two CTAs, tool chips, "one approved context layer" pill).
- **Everything below the fold appears blank in static capture**: sections use CSS scroll-driven
  reveals (`animation-timeline: view()` in `globals.css`) — content is invisible until scrolled
  into range. Works when actually scrolling and has an `@supports` + reduced-motion fallback, but:
  the animation range must be verified so content can never park half-revealed; screenshots/SEO/
  print see unstyled states; and the page relies on large near-empty bands with weak section
  rhythm. No sticky scroll story; connector chips are static text pills; footer says "Demo build —
  running on deterministic local fixtures" **which is no longer true** (real DB app) — stale copy.
- Mobile hero fine; same blank-band issue.

### `/sign-in`, `/sign-up`

- Clean, centered, functional; validation exists. But: pure form on a blank page (no product
  visual or reassurance panel), logo floats detached, no entrance motion, Google button hidden
  (correctly, no creds) with no explanation, Terms/Privacy links go nowhere. Desktop wastes the
  full left half. (Sign-in-when-authed correctly redirects — captured shots confirm.)

### Onboarding (8 steps captured)

- Solid skeleton: step label (`Step 7 of 8 · Your first Project`), 8-segment progress bar,
  centered card, back links, persisted progress. Real weaknesses: monospace step label reads as
  debug text; segments aren't labeled/clickable; the card floats in a large empty page (no
  left rail explaining the journey); transitions are hard cuts; connector step correctly says
  "Coming soon" for Google (will need updating now that the adapter exists → "Ready to connect"
  when configured); completion is an abrupt jump to /home.

### `/home` Dashboard

- Real data (greeting, attention count, Space stats, recent context, recent changes). Problems:
  one narrow column (max-w-4xl) leaves the right half of a 1440px screen empty below "Your
  Spaces"; quick actions are five identical grey buttons; "Recent changes" is bare bullet text;
  attention panel and Space card have equal visual weight; no "Continue working" project row; no
  connector-health tile; no receipts entry point; the new-user activation path doesn't exist as a
  guided checklist.

### `/inbox` Memory Inbox

- Honest and functional: import panel + suggestion cards with confidence chips, quote excerpts,
  Approve / Keep temporary / Reject. Problems: title duplicates body ("Voice: warm, direct." then
  "warm, direct."); a long inbox is an unbounded vertical stack (no list→detail split, no
  filters, no keyboard flow); import panel always occupies the top even when reviewing; no
  post-approve transition (row just vanishes on reload).

### `/receipts` Context & Receipts

- **The onboarding-generated receipt is not visible** — the page shows only the generate form;
  history of past receipts isn't listed (data exists in `context_bundles`). Receipts are supposed
  to be the signature surface; today the page is a two-field form.

### `/connectors`

- Honest states everywhere (Setup required / Coming soon / vault status / no fake "Connected") —
  this page is truthfully correct after Phase 6; visually it's the same card grid as everything
  else. Mobile fine. Google card should read "Ready to connect" when configured (implemented).

### `/spaces`, `/spaces/[id]`, `/projects`

- Real create/list flows; same generic card issues; Space detail buries voice/rules/audience in
  plain text; project rows lack deadline/status emphasis; no view/edit separation polish.

### `/check` Preflight

- Functional form + findings; results render as plain stacked panels; severity is color-only in
  chips (needs non-color signal).

### `/settings`

- Account block renders name/email in monospace like a debug dump; profile form fine; no
  password/session management section, no theme control, no danger zone.

## What must be preserved (works today; do not regress)

- All data flows are real (DB-backed): dashboard stats, inbox suggestions, spaces/projects CRUD,
  receipts generation, connector installations, onboarding persistence.
- Honesty rules: connector states, `(mock)` labeling, pending-only extraction.
- Auth flow incl. stale-session self-healing; Space isolation; authorization checks.
- 8/8 Playwright specs green — they encode the flows and must keep passing (selectors may need
  updating with new markup, but the behaviors are the contract).
- Token foundation (`--cn-*`) and the serif/sans pairing are a usable base to evolve, not discard.
