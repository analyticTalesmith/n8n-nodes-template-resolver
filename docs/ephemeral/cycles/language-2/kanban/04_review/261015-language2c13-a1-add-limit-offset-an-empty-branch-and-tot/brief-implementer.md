# Brief: implementer for the FOR window card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language with every unknown name or bad argument an error in every mode, and every loop, call and output bounded.
Card goal: one loop runner on a scope stack serves FOR and TABLE-FOR; FOR gains `limit=`, `offset=`, an `{{ELSE}}` empty branch and `@total`; variable reads stop copying the data map per condition; path segments read own properties only.
Your objective: make the committed failing tests in `tests/language/for-window.test.ts` (and the golden case `tests/golden/render-cases/lang-for-window/`) pass, with every existing test still passing.

Read first: `docs/ephemeral/work/261015-language2c13-a1-add-limit-offset-an-empty-branch-and-tot/spec.md` (the behaviour, settled syntax, window value rules, order of work and interface sketch), `card.json` and `card.md` in this card folder, then the tests, then the code you change: `core/src/interpreter.ts`, `parser.ts`, `expressions.ts`, `analyze.ts`, `spec.ts`, `types.ts`, `coercion.ts`, `errors.ts`.

## Decisions already made

- The tests are the contract. If a test seems wrong, stop and say so in your report; never edit a test.
- Interface sketch is in the spec: a new `core/src/scope.ts` with a read-only lookup type (`has`, `get`), a root scope wrapping the caller's data map without copying it, and child frames with a `parent` link; the interpreter's `loopContext` and `getAllVariables` go away; `expressions.ts` functions accept the read-only lookup type (a Map still satisfies it; `VariableMap` stays exported). One shared helper reads a path segment by own property only (use `Object.prototype.hasOwnProperty.call`), used by both the interpreter path reader and `resolveValue`.
- One private loop runner in the interpreter serves `visitFor` and the TABLE FOR rows (TABLE keeps its legacy rule: a non-iterable renders no rows, no error, even in strict; a FOR body node that is not a TableRow is rendered and split on `|`). Bind one frame per loop run and overwrite its entries per item, restoring the parent in `finally`; `interpret()` starts from the root scope.
- `ForNode` keeps `iterable`, `itemName`, `body` and gains optional fields only when written (window arguments, ELSE body) so the AST-shape oracle tests in `tests/TemplateResolver.node.test.ts` (about lines 1832 to 1907) keep passing.
- Parse the FOR header token by token (split on whitespace after `FOR`; keep `AS` case-insensitive; `limit` and `offset` lower case); every header error is a `SyntaxError` located at the FOR token (line and column of the tag), found at parse time.
- ELSE inside FOR is handled in `parseFor`; an IF nested in the FOR consumes its own ELSE; a second ELSE in the same FOR is a `SyntaxError` at that ELSE token. Do not touch the lexer's block validation.
- Window errors and the order of work are in the spec; every diagnostic located at the FOR (use the interpreter's `at` helper).
- `resolveTemplate` outputs for old templates must not change except the two approved changes (trailing words after the item name; inherited path segments).
- No new runtime dependency; no `eval`; do not edit any existing test file; do not edit `docs/living/`.
- Never redirect output to `nul`.

## Owned files and scope

You may change only (from `card.json`): `core/src/types.ts`, `core/src/parser.ts`, `core/src/interpreter.ts`, `core/src/analyze.ts`, `core/src/spec.ts`, `core/src/expressions.ts`, and add `core/src/scope.ts`. The test files and golden case already exist; do not change them. If you need one more file, stop and ask.

## How the work is judged

- Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/for-window.test.ts --json` passes entirely.
- Before saying done, run the whole suite `node node_modules/jest/bin/jest.js` (all green, including `tests/regressions/nested-for.test.ts`, the TABLE tests of `tests/TemplateResolver.node.test.ts`, `tests/promptaware/golden-render.test.ts`, `tests/language/*`, `tests/headless/*`) and `npx tsc --noEmit -p .`; both must exit 0.
- Report duplication you could not remove and any place where a test forced a design choice.
- Commit once at the end inside the worktree with a Conventional Commit (for example `feat(language): add for window, else branch and scope stack`), no codes, no attribution lines, no review-process words. Then say "done".

## Model and effort

Sonnet at medium effort: mechanical code from precise criteria and tests.

## Result and status

Save your report as `report-implementer.md` in this card folder and end with a status line: done, done with concerns, needs context or blocked; list changed files, the gate, full-suite and tsc results with numbers. Never write secrets. No card, ticket or plan codes in names or commit messages.
