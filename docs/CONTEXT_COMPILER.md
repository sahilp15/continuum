# ContextCompiler

`packages/context/src/compiler.ts`. Input: authenticated actor + `ContextRequest`
(org, Space, optional Project, integration, task, query, token budget, sensitivity
allowance). Output: `ContextBundle` — structured items, a rendered paste-ready block, and a
`ContextReceipt`.

## Pipeline order (security first)

1. Validate the request (Zod).
2. Assert Space access; assert Project belongs to that Space (resource-hiding errors).
3. Retrieve Space-scoped memories only — the store has no global query.
4. Drop and record inactive memory (rejected / expired / superseded / deleted / unapproved).
5. Enforce the surface's sensitivity allowance.
6. Drop other-Project memory.
7. Detect contradictions; losers are excluded and recorded.
8. Rank: precedence layer → priority → lexical relevance → recency.
9. Budget fit: compliance/hard rules and current Project facts are never dropped for
   budget; examples must earn inclusion via relevance; personal preferences append last and
   are labeled "never overrides Space rules".
10. Emit receipt + audit event.

## Layer mapping

`layerForMemory`: compliance_rule → `space_compliance_rule`; hard_rule/terminology →
`space_hard_rule`; audience/voice → `space_audience_voice`; example/anti_example →
`historical_example`; preference → `personal_preference`; everything else →
`project_fact` when project-scoped else `space_approved_fact`.

## Context Receipts

Every bundle answers: what was used, where it came from, why it was selected, who approved
it, what was excluded and why (`rejected`, `expired`, `superseded`, `sensitivity_blocked`,
`budget_exceeded`, `conflict_loser`, `not_relevant`), and which surface requested it.

## Roadmap

- Phase 3: hybrid lexical + pgvector retrieval for examples/history (Space-filtered before
  similarity), feedback loop (`context_feedback`), token-budget tuning per surface.
- The current lexical scorer is deliberately simple and deterministic; retrieval quality is
  measured by `packages/evals` before any sophistication is added.
