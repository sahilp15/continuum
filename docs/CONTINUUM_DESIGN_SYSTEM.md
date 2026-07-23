# Continuum Design System

Single source of truth for tokens and components. Everything ships as CSS custom properties in
`packages/ui/src/tokens.css` (v2) + Tailwind theme mapping; **no hardcoded values in app code**.

## Principles

Calm · intelligent · precise · trustworthy · quietly futuristic. One accent. One elevation step.
Surface contrast over borders-everywhere. Weight and spacing before color. The "continuity line"
motif (the mark's continuous stroke) is the only decorative device — used in the logo, hero,
empty states, and the receipt's source-connection lines.

## Color tokens

Light mode:

- `--cn-bg` warm off-white `#FAF9F7` · `--cn-surface` `#FFFFFF` · `--cn-surface-raised` `#FFFFFF`
  - shadow-sm (the single elevation step)
- `--cn-text` deep ink `#17181C` · `--cn-text-secondary` `#565A63` · `--cn-text-tertiary` `#8A8F99`
- `--cn-border` warm gray `#E8E6E1` · `--cn-border-strong` `#D5D2CB`
- **Accent (signal blue):** `--cn-accent` `#2563EB` · `--cn-accent-hover` `#1D4ED8` ·
  `--cn-accent-soft` `#EFF4FE` (selected/tinted surfaces only)
- Status: `--cn-ok` `#15803D` · `--cn-warn` `#B45309` · `--cn-error` `#B91C1C` ·
  `--cn-info` = accent. Soft variants for chip backgrounds.

Dark mode (`[data-theme="dark"]`, toggled by next-themes, `enableSystem` for OS preference):

- `--cn-bg` charcoal `#131417` · `--cn-surface` graphite `#1B1D21` · raised `#22242A`
- `--cn-text` `#F2F3F5` · secondary `#A6ABB5` · tertiary `#767C87`
- borders `#2A2D33` / `#3A3E46` · accent `#5B8DEF` (contrast-adjusted) · soft `#1B2A4A`
- Status colors lightened one step; every pair re-checked ≥ 4.5:1 on its surface.

Accent usage: primary actions, active nav, selected Space/Project, focus rings, key links,
progress. **Never** card backgrounds, never decorative gradients. Migration note: the current
teal `--cn-accent` is replaced globally by signal blue; audit shows accent is referenced only
via tokens, so this is a token-file change plus visual QA.

## Typography

- Families: keep the repo's serif display (editorial, headings h1–h2 only) + high-quality sans
  (body, UI). Monospace ONLY for genuinely technical strings (ids, receipts hash) — not for
  labels, step counters, or stats (fixes audit finding).
- Scale (rem): display 2.25 / h1 1.75 / h2 1.25 / h3 1.0625 / body 0.9375 / small 0.8125 /
  micro 0.75. Line-heights 1.2 display, 1.5 body. Weights: 600 headings, 500 UI labels, 400 body.
- No uppercase-label defaults; sentence case everywhere; enum values humanized ("Client Space").

## Spacing, radius, elevation

4px base grid; section rhythm 32/48; card padding 20; page gutter 24 (16 mobile).
Radii: `--cn-radius-sm` 6 · `md` 10 · `lg` 14 (max — no pill panels). Shadows: `sm` (raised
surface) and `md` (overlays) only. Focus ring: 2px accent outline + 2px offset, both themes.

## Core components (built once, reused everywhere)

- **Button** primary (accent) / secondary (surface+border) / ghost / destructive; sm+md; loading
  spinner state; icon slots.
- **Field** label + control + help/error; error is text + icon, not color alone.
- **StatusChip** icon + label; maps the full connector vocabulary (`not_configured`,
  `ready_to_connect`, `connecting`, `connected`, `verifying`, `syncing`, `healthy`,
  `permission_expired`, `rate_limited`, `provider_unavailable`, `failed`, `disconnected`,
  `coming_soon`, `demo_mock`) and memory/suggestion states. Never a bare boolean or bare color.
- **SpaceChip** accent dot + name + switcher popover — the always-visible active-Space signal.
- **EmptyState** continuity-line illustration (inline SVG, themed), one sentence of what/why,
  exactly one primary action.
- **Skeleton** shaped to final layout; used only where loads are genuinely async/slow.
- **SectionHeader** title + optional description + optional action — replaces card-per-section.
- **ReceiptDocument** the signature surface: document layout, source-connection lines, include/
  exclude ledger (see `ROUTE_BY_ROUTE_UX.md`).
- **ConnectorCard / ConnectorDetail** manifest-driven; official marks only where licensing is
  verified, otherwise neutral glyph + wordmark text.
- **GuidedChecklist** activation path bound to real DB state.
- Dialog/Sheet/DropdownMenu/Tooltip/Command/Toast from Radix/shadcn, restyled by tokens only.

## Voice in UI copy

Honest, specific, calm. State what happened, whether data is safe, the next action. No
exclamation marks, no "oops", no celebration copy. Mock/demo is always labeled.
