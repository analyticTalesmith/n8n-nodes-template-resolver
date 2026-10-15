# Spec

## Acceptance criteria

- mt-zero: in `render`, a math expression that divides (`/`) or takes a remainder (`%`) by zero is a `type-error` located at the variable, in strict and lenient mode alike (`${{x / 0}}`, `${{x % zero}}`, `${{0 / 0}}`, a zero from a sub-expression such as `${{x / (a - a)}}`); `resolveTemplate` keeps printing `Infinity` / `NaN` as before
- mt-float: in `render`, an arithmetic result prints with at most 15 significant digits (`${{0.1 + 0.2}}` prints `0.3`, `${{x * 3}}` with 1.1 prints `3.3`; `1/3` prints `0.333333333333333`; integers, negative numbers and large integers print unchanged); `resolveTemplate` keeps its old `String(result)`
- mt-hyphen: in math and plain paths, a hyphen with an ASCII letter on both sides is part of one name (`${{first-name}}`, `${{user.first-name + 1}}`, `${{a-b}}` read the key `a-b`); `a - b`, `a -b`, `n-1`, `x1-y`, `1-a` stay arithmetic; a missing hyphenated name in strict mode is a `missing-variable` error whose suggestion names the spaced form (`a - b`); `analyze` reports the hyphenated name as one variable
- mt-lenient: a malformed math expression (`${{(1 + 2}}`, `${{1 + }}`, `${{1 + * 2}}`, `${{2 $ 3}}`) is a located `type-error` in lenient mode too, in `render` and in `resolveTemplate`; a missing variable in a well-formed math expression stays lenient (empty output); unknown names/filters stay errors in every mode
- mt-cyclic: a value that has no printable form (a cyclic object or array, a BigInt) used as output (`${{x}}`, a CASE subject, after filters that keep it) is a `type-error` located at the variable (or the CASE node), in render and in resolveTemplate, instead of ok true with empty text; null and undefined still print as empty

## Interface

- No new public names. `evaluateMathExpression(expression, variables, options?)` gains an optional third argument `{ zeroIsError?: boolean }` (default false: today's behavior). `Interpreter` options gain `render?: boolean` (default false); `render()` passes `render: true`, `resolveTemplate` does not. With `render` true the interpreter calls math with `zeroIsError` and prints math results with 15 significant digits.
- `core/src/expressions.ts` exports `formatNumber(n: number): string` (`Number(n.toPrecision(15))` printed with `String`; non-finite numbers via `String`), a `DivisionByZeroError` (a `TypeError` subclass defined there, so the interpreter can let it through the math try/catch), and the hyphen rule helper used by the tokenizer, `mathVariableNames` and `isMathExpression` (a hyphen is part of a name when the characters on both sides are ASCII letters).
- `core/src/errors.ts`: `MissingVariableError` takes an optional fifth constructor argument `hint` appended to its suggestion on its own line; the interpreter passes the spaced-form hint when the root key holds a letter-hyphen-letter and no whitespace.
- The interpreter's private `isMathExpression` is replaced by the exported one; `valueToString` throws `TypeError` (located by the existing `at` wrappers) when a non-null value has no text form.

## Decisions

- Only mt-zero and mt-float are render-only (settled with the human: resolveTemplate outputs for `/0` and float printing stay). mt-hyphen, mt-lenient and mt-cyclic turn silent outputs into errors and apply in both entry points; if an existing test pins the old output, gate that change behind `render` and report it.
- A malformed math error is not swallowed in lenient mode: after the math attempt fails with a `MathSyntaxError`, the lenient fallback path lookup must not turn it into empty text. Non-numeric or missing variables inside math are missing data and keep the current behavior.
- The existing console logging of swallowed math errors, if any, is not part of this card.
