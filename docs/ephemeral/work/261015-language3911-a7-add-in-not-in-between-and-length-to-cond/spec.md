# Spec

## Acceptance criteria

- op-in: `x in ["a","b"]`, `x in list_var` and `x in "text"` (substring) and the `not in` forms evaluate as written, with a located `type-error` for an operand that cannot be tested
- op-between: `x between [1, 10]` is inclusive at both ends; a non-numeric operand is a `type-error` located at the condition
- op-length: `.length` works on arrays and strings in conditions and in output; an object key named `length` wins over the built-in
- op-equality: a side written as a quoted literal compares as text (`z == "01234"` is false for 1234); an unquoted number on the right of `contains` keeps its written text
- op-unknown: an unrecognized word next to an operator is an error in every mode (ADR 0003), not only in strict mode
- op-spec: `spec()` and `analyze` list the new operators, and `analyze` records the variables read by `in`, `between` and `length`

## Behavior settled

Same in `render` and `resolveTemplate`; strict mode governs missing data only, and conditions never raise a missing-variable error (a missing name reads as null). Errors are `type-error`, located at the IF, ELSEIF, LIST_ITEM or ternary node (never 1:1 in the output), and never a raw JavaScript exception (cyclic values and BigInt included: do not call `JSON.stringify` on an operand in a message).

**Operand.** A literal (`true`, `false`, `null`, a number, a quoted string) or a variable path. An operand that is not a literal, is not itself a variable key and has whitespace outside quotes (`b c`) is a `type-error` "Unrecognized condition" in every mode, for every operator's operands (comparison, string, type-check, `in`, `between`, list items); `analyze` already reports the same text as `unrecognized-condition`. An unknown operator word (`a like b`, `a matches /x/`, `a equals b`) ends in the same error; no regular expression written in a template is ever compiled.

**in / not in.** Case-insensitive operator words, written with whitespace on both sides. Right side is one of: a list literal `[a, "b", 3]` (items are operands separated by commas outside quotes; `[]` is the empty list; an empty item, a nested `[`, or a missing `]` is a `type-error`), a variable path, or a quoted text. Bracket and comma splitting respects quotes (`x in ["a,b", "c]"]`) and escaped quotes the way the logical split does.
- Right side an array (literal or variable): true when some element equals the left side by the `==` rule below (numeric when neither side is quoted and both are numeric, else text). Array or object elements and BigInt elements never match.
- Right side a string (quoted or from a variable): substring test, case-sensitive, the same result as `"text" contains x` (an empty left side is contained).
- Left side missing or null: false for `in`, true for `not in` (missing data, no error). `not in` is exactly the negation of `in`.
- `type-error`: the right side is a number, boolean or non-array object; the left side is an array, an object (cyclic or not) or a BigInt.
- A list variable that is a text such as `"a,b"` is a string, tested as substring (no coercion to a list).

**between.** `x between [lo, hi]`, word case-insensitive, exactly two operands (variable paths or literals); each of x, lo, hi goes through the same number coercion as `>` (numbers and numeric text). Inclusive at both ends; lo greater than hi is simply false (no swap). Any operand that is not numeric (including null or missing x, as with `>`), a list with other than two items, or a right side that is not a list literal is a `type-error` located at the condition.

**Precedence.** `in`, `not in` and `between` split at the same tier as `contains`: after AND/OR, NOT and the comparison operators, before type checks. They are found outside quotes, brackets and parentheses. NOT, AND and OR combine with them with no new rule: `NOT x in [..]` is `NOT (x in [..])`, `a in [..] AND b`, `a OR b not in [..]`, `(a in [..]) AND (b between [1,2])`. Chaining two operators (`a in b == c`, `a in b in c`, `a between [1,2] contains x`) is an Unrecognized condition error, never a silent result. The operator words inside a quoted string never split (`title contains "in the end"`, `x == "a between b"`).

**.length.** A path segment named `length`, in conditions (`items.length > 2`), in output (`${{items.length}}`, in math, a CASE subject, a ternary value) and after any segment (`user.tags.length`, `items.0.length`). Rules, applied in order at the segment: an array gives its element count; a string gives its UTF-16 code unit count (the same unit as the `length` filter, so one emoji is 2), unless the string is a JSON object with its own key `length`, which then wins; an object with an own key `length` (any value, null and undefined included) returns that key; any other value (number, boolean, null, an object without the key) behaves as before (null). Missing data stays null (no zero). `length` as the root name is an ordinary variable.

**Equality (op-equality).** `==` and `!=`: when either side is written as a quoted literal both sides compare as text (`String(left) == String(right)`); otherwise the existing rule (numeric when both read as numbers, else text) is unchanged. `contains`, `startsWith`, `endsWith`: the right side written as an unquoted number keeps its written text (`x contains 1.50` looks for `1.50`, `007` for `007`), no round trip through a number; quoted text and variables as before. The same quoted-versus-unquoted rule decides the match for `in` list items. Existing outputs for unquoted comparisons do not change.

**Spec and analyze.** `spec().operators` gains `in`, `not in`, `between`, `.length` (existing entries keep their order and spelling; each name appears once). `analyze` lists as read variables the left operand, the right operand or every list item that is a variable path, the bounds and left of `between`, and the root of a `.length` path (path text is recorded as written, e.g. `items.length`); literals are not variables; loop names and `@` names stay excluded. A malformed `in` or `between` condition gives the `unrecognized-condition` diagnostic at the condition, as `validate` shows it.

## Interface

- `core/src/expressions.ts`: `splitMembership` and `splitBetween` (exported, like `splitStringOp`), used by both `evaluateCondition` and `conditionOperands` so the evaluator and `analyze` read the same operands; one length helper used by both path walkers (`resolveValue` here and `resolveNestedPath` in `interpreter.ts`); `parseLiteral` may carry whether the operand was quoted and its written text. No other public name changes.
- `spec.ts`: four entries added to the operator list. `analyze.ts` changes only if `conditionOperands` needs it.
- Out of scope: lexer and parser (the conditions must already reach `evaluateCondition` intact; report if one does not), filters, `matches`.
