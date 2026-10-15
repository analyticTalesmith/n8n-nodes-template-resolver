# Brief: test writer for the math and output errors card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: math and output mistakes stop being silent. Division or modulo by zero, a malformed math expression and a cyclic value end render with a located error in every mode; arithmetic results print without binary float noise; a hyphen between two letters is part of a name. Zero and float printing are render only; resolveTemplate keeps its outputs for them.
Your objective: turn each criterion into failing table-driven jest tests (`it.each` rows) in `tests/language/math.test.ts` that fail for the right reason (an assertion, never a missing import), commit them with signature-only stubs, and record red evidence. The tests are the oracle the implementer is held to, so each must break on a plausible wrong implementation. Each test name starts with its criterion id (`mt-zero`, `mt-float`, `mt-hyphen`, `mt-lenient`, `mt-cyclic`).

## Decisions already made

- Card folder (read `card.md`, `card.json`) and the spec `docs/ephemeral/work/261015-language3911-a6-make-math-and-output-errors-visible/spec.md` (read it first; it holds the interface and decisions). Contract: `docs/living/architecture/language-contract.md`. Paths are relative to the worktree below.
- Render-only: mt-zero and mt-float. Call `render(template, data, { strictMode })` for them and also assert `resolveTemplate(template, new Map(...), ...)` still gives the old output (`Infinity`, the unrounded float such as `0.30000000000000004`). mt-hyphen, mt-lenient and mt-cyclic apply in both `render` and `resolveTemplate` (resolveTemplate throws a `TemplateError` with the code; render returns `ok: false` and the first diagnostic).
- Errors are `type-error` diagnostics (`severity: "error"`, `code: "type-error"`) with the line and column of the variable (check a multi-line template so a 1:1 default fails the test; the variable token position is where `${{` starts, as existing located errors in `tests/headless/` show).
- mt-zero rows (strict and lenient both): `${{x / 0}}`, `${{x % 0}}`, `${{x / zero}}` (zero data 0), `${{0 / 0}}`, `${{x / (a - a)}}`, `${{10 % 0}}`; nonzero rows still compute (`${{x / 4}}`, `${{x % 3}}`).
- mt-float rows (render): `0.1 + 0.2` -> `0.3`; `x * 3` with 1.1 -> `3.3`; `1 / 3` -> `0.333333333333333`; `2 / 3` -> `0.666666666666667`; `10 / 4` -> `2.5`; `7 - 10` -> `-3`; `0.1 * 3` -> `0.3`; `1e15 + 1` and large integers print unchanged (`1000000 * 1000000` -> `1000000000000`); `-0.5 * 2` -> `-1`. resolveTemplate keeps `0.1 + 0.2` -> `0.30000000000000004`.
- mt-hyphen rows: data key `first-name` read by `${{first-name}}` and by `${{user.first-name}}` (nested key) and in math `${{a-b + 1}}` with key `a-b`; arithmetic stays for `${{a - b}}`, `${{a -b}}` (leading hyphen not between letters), `${{n-1}}`, `${{x1-y}}` (digit before), `${{a-1}}`, `${{a*b-c}}` with keys a, b, c, n, x1, y numeric (check the exact results); strict-mode missing `${{first-name}}` gives `missing-variable` with a suggestion containing `first - name`; lenient mode prints empty for it; `analyze` of `${{a-b}}` lists one variable `a-b` and of `${{a - b}}` lists `a` and `b`.
- mt-lenient rows (lenient mode, render and resolveTemplate): `${{(1 + 2}}`, `${{1 + }}`, `${{1 + * 2}}`, `${{2 $ 3}}`, `${{(1 + 2))}}` are located `type-error`s, not empty output. A well-formed math with a missing variable (`${{missing + 1}}`) stays empty in lenient mode. An unknown filter stays an error in lenient mode.
- mt-cyclic rows (render and resolveTemplate, strict and lenient): a cyclic object (`const c: any = {}; c.self = c`) and a cyclic array used as `${{c}}`, as a CASE subject, in a ternary variable branch, and after a filter that keeps the value; a BigInt value (`10n`) used as output; each is a located `type-error`. null and undefined values, empty string and 0 still print as before (empty, empty, empty, `0`).
- Learn call shapes and house style from `tests/language/filters-text.test.ts`, `tests/language/limits-nodes.test.ts` and `tests/headless/limits.test.ts`. Interpreter default is strict: pass options explicitly for lenient. You may observe today's behavior by running small templates. Reading `core/src` implementation files is not allowed beyond `types.ts` and `index.ts` exports.
- `core/src/index.ts` exports are unchanged; import `render` from `core/src/render`, `resolveTemplate` from `core/src/resolve`, `analyze` from `core/src/analyze`, as the other language tests do.

## Owned files and scope

Worktree: `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-make-math-and-output` (branch `feature/make-math-and-output`; node_modules is linked; never run npm install). You add `tests/language/math.test.ts`. Signature-only stubs (compile but do the wrong thing) are allowed in `core/src/expressions.ts` for the spec's new exports only if a test needs to import them (`formatNumber`, `DivisionByZeroError`); prefer testing through `render`/`resolveTemplate`/`analyze` so no stub is needed. Edit nothing else; do not edit the card or the `.process` folder.

## How the work is judged

Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/math.test.ts --json`. Every test must fail now by assertion; none may fail by a syntax or import error. Each test must break on a plausible wrong implementation (applying zero errors in resolveTemplate; printing 16+ digits; treating `n-1` as a name; fixing only strict mode; fixing `${{c}}` but not CASE).

## Model and effort

sonnet, medium: mechanical table writing against a precise spec.

## Result and status

Never redirect output to `nul`. Commit in the worktree with Conventional Commits, subject at most 72 characters, no ids or card codes, no attribution lines, for example `test(math): pin zero, float, hyphen, lenient and cyclic errors`. Run `node .process/core/scripts/red-evidence.mjs C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-make-math-and-output 261015-language3911-a6-make-math-and-output-errors-visible` (the worktree path is the project directory) and commit the `red-evidence.md` it writes; it must exit 0. Never push, touch main, or move or claim cards. Return your report (not a file in the repo), ending with a status: done, done with concerns, needs context, or blocked.
