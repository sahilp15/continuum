# Motion System

One library — **Motion for React** — plus native CSS scroll-driven animation on the landing page
only. No GSAP, no Lenis, no scroll hijacking. Motion clarifies state; it never decorates idle UI.

## Timing tokens

| Token                 | Value                                | Use                                              |
| --------------------- | ------------------------------------ | ------------------------------------------------ |
| `--cn-motion-fast`    | 140ms                                | hover/focus, chip changes                        |
| `--cn-motion-state`   | 200ms                                | small state changes, list row resolve            |
| `--cn-motion-overlay` | 260ms                                | dialogs, sheets, palette, drawers                |
| `--cn-motion-step`    | 320ms                                | onboarding step transitions, route-level content |
| Easing                | `cubic-bezier(0.22, 1, 0.36, 1)`     | default "calm out"                               |
| Spring                | gentle (stiffness ~260, damping ~30) | ONLY approval resolve + drawer settle            |

Transform + opacity only. Never animate width/height/top/left where a transform works; the one
exception is sidebar collapse (width), which animates `grid-template-columns` at overlay speed
with content opacity cross-fade.

## Where motion lives (complete list)

- **Sidebar collapse/expand** — width + label fade; icons stable.
- **Mobile drawer / detail sheets / dialogs / ⌘K palette** — overlay scale-fade (0.98→1) +
  backdrop fade.
- **Onboarding steps** — forward: 12px slide-left + fade; back: reversed; completion: card fades
  while the dashboard shell fades in underneath (no confetti).
- **Space/Project switch** — content region 150ms opacity dip with the SpaceChip updating first
  (optimistic), so the switch feels instant.
- **Memory approval** — card resolves: check icon draw (200ms) → height-collapse via transform
  scaleY on a measured wrapper → count decrements; `aria-live` announces "Approved".
- **Connector status transitions** — StatusChip cross-fades between states; connecting/syncing
  use a subtle progress shimmer, never an infinite spinner without label.
- **Optimistic updates & toasts** — Sonner, bottom-right desktop / top mobile, 4s, max 2 stacked.
- **Empty→populated transformation** — EmptyState fades out as first real row fades in.
- **Route-level** — content region only (shell static): 120ms fade; disabled under reduced motion.

## Landing page scroll storytelling (marketing only)

- "How Continuum works" — Aceternity-style sticky reveal, 5 beats, section capped ≈ 250vh so
  users are never trapped; progress is scrubbed by native scroll position.
- One Text Reveal statement ("Your tools know fragments. Continuum connects the full picture."),
  scroll-progress driven.
- Connector story — stacking cards resolving into one context package; custom product-UI
  illustrations, no stock imagery.
- Existing `.reveal` CSS (`animation-timeline: view()`) stays for simple section entrances; tune
  `animation-range` so nothing parks half-hidden (audit finding), keep the `@supports` fallback.
- Never inside the app: no marketing motion in dashboard, inbox, auth, settings, or error states.

## Reduced motion (`prefers-reduced-motion: reduce`)

Implemented once in `motion-utils` (a `useCalmMotion()` hook + CSS media block):

- Scroll stories render as static stacked sections; text reveal renders fully visible.
- All transitions drop to ≤120ms opacity-only; approval/step changes become instant swaps.
- No parallax, no shimmer, no springs. Content is never conveyed by animation alone.

## Performance rules

Lazy-mount marketing sections (`next/dynamic` + in-view). Palette/motion code split from the
dashboard bundle where possible. 60fps target on mid-range hardware: only compositor properties,
`will-change` applied transiently, animations removed from DOM when idle.
