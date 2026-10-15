# Spec

## Acceptance criteria

- cs-values: `{{WHEN "a", "b"}}` matches when the CASE value equals either value
- cs-var: `{{WHEN other}}` matches when the CASE value equals the value of the variable `other`; a missing variable follows strict mode (an error in strict, empty text in lenient)
- cs-compare: `{{WHEN >= 10}}` works with `==`, `!=`, `>`, `<`, `>=`, `<=`, using the equality and numeric rules of the operators card
- cs-errors: an empty WHEN, or a comparison mixed with a list of values, is a `syntax-error` located at the WHEN tag
- cs-analyze: `analyze` records the variables a WHEN names as `case` usage

## Behavior settled

Same in `render` and `resolveTemplate`. Unknown names and bad operands are errors in every mode (ADR 0003); strict mode governs missing data only.

**Forms of a WHEN.** The text after `WHEN` is one of:
1. a list of one or more matchers separated by commas outside quotes: each a quoted text (`"a"`, `'a'`), a number (`5`, `-2`, `1.50`), `true`, `false`, `null`, or a variable path (`other`, `user.plan`, `first-name`; the same names the CASE subject accepts). Spaces around commas are free (`"a","b"`, `"a" , "b"`). A comma inside quotes belongs to the text.
2. one comparison: an operator `==`, `!=`, `>=`, `<=`, `>`, `<` then exactly one matcher (`>= 10`, `== "a"`, `!= other`, `< limit.max`).
Tag words are upper case only, as for every tag (the lexer does not accept lower case); quotes may be `"` or `'`. A quoted text is not unescaped (same as conditions).

**Syntax errors** (`syntax-error`, located at the WHEN tag line and column, raised at parse so render, validate and analyze all report it): nothing after `WHEN`; an empty list item (`"a",`, `,"b"`, `"a",,"b"`); an unterminated quote; an item that is neither a literal nor a variable path (`a b`, `"a" "b"`, `1abc`, `x==1`); a comparison with no operand, with more than one operand (`>= 1, 2`, `> 1 > 2`) or mixed with a list item before it (`"a", > 5`). The message names the problem and the hint shows the valid forms.

**Matching.** The CASE value is turned into text exactly as today (`valueToString` of the CASE path: missing and null are empty text, arrays and objects are JSON, a cyclic value or a BigInt is the existing located `type-error`). Every matcher is turned into text the same way: a quoted text is itself; a number, `true` or `false` is its written text; `null` is empty text; a variable path is read with the same lookup as the CASE value (strict mode: a missing root name is a located `missing-variable` error; lenient: empty text), and a cyclic or BigInt value is the same `type-error`. Two texts are then equal by the one equality rule of the operators card (`valuesEqual` in `expressions.ts`): when either side was written as a quoted text both compare as text, otherwise two numeric texts compare as numbers and anything else as text. So `{{WHEN "1"}}` never matches `1.0`, while `{{WHEN 1}}` matches `1.0` and `"01"`, and `{{WHEN "a"}}` keeps matching text exactly as before. A variable matcher counts as unquoted. A WHEN with a list matches when any item matches; the first matching WHEN in source order wins; DEFAULT renders when none match.
- `==` is the same test as a one-item list; `!=` is its negation.
- `>`, `<`, `>=`, `<=` compare numbers with the rule of `>` in conditions (`evaluateNumericComparison`): a side that is not numeric (including empty text for a missing or null value) is a `type-error` located at the WHEN node, never a raw exception and never silently false.
- A runtime error in a matcher (missing variable in strict mode, unprintable value, non-numeric comparison) is located at its WHEN node.
- The CASE subject lookup and its errors are unchanged (a strict missing subject raises before any WHEN is read).
- A lenient missing subject or variable is empty text, so `{{WHEN ""}}` and a missing variable matcher both match an empty or missing subject; this keeps the existing empty-subject tests.

**AST.** `WhenNode.value` keeps its meaning for the single quoted form (the text of the first quoted value, `""` when the first matcher is not a quoted text) so existing consumers and tests do not change. `WhenNode` gains `match`: a list matcher (items) or a comparison matcher (operator and one item); an item is a literal (text, quoted flag) or a path (list of segments). Types live in `types.ts`.

**analyze.** Every path item of a WHEN, in a list or in a comparison, is recorded as a read variable of kind `case` (not optional), with the same root and loop-scope rules as the CASE subject (an `@` name or a live loop name is excluded). Literals are not variables. A WHEN that fails to parse is the existing syntax diagnostic. `blocks.CASE` counting is unchanged.

**spec.** `WHEN` args become `value[, value...] | variable | operator value` and its description says it matches a list, a variable or a comparison; `CASE` description follows. `spec().operators` is unchanged (the six comparison operators already exist).

## Interface

- `core/src/expressions.ts` (added to the manifest as an edit, so the equality, numeric and literal helpers are reused, not copied): export `valuesEqual`, `evaluateNumericComparison` and the `Operand` type; add the shared quote-aware comma splitter used by both the WHEN parse and the existing list-literal parse (no second quote scanner). The existing behavior and outputs of conditions do not change.
- `core/src/parser.ts`: `parseWhen` reads the forms above and builds `match`; the old `extractQuotedValue` regex is replaced.
- `core/src/interpreter.ts`: `visitCase` evaluates each WHEN's matcher through one helper; the first match wins.
- Tests: `tests/language/case.test.ts` (table-driven `it.each`, names begin with the criterion id) and a golden case `tests/golden/render-cases/lang-case/` (`template.md`, `data.json`, `expected.md`, `options.json` when needed) picked up by the existing harness.
