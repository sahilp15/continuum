# API

The public/internal API is a Phase 5 deliverable. This document fixes the architecture so
earlier phases build toward it.

## Principles

- Versioned contracts (`/api/v1/…`); request/response shapes come from
  `@continuum/contracts` Zod schemas — the API layer validates, never invents shapes.
- Every request authenticates to an `Actor`; authorization happens in `@continuum/auth`
  policies, exactly like every other surface.
- Structured errors: `{ code, message, details? }` using `ContinuumErrorCode`; resource
  authorization failures are `not_found` (resource hiding).
- Idempotency keys on mutating endpoints; rate limits per token; audit events on sensitive
  operations.

## Planned v1 surface

| Area        | Endpoints                                           |
| ----------- | --------------------------------------------------- |
| Spaces      | list/get/create/update/delete                       |
| Projects    | list/get/create/update                              |
| Memory      | list/search/propose/approve/reject/forget, versions |
| Suggestions | list/resolve                                        |
| Sources     | import (url/text/upload), list/get/delete           |
| Context     | compile (returns bundle + receipt), feedback        |
| Preflight   | check                                               |
| Connectors  | directory, install, revoke, search, health          |
| Governance  | export, deletion requests, audit log                |

## Manual fallback (always supported)

Copy context package, paste context package, export a Space brief, download a context
file — the product stays useful even when an external AI changes its interface.
