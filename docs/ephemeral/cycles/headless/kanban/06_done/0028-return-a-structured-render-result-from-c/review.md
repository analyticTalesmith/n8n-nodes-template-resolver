Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0028-return-a-structured-render-result-from-c

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T01:08:55.260Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2, f3

Restatement: Core should expose a single structured render contract that the API, the CLI and the n8n node all consume. render(template, data, options) returns {ok, output, messages, stats{chars, estTokens, sectionsOmitted, iterations}, diagnostics} and never throws for template or data problems: on failure it returns ok false, an empty output and the located error first. Alongside it come validate (no data needed), spec (blocks, filters, operators, limits, version, covering every filter the engine accepts), a dependency-free ceil(chars/4) estimator that a tokenEstimator option can replace, and analyze, which now reports required and per-block-kind counts. resolveTemplate keeps returning strings and throwing. The n8n node renders through the structured result, writes output to its configured field and turns failures into NodeOperationErrors that carry line and column. No runtime dependency is added, core gets no n8n imports or I/O, and the build and bin are prepared for api/ and cli/.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T01:12:39.447Z
- Stalled: no
- Brief mismatch: none
- Raised: f4, f5

Restatement: Core must expose one structured render contract that the API, CLI and n8n node all consume. render returns {ok, output, messages, stats{chars, estTokens, sectionsOmitted, iterations}, diagnostics} and never throws for template or data problems: a failure gives ok false, empty output and the located error first. validate checks a template without data. analyze adds required and per-kind block counts. spec describes the language and lists every engine filter. A chars/4 estimator can be replaced by an option. resolveTemplate keeps its throwing string behavior. The node renders through the result, keeps writing to its configured field, and turns failures into located NodeOperationErrors. All of this ships with no runtime dependency and no n8n import or I/O in core. The revision adds rr-robust: render and validate never throw for non-object data or cyclic values, and each such case returns ok false with a diagnostic.

- Response to f1: withdraw (evidence: code:core/src/interpreter.ts:280, code:core/src/interpreter.ts:630, test:rr-robust: a strict FOR over a cyclic non-array value does not throw and is located)
- Response to f2: withdraw (evidence: code:core/src/render.ts:96, test:rr-robust: data that is null gives ok false with invalid-input at 1:1)

## Findings

### f1: render throws a raw TypeError for cyclic data in a strict FOR over a non-array value

- Class: defect
- Status: withdrawn
- Serves: c1: A data problem (a FOR target that is a cyclic object) escapes render as an uncaught native TypeError instead of ok false with a located type-error diagnostic, which breaks the 'never throws for template or data problems' contract. API, CLI and node callers would get a crash or 500 instead of a result.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: const o = {}; o.self = o; render('{{FOR o AS x}}a{{END_FOR}}', { o }) throws 'TypeError: Converting circular structure to JSON'. Verified by compiling core/src with tsc and calling render from node. The throw comes from JSON.stringify(iterable) while the interpreter builds its own TemplateError message (core/src/interpreter.ts:280). render then rethrows it because it is not a TemplateError (core/src/render.ts, 'if (!(error instanceof TemplateError)) throw error'). Smallest fix: build that message with the existing safe coercion (tryCoerceToString, which already catches stringify failures) instead of a bare JSON.stringify.
- Evidence: code:core/src/interpreter.ts:280, code:core/src/coercion.ts:316, diff:core/src/render.ts, doc:docs/living/architecture/headless-contract.md
- Reply after round 1 (fixed): restate: render could throw for this input; verify: rr-robust tests pass 7 of 7, full suite 678 pass; evidence: test:tests/headless/render-robust.test.ts

### f2: render throws when data is null or not an object, because data conversion sits outside the try

- Class: goal-risk
- Status: withdrawn
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

### f4: A cyclic data value used as output renders ok true with empty text instead of ok false with a diagnostic, and the rr-robust test accepts it

- Class: drift
- Status: filed (0035-follow-up-a-cyclic-data-value-used-as-ou)
- Serves: c9: c9 requires that render returns ok false with a diagnostic for cyclic data values. For render('${{a}}', {a: cyclic}, {strictMode: true}), render instead returns ok true, output '' and no diagnostics: a data problem passes silently as an empty substitution. The new rr-robust test only asserts typeof r.ok === 'boolean' and checks diagnostics only when ok is false, so it passes either way and does not verify the criterion.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: Compile core/src with tsc and run: const a={x:'v'}; a.self=a; render('a\n${{a}}', {a}, {strictMode:true}). The result is {ok:true, output:'a\n', diagnostics:[]}. render('${{a.self.self.x}}', {a}) behaves the same way. The cause is Interpreter.valueToString (core/src/interpreter.ts ~608): it calls tryCoerceToString, which swallows the JSON.stringify failure and returns null, and valueToString then turns null into ''. Smallest fix: make render report this case. One way is an interpreter option set only by render that throws a located type-error when an object value cannot be stringified. Then tighten the rr-robust cases to expect ok false. Keeping the change behind a render-only option leaves resolveTemplate's output unchanged (m1).
- Evidence: code:core/src/interpreter.ts:608, code:core/src/coercion.ts:305, diff:tests/headless/render-robust.test.ts, test:rr-robust: strict the cyclic value itself does not throw
- Review lead ruling after round 2: drift: cyclic data cannot arrive through JSON from the API, CLI or n8n; empty output for a cyclic value is a quirk not a throw; ticketed

### f5: render and validate still throw for a non-string template such as null

- Class: drift
- Status: filed (0036-follow-up-render-and-validate-still-thro)
- Serves: card-goal: Goal-critical question: can render throw for any template or data input? Yes. render(null, {}) and validate(null) throw a native TypeError ('Cannot read properties of null (reading length')') from the lexer, which sits outside any guard. The revision added a runtime guard for non-object data, but nothing guards the template. A JS library caller, or any consumer that does not pre-validate, gets an exception instead of the shared ok false or invalid-input result.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: Compile core/src with tsc and call render(null, {}). It throws TypeError: Cannot read properties of null (reading 'length'). validate(null) throws the same error. render(42, {}) returns ok true with output ''. Smallest fix: at the top of render and validate, return an invalid-input diagnostic at 1:1 when typeof template !== 'string', mirroring the existing data guard.
- Evidence: code:core/src/render.ts:96, code:core/src/render.ts:144, doc:docs/living/architecture/headless-contract.md
- Review lead ruling after round 2: drift: template is typed string and the API and CLI guarantee a string; a type violation by a library caller, ticketed
