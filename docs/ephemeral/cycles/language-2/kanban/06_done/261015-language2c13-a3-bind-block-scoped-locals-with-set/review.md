Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language2c13-a3-bind-block-scoped-locals-with-set

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T15:16:37.583Z
- Stalled: no
- Brief mismatch: The card says docs_impact none and no living-document edits or deltas, but SET is a user-visible new tag. docs/living/architecture/language-contract.md still says 'SET, INPUT, CALL, macros and partials are not built yet', and its 'Surfaces that agree' section describes spec().blocks as openers with END_ closers only. The project rule says a change to a durable fact is recorded as a delta, and the card's User documentation section was left as the unfilled template (no user_visible, user_docs or waiver). The lead should either add a modify delta for the language contract (and a README/user_docs entry or waiver) or record why none is needed. This is not a finding against the build.
- Raised: f1, f2

Restatement: Add a single-tag statement {{SET name = expression}} to the deterministic, no-eval template language. It binds a local to the value that the same evaluator behind ${{ }} computes. The value is kept as it is (an array stays an array). In render a math result is stored as the number the output prints. The local is visible from the tag to the end of its innermost block, is fresh on each FOR iteration and never writes the caller's data. Bad names and bad shapes are located syntax errors at parse time. Lenient mode binds null for missing data and strict mode raises a located missing-variable. The tag is standalone for whitespace, and analyze, spec() and OpenAPI agree with the new tag. The lexer keyword lookup becomes own-property only, and the one evaluator bounds the size of a text after each filter and for a SET value. Templates that were valid before keep their output and errors, except the named exceptions. No existing test expectation changes except the logged surfaces.test.ts amendment.

## Findings

### f1: The frozen test tests/language/set.test.ts was edited by the build without a logged amendment (two st-size astral rows changed)

- Class: defect
- Status: withdrawn
- Serves: c12: c12 and m1 allow only the logged surfaces.test.ts amendment, and the packet says a change to a frozen test in section 4 is a deviation from the plan. The diff changes the expectation of two existing rows in set.test.ts (the file existed at base, index 24bded5 to 334e2b6, though the manifest lists it as 'add'). Both rows move maxOutputChars from 3 to 4 and lengthen the text, with no entry in the scope-exceptions log or test_amendments. The edit looks needed: with limit 3, the prefix text 'a\n ' (4 chars) already crosses maxOutputChars at 1:1 before the SET runs, so the original rows could never pass. But it is an unapproved change to the contract's tests, and the manifest is wrong about the file.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. git diff 02e8dc84..79dd65d -- tests/language/set.test.ts shows the two st-size astral rows changed (maxOutputChars 3 to 4; text 😀😀 to 😀😀😀). 2. The scope-exceptions log reads 'No scope exceptions are logged', and the lead's two manifest amendments name only the golden case files, scope.ts and surfaces.test.ts. 3. The manifest lists set.test.ts under 'add' while the diff is an edit of an existing file.
- Evidence: diff:tests/language/set.test.ts, test:st-size: astral: a literal with a filter over the limit is a limit-output at the SET, test:st-size: astral: a data text over the limit is a limit-output at the SET, doc:review-packet Scope exceptions log
- Review lead ruling after round 1: withdraw: tests/language/set.test.ts is logged in test_amendments (two astral size rows had text before the SET already over the limit), approved by the project lead

### f2: Render math output now round-trips through Number(formatNumber(result)) and back to text, which can change ${{ }} math output when the formatted text is not JavaScript's shortest number form

- Class: goal-risk
- Status: withdrawn
- Serves: m5: At base, visitVariable printed formatNumber(result) as is in render. Now evaluateValue returns Number(formatNumber(result)) and visitVariable prints it through valueToString/valueToText. That gives the same text only when formatNumber already emits the shortest round-trip form. If formatNumber prints an exponent-range or very large result in another form, an existing template prints a different text. The language contract says 'integers of any size ... print unchanged', and a fixed 15-significant-digit form of a tiny result is another case. Such a template was valid before, and m5 forbids any output change except the named ones. The st-compat guards cover only 7, 2.5, 0.3, Infinity and NaN.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Render in both base 02e8dc84 and head 79dd65d, with data {a: 1, b: 10000000, c: 1e15, d: 1e7}: '${{a / b}}', '${{c * d}}', '${{c * c * c}}' and '${{0 - 0 * a}}'. Compare render outputs byte for byte. Any difference shows the regression. Pinning these rows in st-compat closes the risk either way.
- Evidence: diff:core/src/interpreter.ts, code:core/src/interpreter.ts:642, doc:docs/living/architecture/language-contract.md
- Review lead ruling after round 1: withdraw: String(Number(s)) equals s for every s produced by String(number), including exponent forms, NaN, Infinity and -0; output text is unchanged
