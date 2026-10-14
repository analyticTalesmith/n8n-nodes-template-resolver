Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0028-return-a-structured-render-result-from-c

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T01:08:55.260Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2, f3

Restatement: Core should expose a single structured render contract that the API, the CLI and the n8n node all consume. render(template, data, options) returns {ok, output, messages, stats{chars, estTokens, sectionsOmitted, iterations}, diagnostics} and never throws for template or data problems: on failure it returns ok false, an empty output and the located error first. Alongside it come validate (no data needed), spec (blocks, filters, operators, limits, version, covering every filter the engine accepts), a dependency-free ceil(chars/4) estimator that a tokenEstimator option can replace, and analyze, which now reports required and per-block-kind counts. resolveTemplate keeps returning strings and throwing. The n8n node renders through the structured result, writes output to its configured field and turns failures into NodeOperationErrors that carry line and column. No runtime dependency is added, core gets no n8n imports or I/O, and the build and bin are prepared for api/ and cli/.

## Findings

### f1: render throws a raw TypeError for cyclic data in a strict FOR over a non-array value

- Class: defect
- Status: fixed
- Serves: c1: A data problem (a FOR target that is a cyclic object) escapes render as an uncaught native TypeError instead of ok false with a located type-error diagnostic, which breaks the 'never throws for template or data problems' contract. API, CLI and node callers would get a crash or 500 instead of a result.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: const o = {}; o.self = o; render('{{FOR o AS x}}a{{END_FOR}}', { o }) throws 'TypeError: Converting circular structure to JSON'. Verified by compiling core/src with tsc and calling render from node. The throw comes from JSON.stringify(iterable) while the interpreter builds its own TemplateError message (core/src/interpreter.ts:280). render then rethrows it because it is not a TemplateError (core/src/render.ts, 'if (!(error instanceof TemplateError)) throw error'). Smallest fix: build that message with the existing safe coercion (tryCoerceToString, which already catches stringify failures) instead of a bare JSON.stringify.
- Evidence: code:core/src/interpreter.ts:280, code:core/src/coercion.ts:316, diff:core/src/render.ts, doc:docs/living/architecture/headless-contract.md
- Reply after round 1 (fixed): restate: render could throw for this input; verify: rr-robust tests pass 7 of 7, full suite 678 pass; evidence: test:tests/headless/render-robust.test.ts

### f2: render throws when data is null or not an object, because data conversion sits outside the try

- Class: goal-risk
- Status: fixed
- Serves: card-goal: One contract for API, CLI and node: render(template, null) throws 'Cannot convert undefined or null to object' from Object.entries(data) before the try block, so a JS or CLI caller that passes JSON 'null' as data gets an exception. The contract reserves an invalid-input diagnostic code for exactly this case.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('${{x}}', null as any) throws TypeError 'Cannot convert undefined or null to object' (verified with compiled core). Smallest fix: move the Map construction into the try, or check that data is a non-null object and return ok false with an 'invalid-input' diagnostic at 1:1.
- Evidence: diff:core/src/render.ts, doc:docs/living/architecture/headless-contract.md
- Reply after round 1 (fixed): restate: render could throw for this input; verify: rr-robust tests pass 7 of 7, full suite 678 pass; evidence: test:tests/headless/render-robust.test.ts

### f3: spec's filter list is a hand-maintained copy beside applyFilter's switch, not derived from it

- Class: drift
- Status: filed (0034-follow-up-spec-s-filter-list-is-a-hand-m)
- Serves: c4: A filter added to applyFilter but not to FILTERS would be missing from spec. It would also be rejected by analyze/validate as unknown-filter, because KNOWN_FILTERS now derives from FILTERS, while render accepts it. The frozen test pins a fixed fixture list, so it would not catch the divergence.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Add a 'case "upper"' to applyFilter only. spec().filters lacks it, validate('${{a | upper}}') reports unknown-filter, and render succeeds. Note for the lead: dispatching applyFilter from FILTERS, or asserting the two match in a test, would close it.
- Evidence: diff:core/src/filters.ts, diff:core/src/analyze.ts, test:rr-spec: lists exactly the engine's filters
- Review lead ruling after round 1: drift: valid maintenance risk, outside the criteria; ticketed
