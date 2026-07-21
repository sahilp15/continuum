# Privacy

## Principles

1. **User control** — nothing becomes permanent memory without explicit approval; suggestion
   sensitivity is user-configurable; "keep temporary" is always offered.
2. **No training on customer data.** Provider abstractions must not enable it either.
3. **No silent conversation capture.** The extension never stores whole conversations; only
   user-selected text becomes a candidate.
4. **Transparency** — Context Receipts show exactly what left the vault and which surface
   asked; connector directory shows what each connector stores (data mode) and can access.
5. **Provenance** — every memory links to its sources; every source shows authority level.

## Data lifecycle

- **Export**: account-level and Space-level (`exports` table; governance flow Phase 7).
- **Deletion**: soft deletion for product flows; `deletion_requests` tracks verified
  permanent purges with status transitions (`pending → soft_deleted → purged`).
- **Retention**: `retention_policies` per resource type; raw connector payloads are kept
  only when required, encrypted, and subject to retention.
- **Permission sync**: when a provider revokes access to an item, synced copies are removed
  or updated (Phase 4 connector work).

## Sensitivity labels

`public`, `internal`, `confidential`, `highly_sensitive`, `restricted`. Every memory,
source, and external item carries one; every surface (actor) has an allowance; the compiler
and gateway enforce it. Default: `internal`.

## What we log

Structured events with IDs and counts — never raw secrets, OAuth tokens, or full sensitive
document contents. The logger redacts secret-like keys defensively at any depth.
