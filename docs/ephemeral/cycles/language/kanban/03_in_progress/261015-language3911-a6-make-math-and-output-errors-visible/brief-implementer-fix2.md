# Brief: implementer fixes for the math and output errors card (review round 2)

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: math and output mistakes stop being silent (malformed math in every mode regardless of data, unprintable output, a hyphen between letters joins a name) without breaking output that works. Spec: `docs/ephemeral/work/261015-language3911-a6-make-math-and-output-errors-visible/spec.md`.
Your objective: apply three fixes, one at a time, each with its own new test rows (add rows only to `tests/language/math.test.ts`, never edit an existing row), running `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/math.test.ts` after each. The review will not be repeated blind, so each fix must be complete.

## Fix requests

- f7 (goal-risk): `KEEPS_RAW_INPUT` in `core/src/interpreter.ts` exempts `lines` and `join`, but both turn their input into text (`valueToText`, empty for a cyclic value), so `${{c | lines}}` with a cyclic `c` and `${{xs | join=","}}` with a list holding a cyclic object print ok with empty text. Remove `lines` and `join` from the exemption (keep `length first last sort unique slice json` and `default`, which keep their input as a value; the final value is still always checked). Rows (render and resolveTemplate, strict and lenient, error located at the variable, 2:3): `${{c | lines}}` cyclic object, `${{xs | join=","}}` with `xs = [cyclicObject]`, `${{xs | join=","}}` with `[1n]`; and rows proving `${{xs | join=","}}` with `[1, 2]` prints `1,2` and `${{t | lines}}` with `"a\nb"` prints `["a","b"]`.
- f8 (goal-risk): a malformed math expression that also names a missing variable (`${{total * }}`, `${{qty $ 3}}`) renders empty in lenient mode with no data, but errors when the variable exists, because identifiers resolve while tokenizing and the missing-operand TypeError arrives before the structure is checked. Fix in `core/src/expressions.ts`: in `evaluateMathExpression`, check the shape first by tokenizing with every identifier standing in as a number (no variable lookup) and evaluating the tokens with zero errors off; a malformed shape throws its `MathSyntaxError` before any variable is read. Then run the real pass as today. Missing or non-numeric variables in a well-formed expression stay missing data (existing rows). Rows (render and resolveTemplate, strict and lenient, located type-error at 2:3): `${{total * }}` with no data, `${{total * }}` with `{total: 2}`, `${{(a + b}}` with no data, `${{qty $ 3}}` with no data; plus existing-behavior rows: `${{total * 2}}` with no data stays empty in lenient and is missing-variable in strict.
- f9 (drift, sustained): `isMathExpression` and `subtractionHint` iterate with `[...text]` (code points) but call `joinsName(text, i)` with a UTF-16 index, so a name with an emoji before a letter-hyphen-letter is misread. Iterate by string index (`for (let i = 0; i < text.length; i++)`) in both. Rows: key `🔥hot-take` with value 5 prints `5`, a missing `${{🔥hot-take}}` is empty in lenient (both entry points) and `missing-variable` with a suggestion containing `hot - take` in strict.
- Do not change the lenient `${{a-b}}` hyphen behaviour (frozen by tests). f10 (per-definition flag in the registry) is not requested; keep the small name set.

## Owned files and scope

Worktree: `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-make-math-and-output` (node_modules linked; never npm install). Edit only `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/errors.ts`, `core/src/render.ts` and add rows to `tests/language/math.test.ts`. If another file is needed, stop and say so.

## How the work is judged

The math test file and the whole suite pass (2478 before plus your rows, no existing test changed), `npx tsc --noEmit -p .` is clean.

## Model and effort

sonnet, medium.

## Result and status

Commit once at the end, Conventional Commits, subject at most 72 characters, no ids or codes, no review-process words, for example `fix(math): check math shape first and print list filters safely`. Never push, touch main, move cards, or write to `nul`. Do not run claim.mjs; say "done". Return your report (status first), per fix what changed and the names of the rows added.
