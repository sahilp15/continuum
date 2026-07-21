# Brand

**Personality**: calm, intelligent, trustworthy, fluid, modern, precise, human, premium,
connected, quietly futuristic.

**Core visual idea — the thread**: one continuous line. Information scattered across tools
converges into a single approved context layer and flows out to every AI surface,
unbroken. The mark is an unbroken loop crossing itself (see `ContinuumMark` in
`apps/web/src/app/page.tsx`). The mark is original work-in-progress; no legal clearance is
claimed.

## Color

Warm paper neutrals + deep ink text + **one** accent: deep teal ("the thread").
Full token set in `packages/ui/src/tokens.css` — backgrounds, surfaces, text tiers,
borders, focus ring, status colors, accent trio, shadows, radii, motion durations — with a
complete dark theme (`[data-theme="dark"]`).

Explicitly banned: purple AI gradients, glowing blobs, brain/robot iconography, neon,
glassmorphism, 3D effects, cheap template aesthetics.

## Typography

- **Display**: editorial serif — currently the Iowan Old Style/Palatino/Georgia stack.
- **Body**: humanist sans — Seravek/Gill Sans Nova/Ubuntu stack.
- **Data**: ui-monospace for IDs, timestamps, metadata.

These are deliberate zero-download stacks so CI builds never depend on font CDNs. Phase 8
decides the licensed webfonts (candidates: Fraunces display + Instrument Sans body) and
self-hosts them.

## Voice

Plain, confident, specific. Explain what happened and what the user controls. No dense
technical jargon in user-facing copy; no exclamation-mark enthusiasm. Key lines:
"Your context, everywhere." · "Never brief an AI twice." · "Stop re-explaining yourself." ·
"It remembers with permission." · "See exactly what your AI knew."
