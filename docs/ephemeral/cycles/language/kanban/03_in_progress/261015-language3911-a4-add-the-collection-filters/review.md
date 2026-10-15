Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language3911-a4-add-the-collection-filters

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T03:45:25.935Z
- Stalled: no
- Brief mismatch: The reviewer-brief rubric limits scope to filters-collection.ts and its test file, but files_scope also grants docs/ephemeral/cycles/language/deltas. The manifest lists tests/language/filters-collection.test.ts as 'add', yet the diff shows it as an existing file being modified (index 2e536da..d6b8e32), so the file was not new to this card. The card's must-not reads 'change any existing test expectation other than the one named amendment (if any)', but criterion m1 drops that exception and no amendment is named anywhere.
- Raised: f1, f2, f3, f4, f5, f6

Restatement: The card adds nine list-shaping filters (join, length, first, last, sort, unique, slice, lines, json) as rows of the collection group in the single filter registry. They must stay deterministic and free of eval. List filters coerce their input exactly as FOR does, and missing input counts as an empty list. sort must be stable, ordering numbers, then strings by code unit, then everything else, and sort=key must order objects by that key. unique keeps first occurrences. json prints compact JSON with sorted keys and rejects cycles. Every bad or undeclared parameter, and every object given to a list filter, must be a located type-error in both modes. The card must not change existing test expectations, add a runtime dependency or compile template-supplied regular expressions.

## Findings

### f1: The builder edited the frozen test file without a logged scope exception or a named amendment

- Class: defect
- Status: open
- Serves: m1: The frozen test is the plan's red test, and the builder changed its render options from RAW (strict by default) to strictMode:false. The edit makes the test match its name, but the builder changed a plan-owned test unilaterally, no scope exception is logged, and the card's 'named amendment' clause names none. If the original strict-default call was intended, the test now asserts different behavior from what was frozen.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Diff the test file between base f4e552a and head 010500d. Line ~188 changes render('${{ v | join="," }}|${{ v | length }}', {}, RAW) to render(..., {}, { ...RAW, strictMode: false }). Section 'Scope exceptions log' reads 'No scope exceptions are logged.' Smallest fix: log the change as a named test amendment or scope exception that the test owner accepts, or revert it and let the test owner amend it.
- Evidence: diff:tests/language/filters-collection.test.ts, test:fc-collection: a missing variable renders the same as an empty list in lenient mode, doc:docs/ephemeral/cycles/language/deltas

### f2: Living documents edited directly outside files_scope, while the two deltas the manifest adds are empty templates

- Class: defect
- Status: withdrawn
- Serves: card-goal: The card writes the collection-filter contract straight into docs/living/architecture/language-contract.md and modules/template-resolver.md, and neither path is in files_scope. The deltas meant to carry those changes (collection-filters-contract.md and collection-filters-module-page.md) contain only the placeholder comment under 'Proposed change'. The living docs therefore state the behavior as built before the cycle merges or a close review runs, and the deltas give apply and reviewers nothing describing the change.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Compare the diff paths with files_scope (core/src/filters-collection.ts, docs/ephemeral/cycles/language/deltas, tests/language/filters-collection.test.ts): docs/living/architecture/language-contract.md (+15 lines) and docs/living/architecture/modules/template-resolver.md (+2 lines) are outside it. Open both new delta files: their body is only the HTML comment 'Say what changes in the target document...'. Smallest fix: move the two living-doc edits into the bodies of their deltas and revert the direct edits to docs/living.
- Evidence: diff:docs/living/architecture/language-contract.md, diff:docs/living/architecture/modules/template-resolver.md, diff:docs/ephemeral/cycles/language/deltas/collection-filters-contract.md, diff:docs/ephemeral/cycles/language/deltas/collection-filters-module-page.md
- Review lead ruling after round 1: withdraw: living documents are changed by the card on purpose: docs_impact lists them and docs_deferred is true

### f3: An object passed as JSON text (the n8n mapping form) silently becomes an empty list in every mode, unlike FOR

- Class: goal-risk
- Status: open
- Serves: c1: n8n mapping values reach the core as strings, so an object mapped into a variable arrives as text such as '{"a":1}'. tryCoerceToArray returns null for a string starting with '{'. toList throws only when typeof input === 'object', so for this string it returns []. join prints '', first and last print nothing, and sort, unique and slice give [], with ok true even in strict mode. FOR raises TypeError in strict mode for the same non-coercible value, so this is not 'coerced exactly as FOR coerces', and the author's mistake passes silently.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('${{ v | join="," }}', { v: '{"a":1}' }, { standaloneLines: false, strictMode: true }) returns ok true and output ''. Reading: toList calls tryCoerceToArray, which returns null for a '{'-prefixed string (module page, Coercion), and the object check fails because typeof is 'string', so it falls through to return []. Compare FOR over the same value in strict mode, which throws TypeError (module page, Interpreting/FOR). Smallest fix: in toList, treat any non-null, non-undefined input that tryCoerceToArray rejects as the 'needs a list' error, and add a test row for a JSON-object string.
- Evidence: code:core/src/filters-collection.ts:13, doc:docs/living/architecture/modules/template-resolver.md, test:fc-collection: %s rejects an object input as a type-error saying a list is needed

### f4: sort's numeric comparator is inconsistent for NaN and for equal infinities, so the order becomes engine-defined

- Class: goal-risk
- Status: open
- Serves: c2: compare returns (a - b) for every number. NaN - x is NaN, which Array.prototype.sort treats as 0, so NaN counts as equal to every number while those numbers still order among themselves. That breaks transitivity, and the resulting order is implementation-defined, so a headless-core caller passing [3, NaN, 1] can get different output on different engines or versions. Infinity - Infinity also yields NaN. The project requires sort to be deterministic.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: COLLECTION_FILTERS.find(f => f.name === 'sort').apply([3, NaN, 1, 2], {}): the comparator calls compare(3, NaN) = NaN (treated as 0) and compare(3, 1) = 2, which is inconsistent, so ECMAScript leaves the result order implementation-defined. Smallest fix: give NaN a fixed place (for example, rank it with the 'other' values or after all numbers) and compare with < and > instead of subtraction, plus a test row containing NaN.
- Evidence: code:core/src/filters-collection.ts:94, test:fc-order: sort, numbers ascending

### f5: textOf copies the output step's text rule instead of reusing it

- Class: drift
- Status: filed (261015-language3911-a11-follow-up-textof-copies-the-output-step)
- Serves: card-goal: join must print each item 'as the output step prints it'. textOf re-implements that rule, and its own comment says it is 'the same rule as valueToText in filters.ts'. If the output step's text form changes, join silently diverges from it.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Read core/src/filters-collection.ts:6-10. The comment points to valueToText in filters.ts, and the body is a separate copy. Smallest change: import and reuse the output step's function, exporting it if needed.
- Evidence: code:core/src/filters-collection.ts:6

### f6: length counts UTF-16 code units, which the contract calls 'characters', and no test uses non-BMP text

- Class: drift
- Status: filed (261015-language3911-a12-follow-up-length-counts-utf-16-code-unit)
- Serves: c1: c1 and the spec say length counts the 'characters of a text', while the same contract says 'code unit' wherever it means code units (sort, json). input.length returns 2 for a single emoji, so an author counting characters in a prompt gets a different number from what the contract wording promises. The lead should settle the wording or the behavior.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: COLLECTION_FILTERS.find(f => f.name === 'length').apply('\uD83D\uDE00', {}) returns 2, while the input is one character. No row in the frozen test covers a non-BMP character.
- Evidence: code:core/src/filters-collection.ts:117, doc:docs/living/architecture/language-contract.md
