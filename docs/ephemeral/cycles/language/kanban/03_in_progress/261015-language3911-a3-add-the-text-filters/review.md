Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language3911-a3-add-the-text-filters

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T03:42:07.721Z
- Stalled: no
- Brief mismatch: The card's must-not list differs from the packet's. It leaves out m2 (change what any existing filter outputs, or what ?? does) and qualifies m1 with 'other than the one named amendment (if any)', but no amendment is named anywhere. The card's interface contract also names the shorthands as 'spaces', 'places' and 'replacement text', while the spec and the frozen test require paramNames ['value']. That is consistent only through the language-contract rule that a shorthand is the parameter 'value'. I reviewed against the packet's five must-nots and the spec.
- Raised: f1, f2, f3

Restatement: Template authors should be able to reshape a value inside the deterministic, no-eval template language using eight new filters: upper, lower, title, replace, indent, quote, round and default. Each must be one row in the text group of the single filter registry. Every filter except default coerces its input to the printed text first. replace works on literal text only. indent and round take bounded integer parameters. default replaces any value that is not truthy. A missing, malformed or undeclared parameter must be a type-error located at the variable in every mode. Existing filters, ?? and existing tests must not change, no dependency may be added, and no pattern may be compiled from template text.

## Findings

### f1: round expands exponent text that is not a finite number instead of passing it through, and allocates without bound on a large exponent

- Class: defect
- Status: open
- Serves: c1: The settled spec says round passes through input that is not a finite number. roundDecimal accepts any digit string with an exponent and pads the digits to the exponent's length. The text '1e400' (Number gives Infinity) therefore renders as '1' followed by 400 zeros instead of '1e400'. Text such as '1e300000000' or '1e-999999999' makes padEnd or repeat build a string of hundreds of megabytes, or throw RangeError 'Invalid string length'. That error surfaces as a type-error instead of a pass-through, and a single data value sent through the api module can stall or exhaust memory before the maxOutputChars limit applies, which defeats deterministic, bounded rendering.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. render('${{ v | round }}', { v: '1e400' }, { strictMode: false }). Expected per spec: output '1e400'. Actual per code: a 401-character integer. 2. render('${{ v | round }}', { v: '1e-999999999' }, { strictMode: false }). Expected: output '1e-999999999'. Actual: '0'.repeat(999999999) throws RangeError, and the result is ok:false with a type-error. Smallest restoring change: return null from roundDecimal (so the text passes through) when Number(text) is not finite, or bound the exponent, before any padding.
- Evidence: diff:core/src/filters-text.ts, code:core/src/filters-text.ts:80, code:core/src/filters-text.ts:85, code:core/src/filters-text.ts:86, doc:spec.md (Behavior settled: round, input that is not a finite number passes through unchanged), test:ft-text: round (round), Infinity is not finite (covers only the literal 'Infinity', not exponent overflow)

### f2: Living documents edited directly, outside files_scope and outside the logged scope exceptions

- Class: drift
- Status: open
- Serves: card-goal: The card's write scope is core/src/filters-text.ts and tests/language/filters-text.test.ts. The scope-exception log approves only two delta files under docs/ephemeral/cycles/language/deltas/. The diff also edits docs/living/architecture/language-contract.md and docs/living/architecture/modules/template-resolver.md in place, and both are already marked 'state: built'. Living facts then change before the cycle's work merges and outside the delta/apply path, and are duplicated by the deltas, so applying those deltas could double-apply or conflict.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Compare the diff's changed paths with files_scope and the scope-exceptions table. docs/living/architecture/language-contract.md (new 'Text filters' section) and docs/living/architecture/modules/template-resolver.md (Filters paragraph) appear in the diff but in neither list.
- Evidence: diff:docs/living/architecture/language-contract.md, diff:docs/living/architecture/modules/template-resolver.md, doc:card.md (Scope table)

### f3: default's author-facing description and contract row omit the text values isTruthy also treats as falsy

- Class: drift
- Status: open
- Serves: card-goal: default uses isTruthy, which also treats the text values '0', 'false', 'no' and whitespace-only text as falsy, and the frozen tests confirm this for '0' and 'false'. The description shown by spec() and the contract table list only 'missing, empty, 0, false, an empty list or an empty object'. An author who writes ${{ answer | default="n/a" }} over a yes/no field gets 'n/a' for 'no' and cannot predict that from the documentation.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('${{ v | default="n/a" }}', { v: 'no' }, { strictMode: false }) gives 'n/a' by isTruthy. spec().filters entry 'default' and the language-contract table do not mention text values.
- Evidence: code:core/src/filters-text.ts:146, diff:docs/living/architecture/language-contract.md, doc:docs/living/architecture/modules/template-resolver.md (isTruthy: strings trimmed and lowercased, false for '', 'false', '0', 'no')
