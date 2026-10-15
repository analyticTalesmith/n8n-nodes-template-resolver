# Brief: implementer for the math and output errors card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: math and output mistakes stop being silent. Division or modulo by zero, a malformed math expression and a cyclic value end render with a located error in every mode; arithmetic results print without binary float noise; a hyphen between two letters is part of a name. Zero and float printing are render only; resolveTemplate keeps its outputs.
Your objective: make the frozen tests pass with the smallest correct change, inside the file scope.

## Decisions already made

- Read the spec first: `docs/ephemeral/work/261015-language3911-a6-make-math-and-output-errors-visible/spec.md` (interface and decisions). The tests are `tests/language/math.test.ts` (frozen; read them, they are the oracle).
- Render-only: `Interpreter` gains option `render?: boolean`; `render()` passes `render: true`, `resolveTemplate` does not. With it, `evaluateMathExpression` is called with `{ zeroIsError: true }` (division or modulo by zero throws a `DivisionByZeroError`, a `TypeError` subclass defined in `expressions.ts`) and the numeric result prints through `formatNumber` (`Number(n.toPrecision(15))`, non-finite via `String`). In `visitVariable` the math try/catch swallows errors into `mathError` today: a `DivisionByZeroError` must be rethrown at once, never swallowed.
- Lenient malformed math: after the math attempt fails with a `MathSyntaxError` and the path lookup finds nothing (strict throws a missing-variable error that is then replaced by the math error today), lenient mode must throw the `MathSyntaxError` too instead of printing empty. A missing or non-numeric variable inside well-formed math keeps the current behavior. Keep `unparseableMath` logic as one small helper rather than a second branch.
- Hyphen rule (one helper in `expressions.ts`, used by `tokenizeMath`, `mathVariableNames` and the exported `isMathExpression`): while reading a name, a `-` joins the name when the character before and the character after are ASCII letters. `a-b` is a name; `a - b`, `a -b`, `n-1`, `x1-y`, `a-1` are arithmetic. `isMathExpression` ignores hyphens that join names. Replace the interpreter's private duplicate `isMathExpression` with the exported one.
- Missing hyphenated name: `MissingVariableError` (errors.ts) takes an optional fifth argument `hint` appended to the suggestion on its own line; `resolveNestedPath` passes a hint like `If you meant subtraction, write 'first - name'` when the missing root key holds a letter-hyphen-letter and no whitespace.
- Unprintable output: the interpreter's `valueToString` throws `TypeError` (a message such as `Cannot print a value with no text form`, suggestion naming the variable's data) when the value is not null/undefined and has no text form (`tryCoerceToString` gives null: a cyclic object or array, a BigInt). The existing `at(...)` wrappers locate it at the variable, CASE and ternary nodes. Do not edit `filters.ts` (`valueToText` stays).
- Unknown names, operators, filters and parameters stay errors in every mode (ADR 0003); no runtime dependency; no `eval`; no template-supplied regular expression compiled. Conventional Commits.
- If an existing test now fails, do not edit it: gate that one change behind the `render` option, and tell me which test and why.

## Owned files and scope

Worktree: `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-make-math-and-output` (branch `feature/make-math-and-output`; node_modules is linked; never run npm install). Edit only `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/render.ts`, `core/src/errors.ts` (small additions). Do not edit `tests/language/math.test.ts`, the `.process` folder, docs or card files; if a test seems wrong or you need another file, stop and say so in your report.

## How the work is judged

- Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/math.test.ts --json` passes; then the whole suite `node node_modules/jest/bin/jest.js` passes with only the new tests added (it was 2231 green before this card); `npx tsc --noEmit -p .` stays clean. Run these before saying done.
- Reviewers ask: can any path still print empty text for a malformed expression, a /0 in render or an unprintable value; does resolveTemplate keep `Infinity` and unrounded floats; is the hyphen rule exactly letter-hyphen-letter in the tokenizer, `mathVariableNames` and `isMathExpression`; is every error located at the variable. Keep functions small; no dead code; no duplicate math checks.

## Model and effort

sonnet, medium: a contained change with an exact oracle.

## Result and status

Commit once at the end, in the worktree, Conventional Commits, subject at most 72 characters, no ids or card codes, no attribution lines, for example `feat(math): report zero division, malformed math and unprintable values`. Never push, touch main, move cards or write to `nul`. Do not run claim.mjs; just say "done". Return your report (starting with a status: done, done with concerns, needs context, or blocked) as your final message; do not write it into the repo.
