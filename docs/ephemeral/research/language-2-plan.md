# Slice C2 plan: cycle language-2 (Tier 1, second half)

Planning lead, 2026-10-15. Project `n8n-nodes-template-resolver`, branch `feature/language` (PR 11 open), tip `7425d27`. Read-only plan: no cycle, card, document or delta is created by this file; the project lead creates them after the human's design approval of section A, the cards in B and the answers to section G.

Sources: cards C8 to C15 and sections C, D, E of `plans/slice-c-language.md` (the human approved its seven answers: single-tag SET/INPUT/CALL as ADR 0007, `??`/zero/float fixes render-only and already built, a missing required INPUT is an error in every mode, `matches` deferred, spellings approved, malicious-path sweep for this cycle); what cycle `language` built (`language-contract.md`, `modules/template-resolver.md`, `core/src/*`, `tests/language/*`); the follow-up tickets in `docs/ephemeral/backlog`; `friction3.md`; `cycle-language-cost.md`.

## 0. What cycle 1 left, and what this plan changes in the old plan

Built and merged on the branch: filter registry and 23 filters, math/zero/float/hyphen fixes, `in not in between .length`, WHEN matchers, `maxNodes`, derived `spec()` and surfaces test, README showcase `lang-filters-showcase`. ADR 0007 exists (built). 7371 tests.

Still the flat design that this cycle replaces (read from code):

| Fact in the code today | Where | Consequence for the plan |
|---|---|---|
| One flat `loopContext` Map, copied on entry and restored on exit; `FOR` and `TABLE`-FOR each re-implement the loop | `interpreter.ts` `visitFor`, `visitTable`, `restoreLoopContext` | L1 builds one loop runner on a scope stack |
| Every condition and every math expression calls `getAllVariables()`, which copies the whole data map | `interpreter.ts:744` | O(data size) per `IF` per iteration: an existing work-amplification path inside the 10000-iteration limit. L1 removes the copy (criterion `fw-no-copy`) before macros multiply it |
| Output length is checked only per top-level child and per FOR iteration, not inside `IF`, `CASE` or any other body | `visitProgram`, `visitFor` | A macro called many times from an `IF` body can build gigabytes before the check. L4 needs its own bound (`mc-output`) |
| `locate()` always overwrites an error's line and column | `errors.ts` | An error inside a macro body must not be wrapped in `at(callNode)`, or it would be reported at the CALL, not at the failing node (`mc-locate`) |
| Keyword lookup is `mapping[keyword] \|\| null` on a plain object | `lexer.ts getTokenType` | `{{constructor}}` is inherited, not unknown (ticket 0026 code part). L3 uses own properties only |
| `FOR` regex `FOR\s+(.+?)\s+AS\s+(\w+)` ignores everything after the item name | `parser.ts parseForExpression` | `limit=` would be silently ignored today; unknown arguments become syntax errors (question 5) |
| `TABLE` FOR renders nothing for a non-iterable even in strict mode; `FOR` throws | `visitTable` vs `visitFor` | One runner needs an explicit policy flag; question 4 |
| The node fills every unmapped variable with `""` in lenient mode | `n8n/TemplateResolver.node.ts` | A required INPUT would then never be missing in the node. L7 must stop that for declared required inputs |
| `??` still uses `isTruthy` (`interpreter.ts:237`); the contract says "`??` keeps its own rule" | `interpreter.ts`, contract line 38 | Not a defect for this cycle: `SET x = a ?? "d"` reuses the same rule; no action |
| `resolveNestedPath` and `resolveValue` read `current[segment]` with no own-property check | `interpreter.ts:706`, `expressions.ts` | `x.constructor` returns an engine object; SET and `@parent` would bind and expose such values. L1 `fw-own` |
| `locateError` retypes any `Error`, a RangeError included, as `type-error` | `errors.ts` | A stack overflow inside a macro chain would be reported as a type error. L4 `mc-depth` |
| The surfaces test keeps a hand-written `BLOCK_PAIRS` | `tests/language/surfaces.test.ts` | Every new keyword would break "spec() has no name outside the table" in its own card; L3 derives the table once (ticket a15) |

Changes to the old card list (C8 to C15, now L1 to L8): the scope stack moves from C9 into the first card, because the shared loop runner needs it; run order is exit-first (see section E); the n8n node file, `inputs.ts`, `macros.ts`, `scope.ts` and `errors.ts` are added to scopes where the old plan omitted them; documents are written once at the end (question 7); no card adds a field to `DEFAULT_LIMITS` (friction line 28).

## A. Proposed cycle

- **Slug:** `language-2`. Same branch `feature/language`, same PR 11 (the project lead decides if a stacked PR is preferred).
- **Kind and tier:** `feature`, tier `product`, stage `beta`, approvals `front` (as `language`). Shape: intent add, purpose ship, compatibility additive, uncertainty partly, reversibility costly (public syntax), size several (8 cards), oracle new-tests and person, trigger planned, legibility documented.
- **Verification and sweeps:** `verification_levels: []` (goldens and CI on both OSes are the system evidence); `review_sweeps: [malicious-path]` (approved).
- **Command:** `node .process/core/scripts/cycle.mjs <projectDir> new language-2 --goal "<goal>" --kind feature --tier product --stage beta --approvals front --review-sweep malicious-path`.
- **Approval, once, for all cards:** `approve-design` must list all eight cards and the modules `template-resolver`, `api`, `cli` in one run (friction lines 26, 27). Do not edit `language-contract.md` or any approved document until L8, or every later `card-move ready` fails with `design-approval-stale` (friction line 37).

### Proposed CYCLE.md body

```markdown
## Goal

Authors can loop with windows, an empty branch and key and value pairs, build lists and tables from loops and conditions, name values with SET, declare typed and required inputs, and define and reuse macros and partials in the language itself, without leaving the house style or the no-eval core.

## Who and why

Audience: the repository owner, people who clone the portfolio repo, and authors of multi-agent prompts (the 28-agent SEO pipeline). Why now: the second half of slice C of the feature spec; filters, operators, CASE and limits shipped in the cycle language, and the prompt-aware blocks of slice D are only useful once an author can repeat, name and reuse fragments. Contract: docs/living/architecture/language-contract.md. Decisions: ADR 0001, 0003 and 0007.

## Stories

none: the spec names no personas or stories and none are invented; spec section 2 (Tier 1) is the source.

## Must-haves

- `contract` `lang-for` FOR accepts `limit` and `offset`, an `{{ELSE}}` empty branch, key and value pairs (`AS k, v`) and the metadata `@total` and `@parent`; an unknown FOR argument is an error; TABLE rows built by FOR use the same loop.
- `contract` `lang-children` FOR and IF may produce LIST items and TABLE rows, with gap-free numbering.
- `contract` `lang-set` SET binds a block-scoped local from a variable expression.
- `contract` `lang-inputs` INPUT declares a variable's type and whether it is required; a missing required input is an error in every mode; analyze, validate and the n8n node use the declaration.
- `contract` `lang-macros` DEFINE and CALL give parameterised fragments with isolated scope; partials passed in the render options supply more DEFINEs; calls are bounded by depth, iterations, output size and node count.
- `contract` `lang-surfaces` spec(), the API, the CLI, the OpenAPI document, the README and the changelog describe every construct and option this cycle adds, and a test derives spec()'s block list from the lexer's keyword table.
- `constraint` `lang-compat` must: every existing test passes; the only amended existing test is tests/language/surfaces.test.ts (named in L3, logged in test_amendments); resolveTemplate keeps its outputs for every template that was valid before, except three named changes: words after a FOR item name that were silently ignored, a table-cell pipe after an even run of backslashes, and a path segment such as `.constructor` that read an inherited member (question 5).
- `constraint` `lang-no-deps` must: add no runtime dependency.
- `constraint` `lang-no-eval` must-not: evaluate template text as code, compile a template-supplied regular expression, or read a file named by a template or a partial.
- `constraint` `lang-bounded` must: no template or partials input makes render, validate or analyze grow work or memory exponentially or without bound through recursion, fan-out, repetition or rebinding: calls, loops, partials and SET values are all held by the four limits (maxIterations, maxOutputChars, maxDepth, maxNodes) and by one total runtime depth cap; every new limit failure is a located diagnostic, never a thrown RangeError and never a `type-error`. Out of scope, filed as a ticket: filter cost proportional to the size of the data on every evaluation (for example `sort | json` over 1 MiB data in a 10000-iteration loop).
- `constraint` `lang-errors` must: every new unknown name, bad argument or bad declaration is a located error in every mode (ADR 0003); strict mode governs only missing data.
- `constraint` `lang-style` evidence-required: the language contract and ADR 0007 describe SET, INPUT, DEFINE and CALL as built, with the single-tag rule.

## Won't-haves

- Tier 2 constructs (TREE, TAG, UNTRUSTED, table upgrades, `as`, BLOCK budgets, MESSAGE, CACHE_BREAK).
- The `matches /re/` operator (deferred).
- Filesystem includes, template inheritance, custom JS helpers, a partials UI in the n8n node.
- Mutation of a bound name: SET never accumulates across loop iterations (a SET inside FOR is fresh each iteration).
- Any attribute-style block; every block keeps the paired house style, SET, INPUT and CALL are single tags (ADR 0007).

## Expected streams
(same list as cycle language)

## Areas touched

- `core/src/` lexer, parser, interpreter, analyze, expressions (type only), render, spec, types, errors, whitespace, index; new scope.ts, macros.ts, inputs.ts (docs/living/architecture/modules/template-resolver.md)
- `n8n/TemplateResolver.node.ts` (same module page)
- `api/routes.ts`, `api/openapi.json` (modules/api.md); `cli/main.ts` (modules/cli.md)
- `README.md`, `changelog.md`, `tests/language/` (new files), `tests/golden/render-cases/lang-*` (new)

## Exit

A person judges the cycle done when the SEO-brief showcase template (SET, FOR with limit and ELSE, CASE with several values, a LIST built by FOR, join and upper filters, a macro defined in a partial) renders the expected file through render, the CLI and the API, the README documents every construct, filter, option and limit, the full suite passes and CI is green on both operating systems.
```

Test plan rows (the project lead writes all of them up front, friction line 11): one row per criterion id of section B, named `t-<criterion id>`, level as in the criterion. `Covers`: lang-for = L1 and L6 rows (16), lang-children = L2 (9), lang-set = L3 (12), lang-macros = L4 and L5 (26), lang-inputs = L7 (10), lang-surfaces = L8 (7) plus every `spec` row; the eight `*-compat` rows are tool criteria and carry `lang-compat`. 80 criteria in all. Unit and integration levels only; system and acceptance stay waived with the reason "this cycle does not select the level".

## B. Cards

Write-path key: `A` add, `E` edit. Labels `L1` to `L8` are plan labels; the project lead's card ids differ. "C8" etc. is the source card of the first plan. Every card: tests are table-driven `it.each` rows in the card's own new file, criterion ids in the test names, gate `node node_modules/jest/bin/jest.js --runTestsByPath <the card's new test file> --json` (the gate lists only new files: friction line 17). Golden cases are added as four files each (`template.md`, `data.json`, `options.json`, `expected.md`) under `tests/golden/render-cases/<name>/` and are also asserted by one row in the card's own test, so the gate proves them; `tests/promptaware/golden-render.test.ts` picks them up unchanged in the full suite (`options.json` can carry `partials`). `docs_impact: []` for L1 to L7, `docs_deferred` not needed (question 7). `manifest.add` lists only files the card adds after the base; stubs and tests the test writer commits before the base are not listed (friction line 19). Blast radius names are module names under `docs/living/architecture/modules/`.

| # | Source | Title | Depends on | Blast radius | Test levels | Size | New test amendments |
|---|---|---|---|---|---|---|---|
| L1 | C8 | Add limit, offset, an empty branch and @total to FOR on one loop runner and a scope stack | none | template-resolver | unit | L | none |
| L2 | C10 | Build LIST items and TABLE rows with FOR and IF | L1 | template-resolver | unit | M | none |
| L3 | C11 | Bind block-scoped locals with SET | L1 | template-resolver, api | unit, integration | M | `tests/language/surfaces.test.ts` |
| L4 | C13 | Define and call macros | L3 | template-resolver | unit | L | none |
| L5 | C14 | Pass partials in the render options and expose them in the API, CLI and OpenAPI | L4 | template-resolver, api, cli | unit, integration | M | none |
| L6 | C9 | Iterate keys and values and read the enclosing loop | L3, L4 | template-resolver | unit | M | none |
| L7 | C12 | Declare typed and required inputs | L3 | template-resolver, api | unit, integration | M | none |
| L8 | C15 | Document the language and prove the showcase | L1 to L5 (and L6, L7 when built) | template-resolver, api, cli | unit, integration | M | none |

Run order is L1, L2, L3, L4, L5, L6, L7, L8 (exit-first: L6 and L7 are not needed by the Exit showcase and can be deferred, section E). Strictly sequential: all eight cards edit `parser.ts`, `interpreter.ts` and `analyze.ts`; the budget, not wall time, is the constraint, and parallel lanes would only add merge friction (friction lines 30, 40). `depends_on` lists true technical dependencies only, so a deferred L6 or L7 does not block anything.

---

### L1 (C8) Add limit, offset, an empty branch and @total to FOR on one loop runner and a scope stack

**Goal.** One loop runner, on a scope stack that can chain, serves FOR and TABLE-FOR; FOR gains the window, the empty branch and `@total`.

**Syntax settled here.** `{{FOR items AS item [limit=N] [offset=M]}}`; `limit` and `offset` take an integer literal or a variable path, in any order, at most once each; `as` stays case-insensitive. `{{ELSE}}` directly inside a FOR (not inside a nested block) is its empty branch. Items are windowed with `slice(offset, offset + limit)` after coercion.

**Criteria.**
- `fw-window` (unit) a literal or a path gives the window; a negative, non-integer, non-numeric or unsafe-integer value is a `type-error` located at the FOR in every mode; a missing path is `missing-variable` in strict mode and an ignored argument in lenient mode; the paths are read in the scope outside the loop.
- `fw-meta` (unit) `@index0 @index1 @first @last @notFirst @notLast` describe the position in the rendered window; `@total` is the number of items the loop renders after offset and limit, the same on every iteration; outside a loop `@total` is a missing variable.
- `fw-else` (unit) the empty branch renders exactly when zero items render: an empty array, offset past the end, `limit=0`, a missing or non-iterable value in lenient mode; it does not render when one item renders; a strict non-iterable keeps today's located `type-error`; the loop name and the `@` names are not bound inside the ELSE body; a second ELSE in one FOR is a `syntax-error` at it; an IF's own ELSE and a FOR inside an IF branch are not confused; ELSE after ELSEIF or outside IF and FOR keeps today's "Unexpected token".
- `fw-args` (unit) an unknown argument (`max=3`), a repeated argument, trailing words and a missing item name are a `syntax-error` at the FOR tag in every mode, even in a branch that never renders (question 5).
- `fw-table` (unit) TABLE rows built by FOR use the same runner and get window, ELSE (its body holds ROWs) and `@total`; the legacy rule "a non-iterable renders no rows, even in strict mode" is kept (question 4) and in that case the ELSE rows render, without an error;
- `fw-limits` (unit) each rendered item counts toward `maxIterations` (skipped offset items do not); the running output check applies inside the loop and the ELSE body; `stats.iterations` counts rendered items.
- `fw-scope` (unit) loop names and metadata live on a stack frame that is gone after END_FOR; an outer loop's name and metadata are visible again after an inner loop; an inner name shadows an outer or data name only inside; frames carry a parent link so L6 adds `@parent` without reworking the stack.
- `fw-no-copy` (unit) conditions, math and filters read variables through the scope chain; `resolveTemplate` over a loop with an IF, with the data given as a Map subclass that counts `Symbol.iterator`, `entries`, `keys` and `forEach` calls, makes zero copies of the data map during the run (red today: `getAllVariables` copies per condition). The test calls `resolveTemplate` because `render` builds its own Map.
- `fw-own` (unit) a non-root path segment reads own properties only, in output, conditions and math (`x.constructor`, `x.__proto__`, `x.toString` and `@parent.constructor` are missing, not inherited engine objects); an own key with those names still works.
- `fw-compat` (tool) the full suite passes, including `tests/regressions/nested-for.test.ts` and the TABLE tests of `tests/TemplateResolver.node.test.ts`; no existing test file changes.

**files_scope (exact).** E `core/src/types.ts`, `core/src/parser.ts`, `core/src/interpreter.ts`, `core/src/analyze.ts`, `core/src/spec.ts`, `core/src/expressions.ts` (the parameter type of the condition and math functions becomes a read-only lookup with `get` and `has`; `resolveValue` reads own properties only); A `core/src/scope.ts`, `tests/language/for-window.test.ts`, `tests/golden/render-cases/lang-for-window/{template.md,data.json,options.json,expected.md}`.

**Also.** analyze: the loop name, `@` names and the item name are not inputs; `limit` and `offset` paths are `for` usage; the ELSE body is walked without the loop name. spec(): FOR args `array AS item [limit=N] [offset=N]`, ELSE described as an IF and FOR part (existing `ELSE` row, no new keyword). Follow-ups pulled in: none.

**AST oracle.** `tests/TemplateResolver.node.test.ts` (about lines 1832 to 1907) asserts `iterable`, `itemName`, `body`, `items` and `rows` on the parser output: keep those fields with their current meaning and add new fields (window, else body) alongside.

**Risk.** The largest card; every visitor that reads variables changes. If the planner finds it past about 1.5 sessions, split only the pure stack move into a separate green-first card; the nested-for tests are the oracle.

### L2 (C10) Build LIST items and TABLE rows with FOR and IF

**Criteria.**
- `lc-list` (unit) FOR and IF/ELSEIF/ELSE (nested to any allowed depth) inside LIST yield LIST_ITEMs, numbered without gaps across mixed static and generated items; items skipped by their own condition or fallback keep today's numbering rule.
- `lc-table` (unit) IF/ELSEIF/ELSE inside TABLE, and a FOR or IF inside either, yield ROWs; rows are padded to the widest row as before; the header rule is unchanged.
- `lc-close` (unit) a LIST_ITEM without END_LIST_ITEM ends at the next item, END_LIST, and now also at END_FOR, ELSE, ELSEIF or END_IF of the enclosing child block; a ROW without END_ROW does the same inside an IF or FOR that builds rows; an unclosed item followed by a FOR or IF is that item's content (no new guess), and a LIST_ITEM found inside such content is a `syntax-error` whose suggestion says to close the item with END_LIST_ITEM.
- `lc-errors` (unit) any other tag or non-whitespace text inside a FOR or IF that builds LIST items, or an IF that builds TABLE rows, is a `syntax-error` at its own position, in every mode; comments and whitespace are always allowed. A FOR placed directly in a TABLE keeps today's text-row fallback (a body that is not a ROW is rendered and split on `|` into a row), so no existing table template changes (question 4).
- `lc-limits` (unit) FOR and IF in LIST and TABLE count toward maxNodes, maxDepth (parse) and maxIterations (run) exactly as elsewhere.
- `lc-ws` (unit) the standalone rule and trim markers apply to the FOR, IF, ELSE and END tags in LIST and TABLE as elsewhere; LIST, TABLE and their parts keep their own spacing.
- `lc-analyze` (unit) analyze visits generated items and rows; FOR names inside are scoped; kinds are `list_item` and `table` as today.
- `lc-pipes` (unit, ticket 0023) in a table cell a pipe after an even run of backslashes is escaped, after an odd run is left as written. This changes the output of a previously valid template (a cell holding two backslashes and a pipe): named in question 5 and the changelog.
- `lc-compat` (tool) the full suite passes; no existing test file changes.

**files_scope.** E `core/src/types.ts`, `core/src/parser.ts`, `core/src/interpreter.ts`, `core/src/analyze.ts`, `core/src/spec.ts`; A `tests/language/list-table-children.test.ts`, `tests/golden/render-cases/lang-list-for/*`, `tests/golden/render-cases/lang-table-if/*` (4 files each).

**Note.** The same AST tests pin `items` and `rows`: keep both with their meaning for templates without generated children and add a `children` list alongside; replace the `TableRow{cells:[[ForNode]]}` wrapper only if those tests still pass; interpreter `visitTable` collects rows through one recursive collector shared with the LIST collector. Follow-ups pulled in: 0023.

### L3 (C11) Bind block-scoped locals with SET

**Syntax settled here.** `{{SET name = expression}}`, a single tag (ADR 0007). `name` is `[A-Za-z_][A-Za-z0-9_]*`. `expression` is exactly what may stand inside `${{ }}`: a path, arithmetic, `?? default`, `| filters`, plus a literal (quoted text, number, `true`, `false`, `null`) as the first term. The value is bound, not its text: a list stays a list.

**Criteria.**
- `st-set` (unit) literals, paths, arithmetic, `??` and filter chains bind the value (an array stays an array and `FOR` over it works); the same evaluator as `${{ }}` is used (one function, so `??`, math and filter errors are identical).
- `st-math` (unit) in `render`, arithmetic stores the same number the output would print (`SET t = 0.1 + 0.2` then `${{t}}` and `{{IF t == 0.3}}` agree); `resolveTemplate` keeps its plain number.
- `st-scope` (unit) visible from the tag to the end of the enclosing block (an IF branch, a CASE clause, a FOR body, a LIST item, a SECTION, a FENCE) and the top level; fresh each FOR iteration; shadows data of the same name; read before the tag it is data; rebinding a SET name in the same or an inner block is allowed and ends with its block.
- `st-null` (unit) in lenient mode a missing value binds `null` (reading it later is not a missing-variable error and prints empty); in strict mode a missing variable in the expression is a located `missing-variable` at the SET.
- `st-names` (unit) a name starting with `@`, a live loop name or an invalid identifier is a `syntax-error` at the tag (L4 adds the macro parameter case); `SET __proto__ = 1`, `constructor` and `toString` are ordinary names (scopes are Maps).
- `st-single` (unit) `{{SET}}`, `{{SET x}}`, `{{SET = 1}}` are a `syntax-error`; `{{END_SET}}` is an unknown tag (ADR 0003, ADR 0007).
- `st-ws` (unit) SET joins the standalone set (a line holding only SET tags vanishes) and takes trim markers; it outputs nothing.
- `st-analyze` (unit) the SET name is a local from the tag on, never an input; variables read in the expression are usage kind `set`; a read of the same name before the SET is an input.
- `st-keywords` (unit, tickets 0026 code part, a15) lexer keywords are looked up by own property only (`{{constructor}}` is "Unknown template tag"); the lexer exports its keyword table and `tests/language/surfaces.test.ts` derives its block list and `closes` entries from it (an `END_<K>` entry means `K` closes with it), so a keyword added later without a spec() entry fails; `spec().blocks` lists SET with no `closes`.
- `st-size` (unit) in the one shared value evaluator, a filter result or SET value whose text is longer than `maxOutputChars` is a located `limit-output` at the variable or SET, so a chain such as `SET a = a | json` repeated cannot double a value without bound; applies to `${{ }}` too.
- `st-openapi` (integration) the OpenAPI `usedIn` list stops being a closed enum (it names the kinds in a description), so `set`, `call` and `input` need no schema edit in later cards.
- `st-compat` (tool) full suite passes; the only existing test file changed is `tests/language/surfaces.test.ts` (logged amendment: hand-written `BLOCK_PAIRS` replaced by a table derived from the lexer; no row removed).

**files_scope.** E `core/src/lexer.ts`, `core/src/types.ts`, `core/src/parser.ts`, `core/src/interpreter.ts` (extract one value evaluator from `visitVariable`), `core/src/analyze.ts`, `core/src/whitespace.ts`, `core/src/spec.ts`, `core/src/scope.ts`, `api/openapi.json`, `tests/language/surfaces.test.ts`; A `tests/language/set.test.ts`, `tests/golden/render-cases/lang-set/*`.

**Risk.** Keyword table and standalone rule (see section D). Follow-ups pulled in: 0026 code part, a15.

### L4 (C13) Define and call macros

**Syntax settled here.** `{{DEFINE name(p1, p2)}}...{{END_DEFINE}}` (paired, top level only, hoisted, outputs nothing); `{{CALL name(arg1, arg2)}}` (single tag, outputs the body). Names `[A-Za-z_][A-Za-z0-9_]*`; parameters distinct identifiers; arguments positional, each a variable path, a quoted text, a number, `true`, `false` or `null`. Arguments are read in the caller's scope; the body sees its parameters and the data, nothing else.

**Criteria.**
- `mc-define` (unit) hoisted: a CALL before the DEFINE works; the DEFINE renders nothing; a DEFINE inside any block is a `syntax-error` at it; a name defined twice is a `syntax-error` at the second; a duplicate or invalid parameter is a `syntax-error`.
- `mc-call` (unit) positional arguments bind to parameters; paths and literals both work; a missing path argument is `missing-variable` at the CALL in strict mode and `null` in lenient mode.
- `mc-link` (unit) an unknown macro or a wrong argument count is a `syntax-error` at the CALL in every mode, found before output and even in a branch that never renders; in `validate` and `analyze` an unknown name is a diagnostic that `validate` reports as `analysis-warning` (partials may supply it at render, L5), while a wrong count for a known name is thrown like a parse error by `analyze` and is an error in `validate`.
- `mc-scope` (unit) the body cannot read the caller's SET locals, loop names or `@` metadata (the `@parent` case is `fo-scope` in L6); a name in the body that is not a parameter reads the data; parameters shadow data; SET inside the body is local to the body and a call, and a SET of a parameter name is a `syntax-error`; the caller's scope is intact afterwards.
- `mc-depth` (unit) one runtime depth counter rises on every block entered and every CALL, and is bounded by `maxDepth` and, when a caller raises `maxDepth`, by an internal cap of 256 (question 6): an infinite recursion, and 32 chained calls each with a body nested 31 blocks deep, at default limits, and recursion through a nested-block body at a raised `maxDepth`, give a located `limit-depth` (or succeed), never a RangeError and never a `type-error`; `render`, `validate` and `analyze` turn a stray RangeError into a `limit-depth` diagnostic instead of rethrowing it or letting `locateError` retype it.
- `mc-iterations` (unit) every CALL counts one toward `maxIterations`: a fan-out of two per level over 14 levels ends in `limit-iterations`; the count appears in `stats.iterations`.
- `mc-output` (unit) `maxOutputChars` is enforced across and inside macro bodies and `IF`/`CASE` bodies under a CALL: a macro whose body is larger than the limit divided by the call count, called from an IF body, ends in `limit-output` before the work holds much more than twice the limit.
- `mc-locate` (unit) an error raised inside a body is located at the failing body node and its message names the macro and the CALL's line and column (and the partial, when the body came from one, L5); it is never moved to the CALL.
- `mc-names` (unit) macro names `__proto__`, `constructor`, `toString` and `hasOwnProperty` define and call like any name, and an unknown one is "unknown macro", never an inherited member (the table is a Map).
- `mc-ws` (unit) DEFINE and END_DEFINE join the standalone set; CALL does not (it outputs, like a variable); trim markers work on all three.
- `mc-analyze` (unit) analyze and validate walk each DEFINE body exactly once and never follow a CALL, so a fan-out or mutually recursive set of macros costs time linear in the template (rows run through `validate` and `analyze`, not only `render`); parameters are locals in the body; CALL argument paths are usage kind `call`; `blocks` counts DEFINE; unresolved names are warnings in validate; analyze lists the macros it saw in an optional `macros` field present only when DEFINEs exist (a required field would break the hand-built analysis literals in `tests/promptaware/section.test.ts` and `api/routes.ts`).
- `mc-spec` (unit) `spec().blocks` lists DEFINE (closes END_DEFINE) and CALL (no closes); the derived surfaces test passes without edits.
- `mc-compat` (tool) the full suite passes; no existing test file changes.

**files_scope.** E `core/src/lexer.ts`, `core/src/types.ts`, `core/src/parser.ts`, `core/src/interpreter.ts`, `core/src/analyze.ts`, `core/src/whitespace.ts`, `core/src/spec.ts`, `core/src/scope.ts`, `core/src/errors.ts` (`locateError` leaves a RangeError alone), `core/src/render.ts` (RangeError net); A `core/src/macros.ts` (macro table, duplicate and call checks, shared with L5), `tests/language/macros.test.ts`, `tests/golden/render-cases/lang-macro/*`.

**Risk.** The most exposed card of the cycle (recursion, amplification, isolation); expect a third review round. Build it so that the macro table has a second source (partials) from the start: `macros.ts` takes a list of already parsed DEFINE nodes, so L5 only adds a source.

### L5 (C14) Pass partials in the render options and expose them in the API, CLI and OpenAPI

**Settled here.** `partials: Record<string, string>`; each text holds only DEFINE blocks, comments and whitespace. Names of partials are labels for diagnostics; macro names come from the DEFINEs. A macro name defined twice anywhere (template and partials) is a `syntax-error`; there is no shadowing, so lookup order never matters (the old plan's "template first" sentence is dropped).

**Criteria.**
- `pt-option` (unit) `render`, `validate` and `analyze` accept `partials`; partial texts are lexed with the same whitespace options as the template; CALL resolves into them; partials are not interpreted as output and unreferenced ones cost only parse time.
- `pt-only` (unit) text, a variable, a block other than DEFINE or any other tag in a partial is a `syntax-error` whose message names the partial and whose line and column are inside that partial's text.
- `pt-dup` (unit) a name defined twice in one partial, in two partials or in a partial and the template is a `syntax-error` naming both places.
- `pt-nodes` (unit) partial nodes count toward `maxNodes` (one shared counter across the template and every partial); crossing it is `limit-nodes` located in the partial that crossed it and named; the same in validate and analyze.
- `pt-validate` (unit) without a `partials` option an unknown CALL is an `analysis-warning`; with the option given (even `{}`) it is an error; render without partials is always an error.
- `pt-depth` (unit) mutual recursion across two partials is `limit-depth`; fan-out across partials hits `limit-iterations` and `limit-output` as in `mc-iterations` and `mc-output`; the same templates through `validate` and `analyze` return promptly (no expansion).
- `pt-source` (unit) every node knows its source (the template or a partial's name); a runtime error inside a macro body defined in a partial names that partial in its message, and `analyze`/`validate` findings in a partial do too.
- `pt-names` (unit) partial names `__proto__`, `constructor` are ordinary labels; a partial map built from JSON with those keys never touches a prototype.
- `pt-api` (integration) `options.partials` on `/v1/render`, `/v1/validate` and `/v1/analyze`; a non-object or a non-string entry is 400 `invalid-request` naming the key; partial nodes count against the server's `maxNodes`.
- `pt-cli` (integration) `--partials <file.json>` on `render`, `validate` and `analyze`; unreadable or invalid JSON or a non-object-of-strings is exit 2; usage text lists the flag.
- `pt-openapi` (integration) the OpenAPI document describes `options.partials` on the three routes.
- `pt-spec` (unit) `spec().options` lists `partials`.
- `pt-compat` (tool) the full suite passes; no existing test file changes.

**files_scope.** E `core/src/types.ts`, `core/src/parser.ts` (partial mode; shared node counter), `core/src/macros.ts`, `core/src/interpreter.ts`, `core/src/render.ts`, `core/src/analyze.ts`, `core/src/spec.ts`, `core/src/index.ts`, `api/routes.ts`, `api/openapi.json`, `cli/main.ts`; A `tests/language/partials.test.ts`, `tests/golden/render-cases/lang-partials/*` (its `options.json` carries the partials). The n8n node and `resolveTemplate` take no partials.

### L6 (C9) Iterate keys and values and read the enclosing loop (deferrable)

**Syntax settled here.** `{{FOR obj AS k, v}}` (two distinct names, optional space after the comma; `itemName` stays the value name and a new `keyName` field holds the key, so the AST tests of L1 hold); over an array the pair is index and item; over an object key and value in own-property order (determinism pinned: integer-like keys first, then insertion order, as the engine gives it); JSON-object text is read as an object, other text as an array. `@parent` is a plain object binding on each loop frame that holds the enclosing loop's metadata (`index0 index1 first last notFirst notLast total` and its own `parent`), so `@parent.index0` and `@parent.parent.first` are ordinary path reads in conditions, math, output and macro arguments, with no change to the expression evaluator.

**Criteria.**
- `fo-pairs` (unit) objects, arrays, JSON-object text, empty and non-iterable input in strict and lenient mode; `limit`, `offset`, ELSE and `@total` apply to pairs.
- `fo-parent` (unit) every metadata name through one and two levels; a missing level or an outermost loop is a missing variable (strict error, lenient empty).
- `fo-scope` (unit) `k` and `v` never leak after END_FOR; `@parent` is not visible inside a macro body called from the loop (a body loop has its own parent chain).
- `fo-errors` (unit) three names, a repeated name, an invalid name or a SET name collision is a `syntax-error` at the FOR.
- `fo-analyze` (unit) `k`, `v` and `@parent` are not inputs.
- `fo-compat` (tool) the full suite passes; no existing test file changes.

**files_scope.** E `core/src/types.ts`, `core/src/parser.ts`, `core/src/interpreter.ts`, `core/src/scope.ts`, `core/src/analyze.ts`, `core/src/spec.ts`; A `tests/language/for-pairs.test.ts`, `tests/golden/render-cases/lang-for-pairs/*`.

### L7 (C12) Declare typed and required inputs (deferrable)

**Syntax settled here.** `{{INPUT name type=<string|number|boolean|array|object|any> [required]}}`, a single tag at the top level only; `required` is a bare word (as the approved plan wrote it); `type` is optional and defaults to `any`. INPUT outputs nothing and is checked before any output.

**Criteria.**
- `in-declare` (unit) inside any block, declared twice, an unknown type, an unknown argument or an invalid name is a `syntax-error` located at the tag, in every mode.
- `in-type` (unit) a present value of the wrong type is a `type-error` located at the INPUT; the check uses the coercion rules the language already uses (a numeric text satisfies `number`, a comma text or JSON array text satisfies `array`, `yes`/`no`/`1`/`0` satisfy `boolean`; arrays and objects do not satisfy `string`); the value is checked, never rewritten (question 3); null or missing skips the check.
- `in-required` (unit) a required input that is missing or null is a `missing-variable` error located at the INPUT in strict and lenient mode, with the message "Required input 'x' is missing"; an empty string is present; a declared required input that no one reads is still required.
- `in-optional` (unit) a declared input without `required` that is missing reads as null in strict mode too (question 2), and a FOR over it iterates nothing (its ELSE renders); undeclared variables keep the strict rule.
- `in-analyze` (unit) declared inputs appear in analyze with `declared: true` and `typeHint`, and their `optional` is taken from the declaration (`optional` is true without `required`, whatever the reads), so `required` keeps its documented meaning `!optional`; the new fields are present only on declared inputs, so every existing analyze assertion holds; one that is never read has usage kind `input` only and `validate` warns about it as `analysis-warning`.
- `in-node` (unit) the n8n node's strict check (it uses `!optional`) names an unmapped declared required input and does not throw for an unmapped declared optional input; in lenient mode the node does not fill a declared required input with `""`, and its missing-variable error comes from render; an explicitly mapped empty string is present.
- `in-openapi` (integration) the OpenAPI analysis schema lists `declared` and `typeHint`, and the analyze route returns them.
- `in-ws` (unit) INPUT joins the standalone set and takes trim markers.
- `in-spec` (unit) `spec().blocks` lists INPUT with no `closes`; the derived surfaces test passes without edits.
- `in-compat` (tool) the full suite passes; no existing test file changes.

**files_scope.** E `core/src/lexer.ts`, `core/src/types.ts`, `core/src/parser.ts`, `core/src/interpreter.ts`, `core/src/analyze.ts`, `core/src/whitespace.ts`, `core/src/spec.ts`, `core/src/errors.ts` (the required-input message), `n8n/TemplateResolver.node.ts`, `api/openapi.json`; A `core/src/inputs.ts` (type table and checks), `tests/language/input.test.ts` (the node rows use the same `n8n-workflow` mock context as `tests/headless/node.test.ts`).

### L8 (C15) Document the language and prove the showcase

**Criteria.**
- `ld2-spec` (unit) the derived surfaces test covers every lexer keyword; every new construct and option has a spec() entry and a README mention.
- `ld2-readme` (unit) the README has one section per new construct (FOR window and ELSE, pairs and `@parent`, LIST and TABLE children, SET, INPUT, DEFINE/CALL, partials, `--partials`, `options.partials`) with examples whose templates the test renders and compares verbatim, as the filters showcase does.
- `ld2-showcase` (unit, integration) the golden case `lang-seo-brief` (template, data, options with partials, expected) renders identically through `render`, the CLI (`--partials` file written by the test) and the API; CRLF checkout safe.
- `ld2-changelog` (unit) the changelog lists the constructs and the three behaviour changes (FOR arguments, table-cell pipes after an even backslash run, inherited path members).
- `ld2-openapi` (unit) the OpenAPI document's analysis schema describes the usage kinds, the `macros` field and `declared`/`typeHint`, its block-name and standalone-lines descriptions name DEFINE, SET, INPUT and CALL, and its `usedIn` description names every kind of the `UsageKind` union (a test compares them).
- `ld2-docs` (review) the language contract, the template-resolver, api and cli module pages, the headless contract and ADR 0007 match the code; each new rule of section C appears in the contract with its error behaviour.
- `ld2-compat` (tool) the full suite passes, `tests/promptaware/docs.test.ts` included.

**files_scope.** E `README.md`, `changelog.md`, `api/openapi.json` (descriptions only), `core/src/spec.ts` (the `spec().version` bump if question 9 is yes, and any missing entry `ld2-spec` finds); A `tests/language/surfaces-language-2.test.ts` (a new file, so no frozen test is amended again), `tests/golden/render-cases/lang-seo-brief/*`; living documents through the deltas listed in section H. If L6 or L7 were deferred, L8 documents only what was built and notes the rest as planned.

---

## C. Settled-here table (spellings and semantics beyond the approved plan)

| Item | Planned | Needs a yes |
|---|---|---|
| FOR arguments | `limit=N offset=M`, literal or path, any order, once each | question 1 |
| Window meaning of metadata | `@index0.. @last` and `@total` describe the rendered window | question 1 |
| Pairs | `AS k, v`; arrays give index, item; `@parent.<name>` object snapshot | question 1 |
| SET | `{{SET name = expr}}`, expression grammar of `${{ }}` plus literals; value kept; fresh per iteration; no accumulation | question 1 |
| INPUT | `{{INPUT name type=T required}}`, top level, hoisted, check only | questions 1, 2, 3 |
| Macros | `DEFINE name(a, b)` paired and hoisted; `CALL name(x, "lit")` single; args path, quoted text, number, true, false, null | question 1 |
| Link rule | unknown macro: render error, validate warning unless `partials` given | question 1 |
| Partials | duplicates are errors; names are labels | none (consequence of ADR 0003) |
| TABLE-FOR strictness | legacy silent rule kept | question 4 |
| Trailing words after the FOR item name | become a syntax error | question 5 |

## D. Risks and review focus

**Risks.**
- **Scope stack replacing the flat loop map (L1).** Every variable read changes. Mitigations: nested-for regression tests as the oracle; frames with parent links built once; `fw-no-copy` removes the per-condition data copy. Failure signs: an outer loop's name or `@index0` lost after an inner loop, a loop name visible in ELSE, a SET leaking out of its branch.
- **Recursion and amplification in macros and partials (L4, L5).** Three independent bounds must all hold across a CALL: call depth (and the internal cap), iterations (every call counts), output size (checked inside bodies, not only at the top). maxNodes holds across partials by one shared counter. A hostile partial map can only cost parse time within maxNodes and the request body size. `locate()` overwrites positions, so a body must not be re-located at the CALL.
- **SET and INPUT keyword table and standalone rule (L3, L7, L4).** The table is a plain object (inherited keys); tags are upper case only (`{{set}}` stays an unknown tag, ticket a14 stays open); SET, INPUT, DEFINE and END_DEFINE join the standalone set and CALL does not, so a CALL on its own line leaves a blank line unless the author trims; a single tag with no arguments (`{{SET}}`) must error like `{{ELSE}}` with arguments does; `validateBlocks` needs DEFINE as an opener and END_DEFINE as its closer; the surfaces test is derived once in L3 so L4 and L7 touch no existing test.
- **Behaviour changes to old templates.** Three, all question 5: trailing words after a FOR item name stop being ignored; a table-cell pipe after an even backslash run is now escaped (0023); `x.constructor`-style path segments stop reading inherited members. New tags used to be "Unknown template tag", so no previously valid template changes meaning. TABLE-FOR keeps its legacy silent rule (question 4).
- **Node and required inputs (L7).** The node fills unmapped variables with `""` in lenient mode; without the L7 change `required` would pass silently there.
- **Stack depth.** Parse depth bounds blocks per body, but a call chain multiplies it (32 calls of 31 nested blocks is about 1000 levels). One runtime depth counter, bounded by `maxDepth` and an internal cap of 256, covers blocks and calls (question 6); a stray RangeError becomes `limit-depth`, never a retyped `type-error`. A caller who raises `maxDepth` far above the default and nests blocks without calls is still ticket a13.
- **Hidden growth.** Output is not the only place memory grows: SET values and filter results are bounded by `st-size`; `analyze` and `validate` must not follow calls (`mc-analyze`); data-proportional filter cost per evaluation is out of scope and becomes a ticket.
- **Friction repeats.** Test writer commits stubs before the base (do not list them in the manifest); the gate lists only new test files; worktrees need `node_modules` linked; set `blast_radius`, `test_levels`, `depends_on` and criterion `level` and `traces` in `card.json` before freezing; a doc-free card needs no `docs_deferred`.

**Review focus for blind reviewers** (goal-critical first):
1. Bounded work and memory: macro calls, partials, windows, pairs, IF in TABLE rows, ELSE bodies all count toward the four limits; no per-condition data copy; output enforced inside bodies.
2. No scope leak: SET, loop names, `k`/`v`, `@parent`, macro parameters gone after their block; macro bodies cannot read caller state; ELSE bodies do not see the loop name.
3. ADR 0003 everywhere: unknown arguments, macros, types and declarations fail in lenient mode too; only missing data depends on strict mode; a required INPUT is an error in every mode including the node.
4. Every new diagnostic is located at the failing node (never 1:1); body errors are not moved to the CALL; partial errors name the partial.
5. analyze agrees with render and spec: locals are not inputs, a read before SET is, every read variable is, spec() blocks are derived from the lexer table.
6. Compatibility: only the named amendment; `resolveTemplate` outputs unchanged for old templates; TABLE legacy rule.
7. Prototype-safe names (`__proto__`, `constructor`) in SET, INPUT, macros, partials and the keyword table.
8. Determinism: pair order, CRLF golden cases.
9. Polish: README examples render as shown.

## E. Cost estimate and batches

**Evidence.** Cycle `language`: 7 build cards plus a docs card, about 40 agent runs (build leads 6 resumed 2 to 4 times, test writers 7, implementers about 14, cleanup 1, review leads 11), weekly 77% to 80% (3 points, project lead session included), 4 hours wall. C1 trial: 6 member runs, under 1 point. So about 5 runs per card and about 0.075 weekly points per run, all-in. The cards here are heavier (bigger diffs, recursion, a third review round likely on L4 and L5), so the per-run price is raised by about 30%, and the sweep and close review, absent from that figure, are added. This agrees with the 5 to 7 points the cycle cost note already guessed.

| Card | Member runs (estimate) | Weekly points |
|---|---|---|
| L1 | 8 | 0.8 |
| L2 | 6 | 0.5 |
| L3 | 7 | 0.6 |
| L4 | 9 | 0.9 |
| L5 | 8 | 0.8 |
| L6 | 6 | 0.5 |
| L7 | 7 | 0.6 |
| L8 | 5 | 0.4 |
| Cycle level: planning leads and audits (about 3), malicious-path sweep over the whole cycle diff (about 3), docs steward and close review (about 2) | about 8 | 0.9 |
| **Total** | **about 64** | **about 6.0 (range 5 to 8)** |

Weekly usage is 80%. The human's stop is at 90%. A full cycle ends at about 86% (84 to 88%). Variance comes from third review rounds on L4 and L5 (about +0.3 each) and from each contract edit forcing an approval refresh (avoided by question 7).

**Batches.**
- **Batch 1, exit-critical (L1 to L5, then L8):** about 51 runs, about 4.8 points, ends near 85%. It delivers every Exit item (SET, FOR with limit and ELSE, a LIST built by FOR, a macro from a partial through render, CLI and API) and documents them.
- **Batch 2 (L6, L7):** about 13 runs, about 1.1 points (batch 1 plus batch 2 is about 6.0 with the cycle-level runs counted once). Pairs, `@parent` and INPUT; they are `lang-for` (part) and `lang-inputs`.
- **Checkpoints, recommended:** (a) after L2 read the weekly figure: if it rose more than 2 points in L1 and L2, tell the human before L3. (b) After L5 (exit items built; expected near 84%): continue with L6 and L7 only if usage is at most 85%, which leaves about 2.5 points of margin for L6, L7, L8, the sweep and the close review before 90%; otherwise run L8 on what exists and move L6 and L7 to a cycle `language-3` (the human edits the must-haves `lang-for` and `lang-inputs`, so it is a human-owned change; the plan does not mark them `later card`). (c) Hard stop: usage 90% at any point; finish the card in review, do not start another; L8 runs only if the budget remains for its 5 runs, otherwise leave the docs deltas for the next session.
- **Cards that could be deferred without breaking another card:** L6 and L7 (their `depends_on` are L3, L4 and L3; nothing depends on them). If more must go, L5's API, CLI and OpenAPI half could be split off, but `lang-surfaces` and the Exit showcase through CLI and API need it, so I do not recommend it.
- **Cheaper choices already made:** no card edits living documents (no approval refreshes, no `docs_deferred` round trips), one approval for all cards, no cleanup member unless a card's code review asks for it (the C1 cleanup run found nothing).

## F. Plan-level audits

Light passes, as asked for a plan document. Red team: the Codex route is not configured in this project (`review.model` and `review.effort` unpinned in `.process/aperture.json`), so the same-family fallback ran and is labelled so; gap audit: fresh `gap-auditor`, given the objective chain and the plan only.

**Gap audit (12 findings).**

| # | Finding | Class | Answer |
|---|---|---|---|
| 1 | `lc-errors` would break a TABLE-FOR body that is not a ROW (text-row fallback) | defect | Fixed: fallback kept, errors only for LIST children and IF-built rows, comments allowed; added to question 4 |
| 2 | L7 reused `required`; the node's `!optional` check would still demand optional inputs | defect | Fixed: a declared input's `optional` comes from the declaration, `required` stays `!optional`, node row added; part of question 2 |
| 3 | A required `macros` field breaks hand-built analysis literals (`section.test.ts`, `api/routes.ts`) | defect | Fixed: field optional, present only with DEFINEs |
| 4 | `openapi.json` enum and descriptions go stale after L3, L4, L7; no owner | goal-risk | Fixed: L3 opens the enum, L7 adds its fields, L8 owns descriptions (`ld2-openapi`) |
| 5 | L4 needs `errors.ts` | defect | Fixed (already added from the red team) |
| 6 | Question 9 needs `spec.ts` in L8's scope | defect | Fixed |
| 7 | Criteria depend on later cards; L6's depends_on wrong | defect | Fixed: macro-parameter and `@parent` clauses moved, L6 depends on L3 and L4 |
| 8 | Existing AST-shape tests pin `itemName`, `items`, `rows` | goal-risk | Fixed: fields keep their meaning, new fields alongside, tests named as oracle |
| 9 | Call depth and block depth must share one counter | goal-risk | Fixed: one runtime counter, bounded by `maxDepth` and 256, row at a raised `maxDepth` |
| 10 | Unclosed ROW ends only at ROW or END_TABLE | goal-risk | Fixed: `lc-close` covers ROW |
| 11 | ELSE over a non-iterable in a strict TABLE-FOR undefined | goal-risk | Fixed: ELSE rows render, no error |
| 12 | Test-plan counts wrong | drift | Fixed: recomputed (80 criteria) |

The audit confirmed every claim of section 0 against the code and the arithmetic of section E.

**Red team (7 findings, same-family fallback).**

| # | Finding | Class | Answer |
|---|---|---|---|
| 1 | Runtime depth is call depth times block nesting; `locateError` retypes a RangeError as `type-error` | defect | Fixed: `mc-depth` one counter, RangeError net in `render`, `validate`, `analyze`; `errors.ts` and `render.ts` in L4's scope; question 6 |
| 2 | SET values and filter results are unbounded (`SET a = a | json` repeated) | defect | Fixed: `st-size` in the shared evaluator |
| 3 | analyze and validate must not expand CALLs | goal-risk | Fixed: `mc-analyze` walks each body once; `pt-depth` rows through validate and analyze |
| 4 | `lang-bounded` as worded cannot be met (filter cost grows with data) | goal-risk | Fixed: constraint reworded; data-proportional filter cost excluded and filed as a ticket |
| 5 | Ticket 0023 changes output of valid templates | drift | Accepted: named behaviour change, question 5(b), changelog |
| 6 | Runtime errors in a partial body have no source label | defect | Fixed: `pt-source` |
| 7 | Path segments read inherited members (`x.constructor`) | defect | Fixed: `fw-own` in L1; behaviour change, question 5(c) |

Nothing found that makes this the wrong plan; no finding was dropped.

## G. Questions for the human (dependency order, recommendation first)

1. **Confirm the new spellings in section C** (FOR `limit=`/`offset=` and the window meaning of `@index0..@last` and `@total`; `AS k, v` and `@parent.<name>`; `{{SET name = expr}}`; `{{INPUT name type=T required}}`; `DEFINE name(a, b)` and `CALL name(x, "lit")` with numbers, `true`, `false`, `null` also allowed as arguments; unknown CALL is a render error and a validate warning). Recommended: yes, as written.
2. **A declared INPUT without `required` that is missing: does it read as empty in strict mode, or stay a missing-variable error?** Recommended: reads as empty (the author declared it optional): output is empty, a condition sees null, and a FOR over it iterates nothing and renders its ELSE instead of raising the strict non-iterable error; undeclared variables keep the strict rule; the node does not demand a mapping for it; analyze reports it `optional` whatever the reads (so `required` stays `!optional`).
3. **Does INPUT only check the type, or also convert the value?** Recommended: only check; the language already coerces at the point of use (FOR, filters), and rewriting values would add a second coercion path.
4. **Two legacy TABLE-FOR rules: a non-iterable in strict mode renders no rows silently (FOR throws), and a FOR body that is not a ROW is rendered and split on `|` into a row. Keep both, or make them the FOR behaviour?** Recommended: keep both in this cycle (no existing behaviour changes) and file a backlog ticket to unify.
5. **Accept three behaviour changes to previously valid templates?** (a) the words after a FOR item name, ignored today, become a syntax error; (b) a table-cell pipe after an even run of backslashes is escaped (ticket 0023); (c) a path segment such as `x.constructor` reads an own property only, not an inherited engine member. Recommended: yes to all three (ADR 0003; (b) and (c) are bugs); drop (b) from L2 if the human prefers to keep 0023 a ticket.
6. **Add one runtime depth counter (blocks entered plus calls), bounded by `maxDepth` and by an internal cap of 256, and turn a stray RangeError into `limit-depth`?** Recommended: yes; without it a call chain nests blocks past what default limits suggest and can overflow the stack. Ticket a13 (nesting without calls under a raised `maxDepth`) stays a ticket.
7. **Write the living documents once, in L8, or in each card as cycle `language` did?** Recommended: once in L8; it avoids a design-approval refresh and a `docs_deferred` round trip per card (friction lines 20, 37); the cards' specs are the record in between. The project lead records one delta per document for the whole cycle.
8. **Budget plan:** run the full order with the checkpoints of section E (continue to L6 and L7 only at 85% or lower after L5), or trim to batch 1 now? Recommended: the full order with the checkpoints.
9. **Bump `spec().version` from `"1.0"` to `"1.1"` in L8?** Recommended: yes (the language grew in both cycles); no test pins the number.

## H. Documents, deltas and follow-ups

**New documents:** none (ADR 0007 and the language contract exist).

**Changed documents (one `modify` delta each, recorded by the project lead for the whole cycle, applied at the merge; state stays):**
- `docs/living/architecture/language-contract.md` (FOR, children, SET, INPUT, macros, partials, scope and limits rules)
- `docs/living/architecture/modules/template-resolver.md` (new files, scope stack, node behaviour)
- `docs/living/architecture/modules/api.md` (`options.partials`, analyze fields)
- `docs/living/architecture/modules/cli.md` (`--partials`)
- `docs/living/architecture/headless-contract.md` (partials option, analyze `declared` and `typeHint`, `stats.iterations` counts calls)
- `docs/living/decisions/adr/0007-statement-tags-without-a-body.md` (its consequence "not built yet" is stale once built; add a dated note)

**Follow-ups pulled in:** 0023 (L2), 0026 code part (the `{{constructor}}` keyword; L3) and a15 (L3). Doc parts closed by the L8 deltas: 0026 (qualify the two absolute syntax claims in the module page; the unclosed-ROW claim is a doc fix only) and the 0025 ticket about the module page still describing `utils.ts` and `extractAllVariables` (two backlog tickets share the number 0025, friction line 3; the module-doc one is meant).

**Housekeeping for the project lead, not cycle work:** tickets 0017, 0021, 0022, 0032, 0033, 0035 and 0042 were pulled into cycle `language` by the first plan and the contract describes their behaviour as built, yet they are still open in `docs/ephemeral/backlog`; verify and close them with `ticket.mjs close`. Tickets 0016 and 0020 are coercion notes (record only).

**New ticket to file (project lead):** filter cost proportional to data size on every evaluation (sort, unique, json, lines over large data inside a 10000-iteration loop) is not bounded by any limit; found by the red team, pre-existing.

**Left out (stay tickets):** a2 (`FILTERS` snapshot), a10 (strict missing before `default=`), a11 (`textOf` copy), a12 (length wording), a13 (raised `maxDepth` overflow for block nesting), a14 (tag keywords are upper case only; documented, not changed), the process tickets 0014, 0015, 0019, 0024, 0041, 0047, the harness ticket 0025 (`any` in the golden harness), 0036 to 0039 (headless fixes), 0043 to 0046, 0049, 0050 (prompt-aware fixes), 0001 (documentation lead).
