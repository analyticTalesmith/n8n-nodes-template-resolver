# Brief: test writer for the LIST and TABLE children card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`docs/ephemeral/cycles/language-2/CYCLE.md`): grow the language (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error in every mode and every loop, call and output bounded.
Card goal: FOR and IF (with ELSEIF and ELSE) inside LIST build numbered items and inside TABLE build rows, on the same loop runner as any FOR; every old template keeps its output; a table-cell pipe after an even run of backslashes is now escaped.
Your objective: write the failing tests that pin the card's criteria, before any code exists, so the implementer can make them pass. You write tests only, never code under `core/`.

Read first (main checkout `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver`, the card documents are committed there and may be missing in your worktree; read them by these absolute paths):
- the spec `docs/ephemeral/work/261015-language2c13-a2-build-list-items-and-table-rows-with-for/spec.md` (it settles every ambiguity: syntax, the two kinds of FOR in a TABLE, unclosed items and rows, numbering, pipe escaping, compatibility);
- `docs/ephemeral/work/261015-language2c13-a2-build-list-items-and-table-rows-with-for/compat-probe-base.json`: the outputs the unmodified code gives for templates that must not change (strict and lenient, render and resolve);
- the card folder `docs/ephemeral/cycles/language-2/kanban/01_shaping/261015-language2c13-a2-build-list-items-and-table-rows-with-for/card.md` and `card.json` (criteria verbatim), the plan section L2 in `docs/ephemeral/research/language-2-plan.md`, `docs/living/architecture/language-contract.md`, ADR 0003;
- style references: `tests/language/for-window.test.ts` (the previous card's test: how `run`, entries, `Outcome` and `runGoldenCases` are used; copy its helpers into your file, do not import from it), `tests/regressions/nested-for.test.ts`, the LIST and TABLE parts of `tests/TemplateResolver.node.test.ts`.

## Decisions already made

- The spec is the approved behaviour; the criteria text in `card.json` is the contract.
- The interpreter's default is strict. Tests that need lenient mode pass `strictMode: false` explicitly.
- `resolveTemplate(template, new Map(...), options)` returns the string or throws a `TemplateError` (`.code`, `.line`, `.column`); `render(template, dataObject, options)` returns `{ ok, output, diagnostics: [{code, line, column, severity, message}], stats: { iterations, ... } }` and never throws for template or data problems; `analyze(template)` returns variables with `name`, `paths`, `usedIn`, and `blocks`; `spec()` lists blocks.
- A syntax error is located at the offending token and found at parse time, so `render`, `validate` and `analyze` report it even in a branch that never renders.
- Never redirect output to `nul`.

## Owned files and scope

You may add and commit only:
- `tests/language/list-table-children.test.ts` (all tests, `it.each` table rows, each test name starting with its criterion id, for example `lc-list: ...`; ids `lc-list lc-table lc-close lc-errors lc-limits lc-ws lc-analyze lc-pipes`; `lc-compat` is a tool criterion (the full suite) but ALSO put the old-template guard rows under the id `lc-compat` so they are named and traced; they are expected to pass today).
- Golden cases `tests/golden/render-cases/lang-list-for/{template.md,data.json,options.json,expected.md}` (a LIST with static items plus a FOR and an IF building items, numbered without gaps, using `"standaloneLines": true`) and `tests/golden/render-cases/lang-table-if/{...}` (a TABLE with HEADER, an IF/ELSE building rows, and a FOR inside an IF), each rendered through `render`; add one row each in the test file named `lc-list: golden case lang-list-for renders to its expected file` and `lc-table: golden case lang-table-if renders to its expected file` reading the four files as `tests/language/for-window.test.ts` does with `runGoldenCases` (see `tests/golden/harness.ts` and an existing case folder `tests/golden/render-cases/lang-for-window/` for the format). Note `tests/promptaware/golden-render.test.ts` and `case.test.ts` pick up every case folder, so each case must render ok through `render` with today's expectations of the finished code.
- No stubs are needed: the tests import only existing modules (`../../core/src`, `../../core/src/render`, `../../core/src/resolve`, `../../core/src/analyze`, `../../core/src/spec`, `../../core/src/types`). Do not create or edit anything under `core/`. Do not edit any existing test file.

Commit once at the end with a Conventional Commit, for example `test(language): pin for and if as list items and table rows`. No codes (no card ids, criterion ids, plan labels) in the commit message.

## How the work is judged

The frozen criteria (verbatim) each need several table-driven rows that fail today for the right reason (the feature is missing, not a typo in the test) and would pass with a correct implementation:

- lc-list: FOR and IF/ELSEIF/ELSE (nested to any allowed depth) inside LIST yield LIST_ITEMs, numbered without gaps across mixed static and generated items; items skipped by their own condition or fallback keep today's numbering rule.
- lc-table: IF/ELSEIF/ELSE inside TABLE, and a FOR or IF inside either, yield ROWs; rows are padded to the widest row as before; the header rule is unchanged.
- lc-close: a LIST_ITEM without END_LIST_ITEM ends at the next item, END_LIST, and now also at END_FOR, ELSE, ELSEIF or END_IF of the enclosing child block; a ROW without END_ROW does the same inside an IF or FOR that builds rows; an unclosed item followed by a FOR or IF is that item's content (no new guess), and a LIST_ITEM found inside such content is a `syntax-error` whose suggestion says to close the item with END_LIST_ITEM.
- lc-errors: any other tag or non-whitespace text inside a FOR or IF that builds LIST items, or an IF that builds TABLE rows, is a `syntax-error` at its own position, in every mode; comments and whitespace are always allowed. A FOR placed directly in a TABLE keeps today's text-row fallback (a body that is not a ROW is rendered and split on `|` into a row), so no existing table template changes.
- lc-limits: FOR and IF in LIST and TABLE count toward maxNodes, maxDepth (parse) and maxIterations (run) exactly as elsewhere.
- lc-ws: the standalone rule and trim markers apply to the FOR, IF, ELSE and END tags in LIST and TABLE as elsewhere; LIST, TABLE and their parts keep their own spacing.
- lc-analyze: analyze visits generated items and rows; FOR names inside are scoped; kinds are `list_item` and `table` as today.
- lc-pipes: in a table cell a pipe after an even run of backslashes is escaped, after an odd run is left as written.
- lc-compat: the full suite passes; no existing test file changes. Your guard rows: take the templates of `compat-probe-base.json` (and your own extra ones: TABLE-FOR with several nodes and with ROW bodies, an IF with text in a TABLE-FOR body, iterables and headers with spaces, a non-iterable in a TABLE in strict mode, unclosed ROW and LIST_ITEM before the next, nested LIST, FOR and IF in item content, FOR/IF in an unclosed item's content) and pin their recorded base outputs as literals. Before writing, re-probe the unmodified code yourself for any template you add (write a throwaway test in a scratch path outside `tests/`, or run it through a temporary file you delete); the guard rows are expected to pass now and after.

Cover the edge cases a blind reviewer will look for, spread over the criteria as rows (each row runs in all four entries `render-strict`, `render-lenient`, `resolve-strict`, `resolve-lenient` unless the point is mode-specific, as in `for-window.test.ts`):
- strict versus lenient: a missing data name in an item condition or FOR iterable, a non-iterable in a LIST FOR (strict `type-error` at the FOR; lenient zero items and the ELSE items render), a non-iterable in a TABLE FOR (silent in both), a non-iterable FOR inside an IF in a TABLE (silent in both, ELSE rows render); `render` versus `resolveTemplate` (a located diagnostic in `render`: code, line and column, never 1:1; `resolveTemplate` throws the same code);
- missing versus null versus present values in conditions; empty arrays; FOR windows (`limit`, `offset`) and `@total`/`@index0` inside generated items and rows; nested FOR in FOR in LIST; ELSEIF/ELSE chains; an IF in a FOR in a LIST in an item's nested LIST;
- numbering: static, generated, skipped by condition, with fallback, with empty content, nested LIST has its own counter, generated items in nested LIST;
- cyclic and BigInt item values printed in a generated item or row (coded `type-error`); astral characters (emoji) in item text and in cells; prototype names (`__proto__`, `constructor`) as the loop item name and as data keys and path segments;
- limits: `maxNodes` crossed by FOR/IF nodes in a LIST and in a TABLE (`limit-nodes` located at the crossing tag), `maxDepth` crossed by a FOR/IF chain inside LIST or TABLE (`limit-depth` located at the opening tag), `maxIterations` crossed in a generated list and in table rows (`limit-iterations` located at the FOR, `stats.iterations`), `maxOutputChars` hit inside a generated list's FOR and in rows;
- syntax errors (position of the offending token, all four entries, plus `validate` and `analyze`, also in a branch that never renders): text, `{{SET}}`-like unknown tags, a ROW inside a LIST FOR, a LIST_ITEM inside a TABLE IF, a HEADER inside an IF, a second ELSE, ELSEIF after ELSE, END_IF mismatches; a LIST_ITEM inside the FOR or IF that is the content of an unclosed item (suggestion contains `END_LIST_ITEM`); comments allowed among the children (also directly in LIST and TABLE);
- unclosed items and rows: ends at END_FOR, ELSE, ELSEIF and END_IF; the last item before END_IF in a branch; an unclosed ROW before END_FOR in a FOR inside an IF in a TABLE;
- whitespace: with `standaloneLines` true and false, FOR/IF/ELSE/END tags on their own lines inside LIST and TABLE produce no blank lines or stray text; trim markers (`{{- FOR ... -}}`) next to items; CRLF templates; an item's own spacing kept;
- analyze: `usedIn` kinds (`for`, `if`, `elseif`, `list_item`, `table`, `output`), the loop name scoped over the body and not the ELSE body (a read of the loop name in the ELSE body is an input of that name), `blocks` counts FOR and IF in LIST and TABLE, and agreement with render (a variable read only inside a generated item is an input);
- pipes in cells: values with 0, 1, 2, 3, 4 backslashes before the pipe, pipes at the start and end of a value, a value with a newline, in header cells, in ROW cells, in generated rows; the base renders two backslashes plus a pipe unchanged, the new rule escapes it.

Red evidence: after committing, run `node .process/core/scripts/red-evidence.mjs <worktree> 261015-language2c13-a2-build-list-items-and-table-rows-with-for` (run from your worktree path `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-build-list-items-and`; the script lives in the worktree under `.process/core/scripts/`) and report its result. Failing tests must be real failures of the behaviour; guard rows that pass today are fine, but every criterion except `lc-compat` needs rows that fail. Run only your own file while iterating: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/list-table-children.test.ts`. `node_modules` in the worktree is a junction to the main checkout; never run `npm install`.

If a criterion or the spec seems ambiguous or wrong, stop and say so in your report rather than guessing.

## Model and effort

Sonnet at medium effort: mechanical test writing from precise criteria.

## Result and status

Save your report as `report-test-writer.md` in the card folder (`docs/ephemeral/cycles/language-2/kanban/01_shaping/261015-language2c13-a2-build-list-items-and-table-rows-with-for/` in the main checkout is where the lead reads it; if you cannot write there, return the report text in your final message) and end with a status line: done, done with concerns, needs context, or blocked; list the files committed, the red-evidence result and your row counts per criterion. Never write secrets or credentials. No card, ticket or plan codes in file names, branch names, test names (other than criterion ids), or commit messages.
