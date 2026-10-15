# Brief: implementer for the macros card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`docs/ephemeral/cycles/language-2/CYCLE.md`): grow the language (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error in every mode and every loop, call and output bounded.
Card goal: `{{DEFINE name(params)}}...{{END_DEFINE}}` (top level, hoisted) and `{{CALL name(args)}}` (single tag) give reusable text blocks; the body sees its parameters and the data only; recursion, fan-out and output growth across calls are bounded by depth (internal cap 256), iterations and output (checked inside bodies); an error inside a body is located at the failing body node and names the macro. This is the most exposed card of the cycle: a blind reviewer will probe recursion, amplification and isolation hard.
Your objective: make the committed failing tests pass, inside the scope and manifest below, and break nothing else.

Read first (your worktree is `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-define-and-call-macros`; the card folder is under `docs/ephemeral/cycles/language-2/kanban/03_in_progress/261015-language2c13-a4-define-and-call-macros/` in it):
- the spec `docs/ephemeral/work/261015-language2c13-a4-define-and-call-macros/spec.md` in the worktree: syntax, link rule, scope, the three bounds, the error text, analyze, interface. It is the approved behaviour; read all of it before touching code;
- `card.json` (criteria, scope), the tests `tests/language/macros.test.ts` (about 3300 table rows; read how rows are built before the first run, and run your own file while iterating), the golden case `tests/golden/render-cases/lang-macro/`;
- the code: `core/src/interpreter.ts` (`visit`, `at`, `block`, `runLoop`, `countIteration`, `checkOutputLength`, `visitProgram`, `visitBody`, `renderNodes`, `selectBranch`, `collectListItems`, `rowsFromChild`, `collectRows`, `processCellsArray`, `resolveNestedPath`), `core/src/scope.ts` (Frame, RootScope), `core/src/parser.ts` (`parseNode`, `nested`, `open`, `count`, `parseSet` and `loopNames`, the strict LIST and TABLE child parsers), `core/src/lexer.ts` (`KEYWORDS`, `CLOSERS`), `core/src/whitespace.ts`, `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/render.ts`, `core/src/spec.ts`, `core/src/types.ts`. The SET card (`git show 51635d2 --stat`, `git log --oneline -12`) shows how a single-tag statement joins the lexer, the whitespace standalone set, the strict child parsers, analyze and spec: follow it.

## Decisions already made

- The tests are the contract. If a test seems wrong, stop and say so in your report; never edit a test, with ONE exception: in `tests/language/set.test.ts` the row `st-keywords: the derived block table keeps today's rows and adds SET with no closer` compares the exact keyword table and must list the two new keywords. Edit only that expected table (add the pairs `DEFINE` closing with `END_DEFINE` and `CALL` with no closer, where `OLD_PAIRS` or the expected map is built; keep the row's name and every other assertion). This is the logged amendment in `card.json` (`test_amendments`). No other existing test file changes.
- Spec decisions are final (DECIDED marks): the runtime depth counter is `min(maxDepth, 256)` and always on; `held`-style output accounting across bodies, loops keep their own check and position; the message form ` (in macro 'name', called at line L, col C)`; `unknown-macro` diagnostic code in `analyze`; `macros` field optional.
- ADR 0003: unknown names, macros, argument counts and bad arguments are errors in every mode; strict mode governs missing data only. ADR 0007: DEFINE and CALL follow the statement-tag rules.
- No runtime dependency; no `eval`; no template-supplied regular expression is compiled (parse the DEFINE and CALL argument lists by hand, character by character, quote aware). Scopes and the macro table are Maps.
- Robustness (the test file has rows for each): no recursion that can overflow the stack on a long ELSEIF chain or wide template in the new walkers (`macros.ts` call finder: iterate, do not recurse over alternates); every counter restored in `finally`; a `RangeError` is never retyped by `locateError`; `render` and `analyze` turn it into `limit-depth` as the spec says.
- `docs_impact` is none: do not edit anything under `docs/living/`, the README or `api/openapi.json`.

## Owned files and scope

You may edit or add only: `core/src/lexer.ts`, `core/src/types.ts`, `core/src/parser.ts`, `core/src/interpreter.ts`, `core/src/analyze.ts`, `core/src/whitespace.ts`, `core/src/spec.ts`, `core/src/scope.ts`, `core/src/errors.ts`, `core/src/render.ts`, `core/src/macros.ts` (new), and the one expected-table edit in `tests/language/set.test.ts` named above. The macros tests, the golden case, the card folder, `docs/` and every other file are read-only for you. `core/src/index.ts` is not in scope: do not export `macros.ts` there.

## Suggested order

1. types, lexer (`KEYWORDS`, `CLOSERS`), whitespace, spec, so the table-derived tests (`mc-spec`, `mc-ws` basics) pass.
2. parser (`parseDefine`, `parseCall`, top-level and parameter checks, node counts, the strict child lists), `macros.ts` (builder, call finder).
3. interpreter: link in `interpret`, `visitCall` (frame over the root, restore in `finally`, annotate), `countIteration` for calls.
4. the depth counter on every block path, then the output accounting in the body renderers.
5. `errors.ts` (RangeError, the annotation), `render.ts` and `analyze.ts` (net, macros, usage kind, DEFINE block with its own scope).
Run `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/macros.test.ts` often; filter with `-t "mc-depth"` and similar while working on one criterion.

## How the work is judged

- The gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/macros.test.ts --json` exits 0.
- Before saying done run the whole suite `node node_modules/jest/bin/jest.js` (all green, including `tests/language/surfaces.test.ts`, the golden cases, `tests/language/for-window.test.ts` loop positions, `tests/headless/limits.test.ts` and `tests/language/list-table-children.test.ts` depth rows, `tests/language/set.test.ts`) and the type check `npx tsc --noEmit -p .` (exit 0). A failure in an old test is a compatibility break: fix the code, never the test (the one amendment above excepted).
- Code quality: one depth counter, one place for iterations, one output accounting; small functions; comments say why; the call finder and the table are pure and live in `macros.ts`; no duplication of the variable-reading logic (arguments reuse `resolveNestedPath`); keep the annotation of the macro in one small function (a later card adds the partial name).

## Working rules

- Work in the worktree only; never push; never touch `main`. Never redirect output to `nul`. `node_modules` is a junction; never run `npm install`.
- Commit once, at the end of the card, with a Conventional Commit, imperative lower case, at most 72 characters, no codes, for example `feat(language): define and call macros with bounded recursion`. Then say "done" in your final message.
- If you need a file outside the scope or a test needs something the spec does not settle, stop and report it as a numbered question with your recommended answer. Do not weaken a bound to make a test pass.

## Model and effort

Sonnet at medium effort: a precise, test-driven change.

## Result and status

Final message: status (done, done with concerns, needs context, blocked), files changed, the numbers of the gate run, the whole suite and the type check, and any question. Never write secrets or credentials.
