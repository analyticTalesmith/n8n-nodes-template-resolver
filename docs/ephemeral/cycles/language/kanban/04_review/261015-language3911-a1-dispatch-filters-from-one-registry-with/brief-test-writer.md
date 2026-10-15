# Brief: test writer for the filter registry card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself (filters, operators, CASE and FOR upgrades, SET, inputs, macros, partials) without leaving the house style or the no-eval core. The cycle is `language`.
Card goal: every filter is dispatched from one registry that also feeds spec() and analyze, filters take and return values, and filter arguments are parsed once at parse time with quotes respected, with no change to any existing template output. Later cards only add rows to the registry.
Your objective: turn each criterion below into failing table-driven jest tests that fail for the right reason (an assertion, never a missing import), commit them with signature-only stubs, and record red evidence. The tests are the oracle the implementer is held to, so each must break on a plausible wrong implementation.

## Decisions already made

- Read these first: `docs/ephemeral/work/261015-language3911-a1-dispatch-filters-from-one-registry-with/spec.md` (criteria, the interface names tests may import, examples), the card folder `docs/ephemeral/cycles/language/kanban/01_shaping/261015-language3911-a1-dispatch-filters-from-one-registry-with/` (`card.md`, `card.json`), `docs/ephemeral/cycles/language/test-plan.md` (rows t-fr-01 to t-fr-05), `docs/living/architecture/language-contract.md` (Filters section), ADR 0003 (`docs/living/decisions/adr/0003-unknown-names-are-always-errors.md`: an unknown or bad filter is an error in every mode). All paths are relative to the worktree below.
- Human decisions in chat, 2026-10-14: render-only behavior changes; resolveTemplate outputs stay unchanged; an undeclared filter parameter is a type-error.
- Tests use the public API (`render`, `validate`, `analyze`, `spec`, `Lexer`, `Parser`, `parseFilter`, `applyFilter`, `resolveTemplate` from `core/src`) plus the named registry exports from the spec. Learn call shapes and diagnostic shapes from the existing tests (`tests/headless/*.test.ts`, `tests/promptaware/*.test.ts`), not from the implementation.
- You may observe today's behavior by running `render` on small templates when you need an expected value for an "unchanged" row. Reading the implementation files in `core/src` is not allowed.

## Owned files and scope

Worktree (work only here, on its branch `feature/dispatch-filters-from-one`): `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-dispatch-filters-from-one` (node_modules is linked; run jest as `node node_modules/jest/bin/jest.js --runTestsByPath <file> --json`).
You may add or change only:
- `tests/language/filter-registry.test.ts` (new): the tests, the criterion id in every test name (`fr-registry`, `fr-values`, `fr-args`, `fr-default-quote`, `fr-groups`), a message on each assertion.
- `tests/headless/spec.test.ts` (approved amendment; reason: the fixed six-name filter list becomes the registry's names so later filter cards do not edit this test; approved by the project lead): derive the expected filter names from `FILTER_REGISTRY`; keep every other assertion and the test names.
- Signature-only stubs so the tests fail by assertion: `core/src/types.ts` gains the `FilterDefinition` interface from the spec; `core/src/filters.ts` gains `export const FILTER_REGISTRY: FilterDefinition[] = []` (empty, so every registry test is red); new `core/src/filters-text.ts` exporting `TEXT_FILTERS: FilterDefinition[] = []` and new `core/src/filters-collection.ts` exporting `COLLECTION_FILTERS: FilterDefinition[] = []`. Add nothing else to core; do not touch `FILTERS`, `applyFilter` or any behavior.
- The card's `card.json` in the worktree (path `docs/ephemeral/cycles/language/kanban/01_shaping/261015-language3911-a1-dispatch-filters-from-one-registry-with/card.json`): only the `traces` list of each criterion (`tests/language/filter-registry.test.ts#<criterion id>`; for `fr-compat` use `tests/headless/spec.test.ts#rr-spec`).
- `docs/ephemeral/work/261015-language3911-a1-dispatch-filters-from-one-registry-with/red-evidence.md` (written by the red-evidence script).

## How the work is judged

Cases to cover (use `it.each` tables; a test that pushes a definition into `FILTER_REGISTRY` removes it again in `afterEach`):
- fr-registry: push a definition `{name:"shout", params:"shout", description:"d", paramNames:[], apply: v => String(v).toUpperCase()}`: `render('${{ a | shout }}', {a:"x"})` outputs `X`; `spec().filters` then lists `shout` with exactly the keys name, params, description and no function (compare with a JSON round trip and a key list); `analyze` and `validate` give no `unknown-filter` for it and count it in filter usage; before the push the same template reports unknown-filter / fails; after removal the filter is unknown again (names are not cached at module load). Also: `spec().filters` names equal the registry names in order, and `FILTERS` names equal them.
- fr-values: a pushed probe definition records its `input`: an array data value arrives as the same array (identity), an object as the same object, a number as a number, a string as a string; the value it returns is printed exactly as the same value would print without any filter (arrays and objects print as `${{ x }}` does today). The six existing filters on non-string data (number, array, object, boolean, null) print what they print today: derive the expected values by observing today's output, row by row, for head, tail, trim, escape_md, fence, heading_offset. Chained filters give the same output as today.
- fr-args: parse results from `Lexer` and `Parser` (find the variable node in the AST): each filter is `{name, params}` with a parsed name and params, never the raw text in `name`. Rows: `fence="a=b"` gives params `{value:"a=b"}` and the render output is a fence whose language is `a=b`; `fence="a:b"` keeps `a:b`; `fence='c++'`, `fence=js`, `head=3`, `head="3"`, `trim`, `fence="a|b"` (a pipe inside quotes is not a filter separator); a pushed probe with `paramNames:["find","with"]` called as `probe:find="a, b",with="c=d"` receives exactly `{find:"a, b", with:"c=d"}`; `parseFilter` keeps every result the existing tests expect. Errors: `escape_md:mode=block`, `head:count=2`, `fence:lang=js`, and a probe with `paramNames:[]` called `probe:x=1` each give `ok:false` and a diagnostic with code `type-error` located at the variable's line and column (check a variable that is not at 1:1, such as on the second line), in lenient mode and in strict mode, never a silent render. Plain `escape_md=block` and `escape_md=inline` still work.
- fr-default-quote: with `x` missing, in lenient mode: `${{x ?? '90s hits | head=3}}` outputs `'90`; `${{x ?? "abc | trim}}` outputs `"abc`; a closed quoted default still keeps a pipe: `${{x ?? "a | b" | head=3}}` outputs `a |`; `${{x ?? 'it' | head=1}}` outputs `i`. Run the same rows through `resolveTemplate` with `strictMode:false` where it gives the same answer.
- fr-groups: `TEXT_FILTERS` and `COLLECTION_FILTERS` are arrays; `FILTER_REGISTRY.slice(0,6)` names are exactly head, tail, trim, escape_md, fence, heading_offset in that order and `FILTER_REGISTRY.length` equals 6 plus the lengths of both groups; every definition has name, params, description, paramNames (an array) and apply (a function); names are unique.
- fr-compat is checked by the whole suite, not by you.

In your report say which wrong implementation each table catches. Slow flows: none expected.

## Model and effort

sonnet, medium: mechanical table writing against a precise spec, no architecture judgment needed.

## Result and status

Commit in the worktree with Conventional Commits, subject at most 72 characters, no ids or card codes, no attribution lines, for example `test(filters): pin the filter registry and quote-aware arguments`. Run `node .process/core/scripts/red-evidence.mjs <worktree path> 261015-language3911-a1-dispatch-filters-from-one-registry-with` with the worktree path as the project directory (run it from the worktree's own `.process` copy), and commit the `red-evidence.md` it writes; it must exit 0. Never push, never touch main, never move or claim cards, never redirect to `nul`. Save your report as `report-test-writer.md` in the main repo card folder `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/docs/ephemeral/cycles/language/kanban/01_shaping/261015-language3911-a1-dispatch-filters-from-one-registry-with/` (not committed) and return the same text, ending with a status: done, done with concerns, needs context, or blocked.
