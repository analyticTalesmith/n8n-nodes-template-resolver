Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language3911-a6-make-math-and-output-errors-visible

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T04:11:22.300Z
- Stalled: no
- Brief mismatch: Three problems in the brief, for the lead. (1) card.md says 'All in render only: resolveTemplate keeps its outputs', but the objective, spec.md and the frozen tests make only mt-zero and mt-float render-only, and apply mt-hyphen, mt-lenient and mt-cyclic to resolveTemplate too. I reviewed against the objective and spec. (2) c2 asks for 'at most 15 significant digits' and also 'integers print unchanged', and spec adds 'large integers print unchanged'. An integer with 16 or more digits cannot meet both. Spec settles it in favour of integers, so I reviewed against that. (3) The card's interface contract asks for the module page and language contract to be updated, but files_scope lists only five code and test files, and project rules say living documents change only through deltas. The scope cannot be met and the documentation instruction followed at the same time. Separately, mt-hyphen turns a previously working `${{a-b}}` (a=10, b=4, printed 6) into silent empty output in lenient mode. The frozen test pins this, so it is a design choice in the brief, but it runs against the card goal of ending silent output.
- Raised: f1, f2, f3, f4, f5, f6

Restatement: In the headless, no-eval template core, math and output mistakes should no longer pass silently. In render, a division or modulo by zero should be a type-error located at the variable in every mode, and arithmetic results should print rounded to 15 significant digits so float noise disappears while integers and negatives print unchanged. resolveTemplate keeps its old Infinity/NaN and unrounded output. In both entry points, a hyphen between two ASCII letters joins a name (and a missing hyphenated name suggests the spaced subtraction form), a malformed math expression is a located type-error in lenient mode too, and a value with no text form (cycle, BigInt) used as output is a located type-error instead of ok with empty text. None of this may change existing test expectations, add dependencies, evaluate template text as code, or let unknown names or bad parameters pass in lenient mode.

## Findings

### f1: formatNumber rounds integers with 16 or more significant digits, so integer results no longer print unchanged in render

- Class: defect
- Status: fixed
- Serves: c2: In render, an arithmetic result that is an integer with more than 15 significant digits (for example a safe integer ID or count near 2^53) is rounded to 15 digits and prints a different integer. This breaks 'integers ... print unchanged' (spec: 'large integers print unchanged') and silently corrupts the output.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('${{1234567890123456 + 0}}', {}): formatNumber computes Number((1234567890123456).toPrecision(15)), which is 1234567890123460, so the output is '1234567890123460' instead of '1234567890123456'. Likewise '${{x * 1}}' with x = 9007199254740991 prints 9007199254740990. The frozen test only covers 1000000 * 1000000 (13 digits), so the gate does not catch this. Smallest change: in formatNumber, return String(n) when Number.isInteger(n), and round only non-integers.
- Evidence: diff:core/src/expressions.ts, code:core/src/expressions.ts:845, test:mt-float: [render-strict] ${{1000000 * 1000000}} prints 1000000000000
- Reply after round 1 (fixed): restate: formatNumber rounded integers of 16+ digits; verify: Now returns String(n) for integers; rows for 1234567890123456 and 9007199254740991 pass; evidence: test:tests/language/math.test.ts

### f2: The unprintable-value check runs before every filter, so filters that turn such a value into a printable result now fail

- Class: goal-risk
- Status: fixed
- Serves: card-goal: Spec c5 makes an unprintable value an error when it is used as output, 'after filters that keep it'. The new pre-filter call this.valueToString(value) throws before any filter runs. A template that reduces such a value to printable text, such as `${{xs | length}}` with a list that holds a cycle or a BigInt, used to print a count and is now a type-error in both entry points. A valid output turns into an error, which the card did not ask for, and the language-contract edit writes the broader rule ('or before a filter') into the living contract.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Let xs = [1n, 2n] (or a cyclic array). render('${{xs | length}}', {xs}) and resolveTemplate('${{xs | length}}', new Map([['xs', xs]])) now return type-error 'Cannot print a value with no text form'. The length filter returns the number 2, which prints. Smallest change: limit the pre-filter check to filters that coerce their input to text (the text filters and default), or check the final value after filters plus the text-coercing step, and leave collection filters such as length, first, last and slice that return a printable value alone. Align the language-contract wording with whatever the fix settles.
- Evidence: diff:core/src/interpreter.ts, code:core/src/interpreter.ts:1020, doc:docs/living/architecture/language-contract.md, test:mt-cyclic: [render-strict] a cyclic object as output after a filter that keeps the value (trim) is a type-error
- Reply after round 1 (fixed): restate: Pre-filter unprintable check broke xs | length; verify: Filters run one at a time; check only before text-coercing filters; rows for length, first, json pass; evidence: test:tests/language/math.test.ts

### f3: hasStrayCharacter plus isUnparseableMath turn plain keys holding characters like ':' or '#' into math type-errors, even when the key exists with a null value

- Class: goal-risk
- Status: fixed
- Serves: card-goal: Any variable path with a character outside letters, digits, _, @, ., whitespace and '-' (for example 'a:b', 'Order #', an emoji key) is now tried as math and fails with a MathSyntaxError. isUnparseableMath then rethrows it whenever the looked-up value is null, including when the key is present with value null. Spec c5 says null still prints empty and missing data stays lenient (ADR 0003: strict mode governs missing data). Before this change, isMathExpression did not match ':' and the result was empty text. resolveTemplate output also changes for these keys, and in strict mode a missing such key loses its missing-variable code and 'Available variables' suggestion.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('${{a:b}}', {'a:b': null}, {strictMode: false}): before the change, output ''; now ok false with type-error 'Unexpected character ":" in math expression'. render('${{Order #}}', {}, {strictMode: false}) is now a type-error instead of empty, and render('${{a:b}}', {}) in strict mode is a type-error instead of missing-variable. Smallest change: in isUnparseableMath, rethrow the math error only when the root key is absent (a MissingVariableError, or no such key in lenient mode), never when the key exists. Then decide whether a stray character in a key that is merely absent should count as malformed math or as missing data.
- Evidence: diff:core/src/interpreter.ts, code:core/src/interpreter.ts:983, code:core/src/interpreter.ts:1011, code:core/src/interpreter.ts:1106, doc:docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
- Reply after round 1 (fixed): restate: Stray-character math error hit existing or merely odd keys; verify: Math error rethrown only when root key is absent and text holds a number literal; mt-keys rows pass; evidence: test:tests/language/math.test.ts

### f4: The hyphen and name-character rules are duplicated in interpreter.ts instead of using the shared helper

- Class: drift
- Status: sustained
- Serves: card-goal: Polish question: duplicated math checks. Spec says one hyphen-rule helper, exported from expressions.ts, serves the tokenizer, mathVariableNames and isMathExpression. joinsName is not exported, and subtractionHint re-implements letter-hyphen-letter with its own regexes. hasStrayCharacter adds a third character class (Unicode letters and digits) that disagrees with NAME_CHAR (ASCII only) in expressions.ts. If the rule changes in one place, render, analyze and the suggestion hint drift apart (analyze, for example, does not apply the stray-character test).
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Compare joinsName in core/src/expressions.ts with the regexes in subtractionHint, and NAME_CHAR with hasStrayCharacter in core/src/interpreter.ts: three definitions of what belongs to a name.
- Evidence: diff:core/src/expressions.ts, diff:core/src/interpreter.ts, code:core/src/interpreter.ts:1106, code:core/src/interpreter.ts:1114
- Review lead ruling after round 1: sustain: the spec asks for one shared hyphen and name-character rule; fix it together with the stray-character handling

### f5: The output step no longer uses valueToText, so the text form has two owners

- Class: simplification
- Status: open
- Serves: cycle-goal: The language contract says filters coerce their input 'exactly as the output step does' and join items 'print as the output step prints them'. The diff drops valueToText from the interpreter and re-implements printing with tryCoerceToString. Any later change to valueToText in filters.ts now silently diverges from what ${{x}} prints.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: In core/src/interpreter.ts, valueToString now calls tryCoerceToString directly, while filters still use valueToText from filters.ts. Change either one and ${{x}} and ${{x | join}} print the same item differently. A smaller shape keeps valueToText as the single printer and adds only the unprintable check.
- Evidence: diff:core/src/interpreter.ts, doc:docs/living/architecture/language-contract.md

### f6: Living documents edited directly, outside files_scope, with no scope exception logged

- Class: drift
- Status: withdrawn
- Serves: cycle-goal: The diff edits docs/living/architecture/language-contract.md and docs/living/architecture/modules/template-resolver.md. Neither file is in files_scope, the scope exceptions log is empty, and project rules say living documents change through cycle deltas applied when the work merges. Editing them in the work branch means the durable record can drift from the delta history.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Section 4 shows diffs to both living documents. The manifest and files_scope list only core/src/errors.ts, expressions.ts, interpreter.ts, render.ts and tests/language/math.test.ts, and the scope exceptions log reads 'No scope exceptions are logged.'
- Evidence: diff:docs/living/architecture/language-contract.md, diff:docs/living/architecture/modules/template-resolver.md
- Review lead ruling after round 1: withdraw: living documents are changed on purpose: docs_impact lists them and docs_deferred is true
