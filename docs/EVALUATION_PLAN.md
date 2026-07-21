# Evaluation plan

`packages/evals` measures retrieval quality deterministically on every test run — quality
is a gate, not a dashboard.

## Fixture shape

`EvalFixture`: actor, `ContextRequest`, memories that MUST be included, memories that MUST
be excluded, **forbidden memories from other Spaces** (any appearance = contamination), and
required rule texts. Current fixtures: `northbank-march-newsletter`,
`fizzpop-instagram-caption`.

## Metrics

- **Required-rule recall** — must be 1.0 (binding rules can never be dropped).
- **Retrieval precision errors** — excluded-but-included IDs; must be empty.
- **Cross-Space contamination** — must be **zero**; a nonzero value blocks release.
- Token efficiency (bundle estimate vs budget) — tracked, thresholds set in Phase 3.

## Growth plan

- Phase 2: extraction evals (candidate precision on seeded sources, injection fixtures).
- Phase 3: contradiction detection, superseded-exclusion, hybrid-retrieval relevance sets;
  add token-efficiency thresholds; expected-receipt assertions.
- Phase 7: preflight precision/recall fixtures (known-violation corpora per Space).
- Beta: suggestion approval rate, context usefulness feedback, and receipt views feed back
  into fixture growth (`context_feedback`, `preflight_feedback` tables).

Run: `pnpm turbo run test --filter=@continuum/evals`.
