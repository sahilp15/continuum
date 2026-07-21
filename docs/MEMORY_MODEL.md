# Memory model

Three information layers (never conflated):

1. **Sources** — raw/normalized external information. Evidence, not truth. Always untrusted.
2. **Extracted knowledge** — candidates identified from sources (`Suggestion`). Pending
   until a human decides.
3. **Approved memory** — the only information Continuum treats as authoritative.

## The memory record

`memorySchema` in `packages/contracts/src/memory.ts` carries identity (org/Space/Project),
type, canonical text, structured value, status, priority, confidence, sensitivity, source
authority, validity window, provenance (`sourceIds`, `supersedesMemoryId`,
`contradictsMemoryIds`), approval metadata, and soft-delete timestamps.

**Types**: `hard_rule`, `compliance_rule`, `fact`, `audience`, `voice`, `preference`,
`decision`, `deadline`, `relationship`, `person`, `organization`, `product`, `service`,
`terminology`, `example`, `anti_example`, `project_state`, `goal`, `task`, `process`,
`location`, `reference`.

**Statuses**: `proposed → approved | rejected`; `approved → superseded | expired | deleted`.
Only `approved`, non-deleted, in-validity-window memory is retrievable
(`isMemoryActive` in `packages/memory/src/validity.ts`).

## Lifecycle rules (enforced in `packages/memory/src/service.ts`)

- Proposing requires Space access; approving requires editor/admin rights.
- Approving a memory with `supersedesMemoryId` marks the older memory `superseded` in the
  same audited transition — approved memory is never silently overwritten.
- `forget` is a soft delete; verified permanent purge is a governance flow
  (`deletion_requests` table).
- Every transition emits an audit event.

## Suggestions

Candidates carry destination Space/Project, type, proposed value, conflicting approved
memory + its previous value, source + excerpt, confidence, rationale, and optional
expiration. Resolutions: **accept** (creates approved memory, supersedes conflicts),
**edit-then-accept**, **keep temporary**, **reject**. Review UX: Memory Inbox (batch,
quiet); modal interruptions are reserved for significant contradictions/deadlines.

## Injection safety

`extractCandidates` treats source text strictly as data:

- Instruction-like sentences are never promoted into candidate text.
- Sources matching injection patterns are flagged (`injectionSuspected`) and their
  candidates capped at low confidence.
- There is no code path from source content to approved memory or to any action.

Fixtures: `demoSources.injectionAttempt`; tests in `packages/memory/src/memory.test.ts`.
