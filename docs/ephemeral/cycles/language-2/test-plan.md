---
summary: The tests this cycle plans at each level, and which requirement lines each one proves.
state: planned
---

# Test plan

<!-- One section per level. The lead fills Pairs with, Depth and Approval while planning down; the test writer fills the table before building starts. Each row names a test id (t- then letters, digits and hyphens), the requirement or story ids it covers, and what it proves. Covers accepts a comma list, "and", or a range such as `x-01` to `x-07`. -->
<!-- Status moves planned, red, green, or waived with a Reason line. Approval is human or auto. -->

## Unit

Pairs with: module design.
Depth: product default.
Approval: auto.
Status: planned.

| Test | Covers | What it proves |
|---|---|---|
| t-fw-window | lang-for | a literal or a path gives the window; a negative, non-integer, non-numeric or unsafe-integer value is a `type- |
| t-fw-meta | lang-for | `@index0 @index1 @first @last @notFirst @notLast` describe the position in the rendered window; `@total` is th |
| t-fw-else | lang-for | the empty branch renders exactly when zero items render: an empty array, offset past the end, `limit=0`, a mis |
| t-fw-args | lang-for | an unknown argument (`max=3`), a repeated argument, trailing words and a missing item name are a `syntax-error |
| t-fw-table | lang-for | TABLE rows built by FOR use the same runner and get window, ELSE (its body holds ROWs) and `@total`; the legac |
| t-fw-limits | lang-for | each rendered item counts toward `maxIterations` (skipped offset items do not); the running output check appli |
| t-fw-scope | lang-for | loop names and metadata live on a stack frame that is gone after END_FOR; an outer loop's name and metadata ar |
| t-fw-no-copy | lang-for | conditions, math and filters read variables through the scope chain; `resolveTemplate` over a loop with an IF, |
| t-fw-own | lang-for | a non-root path segment reads own properties only, in output, conditions and math (`x.constructor`, `x.__proto |
| t-fw-compat | lang-compat | the full suite passes, including `tests/regressions/nested-for.test.ts` and the TABLE tests of `tests/Template |
| t-lc-list | lang-children | FOR and IF/ELSEIF/ELSE (nested to any allowed depth) inside LIST yield LIST_ITEMs, numbered without gaps acros |
| t-lc-table | lang-children | IF/ELSEIF/ELSE inside TABLE, and a FOR or IF inside either, yield ROWs; rows are padded to the widest row as b |
| t-lc-close | lang-children | a LIST_ITEM without END_LIST_ITEM ends at the next item, END_LIST, and now also at END_FOR, ELSE, ELSEIF or EN |
| t-lc-errors | lang-children | any other tag or non-whitespace text inside a FOR or IF that builds LIST items, or an IF that builds TABLE row |
| t-lc-limits | lang-children | FOR and IF in LIST and TABLE count toward maxNodes, maxDepth (parse) and maxIterations (run) exactly as elsewh |
| t-lc-ws | lang-children | the standalone rule and trim markers apply to the FOR, IF, ELSE and END tags in LIST and TABLE as elsewhere; L |
| t-lc-analyze | lang-children | analyze visits generated items and rows; FOR names inside are scoped; kinds are `list_item` and `table` as tod |
| t-lc-pipes | lang-children | in a table cell a pipe after an even run of backslashes is escaped, after an odd run is left as written. This  |
| t-lc-compat | lang-compat | the full suite passes; no existing test file changes. |
| t-st-set | lang-set | literals, paths, arithmetic, `??` and filter chains bind the value (an array stays an array and `FOR` over it  |
| t-st-math | lang-set | in `render`, arithmetic stores the same number the output would print (`SET t = 0.1 + 0.2` then `${{t}}` and ` |
| t-st-scope | lang-set | visible from the tag to the end of the enclosing block (an IF branch, a CASE clause, a FOR body, a LIST item,  |
| t-st-null | lang-set | in lenient mode a missing value binds `null` (reading it later is not a missing-variable error and prints empt |
| t-st-names | lang-set | a name starting with `@`, a live loop name or an invalid identifier is a `syntax-error` at the tag (L4 adds th |
| t-st-single | lang-set | `{{SET}}`, `{{SET x}}`, `{{SET = 1}}` are a `syntax-error`; `{{END_SET}}` is an unknown tag (ADR 0003, ADR 000 |
| t-st-ws | lang-set | SET joins the standalone set (a line holding only SET tags vanishes) and takes trim markers; it outputs nothin |
| t-st-analyze | lang-set | the SET name is a local from the tag on, never an input; variables read in the expression are usage kind `set` |
| t-st-keywords | lang-set | lexer keywords are looked up by own property only (`{{constructor}}` is "Unknown template tag"); the lexer exp |
| t-st-size | lang-set | in the one shared value evaluator, a filter result or SET value whose text is longer than `maxOutputChars` is  |
| t-st-compat | lang-compat | full suite passes; the only existing test file changed is `tests/language/surfaces.test.ts` (logged amendment: |
| t-mc-define | lang-macros | hoisted: a CALL before the DEFINE works; the DEFINE renders nothing; a DEFINE inside any block is a `syntax-er |
| t-mc-call | lang-macros | positional arguments bind to parameters; paths and literals both work; a missing path argument is `missing-var |
| t-mc-link | lang-macros | an unknown macro or a wrong argument count is a `syntax-error` at the CALL in every mode, found before output  |
| t-mc-scope | lang-macros | the body cannot read the caller's SET locals, loop names or `@` metadata (the `@parent` case is `fo-scope` in  |
| t-mc-depth | lang-macros | one runtime depth counter rises on every block entered and every CALL, and is bounded by `maxDepth` and, when  |
| t-mc-iterations | lang-macros | every CALL counts one toward `maxIterations`: a fan-out of two per level over 14 levels ends in `limit-iterati |
| t-mc-output | lang-macros | `maxOutputChars` is enforced across and inside macro bodies and `IF`/`CASE` bodies under a CALL: a macro whose |
| t-mc-locate | lang-macros | an error raised inside a body is located at the failing body node and its message names the macro and the CALL |
| t-mc-names | lang-macros | macro names `__proto__`, `constructor`, `toString` and `hasOwnProperty` define and call like any name, and an  |
| t-mc-ws | lang-macros | DEFINE and END_DEFINE join the standalone set; CALL does not (it outputs, like a variable); trim markers work  |
| t-mc-analyze | lang-macros | analyze and validate walk each DEFINE body exactly once and never follow a CALL, so a fan-out or mutually recu |
| t-mc-spec | lang-macros | `spec().blocks` lists DEFINE (closes END_DEFINE) and CALL (no closes); the derived surfaces test passes withou |
| t-mc-compat | lang-compat | the full suite passes; no existing test file changes. |
| t-pt-option | lang-macros | `render`, `validate` and `analyze` accept `partials`; partial texts are lexed with the same whitespace options |
| t-pt-only | lang-macros | text, a variable, a block other than DEFINE or any other tag in a partial is a `syntax-error` whose message na |
| t-pt-dup | lang-macros | a name defined twice in one partial, in two partials or in a partial and the template is a `syntax-error` nami |
| t-pt-nodes | lang-macros | partial nodes count toward `maxNodes` (one shared counter across the template and every partial); crossing it  |
| t-pt-validate | lang-macros | without a `partials` option an unknown CALL is an `analysis-warning`; with the option given (even `{}`) it is  |
| t-pt-depth | lang-macros | mutual recursion across two partials is `limit-depth`; fan-out across partials hits `limit-iterations` and `li |
| t-pt-source | lang-macros | every node knows its source (the template or a partial's name); a runtime error inside a macro body defined in |
| t-pt-names | lang-macros | partial names `__proto__`, `constructor` are ordinary labels; a partial map built from JSON with those keys ne |
| t-pt-spec | lang-macros | `spec().options` lists `partials`. |
| t-pt-compat | lang-compat | the full suite passes; no existing test file changes. |
| t-fo-pairs | lang-for | objects, arrays, JSON-object text, empty and non-iterable input in strict and lenient mode; `limit`, `offset`, |
| t-fo-parent | lang-for | every metadata name through one and two levels; a missing level or an outermost loop is a missing variable (st |
| t-fo-scope | lang-for | `k` and `v` never leak after END_FOR; `@parent` is not visible inside a macro body called from the loop (a bod |
| t-fo-errors | lang-for | three names, a repeated name, an invalid name or a SET name collision is a `syntax-error` at the FOR. |
| t-fo-analyze | lang-for | `k`, `v` and `@parent` are not inputs. |
| t-fo-compat | lang-compat | the full suite passes; no existing test file changes. |
| t-in-declare | lang-inputs | inside any block, declared twice, an unknown type, an unknown argument or an invalid name is a `syntax-error`  |
| t-in-type | lang-inputs | a present value of the wrong type is a `type-error` located at the INPUT; the check uses the coercion rules th |
| t-in-required | lang-inputs | a required input that is missing or null is a `missing-variable` error located at the INPUT in strict and leni |
| t-in-optional | lang-inputs | a declared input without `required` that is missing reads as null in strict mode too (question 2), and a FOR o |
| t-in-analyze | lang-inputs | declared inputs appear in analyze with `declared: true` and `typeHint`, and their `optional` is taken from the |
| t-in-node | lang-inputs | the n8n node's strict check (it uses `!optional`) names an unmapped declared required input and does not throw |
| t-in-ws | lang-inputs | INPUT joins the standalone set and takes trim markers. |
| t-in-spec | lang-inputs | `spec().blocks` lists INPUT with no `closes`; the derived surfaces test passes without edits. |
| t-in-compat | lang-compat | the full suite passes; no existing test file changes. |
| t-ld2-spec | lang-surfaces | the derived surfaces test covers every lexer keyword; every new construct and option has a spec() entry and a  |
| t-ld2-readme | lang-surfaces | the README has one section per new construct (FOR window and ELSE, pairs and `@parent`, LIST and TABLE childre |
| t-ld2-showcase | lang-surfaces | the golden case `lang-seo-brief` (template, data, options with partials, expected) renders identically through |
| t-ld2-changelog | lang-surfaces | the changelog lists the constructs and the three behaviour changes (FOR arguments, table-cell pipes after an e |
| t-ld2-openapi | lang-surfaces | the OpenAPI document's analysis schema describes the usage kinds, the `macros` field and `declared`/`typeHint` |
| t-ld2-compat | lang-compat | the full suite passes, `tests/promptaware/docs.test.ts` included. |

## Integration

Pairs with: software design.
Depth: product default.
Approval: auto.
Status: planned.

| Test | Covers | What it proves |
|---|---|---|
| t-st-openapi | lang-set | the OpenAPI `usedIn` list stops being a closed enum (it names the kinds in a description), so `set`, `call` an |
| t-pt-api | lang-macros | `options.partials` on `/v1/render`, `/v1/validate` and `/v1/analyze`; a non-object or a non-string entry is 40 |
| t-pt-cli | lang-macros | `--partials <file.json>` on `render`, `validate` and `analyze`; unreadable or invalid JSON or a non-object-of- |
| t-pt-openapi | lang-macros | the OpenAPI document describes `options.partials` on the three routes. |
| t-in-openapi | lang-inputs | the OpenAPI analysis schema lists `declared` and `typeHint`, and the analyze route returns them. |
| t-ld2-showcase-int | lang-surfaces | the golden case `lang-seo-brief` (template, data, options with partials, expected) renders identically through |

## System

Pairs with: system analysis and design.
Depth: product default.
Approval: human.
Status: waived.
Reason: this cycle does not select the system level.

| Test | Covers | What it proves |
|---|---|---|

## Acceptance

Pairs with: requirements.
Depth: selected by the cycle.
Approval: human.
Status: waived.
Reason: this cycle does not select the acceptance level.

| Test | Covers | What it proves |
|---|---|---|
