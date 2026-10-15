# Brief: test writer for the FOR window card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`docs/ephemeral/cycles/language-2/CYCLE.md`): grow the language (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error in every mode and every loop, call and output bounded.
Card goal: one loop runner on a scope stack serves FOR and TABLE-FOR; FOR gains `limit=`, `offset=`, an `{{ELSE}}` empty branch and `@total`; variable reads stop copying the data map per condition; path segments read own properties only.
Your objective: write the failing tests that pin the card's criteria, before any code exists, so the implementer can make them pass. You write tests only, never code under `core/`.

Read first: the spec `docs/ephemeral/work/261015-language2c13-a1-add-limit-offset-an-empty-branch-and-tot/spec.md` (syntax, window value rules, order of work: it settles every ambiguity; the criteria text below is verbatim from `card.json`), the plan section L1 in `docs/ephemeral/research/language-2-plan.md`, `docs/living/architecture/language-contract.md`, ADR 0003 (unknown names are always errors), and the existing tests for style: `tests/language/limits-nodes.test.ts`, `tests/language/case.test.ts`, `tests/regressions/nested-for.test.ts`, `tests/TemplateResolver.node.test.ts` (FOR and TABLE parts).

## Decisions already made

- Spec section "Syntax settled" and "Window value rules" are the approved behaviour. `limit` and `offset` are lower case only; a bad window value is a `type-error` at the FOR in every mode; a missing, null or undefined window path is `missing-variable` (strict) or ignored (lenient); unknown arguments, repeats, trailing words and a missing item name are a `syntax-error` at the FOR tag, found at parse time, so `render` and `validate` report them even when the FOR sits in a branch that never runs.
- Existing behaviour that stays: the iterable of a FOR is read in the scope outside it; a strict non-iterable (`FOR 5 as x` style, such as a plain object) is a located `type-error`; the TABLE legacy rule (non-iterable renders no rows, no error, even in strict) stays; a TABLE FOR body that is not a ROW is rendered and split on `|`.
- The interpreter's default is strict. Tests that need lenient mode pass `strictMode: false` explicitly (in `resolveTemplate` options or `render` options).
- `resolveTemplate(template, new Map(...), options)` returns the string or throws a `TemplateError` (has `.code`, `.line`, `.column`); `render(template, dataObject, options)` returns `{ ok, output, diagnostics: [{code, line, column, severity, message}], stats: { iterations, ... } }` and never throws for template or data problems; `analyze(template)` returns variables with `name`, `paths`, `usedIn`; `spec()` lists blocks.
- Never redirect output to `nul`.

## Owned files and scope

You may add and commit only:
- `tests/language/for-window.test.ts` (all tests, `it.each` table rows, each test name starting with its criterion id, for example `fw-window: ...`; the ids are `fw-window fw-meta fw-else fw-args fw-table fw-limits fw-scope fw-no-copy fw-own`; `fw-compat` is a tool criterion and gets no test)
- `tests/golden/render-cases/lang-for-window/{template.md,data.json,options.json,expected.md}` (a golden case: a windowed FOR with `limit` and `offset` from data, `@total`, an ELSE branch, and a nested FOR, rendered by `render`; add one row in the test file named `fw-meta: golden case lang-for-window renders to its expected file` that reads the four files and compares, as `tests/language/case.test.ts` does with `runGoldenCases`; look at `tests/golden/harness.ts` and the existing case folders for the format and option names). Note `tests/promptaware/golden-render.test.ts` and `case.test.ts` pick up every case folder, so the case must render ok through `render`.
- Signature-only stubs are not needed: the tests import only existing modules (`../../core/src`, `../../core/src/resolve`, `../../core/src/types`). Do not create `core/src/scope.ts`. Do not edit any existing test file or anything under `core/`.

Commit once at the end with a Conventional Commit, for example `test(language): pin the for window, else branch and scope stack`. No codes (no card ids, criterion ids, plan labels) in the commit message.

## How the work is judged

The frozen criteria (verbatim), each needs several table-driven rows that fail today for the right reason (the feature is missing, not a typo in the test) and would pass with a correct implementation:

- fw-window: a literal or a path gives the window; a negative, non-integer, non-numeric or unsafe-integer value is a `type-error` located at the FOR in every mode; a missing path is `missing-variable` in strict mode and an ignored argument in lenient mode; the paths are read in the scope outside the loop.
- fw-meta: `@index0 @index1 @first @last @notFirst @notLast` describe the position in the rendered window; `@total` is the number of items the loop renders after offset and limit, the same on every iteration; outside a loop `@total` is a missing variable.
- fw-else: the empty branch renders exactly when zero items render: an empty array, offset past the end, `limit=0`, a missing or non-iterable value in lenient mode; it does not render when one item renders; a strict non-iterable keeps today's located `type-error`; the loop name and the `@` names are not bound inside the ELSE body; a second ELSE in one FOR is a `syntax-error` at it; an IF's own ELSE and a FOR inside an IF branch are not confused; ELSE after ELSEIF or outside IF and FOR keeps today's "Unexpected token".
- fw-args: an unknown argument (`max=3`), a repeated argument, trailing words and a missing item name are a `syntax-error` at the FOR tag in every mode, even in a branch that never renders.
- fw-table: TABLE rows built by FOR use the same runner and get window, ELSE (its body holds ROWs) and `@total`; the legacy rule "a non-iterable renders no rows, even in strict mode" is kept and in that case the ELSE rows render, without an error.
- fw-limits: each rendered item counts toward `maxIterations` (skipped offset items do not); the running output check applies inside the loop and the ELSE body; `stats.iterations` counts rendered items.
- fw-scope: loop names and metadata live on a stack frame that is gone after END_FOR; an outer loop's name and metadata are visible again after an inner loop; an inner name shadows an outer or data name only inside; frames carry a parent link so a later card adds `@parent` without reworking the stack.
- fw-no-copy: conditions, math and filters read variables through the scope chain; `resolveTemplate` over a loop with an IF, with the data given as a Map subclass that counts `Symbol.iterator`, `entries`, `keys` and `forEach` calls, makes zero copies of the data map during the run (red today: `getAllVariables` copies per condition). Call `resolveTemplate`, because `render` builds its own Map. Cover an IF condition, a math expression, a filter, a ternary and a LIST_ITEM condition inside a loop; each counted call count must be 0.
- fw-own: a non-root path segment reads own properties only, in output, conditions and math (`x.constructor`, `x.__proto__`, `x.toString` are missing, not inherited engine objects); an own key with those names still works (build data with `JSON.parse('{"__proto__": ...}')` or `Object.defineProperty` so the key is truly own).

Cover the edge cases a blind reviewer will look for (spread them over the criteria as rows):
- strict versus lenient, and `render` versus `resolveTemplate` (a located diagnostic in `render`: code, line and column of the FOR tag, never 1:1; `resolveTemplate` throws the same code);
- window value missing versus null versus present, a numeric string `"2"` accepted, `"abc"`, `true`, an array, `NaN`, `Infinity`, `-1`, `1.5`, `9007199254740992` (unsafe) rejected;
- cyclic and BigInt item values in a windowed loop that prints them (a coded `type-error`, as today) and that skipped items (offset) are not printed so cannot fail;
- astral characters (an emoji in item values and in output) survive a windowed loop;
- prototype names: `__proto__`, `constructor`, `toString` as a loop item name, as data keys, and as path segments;
- limits: `maxIterations` with offset skipping items, `limit-iterations` located at the FOR; `maxOutputChars` hit inside the loop body and inside the ELSE body (`limit-output`); `stats.iterations`;
- `analyze` agrees with `render`: the loop name, `@` names are not inputs; the `limit` and `offset` path roots are inputs with usage kind `for`; a variable read only in the ELSE body is an input, and a read of the loop name in the ELSE body counts as an input named like the loop (it is not bound there); `spec()` FOR args mention `limit` and `offset`;
- nested loops with the same item name; an inner window path that names the outer item; the same loop name used in two sequential loops; ELSE inside a nested FOR inside an IF inside a FOR.

Red evidence: after committing, run `node .process/core/scripts/red-evidence.mjs <worktree> 261015-language2c13-a1-add-limit-offset-an-empty-branch-and-tot` (the lead will give you the worktree path in the spawn prompt) and report its result. Failing tests should be real failures of the behaviour; a few tests that already pass today (legacy behaviour guards such as nested loop variables) are fine but at least one row per criterion must fail. Run only your own file while iterating: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/for-window.test.ts`.

If a criterion or the spec seems ambiguous or wrong, stop and say so in your report rather than guessing.

## Model and effort

Sonnet at medium effort: mechanical test writing from precise criteria.

## Result and status

Save your report as `report-test-writer.md` in the card folder (path given in the spawn prompt) and end with a status line: done, done with concerns, needs context, or blocked; list the files committed, the red-evidence result and your row counts per criterion. Never write secrets or credentials. No card, ticket or plan codes in file names, branch names, test names (other than criterion ids), or commit messages.
