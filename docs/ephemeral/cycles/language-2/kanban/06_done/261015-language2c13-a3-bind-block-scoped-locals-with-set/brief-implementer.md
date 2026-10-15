# Brief: implementer for the SET card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`docs/ephemeral/cycles/language-2/CYCLE.md`): grow the language (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error in every mode and every loop, call and output bounded.
Card goal: `{{SET name = expression}}` binds a block-scoped local from the same value evaluator `${{ }}` uses (the value is kept: an array stays an array); a SET never leaks out of its block; the lexer exports its keyword table and reads it by own property only; every old template keeps its output.
Your objective: make the committed failing tests pass, inside the scope and manifest below, and break nothing else.

Read first (your worktree is `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-bind-block-scoped-locals`; the card folder is under `docs/ephemeral/cycles/language-2/kanban/03_in_progress/261015-language2c13-a3-bind-block-scoped-locals-with-set/` in it):
- the spec `docs/ephemeral/work/261015-language2c13-a3-bind-block-scoped-locals-with-set/spec.md` (syntax, evaluator, scope, size rule, keyword table, analyze, interface, compatibility: it is the approved behaviour), and `compat-probe-base.json` next to it (today's outputs of old templates; they must not change except as the spec names);
- `card.json` (criteria, scope), the tests `tests/language/set.test.ts`, `tests/language/surfaces.test.ts`, the golden case `tests/golden/render-cases/lang-set/`;
- the code you will touch: `core/src/interpreter.ts` (`visitVariable` is the evaluator to extract; `runLoop` is the one loop runner; `selectBranch`, `visitCase`, `visitListItem`, `visitSection`, `visitFence`, `processCellsArray`), `core/src/scope.ts` (Frame, RootScope), `core/src/parser.ts` (`parseNode`, `parseFor`, `parseVariableExpression`, `open`, `count`), `core/src/lexer.ts` (the stub `KEYWORDS`, `getTokenType`), `core/src/whitespace.ts`, `core/src/analyze.ts` (Walker, `scopes`), `core/src/spec.ts`, `core/src/types.ts`, `api/openapi.json`.

## Decisions already made

- The tests are the contract. If a test seems wrong, stop and say so in your report; never edit a test. The committed stub in `core/src/lexer.ts` (`KEYWORDS`) is yours to finish.
- Spec decisions: SET outputs nothing; the evaluator is one function returning the value; `render` binds `Number(formatNumber(result))` for math, `resolveTemplate` the plain number; a math expression ignores `??` and filters as today; a missing value is `missing-variable` at the SET (strict) or null (lenient); the size rule applies after each filter in the evaluator (a string result longer than `maxOutputChars` is `limit-output` located at the variable or SET) and to a SET's final string value; the caller's data (`RootScope`) is never written; each block that directly holds a SET gets its own frame; the loop frame is not reused for body SETs (fresh per iteration).
- ADR 0003 (`docs/living/decisions/adr/0003-unknown-names-are-always-errors.md`): unknown names, operators, filters and parameters are errors in every mode; strict mode governs missing data only. ADR 0007: SET is a single tag.
- No runtime dependency; no `eval`; no template-supplied regular expression is compiled. Scopes are Maps (names like `__proto__` and `constructor` are ordinary).
- `docs_impact` is none: do not edit anything under `docs/living/` or the README.

## Owned files and scope

You may edit only: `core/src/lexer.ts`, `core/src/types.ts`, `core/src/parser.ts`, `core/src/interpreter.ts`, `core/src/analyze.ts`, `core/src/whitespace.ts`, `core/src/spec.ts`, `core/src/scope.ts`, `api/openapi.json`. Tests, the card folder, `docs/` and every other file are read-only for you (the test writer's files are final). Keep the extraction of the value evaluator inside `interpreter.ts` (do not move it to `expressions.ts`).

## How the work is judged

- The gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/set.test.ts --json` exits 0.
- Before saying done run the whole suite `node node_modules/jest/bin/jest.js` (all green, including `tests/language/surfaces.test.ts`, the golden cases and the older tests that pin base behaviour) and the type check `npx tsc --noEmit -p .` (exit 0). A failure in an old test is a compatibility break: fix the code, never the test.
- Run `compat-probe-base.json` against your result in the way you like (a throwaway test file outside `tests/` that you delete, or reasoning): every `${{ }}` template there keeps its output and error in all entries, except what the spec names.
- Code quality: one evaluator, no copy of the variable logic; `visitVariable` still prints exactly what it printed; parse-time errors are located at the SET tag; keep functions small; comments say why.

## Working rules

- Work in the worktree only; never push; never touch `main`. Never redirect output to `nul`. `node_modules` is a junction; never run `npm install`.
- Commit once, at the end of the card, with a Conventional Commit, imperative lower case, at most 72 characters, no codes, for example `feat(language): bind block-scoped locals with set`. Then say "done" in your final message.
- If you need a file outside the scope or the tests need something the spec does not settle, stop and report it as a numbered question with your recommended answer.

## Model and effort

Sonnet at medium effort: a precise, test-driven change.

## Result and status

Final message: status (done, done with concerns, needs context, blocked), files changed, the numbers of the gate run, the whole suite and the type check, and any question. Never write secrets or credentials.
