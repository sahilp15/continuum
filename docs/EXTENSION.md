# Browser extension

Phase 6 surface. What exists today in `apps/extension` is the **typed core**: site adapters
and per-tab scoping, unit-tested, with zero packaging dependencies. WXT + React packaging,
the side panel UI, and store submission happen when Phase 6 starts.

## Architecture

- **Site adapters** (`src/adapters/`) — the ONLY code allowed to know a host page's DOM.
  ChatGPT, Claude, and Gemini adapters declare host patterns (minimal permissions), an input
  selector, `insertText` (returns `false` when the site changed → caller must show the
  clipboard fallback with a visible warning), and `readSelection` for "save as candidate".
- **Per-tab scope** (`src/tab-scope.ts`) — active Space/Project is scoped to the browser
  tab, so Northbank in one tab and FizzPop in another never mix. Switching Space resets the
  Project.

## Hard restrictions (carried into Phase 6)

- Never silently store entire conversations.
- Never press Send on the user's behalf.
- Never pretend to have access the extension doesn't have.
- Minimal browser permissions; selectors are expected to break — fail visibly, fall back to
  clipboard.

## Phase 6 checklist

WXT scaffold (side panel preferred), Continuum sign-in, Space/Project switcher, request
context → insert or copy, candidate capture from selection, receipt viewer, preflight,
adapter health warnings, reduced-motion styles, e2e coverage for the two-tab demo.
