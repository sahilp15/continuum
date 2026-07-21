# Motion

Motion explains the product; it never performs. Application motion stays calmer than
marketing motion. All motion respects `prefers-reduced-motion` — the token layer zeroes
every duration, and scroll animations are wrapped in `no-preference` media queries with a
fully-visible static fallback.

## Current implementation (CSS-only, zero JS)

- `.reveal` — scroll-driven entrance via `animation-timeline: view()`, progressive
  enhancement only (`@supports`), static when unsupported.
- `.thread-path` — the landing page's continuous line draws itself with
  `animation-timeline: scroll(root)` + `stroke-dashoffset` (`pathLength` normalized on the
  SVG). This is the signature moment; everything else stays disciplined around it.
- Micro-transitions (buttons, cards) use token durations/easing only.

## Landing narrative (scroll story)

Scattered tool chips → thread draws downward → converge into the Continuum core → thread
continues → AI surface chips → Northbank/FizzPop split demo → receipt reveal. Restrictions:
no scroll hijacking, no trapped sections, transform/opacity only, lazy-load heavy visuals,
no autoplaying distraction in the product app.

## 21st.dev research (Phase 8 gate — owner: Person 2)

Before finalizing the marketing experience, study 21st.dev components for: scroll
animation, container scroll, scroll reveal, stacked cards, text parallax/reveal, horizontal
scroll, animated timelines, feature carousels, connector-constellation-style visuals.
For each candidate: inspect implementation + dependencies, **verify license**, check
performance and framework fit, strip unneeded deps, adapt fully to Continuum tokens, add
reduced-motion behavior, test mobile. When licensing is unclear, recreate the pattern —
never copy protected code. Record selections and license status in the table below.

| Pattern                                  | Source | License | Status |
| ---------------------------------------- | ------ | ------- | ------ |
| _(to be filled during Phase 8 research)_ |        |         |        |

## Library policy

CSS first. Motion for React when the app needs orchestrated interface animation (Phase 8).
GSAP only if a complex scroll sequence genuinely requires it — one library at a time, never
competing stacks.
