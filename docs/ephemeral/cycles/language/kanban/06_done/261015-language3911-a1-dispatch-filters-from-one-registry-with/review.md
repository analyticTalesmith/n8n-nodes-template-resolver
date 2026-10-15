Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language3911-a1-dispatch-filters-from-one-registry-with

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T02:24:37.972Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2

Restatement: The card makes one mutable registry of filter definitions (name, params, description, paramNames, apply) the only place filters are listed, so render, spec() and analyze/validate all read it and a later card can add a row without touching dispatch. Filters take and return values, and the six built-ins coerce their input to text exactly as the output step does, so no existing template output changes. Filter calls are parsed once at parse time with quotes respected. A parameter a filter does not declare is a located type-error, not a silent fallback. An unterminated quote in a ?? default no longer swallows the filters after it. Two empty group files feed the registry. No runtime dependency is added and no template text is evaluated as code.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T02:28:42.532Z
- Stalled: no
- Brief mismatch: none
- Raised: none

Restatement: Make one mutable registry of filter definitions the single source for render, spec() and analyze/validate. Filters take and return values, and the six existing filters coerce to text first, so no existing template output changes. Filter calls are parsed once at parse time with quotes respected, so fence="a=b" keeps its whole language. A named parameter a filter does not declare is a located type-error. An unterminated quote in a ?? default no longer swallows the later filters. Two empty group files feed the registry for later cards. No existing test expectation changes beyond the spec test, no runtime dependency is added, and no template text is evaluated as code.

- Response to f1: withdraw (evidence: code:core/src/analyze.ts:186, code:core/src/render.ts:110, test:fr-args: validate and analyze report the same undeclared parameter)

## Findings

### f1: validate and analyze accept an undeclared filter parameter that render rejects

- Class: goal-risk
- Status: withdrawn
- Serves: card-goal: escape_md:mode=block passes validate() and analyze() with no diagnostic, then render() fails with a type-error. The card goal and ADR 0003 want typos caught before a run by validate and analyze, and the brief asks whether every bad filter call fails with a located error.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Run validate('${{ v | escape_md:mode=block }}') and analyze on the same template, with no data. The diff's analyze.ts only checks FILTER_REGISTRY.some(f => f.name === name), so no diagnostic is produced and ok is true. render() on the same template returns a type-error at 1:1, because the paramNames check lives only in applyFilter. Each call is already parsed at parse time, so filter.params and the definition's paramNames are available in the analyze walker.
- Evidence: diff:core/src/analyze.ts, diff:core/src/filters.ts, doc:docs/living/decisions/adr/0003-unknown-names-are-always-errors.md, test:fr-args: an undeclared parameter is a type-error at the variable
- Reply after round 1 (fixed): restate: validate and analyze accepted undeclared filter parameters that render rejects; verify: analyze reports type-error via shared helper; validate maps it to error; jest 1420 and tsc pass; evidence: code:core/src/analyze.ts:189

### f2: FILTERS is a load-time snapshot that goes stale when the registry changes

- Class: drift
- Status: filed (261015-language3911-a2-follow-up-filters-is-a-load-time-snapsho)
- Serves: c1: FILTERS = listFilters() is evaluated once at module load, so a definition pushed into FILTER_REGISTRY later is missing from FILTERS. That is a second, stale copy of the filter list. The spec says no name is looked up once at load, and the brief says the registry is the only place a filter name is listed.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Push a definition into FILTER_REGISTRY after import and compare FILTERS.map(f => f.name) with FILTER_REGISTRY.map(f => f.name). They differ. Only a test taken at load time passes.
- Evidence: diff:core/src/filters.ts, doc:docs/living/architecture/modules/template-resolver.md
