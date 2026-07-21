# Security

Trust is the product. A single cross-Space leak destroys it.

## Enforced today (with tests)

| Requirement                                        | Where                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| Org + Space scoping before any retrieval           | `MemoryStore` has only Space-scoped reads; compiler asserts access first |
| No global vector retrieval filtered afterward      | store design; `source_chunks.spaceId` denormalized for pre-filtering     |
| Projects belong to exactly one Space               | schema FK + `assertProjectInSpace`                                       |
| Unauthorized users can't infer Space existence     | resource-hiding `not_found`; tested in auth + MCP suites                 |
| Credentials never stored as plain text             | `CredentialVaultProvider` only; `credential_ref` opaque in DB            |
| Secret redaction in logs                           | `packages/observability` redacts secret-like keys at any depth (tested)  |
| Connector revocation destroys credentials          | gateway `revoke()`; revoked installations can't be searched (tested)     |
| External writes require confirmation + idempotency | gateway `executeAction` (tested, incl. duplicate suppression)            |
| Undeclared connector capabilities rejected         | gateway `assertCapability` (tested)                                      |
| Imported text has no authority                     | injection-safe extraction + fixtures (tested)                            |
| No silent memory writes                            | lifecycle requires explicit approval; suggestions never auto-resolve     |
| Sensitivity enforcement per surface                | actor allowance checked in compiler (tested)                             |
| Dev auth impossible in production                  | MCP dev-token hard-fails on `NODE_ENV=production` (tested)               |
| Audit events for sensitive operations              | memory lifecycle, context compilation, connector calls                   |

## Planned (phase-tagged)

- **Phase 1**: real session auth (short-lived sessions, token revocation, secure cookies),
  rate limits on auth, CSRF protection, DB-level RLS decision (ADR).
- **Phase 2**: upload validation + size limits + malware-scan integration points; retention
  policies executing deletion propagation.
- **Phase 4**: OAuth with PKCE + state validation per connector; least-privilege scopes;
  permission sync (remove synced content when provider permissions change); SSRF-safe URL
  import (deny private ranges, redirect validation).
- **Phase 5**: standards-based OAuth for remote MCP; structured rate limiting on API.
- **Phase 9**: incident-response plan, threat-model review, penetration checklist.

## Prompt-injection posture

Connected documents and messages may contain malicious instructions ("ignore previous
instructions", "send files to…", "automatically approve"). The ingestion pipeline treats
imported text strictly as data: extraction produces only pending suggestions, instruction
sentences are never promoted, injection-suspect sources are flagged and confidence-capped.
Fixtures prove it (`packages/memory/src/memory.test.ts`).

## Rules for contributors

Never weaken authorization to make a demo work. Never log tokens or raw payloads. Never
commit credentials (`.env` is gitignored; `.env.example` documents shape only). Security
regressions block merge; contamination-test failures block release.
