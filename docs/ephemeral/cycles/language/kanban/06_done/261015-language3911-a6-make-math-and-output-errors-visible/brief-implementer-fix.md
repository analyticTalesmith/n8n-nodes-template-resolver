# Brief: implementer fixes for the math and output errors card (review round 1)

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: math and output mistakes stop being silent (zero division in render, malformed math in every mode, unprintable output, 15-digit float printing in render, a hyphen between letters joins a name) without breaking output that works today.
Your objective: apply four review fixes, one at a time, each with its own test rows, running `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/math.test.ts` after each. Do not edit any existing row or expectation; add rows only (the project lead records the added rows as test amendments). Spec: `docs/ephemeral/work/261015-language3911-a6-make-math-and-output-errors-visible/spec.md`.

## Fix requests (smallest change per finding)

- f1 (defect, serves mt-float "integers print unchanged"): `formatNumber` in `core/src/expressions.ts` rounds integers of 16 or more digits (`1234567890123456 + 0` prints `1234567890123460`; `x * 1` with 9007199254740991 prints 9007199254740990). Return `String(n)` when `Number.isInteger(n)` (still `String` for non-finite); round only non-integers. Add render rows: `${{1234567890123456 + 0}}` -> `1234567890123456`, `${{x * 1}}` with x = 9007199254740991 -> `9007199254740991`, and a negative one; keep `0.1 + 0.2` -> `0.3` passing.
- f2 (goal-risk, serves "valid output must not turn into an error"): `visitVariable` calls `valueToString(value)` before every filter, so `${{xs | length}}` on a list holding a cycle or a BigInt, which printed a count before, is now an error in both entry points. Fix: apply the filters one at a time (`applyFilters(value, [filter])`) and run the unprintable check before a filter only when that filter coerces its input to text, that is every filter except the collection filters (`COLLECTION_FILTERS` names, exported from `core/src/filters-collection.ts`, which take lists or any value: `join length first last sort unique slice lines json`) and `default`; the final value is always checked by the output step, which also catches `default` and a collection filter that returns the unprintable value. `${{c | trim}}` and `${{c | default="z"}}` stay errors (existing rows). Add rows in both entry points, strict and lenient: `${{xs | length}}` with a cyclic list prints `1` (a list that contains itself once) and with `[1n, 2n]` prints `2`; `${{xs | first}}` on `[1n]` is an error (the final value is a BigInt); `${{c | json}}` on a cyclic object is still a located type-error whose text mentions "cyclic" (the json filter's own error is no longer pre-empted when it is first).
- f3 (goal-risk, serves "null still prints empty, missing data stays lenient"): `isUnparseableMath` plus `hasStrayCharacter` in `core/src/interpreter.ts` make plain keys such as `a:b` or `Order #` a math type-error even when the key exists with value null, and a missing `a:b` in strict mode loses its missing-variable error. Fix: rethrow the math error only when the root key is absent (strict: the lookup raised `MissingVariableError`; lenient: neither `this.loopContext` nor `this.variables` has the root key); never when the key exists, whatever its value. Stray characters count as malformed math only when the text also holds a standalone number literal (a digit run not part of a name), so `2 $ 3` stays a located error in every mode (existing rows) while `a:b` and `Order #` are plain missing names: a missing `a:b` is `missing-variable` in strict and empty in lenient. Put the stray-character test in `core/src/expressions.ts` beside the name rules (see f4) and export it; the interpreter only calls it. Add rows (render and resolveTemplate, strict and lenient): key `a:b` with value null prints empty; key `a:b` with value `7` prints `7`; `${{a:b}}` missing is `missing-variable` in strict and empty in lenient; `${{Order #}}` missing, same.
- f4 (drift, sustained; serves the spec "one hyphen-rule helper"): the name-character and hyphen rules exist three times (`joinsName`/`NAME_CHAR` in expressions.ts, regexes in `subtractionHint`, a Unicode class in `hasStrayCharacter`). Keep one definition in `core/src/expressions.ts`: export `joinsName` (or one `isNameChar`/`nameEnd`) and the stray-character test from f3, and move `subtractionHint` there (using `joinsName`) so the interpreter imports it; delete the interpreter copies. The Unicode letters and digits the stray-character test lets through stays as it is (names with accented letters are plain missing names, not math).
- f5 (optional, trivial): `valueToString` keeps `valueToText` from `filters.ts` as the single printer: throw the located-by-`at` TypeError when a non-null value has no text form (`tryCoerceToString(value) === null`), else return `valueToText(value)`. Drop the direct `tryCoerceToString` printing. Skip if it breaks a test.
- Out of scope: do not change the lenient `${{a-b}}` hyphen behaviour (frozen by tests).

## Owned files and scope

Worktree: `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-make-math-and-output` (node_modules linked; never npm install). Edit only `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/errors.ts`, `core/src/render.ts` and add rows to `tests/language/math.test.ts`. No other file; if one is needed, stop and say so.

## How the work is judged

`node node_modules/jest/bin/jest.js --runTestsByPath tests/language/math.test.ts` and the whole suite pass (2434 before plus your new rows, no existing test changed), `npx tsc --noEmit -p .` is clean. Reviewers check: integers print unchanged, `${{xs | length}}` keeps working, a key that exists is never a math error, one definition of the name rules.

## Model and effort

sonnet, medium: small targeted fixes against exact reproductions.

## Result and status

Commit once at the end, Conventional Commits, subject at most 72 characters, no ids or codes, no review-process words, for example `fix(math): keep large integers and working filters printing`. Never push, touch main, move cards, or write to `nul`. Do not run claim.mjs; say "done". Return your report (status first) as your final message, listing for each of f1..f5 what changed, and the exact names of the test rows added.
