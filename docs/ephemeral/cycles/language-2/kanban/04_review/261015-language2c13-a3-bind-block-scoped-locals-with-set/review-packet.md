---
type: review-packet
card: 261015-language2c13-a3-bind-block-scoped-locals-with-set
tier: product
built_at: 2026-10-15T15:12:49.313Z
base: 02e8dc84b5035b8a398b63d593f3ef66a3405768
head: 79dd65d571b43679267d5c40d51f8c122d860a56
read_at: 79dd65d571b43679267d5c40d51f8c122d860a56
frozen: true
brief_sha256: e1cfd3463bff914c161c5d3346e0614e61679ddda08709d369d46be1a83bbf19
manifest_sha256: df6261ca52e1f716ba7ec977767923fe4fba90bd5bc4280aaaf4debd4d297b86
criteria_sha256: e8944c662ae9d1980dffe7aaded92c5f6a4fa3e617fb2f71824f74a4e4db0177
scope_sha256: 22ed70a0944edd151ab579186cdd5ee063c35149a8671c2bbacfbed1e685b23c
diff_sha256: 2f6a222dec649ad526df06e786f96c7a71364f640ce069507413e88d79c860ac
omitted_paths: 7
criteria_count: 12
must_not_count: 5
---

# Review packet: 261015-language2c13-a3-bind-block-scoped-locals-with-set

Manifest amended after the freeze at 2026-10-15T15:11:00.473Z by lead: the test writer committed the golden case files and the surfaces amendment before the base, and the card needed no change in scope.ts (add -tests/golden/render-cases/lang-set/data.json, add -tests/golden/render-cases/lang-set/expected.md, add -tests/golden/render-cases/lang-set/options.json, add -tests/golden/render-cases/lang-set/template.md, edit -core/src/scope.ts)

Manifest amended after the freeze at 2026-10-15T15:11:04.944Z by lead: the surfaces test amendment was committed by the test writer before the base (edit -tests/language/surfaces.test.ts)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language so prompts can be built from data (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error and every loop, call and output bounded.
Card goal: `{{SET name = expression}}` binds a block-scoped local from the same value evaluator `${{ }}` uses; the value is kept (an array stays an array); a SET never leaks out of its block; the lexer keyword table is exported and read by own property only.

### Criteria

- c1 (verify: test): st-set: literals, paths, arithmetic, `??` and filter chains bind the value (an array stays an array and `FOR` over it works); the same evaluator as `${{ }}` is used (one function, so `??`, math and filter errors are identical).
- c2 (verify: test): st-math: in `render`, arithmetic stores the same number the output would print (`SET t = 0.1 + 0.2` then `${{t}}` and `{{IF t == 0.3}}` agree); `resolveTemplate` keeps its plain number.
- c3 (verify: test): st-scope: visible from the tag to the end of the enclosing block (an IF branch, a CASE clause, a FOR body, a LIST item, a SECTION, a FENCE) and the top level; fresh each FOR iteration; shadows data of the same name; read before the tag it is data; rebinding a SET name in the same or an inner block is allowed and ends with its block.
- c4 (verify: test): st-null: in lenient mode a missing value binds `null` (reading it later is not a missing-variable error and prints empty); in strict mode a missing variable in the expression is a located `missing-variable` at the SET.
- c5 (verify: test): st-names: a name starting with `@`, a live loop name or an invalid identifier is a `syntax-error` at the tag (L4 adds the macro parameter case); `SET __proto__ = 1`, `constructor` and `toString` are ordinary names (scopes are Maps).
- c6 (verify: test): st-single: `{{SET}}`, `{{SET x}}`, `{{SET = 1}}` are a `syntax-error`; `{{END_SET}}` is an unknown tag (ADR 0003, ADR 0007).
- c7 (verify: test): st-ws: SET joins the standalone set (a line holding only SET tags vanishes) and takes trim markers; it outputs nothing.
- c8 (verify: test): st-analyze: the SET name is a local from the tag on, never an input; variables read in the expression are usage kind `set`; a read of the same name before the SET is an input.
- c9 (verify: test): st-keywords: lexer keywords are looked up by own property only (`{{constructor}}` is "Unknown template tag"); the lexer exports its keyword table and `tests/language/surfaces.test.ts` derives its block list and `closes` entries from it (an `END_<K>` entry means `K` closes with it), so a keyword added later without a spec() entry fails; `spec().blocks` lists SET with no `closes`.
- c10 (verify: test): st-size: in the one shared value evaluator, a filter result or SET value whose text is longer than `maxOutputChars` is a located `limit-output` at the variable or SET, so a chain such as `SET a = a | json` repeated cannot double a value without bound; applies to `${{ }}` too.
- c11 (verify: test): st-openapi: the OpenAPI `usedIn` list stops being a closed enum (it names the kinds in a description), so `set`, `call` and `input` need no schema edit in later cards.
- c12 (verify: tool): st-compat: full suite passes; the only existing test file changed is `tests/language/surfaces.test.ts` (logged amendment: hand-written `BLOCK_PAIRS` replaced by a table derived from the lexer; no row removed).

### Must not

- m1: change any existing test expectation, except the logged amendment of `tests/language/surfaces.test.ts` (its block table derived from the lexer keyword table; no row removed)
- m2: add a runtime dependency
- m3: evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- m4: let an unknown name or bad argument pass in lenient mode (ADR 0003)
- m5: change the output or the error of any template that was valid before, except `{{constructor}}`-style tags (now an unknown tag), the tags `{{SET ...}}` (statement now) and a string filter result longer than `maxOutputChars` (now a located `limit-output`)

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language so prompts can be built from data (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error and every loop, call and output bounded.
Card goal: `{{SET name = expression}}` binds a block-scoped local from the same value evaluator `${{ }}` uses; the value is kept (an array stays an array); a SET never leaks out of its block; the lexer keyword table is exported and read by own property only.
Must not:
- change any existing test expectation, except the logged amendment of `tests/language/surfaces.test.ts` (its block table derived from the lexer keyword table; no row removed)
- add a runtime dependency
- evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- let an unknown name or bad argument pass in lenient mode (ADR 0003)
- change the output or the error of any template that was valid before, except `{{constructor}}`-style tags (now an unknown tag), the tags `{{SET ...}}` (statement now) and a string filter result longer than `maxOutputChars` (now a located `limit-output`)

## Questions

- goal-critical: does every template the base commit accepted keep its output and error (`${{ }}` with defaults, filters, math with and without filters, missing names in strict and lenient mode, `__proto__` and `constructor` as names, cyclic and BigInt values, `resolveTemplate` and `render` apart)? Probe the base commit with such templates.
- goal-critical: does a SET stay inside its block (IF branch, CASE clause, FOR iteration, LIST item, SECTION, FENCE, ROW, top level) and never reach the caller's data or the next FOR iteration or an outer block after an inner rebinding?
- goal-critical: do `${{ }}` and SET share one evaluator, so `??`, math, filter and missing-variable errors have the same code and message, and SET errors are located at the SET tag (never 1:1)?
- goal-critical: in `render`, does `SET t = 0.1 + 0.2` bind the number that prints (0.3) and in `resolveTemplate` the plain number? Is `/0` an error in `render` only?
- goal-critical: a missing value: strict mode `missing-variable` at the SET, lenient mode binds `null` (a later read prints empty, no error)?
- goal-critical: are `{{SET}}`, `{{SET x}}`, `{{SET = 1}}`, a name with `@`, an invalid identifier and a live loop name each a located `syntax-error` in every mode and at parse time (also in a branch that never renders, also through `validate` and `analyze`)? Are `__proto__`, `constructor`, `toString` ordinary names and `{{constructor}}` an unknown tag? Is `{{END_SET}}` an unknown tag?
- goal-critical: is a string value or filter result longer than `maxOutputChars` a located `limit-output` (`SET a = a | json` repeated stops), for `${{ }}` as well?
- goal-critical: does `analyze` agree with render (the SET name a local from the tag to the end of its block, never an input; a read before it an input; variables read in the expression have kind `set`) and is `spec().blocks` derived so that a keyword with no `spec()` entry fails the surfaces test?
- polish: the standalone rule (a line of only SET tags vanishes) and trim markers; SET outputs nothing; a SECTION holding only a SET.
- polish: limits (`maxNodes` counts SET; iterations and depth unchanged), astral characters in values, the OpenAPI `usedIn` no longer a closed enum.

## Rubric

- The criteria in `card.json` hold, each with a test named by its id in `tests/language/set.test.ts`.
- One value evaluator serves `${{ }}` and SET; no second copy of the variable logic.
- Strict versus lenient differs only for missing data (ADR 0003); syntax errors are the same in every mode.
- `resolveTemplate` and `render` agree on the language; `render` differs only where the criteria say (math value, `/0`).
- The scope never writes the caller's data; scopes are Maps (no prototype names reach engine objects).
- No file outside the card's scope changed.

## Design context

- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
- core/src/interpreter.ts
- core/src/scope.ts
- core/src/parser.ts
- core/src/lexer.ts
- core/src/analyze.ts
- core/src/types.ts
- core/src/spec.ts
```

### spec.md as of base 02e8dc84b503, read at 79dd65d571b4

```
# Spec: bind block-scoped locals with SET

Source: `docs/ephemeral/research/language-2-plan.md` section L3 (criteria are frozen in `card.json` and are the contract; `st-compat` is a tool criterion, the full suite). Decisions of the project lead are marked "decided".

## Acceptance criteria

Verbatim from `card.json`; they are the contract.

- st-set: literals, paths, arithmetic, `??` and filter chains bind the value (an array stays an array and `FOR` over it works); the same evaluator as `${{ }}` is used (one function, so `??`, math and filter errors are identical).
- st-math: in `render`, arithmetic stores the same number the output would print (`SET t = 0.1 + 0.2` then `${{t}}` and `{{IF t == 0.3}}` agree); `resolveTemplate` keeps its plain number.
- st-scope: visible from the tag to the end of the enclosing block (an IF branch, a CASE clause, a FOR body, a LIST item, a SECTION, a FENCE) and the top level; fresh each FOR iteration; shadows data of the same name; read before the tag it is data; rebinding a SET name in the same or an inner block is allowed and ends with its block.
- st-null: in lenient mode a missing value binds `null` (reading it later is not a missing-variable error and prints empty); in strict mode a missing variable in the expression is a located `missing-variable` at the SET.
- st-names: a name starting with `@`, a live loop name or an invalid identifier is a `syntax-error` at the tag (L4 adds the macro parameter case); `SET __proto__ = 1`, `constructor` and `toString` are ordinary names (scopes are Maps).
- st-single: `{{SET}}`, `{{SET x}}`, `{{SET = 1}}` are a `syntax-error`; `{{END_SET}}` is an unknown tag (ADR 0003, ADR 0007).
- st-ws: SET joins the standalone set (a line holding only SET tags vanishes) and takes trim markers; it outputs nothing.
- st-analyze: the SET name is a local from the tag on, never an input; variables read in the expression are usage kind `set`; a read of the same name before the SET is an input.
- st-keywords: lexer keywords are looked up by own property only (`{{constructor}}` is "Unknown template tag"); the lexer exports its keyword table and `tests/language/surfaces.test.ts` derives its block list and `closes` entries from it (an `END_<K>` entry means `K` closes with it), so a keyword added later without a spec() entry fails; `spec().blocks` lists SET with no `closes`.
- st-size: in the one shared value evaluator, a filter result or SET value whose text is longer than `maxOutputChars` is a located `limit-output` at the variable or SET, so a chain such as `SET a = a | json` repeated cannot double a value without bound; applies to `${{ }}` too.
- st-openapi: the OpenAPI `usedIn` list stops being a closed enum (it names the kinds in a description), so `set`, `call` and `input` need no schema edit in later cards.
- st-compat: full suite passes; the only existing test file changed is `tests/language/surfaces.test.ts` (logged amendment: hand-written `BLOCK_PAIRS` replaced by a table derived from the lexer; no row removed).

## Syntax settled

- `{{SET name = expression}}`: a single tag, no closer (ADR 0007). Keyword `SET` is upper case only, like every tag word (`{{set x = 1}}` stays an unknown tag). `END_SET` is not a keyword: `{{END_SET}}` is `Unknown template tag` (lexer).
- `name` is `[A-Za-z_][A-Za-z0-9_]*`. After the name comes one `=` (not `==`), then the expression, up to the closing braces (a trim marker `-` before them is a trim marker, as for every tag).
- `{{SET}}`, `{{SET x}}`, `{{SET x =}}`, `{{SET = 1}}`, `{{SET x == 1}}`, `{{SET 1x = 2}}` and `{{SET a.b = 1}}` are a `syntax-error` located at the tag (parse time, so `render`, `resolveTemplate`, `validate` and `analyze` report it even in a branch that never renders; the same in every mode). A name that starts with `@`, or that is the item name of a FOR whose BODY encloses the tag (a "live loop name"; the ELSE body of that FOR is outside it), is a `syntax-error` at the tag. `__proto__`, `constructor`, `toString`, `length` are ordinary names (scopes are Maps).
- `expression` is what may stand inside `${{ }}` (a path, arithmetic, `?? default`, `| filters`) with one addition valid only in SET: the first term may be a literal: quoted text (`"..."` or `'...'`), a number, `true`, `false` or `null`. A literal may be followed by `| filters` and by `?? default`; a number may start an arithmetic expression (`SET n = 2 * 3`, `SET t = 0.1 + 0.2`). Text inside the quotes is never reinterpreted (a `??`, `|`, `.`, `+` or `}` inside is plain text). `${{ }}` itself does not change: `${{"abc"}}` stays what it is today.
- The SET tag counts as one node toward `maxNodes` (located at the tag when crossed); it is not a block (no `maxDepth` effect, no `analyze().blocks` entry).
- SET is a child of any generic body: top level, IF/ELSEIF/ELSE branch, CASE clause (WHEN, DEFAULT), FOR body and ELSE body, LIST_ITEM content, SECTION and FENCE body, ROW and HEADER cells. It is NOT a child of the strict LIST and TABLE child lists (directly among LIST children or TABLE children, or among the children of a FOR or IF that builds items or rows): there it is the same located `syntax-error` as any other tag (`Unexpected token in LIST: SET` and its TABLE counterpart). Write SET before the LIST or TABLE, or inside an item or row.

## Value and scope

- One value evaluator: `${{ }}` and SET both call it (extract it from `visitVariable`; `visitVariable` keeps printing exactly what it prints today). It returns the value (`TemplateValue`), not its text. Math: in `render` the bound number is the number the output prints (`Number(formatNumber(result))`, so `SET t = 0.1 + 0.2` binds `0.3`, `${{t}}` prints `0.3` and `{{IF t == 0.3}}` is true); in `resolveTemplate` it is the plain result (`0.30000000000000004`), as `${{0.1 + 0.2}}` prints there today. A math expression keeps today's rules (no default or filter applied after math, `/0` and `%0` an error in `render` only, a malformed text is an error only when no variable has that name). The unprintable check that runs before a text filter stays in the evaluator, so `SET c = cyc | upper` (a cyclic value or BigInt) is the same `type-error` as `${{cyc | upper}}`, located at the SET. Binding a cyclic or BigInt value with no filter is fine; printing it later is the `type-error` it is today. An array, object, number or boolean is bound as it is (an array stays an array; `{{FOR list AS i}}` over it works).
- Missing data: strict mode, a missing variable in the expression is a `missing-variable` located at the SET (line and column of the tag, never 1:1). Lenient mode, a missing value binds `null`; reading the name later finds a bound name (no missing-variable) and prints empty; `SET x = missing ?? "d"` binds `"d"`.
- Errors of the expression (`type-error`, `missing-variable`, unknown filter, bad parameter, math errors) are the same code and message as in `${{ }}`, located at the SET tag.
- Scope: a SET binds in the innermost block's own frame; the root scope (the caller's data) is never written. Blocks (each its own frame, created when entered): the top level, an IF/ELSEIF/ELSE branch, a CASE clause (WHEN and DEFAULT), one FOR iteration (fresh each iteration; the ELSE body is its own block), a LIST_ITEM content, a SECTION body, a FENCE body, a ROW or HEADER (one frame per row). A name is visible from the tag to the end of its block, including blocks nested in it (a nested block can rebind; the rebinding ends with the nested block and the outer value is back). Before the tag the name reads whatever it read before (data, or missing). Rebinding in the same block overwrites. A SET value shadows a data name of the same name. `SET x = x + 1` reads the old `x` (data or an outer SET), then binds.
- A frame may be created only for a block whose direct children include a SET (cheap path for every other block): the observable rules above are the contract.
- SET outputs nothing (`""`); a SECTION whose body holds only SET renders as an empty body (omitted with skip_empty).
- Size (`st-size`): in the evaluator, after each filter (and, for a SET, on the final value), a string result longer than `limits.maxOutputChars` is a `LimitError` `limit-output`, located at the variable or the SET tag (`at(node, ...)`). Non-strings (arrays, objects, numbers) are not measured: no filter grows an array beyond its input. For `${{ }}` the check runs after each filter only (an unfiltered data string keeps the existing output check). DECIDED, accepted behavior change: a chain whose intermediate string is longer than the limit but shrinks later (`${{ long | upper | head=4 }}` with a data string longer than `maxOutputChars`) is now a `limit-output`; `compat-probe-base.json` records today's outputs (`longThenShrink`, `longFilterTail`).

## Lexer, whitespace, spec

- `core/src/lexer.ts`: the keyword table moves out of `getTokenType` into `export const KEYWORDS: Readonly<Record<string, TokenType>>` (every current entry plus `SET: TokenType.SET`; no `END_SET`), and the lookup is by own property only (`Object.prototype.hasOwnProperty.call`), so `{{constructor}}`, `{{toString}}`, `{{hasOwnProperty}}` are `Unknown template tag: {{constructor}}` etc. (at base they give `Unexpected token: function Object() ...`). `{{__proto__}}` keeps today's message (`Unknown template tag: {{__}}`; the keyword rule takes the upper-case-and-underscore prefix).
- `core/src/whitespace.ts`: `TokenType.SET` joins `STANDALONE_TAGS`; trim markers work as for every tag. A line holding only SET tags (and spaces) vanishes with its line break when `standaloneLines` is on; a SET with text on its line leaves that line (minus the tag), as for the other tags.
- `core/src/spec.ts`: `BLOCKS` gains `{ name: "SET", args: "name = expression", description: ... }` with no `closes`; the description says it binds a local for the rest of its block.
- `tests/language/surfaces.test.ts` (the one allowed amendment of an existing test, logged in `test_amendments` with approver "project lead"): `BLOCK_PAIRS` is derived from the exported `KEYWORDS`: for every keyword `K` that does not start with `END_`, the pair `[K, "END_K"]` when `END_K` is a keyword, else `[K, undefined]`. No row of today's table is removed (SET is added: `[SET, undefined]`), no assertion is weakened or removed, test names keep their form. The derived table makes a keyword added later without a `spec()` entry fail.

## Analyze

- `UsageKind` gains `"set"`. Variables read in the SET expression (the path, the root names of a math expression; a `??` default text is not a read) are recorded with kind `set`, optional when the expression has a `??` default (as `${{ }}` records them); filters in the expression count in `filters` and unknown or mis-parameterised ones give the same diagnostics as a variable. A literal-only expression reads nothing.
- The SET name is a local from the tag to the end of its block (same blocks as the interpreter); reads of that name after the tag (any kind) are not inputs; a read of the same name before the tag, or after its block, is an input. A FOR item name still scopes as today. The name set by SET is never itself recorded as read.
- `analyze().blocks` does not count SET; `spec().blocks` lists it (no `closes`).
- `api/openapi.json`: the `usedIn` array's items stay `type: string`, lose their `enum`, and gain a description naming the kinds (`output`, `if`, `elseif`, `case`, `for`, `list_item`, `table`, `set`, later `call` and `input`).

## Interface (files)

- `core/src/types.ts`: `TokenType.SET`; `SetNode { type: "Set"; name: string; ...the parsed expression }` (a literal-or-variable expression shape the evaluator takes: a `VariableNode`-like part plus an optional literal first term); add to the node unions the interpreter and analyzer switch on.
- `core/src/lexer.ts`, `core/src/whitespace.ts`, `core/src/spec.ts`, `core/src/analyze.ts`, `api/openapi.json` as above.
- `core/src/parser.ts`: `parseSet` through `open(TokenType.SET)` (counts a node), tracks the item names of the FOR bodies that enclose the tag.
- `core/src/interpreter.ts`: `evaluateValue` (the shared evaluator), `visitSet`, a block-scope helper; FOR creates a fresh frame per iteration for the body (the loop frame keeps item and `@` names).
- `core/src/scope.ts`: whatever the frames need (for example a way to open a child frame); scopes stay Maps.
- `core/src/expressions.ts` is not in scope (math and condition code are used as they are).

## Compatibility (probe the base before changing anything)

The previous cards' reviewers found breaks by running templates the old code accepted. `compat-probe-base.json` next to this file has today's `render` and `resolveTemplate` outputs for about 60 `${{ }}` and tag templates (strict and lenient, default limits and `maxOutputChars: 20`; keys `<name>[/lim20]/<strict|lenient>`) and their `analyze` result under `__analyze`, plus the block names of `spec()`. These must not change except as named: `{{constructor}}`, `{{toString}}`, `{{hasOwnProperty}}` (message), `{{SET ...}}` and `{{SET}}` (now a statement), and the intermediate-size case above. Examples to pin: `${{price + q | round=1}}` ignores the filter (today `0.3` render, `0.30000000000000004` resolve); `${{missing + 1}}` and `${{a + 1}}` are `missing-variable` in strict, empty in lenient; `${{cyc}}` is `type-error`; `${{o.constructor}}` is empty; `${{__proto__}}` and `${{constructor}}` are `missing-variable` strict, empty lenient; the text `SET x = 1` outside a tag is plain text.

## Non-goals

INPUT, DEFINE, CALL, partials, `@parent`, `AS k, v`; no accumulation (a SET never carries across FOR iterations); no `SET` of a path (`SET a.b = 1` is a `syntax-error`); no living document edits and no deltas (`docs_impact` none).
```

### card.md as of base 02e8dc84b503, read at 79dd65d571b4

```
# Bind block-scoped locals with SET

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Bind block-scoped locals with SET.

## Must-haves

- `contract` `st-set` literals, paths, arithmetic, `??` and filter chains bind the value (an array stays an array and `FOR` over it works); the same evaluator as `${{ }}` is used (one function, so `??`, math and filter errors are identical).
- `contract` `st-math` in `render`, arithmetic stores the same number the output would print (`SET t = 0.1 + 0.2` then `${{t}}` and `{{IF t == 0.3}}` agree); `resolveTemplate` keeps its plain number.
- `contract` `st-scope` visible from the tag to the end of the enclosing block (an IF branch, a CASE clause, a FOR body, a LIST item, a SECTION, a FENCE) and the top level; fresh each FOR iteration; shadows data of the same name; read before the tag it is data; rebinding a SET name in the same or an inner block is allowed and ends with its block.
- `contract` `st-null` in lenient mode a missing value binds `null` (reading it later is not a missing-variable error and prints empty); in strict mode a missing variable in the expression is a located `missing-variable` at the SET.
- `contract` `st-names` a name starting with `@`, a live loop name or an invalid identifier is a `syntax-error` at the tag (L4 adds the macro parameter case); `SET __proto__ = 1`, `constructor` and `toString` are ordinary names (scopes are Maps).
- `contract` `st-single` `{{SET}}`, `{{SET x}}`, `{{SET = 1}}` are a `syntax-error`; `{{END_SET}}` is an unknown tag (ADR 0003, ADR 0007).
- `contract` `st-ws` SET joins the standalone set (a line holding only SET tags vanishes) and takes trim markers; it outputs nothing.
- `contract` `st-analyze` the SET name is a local from the tag on, never an input; variables read in the expression are usage kind `set`; a read of the same name before the SET is an input.
- `contract` `st-keywords` lexer keywords are looked up by own property only (`{{constructor}}` is "Unknown template tag"); the lexer exports its keyword table and `tests/language/surfaces.test.ts` derives its block list and `closes` entries from it (an `END_<K>` entry means `K` closes with it), so a keyword added later without a spec() entry fails; `spec().blocks` lists SET with no `closes`.
- `contract` `st-size` in the one shared value evaluator, a filter result or SET value whose text is longer than `maxOutputChars` is a located `limit-output` at the variable or SET, so a chain such as `SET a = a | json` repeated cannot double a value without bound; applies to `${{ }}` too.
- `contract` `st-openapi` the OpenAPI `usedIn` list stops being a closed enum (it names the kinds in a description), so `set`, `call` and `input` need no schema edit in later cards.
- `contract` `st-compat` full suite passes; the only existing test file changed is `tests/language/surfaces.test.ts` (logged amendment: hand-written `BLOCK_PAIRS` replaced by a table derived from the lexer; no row removed).

## Acceptance criteria

- st-set: literals, paths, arithmetic, `??` and filter chains bind the value (an array stays an array and `FOR` over it works); the same evaluator as `${{ }}` is used (one function, so `??`, math and filter errors are identical).
- st-math: in `render`, arithmetic stores the same number the output would print (`SET t = 0.1 + 0.2` then `${{t}}` and `{{IF t == 0.3}}` agree); `resolveTemplate` keeps its plain number.
- st-scope: visible from the tag to the end of the enclosing block (an IF branch, a CASE clause, a FOR body, a LIST item, a SECTION, a FENCE) and the top level; fresh each FOR iteration; shadows data of the same name; read before the tag it is data; rebinding a SET name in the same or an inner block is allowed and ends with its block.
- st-null: in lenient mode a missing value binds `null` (reading it later is not a missing-variable error and prints empty); in strict mode a missing variable in the expression is a located `missing-variable` at the SET.
- st-names: a name starting with `@`, a live loop name or an invalid identifier is a `syntax-error` at the tag (L4 adds the macro parameter case); `SET __proto__ = 1`, `constructor` and `toString` are ordinary names (scopes are Maps).
- st-single: `{{SET}}`, `{{SET x}}`, `{{SET = 1}}` are a `syntax-error`; `{{END_SET}}` is an unknown tag (ADR 0003, ADR 0007).
- st-ws: SET joins the standalone set (a line holding only SET tags vanishes) and takes trim markers; it outputs nothing.
- st-analyze: the SET name is a local from the tag on, never an input; variables read in the expression are usage kind `set`; a read of the same name before the SET is an input.
- st-keywords: lexer keywords are looked up by own property only (`{{constructor}}` is "Unknown template tag"); the lexer exports its keyword table and `tests/language/surfaces.test.ts` derives its block list and `closes` entries from it (an `END_<K>` entry means `K` closes with it), so a keyword added later without a spec() entry fails; `spec().blocks` lists SET with no `closes`.
- st-size: in the one shared value evaluator, a filter result or SET value whose text is longer than `maxOutputChars` is a located `limit-output` at the variable or SET, so a chain such as `SET a = a | json` repeated cannot double a value without bound; applies to `${{ }}` too.
- st-openapi: the OpenAPI `usedIn` list stops being a closed enum (it names the kinds in a description), so `set`, `call` and `input` need no schema edit in later cards.
- st-compat: full suite passes; the only existing test file changed is `tests/language/surfaces.test.ts` (logged amendment: hand-written `BLOCK_PAIRS` replaced by a table derived from the lexer; no row removed).

## Must-nots

- change any existing test expectation other than the one named amendment (if any)
- add a runtime dependency
- evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- let an unknown name or bad argument pass in lenient mode (ADR 0003)

## Context links

- [Language contract](../../../../../../living/architecture/language-contract.md)
- [Unknown names are errors (ADR 0003)](../../../../../../living/decisions/adr/0003-unknown-names-are-always-errors.md)

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter, or the root README.md), or give user_docs_waiver, one line with the reason none changes. A card that changes only documents needs nothing, and the root README.md counts as user facing without a tag. If no user can see it, write `none`. -->

## Interface contract

See the plan section for this card in docs/ephemeral/research/language-2-plan.md (syntax settled here, files, risks); the criteria above are the contract.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/language/set.test.ts` | add | api, template-resolver |
| `api/openapi.json` | edit | api, template-resolver |
| `core/src/analyze.ts` | edit | api, template-resolver |
| `core/src/interpreter.ts` | edit | api, template-resolver |
| `core/src/lexer.ts` | edit | api, template-resolver |
| `core/src/parser.ts` | edit | api, template-resolver |
| `core/src/spec.ts` | edit | api, template-resolver |
| `core/src/types.ts` | edit | api, template-resolver |
| `core/src/whitespace.ts` | edit | api, template-resolver |

Files scope: `api/openapi.json`, `core/src/analyze.ts`, `core/src/interpreter.ts`, `core/src/lexer.ts`, `core/src/parser.ts`, `core/src/scope.ts`, `core/src/spec.ts`, `core/src/types.ts`, `core/src/whitespace.ts`, `tests/golden/render-cases/lang-set/data.json`, `tests/golden/render-cases/lang-set/expected.md`, `tests/golden/render-cases/lang-set/options.json`, `tests/golden/render-cases/lang-set/template.md`, `tests/language/set.test.ts`, `tests/language/surfaces.test.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: `tests/language/set.test.ts`
- remove: none
- edit: `api/openapi.json`, `core/src/analyze.ts`, `core/src/interpreter.ts`, `core/src/lexer.ts`, `core/src/parser.ts`, `core/src/spec.ts`, `core/src/types.ts`, `core/src/whitespace.ts`
- files_scope: `api/openapi.json`, `core/src/analyze.ts`, `core/src/interpreter.ts`, `core/src/lexer.ts`, `core/src/parser.ts`, `core/src/scope.ts`, `core/src/spec.ts`, `core/src/types.ts`, `core/src/whitespace.ts`, `tests/golden/render-cases/lang-set/data.json`, `tests/golden/render-cases/lang-set/expected.md`, `tests/golden/render-cases/lang-set/options.json`, `tests/golden/render-cases/lang-set/template.md`, `tests/language/set.test.ts`, `tests/language/surfaces.test.ts`

## 2. Your verification plan

Before you read section 3, write `verification_plan`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.

## 3. Design context

### docs/living/architecture/language-contract.md

```
---
summary: "Template language contract: 23 filters, math errors, condition operators, CASE matchers, the node limit and the surfaces that must agree"
state: built
---

# Language contract

<!-- Fill the summary with one sentence a reader can use to decide whether to open this document. State starts as planned; it becomes built when the work ships and validated only after a close review. -->

## Purpose

<!-- What this document is for and who reads it. Link to related documents, never copy them. Add the sections this kind of document needs below. -->

The contract for the template language beyond the prompt-aware constructs: the filter registry and its filters, math and output errors, condition operators, CASE matchers and the node limit. SET, INPUT, CALL, macros and partials are not built yet; [ADR 0007](../decisions/adr/0007-statement-tags-without-a-body.md) records that SET, INPUT and CALL will be single tags. Settled decisions apply: [ADR 0001](../decisions/adr/0001-house-style-for-every-block.md) (paired blocks), [ADR 0003](../decisions/adr/0003-unknown-names-are-always-errors.md) (unknown names are errors in every mode). Companion: [prompt-aware-contract.md](prompt-aware-contract.md).

## Filters

- **One registry.** Every filter is one definition in one table: `name`, `params` (the signature text spec() shows), `description`, `paramNames` (the named parameters it accepts; the shorthand `name=value` is the parameter `value`) and `apply(input, params)`. render, `spec()`, `analyze` and `validate` read this table and nothing else; a filter added to it is accepted by all four. `spec()` shows only `name`, `params` and `description`.
- **Groups.** The six core filters (`head`, `tail`, `trim`, `escape_md`, `fence`, `heading_offset`) live in `filters.ts`; the eight text filters are in `filters-text.ts` and the nine collection filters in `filters-collection.ts`, which the registry includes: 23 filters in all.
- **Values.** A filter receives the resolved value and returns a value; the text printed is the output step's text form of the final value. The existing filters coerce their input to text exactly as the output step does, so no existing output changes.
- **Arguments.** A filter call is written `name`, `name=value` or `name:key=value,key=value`. It is parsed once at parse time, respecting quotes: `fence="a=b"` and `fence="a:b"` keep the whole value. A parameter name the filter does not declare (`escape_md:mode=block`) is a `type-error` located at the variable (ADR 0003), in every mode.
- **Defaults.** A quote in a `??` default opens only when a value starts with it and closes; an unterminated quote is plain text and never hides the filters after it.
- **Static checks.** `validate` and `analyze` report an undeclared parameter as a `type-error` at the variable, the same code, position and wording as `render`.
- **Known gap.** `FILTERS` (exported for compatibility) is a snapshot of the registry names taken at load; code that needs the live list reads `FILTER_REGISTRY` or `spec()`.

### Text filters

Group in `filters-text.ts`. Each coerces its input to text as the output step prints it, except `default`. A missing or invalid parameter value is a `type-error` at the variable in every mode; `validate` and `analyze` run without data, so they check names and undeclared parameters, and a bad value shows at render. The shorthand `name=value` is the parameter `value`.

| Filter | Result |
|---|---|
| `upper`, `lower` | the text in upper or lower case; no parameter |
| `title` | the first letter of each whitespace-separated word in upper case, the rest in lower case; no parameter |
| `replace:find="a",with="b"` | every non-overlapping occurrence of the literal `find` (required, non-empty) replaced by `with` (default empty text); never read as a pattern |
| `indent[=N]` | N spaces (whole number 0 to 100, default 2) before every line that has characters; line breaks are kept |
| `quote` | the text as a JSON double-quoted string; no parameter |
| `round[=N]` | a number rounded half away from zero to exactly N decimals (whole number 0 to 20, default 0), computed on its digits so `1.005` with `round=2` gives `1.01`; text that is not a finite number, or has an exponent beyond 400 (`1e400`), is left as it is |
| `default="x"` | `x` (required) when the raw value is not truthy by the language rule: missing, null, empty or whitespace-only text, the texts `0`, `false` and `no` in any letter case, the number 0, false, an empty list or an empty object; else the value. `??` keeps its own rule |

In strict mode a missing variable is reported before `default` runs, so `default` replaces missing data in lenient mode only.

### Collection filters

Nine filters in `filters-collection.ts` (`COLLECTION_FILTERS`), in this order: `join=SEP`, `length`, `first`, `last`, `sort[=key]`, `unique`, `slice[:start=N,end=N]`, `lines`, `json`.

- **Input.** `join first last sort unique slice` coerce their input as FOR does: an array passes through, a text such as `"a,b,c"` or `'["x","y"]'` becomes a list, a number or boolean a one-item list, null or a missing value the empty list. An object given to one of them is a `type-error`. No filter changes its input.
- **Output.** A filter returns a value: `join`, `json` a text; `length` a number; `first`, `last` an item (null when the list is empty); `sort`, `unique`, `slice`, `lines` a list, which the output step prints as compact JSON and the next filter receives as a list.
- **join.** `join=SEP` needs its separator (`join=""` is allowed); items print as the output step prints them.
- **length.** Items of a list, UTF-16 code units of a text (not split into items, so one emoji counts 2), keys of an object, characters of a number or boolean's text form; 0 for null or missing.
- **slice.** `Array.prototype.slice` semantics (negative counts from the end); each given bound is an integer, else a `type-error`.
- **lines.** The text form split on `\r\n`, `\r` or `\n`; one trailing line break adds no empty item.
- **sort.** Stable and deterministic: numbers numeric, then strings by code unit (so `"10"` before `"9"`), then every other value in its original order. `sort=key` orders object items by that property with the same rule; items without it come last.
- **unique.** Keeps the first occurrence; two values are equal when they have the same type and value (`1` and `"1"` differ), objects and arrays by their `json` text.
- **json.** Compact JSON with object keys sorted by code unit at every depth; null and missing give `null`; a cyclic value is a `type-error`, a shared non-cyclic reference is not.
- **Errors.** A parameter a collection filter does not declare is a located `type-error` in every mode, as for every filter.

## Math and output errors

- **Zero.** In `render`, `/` or `%` with a zero divisor (also `0 / 0` and a divisor computed to zero) is a `type-error` located at the variable, in every mode. `resolveTemplate` keeps its old output (`Infinity`, `NaN`): this is a render-only divergence, as `standaloneLines` is.
- **Float printing.** In `render`, an arithmetic result prints with at most 15 significant digits (`0.1 + 0.2` prints `0.3`; `1 / 3` prints `0.333333333333333`; integers of any size and negative numbers print unchanged). `resolveTemplate` prints the plain number, so `0.1 + 0.2` stays `0.30000000000000004` there.
- **Hyphens in names.** A hyphen with an ASCII letter on both sides is part of one name (`first-name`, `user.first-name`, `a-b + 1` reads the key `a-b`); `a - b`, `a -b`, `n-1`, `x1-y` and `1-a` are arithmetic. A missing hyphenated name in strict mode is a `missing-variable` error whose suggestion shows the spaced form. `analyze` lists a hyphenated name as one variable. Applies in `render` and `resolveTemplate`.
- **Malformed math.** A malformed expression, whatever the data holds (so `total * ` errors whether or not `total` exists) (`(1 + 2`, `1 +`, `1 + * 2`, `2 $ 3`) is a located `type-error` in lenient mode too, instead of empty output. A well-formed expression that names a missing or non-numeric variable stays missing data: empty in lenient mode. The error never replaces an existing key, and a missing name with an odd character (`a:b`, `Order #`) is plain missing data, not math. Applies in both entry points.
- **Unprintable output.** A value with no text form (a cyclic object or array, a BigInt) used as output, as a CASE subject or before a filter that turns its input into text (every filter except `default` and the collection filters that keep a value: `length first last sort unique slice json`, so `xs | length` still counts, while `lines` and `join` check) is a `type-error` located at the variable or CASE node, in every mode; `null` and missing still print as empty. Applies in both entry points.

## Condition operators

Conditions are the same in `render` and `resolveTemplate`. Strict mode governs missing data only, and a condition never raises a missing-variable error (a missing name reads as null). Every error is a `type-error` located at the IF, ELSEIF or LIST_ITEM; a cyclic value or a BigInt as an operand is a located error or a normal result, never a raw exception.

- **in, not in.** `x in ["a", y, 3]`, `x in list_var`, `x in "text"`; the words are case-insensitive. A list literal holds operands (literals or variable paths) separated by commas outside quotes; `[]` is empty, while an empty item, a nested `[` or a missing `]` is an error. Against an array, true when an element equals x by the equality rule below (array, object and BigInt elements never match); against a text (quoted or from a variable), a case-sensitive substring test, so an empty x is contained and a text holding JSON is still only a text. A left side that is an array, an object (cyclic or not) or a BigInt is a `type-error` first, whatever the right side holds, a missing one included. Then a missing or null x, or a missing or null right side, gives false (`not in`: true). A right side that is a number, a boolean or an object is a `type-error`. `not in` is exactly the negation of `in`.
- **between.** `x between [lo, hi]`: exactly two operands, each a number or numeric text (a boolean, `true` or `false`, is not numeric here, though `>` still reads it as 1 or 0); inclusive at both ends; `lo` above `hi` is false. A non-numeric or missing operand, a list that is not two items and a right side that is not a list literal are a `type-error`. There is no `not between`.
- **Logic.** `AND`, `OR` and `NOT` are read in any letter case; `&&`, `||` and `!` are spellings of the same three (`NOT x`, `NOT (x)` and `!x` negate), and parentheses group. `spec().operators` lists `AND`, `OR` and `NOT` only.
- **Precedence.** `in`, `not in` and `between` split at the tier of `contains`: after AND, OR, NOT and the comparison operators, before type checks, outside quotes, brackets and parentheses, so `NOT x in [..]`, `a in [..] AND b` and `(a) OR (b between [1, 2])` need no extra rule. Chaining two operators (`a in b == c`) is an error. An operator word inside quotes never splits.
- **.length.** A path segment `length` after any value: an array gives its element count; a text gives its UTF-16 code units (as the `length` filter does, so one emoji is 2) unless it is a JSON object text with its own key `length`; an object with its own key `length` returns that key's value, null included. Any other value, and any missing data, stays null (no zero). Works in conditions, output, math, CASE subjects and after other segments (`user.tags.length`, `items.0.length`); a root variable named `length` is an ordinary variable.
- **Equality.** `==` and `!=`: when either side is a quoted literal both sides compare as text (`z == "01234"` is false for 1234, `"1.0" == 1` is false); otherwise numbers compare numerically and anything else as text, as before. `in` list items follow the same rule. For `contains`, `startsWith` and `endsWith` an unquoted number on the right keeps its written text (`x contains 1.50`, `007`).
- **Unknown words.** An operand that is not a literal, not a variable key and holds whitespace outside quotes (`a == b c`, `a like b`, `a matches /x/`) is an "Unrecognized condition" error in every mode, also in a branch that AND or OR would skip; `matches` is not an operator and no pattern in a template is ever compiled.
- **spec and analyze.** `spec().operators` lists `in`, `not in`, `between` and `.length` after the existing operators. `analyze` records the variables in the left side, the list items or right side, the bounds and the root of a `.length` path (path text as written); a malformed condition is an `unrecognized-condition` diagnostic.

## CASE matchers

`{{CASE subject}}` renders the first `{{WHEN ...}}` that matches, else `{{DEFAULT}}`. The text after `WHEN` is one of two forms, the same in `render` and `resolveTemplate`; tag words are upper case.

- **List.** One or more matchers separated by commas outside quotes (`{{WHEN "a", "b"}}`, `{{WHEN "a", other, 3}}`; spaces around commas are free). A matcher is a quoted text (`"a"` or `'a'`, a comma inside quotes belongs to the text, no unescaping; a quote followed by a comma or the end closes the text even after a backslash, so `'C:'` is the text `C:`), a number (`5`, `-2`, `1.50`), `true`, `false`, `null` (empty text) or a variable path (`other`, `user.plan`, `first-name`, `café`; segments separated by dots, a name starts with a letter, `_` or `@`, and a hyphen joins a name only between two ASCII letters, so `limit-1`, `a-` and `a--b` are not names). The WHEN matches when any matcher matches.
- **Comparison.** An operator `==`, `!=`, `>`, `<`, `>=` or `<=` and exactly one matcher (`{{WHEN >= 10}}`, `{{WHEN != other}}`).
- **Matching.** The subject and every matcher become text the way the subject always did (missing and null are empty text, lists and objects are JSON, a cyclic value or a BigInt is the located `type-error`). A variable matcher is read with the subject's own lookup: a missing name is a located `missing-variable` error in strict mode and empty text in lenient mode. Equality is the one rule of the operators above: when either side is a quoted text both compare as text (`WHEN "1"` does not match `1.0`), otherwise numeric texts compare as numbers (`WHEN 1` matches `1.0` and `"01"`) and anything else as text; a variable counts as unquoted. `!=` negates `==`. `>`, `<`, `>=` and `<=` compare numbers like the same operators in conditions; a side that is not numeric, empty text for a missing or null value included, is a `type-error`, never false. A runtime error in a matcher is located at its WHEN; the old single form `{{WHEN "x"}}` matches as before, `{{WHEN ""}}` matching a missing or null subject.
- **Errors.** At parse, in every mode and entry point: nothing after `WHEN`, an empty list item (`"a",`), an unterminated quote, a matcher that is neither a literal nor a variable path (`a b`, `"a" "b"`, `1abc`, `limit-1`, `a@b`), and a comparison with no matcher, with several (`>= 1, 2`) or after a list item (`"a", > 5`) are a `syntax-error` located at the WHEN tag, even in a branch that never renders.
- **spec and analyze.** `spec()` lists the WHEN arguments as `value[, value...] | variable | operator value`. `analyze` records every variable path of a WHEN (list or comparison) as `case` usage, not optional, with the subject's own rules (loop names and `@` names excluded, literals never recorded).

## Node limit

- **maxNodes.** `Limits.maxNodes` (default 20000, `DEFAULT_LIMITS`) bounds the size of a template, partials excluded because none exist yet. The parser counts every node it builds except the program root, parent before children, at the node's opening token; node `maxNodes + 1` is a `limit-nodes` error located at that token, with the suggestion "Shorten the template or raise limits.maxNodes". It is raised in `render`, `validate`, `analyze` and `resolveTemplate`, in every mode, before any output is produced.
- **Long chains.** An ELSEIF chain is parsed, run and analyzed in loops, so a very long chain ends in a result or in `limit-nodes`, never in a stack overflow.
- **Surfaces.** The CLI takes `--max-nodes n` (it can raise as well as lower), the HTTP API takes `options.limits.maxNodes` (it can only lower the server's value; `validate` and `analyze` use the server's), the OpenAPI document lists it in its Limits schema, and `spec().limits` reports it. `analyze` applies the caller's limits, else the defaults.

## Surfaces that agree

- **One source each.** `spec().blocks` lists every opening keyword the lexer accepts with its `END_` keyword as `closes` (`ELSEIF` and `ELSE` have none); `spec().filters` is the registry; `spec().operators` lists the operators of the conditions: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty`, `isArray`, `isNumber`, `isObject`, `isBoolean`, `AND`, `OR`, `NOT`, `in`, `not in`, `between` and `.length`.
- **A test keeps them in step.** `tests/language/surfaces.test.ts` fails when a lexer keyword, a registry filter or an evaluator operator is not in `spec()`, when `spec()` lists a block or filter the lexer or registry lacks, or when the README lacks a filter, an operator, a limit key, `--max-nodes`, `limit-nodes` or the showcase template of the golden case `tests/golden/render-cases/lang-filters-showcase/`.
- **The README.** It documents each filter, operator, limit option and WHEN form with examples that were run; the showcase example is the golden case's template, so it renders as shown.
```

### docs/living/decisions/adr/0003-unknown-names-are-always-errors.md

```
---
summary: Unknown filters and unknown identifiers are always errors; strict mode only governs missing data.
type: adr
domain: language
status: accepted
date: 2026-10-13
state: built
---

# Unknown names are always errors, strict mode governs missing data

**Context.** Unknown filters throw today but unknown identifiers followed by operators silently evaluate false, and strict mode mixes missing data with misspelled names.

**Decision.** A filter, operator or identifier that the language does not define is a syntax-level error in every mode. Strict mode decides only what happens when a defined variable has no value in the data.

**Alternatives.** Report unknown names as errors in strict mode only; rejected because a typo then passes silently in the default mode.

**Consequences.** Typos are caught before a run by validate and analyze. Missing data stays tolerant by default.
```

### core/src/interpreter.ts

```
import {
  ProgramNode,
  ASTNode,
  TextNode,
  VariableNode,
  IfNode,
  CaseNode,
  ForNode,
  ListNode,
  ListItemNode,
  TableNode,
  TableChild,
  TableRowNode,
  TernaryNode,
  SectionNode,
  FenceNode,
  VariableLookup,
  ForWindowArg,
  TemplateValue,
  Limits,
  withDefaultLimits,
} from "./types";
import {
  TypeError,
  MissingVariableError,
  MathSyntaxError,
  LimitError,
  locateError,
} from "./errors";
import {
  tryCoerceToArray,
  tryCoerceToString,
  tryCoerceStringForPathSegment,
} from "./coercion";
import {
  builtInLength,
  DivisionByZeroError,
  evaluateCondition,
  evaluateMathExpression,
  evaluateWhen,
  formatNumber,
  hasStrayCharacter,
  isMathExpression,
  isTruthy,
  subtractionHint,
} from "./expressions";
import { applyFilters, fenced, checkFenceLang, valueToText } from "./filters";
import { COLLECTION_FILTERS } from "./filters-collection";
import { Frame, RootScope, readOwn } from "./scope";

/** Filters that take any value as it is, so they run before the unprintable check */
const KEEPS_RAW_INPUT = new Set([
  ...COLLECTION_FILTERS.map((filter) => filter.name).filter(
    (name) => name !== "lines" && name !== "join"
  ),
  "default",
]);

/**
 * Interpreter: Walks AST and produces output string
 *
 * Features:
 * - Variable substitution with safe nested access
 * - Math expressions in variables
 * - Conditional rendering (IF/ELSE/ELSEIF)
 * - CASE/WHEN/DEFAULT blocks
 * - FOR loops with special variables (@index0, @first, @last, etc.)
 * - Lists (numbered, nested)
 * - Tables (with/without headers, alignment)
 * - Code fences sized to their content (FENCE)
 * - Filters (head, tail, trim, escape_md, fence, heading_offset)
 * - Default operator (??)
 * - Ternary with variable references
 */
export class Interpreter {
  private strictMode: boolean;
  private limits: Limits;
  private render: boolean;
  private iterations = 0;
  private omittedSections = 0;
  private readonly root: RootScope;
  /** The innermost scope: a loop frame while a loop renders, else the root */
  private scope: VariableLookup;

  constructor(
    variables: VariableLookup,
    options?: { strictMode?: boolean; limits?: Partial<Limits>; render?: boolean }
  ) {
    this.strictMode = options?.strictMode ?? true;
    this.render = options?.render ?? false;
    this.limits = withDefaultLimits(options?.limits);
    this.root = new RootScope(variables);
    this.scope = this.root;
  }

  /**
   * FOR iterations run by the latest interpret call
   */
  get iterationCount(): number {
    return this.iterations;
  }

  /**
   * Sections dropped for an empty body by the latest interpret call
   */
  get sectionsOmitted(): number {
    return this.omittedSections;
  }

  /**
   * Main interpretation entry point
   */
  interpret(ast: ProgramNode): string {
    this.iterations = 0;
    this.omittedSections = 0;
    this.scope = this.root;
    return this.visitProgram(ast);
  }

  /**
   * Visit program node (root)
   */
  private visitProgram(node: ProgramNode): string {
    const parts: string[] = [];
    let length = 0;
    for (const child of node.body) {
      const output = this.visit(child);
      length += output.length;
      this.checkOutputLength(length, child);
      parts.push(output);
    }
    return parts.join("");
  }

  /**
   * Run a node's own evaluation, locating any error it throws at the node
   */
  private at<T>(node: ASTNode, evaluate: () => T): T {
    try {
      return evaluate();
    } catch (error) {
      throw locateError(error, node.line, node.column);
    }
  }

  private countIteration(node: ForNode): void {
    this.iterations++;
    if (this.iterations > this.limits.maxIterations) {
      throw new LimitError(
        "limit-iterations",
        `Loops ran more than ${this.limits.maxIterations} iterations in total`,
        node.line,
        node.column,
        "Iterate over less data or raise limits.maxIterations"
      );
    }
  }

  private checkOutputLength(length: number, node: ASTNode): void {
    if (length > this.limits.maxOutputChars) {
      throw new LimitError(
        "limit-output",
        `Output is longer than ${this.limits.maxOutputChars} characters`,
        node.line,
        node.column,
        "Render less content or raise limits.maxOutputChars"
      );
    }
  }

  /**
   * Visit dispatcher
   */
  private visit(node: ASTNode): string {
    switch (node.type) {
      case "Text":
        return this.visitText(node as TextNode);
      case "Variable":
        return this.at(node, () => this.visitVariable(node as VariableNode));
      case "If":
        return this.visitIf(node as IfNode);
      case "Case":
        return this.visitCase(node as CaseNode);
      case "For":
        return this.visitFor(node as ForNode);
      case "List":
        return this.visitList(node as ListNode);
      case "Table":
        return this.visitTable(node as TableNode);
      case "Section":
        return this.visitSection(node as SectionNode);
      case "Fence":
        return this.visitFence(node as FenceNode);
      case "Ternary":
        return this.at(node, () => this.visitTernary(node as TernaryNode));
      case "Comment":
        return ""; // Comments excluded from output
      default:
        return "";
    }
  }

  /**
   * Visit text node (pass through)
   */
  private visitText(node: TextNode): string {
    return node.content;
  }

  /**
   * Visit variable node: ${{name}}, ${{user.name | filter}}, ${{a + b}}
   */
  private visitVariable(node: VariableNode): string {
    // Check if this is a math expression (contains operators)
    const pathStr = node.path.join(".");
    let mathError: unknown = null;
    if (isMathExpression(pathStr) || hasStrayCharacter(pathStr)) {
      try {
        const result = evaluateMathExpression(pathStr, this.scope, {
          zeroIsError: this.render,
        });
        return this.render ? formatNumber(result) : String(result);
      } catch (error) {
        if (error instanceof DivisionByZeroError) throw error;
        // Not a valid math expression, continue with normal resolution
        mathError = error;
      }
    }

    const allowUndefined = node.defaultValue !== undefined;
    let value: TemplateValue = null;
    let lookupError: unknown = null;
    try {
      value = this.resolveNestedPath(node.path, allowUndefined);
    } catch (error) {
      lookupError = error;
    }
    // A malformed math text is an error only when no variable has that name
    if (mathError instanceof MathSyntaxError && !this.hasRootKey(node.path[0])) {
      throw mathError;
    }
    if (lookupError !== null) throw lookupError;

    // Apply default operator if value is falsy
    if (node.defaultValue !== undefined && !isTruthy(value)) {
      value = node.defaultValue;
    }

    // Apply filters
    if (node.filters && node.filters.length > 0) {
      for (const filter of node.filters) {
        // text filters would turn an unprintable value into ""
        if (!KEEPS_RAW_INPUT.has(filter.name)) this.valueToString(value);
        value = applyFilters(value, [filter]) as TemplateValue;
      }
    }

    return this.valueToString(value);
  }

  /**
   * Visit IF node
   */
  private visitIf(node: IfNode): string {
    return this.visitBody(this.selectBranch(node));
  }

  /**
   * The body an IF chain runs: the first branch whose condition holds, else
   * the ELSE body, else nothing
   */
  private selectBranch(node: IfNode): ASTNode[] {
    let branch = node;
    for (;;) {
      const current = branch;
      const result = this.at(current, () =>
        evaluateCondition(current.condition, this.scope)
      );
      if (result) return current.consequent;

      const { alternate } = current;
      if (!alternate) return [];
      if (Array.isArray(alternate)) return alternate;
      branch = alternate;
    }
  }

  private visitBody(nodes: ASTNode[]): string {
    return nodes.map((child) => this.visit(child)).join("");
  }

  /**
   * Visit CASE node
   */
  private visitCase(node: CaseNode): string {
    const valueStr = this.at(node, () =>
      this.valueToString(this.resolveNestedPath(node.expression.split(".")))
    );

    // Check WHEN clauses
    for (const whenNode of node.cases) {
      const matches = this.at(whenNode, () =>
        evaluateWhen(whenNode.match, valueStr, (path) =>
          this.valueToString(this.resolveNestedPath(path))
        )
      );
      if (matches) {
        return whenNode.body.map((child) => this.visit(child)).join("");
      }
    }

    // Fall to DEFAULT
    if (node.default) {
      return node.default.body.map((child) => this.visit(child)).join("");
    }

    return "";
  }

  /**
   * Visit FOR loop
   */
  private visitFor(node: ForNode): string {
    const results: string[] = [];
    this.runLoop(node, false, (nodes) => {
      const output = this.visitBody(nodes);
      results.push(output);
      return output.length;
    });
    return results.join("");
  }

  /**
   * The one loop runner behind FOR and the rows a TABLE builds with FOR.
   * renderBranch renders a body (the loop body per item, then the ELSE body
   * when no item rendered) and returns the characters it added.
   * A TABLE keeps its legacy rule: a non-iterable value is no rows, no error.
   */
  private runLoop(
    node: ForNode,
    silentNonIterable: boolean,
    renderBranch: (nodes: ASTNode[]) => number
  ): void {
    const iterable = this.at(node, () => this.resolveNestedPath(node.iterable));
    const array = tryCoerceToArray(iterable);
    if (array === null && this.strictMode && !silentNonIterable) {
      throw new TypeError(
        `Cannot iterate over non-array value: ${describeValue(iterable)}`,
        node.line,
        node.column,
        "Ensure the value is an array or can be coerced to one"
      );
    }

    const limit = this.at(node, () => this.readWindow(node.limit, "limit"));
    const offset = this.at(node, () => this.readWindow(node.offset, "offset"));
    const start = offset ?? 0;
    const items = array
      ? array.slice(start, limit === undefined ? undefined : start + limit)
      : [];

    let length = 0;
    if (items.length > 0) {
      const outer = this.scope;
      const frame = new Frame(outer);
      this.scope = frame;
      try {
        for (let i = 0; i < items.length; i++) {
          this.countIteration(node);
          frame.set(node.itemName, items[i]);
          frame.set("@index0", i);
          frame.set("@index1", i + 1);
          frame.set("@first", i === 0);
          frame.set("@last", i === items.length - 1);
          frame.set("@notFirst", i !== 0);
          frame.set("@notLast", i !== items.length - 1);
          frame.set("@total", items.length);

          length += renderBranch(node.body);
          this.checkOutputLength(length, node);
        }
      } finally {
        this.scope = outer;
      }
    } else if (node.elseBody) {
      length += renderBranch(node.elseBody);
      this.checkOutputLength(length, node);
    }
  }

  /**
   * Read a limit or offset: a number or a variable path read in the scope
   * outside the loop. A missing value is an error in strict mode and an
   * ignored argument in lenient mode; undefined means no such argument.
   */
  private readWindow(
    arg: ForWindowArg | undefined,
    name: "limit" | "offset"
  ): number | undefined {
    if (!arg) return undefined;
    let value: TemplateValue;
    if (arg.kind === "literal") {
      value = arg.value;
    } else {
      value = this.resolveNestedPath(arg.path, true);
      if (value == null) {
        if (!this.strictMode) return undefined;
        throw new MissingVariableError(
          arg.path.join("."),
          1,
          1,
          this.root.names(),
          subtractionHint(arg.path[0])
        );
      }
    }

    const number = windowNumber(value);
    if (number === null) {
      throw new TypeError(
        `${name} must be a whole number of 0 or more, got ${describeValue(value)}`,
        1,
        1,
        `Give ${name}= a whole number or a variable that holds one`
      );
    }
    return number;
  }

  /**
   * Visit SECTION: the heading, a blank line and the body without its
   * leading and trailing blank lines; nothing when the body is blank and
   * skipEmpty is set
   */
  private visitSection(node: SectionNode): string {
    const title = this.at(node, () => this.sectionTitle(node));
    const heading = `${"#".repeat(node.level)} ${title}\n`;
    const body = node.body
      .map((child) => this.visit(child))
      .join("")
      .replace(/\r\n/g, "\n");

    if (body.trim() === "") {
      if (!node.skipEmpty) return heading;
      this.omittedSections++;
      return "";
    }
    const trimmed = body
      .replace(/^([ \t]*\n)+/, "")
      .replace(/(\n[ \t]*)+$/, "");
    return `${heading}\n${trimmed}\n`;
  }

  private sectionTitle(node: SectionNode): string {
    if (node.title.kind === "literal") return node.title.text;
    const value = this.resolveNestedPath(node.title.path);
    if (typeof value !== "string" || value === "") {
      throw new TypeError(
        `SECTION title must be a non-empty string, got ${describeValue(value)}`,
        node.line,
        node.column,
        "Map the title variable to a non-empty string"
      );
    }
    return value;
  }

  /**
   * Visit FENCE: the rendered body in a code fence sized to it
   */
  private visitFence(node: FenceNode): string {
    const lang = this.at(node, () => {
      const value = this.fenceLang(node);
      checkFenceLang(value);
      return value;
    });
    const body = node.body.map((child) => this.visit(child)).join("");
    return fenced(body, lang);
  }

  /**
   * The FENCE language; a missing, null or empty value gives a bare fence
   */
  private fenceLang(node: FenceNode): string {
    if (node.lang === null) return "";
    if (node.lang.kind === "literal") return node.lang.text;
    const value = this.resolveNestedPath(node.lang.path, true);
    if (value == null) return "";
    if (typeof value !== "string") {
      throw new TypeError(
        `FENCE lang must be a string, got ${describeValue(value)}`,
        node.line,
        node.column,
        "Map the lang variable to a string"
      );
    }
    return value;
  }

  /**
   * Visit LIST node
   */
  private visitList(node: ListNode, depth = 0): string {
    const lines: string[] = [];
    this.collectListItems(node.items, depth, lines);
    return lines.join("\n");
  }

  /**
   * Add the numbered lines of LIST children: an item gives its line, an IF
   * the lines of its branch, a FOR the lines of each iteration (or of its
   * ELSE body). The numbering follows the lines already collected for this
   * LIST, so items from any source share one counter. Returns the characters
   * the lines hold.
   */
  private collectListItems(
    children: ASTNode[],
    depth: number,
    lines: string[]
  ): number {
    const indent = "   ".repeat(depth); // 3 spaces per level
    let length = 0;
    for (const child of children) {
      if (child.type === "ListItem") {
        const output = this.visitListItem(child as ListItemNode, depth);
        if (output !== null) {
          const line = `${indent}${lines.length + 1}. ${output}`;
          lines.push(line);
          length += line.length;
        }
      } else if (child.type === "If") {
        length += this.collectListItems(
          this.selectBranch(child as IfNode),
          depth,
          lines
        );
      } else if (child.type === "For") {
        this.runLoop(child as ForNode, false, (nodes) => {
          const added = this.collectListItems(nodes, depth, lines);
          length += added;
          return added;
        });
      }
    }
    return length;
  }

  /**
   * Visit LIST_ITEM node
   */
  private visitListItem(node: ListItemNode, depth: number): string | null {
    // Check condition
    if (node.condition) {
      const condition = node.condition;
      const result = this.at(node, () =>
        evaluateCondition(condition, this.scope)
      );
      if (!result) {
        // Show fallback if provided
        return node.fallback || null;
      }
    }

    // Render content
    let content = "";
    for (const child of node.content) {
      if (child.type === "List") {
        // Nested list
        content += "\n" + this.visitList(child as ListNode, depth + 1);
      } else {
        content += this.visit(child);
      }
    }

    return content.trim();
  }

  /**
   * Visit TABLE node
   */
  private visitTable(node: TableNode): string {
    const rows: string[][] = [];

    // Process header
    if (node.header) {
      const headerCells = this.processCellsArray(node.header.cells);
      rows.push(headerCells);
    }

    // Process rows (ROW, FOR and IF blocks, in source order)
    for (const child of node.rows) this.rowsFromChild(child, rows, child.type !== "For");

    // Auto-pad rows to match header length
    const maxCols = Math.max(...rows.map((r) => r.length));
    rows.forEach((row) => {
      while (row.length < maxCols) {
        row.push("");
      }
    });

    // Build markdown table
    const lines: string[] = [];

    // Header row
    if (node.hasHeader && rows.length > 0) {
      const headerRow = rows[0];
      lines.push(`| ${headerRow.join(" | ")} |`);

      // Separator row with alignment
      const separators = headerRow.map((cell, idx) => {
        const align = node.alignment?.[idx] || "left";
        // choose width at least 5 or cell length + 2 padding
        const width = Math.max(5, String(cell).length);
        const hyphens = "-".repeat(width);
        switch (align) {
          case "center":
            return `:${hyphens}:`;
          case "right":
            return `${hyphens}:`;
          default:
            return `:${hyphens}`;
        }
      });
      lines.push(`|${separators.join("|")}|`);

      // Data rows
      for (let i = 1; i < rows.length; i++) {
        lines.push(`| ${rows[i].join(" | ")} |`);
      }
    } else {
      // No header - just rows
      for (const row of rows) {
        lines.push(`| ${row.join(" | ")} |`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Add the rows a TABLE child builds: a ROW gives its cells, an IF the rows
   * of its branch, a FOR the rows of each iteration (or of its ELSE body). A
   * TABLE never errors on the iterable of a FOR that builds rows.
   * `strict` is a row context: an IF written directly in the TABLE and every FOR
   * and IF nested in it, which the parser guarantees hold only ROW, FOR and IF.
   * The body of a FOR written directly in the TABLE is parsed generically, so it
   * is not strict.
   * Returns the characters the rows hold.
   */
  private rowsFromChild(child: TableChild, rows: string[][], strict: boolean): number {
    if (child.type === "For") {
      let length = 0;
      this.runLoop(child, true, (nodes) => {
        const added = this.tableRowsFrom(nodes, rows, strict);
        length += added;
        return added;
      });
      return length;
    }
    if (child.type === "If") {
      return this.tableRowsFrom(this.selectBranch(child), rows, strict);
    }
    const cells = this.processCellsArray(child.cells);
    rows.push(cells);
    return cells.reduce((sum, cell) => sum + cell.length, 0);
  }

  /**
   * Render the nodes of a FOR or IF body in a TABLE into rows: a ROW node gives its
   * cells, an IF or FOR that holds a ROW builds rows too, and a run of other
   * nodes is rendered together and split on a pipe.
   * Returns the characters the rows hold.
   */
  private tableRowsFrom(nodes: ASTNode[], rows: string[][], strict: boolean): number {
    let length = 0;
    const add = (cells: string[]): void => {
      rows.push(cells);
      length += cells.reduce((sum, cell) => sum + cell.length, 0);
    };
    if (strict) {
      for (const bodyNode of nodes) {
        if (bodyNode.type === "TableRow") add(this.processCellsArray((bodyNode as TableRowNode).cells));
        else if (bodyNode.type === "For" || bodyNode.type === "If") length += this.rowsFromChild(bodyNode as TableChild, rows, true);
      }
      return length;
    }

    const addText = (text: string): void => {
      if (text.trim()) {
        add(text.split("|").map((cell) => cell.trim()));
      }
    };
    const inline = ["Text", "Variable", "Ternary", "Comment"];
    let run: ASTNode[] = [];
    const flush = (): void => {
      if (run.length === 1) {
        addText(this.visit(run[0]));
      } else if (run.length > 1) {
        const text = run.map((node) => this.visit(node)).join("");
        for (const line of text.split(/\r?\n/)) addText(line);
      }
      run = [];
    };
    for (const bodyNode of nodes) {
      if (bodyNode.type === "TableRow") {
        flush();
        add(this.processCellsArray((bodyNode as TableRowNode).cells));
      } else if (holdsRow(bodyNode)) {
        flush();
        length += this.rowsFromChild(bodyNode as TableChild, rows, false);
      } else if (inline.includes(bodyNode.type)) {
        run.push(bodyNode);
      } else {
        flush();
        addText(this.visit(bodyNode));
      }
    }
    flush();
    return length;
  }

  /**
   * Process cells array where each cell is an array of AST nodes
   * Returns an array of strings, one per cell
   */
  private processCellsArray(cells: ASTNode[][]): string[] {
    return cells.map((cellNodes) => {
      const content = cellNodes.map((node) => this.visit(node)).join("");
      return content
        .replace(/\r?\n/g, " ")
        .replace(/(\\*)\|/g, (found, slashes: string) =>
          slashes.length % 2 === 0 ? `${slashes}\\|` : found
        )
        .trim();
    });
  }

  /**
   * Visit TERNARY node
   */
  private visitTernary(node: TernaryNode): string {
    const result = evaluateCondition(node.condition, this.scope);

    if (result) {
      return this.resolveTernaryValue(node.trueValue);
    } else {
      return this.resolveTernaryValue(node.falseValue);
    }
  }

  /**
   * Resolve ternary value (can be string literal or variable reference)
   */
  private resolveTernaryValue(value: string | TernaryNode): string {
    if (typeof value !== "string") {
      // Nested ternary
      return this.visitTernary(value);
    }

    // Check if it's a variable reference: ${{varName}}
    const varMatch = value.match(/^\$\{\{(.+?)\}\}$/);
    if (varMatch) {
      const path = varMatch[1].split(".");
      const resolved = this.resolveNestedPath(path);
      return this.valueToString(resolved);
    }

    // Static string
    return value;
  }

  /**
   * Resolve nested property path with safe access
   *
   * Features:
   * - Dot notation: user.profile.name
   * - Array index: items.0
   * - JSON string auto-parsing
   * - Null safety (returns null on missing properties)
   */
  private resolveNestedPath(
    path: string[],
    allowUndefined = false
  ): TemplateValue {
    const rootKey = path[0];

    const hasKey = this.hasRootKey(rootKey);
    let current: TemplateValue = hasKey ? this.scope.get(rootKey) : undefined;

    // Missing variable (not existing key)
    if (!hasKey) {
      if (!allowUndefined && this.strictMode) {
        throw new MissingVariableError(
          rootKey,
          1,
          1,
          this.root.names(),
          subtractionHint(rootKey)
        );
      }
      return null;
    }

    // Key exists â€” even if value === undefined
    // That is allowed and should not throw.
    // Continue resolving nested keys.
    for (let i = 1; i < path.length; i++) {
      if (current == null) return null;

      if (path[i] === "length") {
        const built = builtInLength(current);
        if (built) {
          current = built.value;
          continue;
        }
      }

      // Try JSON parsing if string
      if (typeof current === "string") {
        const parsed = tryCoerceStringForPathSegment(current, path[i]);
        if (parsed) {
          current = parsed;
        } else {
          return null;
        }
      }

      // Access property
      if (typeof current === "object" && !Array.isArray(current)) {
        current = readOwn(current, path[i]);
      } else if (Array.isArray(current)) {
        const index = parseInt(path[i]);
        current = current[index];
      } else {
        return null;
      }
    }

    return current;
  }

  /**
   * True when a variable or loop value holds this name, whatever its value
   */
  private hasRootKey(rootKey: string): boolean {
    return this.scope.has(rootKey);
  }

  /**
   * Convert value to string for output
   */
  private valueToString(value: TemplateValue): string {
    if (value == null) return "";
    if (tryCoerceToString(value) === null) {
      throw new TypeError(
        "Cannot print a value with no text form (a cyclic structure or a BigInt)",
        1,
        1,
        "Map the variable to text, a number or plain data without cycles"
      );
    }
    return valueToText(value);
  }
}

/**
 * True for an IF or FOR that holds a ROW directly in one of its branches or
 * bodies, through nested IF and FOR: it builds table rows
 */
function holdsRow(node: ASTNode): boolean {
  const holds = (nodes: ASTNode[]): boolean =>
    nodes.some((child) => child.type === "TableRow" || holdsRow(child));
  if (node.type === "For") {
    const { body, elseBody } = node as ForNode;
    return holds(body) || (elseBody !== undefined && holds(elseBody));
  }
  if (node.type !== "If") return false;
  let branch: IfNode | null = node as IfNode;
  while (branch) {
    if (holds(branch.consequent)) return true;
    const alternate: ASTNode[] | IfNode | null = branch.alternate;
    if (Array.isArray(alternate)) return holds(alternate);
    branch = alternate;
  }
  return false;
}

/**
 * The value as JSON, or its plain string form when JSON cannot hold it
 * (a cycle, a BigInt)
 */
function describeValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * A FOR window value as a number: a number, or a text holding a plain decimal
 * number, that is a whole number from 0 up to the largest safe integer; null
 * for anything else
 */
function windowNumber(value: TemplateValue): number | null {
  let number: number;
  if (typeof value === "number") {
    number = value;
  } else if (
    typeof value === "string" &&
    /^\s*[+-]?(\d+(\.\d*)?|\.\d+)\s*$/.test(value)
  ) {
    number = Number(value);
  } else {
    return null;
  }
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}
```

### core/src/scope.ts

```
import { TemplateValue, VariableLookup } from "./types";

/**
 * Read one path segment from an object by own property only, so a segment such
 * as `constructor` or `toString` never reads a member the engine supplies
 */
export function readOwn(
  object: object,
  key: string
): TemplateValue | undefined {
  if (!Object.prototype.hasOwnProperty.call(object, key)) return undefined;
  return (object as Record<string, TemplateValue>)[key];
}

/**
 * The caller's data, read in place: it only calls `has` and `get` of the
 * lookup it wraps and never copies it
 */
export class RootScope implements VariableLookup {
  constructor(private readonly data: VariableLookup) {}

  has(name: string): boolean {
    return this.data.has(name);
  }

  get(name: string): TemplateValue | undefined {
    return this.data.get(name);
  }

  /**
   * The names the data holds, for an error message. A Map is read through the
   * built-in method, so an error does not reach for any override of its own.
   */
  names(): string[] {
    return this.data instanceof Map
      ? Array.from(Map.prototype.keys.call(this.data) as Iterable<string>)
      : [];
  }
}

/**
 * One loop's names (the item and the `@` metadata) over a parent scope. A name
 * on the frame shadows the same name further up.
 */
export class Frame implements VariableLookup {
  private readonly entries = new Map<string, TemplateValue>();

  constructor(readonly parent: VariableLookup) {}

  set(name: string, value: TemplateValue): void {
    this.entries.set(name, value);
  }

  has(name: string): boolean {
    return this.entries.has(name) || this.parent.has(name);
  }

  get(name: string): TemplateValue | undefined {
    return this.entries.has(name)
      ? this.entries.get(name)
      : this.parent.get(name);
  }
}
```

### core/src/parser.ts

```
import {
  Token,
  TokenType,
  ProgramNode,
  ASTNode,
  TextNode,
  VariableNode,
  IfNode,
  CaseNode,
  WhenNode,
  DefaultNode,
  ForNode,
  ForWindowArg,
  ListNode,
  ListChild,
  ListItemNode,
  TableNode,
  TableChild,
  TableHeaderNode,
  TableRowNode,
  CommentNode,
  SectionNode,
  SectionTitle,
  FenceNode,
  FenceLang,
  FilterCall,
  DEFAULT_LIMITS,
} from "./types";
import { SyntaxError, TypeError, LimitError } from "./errors";
import { parseFilter } from "./filters";
import { parseWhenMatch } from "./expressions";

const BLOCK_ARGUMENT = /(\w+)=("[^"]*"|'[^']*'|\S*)|"[^"]*"|'[^']*'|\S+/g;
const VARIABLE_PATH = /^[A-Za-z_@][\w@]*(\.[\w@]+)*$/;

/** Parses one child of a block body; null for a child that leaves no node */
type ChildParser = () => ASTNode | null;

/**
 * Parser: Builds Abstract Syntax Tree from tokens
 *
 * Uses recursive descent parsing for clean nesting support.
 */
export class Parser {
  private pos = 0;
  private depth = 0;
  private nodes = 0;
  /** How many LIST_ITEM contents the parser is inside */
  private itemDepth = 0;
  private readonly maxDepth: number;
  private readonly maxNodes: number;

  constructor(
    private tokens: Token[],
    options?: { maxDepth?: number; maxNodes?: number }
  ) {
    this.maxDepth = options?.maxDepth ?? DEFAULT_LIMITS.maxDepth;
    this.maxNodes = options?.maxNodes ?? DEFAULT_LIMITS.maxNodes;
  }

  /**
   * Main parsing entry point
   */
  parse(): ProgramNode {
    const body: ASTNode[] = [];

    while (!this.isAtEnd()) {
      const node = this.parseNode();
      if (node) {
        body.push(node);
      }
    }

    return {
      type: "Program",
      body,
      line: 1,
      column: 1,
    };
  }

  /**
   * Parse single node
   */
  private parseNode(): ASTNode | null {
    const token = this.current();

    switch (token.type) {
      case TokenType.TEXT:
        return this.parseText();
      case TokenType.VARIABLE:
        return this.parseVariable();
      case TokenType.IF:
        return this.nested(() => this.parseIf());
      case TokenType.CASE:
        return this.nested(() => this.parseCase());
      case TokenType.FOR:
        return this.nested(() => this.parseFor());
      case TokenType.LIST:
        return this.nested(() => this.parseList());
      case TokenType.TABLE:
        return this.nested(() => this.parseTable());
      case TokenType.SECTION:
        return this.nested(() => this.parseSection());
      case TokenType.FENCE:
        return this.nested(() => this.parseFence());
      case TokenType.HEADER:
        return this.parseTableHeader();
      case TokenType.ROW:
        return this.parseTableRow();
      case TokenType.COMMENT:
        return this.parseComment();
      case TokenType.EOF:
        return null;
      case TokenType.LIST_ITEM:
        if (this.itemDepth > 0) {
          throw new SyntaxError(
            "A {{LIST_ITEM}} cannot sit inside the content of another item",
            token.line,
            token.column,
            "Close the item with {{END_LIST_ITEM}} before the FOR or IF that builds items"
          );
        }
        return this.unexpectedToken(token);
      default:
        return this.unexpectedToken(token);
    }
  }

  private unexpectedToken(token: Token): never {
    throw new SyntaxError(
      `Unexpected token: ${token.type}`,
      token.line,
      token.column,
      "Check template syntax"
    );
  }

  /**
   * Parse a block one level deeper, rejecting it at its opening tag when the
   * nesting would exceed maxDepth
   */
  private nested<T>(parseBlock: () => T): T {
    if (this.depth >= this.maxDepth) {
      const token = this.current();
      throw new LimitError(
        "limit-depth",
        `Block nesting exceeds the maximum depth of ${this.maxDepth}`,
        token.line,
        token.column,
        "Flatten nested blocks or raise limits.maxDepth"
      );
    }
    this.depth++;
    const node = parseBlock();
    this.depth--;
    return node;
  }

  /**
   * Parse text node
   */
  private parseText(): TextNode {
    const token = this.open(TokenType.TEXT);
    return {
      type: "Text",
      content: token.value,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse variable: ${{name}}, ${{user.name | filter}}
   */
  private parseVariable(): VariableNode {
    const token = this.open(TokenType.VARIABLE);
    const parts = this.parseVariableExpression(token.value);

    return {
      type: "Variable",
      path: parts.path,
      defaultValue: parts.defaultValue,
      filters: parts.filters,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse variable expression with filters and default operator
   * Examples:
   * - "name" â†’ { path: ["name"] }
   * - "user.name" â†’ { path: ["user", "name"] }
   * - 'name ?? "default"' â†’ { path: ["name"], defaultValue: "default" }
   * - "text | trim | head=10" â†’ { path: ["text"], filters: [...] }
   */
  private parseVariableExpression(expr: string): {
    path: string[];
    defaultValue?: string;
    filters?: FilterCall[];
  } {
    // --- 1. Split filters FIRST (pipes inside quotes belong to the default) ---
    const parts = this.splitOutsideQuotes(expr, "|").map((p) => p.trim());
    const core = parts[0];
    const filterExprs = parts.slice(1);

    // --- 2. Extract default operator (??) ---
    let pathExpr = core;
    let defaultValue: string | undefined = undefined;

    const defaultIdx = core.indexOf("??");
    if (defaultIdx !== -1) {
      pathExpr = core.slice(0, defaultIdx).trim();
      defaultValue = core
        .slice(defaultIdx + 2)
        .trim()
        .replace(/^(["'])(.*)\1$/s, "$2");
    }

    // --- 3. Parse path ---
    const path = pathExpr.split(".").map((p) => p.trim());

    // --- 4. Parse filters ---
    const filters: FilterCall[] =
      filterExprs.length > 0
        ? filterExprs.map(parseFilter)
        : [];

    return {
      path,
      defaultValue,
      filters: filters.length > 0 ? filters : undefined,
    };
  }

  /**
   * Split on a separator character, ignoring separators inside quotes.
   * A quote only opens at the start of a value, so an apostrophe inside a
   * word is plain text, and so is a quote that never closes: the split is
   * redone with that quote left out.
   */
  private splitOutsideQuotes(
    text: string,
    separator: string,
    plainQuotes: ReadonlySet<number> = new Set()
  ): string[] {
    const parts: string[] = [];
    let quote: string | null = null;
    let quoteAt = -1;
    let start = 0;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (
        (ch === '"' || ch === "'") &&
        !plainQuotes.has(i) &&
        /(^|\?\?|=)\s*$/.test(text.slice(start, i))
      ) {
        quote = ch;
        quoteAt = i;
      } else if (ch === separator) {
        parts.push(text.slice(start, i));
        start = i + 1;
      }
    }
    if (quote) {
      return this.splitOutsideQuotes(
        text,
        separator,
        new Set(plainQuotes).add(quoteAt)
      );
    }
    parts.push(text.slice(start));
    return parts;
  }

  /**
   * Parse IF block: {{IF condition}}...{{ELSEIF}}...{{ELSE}}...{{END_IF}}
   * ELSEIF branches nest in the alternate of the branch before them and are
   * parsed in a loop, so a long chain does not deepen the call stack.
   */
  private parseIf(child: ChildParser = () => this.parseNode()): IfNode {
    const root = this.parseIfBranch(TokenType.IF, child);
    let last = root;
    while (this.check(TokenType.ELSEIF)) {
      const branch = this.parseIfBranch(TokenType.ELSEIF, child);
      last.alternate = branch;
      last = branch;
    }
    if (this.check(TokenType.ELSE)) last.alternate = this.parseElse(last, child);

    this.consume(TokenType.END_IF);
    return root;
  }

  /**
   * Parse the head and body of an IF or ELSEIF branch, up to the next
   * ELSEIF, ELSE or END_IF
   */
  private parseIfBranch(
    type: TokenType.IF | TokenType.ELSEIF,
    child: ChildParser
  ): IfNode {
    const token = this.open(type);
    const consequent: ASTNode[] = [];

    while (
      !this.check(TokenType.ELSEIF) &&
      !this.check(TokenType.ELSE) &&
      !this.check(TokenType.END_IF)
    ) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          type === TokenType.IF
            ? `Unclosed {{IF}} block starting at line ${token.line}`
            : "Unclosed {{ELSEIF}} block",
          token.line,
          token.column,
          "Add {{END_IF}}"
        );
      }
      const node = child();
      if (node) consequent.push(node);
    }

    return {
      type: "If",
      condition: this.extractCondition(token.value),
      consequent,
      alternate: null,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse the ELSE body of a branch, up to END_IF
   */
  private parseElse(branch: IfNode, child: ChildParser): ASTNode[] {
    this.consume(TokenType.ELSE);
    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_IF)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{ELSE}} block",
          branch.line,
          branch.column,
          "Add {{END_IF}}"
        );
      }
      const node = child();
      if (node) body.push(node);
    }
    return body;
  }

  /**
   * Parse CASE block: {{CASE var}}{{WHEN "val"}}...{{END_WHEN}}{{DEFAULT}}...{{END_CASE}}
   */
  private parseCase(): CaseNode {
    const token = this.open(TokenType.CASE);
    const expression = this.extractExpression(token.value);

    const cases: WhenNode[] = [];
    let defaultNode: DefaultNode | null = null;

    while (!this.check(TokenType.END_CASE)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{CASE}} block",
          token.line,
          token.column,
          "Add {{END_CASE}}"
        );
      }

      if (this.check(TokenType.WHEN)) {
        cases.push(this.parseWhen());
      } else if (this.check(TokenType.DEFAULT)) {
        defaultNode = this.parseDefault();
      } else if (this.check(TokenType.TEXT)) {
        // Skip whitespace text between WHEN/DEFAULT blocks
        const textToken = this.current();
        if (textToken.value.trim() !== "") {
          throw new SyntaxError(
            `Unexpected text in CASE: "${textToken.value.trim()}"`,
            textToken.line,
            textToken.column,
            "CASE blocks should only contain {{WHEN}} and {{DEFAULT}}"
          );
        }
        this.advance(); // Skip whitespace
      } else {
        const unexpected = this.current();
        throw new SyntaxError(
          `Unexpected token in CASE: ${unexpected.type}`,
          unexpected.line,
          unexpected.column,
          "Expected {{WHEN}} or {{DEFAULT}}"
        );
      }
    }

    this.consume(TokenType.END_CASE);

    return {
      type: "Case",
      expression,
      cases,
      default: defaultNode,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse WHEN clause
   */
  private parseWhen(): WhenNode {
    const token = this.open(TokenType.WHEN);
    const match = parseWhenMatch(
      token.value.replace(/^WHEN/i, ""),
      token.line,
      token.column
    );
    const first = match.kind === "list" ? match.items[0] : null;
    const value = first?.kind === "literal" && first.quoted ? first.text : "";

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_WHEN)) {
      if (
        this.check(TokenType.WHEN) ||
        this.check(TokenType.DEFAULT) ||
        this.check(TokenType.END_CASE)
      ) {
        break;
      }
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{WHEN}} block",
          token.line,
          token.column,
          "Add {{END_WHEN}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    if (this.check(TokenType.END_WHEN)) {
      this.consume(TokenType.END_WHEN);
    }

    return {
      type: "When",
      value,
      match,
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse DEFAULT clause
   */
  private parseDefault(): DefaultNode {
    const token = this.open(TokenType.DEFAULT);

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_DEFAULT)) {
      if (this.check(TokenType.END_CASE)) {
        break;
      }
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{DEFAULT}} block",
          token.line,
          token.column,
          "Add {{END_DEFAULT}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    if (this.check(TokenType.END_DEFAULT)) {
      this.consume(TokenType.END_DEFAULT);
    }

    return {
      type: "Default",
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse FOR loop: {{FOR items AS item [limit=N] [offset=N]}}...{{ELSE}}...{{END_FOR}}
   * An {{ELSE}} directly in the body starts the branch that renders when no
   * item does; an IF inside the body parses its own ELSE.
   */
  private parseFor(child: ChildParser = () => this.parseNode()): ForNode {
    const token = this.open(TokenType.FOR);
    const header = this.parseForHeader(token);

    const body: ASTNode[] = [];
    let elseBody: ASTNode[] | undefined;
    while (!this.check(TokenType.END_FOR)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{FOR}} block",
          token.line,
          token.column,
          "Add {{END_FOR}}"
        );
      }
      if (this.check(TokenType.ELSE)) {
        const elseToken = this.advance();
        if (elseBody !== undefined) {
          throw new SyntaxError(
            "A {{FOR}} block takes one {{ELSE}}",
            elseToken.line,
            elseToken.column,
            "Remove the second {{ELSE}}"
          );
        }
        elseBody = [];
        continue;
      }
      const node = child();
      if (node) (elseBody ?? body).push(node);
    }

    this.consume(TokenType.END_FOR);

    const node: ForNode = {
      type: "For",
      iterable: header.iterable,
      itemName: header.itemName,
      body,
      line: token.line,
      column: token.column,
    };
    if (header.limit) node.limit = header.limit;
    if (header.offset) node.offset = header.offset;
    if (elseBody) node.elseBody = elseBody;
    return node;
  }

  /**
   * Parse the FOR tag word by word: "FOR items AS item limit=2 offset=n".
   * Every problem is a syntax error at the tag.
   */
  private parseForHeader(token: Token): {
    iterable: string[];
    itemName: string;
    limit?: ForWindowArg;
    offset?: ForWindowArg;
  } {
    const fail = (why: string): never => {
      throw new SyntaxError(
        `Invalid FOR syntax: ${why}`,
        token.line,
        token.column,
        "Expected: {{FOR items AS item}} with optional limit=N and offset=N"
      );
    };

    const match = /^FOR\s+(.+?)\s+AS(?:\s+(.*))?$/is.exec(token.value.trim());
    const rest = match?.[2]?.trim();
    if (!match || !rest) return fail(token.value);
    const words = rest.split(/\s+/);
    const itemName = words[0];
    if (!/^\w+$/.test(itemName)) fail(`bad item name "${itemName}"`);

    const iterable = match[1].split(".").map((p) => p.trim());
    const result: {
      iterable: string[];
      itemName: string;
      limit?: ForWindowArg;
      offset?: ForWindowArg;
    } = { iterable, itemName };

    for (const word of words.slice(1)) {
      const argument = /^(limit|offset)=(.+)$/.exec(word);
      if (!argument) fail(`unexpected "${word}"`);
      const [, key, written] = argument as RegExpExecArray;
      const name = key as "limit" | "offset";
      if (result[name]) fail(`${name} is given twice`);
      if (/^[+-]?\d+(\.\d+)?$/.test(written)) {
        result[name] = { kind: "literal", value: Number(written) };
      } else if (VARIABLE_PATH.test(written)) {
        result[name] = { kind: "path", path: written.split(".") };
      } else {
        fail(`bad ${name} value "${written}"`);
      }
    }
    return result;
  }

  /**
   * Parse SECTION: {{SECTION "Title" level=2 skip_empty=false}}...{{END_SECTION}}
   */
  private parseSection(): SectionNode {
    const token = this.open(TokenType.SECTION);
    const { title, level, skipEmpty } = this.parseSectionArguments(token);

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_SECTION)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{SECTION}} block",
          token.line,
          token.column,
          "Add {{END_SECTION}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    this.consume(TokenType.END_SECTION);

    return {
      type: "Section",
      title,
      level,
      skipEmpty,
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse the SECTION title (quoted string or variable path) and its
   * level and skip_empty options
   */
  private parseSectionArguments(token: Token): {
    title: SectionTitle;
    level: number;
    skipEmpty: boolean;
  } {
    const typeError = (message: string, suggestion: string) =>
      new TypeError(message, token.line, token.column, suggestion);
    const syntaxError = (message: string) =>
      new SyntaxError(
        message,
        token.line,
        token.column,
        'Expected: {{SECTION "Title" level=2 skip_empty=true}}'
      );

    let title: SectionTitle | null = null;
    let level = 2;
    let skipEmpty = true;
    const args = token.value.slice("SECTION".length);

    for (const [argument, key, value] of args.matchAll(BLOCK_ARGUMENT)) {
      if (key === "level") {
        if (!/^[+-]?\d+$/.test(value)) {
          throw typeError(
            `SECTION level must be an integer, got ${value}`,
            "Use level=1 through level=6"
          );
        }
        level = Math.min(6, Math.max(1, Number(value)));
      } else if (key === "skip_empty") {
        if (value !== "true" && value !== "false") {
          throw typeError(
            `SECTION skip_empty must be true or false, got ${value}`,
            "Use skip_empty=true or skip_empty=false"
          );
        }
        skipEmpty = value === "true";
      } else if (key !== undefined) {
        throw syntaxError(`Unknown SECTION option: ${key}`);
      } else if (title !== null) {
        throw syntaxError(`Unexpected SECTION argument: ${argument}`);
      } else if (/^(["']).*\1$/.test(argument)) {
        title = { kind: "literal", text: argument.slice(1, -1) };
      } else if (VARIABLE_PATH.test(argument)) {
        title = { kind: "path", path: argument.split(".") };
      } else {
        throw syntaxError(`Invalid SECTION title: ${argument}`);
      }
    }

    if (title === null || (title.kind === "literal" && title.text === "")) {
      throw typeError(
        "SECTION needs a non-empty title",
        'Give a quoted title or a variable path: {{SECTION "Title"}}'
      );
    }
    return { title, level, skipEmpty };
  }

  /**
   * Parse FENCE: {{FENCE lang="md"}}...{{END_FENCE}}
   */
  private parseFence(): FenceNode {
    const token = this.open(TokenType.FENCE);
    const lang = this.parseFenceLang(token);

    const body: ASTNode[] = [];
    while (!this.check(TokenType.END_FENCE)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{FENCE}} block",
          token.line,
          token.column,
          "Add {{END_FENCE}}"
        );
      }
      const node = this.parseNode();
      if (node) body.push(node);
    }

    this.consume(TokenType.END_FENCE);

    return {
      type: "Fence",
      lang,
      body,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse the optional FENCE lang option: a quoted string or a variable path
   */
  private parseFenceLang(token: Token): FenceLang | null {
    const syntaxError = (message: string) =>
      new SyntaxError(
        message,
        token.line,
        token.column,
        'Expected: {{FENCE lang="markdown"}} or {{FENCE lang=path.to.lang}}'
      );

    let lang: FenceLang | null = null;
    const args = token.value.slice("FENCE".length);

    for (const [argument, key, value] of args.matchAll(BLOCK_ARGUMENT)) {
      if (key !== "lang") {
        throw syntaxError(
          key === undefined
            ? `Unexpected FENCE argument: ${argument}`
            : `Unknown FENCE option: ${key}`
        );
      }
      if (/^(["']).*\1$/.test(value)) {
        lang = { kind: "literal", text: value.slice(1, -1) };
      } else if (VARIABLE_PATH.test(value)) {
        lang = { kind: "path", path: value.split(".") };
      } else {
        throw syntaxError(`Invalid FENCE lang: ${value}`);
      }
    }
    return lang;
  }

  /**
   * Parse LIST: {{LIST}}{{LIST_ITEM}}...{{END_LIST_ITEM}}{{END_LIST}}
   * Its children are items, and FOR and IF blocks that build items.
   */
  private parseList(): ListNode {
    const token = this.open(TokenType.LIST);
    const items: ListChild[] = [];

    while (!this.check(TokenType.END_LIST)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{LIST}} block",
          token.line,
          token.column,
          "Add {{END_LIST}}"
        );
      }
      const child = this.parseListChild();
      if (child) items.push(child as ListChild);
    }

    this.consume(TokenType.END_LIST);

    return {
      type: "List",
      items,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse one child of a LIST, or of a FOR or IF that builds items: an item,
   * a FOR, an IF, a comment or whitespace; anything else is a syntax error at
   * its own token
   */
  private parseListChild(): ASTNode | null {
    const token = this.current();
    switch (token.type) {
      case TokenType.LIST_ITEM:
        return this.parseListItem();
      case TokenType.FOR:
        return this.nested(() => this.parseFor(() => this.parseListChild()));
      case TokenType.IF:
        return this.nested(() => this.parseIf(() => this.parseListChild()));
      case TokenType.COMMENT:
        this.parseComment();
        return null;
      case TokenType.TEXT:
        if (token.value.trim() !== "") {
          throw new SyntaxError(
            `Unexpected text in LIST: "${token.value.trim()}"`,
            token.line,
            token.column,
            "LIST should only contain {{LIST_ITEM}}, {{FOR}} or {{IF}}"
          );
        }
        this.advance(); // Skip whitespace
        return null;
      default:
        throw new SyntaxError(
          `Unexpected token in LIST: ${token.type}`,
          token.line,
          token.column,
          "Expected {{LIST_ITEM}}, {{FOR}} or {{IF}}"
        );
    }
  }

  /**
   * Parse LIST_ITEM. Without END_LIST_ITEM the item ends at the next item,
   * END_LIST, or the closer or branch word of the FOR or IF around it.
   */
  private parseListItem(): ListItemNode {
    const token = this.open(TokenType.LIST_ITEM);

    // Parse optional condition and fallback
    const { condition, fallback } = this.parseListItemAttributes(token.value);

    const content: ASTNode[] = [];
    this.itemDepth++;
    while (!this.check(TokenType.END_LIST_ITEM)) {
      if (
        this.check(TokenType.LIST_ITEM) ||
        this.check(TokenType.END_LIST) ||
        this.check(TokenType.END_FOR) ||
        this.check(TokenType.ELSE) ||
        this.check(TokenType.ELSEIF) ||
        this.check(TokenType.END_IF)
      ) {
        break;
      }
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{LIST_ITEM}} block",
          token.line,
          token.column,
          "Add {{END_LIST_ITEM}}"
        );
      }
      const node = this.parseNode();
      if (node) content.push(node);
    }
    this.itemDepth--;

    if (this.check(TokenType.END_LIST_ITEM)) {
      this.consume(TokenType.END_LIST_ITEM);
    }

    return {
      type: "ListItem",
      content,
      condition,
      fallback,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse LIST_ITEM attributes: {{LIST_ITEM condition | fallback="text"}}
   */
  private parseListItemAttributes(expr: string): {
    condition?: string;
    fallback?: string;
  } {
    const afterKeyword = expr.replace(/^LIST_ITEM\s*/, "").trim();
    if (!afterKeyword) return {};

    const parts = afterKeyword.split("|");
    const condition = parts[0]?.trim();
    const fallbackMatch = parts[1]?.match(/fallback\s*=\s*["'](.+?)["']/);
    const fallback = fallbackMatch?.[1];

    return { condition: condition || undefined, fallback };
  }

  /**
   * Parse TABLE: {{TABLE}}{{HEADER}}...{{ROW}}...{{END_TABLE}}
   * Its rows come from ROW, FOR and IF blocks. A FOR written directly in the
   * TABLE keeps its generic body (a body that is not a ROW is split on a
   * pipe when it runs); an IF holds rows only.
   */
  private parseTable(): TableNode {
    const token = this.open(TokenType.TABLE);
    const alignment = this.parseTableAlignment(token.value);

    let header: TableHeaderNode | null = null;
    const rows: TableChild[] = [];

    while (!this.check(TokenType.END_TABLE)) {
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{TABLE}} block",
          token.line,
          token.column,
          "Add {{END_TABLE}}"
        );
      }

      if (this.check(TokenType.HEADER)) {
        header = this.parseTableHeader();
      } else if (this.check(TokenType.FOR)) {
        // A FOR generates rows; its body is parsed as in any FOR
        this.count(this.current());
        rows.push(this.nested(() => this.parseFor()));
      } else {
        const child = this.parseRowChild();
        if (child) rows.push(child as TableChild);
      }
    }

    this.consume(TokenType.END_TABLE);

    return {
      type: "Table",
      header,
      rows,
      hasHeader: header !== null,
      alignment,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse one child of a TABLE, or of an IF or FOR that builds rows: a ROW, a
   * FOR, an IF, a comment or whitespace; anything else is a syntax error at
   * its own token. A HEADER is only accepted by the TABLE itself.
   */
  private parseRowChild(): ASTNode | null {
    const token = this.current();
    switch (token.type) {
      case TokenType.ROW:
        return this.parseTableRow();
      case TokenType.FOR:
        return this.nested(() => this.parseFor(() => this.parseRowChild()));
      case TokenType.IF:
        return this.nested(() => this.parseIf(() => this.parseRowChild()));
      case TokenType.COMMENT:
        this.parseComment();
        return null;
      case TokenType.TEXT:
        if (token.value.trim() !== "") {
          throw new SyntaxError(
            `Unexpected text in TABLE: "${token.value.trim()}"`,
            token.line,
            token.column,
            "TABLE should only contain {{HEADER}}, {{ROW}}, {{FOR}} or {{IF}}"
          );
        }
        this.advance(); // Skip whitespace
        return null;
      default:
        throw new SyntaxError(
          `Unexpected token in TABLE: ${token.type}`,
          token.line,
          token.column,
          "Expected {{HEADER}}, {{ROW}}, {{FOR}} or {{IF}}"
        );
    }
  }

  /**
   * Parse table alignment: {{TABLE align="left|center|right"}}
   */
  private parseTableAlignment(expr: string): string[] | undefined {
    const match = expr.match(/align\s*=\s*["'](.+?)["']/);
    if (!match) return undefined;

    return match[1].split("|").map((a) => a.trim());
  }

  /**
   * Parse table header
   */
  private parseTableHeader(): TableHeaderNode {
    const token = this.open(TokenType.HEADER);

    const content: ASTNode[] = [];

    while (!this.check(TokenType.END_HEADER)) {
      if (this.check(TokenType.END_TABLE)) break;
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{HEADER}} block",
          token.line,
          token.column,
          "Add {{END_HEADER}}"
        );
      }
      const node = this.parseNode();
      if (node) content.push(node);
    }

    if (this.check(TokenType.END_HEADER)) this.consume(TokenType.END_HEADER);
    const cells = this.splitCells(content);

    return {
      type: "Header",
      cells,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Parse table row. Without END_ROW the row ends at the next ROW,
   * END_TABLE, or the closer or branch word of the FOR or IF around it.
   */
  private parseTableRow(): TableRowNode {
    const token = this.open(TokenType.ROW);

    const content: ASTNode[] = [];

    while (!this.check(TokenType.END_ROW)) {
      if (
        this.check(TokenType.ROW) ||
        this.check(TokenType.END_TABLE) ||
        this.check(TokenType.END_FOR) ||
        this.check(TokenType.ELSE) ||
        this.check(TokenType.ELSEIF) ||
        this.check(TokenType.END_IF)
      ) {
        break;
      }
      if (this.isAtEnd()) {
        throw new SyntaxError(
          "Unclosed {{ROW}} block",
          token.line,
          token.column,
          "Add {{END_ROW}}"
        );
      }
      const node = this.parseNode();
      if (node) content.push(node);
    }

    if (this.check(TokenType.END_ROW)) this.consume(TokenType.END_ROW);

    // --- NEW: split at "|" ---
    const cells = this.splitCells(content);

    return {
      type: "TableRow",
      cells,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Split AST nodes into cells by pipe character
   * Handles text nodes containing pipes by splitting them
   */
  private splitCells(nodes: ASTNode[]): ASTNode[][] {
    const cells: ASTNode[][] = [[]];

    for (const node of nodes) {
      if (node.type === "Text") {
        const textNode = node as TextNode;
        const content = textNode.content;

        // Check if this text node contains pipe(s)
        if (content.includes("|")) {
          const parts = content.split("|");

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            // Add text content to current cell if non-empty
            if (part !== "") {
              cells[cells.length - 1].push({
                type: "Text",
                content: part,
                line: textNode.line,
                column: textNode.column,
              } as TextNode);
            }

            // Start new cell after each pipe (except after last part)
            if (i < parts.length - 1) {
              cells.push([]);
            }
          }
        } else {
          // No pipe - add entire text node to current cell
          cells[cells.length - 1].push(node);
        }
      } else {
        // Non-text node - add to current cell
        cells[cells.length - 1].push(node);
      }
    }

    return cells;
  }

  /**
   * Parse comment (excluded from output)
   */
  private parseComment(): CommentNode {
    const token = this.open(TokenType.COMMENT);
    return {
      type: "Comment",
      content: token.value,
      line: token.line,
      column: token.column,
    };
  }

  /**
   * Extract condition from IF or ELSEIF token: "IF show" -> "show", "ELSEIF b" -> "b"
   */
  private extractCondition(expr: string): string {
    return expr.replace(/^(ELSE)?IF\s+/i, "").trim();
  }

  /**
   * Extract expression from CASE token: "CASE status" â†’ "status"
   */
  private extractExpression(expr: string): string {
    return expr.replace(/^CASE\s+/i, "").trim();
  }

  // ==================== Token Stream Helpers ====================

  /**
   * Get current token without advancing
   */
  private current(): Token {
    return this.tokens[this.pos];
  }

  /**
   * Check if current token matches type
   */
  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.current().type === type;
  }

  /**
   * Advance to next token and return previous
   */
  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.tokens[this.pos - 1];
  }

  /**
   * Consume the opening token of a node, counting the node against maxNodes
   */
  private open(type: TokenType): Token {
    const token = this.consume(type);
    this.count(token);
    return token;
  }

  /**
   * Count one node, failing at its opening token once maxNodes is crossed
   */
  private count(token: Token): void {
    if (++this.nodes <= this.maxNodes) return;
    throw new LimitError(
      "limit-nodes",
      `Template exceeds the maximum of ${this.maxNodes} nodes`,
      token.line,
      token.column,
      "Shorten the template or raise limits.maxNodes"
    );
  }

  /**
   * Consume expected token type or throw error
   */
  private consume(type: TokenType): Token {
    if (this.check(type)) return this.advance();

    const token = this.current();
    throw new SyntaxError(
      `Expected ${type}, got ${token.type}`,
      token.line,
      token.column,
      `Check template syntax near line ${token.line}`
    );
  }

  /**
   * Check if we've reached EOF
   */
  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }
}
```

### core/src/lexer.ts

```
import { Token, TokenType, WhitespaceOptions } from "./types";
import { SyntaxError } from "./errors";
import { applyWhitespace } from "./whitespace";

const RAW_CLOSER = /\{\{-?[ \t]*END_RAW[ \t]*-?\}\}/y;

/** The tag keywords the lexer knows, each with its token type */
export const KEYWORDS: Readonly<Record<string, TokenType>> = {
  IF: TokenType.IF,
  ELSEIF: TokenType.ELSEIF,
  ELSE: TokenType.ELSE,
  END_IF: TokenType.END_IF,
  CASE: TokenType.CASE,
  WHEN: TokenType.WHEN,
  DEFAULT: TokenType.DEFAULT,
  END_WHEN: TokenType.END_WHEN,
  END_DEFAULT: TokenType.END_DEFAULT,
  END_CASE: TokenType.END_CASE,
  FOR: TokenType.FOR,
  END_FOR: TokenType.END_FOR,
  LIST: TokenType.LIST,
  LIST_ITEM: TokenType.LIST_ITEM,
  END_LIST_ITEM: TokenType.END_LIST_ITEM,
  END_LIST: TokenType.END_LIST,
  TABLE: TokenType.TABLE,
  HEADER: TokenType.HEADER,
  END_HEADER: TokenType.END_HEADER,
  ROW: TokenType.ROW,
  END_ROW: TokenType.END_ROW,
  END_TABLE: TokenType.END_TABLE,
  RAW: TokenType.RAW,
  END_RAW: TokenType.END_RAW,
  SECTION: TokenType.SECTION,
  END_SECTION: TokenType.END_SECTION,
  FENCE: TokenType.FENCE,
  END_FENCE: TokenType.END_FENCE,
};

/** Block closers checked for balance, each with the opener it closes */
const CLOSERS: Partial<Record<TokenType, TokenType>> = {
  [TokenType.END_IF]: TokenType.IF,
  [TokenType.END_FOR]: TokenType.FOR,
  [TokenType.END_CASE]: TokenType.CASE,
  [TokenType.END_TABLE]: TokenType.TABLE,
  [TokenType.END_LIST]: TokenType.LIST,
  [TokenType.END_SECTION]: TokenType.SECTION,
  [TokenType.END_FENCE]: TokenType.FENCE,
};
const OPENERS = new Set(Object.values(CLOSERS));

/**
 * Lexer: Converts template string into array of tokens with position tracking
 *
 * Handles all template syntax:
 * - Variables: ${{name}}, ${{user.name}}
 * - Control flow: {{IF}}, {{ELSE}}, {{ELSEIF}}, {{END_IF}}
 * - CASE: {{CASE}}, {{WHEN}}, {{DEFAULT}}, {{END_CASE}}
 * - Loops: {{FOR items AS item}}, {{END_FOR}}
 * - Tables: {{TABLE}}, {{HEADER}}, {{ROW}}, {{END_TABLE}}
 * - Lists: {{LIST}}, {{LIST_ITEM}}, {{END_LIST}}
 * - Sections: {{SECTION "Title" level=2}}, {{END_SECTION}}
 * - Code fences: {{FENCE lang="md"}}, {{END_FENCE}}
 * - Ternary: {{condition ? "true" : "false"}}
 * - Comments: {{# comment #}}
 * - Literal blocks: {{RAW}}...{{END_RAW}}; \{{ is a literal brace pair
 * - Trim markers: {{- TAG}} and {{TAG -}}
 */
export class Lexer {
  private pos = 0;
  private line = 1;
  private column = 1;
  private tokens: Token[] = [];

  constructor(
    private template: string,
    private options: WhitespaceOptions = {}
  ) {}

  /**
   * Validate that all blocks are properly closed. An open SECTION that meets
   * another block's closer, or the end of the template, is reported at the
   * latest SECTION tag opened inside it.
   */
  private validateBlocks(): void {
    const stack: Token[] = [];
    let latestSection: Token | null = null;

    for (const token of this.tokens) {
      if (OPENERS.has(token.type)) {
        stack.push(token);
        if (token.type === TokenType.SECTION) latestSection = token;
        continue;
      }

      const opener = CLOSERS[token.type];
      if (opener === undefined) continue;
      const top = stack[stack.length - 1];
      if (top?.type === opener) {
        stack.pop();
        continue;
      }
      if (top?.type === TokenType.SECTION) this.unclosed(latestSection ?? top);
      throw new SyntaxError(
        `Unexpected {{${token.type}}} without matching {{${opener}}}`,
        token.line,
        token.column,
        "Check template structure"
      );
    }

    const unclosed = stack[stack.length - 1];
    if (unclosed === undefined) return;
    this.unclosed(
      unclosed.type === TokenType.SECTION ? latestSection ?? unclosed : unclosed
    );
  }

  private unclosed(opener: Token): never {
    const typeName = opener.type.replace("_", " ");
    throw new SyntaxError(
      `Unclosed {{${typeName}}} block starting at line ${opener.line}`,
      opener.line,
      opener.column,
      `Add {{END_${typeName}}}`
    );
  }

  /**
   * Tokenize the input template
   */
  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (this.pos < this.template.length) {
      if (
        this.current() === "$" &&
        this.peek(1) === "{" &&
        this.peek(2) === "{"
      ) {
        this.scanVariable();
      } else if (this.current() === "{" && this.peek() === "{") {
        this.scanTag();
      } else {
        this.scanText();
      }
    }

    // Add EOF token
    this.tokens.push({
      type: TokenType.EOF,
      value: "",
      line: this.line,
      column: this.column,
    });

    // Validate blocks are properly closed
    this.validateBlocks();

    return applyWhitespace(this.tokens, this.options).filter(
      (t) => t.type !== TokenType.RAW && t.type !== TokenType.END_RAW
    );
  }
  /**
   * Scan variable substitution: ${{name}}, ${{user.name | filter}}
   */
  private scanVariable(): void {
    const startLine = this.line;
    const startColumn = this.column;

    // Consume ${{
    this.advance(3);

    let content = "";
    while (this.pos < this.template.length) {
      if (this.peek() === "}" && this.peek(1) === "}") {
        // Found closing }}
        this.advance(2);
        this.tokens.push({
          type: TokenType.VARIABLE,
          value: content.trim(),
          line: startLine,
          column: startColumn,
        });
        return;
      }
      content += this.current();
      this.advance();
    }

    // Unclosed variable
    throw new SyntaxError(
      "Unclosed variable substitution ${{...}}",
      startLine,
      startColumn,
      "Add closing }}"
    );
  }

  /**
   * Scan template tag: {{IF}}, {{FOR}}, etc.
   */
  private scanTag(): void {
    const startLine = this.line;
    const startColumn = this.column;

    // Consume {{
    this.advance(2);

    const trimBefore = this.peek() === "-";
    if (trimBefore) this.advance();

    // Skip whitespace
    this.skipWhitespace();

    // Check for comment: {{# ... #}}
    if (this.peek() === "#") {
      this.scanComment(startLine, startColumn, trimBefore);
      return;
    }

    let content = this.scanUntilClosing();
    const trimAfter = content.endsWith("-");
    if (trimAfter) content = content.slice(0, -1);
    const trimmed = content.trim();

    // Parse keyword
    const keyword = this.extractKeyword(trimmed);
    const tokenType = this.getTokenType(keyword);

    if (tokenType === null) {
      throw new SyntaxError(
        `Unknown template tag: {{${keyword}}}`,
        startLine,
        startColumn,
        "Check syntax - valid tags: IF, CASE, FOR, TABLE, LIST, etc."
      );
    }

    if (
      trimmed !== keyword &&
      (keyword === "ELSE" || keyword === "RAW" || keyword.startsWith("END_"))
    ) {
      const isElseIf =
        keyword === "ELSE" && /^IF(\s|$)/i.test(trimmed.slice(4).trim());
      throw new SyntaxError(
        isElseIf
          ? "Invalid tag {{ELSE IF}}"
          : `Unexpected arguments in {{${keyword}}} tag`,
        startLine,
        startColumn,
        isElseIf
          ? "Use {{ELSEIF condition}} for an else-if branch"
          : `Use {{${keyword}}} with no arguments`
      );
    }

    if (tokenType === TokenType.END_RAW) {
      throw new SyntaxError(
        "Unexpected {{END_RAW}} without matching {{RAW}}",
        startLine,
        startColumn,
        "Check template structure"
      );
    }

    this.tokens.push({
      type: tokenType,
      value: trimmed,
      line: startLine,
      column: startColumn,
      trimBefore,
      trimAfter,
    });

    if (tokenType === TokenType.RAW) this.scanRaw(startLine, startColumn);
  }

  /**
   * Scan the literal content of a RAW block and its {{END_RAW}} closer
   */
  private scanRaw(startLine: number, startColumn: number): void {
    const contentLine = this.line;
    const contentColumn = this.column;
    let content = "";

    while (this.pos < this.template.length) {
      RAW_CLOSER.lastIndex = this.pos;
      if (RAW_CLOSER.test(this.template)) {
        if (content.length > 0) {
          this.tokens.push({
            type: TokenType.TEXT,
            value: content.replace(/\r\n/g, "\n"),
            line: contentLine,
            column: contentColumn,
          });
        }
        this.scanRawCloser();
        return;
      }
      content += this.current();
      this.advance();
    }

    throw new SyntaxError(
      `Unclosed RAW block starting at line ${startLine}`,
      startLine,
      startColumn,
      "Add {{END_RAW}}"
    );
  }

  /**
   * Scan {{END_RAW}}, with its optional trim markers
   */
  private scanRawCloser(): void {
    const line = this.line;
    const column = this.column;
    this.advance(2);
    const trimBefore = this.peek() === "-";
    const content = this.scanUntilClosing();
    this.tokens.push({
      type: TokenType.END_RAW,
      value: "END_RAW",
      line,
      column,
      trimBefore,
      trimAfter: content.endsWith("-"),
    });
  }

  /**
   * Scan comment: {{# comment text #}}
   */
  private scanComment(
    startLine: number,
    startColumn: number,
    trimBefore: boolean
  ): void {
    // Consume #
    this.advance();

    let content = "";
    while (this.pos < this.template.length) {
      const trimAfter = this.peek(1) === "-";
      const closer = trimAfter ? 1 : 0;
      if (
        this.peek() === "#" &&
        this.peek(1 + closer) === "}" &&
        this.peek(2 + closer) === "}"
      ) {
        // Found closing #}} or #-}}
        this.advance(3 + closer);
        this.tokens.push({
          type: TokenType.COMMENT,
          value: content,
          line: startLine,
          column: startColumn,
          trimBefore,
          trimAfter,
        });
        return;
      }
      content += this.current();
      this.advance();
    }

    throw new SyntaxError(
      "Unclosed comment {{# ... #}}",
      startLine,
      startColumn,
      "Add closing #}}"
    );
  }

  /**
   * Scan plain text (everything outside {{ }})
   */
  private scanText(): void {
    const startLine = this.line;
    const startColumn = this.column;
    let content = "";

    while (this.pos < this.template.length) {
      // Stop at template syntax
      if (this.peek() === "$" && this.peek(1) === "{" && this.peek(2) === "{") {
        break;
      }
      if (this.peek() === "{" && this.peek(1) === "{") {
        break;
      }
      if (this.peek() === "\\" && this.peek(1) === "{" && this.peek(2) === "{") {
        // \{{ is a literal {{
        content += "{{";
        this.advance(3);
        continue;
      }
      if (
        this.peek() === "\\" &&
        this.peek(1) === "\\" &&
        this.peek(2) === "{" &&
        this.peek(3) === "{"
      ) {
        // \\{{ is a literal backslash followed by an active tag
        content += "\\";
        this.advance(2);
        break;
      }
      content += this.current();
      this.advance();
    }

    if (content.length > 0) {
      const normalized = content.replace(/\r\n/g, "\n"); // Normalize CRLF -> LF
      this.tokens.push({
        type: TokenType.TEXT,
        value: normalized,
        line: startLine,
        column: startColumn,
      });
    }
  }

  /**
   * Scan until closing }}
   */
  private scanUntilClosing(): string {
    let content = "";
    let depth = 0;

    while (this.pos < this.template.length) {
      if (this.peek() === "{" && this.peek(1) === "{") {
        depth++;
        content += this.current();
        this.advance();
        content += this.current();
        this.advance();
      } else if (this.peek() === "}" && this.peek(1) === "}") {
        if (depth === 0) {
          // Found matching closing }}
          this.advance(2);
          return content;
        }
        depth--;
        content += this.current();
        this.advance();
        content += this.current();
        this.advance();
      } else {
        content += this.current();
        this.advance();
      }
    }

    throw new SyntaxError(
      "Unclosed tag {{...}}",
      this.line,
      this.column,
      "Add closing }}"
    );
  }

  /**
   * Extract keyword from tag content (e.g., "IF show" â†’ "IF")
   */
  private extractKeyword(content: string): string {
    const match = content.match(/^([A-Z_]+)/);
    return match ? match[1] : content;
  }

  /**
   * Map keyword to TokenType
   */
  private getTokenType(keyword: string): TokenType | null {
    return KEYWORDS[keyword] || null;
  }

  /**
   * Get current character
   */
  private current(): string {
    return this.template[this.pos];
  }

  /**
   * Peek ahead N characters
   */
  private peek(offset = 0): string {
    return this.template[this.pos + offset] || "";
  }

  /**
   * Advance position by N characters
   */
  private advance(count = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.pos >= this.template.length) break;

      if (this.template[this.pos] === "\n") {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.pos++;
    }
  }

  /**
   * Skip whitespace (but not newlines - preserve formatting)
   */
  private skipWhitespace(): void {
    while (this.pos < this.template.length && /[ \t]/.test(this.current())) {
      this.advance();
    }
  }
}
```

### core/src/analyze.ts

```
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { FILTER_REGISTRY, undeclaredParameterMessages } from "./filters";
import {
  conditionOperands,
  hasBareWhitespace,
  isMathExpression,
  mathVariableNames,
  parseLiteral,
} from "./expressions";
import {
  ASTNode,
  CaseNode,
  FenceNode,
  ForNode,
  IfNode,
  Limits,
  ListItemNode,
  ListNode,
  SectionNode,
  TableHeaderNode,
  TableNode,
  TableRowNode,
  VariableNode,
} from "./types";

export type UsageKind =
  | "output"
  | "if"
  | "elseif"
  | "case"
  | "for"
  | "list_item"
  | "table";

export interface VariableUsage {
  /** Root name, the part before the first dot */
  name: string;
  /** Distinct full paths read, in source order */
  paths: string[];
  /** Distinct constructs that read it, in source order */
  usedIn: UsageKind[];
  /** True when every read supplies a ?? default */
  optional: boolean;
  /** True when some read has no ?? default; always !optional */
  required: boolean;
}

export interface FilterUsage {
  name: string;
  count: number;
}

export interface AnalysisDiagnostic {
  code: string;
  message: string;
  line: number;
  column: number;
}

export type BlockKind =
  | "IF"
  | "CASE"
  | "FOR"
  | "LIST"
  | "TABLE"
  | "SECTION"
  | "FENCE";

export interface TemplateAnalysis {
  variables: VariableUsage[];
  filters: FilterUsage[];
  /** Count per block kind present in the template */
  blocks: Partial<Record<BlockKind, number>>;
  diagnostics: AnalysisDiagnostic[];
}

/** Nesting bound for analyze when the caller sets no maxDepth */
const ANALYZE_MAX_DEPTH = 256;

/**
 * Report the variables a template reads and the filters it applies, derived
 * from the parsed template. Loop item names (inside their loop) and
 * @-metadata are not inputs.
 */
export function analyze(
  template: string,
  options?: { limits?: Partial<Limits> }
): TemplateAnalysis {
  const ast = new Parser(new Lexer(template).tokenize(), {
    maxDepth: options?.limits?.maxDepth ?? ANALYZE_MAX_DEPTH,
    maxNodes: options?.limits?.maxNodes,
  }).parse();
  const walker = new Walker();
  walker.visitAll(ast.body);
  return walker.result();
}

interface Entry {
  paths: Set<string>;
  usedIn: Set<UsageKind>;
  allOptional: boolean;
}

class Walker {
  private entries = new Map<string, Entry>();
  private filterCounts = new Map<string, number>();
  private blocks: Partial<Record<BlockKind, number>> = {};
  private diagnostics: AnalysisDiagnostic[] = [];
  private scopes: string[] = [];
  private tableDepth = 0;

  result(): TemplateAnalysis {
    return {
      variables: Array.from(this.entries, ([name, entry]) => ({
        name,
        paths: Array.from(entry.paths),
        usedIn: Array.from(entry.usedIn),
        optional: entry.allOptional,
        required: !entry.allOptional,
      })),
      filters: Array.from(this.filterCounts, ([name, count]) => ({
        name,
        count,
      })),
      blocks: this.blocks,
      diagnostics: this.diagnostics,
    };
  }

  visitAll(nodes: ASTNode[]): void {
    for (const node of nodes) this.visit(node);
  }

  private visit(node: ASTNode): void {
    switch (node.type) {
      case "Variable":
        return this.visitVariable(node as VariableNode);
      case "If":
        this.countBlock("IF");
        return this.visitIf(node as IfNode, "if");
      case "Case":
        this.countBlock("CASE");
        return this.visitCase(node as CaseNode);
      case "For":
        this.countBlock("FOR");
        return this.visitFor(node as ForNode);
      case "List":
        this.countBlock("LIST");
        return this.visitAll((node as ListNode).items);
      case "ListItem":
        return this.visitListItem(node as ListItemNode);
      case "Table":
        this.countBlock("TABLE");
        return this.visitTable(node as TableNode);
      case "Section":
        this.countBlock("SECTION");
        return this.visitSection(node as SectionNode);
      case "Fence":
        this.countBlock("FENCE");
        return this.visitFence(node as FenceNode);
      case "Header":
      case "TableRow":
        return this.visitCells(node as TableHeaderNode | TableRowNode);
    }
  }

  private countBlock(kind: BlockKind): void {
    this.blocks[kind] = (this.blocks[kind] ?? 0) + 1;
  }

  private visitVariable(node: VariableNode): void {
    const kind: UsageKind = this.tableDepth > 0 ? "table" : "output";
    const text = node.path.join(".");

    if (isMathExpression(text)) {
      for (const name of mathVariableNames(text)) this.record(name, kind, false);
    } else {
      this.record(text, kind, node.defaultValue !== undefined);
    }

    for (const filter of node.filters ?? []) {
      const { name } = filter;
      this.filterCounts.set(name, (this.filterCounts.get(name) ?? 0) + 1);
      const definition = FILTER_REGISTRY.find((f) => f.name === name);
      if (!definition) {
        this.diagnostics.push({
          code: "unknown-filter",
          message: `Unknown filter: ${name}`,
          line: node.line,
          column: node.column,
        });
        continue;
      }
      for (const message of undeclaredParameterMessages(definition, filter)) {
        this.diagnostics.push({
          code: "type-error",
          message,
          line: node.line,
          column: node.column,
        });
      }
    }
  }

  private visitIf(node: IfNode, kind: "if" | "elseif"): void {
    let branch = node;
    let branchKind = kind;
    for (;;) {
      this.visitCondition(branch.condition, branchKind, branch);
      this.visitAll(branch.consequent);
      const { alternate } = branch;
      if (Array.isArray(alternate)) return this.visitAll(alternate);
      if (!alternate) return;
      branch = alternate;
      branchKind = "elseif";
    }
  }

  private visitCase(node: CaseNode): void {
    this.record(node.expression, "case", false);
    for (const when of node.cases) {
      const { match } = when;
      const items = match.kind === "list" ? match.items : [match.item];
      for (const item of items) {
        if (item.kind === "path") this.record(item.path.join("."), "case", false);
      }
      this.visitAll(when.body);
    }
    if (node.default) this.visitAll(node.default.body);
  }

  private visitFor(node: ForNode): void {
    this.record(node.iterable.join("."), "for", false);
    for (const arg of [node.limit, node.offset]) {
      if (arg?.kind === "path") this.record(arg.path.join("."), "for", false);
    }
    this.scopes.push(node.itemName);
    this.visitAll(node.body);
    this.scopes.pop();
    if (node.elseBody) this.visitAll(node.elseBody);
  }

  private visitSection(node: SectionNode): void {
    if (node.title.kind === "path") {
      this.record(node.title.path.join("."), "output", false);
    }
    this.visitAll(node.body);
  }

  private visitFence(node: FenceNode): void {
    if (node.lang?.kind === "path") {
      this.record(node.lang.path.join("."), "output", true);
    }
    this.visitAll(node.body);
  }

  private visitListItem(node: ListItemNode): void {
    if (node.condition) this.visitCondition(node.condition, "list_item", node);
    this.visitAll(node.content);
  }

  private visitTable(node: TableNode): void {
    if (node.header) this.visitCells(node.header);
    for (const row of node.rows) {
      // a FOR written directly in a TABLE reads its body as table cells
      this.tableDepth++;
      this.visit(row);
      this.tableDepth--;
    }
  }

  private visitCells(node: TableHeaderNode | TableRowNode): void {
    this.tableDepth++;
    for (const cell of node.cells) this.visitAll(cell);
    this.tableDepth--;
  }

  private visitCondition(
    condition: string,
    kind: UsageKind,
    at: ASTNode
  ): void {
    for (const operand of conditionOperands(condition)) {
      if (operand === "" || parseLiteral(operand) !== null) continue;
      if (hasBareWhitespace(operand)) {
        this.diagnostics.push({
          code: "unrecognized-condition",
          message: `Unrecognized condition: ${operand}`,
          line: at.line,
          column: at.column,
        });
        continue;
      }
      this.record(operand, kind, false);
    }
  }

  private record(path: string, kind: UsageKind, optional: boolean): void {
    const root = path.split(".")[0];
    if (root.startsWith("@") || this.scopes.includes(root)) return;

    let entry = this.entries.get(root);
    if (!entry) {
      entry = { paths: new Set(), usedIn: new Set(), allOptional: true };
      this.entries.set(root, entry);
    }
    entry.paths.add(path);
    entry.usedIn.add(kind);
    if (!optional) entry.allOptional = false;
  }
}
```

### core/src/types.ts

```
/**
 * Template value type - supports primitives, arrays, objects, and nested structures
 * Matches JSON structure for LLM output compatibility
 */
export type TemplateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | TemplateValue[]
  | { [key: string]: TemplateValue };

/**
 * Map of variable names to their values
 */
export type VariableMap = Map<string, TemplateValue>;

/**
 * Read-only variable lookup; a Map satisfies it, and so does a loop frame
 * over a parent lookup
 */
export interface VariableLookup {
  has(name: string): boolean;
  get(name: string): TemplateValue | undefined;
}

/**
 * Filter call structure
 */
export interface FilterCall {
  name: string;
  params: Record<string, string>;
}

/**
 * Token types for lexer
 */
export enum TokenType {
  TEXT = "TEXT",
  VARIABLE = "VARIABLE",
  IF = "IF",
  ELSEIF = "ELSEIF",
  ELSE = "ELSE",
  END_IF = "END_IF",
  CASE = "CASE",
  WHEN = "WHEN",
  END_WHEN = "END_WHEN",
  DEFAULT = "DEFAULT",
  END_DEFAULT = "END_DEFAULT",
  END_CASE = "END_CASE",
  FOR = "FOR",
  END_FOR = "END_FOR",
  LIST = "LIST",
  LIST_ITEM = "LIST_ITEM",
  END_LIST_ITEM = "END_LIST_ITEM",
  END_LIST = "END_LIST",
  TABLE = "TABLE",
  HEADER = "HEADER",
  END_HEADER = "END_HEADER",
  ROW = "ROW",
  END_ROW = "END_ROW",
  END_TABLE = "END_TABLE",
  RAW = "RAW",
  END_RAW = "END_RAW",
  SECTION = "SECTION",
  END_SECTION = "END_SECTION",
  FENCE = "FENCE",
  END_FENCE = "END_FENCE",
  COMMENT = "COMMENT",
  EOF = "EOF",
}

/**
 * Token with position tracking
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  /** A minus marker after the opening braces: trim all whitespace before the tag */
  trimBefore?: boolean;
  /** A minus marker before the closing braces: trim all whitespace after the tag */
  trimAfter?: boolean;
}

/**
 * Whitespace handling. With standaloneLines on, a line holding only block
 * tags and whitespace is removed together with its line break.
 */
export interface WhitespaceOptions {
  standaloneLines?: boolean;
}

/**
 * Base AST node with position tracking
 */
export interface ASTNode {
  type: string;
  line: number;
  column: number;
}

/**
 * Root program node
 */
export interface ProgramNode extends ASTNode {
  type: "Program";
  body: ASTNode[];
}

/**
 * Plain text node
 */
export interface TextNode extends ASTNode {
  type: "Text";
  content: string;
}

/**
 * Variable substitution node
 */
export interface VariableNode extends ASTNode {
  type: "Variable";
  path: string[];
  defaultValue?: string;
  filters?: FilterCall[];
}

/**
 * Ternary operator node
 */
export interface TernaryNode extends ASTNode {
  type: "Ternary";
  condition: string;
  trueValue: string | TernaryNode;
  falseValue: string | TernaryNode;
}

/**
 * Conditional node (IF/ELSEIF/ELSE)
 */
export interface IfNode extends ASTNode {
  type: "If";
  condition: string;
  consequent: ASTNode[];
  alternate: ASTNode[] | IfNode | null;
}

/**
 * CASE statement node
 */
export interface CaseNode extends ASTNode {
  type: "Case";
  expression: string;
  cases: WhenNode[];
  default: DefaultNode | null;
}

/**
 * WHEN clause in CASE
 */
export interface WhenNode extends ASTNode {
  type: "When";
  /** The text of the first matcher when it is a quoted text, otherwise "" */
  value: string;
  /** What the clause matches: a list of matchers or one comparison */
  match: WhenMatch;
  body: ASTNode[];
}

/**
 * One matcher of a WHEN: a literal (its text and whether it was written in
 * quotes) or a variable path
 */
export type WhenItem =
  | { kind: "literal"; text: string; quoted: boolean }
  | { kind: "path"; path: string[] };

/** The comparison operators a WHEN accepts */
export type WhenOperator = "==" | "!=" | ">" | "<" | ">=" | "<=";

/**
 * What a WHEN matches: any item of a list, or the CASE value compared with
 * one item
 */
export type WhenMatch =
  | { kind: "list"; items: WhenItem[] }
  | { kind: "comparison"; operator: WhenOperator; item: WhenItem };

/**
 * DEFAULT clause in CASE
 */
export interface DefaultNode extends ASTNode {
  type: "Default";
  body: ASTNode[];
}

/**
 * FOR loop node
 */
export interface ForNode extends ASTNode {
  type: "For";
  iterable: string[];
  itemName: string;
  body: ASTNode[];
  /** limit= argument, set only when written */
  limit?: ForWindowArg;
  /** offset= argument, set only when written */
  offset?: ForWindowArg;
  /** Body of the {{ELSE}} branch, set only when written */
  elseBody?: ASTNode[];
}

/**
 * A FOR window argument: a number written in the tag or a variable path
 */
export type ForWindowArg =
  | { kind: "literal"; value: number }
  | { kind: "path"; path: string[] };

/**
 * SECTION title: a quoted string or a variable path
 */
export type SectionTitle =
  | { kind: "literal"; text: string }
  | { kind: "path"; path: string[] };

/**
 * SECTION block: a markdown heading over its body, dropped when the body
 * renders empty
 */
export interface SectionNode extends ASTNode {
  type: "Section";
  title: SectionTitle;
  level: number;
  skipEmpty: boolean;
  body: ASTNode[];
}

/**
 * FENCE language: a quoted string or a variable path
 */
export type FenceLang =
  | { kind: "literal"; text: string }
  | { kind: "path"; path: string[] };

/**
 * FENCE block: its rendered body in a code fence longer than any backtick
 * run inside it
 */
export interface FenceNode extends ASTNode {
  type: "Fence";
  lang: FenceLang | null;
  body: ASTNode[];
}

/**
 * List container node
 */
export interface ListNode extends ASTNode {
  type: "List";
  items: ListChild[];
}

/**
 * A child of a LIST: an item, or a FOR or IF whose bodies hold more children
 * of the same kind
 */
export type ListChild = ListItemNode | ForNode | IfNode;

/**
 * List item node
 */
export interface ListItemNode extends ASTNode {
  type: "ListItem";
  content: ASTNode[];
  condition?: string;
  fallback?: string;
}

/**
 * Table node
 */
export interface TableNode extends ASTNode {
  type: "Table";
  header: TableHeaderNode | null;
  rows: TableChild[];
  hasHeader: boolean;
  alignment?: string[];
}

/**
 * A child of a TABLE: a row, or a FOR or IF that builds rows
 */
export type TableChild = TableRowNode | ForNode | IfNode;

/**
 * Table header node
 */
export interface TableHeaderNode extends ASTNode {
  type: "Header";
  cells: ASTNode[][];
}

/**
 * Table row node
 */
export interface TableRowNode extends ASTNode {
  type: "TableRow";
  cells: ASTNode[][];
}

/**
 * Comment node (removed from output)
 */
export interface CommentNode extends ASTNode {
  type: "Comment";
  content: string;
}

/**
 * Template metadata for debugging
 */
export interface TemplateMetadata {
  detected_variables: string[];
  mapped_variables: string[];
  missing_variables: string[];
  variable_count: number;
}

/**
 * Variable mappings from n8n node config
 */
export interface VariableMappingsCollection {
  mappings?: Array<{
    variableName: string;
    value: string;
  }>;
}

/**
 * Work limits for one render
 */
export interface Limits {
  maxIterations: number;
  maxOutputChars: number;
  maxDepth: number;
  maxNodes: number;
}

/**
 * Default limits: total FOR iterations across the render, output length,
 * and nesting of blocks
 */
export const DEFAULT_LIMITS: Limits = {
  maxIterations: 10000,
  maxOutputChars: 1000000,
  maxDepth: 32,
  maxNodes: 20000,
};

/**
 * The given limits, with every limit left out taking its default
 */
export function withDefaultLimits(limits?: Partial<Limits>): Limits {
  return {
    maxIterations: limits?.maxIterations ?? DEFAULT_LIMITS.maxIterations,
    maxOutputChars: limits?.maxOutputChars ?? DEFAULT_LIMITS.maxOutputChars,
    maxDepth: limits?.maxDepth ?? DEFAULT_LIMITS.maxDepth,
    maxNodes: limits?.maxNodes ?? DEFAULT_LIMITS.maxNodes,
  };
}

/**
 * One filter in the registry that render, spec and analyze all read.
 */
export interface FilterDefinition {
  name: string;
  params: string;
  description: string;
  paramNames: string[];
  apply(input: unknown, params: Record<string, string>): unknown;
}
```

### core/src/spec.ts

```
import { DEFAULT_LIMITS, Limits } from "./types";
import { listFilters } from "./filters";

export interface Spec {
  version: string;
  blocks: { name: string; closes?: string; args: string; description: string }[];
  filters: { name: string; params: string; description: string }[];
  operators: string[];
  limits: Limits;
  options: { name: string; default: string; description: string }[];
  syntax: { variable: string; comment: string; trim: string; escape: string };
}

const LANGUAGE_VERSION = "1.0";

const BLOCKS: Spec["blocks"] = [
  {
    name: "IF",
    closes: "END_IF",
    args: "condition",
    description: "Renders its body when the condition is true",
  },
  {
    name: "ELSEIF",
    args: "condition",
    description: "Inside IF: renders when earlier conditions were false and this one is true",
  },
  {
    name: "ELSE",
    args: "",
    description:
      "Inside IF: renders when every condition was false. Directly inside FOR: starts the empty branch, which renders when the loop renders no item",
  },
  {
    name: "CASE",
    closes: "END_CASE",
    args: "variable",
    description: "Renders the first WHEN that matches the variable, else DEFAULT",
  },
  {
    name: "WHEN",
    closes: "END_WHEN",
    args: 'value[, value...] | variable | operator value',
    description:
      'Inside CASE: renders when the CASE variable equals any value in a list ("a", "b"), equals another variable, or passes a comparison (== != > < >= <=) such as >= 10',
  },
  {
    name: "DEFAULT",
    closes: "END_DEFAULT",
    args: "",
    description: "Inside CASE: renders when no WHEN matched",
  },
  {
    name: "FOR",
    closes: "END_FOR",
    args: "array AS item [limit=N] [offset=N]",
    description:
      "Renders its body once per array element, with @index0, @index1, @first, @last, @notFirst, @notLast and @total (the number of items rendered). limit=N renders at most N items and offset=N skips the first N; each is a whole number or a variable path. {{ELSE}} inside the loop starts a branch that renders when no item does",
  },
  {
    name: "LIST",
    closes: "END_LIST",
    args: "",
    description:
      "A numbered list of LIST_ITEM entries; lists nest. FOR and IF (with ELSEIF and ELSE) inside it build items, numbered in one sequence",
  },
  {
    name: "LIST_ITEM",
    closes: "END_LIST_ITEM",
    args: '[condition] [| fallback="text"]',
    description:
      "Inside LIST: one numbered item, skipped or replaced by its fallback when the condition is false. Without END_LIST_ITEM it ends at the next item, END_LIST, END_FOR, ELSE, ELSEIF or END_IF",
  },
  {
    name: "TABLE",
    closes: "END_TABLE",
    args: '[align="left|center|right"]',
    description:
      "A markdown table of an optional HEADER and rows; ROW, FOR and IF (with ELSEIF and ELSE) build the rows, and align takes one alignment per column",
  },
  {
    name: "HEADER",
    closes: "END_HEADER",
    args: "",
    description: "Inside TABLE: header cells separated by |",
  },
  {
    name: "ROW",
    closes: "END_ROW",
    args: "",
    description:
      "Inside TABLE, or a FOR or IF that builds rows: row cells separated by |. Without END_ROW it ends at the next ROW, END_TABLE, END_FOR, ELSE, ELSEIF or END_IF",
  },
  {
    name: "SECTION",
    closes: "END_SECTION",
    args: '"Title" | path [level=1-6] [skip_empty=true|false]',
    description:
      "A markdown heading at level (default 2, clamped to 1-6), a blank line and the body with its leading and trailing blank lines trimmed; omitted entirely when the body renders empty, unless skip_empty=false keeps the heading",
  },
  {
    name: "FENCE",
    closes: "END_FENCE",
    args: '[lang="language" | lang=path]',
    description:
      "A code fence of at least three backticks, longer than any backtick run in the rendered body, with the optional language; one leading and one trailing line break of the body are removed",
  },
  {
    name: "RAW",
    closes: "END_RAW",
    args: "",
    description:
      "Outputs its content literally: tags, variables and comments inside are not interpreted",
  },
];

const OPTIONS: Spec["options"] = [
  {
    name: "standaloneLines",
    default: "true for render, false for resolveTemplate",
    description:
      "Removes a line holding only block tags and whitespace, with its line break; LIST, TABLE and their parts keep their own spacing",
  },
];

const OPERATORS = [
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "contains",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
  "isArray",
  "isNumber",
  "isObject",
  "isBoolean",
  "AND",
  "OR",
  "NOT",
  "in",
  "not in",
  "between",
  ".length",
];

/**
 * The template language: blocks, filters, condition operators, default
 * limits and syntax
 */
export function spec(): Spec {
  return {
    version: LANGUAGE_VERSION,
    blocks: BLOCKS.map((b) => ({ ...b })),
    filters: listFilters(),
    operators: [...OPERATORS],
    limits: { ...DEFAULT_LIMITS },
    options: OPTIONS.map((o) => ({ ...o })),
    syntax: {
      variable: "${{path.to.value ?? \"default\" | filter=arg}}",
      comment: "{{# comment #}}",
      trim: "{{- TAG}} trims whitespace before a tag and {{TAG -}} after it; comments take {{-# comment #-}}",
      escape: "\\{{ outputs {{ literally",
    },
  };
}
```

## Frozen tests (read-only)

These test files are shown as committed at 79dd65d571b4, the commit the contract is read at; the diff starts at base 02e8dc84b503, so a file added or changed since then is in the diff too. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/language/set.test.ts (frozen)

````
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { TemplateError } from "../../core/src";
import { analyze } from "../../core/src/analyze";
import { KEYWORDS } from "../../core/src/lexer";
import { render, validate } from "../../core/src/render";
import { resolveTemplate } from "../../core/src/resolve";
import { spec } from "../../core/src/spec";
import { Limits } from "../../core/src/types";
import { runGoldenCases } from "../golden/harness";
import { check } from "../headless/http-helpers";

// {{SET name = expression}} binds a block-scoped local from the value evaluator that ${{ }} uses. Every row below runs in
// all four entries (render and resolve, strict and lenient) unless it names its own. Ids: st-set st-math st-scope
// st-null st-names st-single st-ws st-analyze st-keywords st-size st-openapi st-compat.

type Entry = "render-strict" | "render-lenient" | "resolve-strict" | "resolve-lenient";
const ENTRIES: Entry[] = ["render-strict", "render-lenient", "resolve-strict", "resolve-lenient"];
const RENDER: Entry[] = ["render-strict", "render-lenient"];
const RESOLVE: Entry[] = ["resolve-strict", "resolve-lenient"];

interface Outcome {
  /** "ok" or the diagnostic code; "threw:<name>" for an exception that is not a TemplateError */
  code: string;
  line?: number;
  column?: number;
  message?: string;
  output?: string;
  iterations?: number;
}

type RunOptions = Record<string, any>;

function run(entry: Entry, template: string, data: Record<string, any>, limits?: Partial<Limits>, opts?: RunOptions): Outcome {
  const strictMode = entry.endsWith("strict");
  try {
    if (entry.startsWith("render")) {
      const r = render(template, data, { strictMode, limits, ...opts });
      if (r.ok) return { code: "ok", output: r.output, iterations: r.stats.iterations };
      const d = r.diagnostics[0] as any;
      return { code: d.code, line: d.line, column: d.column, message: d.message, output: r.output, iterations: r.stats.iterations };
    }
    const out = resolveTemplate(template, new Map(Object.entries(data)), { strictMode, limits, ...opts });
    return { code: "ok", output: out };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, message: e.message };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}`, message: String((e as Error)?.message) };
  }
}

/** validate and analyze reported as one outcome; a TemplateError thrown by analyze counts as its diagnostic. */
function runStatic(kind: "validate" | "analyze", template: string): Outcome {
  try {
    if (kind === "validate") {
      const r = validate(template);
      if (r.ok) return { code: "ok" };
      const d = (r.diagnostics.find((x) => x.severity === "error") ?? r.diagnostics[0]) as any;
      return { code: d.code, line: d.line, column: d.column, message: d.message };
    }
    const a = analyze(template);
    const d = a.diagnostics[0] as any;
    if (!d) return { code: "ok" };
    return { code: d.code, line: d.line, column: d.column, message: d.message };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, message: e.message };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}` };
  }
}

/** analyze, with a thrown TemplateError turned into a failed assertion that says what was thrown. */
function analyzed(tpl: string) {
  try {
    return analyze(tpl);
  } catch (e) {
    check(`${(e as any)?.code}: ${(e as Error)?.message}`, `analyze accepts ${JSON.stringify(tpl)}`).toBe("ok");
    throw e;
  }
}

/** resolveTemplate, with a thrown TemplateError turned into a failed assertion that says what was thrown. */
function resolved(tpl: string, data: Map<string, any>, options: RunOptions): string {
  try {
    return resolveTemplate(tpl, data, options);
  } catch (e) {
    check(`${(e as any)?.code}: ${(e as Error)?.message}`, `resolveTemplate renders ${JSON.stringify(tpl)}`).toBe("ok");
    throw e;
  }
}

type Want = { out: string } | { err: string; line: number; col: number; has?: string; lacks?: string };
type Wants = Want | { strict: Want; lenient: Want };
const OUT = (out: string): Want => ({ out });
const ERR = (err: string, line: number, col: number, has?: string, lacks?: string): Want => ({ err, line, col, has, lacks });
const SL = (strict: Want, lenient: Want): Wants => ({ strict, lenient });
const pick = (w: Wants, entry: Entry): Want => ("strict" in w ? (entry.endsWith("strict") ? w.strict : w.lenient) : w);

interface Row {
  name: string;
  tpl: string;
  data: Record<string, any>;
  want: Wants;
  entries?: Entry[];
  limits?: Partial<Limits>;
  opts?: RunOptions;
}

function verifyOutcome(o: Outcome, want: Want, label: string): void {
  if ("err" in want) {
    check(o.code, `${label}: expects the error ${want.err} (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe(want.err);
    check({ line: o.line, column: o.column }, `${label}: located at ${want.line}:${want.col}`).toEqual({ line: want.line, column: want.col });
    if (want.has) check(o.message ?? "", `${label}: the message holds ${JSON.stringify(want.has)}`).toContain(want.has);
    if (want.lacks) check((o.message ?? "").includes(want.lacks), `${label}: the message is not ${JSON.stringify(want.lacks)}, the tag is known (got ${o.message ?? ""})`).toBe(false);
    return;
  }
  check(o.code, `${label}: renders without an error (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe("ok");
  check(o.output, `${label}: renders ${JSON.stringify(want.out)}`).toBe(want.out);
}

function verify(entry: Entry, r: Row, id: string): void {
  const o = run(entry, r.tpl, r.data, r.limits, r.opts);
  verifyOutcome(o, pick(r.want, entry), `${id} [${entry}] ${r.name}`);
}

function expand(rows: Row[]) {
  return rows.flatMap((r) => (r.entries ?? ENTRIES).map((entry) => ({ entry, r, name: r.name })));
}

/** A hand-written row with a § in the template at the place where the error is located. */
function marked(tplMarked: string): { tpl: string; line: number; col: number } {
  const i = tplMarked.indexOf("§");
  const before = tplMarked.slice(0, i);
  return { tpl: tplMarked.replace("§", ""), line: before.split("\n").length, col: before.length - (before.lastIndexOf("\n") + 1) + 1 };
}

// ---- data: the probe data of the unmodified code, plus a few names for the scope rows ----

const cyc: any = {};
cyc.self = cyc;
const big = BigInt(5);
const PROBE: Record<string, any> = {
  a: "A", b: 2, n: 5, zero: 0, f: false, nul: null, empty: "", s: "hello world", xs: ["b", "a", "b"],
  o: { k: "v", n: { d: 1 } }, cyc, big, long: "x".repeat(30), price: 0.1, q: 0.2, items: [{ n: "x" }, { n: "y" }],
};
const DATA: Record<string, any> = { ...PROBE, t: true, e: [], ys: ["p", "q"] };

function row(name: string, tpl: string, want: Wants, extra: Partial<Row> = {}): Row {
  return { name, tpl, want, ...extra, data: { ...DATA, ...(extra.data ?? {}) } };
}
/** An error located at the § mark in strict mode; lenient gives `lenient` ("same" keeps the error). */
function mrow(name: string, tplMarked: string, code: string, has: string | undefined, lenient: string | "same", extra: Partial<Row> = {}): Row {
  const m = marked(tplMarked);
  const err = ERR(code, m.line, m.col, has);
  return { name, tpl: m.tpl, data: DATA, want: SL(err, lenient === "same" ? err : OUT(lenient)), ...extra };
}
/** A name read where it is no longer (or not yet) bound: a missing variable in strict mode, empty in lenient mode. */
function leak(name: string, tplMarked: string, lenientOut: string, extra: Partial<Row> = {}): Row {
  return mrow(name, tplMarked, "missing-variable", "'x'", lenientOut, extra);
}
/** The error is the same in every mode. */
function always(name: string, tplMarked: string, code: string, has?: string, extra: Partial<Row> = {}): Row {
  return mrow(name, tplMarked, code, has, "same", extra);
}

function goldenCase(name: string): { count: number; message: string } {
  const casesDir = path.join(__dirname, "..", "golden", "render-cases");
  const only = fs.mkdtempSync(path.join(os.tmpdir(), "tr-gold-"));
  try {
    const src = path.join(casesDir, name);
    const dst = path.join(only, name);
    fs.mkdirSync(dst);
    for (const f of ["template.md", "data.json", "options.json", "expected.md"]) {
      check(fs.existsSync(path.join(src, f)), `the case folder ${name} holds ${f}`).toBe(true);
      fs.copyFileSync(path.join(src, f), path.join(dst, f));
    }
    const results = runGoldenCases(
      only,
      (template, data, options) => {
        const r = render(template, data, options);
        if (!r.ok) throw new Error(`render failed: ${r.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`);
        return r.output;
      },
      { update: false },
    );
    return { count: results.length, message: results[0]?.passed ? "" : (results[0]?.message ?? "no result") };
  } finally {
    fs.rmSync(only, { recursive: true, force: true });
  }
}

/** The message an unknown tag gives; a SET tag is known, so its syntax errors never say this. */
const UNKNOWN_TAG = "Unknown template tag";
const V = (expr: string) => "{{SET x = " + expr + "}}[${{x}}]";

// =====================================================================================
// st-set: the value is kept and the evaluator is the one of ${{ }}
// =====================================================================================

const VALUE_CASES: Array<[string, string]> = [
  // literals
  ['"text"', "[text]"],
  ["'text'", "[text]"],
  ['"a ?? b"', "[a ?? b]"],
  ['"a | b"', "[a | b]"],
  ['"a.b"', "[a.b]"],
  ['"a + b"', "[a + b]"],
  ['"a}b"', "[a}b]"],
  ['""', "[]"],
  ["5", "[5]"],
  ["-3", "[-3]"],
  ["1.50", "[1.5]"],
  ["0", "[0]"],
  ["true", "[true]"],
  ["false", "[false]"],
  ["null", "[]"],
  ['"a b" | upper', "[A B]"],
  ['"abcdef" | head=2', "[ab]"],
  ['"v" ?? "d"', "[v]"],
  ['"" ?? "d"', "[d]"],
  ['null ?? "d"', "[d]"],
  // paths
  ["a", "[A]"],
  ["b", "[2]"],
  ["zero", "[0]"],
  ["f", "[false]"],
  ["nul", "[]"],
  ["empty", "[]"],
  ["o.k", "[v]"],
  ["o.n.d", "[1]"],
  ["o.nope", "[]"],
  ["xs.1", "[a]"],
  ["xs.length", "[3]"],
  ["o", '[{"k":"v","n":{"d":1}}]'],
  ["xs", '[["b","a","b"]]'],
  // filters
  ["s | upper", "[HELLO WORLD]"],
  ["s | upper | head=5", "[HELLO]"],
  ["xs | sort", '[["a","b","b"]]'],
  ['xs | unique | join="-"', "[b-a]"],
  ["xs | length", "[3]"],
  ["o | json", '[{"k":"v","n":{"d":1}}]'],
  ["s | json", '["hello world"]'],
  // defaults
  ['missing ?? "d"', "[d]"],
  ['a ?? "d"', "[A]"],
  ['empty ?? "d"', "[d]"],
  ['zero ?? "d"', "[d]"],
  ['f ?? "d"', "[d]"],
  ['nul ?? "d"', "[d]"],
  // math that does not depend on the mode
  ["2 * 3", "[6]"],
  ["b + n", "[7]"],
  ["n / 2", "[2.5]"],
];
const SET_ROWS: Row[] = VALUE_CASES.map(([expr, out]) => row(`SET x = ${expr} binds the value and \${{x}} prints it`, V(expr), OUT(out)));

const KEPT_ROWS: Row[] = [
  row("an array stays an array: a FOR walks a SET of xs | sort", "{{SET l = xs | sort}}{{FOR l AS i}}${{i}}{{END_FOR}}", OUT("abb")),
  row("a FOR over a SET array takes limit, offset and @total of the array", "{{SET l = xs}}{{FOR l AS i limit=2 offset=1}}${{i}}${{@total}}{{END_FOR}}", OUT("a2b2")),
  row("an array of objects stays walkable", "{{SET l = items}}{{FOR l AS i}}${{i.n}}${{@index1}} {{END_FOR}}", OUT("x1 y2 ")),
  row("a SET of a SET: the second reads the array of the first", "{{SET l = xs}}{{SET m = l | length}}${{m}}", OUT("3")),
  row("a path into a SET array", "{{SET l = xs}}${{l.1}}${{l.length}}", OUT("a3")),
  row("a path into a SET object", "{{SET c = o}}${{c.k}}${{c.n.d}}", OUT("v1")),
  row("an object keeps its paths after a filter chain on another name", "{{SET c = o}}{{SET j = c | json}}${{j}}", OUT('{"k":"v","n":{"d":1}}')),
  row("a number stays a number in a condition", "{{SET c = n}}{{IF c > 3}}y{{ELSE}}n{{END_IF}}", OUT("y")),
  row("a boolean false stays false in a condition", "{{SET c = f}}{{IF c}}y{{ELSE}}n{{END_IF}}", OUT("n")),
  row("the literal true is true in a condition", "{{SET c = true}}{{IF c}}y{{ELSE}}n{{END_IF}}", OUT("y")),
  row("the literal null is false in a condition", "{{SET c = null}}{{IF c}}y{{ELSE}}n{{END_IF}}", OUT("n")),
  row("a SET of a present null is bound and false", "{{SET c = nul}}{{IF c}}y{{ELSE}}n{{END_IF}}[${{c}}]", OUT("n[]")),
  row("a SET number is compared as a number", "{{SET c = 2}}{{IF c == b}}y{{ELSE}}n{{END_IF}}", OUT("y")),
  row("SET x = x + 1 reads the old data value, then binds", "{{SET x = x + 1}}${{x}}", OUT("2"), { data: { x: 1 } }),
  row("SET x = x + 1 reads the earlier SET", "{{SET x = 1}}{{SET x = x + 1}}${{x}}", OUT("2")),
  row("SET x = x | upper reads the data text", "{{SET x = x | upper}}${{x}}", OUT("D"), { data: { x: "d" } }),
  row("a SET text is a plain text: it prints as it is", '{{SET x = "a|b"}}${{x}}', OUT("a|b")),
  row("binding a cyclic value with no filter is fine", "{{SET c = cyc}}[ok]", OUT("[ok]")),
  row("binding a BigInt with no filter is fine", "{{SET c = big}}[ok]", OUT("[ok]")),
  row("a BigInt through length binds a number", "{{SET c = big | length}}[${{c}}]", OUT("[1]")),
  always("a bound cyclic value printed later is the type-error of ${{cyc}}, at the printing tag", "a\n{{SET c = cyc}}x§${{c}}", "type-error"),
  always("a bound BigInt printed later is a type-error at the printing tag", "a\n{{SET c = big}}x§${{c}}", "type-error"),
  always("a bound cyclic value through json is the cyclic type-error at the printing tag", "a\n{{SET c = cyc}}x§${{c | json}}", "type-error", "cyclic"),
];

// The same pieces give the same code and message in SET x = <expr> as in ${{<expr>}}, located at the SET tag.
// codes: render strict, render lenient, resolve strict, resolve lenient
interface ExprCase {
  expr: string;
  codes: [string, string, string, string];
}
const MV = "missing-variable";
const UF = "unknown-filter";
const TE = "type-error";
const EXPR_CASES: ExprCase[] = [
  { expr: "missing", codes: [MV, "ok", MV, "ok"] },
  { expr: "missing.deep", codes: [MV, "ok", MV, "ok"] },
  { expr: "missing + 1", codes: [MV, "ok", MV, "ok"] },
  { expr: "n + missing", codes: [MV, "ok", MV, "ok"] },
  { expr: "a + 1", codes: [MV, "ok", MV, "ok"] },
  { expr: "s | nope", codes: [UF, UF, UF, UF] },
  { expr: "s | upper | nope", codes: [UF, UF, UF, UF] },
  { expr: "missing | nope", codes: [MV, UF, MV, UF] },
  { expr: "s | head=x", codes: [TE, TE, TE, TE] },
  { expr: "s | head", codes: [TE, TE, TE, TE] },
  { expr: "cyc | upper", codes: [TE, TE, TE, TE] },
  { expr: "big | upper", codes: [TE, TE, TE, TE] },
  { expr: "cyc | json", codes: [TE, TE, TE, TE] },
  { expr: "n / 0", codes: [TE, TE, "ok", "ok"] },
  { expr: "n % 0", codes: [TE, TE, "ok", "ok"] },
  { expr: "o.nope", codes: ["ok", "ok", "ok", "ok"] },
  { expr: "big | length", codes: ["ok", "ok", "ok", "ok"] },
];
const normalizeMessage = (m?: string) => (m ?? "").replace(/\(line \d+, col \d+\)/g, "(line L, col C)").replace(/\s+/g, " ").trim();

describe("st-set: SET binds a value from the evaluator of ${{ }}", () => {
  it.each(expand(SET_ROWS))("st-set: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-set"));
  it.each(expand(KEPT_ROWS))("st-set: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-set"));

  const exprCases = EXPR_CASES.flatMap((c) => ENTRIES.map((entry, i) => ({ entry, expr: c.expr, want: c.codes[i] })));
  it.each(exprCases)("st-set: [$entry] SET x = $expr gives the code, message and place of the same text in ${{ }}", (c) => {
    const printed = marked("a\n  §${{" + c.expr + "}}");
    const bound = marked("a\n  §{{SET x = " + c.expr + "}}[${{x}}]");
    const base = run(c.entry, printed.tpl, DATA);
    check(base.code, `[${c.entry}] \${{ ${c.expr} }} itself gives ${c.want}`).toBe(c.want);
    const o = run(c.entry, bound.tpl, DATA);
    check(o.code, `[${c.entry}] SET x = ${c.expr} gives ${c.want} (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe(c.want);
    if (c.want === "ok") return;
    check({ line: o.line, column: o.column }, `[${c.entry}] the error is located at the SET tag`).toEqual({ line: bound.line, column: bound.col });
    check(normalizeMessage(o.message), `[${c.entry}] the message is the one of \${{ ${c.expr} }}`).toBe(normalizeMessage(base.message));
  });

  it("st-set: validate and analyze accept a template made of SET tags", () => {
    for (const tpl of ["{{SET x = 1}}${{x}}", '{{SET x = "a" | upper}}', "{{IF t}}{{SET x = a ?? \"d\"}}{{END_IF}}", "{{SET x = 0.1 + 0.2}}"]) {
      check(runStatic("validate", tpl).code, `validate accepts ${tpl}`).toBe("ok");
      check(runStatic("analyze", tpl).code, `analyze accepts ${tpl}`).toBe("ok");
    }
  });
});

// =====================================================================================
// st-math: the number a SET binds in render is the number the output prints
// =====================================================================================

const MATH_ROWS: Row[] = [
  row("render: 0.1 + 0.2 binds 0.3 and prints it", "{{SET t = 0.1 + 0.2}}[${{t}}]", OUT("[0.3]"), { entries: RENDER }),
  row("render: the bound 0.3 equals the literal 0.3 in a condition", "{{SET t = 0.1 + 0.2}}{{IF t == 0.3}}y{{ELSE}}n{{END_IF}}", OUT("y"), { entries: RENDER }),
  row("render: price + q binds 0.3, prints and compares it", "{{SET t = price + q}}[${{t}}]{{IF t == 0.3}}y{{ELSE}}n{{END_IF}}", OUT("[0.3]y"), { entries: RENDER }),
  row("render: the SET prints what ${{0.1 + 0.2}} prints", "{{SET t = 0.1 + 0.2}}${{t}}|${{0.1 + 0.2}}", OUT("0.3|0.3"), { entries: RENDER }),
  row("render: a filter after math is ignored as before", "{{SET t = price + q | round=1}}[${{t}}]", OUT("[0.3]"), { entries: RENDER }),
  row("render: a default after math is ignored as before", '{{SET t = price + q ?? "d"}}[${{t}}]', OUT("[0.3]"), { entries: RENDER }),
  row("render: a bound result takes part in later math", "{{SET t = 0.1 + 0.2}}{{SET u = t + 1}}[${{u}}]", OUT("[1.3]"), { entries: RENDER }),
  row("resolve: 0.1 + 0.2 keeps the plain number", "{{SET t = 0.1 + 0.2}}[${{t}}]", OUT("[0.30000000000000004]"), { entries: RESOLVE }),
  row("resolve: the SET prints what ${{0.1 + 0.2}} prints", "{{SET t = 0.1 + 0.2}}${{t}}|${{0.1 + 0.2}}", OUT("0.30000000000000004|0.30000000000000004"), { entries: RESOLVE }),
  row("resolve: the plain bound number is not 0.3 in a condition", "{{SET t = price + q}}{{IF t == 0.3}}y{{ELSE}}n{{END_IF}}", OUT("n"), { entries: RESOLVE }),
  row("resolve: price + q keeps the plain number", "{{SET t = price + q}}[${{t}}]", OUT("[0.30000000000000004]"), { entries: RESOLVE }),
  row("resolve: a filter after math is ignored as before", "{{SET t = price + q | round=1}}[${{t}}]", OUT("[0.30000000000000004]"), { entries: RESOLVE }),
  row("an integer result is the same everywhere", "{{SET t = b + n}}[${{t}}]", OUT("[7]")),
  row("a division with a fraction", "{{SET t = n / 2}}[${{t}}]", OUT("[2.5]")),
  row("a product of two literals", "{{SET t = 2 * 3}}[${{t}}]", OUT("[6]")),
  row("a literal start with a path", "{{SET t = 2 * b}}[${{t}}]", OUT("[4]")),
];
const MATH_ERROR_ROWS: Row[] = [
  always("render: 1 / 0 is the divide-by-zero type-error at the SET", "a\n  §{{SET z = 1 / 0}}[${{z}}]", "type-error", "Cannot divide by zero", { entries: RENDER }),
  always("render: n / 0 is the divide-by-zero type-error at the SET", "a\n  §{{SET z = n / 0}}[${{z}}]", "type-error", "Cannot divide by zero", { entries: RENDER }),
  always("render: n % 0 is the remainder type-error at the SET", "a\n  §{{SET z = n % 0}}[${{z}}]", "type-error", "remainder", { entries: RENDER }),
  row("resolve: n / 0 binds the number ${{n / 0}} prints", "{{SET z = n / 0}}[${{z}}]", OUT("[Infinity]"), { entries: RESOLVE }),
  row("resolve: 1 / 0 binds the number ${{1 / 0}} prints", "{{SET z = 1 / 0}}[${{z}}]", OUT("[Infinity]"), { entries: RESOLVE }),
  row("resolve: n % 0 binds the number ${{n % 0}} prints", "{{SET z = n % 0}}[${{z}}]", OUT("[NaN]"), { entries: RESOLVE }),
  mrow("a math text with a missing name: strict missing-variable at the SET, lenient binds null", "a\n  §{{SET m = missing + 1}}[${{m}}]", MV, "missing + 1", "a\n  []"),
  mrow("a math text that is not a number is the same error as ${{a + 1}}", "a\n  §{{SET m = a + 1}}[${{m}}]", MV, "a + 1", "a\n  []"),
];

describe("st-math: the SET number is the number the output prints", () => {
  it.each(expand(MATH_ROWS))("st-math: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-math"));
  it.each(expand(MATH_ERROR_ROWS))("st-math: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-math"));
});

// =====================================================================================
// st-null: a missing value binds null in lenient mode and is an error in strict mode
// =====================================================================================

const NULL_ROWS: Row[] = [
  mrow("a missing name: strict error at the SET (never 1:1), lenient binds null and prints empty", "a\n  §{{SET x = missing}}[${{x}}]", MV, "'missing'", "a\n  []"),
  mrow("a missing name in a SET after other text keeps the SET position", "line one\nline two {{SET y = 1}}§{{SET x = missing}}[${{x}}]", MV, "'missing'", "line one\nline two []"),
  row("lenient: the bound null is not a missing variable and IF x is false", "{{SET x = missing}}{{IF x}}y{{ELSE}}n{{END_IF}}[${{x}}]", SL(ERR("missing-variable", 1, 1, "'missing'"), OUT("n[]"))),
  row("lenient: a bound null read again later is still found", "{{SET x = missing}}[${{x}}][${{x}}]{{SET y = x}}[${{y}}]", SL(ERR("missing-variable", 1, 1, "'missing'"), OUT("[][][]"))),
  row("SET x = missing ?? \"d\" binds d in every mode", '{{SET x = missing ?? "d"}}[${{x}}]', OUT("[d]")),
  mrow("a missing name with a filter: strict error, lenient binds null", "a\n  §{{SET x = missing | upper}}[${{x}}]", MV, "'missing'", "a\n  []"),
  mrow("a missing dotted name: strict error, lenient binds null", "a\n  §{{SET x = missing.deep}}[${{x}}]", MV, "'missing'", "a\n  []"),
  row("a present null is bound in every mode", "{{SET x = nul}}[${{x}}]{{IF x}}y{{ELSE}}n{{END_IF}}", OUT("[]n")),
  row("a present null takes the default", '{{SET x = nul}}{{SET y = x ?? "d"}}[${{y}}]', OUT("[d]")),
  row("a bound zero is printed and is not a default", '{{SET x = zero}}{{SET y = x}}[${{y}}]', OUT("[0]")),
  row("a bound empty text prints empty and takes a default", '{{SET x = empty}}[${{x}}]{{SET y = x ?? "d"}}[${{y}}]', OUT("[][d]")),
  row("a bound false prints false", "{{SET x = f}}[${{x}}]", OUT("[false]")),
  row("a missing leaf of a present object is empty, not an error", "{{SET x = o.k.zz}}[${{x}}]", OUT("[]")),
  row("a lenient null takes a default on the next SET", '{{SET x = missing}}{{SET y = x ?? "d"}}[${{y}}]', SL(ERR("missing-variable", 1, 1, "'missing'"), OUT("[d]"))),
  row("a SET x = x + 1 with no x: strict error at the SET naming the text, lenient null", "{{SET x = x + 1}}[${{x}}]", SL(ERR("missing-variable", 1, 1, "x + 1"), OUT("[]")), { data: {} }),
];

describe("st-null: missing values", () => {
  it.each(expand(NULL_ROWS))("st-null: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-null"));
});

// =====================================================================================
// st-scope: a SET lives from its tag to the end of its block
// =====================================================================================

const SCOPE_ROWS: Row[] = [
  // top level and data
  row("top level: visible from the tag on", V('"a"'), OUT("[a]")),
  row("a read before the tag is the data", '[${{x}}]{{SET x = "a"}}[${{x}}]', OUT("[D][a]"), { data: { x: "D" } }),
  leak("a read before the tag with no data is a missing name", '[§${{x}}]{{SET x = "a"}}[${{x}}]', "[][a]"),
  row("a SET shadows data of the same name", '{{SET x = "S"}}[${{x}}]', OUT("[S]"), { data: { x: "D" } }),
  row("rebinding in the same block overwrites", "{{SET x = 1}}{{SET x = 2}}[${{x}}]", OUT("[2]")),
  row("a SET of another name leaves the data name alone", '{{SET y = "S"}}[${{x}}]', OUT("[D]"), { data: { x: "D" } }),
  // IF, ELSEIF, ELSE
  row("IF: visible inside its branch", '{{IF t}}{{SET x = "i"}}[${{x}}]{{END_IF}}', OUT("[i]")),
  leak("IF: not visible after END_IF", '{{IF t}}{{SET x = "i"}}[${{x}}]{{END_IF}}[§${{x}}]', "[i][]"),
  leak("ELSEIF: not visible after END_IF", '{{IF f}}n{{ELSEIF b > 1}}{{SET x = "e"}}[${{x}}]{{END_IF}}[§${{x}}]', "[e][]"),
  leak("ELSE: not visible after END_IF", '{{IF f}}n{{ELSE}}{{SET x = "e"}}[${{x}}]{{END_IF}}[§${{x}}]', "[e][]"),
  leak("a branch SET is not visible in a sibling branch that renders", '{{IF f}}{{SET x = "i"}}{{ELSE}}[§${{x}}]{{END_IF}}', "[]"),
  row("a SET at the top is visible in the branch", '{{SET x = "T"}}{{IF t}}[${{x}}]{{END_IF}}', OUT("[T]")),
  row("a SET at the top is visible in an ELSE branch", '{{SET x = "T"}}{{IF f}}n{{ELSE}}[${{x}}]{{END_IF}}', OUT("[T]")),
  row("rebinding in a branch ends with the branch: the outer value is back", '{{SET x = "o"}}{{IF t}}{{SET x = "i"}}[${{x}}]{{END_IF}}[${{x}}]', OUT("[i][o]")),
  row("rebinding two blocks deep ends one block at a time", '{{SET x = "a"}}{{IF t}}{{SET x = "b"}}{{IF t}}{{SET x = "c"}}[${{x}}]{{END_IF}}[${{x}}]{{END_IF}}[${{x}}]', OUT("[c][b][a]")),
  row("rebinding in an ELSEIF branch ends with it", '{{SET x = "o"}}{{IF f}}n{{ELSEIF t}}{{SET x = "e"}}[${{x}}]{{ELSE}}{{SET x = "z"}}{{END_IF}}[${{x}}]', OUT("[e][o]")),
  row("an IF branch rebinding reads the outer value first", '{{SET x = "o"}}{{IF t}}{{SET x = x | upper}}[${{x}}]{{END_IF}}[${{x}}]', OUT("[O][o]")),
  row("a SET shadowing data in a branch leaves the data after the branch", '{{IF t}}{{SET x = "S"}}[${{x}}]{{END_IF}}[${{x}}]', OUT("[S][D]"), { data: { x: "D" } }),
  // CASE
  row("WHEN: visible inside its clause", '{{CASE b}}{{WHEN 2}}{{SET x = "w"}}[${{x}}]{{DEFAULT}}d{{END_CASE}}', OUT("[w]")),
  leak("WHEN: not visible after END_CASE", '{{CASE b}}{{WHEN 2}}{{SET x = "w"}}[${{x}}]{{DEFAULT}}d{{END_CASE}}[§${{x}}]', "[w][]"),
  row("DEFAULT: visible inside its clause", '{{CASE b}}{{WHEN 9}}n{{DEFAULT}}{{SET x = "d"}}[${{x}}]{{END_CASE}}', OUT("[d]")),
  leak("DEFAULT: not visible after END_CASE", '{{CASE b}}{{WHEN 9}}n{{DEFAULT}}{{SET x = "d"}}[${{x}}]{{END_CASE}}[§${{x}}]', "[d][]"),
  row("a SET at the top is visible in a clause", '{{SET x = "T"}}{{CASE b}}{{WHEN 2}}[${{x}}]{{END_CASE}}', OUT("[T]")),
  row("rebinding in a clause ends with the clause", '{{SET x = "o"}}{{CASE b}}{{WHEN 2}}{{SET x = "w"}}[${{x}}]{{END_CASE}}[${{x}}]', OUT("[w][o]")),
  // FOR
  row("a FOR body can read the loop item into a SET", "{{FOR xs AS i limit=2}}{{SET u = i | upper}}${{u}}{{END_FOR}}", OUT("BA")),
  row("a FOR body binds fresh each iteration: the read before the SET is the data every time", "{{FOR xs AS i}}[${{x}}]{{SET x = i}}[${{x}}]{{END_FOR}}", OUT("[D][b][D][a][D][b]"), { data: { x: "D" } }),
  leak("a FOR body binds fresh each iteration: iteration two does not see the SET of iteration one", "{{FOR xs AS i}}[§${{x}}]{{SET x = i}}{{END_FOR}}", "[][][]"),
  leak("a SET in a FOR body does not leak after END_FOR", "{{FOR xs AS i}}{{SET x = i}}{{END_FOR}}[§${{x}}]", "[]"),
  leak("the ELSE body of a FOR is its own block: a SET in it does not leak", '{{FOR e AS i}}b{{ELSE}}{{SET x = "z"}}[${{x}}]{{END_FOR}}[§${{x}}]', "[z][]"),
  row("a SET at the top is visible in every FOR iteration", '{{SET x = "T"}}{{FOR xs AS i limit=2}}[${{x}}${{i}}]{{END_FOR}}', OUT("[Tb][Ta]")),
  row("a SET at the top is visible in the ELSE body of a FOR", '{{SET x = "T"}}{{FOR e AS i}}b{{ELSE}}[${{x}}]{{END_FOR}}', OUT("[T]")),
  row("rebinding in a FOR body ends with each iteration", '{{SET x = "o"}}{{FOR xs AS i limit=2}}{{SET x = i}}[${{x}}]{{END_FOR}}[${{x}}]', OUT("[b][a][o]")),
  row("a SET in a nested FOR ends with the inner loop and the outer value is back", "{{FOR xs AS i limit=2}}{{SET x = i}}{{FOR ys AS j}}{{SET x = j}}[${{x}}]{{END_FOR}}[${{x}}]{{END_FOR}}", OUT("[p][q][b][p][q][a]")),
  row("the inner loop reads the SET of the outer loop", "{{FOR xs AS i limit=2}}{{SET x = i}}{{FOR ys AS j}}[${{x}}${{j}}]{{END_FOR}}{{END_FOR}}", OUT("[bp][bq][ap][aq]")),
  row("a SET in a FOR body does not clobber the loop name or its metadata", '{{FOR xs AS i limit=2}}{{SET y = "z"}}${{i}}${{@index0}}${{y}}{{END_FOR}}', OUT("b0za1z")),
  row("a SET can read the metadata of the loop", "{{FOR xs AS i limit=2}}{{SET k = @index1}}${{k}}{{END_FOR}}", OUT("12")),
  row("a SET named like a data name shadows it in the iteration only", '{{FOR xs AS i limit=1}}{{SET a = "S"}}${{a}}{{END_FOR}}${{a}}', OUT("SA")),
  row("a SET may take the name of a loop that has ended", '{{FOR xs AS i limit=1}}{{END_FOR}}{{SET i = "z"}}[${{i}}]', OUT("[z]")),
  row("a SET may take the loop name in the ELSE body", '{{FOR e AS i}}b{{ELSE}}{{SET i = "z"}}[${{i}}]{{END_FOR}}', OUT("[z]")),
  row("a SET may name the item of a different FOR in a sibling loop", '{{FOR xs AS i limit=1}}{{END_FOR}}{{FOR xs AS j limit=1}}{{SET i = "z"}}[${{i}}${{j}}]{{END_FOR}}', OUT("[zb]")),
  // LIST, SECTION, FENCE
  leak("a LIST_ITEM SET does not leak into the next item", '{{LIST}}{{LIST_ITEM}}{{SET x = "i"}}${{x}}{{END_LIST_ITEM}}{{LIST_ITEM}}[§${{x}}]{{END_LIST_ITEM}}{{END_LIST}}', "1. i\n2. []"),
  leak("a LIST_ITEM SET does not leak after END_LIST", '{{LIST}}{{LIST_ITEM}}{{SET x = "i"}}${{x}}{{END_LIST_ITEM}}{{END_LIST}}[§${{x}}]', "1. i[]"),
  row("a SET before a LIST is visible in its items", '{{SET x = "z"}}{{LIST}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_LIST}}', OUT("1. z")),
  row("a SET in the items a FOR builds is fresh for each item", "{{LIST}}{{FOR xs AS i limit=2}}{{LIST_ITEM}}{{SET u = i | upper}}${{u}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", OUT("1. B\n2. A")),
  leak("a SECTION SET does not leak after END_SECTION", '{{SECTION "T"}}{{SET x = "s"}}${{x}}{{END_SECTION}}[§${{x}}]', "## T\n\ns\n[]"),
  row("a SECTION body rebinding ends with the section", '{{SET x = "o"}}{{SECTION "T"}}{{SET x = "s"}}${{x}}{{END_SECTION}}[${{x}}]', OUT("## T\n\ns\n[o]")),
  leak("a FENCE SET does not leak after END_FENCE", '{{FENCE lang="js"}}{{SET x = "s"}}${{x}}{{END_FENCE}}[§${{x}}]', "```js\ns\n```\n[]"),
  row("a SET before a SECTION is visible in its body", '{{SET x = "z"}}{{SECTION "T"}}${{x}}{{END_SECTION}}', OUT("## T\n\nz\n")),
  // TABLE
  leak("a SET in a ROW cell does not leak into the next row", '{{TABLE}}{{ROW}}{{SET x = "c"}}${{x}}|1{{END_ROW}}{{ROW}}§${{x}}|2{{END_ROW}}{{END_TABLE}}', "| c | 1 |\n|  | 2 |"),
  leak("a SET in a HEADER cell does not leak into the rows", '{{TABLE}}{{HEADER}}{{SET x = "h"}}${{x}}|1{{END_HEADER}}{{ROW}}§${{x}}|2{{END_ROW}}{{END_TABLE}}', "| h | 1 |\n|:-----|:-----|\n|  | 2 |"),
  leak("a SET in a ROW cell does not leak after END_TABLE", '{{TABLE}}{{ROW}}{{SET x = "c"}}${{x}}|1{{END_ROW}}{{END_TABLE}}[§${{x}}]', "| c | 1 |[]"),
  row("a SET before a TABLE is visible in a row", '{{SET x = "z"}}{{TABLE}}{{ROW}}${{x}}|1{{END_ROW}}{{END_TABLE}}', OUT("| z | 1 |")),
  row("a SET in the rows a FOR builds is fresh for each row", "{{TABLE}}{{FOR xs AS i limit=2}}{{ROW}}{{SET u = i | upper}}${{u}}|${{@index1}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}", OUT("| B | 1 |\n| A | 2 |")),
  // a SET inside an item or a row is fine; before the LIST or TABLE too
  row("a SET inside a LIST_ITEM prints through ${{ }} of the same item", '{{LIST}}{{LIST_ITEM}}{{SET y = "i"}}${{y}}{{END_LIST_ITEM}}{{END_LIST}}', OUT("1. i")),
];

// scopes are Maps: names of the prototype chain are ordinary names
const PROTO_ROWS: Row[] = [
  row("SET __proto__ is an ordinary name", "{{SET __proto__ = 1}}[${{__proto__}}]", OUT("[1]")),
  row("SET constructor is an ordinary name", "{{SET constructor = 2}}[${{constructor}}]", OUT("[2]")),
  row("SET toString is an ordinary name", "{{SET toString = 3}}[${{toString}}]", OUT("[3]")),
  row("SET length is an ordinary name", "{{SET length = 4}}[${{length}}]", OUT("[4]")),
  row("SET hasOwnProperty is an ordinary name", "{{SET hasOwnProperty = 5}}[${{hasOwnProperty}}]", OUT("[5]")),
  row("a SET named like a prototype name shadows data of that name and the data is back after its block", "[${{constructor}}]{{IF t}}{{SET constructor = 2}}[${{constructor}}]{{END_IF}}[${{constructor}}]", OUT("[C][2][C]"), { data: { constructor: "C" } }),
  row("a read of a prototype name before any SET is still missing", "[${{toString}}]{{SET toString = 1}}[${{toString}}]", SL(ERR("missing-variable", 1, 2, "'toString'"), OUT("[][1]"))),
  row("a SET object does not expose the prototype chain through a path", "{{SET c = o}}[${{c.constructor}}][${{c.__proto__}}][${{c.toString}}]", OUT("[][][]")),
  row("the name of a SET does not reach the prototype of the data", '{{SET __proto__ = "p"}}[${{o.k}}][${{a}}]', OUT("[v][A]")),
];

describe("st-scope: visible from the tag to the end of the block", () => {
  it.each(expand(SCOPE_ROWS))("st-scope: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-scope"));
  it.each(expand(PROTO_ROWS))("st-scope: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-scope"));

  it.each(ENTRIES)("st-scope: [%s] a SET never writes the caller's data", (entry) => {
    const data: Record<string, any> = { x: "D", o: { k: 1 }, xs: ["a", "b"] };
    const copy = JSON.parse(JSON.stringify(data));
    const o1 = run(entry, '{{SET x = "S"}}{{SET y = "Y"}}{{FOR xs AS i}}{{SET x = i}}{{END_FOR}}[${{x}}]', data);
    check(o1.output, `[${entry}] the SET value is read`).toBe("[S]");
    check(data, `[${entry}] the data object is untouched`).toEqual(copy);
    check(Object.keys(data).sort(), `[${entry}] no name was added to the data object`).toEqual(["o", "x", "xs"]);
    const o2 = run(entry, "[${{x}}]", data);
    check(o2.output, `[${entry}] a second run with the same data sees the data again`).toBe("[D]");
  });

  it.each([true, false])("st-scope: resolveTemplate never writes the caller's Map (strictMode %s)", (strictMode) => {
    const m = new Map<string, any>([["x", "D"], ["xs", ["a", "b"]]]);
    const out = resolved('{{SET x = "S"}}{{SET y = "Y"}}{{FOR xs AS i}}{{SET x = i}}{{END_FOR}}[${{x}}${{y}}]', m, { strictMode });
    check(out, "the SET values are read").toBe("[SY]");
    check([...m.keys()], "the Map has the names it had").toEqual(["x", "xs"]);
    check(m.get("x"), "the Map keeps the data value").toBe("D");
    check(resolved("[${{x}}]", m, { strictMode }), "a second call with the same Map sees the data").toBe("[D]");
  });
});

// =====================================================================================
// st-names and st-single: where the name or the shape of the tag is wrong
// =====================================================================================

// every row is a syntax-error at the § mark in render, resolveTemplate, validate and analyze, in every mode
const SYNTAX_ROWS: Array<{ name: string; tplMarked: string; has?: string }> = [
  { name: "{{SET}} has no name", tplMarked: "§{{SET}}" },
  { name: "{{SET x}} has no value", tplMarked: "§{{SET x}}" },
  { name: "{{SET x =}} has an empty expression", tplMarked: "§{{SET x =}}" },
  { name: "{{SET = 1}} has no name", tplMarked: "§{{SET = 1}}" },
  { name: "{{SET x == 1}} is a comparison, not a bind", tplMarked: "§{{SET x == 1}}" },
  { name: "{{SET 1x = 2}} starts the name with a digit", tplMarked: "§{{SET 1x = 2}}" },
  { name: "{{SET a.b = 1}} names a path", tplMarked: "§{{SET a.b = 1}}" },
  { name: "{{SET @x = 1}} names a metadata name", tplMarked: "§{{SET @x = 1}}" },
  { name: "{{SET @index0 = 1}} names a metadata name", tplMarked: "§{{SET @index0 = 1}}" },
  { name: "{{SET my-var = 1}} has a dash in the name", tplMarked: "§{{SET my-var = 1}}" },
  { name: "{{SET x y = 1}} has two words as the name", tplMarked: "§{{SET x y = 1}}" },
  { name: "the tag is located after other text on its line", tplMarked: "a\n  b {{IF t}}§{{SET}}{{END_IF}}" },
  { name: "a tag with no name inside a branch that never renders is found at parse time", tplMarked: "{{IF f}}x{{ELSE}}y§{{SET = 1}}{{END_IF}}" },
  { name: "a metadata name inside a FOR whose ELSE body never runs is found at parse time", tplMarked: "{{FOR xs AS i}}a{{ELSE}}§{{SET @x = 1}}{{END_FOR}}" },
  { name: "the item name of the enclosing FOR is a live loop name", tplMarked: "{{FOR xs AS i}}§{{SET i = 1}}{{END_FOR}}" },
  { name: "a live loop name inside an IF in the FOR body", tplMarked: "{{FOR xs AS i}}{{IF t}}§{{SET i = 1}}{{END_IF}}{{END_FOR}}" },
  { name: "a live loop name in a branch that never renders", tplMarked: "{{FOR xs AS i}}{{IF f}}§{{SET i = 1}}{{END_IF}}{{END_FOR}}" },
  { name: "the item name of the outer FOR inside a nested FOR", tplMarked: "{{FOR xs AS i}}{{FOR ys AS j}}§{{SET i = 1}}{{END_FOR}}{{END_FOR}}" },
  { name: "the item name of the inner FOR", tplMarked: "{{FOR xs AS i}}{{FOR ys AS j}}§{{SET j = 1}}{{END_FOR}}{{END_FOR}}" },
  { name: "a live loop name inside a LIST_ITEM of a FOR", tplMarked: "{{LIST}}{{FOR xs AS i}}{{LIST_ITEM}}§{{SET i = 1}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}" },
  { name: "a live loop name inside a SECTION in the FOR body", tplMarked: '{{FOR xs AS i}}{{SECTION "T"}}§{{SET i = 1}}{{END_SECTION}}{{END_FOR}}' },
];

describe("st-names: the name of a SET", () => {
  const cases = SYNTAX_ROWS.map((s) => ({ ...s, ...marked(s.tplMarked) }));
  it.each(cases.flatMap((c) => ENTRIES.map((entry) => ({ entry, c }))))("st-names: [$entry] $c.name is a syntax-error at the tag", ({ entry, c }) => {
    const o = run(entry, c.tpl, DATA);
    verifyOutcome(o, ERR("syntax-error", c.line, c.col, undefined, UNKNOWN_TAG), `st-names [${entry}] ${c.name}`);
  });
  it.each(cases.flatMap((c) => (["validate", "analyze"] as const).map((kind) => ({ kind, c }))))("st-names: [$kind] $c.name is reported at the tag", ({ kind, c }) => {
    const o = runStatic(kind, c.tpl);
    verifyOutcome(o, ERR("syntax-error", c.line, c.col, undefined, UNKNOWN_TAG), `st-names [${kind}] ${c.name}`);
  });

  const valid: Row[] = [
    row("a SET may name the loop item of a FOR in the ELSE body", '{{FOR e AS i}}b{{ELSE}}{{SET i = "z"}}[${{i}}]{{END_FOR}}', OUT("[z]")),
    row("a SET may name the loop item after END_FOR", '{{FOR xs AS i limit=1}}{{END_FOR}}{{SET i = "z"}}[${{i}}]', OUT("[z]")),
    row("a SET may be named like a filter or a lower case keyword word", "{{SET set = 1}}{{SET upper = 3}}[${{set}}${{upper}}]", OUT("[13]")),
    row("a name may hold digits and underscores", '{{SET _a1_b2 = "v"}}[${{_a1_b2}}]', OUT("[v]")),
    row("a name may be one letter, upper case", '{{SET X = "v"}}[${{X}}]', OUT("[v]")),
    row("the name may be long", '{{SET ' + "n".repeat(60) + ' = "v"}}[${{' + "n".repeat(60) + "}}]", OUT("[v]")),
  ];
  it.each(expand(valid))("st-names: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-names"));
});

describe("st-single: a SET is one tag with no closer", () => {
  const unknown: Array<{ name: string; tplMarked: string; has: string }> = [
    { name: "{{END_SET}} is an unknown tag", tplMarked: "a\n  §{{END_SET}}", has: "Unknown template tag: {{END_SET}}" },
    { name: "{{END_SET}} after a SET is an unknown tag", tplMarked: '{{SET x = 1}}§{{END_SET}}', has: "Unknown template tag: {{END_SET}}" },
    { name: "{{set x = 1}} in lower case is an unknown tag", tplMarked: "a\n  §{{set x = 1}}", has: "Unknown template tag: {{set x = 1}}" },
  ];
  const cases = unknown.map((s) => ({ ...s, ...marked(s.tplMarked) }));
  it.each(cases.flatMap((c) => ENTRIES.map((entry) => ({ entry, c }))))("st-single: [$entry] $c.name", ({ entry, c }) => {
    verifyOutcome(run(entry, c.tpl, DATA), ERR("syntax-error", c.line, c.col, c.has), `st-single [${entry}] ${c.name}`);
  });
  it.each(cases.flatMap((c) => (["validate", "analyze"] as const).map((kind) => ({ kind, c }))))("st-single: [$kind] $c.name", ({ kind, c }) => {
    verifyOutcome(runStatic(kind, c.tpl), ERR("syntax-error", c.line, c.col, c.has), `st-single [${kind}] ${c.name}`);
  });

  const text: Row[] = [
    row("the words SET x = 1 outside a tag are plain text", "SET x = 1 and more", OUT("SET x = 1 and more")),
  ];
  it.each(expand(text))("st-single: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-single"));

  it.each(["{{SET x = 1}}", "{{SET x = 1}}\n", "a {{SET x = 1}} b"])("st-single: a SET needs no closer: %j is valid", (tpl) => {
    check(runStatic("validate", tpl).code, "validate accepts it").toBe("ok");
    check(runStatic("analyze", tpl).code, "analyze accepts it").toBe("ok");
    for (const entry of ENTRIES) check(run(entry, tpl, DATA).code, `[${entry}] renders it`).toBe("ok");
  });

  const listRows: Array<{ name: string; tplMarked: string; has: string }> = [
    { name: "a SET directly among LIST children", tplMarked: "{{LIST}}§{{SET x = 1}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}", has: "Unexpected token in LIST: SET" },
    { name: "a SET between two items", tplMarked: "{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}§{{SET x = 1}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_LIST}}", has: "Unexpected token in LIST: SET" },
    { name: "a SET directly among TABLE children", tplMarked: "{{TABLE}}§{{SET x = 1}}{{ROW}}a|b{{END_ROW}}{{END_TABLE}}", has: "Unexpected token in TABLE: SET" },
    { name: "a SET between a HEADER and a ROW", tplMarked: "{{TABLE}}{{HEADER}}h|i{{END_HEADER}}§{{SET x = 1}}{{ROW}}a|b{{END_ROW}}{{END_TABLE}}", has: "Unexpected token in TABLE: SET" },
    { name: "a SET in a FOR that builds items", tplMarked: "{{LIST}}{{FOR xs AS x}}§{{SET y = 1}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", has: "Unexpected token" },
    { name: "a SET in an IF that builds items", tplMarked: "{{LIST}}{{IF t}}§{{SET y = 1}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", has: "Unexpected token" },
    { name: "a SET in a FOR that builds rows", tplMarked: "{{TABLE}}{{IF t}}{{FOR xs AS x}}§{{SET y = 1}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", has: "Unexpected token" },
    { name: "a SET in an IF that builds rows", tplMarked: "{{TABLE}}{{IF t}}§{{SET y = 1}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", has: "Unexpected token" },
  ];
  const lcases = listRows.map((s) => ({ ...s, lacks: UNKNOWN_TAG, ...marked(s.tplMarked) }));
  it.each(lcases.flatMap((c) => ENTRIES.map((entry) => ({ entry, c }))))("st-single: [$entry] $c.name is a syntax-error at the tag", ({ entry, c }) => {
    verifyOutcome(run(entry, c.tpl, DATA), ERR("syntax-error", c.line, c.col, c.has, c.lacks), `st-single [${entry}] ${c.name}`);
  });
  it.each(lcases.flatMap((c) => (["validate", "analyze"] as const).map((kind) => ({ kind, c }))))("st-single: [$kind] $c.name is reported at the tag", ({ kind, c }) => {
    verifyOutcome(runStatic(kind, c.tpl), ERR("syntax-error", c.line, c.col, c.has, c.lacks), `st-single [${kind}] ${c.name}`);
  });
});

// =====================================================================================
// st-ws: SET is a standalone tag, takes trim markers and prints nothing
// =====================================================================================

const ON = { standaloneLines: true };
const OFF = { standaloneLines: false };
const WS_ROWS: Row[] = [
  row("a line holding only a SET vanishes with its line break", "a\n{{SET x = 1}}\nb\n", OUT("a\nb\n"), { opts: ON }),
  row("a SET line with indentation and trailing spaces vanishes", "a\n  {{SET x = 1}}  \nb", OUT("a\nb"), { opts: ON }),
  row("a line holding several SET tags vanishes", "a\n{{SET x = 1}}{{SET y = 2}}\nb\n", OUT("a\nb\n"), { opts: ON }),
  row("SET tags separated by a space on one line vanish", "a\n{{SET x = 1}} {{SET y = 2}}\n${{x}}${{y}}\n", OUT("a\n12\n"), { opts: ON }),
  row("two SET lines in a row vanish", "a\n{{SET x = 1}}\n{{SET y = 2}}\n${{x}}${{y}}", OUT("a\n12"), { opts: ON }),
  row("a SET at the start of the template on its own line vanishes", "{{SET x = 1}}\n${{x}}", OUT("1"), { opts: ON }),
  row("a SET on the last line without a line break vanishes", "a\n{{SET x = 1}}", OUT("a\n"), { opts: ON }),
  row("a SET with text on its line leaves the text", "a\n{{SET x = 1}}text\nb", OUT("a\ntext\nb"), { opts: ON }),
  row("a SET with text keeps the indentation and the space after it", "a\n  {{SET x = 1}} text\nb", OUT("a\n   text\nb"), { opts: ON }),
  row("a SET inside a FOR body on its own line leaves no blank line", "{{FOR xs AS i limit=2}}\n{{SET u = i | upper}}\n${{u}}\n{{END_FOR}}\n", OUT("B\nA\n"), { opts: ON }),
  row("a SET inside an IF branch on its own line keeps the indented text line", "{{IF t}}\n  {{SET x = 1}}\n  x=${{x}}\n{{END_IF}}\n", OUT("  x=1\n"), { opts: ON }),
  row("a CRLF template: the SET line vanishes with its CRLF", "a\r\n{{SET x = 1}}\r\nb\r\n${{x}}", OUT("a\nb\n1"), { opts: ON }),
  row("standaloneLines off: the line break of a SET line stays", "a\n{{SET x = 1}}\nb\n${{x}}", OUT("a\n\nb\n1"), { opts: OFF }),
  row("standaloneLines off: the indentation of a SET line stays", "a\n  {{SET x = 1}}\nb", OUT("a\n  \nb"), { opts: OFF }),
  row("a SET prints nothing between two texts", "[{{SET x = 1}}]", OUT("[]")),
  row("trim markers on both sides take the spaces around the SET", "a {{- SET x = 5 -}} b ${{x}}", OUT("ab 5"), { opts: ON }),
  row("trim markers on both sides take the spaces around the SET (standaloneLines off)", "a {{- SET x = 5 -}} b ${{x}}", OUT("ab 5"), { opts: OFF }),
  row("trim markers take the line breaks around the SET", "x \n{{- SET v = 1 -}}\n y ", OUT("xy "), { opts: ON }),
  row("trim markers take the line breaks around the SET (standaloneLines off)", "x \n{{- SET v = 1 -}}\n y ", OUT("xy "), { opts: OFF }),
  row("the right trim marker leaves the expression alone", "{{SET x = 5 -}}  \n  [${{x}}]", OUT("[5]"), { opts: OFF }),
  row("a SECTION whose body holds only a SET renders the heading with an empty body when it is kept", '{{SECTION "T" skip_empty=false}}{{SET v = 1}}{{END_SECTION}}z', OUT("## T\nz")),
  row("a SECTION whose body holds only a SET is omitted with skip_empty", '{{SECTION "T" skip_empty=true}}{{SET v = 1}}{{END_SECTION}}z', OUT("z")),
  row("a SECTION whose body holds only a SET is omitted by default", '{{SECTION "T"}}{{SET v = 1}}{{END_SECTION}}z', OUT("z")),
  row("a SECTION whose body holds a SET and text is kept", '{{SECTION "T"}}{{SET v = 1}}${{v}}{{END_SECTION}}z', OUT("## T\n\n1\nz")),
];

describe("st-ws: whitespace around a SET", () => {
  it.each(expand(WS_ROWS))("st-ws: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-ws"));
});

// =====================================================================================
// the limits a SET takes part in
// =====================================================================================

const SET1 = "{{SET x = 1}}";
const NODE_ROWS: Row[] = [
  row("five SET tags fit in maxNodes 5", SET1.repeat(5), OUT(""), { limits: { maxNodes: 5 } }),
  row("the sixth SET tag crosses maxNodes 5 and is located at its tag", SET1.repeat(6), ERR("limit-nodes", 1, 66), { limits: { maxNodes: 5 } }),
  row("a SET and a variable are two nodes and fit in 2", "{{SET x = 1}}${{x}}", OUT("1"), { limits: { maxNodes: 2 } }),
  row("a SET and a variable cross 1 at the variable", "{{SET x = 1}}${{x}}", ERR("limit-nodes", 1, 14), { limits: { maxNodes: 1 } }),
  row("a SET in an IF is the second node and fits in 2", "{{IF t}}{{SET x = 1}}{{END_IF}}", OUT(""), { limits: { maxNodes: 2 } }),
  row("a SET in an IF crosses 1 at the SET tag", "{{IF t}}{{SET x = 1}}{{END_IF}}", ERR("limit-nodes", 1, 9), { limits: { maxNodes: 1 } }),
  row("a SET on the second line is located on its line", "a\n  " + SET1 + SET1 + SET1, ERR("limit-nodes", 2, 29), { limits: { maxNodes: 3 } }),
  row("a SET in a branch that never renders still counts", "{{IF f}}{{SET x = 1}}{{END_IF}}", ERR("limit-nodes", 1, 9), { limits: { maxNodes: 1 } }),
  row("a SET adds no depth: a SET in an IF fits maxDepth 1", "{{IF t}}{{SET x = 1}}[${{x}}]{{END_IF}}", OUT("[1]"), { limits: { maxDepth: 1 } }),
  row("a SET adds no depth: two IFs still cross maxDepth 1 at the inner IF", "{{IF t}}{{IF t}}{{SET x = 1}}{{END_IF}}{{END_IF}}", ERR("limit-depth", 1, 9), { limits: { maxDepth: 1 } }),
  row("a SET adds no depth: two IFs and a SET fit maxDepth 2", "{{IF t}}{{IF t}}{{SET x = 1}}[${{x}}]{{END_IF}}{{END_IF}}", OUT("[1]"), { limits: { maxDepth: 2 } }),
  row("a SET inside a FOR counts the iterations of the FOR as before", "a\n  {{FOR xs AS i}}{{SET u = i}}{{END_FOR}}", ERR("limit-iterations", 2, 3), { limits: { maxIterations: 2 } }),
  row("a SET inside a FOR fits the iterations of the FOR", "{{FOR xs AS i}}{{SET u = i}}${{u}}{{END_FOR}}", OUT("bab"), { limits: { maxIterations: 3 } }),
];

describe("st-set: a SET takes part in the limits", () => {
  it.each(expand(NODE_ROWS))("st-set: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-set"));
  it("st-set: render counts one iteration per FOR iteration and none per SET", () => {
    const r = render("{{FOR xs AS i}}{{SET u = i}}{{SET w = u}}{{END_FOR}}", DATA, { strictMode: true });
    check(r.ok, `render is ok (${r.diagnostics.map((d) => d.code).join(",")})`).toBe(true);
    check(r.stats.iterations, "stats.iterations is the 3 iterations of the FOR").toBe(3);
  });
});

// =====================================================================================
// st-size: a text longer than maxOutputChars is a limit-output at its variable or SET
// =====================================================================================

const LONG60 = "0123456789".repeat(6);
const LONG50 = "0123456789".repeat(5);
const CHAIN = "{{SET a = a | json}}";
const SIZE_ROWS: Row[] = [
  // ${{ }} in the same evaluator: a text that shrinks again is still an error
  row("${{ }}: an intermediate text over the limit that shrinks later is a limit-output at the variable", "a\n  ${{long | upper | head=4}}", ERR("limit-output", 2, 3), { limits: { maxOutputChars: 20 } }),
  row("${{ }}: json then head over the limit is a limit-output at the variable", "a\n  ${{long | json | head=3}}", ERR("limit-output", 2, 3), { limits: { maxOutputChars: 20 } }),
  row("${{ }}: the same chain under the default limit renders", "a\n  ${{long | upper | head=4}}", OUT("a\n  XXXX")),
  row("${{ }}: a chain that grows past the limit is a limit-output at the variable", "a\n  ${{s | json | json | json}}", ERR("limit-output", 2, 3), { limits: { maxOutputChars: 20 } }),
  row("${{ }}: a chain that stays within the limit renders", "${{s | json | json}}", OUT('"\\"hello world\\""'), { limits: { maxOutputChars: 20 } }),
  row("${{ }}: a data text longer than the limit with no filter keeps the existing output check", "a\n  ${{long}}", ERR("limit-output", 2, 3), { limits: { maxOutputChars: 20 } }),
  row("${{ }}: a data text of exactly the limit renders", "${{long}}", OUT("x".repeat(30)), { limits: { maxOutputChars: 30 } }),
  // SET
  always("a literal longer than the limit is a limit-output at the SET", 'a\n  §{{SET x = "' + LONG60 + '"}}z', "limit-output", undefined, { limits: { maxOutputChars: 50 } }),
  row("a literal of exactly the limit binds", '{{SET x = "' + LONG50 + '"}}z', OUT("z"), { limits: { maxOutputChars: 50 } }),
  always("a data text longer than the limit is a limit-output at the SET", "a\n  §{{SET x = long}}z", "limit-output", undefined, { limits: { maxOutputChars: 20 } }),
  row("a data text of exactly the limit binds", "{{SET x = long}}z", OUT("z"), { limits: { maxOutputChars: 30 } }),
  always("a filter result longer than the limit is a limit-output at the SET", "a\n  §{{SET x = long | upper}}z", "limit-output", undefined, { limits: { maxOutputChars: 20 } }),
  always("a chain that shrinks again is a limit-output at the SET", "a\n  §{{SET x = long | upper | head=4}}z", "limit-output", undefined, { limits: { maxOutputChars: 20 } }),
  row("a short filter result binds", "{{SET x = s | upper}}z", OUT("z"), { limits: { maxOutputChars: 20 } }),
  row("an array over the limit in length is not an error", "{{SET l = xs}}z", OUT("z"), { limits: { maxOutputChars: 2 } }),
  row("an object over the limit in length is not an error", "{{SET l = o}}z", OUT("z"), { limits: { maxOutputChars: 2 } }),
  row("a FOR over a SET array longer than the limit in length is not an error", "{{SET l = items}}{{FOR l AS i}}${{i.n}}{{END_FOR}}", OUT("xy"), { limits: { maxOutputChars: 5 } }),
  row("a sort of an array is not measured", "{{SET l = xs | sort}}z", OUT("z"), { limits: { maxOutputChars: 2 } }),
  // the chain a SET a = a | json repeated cannot double a value without bound
  row("eleven json SETs in a row stay within 5000 characters", CHAIN.repeat(11) + "${{a | length}}", OUT("4095"), { data: { a: "x" }, limits: { maxOutputChars: 5000 } }),
  row("the twelfth json SET crosses 5000 characters and is located at its tag", CHAIN.repeat(12) + "${{a | length}}", ERR("limit-output", 1, 221), { data: { a: "x" }, limits: { maxOutputChars: 5000 } }),
  row("twelve json SETs fit a large limit", CHAIN.repeat(12) + "${{a | length}}", OUT("8191"), { data: { a: "x" }, limits: { maxOutputChars: 100000 } }),
  row("twelve json SETs in a FOR body are located at the crossing SET", "{{FOR r2 AS i}}" + CHAIN.repeat(12) + "{{END_FOR}}", ERR("limit-output", 1, 236), { data: { a: "x", r2: ["p", "q"] }, limits: { maxOutputChars: 5000 } }),
  row("a SET in a FOR with twelve iterations binds fresh each iteration: no growth carries across", "{{FOR r AS i}}" + CHAIN + "{{END_FOR}}[${{a}}]", OUT("[x]"), { data: { a: "x", r: Array.from({ length: 12 }, (_, i) => i) }, limits: { maxOutputChars: 50 } }),
  // the default limit is untouched by ordinary templates
  row("an ordinary chain of SETs under the default limit", "{{SET x = s | json | json | json}}${{x | length}}", OUT("25")),
  row("a SET of a long text under the default limit", "{{SET x = long | upper}}${{x | length}}", OUT("30")),
  // astral characters keep their length rule (UTF-16 units)
  row("astral: a literal with a filter within the limit binds", '{{SET x = "😀😀" | upper}}${{x | length}}', OUT("4"), { limits: { maxOutputChars: 4 } }),
  always("astral: a literal with a filter over the limit is a limit-output at the SET", 'a\n  §{{SET x = "😀😀😀" | upper}}${{x | length}}', "limit-output", undefined, { limits: { maxOutputChars: 4 } }),
  row("astral: a data text within the limit binds", "{{SET x = e2 | upper}}z", OUT("z"), { data: { e2: "😀😀" }, limits: { maxOutputChars: 4 } }),
  always("astral: a data text over the limit is a limit-output at the SET", "a\n  §{{SET x = e2 | upper}}z", "limit-output", undefined, { data: { e2: "😀😀😀" }, limits: { maxOutputChars: 4 } }),
  row("astral: the same text through ${{ }} within the limit", "${{e2 | upper}}", OUT("😀😀"), { data: { e2: "😀😀" }, limits: { maxOutputChars: 4 } }),
  row("astral: a chain through ${{ }} over the limit", "${{e2 | upper}}", ERR("limit-output", 1, 1), { data: { e2: "😀😀" }, limits: { maxOutputChars: 3 } }),
  row("astral: length of a bound astral text keeps the filter rule", '{{SET x = "😀😀"}}${{x | length}}', OUT("4")),
];

describe("st-size: the one evaluator measures a text", () => {
  it.each(expand(SIZE_ROWS))("st-size: [$entry] $name", ({ entry, r }) => verify(entry, r, "st-size"));
});

// =====================================================================================
// st-analyze
// =====================================================================================

interface AnalyzeRow {
  name: string;
  tpl: string;
  vars: Record<string, { usedIn: string[]; paths?: string[]; optional?: boolean }>;
  blocks: Record<string, number>;
  filters?: string[];
  diag?: string[];
}
const ANALYZE_ROWS: AnalyzeRow[] = [
  { name: "a variable read in a SET expression is kind set and the SET name is a local", tpl: "{{SET x = a}}${{x}}", vars: { a: { usedIn: ["set"], paths: ["a"], optional: false } }, blocks: {} },
  { name: "a SET name is a local in an IF, a FOR iterable and a CASE subject", tpl: "{{SET x = a}}{{IF x}}y{{END_IF}}{{FOR x AS i}}${{i}}{{END_FOR}}{{CASE x}}{{WHEN 1}}w{{END_CASE}}", vars: { a: { usedIn: ["set"] } }, blocks: { IF: 1, FOR: 1, CASE: 1 } },
  { name: "a read of the same name before the SET is an input", tpl: "${{x}}{{SET x = 1}}${{x}}", vars: { x: { usedIn: ["output"] } }, blocks: {} },
  { name: "a SET that reads its own name first makes it an input of kind set", tpl: "{{SET x = x + 1}}${{x}}", vars: { x: { usedIn: ["set"], paths: ["x"] } }, blocks: {} },
  { name: "a read after the block of the SET is an input", tpl: "{{IF t}}{{SET x = 1}}${{x}}{{END_IF}}${{x}}", vars: { t: { usedIn: ["if"] }, x: { usedIn: ["output"] } }, blocks: { IF: 1 } },
  { name: "a read in the sibling branch is an input", tpl: "{{IF t}}{{SET x = 1}}{{ELSE}}${{x}}{{END_IF}}", vars: { t: { usedIn: ["if"] }, x: { usedIn: ["output"] } }, blocks: { IF: 1 } },
  { name: "a read in the ELSE body of a FOR does not see the SET of the body", tpl: "{{FOR xs AS i}}{{SET x = 1}}{{ELSE}}${{x}}{{END_FOR}}", vars: { xs: { usedIn: ["for"] }, x: { usedIn: ["output"] } }, blocks: { FOR: 1 } },
  { name: "a nested block reads a name set in an outer block: not an input", tpl: "{{SET x = 1}}{{IF t}}${{x}}{{END_IF}}{{FOR xs AS i}}${{x}}{{END_FOR}}", vars: { t: { usedIn: ["if"] }, xs: { usedIn: ["for"] } }, blocks: { IF: 1, FOR: 1 } },
  { name: "a SET in a FOR body ends with the body", tpl: "{{FOR xs AS i}}{{SET u = i}}${{u}}{{END_FOR}}${{u}}", vars: { xs: { usedIn: ["for"] }, u: { usedIn: ["output"] } }, blocks: { FOR: 1 } },
  { name: "the loop name is still scoped and a SET may read it", tpl: "{{FOR xs AS i}}{{SET u = i.k}}${{u}}${{i}}{{END_FOR}}", vars: { xs: { usedIn: ["for"] } }, blocks: { FOR: 1 } },
  { name: "a SET of a SET reads a local: only the data name is an input", tpl: "{{SET x = a}}{{SET y = x}}[${{y}}]", vars: { a: { usedIn: ["set"] } }, blocks: {} },
  { name: "rebinding a name with its own value reads the local", tpl: "{{SET x = a}}{{SET x = x + 1}}", vars: { a: { usedIn: ["set"] } }, blocks: {} },
  { name: "a ?? default makes the read optional and the default text is not a read", tpl: '{{SET x = a ?? "d"}}', vars: { a: { usedIn: ["set"], paths: ["a"], optional: true } }, blocks: {} },
  { name: "a second read without a default makes the name required", tpl: '{{SET x = a ?? "d"}}${{a}}', vars: { a: { usedIn: ["set", "output"], optional: false } }, blocks: {} },
  { name: "a math expression records its names with kind set", tpl: "{{SET t = a + b}}", vars: { a: { usedIn: ["set"], paths: ["a"] }, b: { usedIn: ["set"], paths: ["b"] } }, blocks: {} },
  { name: "the paths of one root are listed once each", tpl: "{{SET x = o.k}}{{SET y = o.n.d}}{{SET z = o.k}}", vars: { o: { usedIn: ["set"], paths: ["o.k", "o.n.d"] } }, blocks: {} },
  { name: "filters in the expression are counted", tpl: "{{SET x = s | upper | head=3}}", vars: { s: { usedIn: ["set"] } }, blocks: {}, filters: ["head", "upper"] },
  { name: "filters on a literal are counted and read nothing", tpl: '{{SET x = "a" | upper}}', vars: {}, blocks: {}, filters: ["upper"] },
  { name: "an unknown filter in a SET is an unknown-filter diagnostic", tpl: "{{SET x = s | nope}}", vars: { s: { usedIn: ["set"] } }, blocks: {}, filters: ["nope"], diag: ["unknown-filter"] },
  { name: "a text literal reads nothing", tpl: '{{SET x = "a"}}${{x}}', vars: {}, blocks: {} },
  { name: "a number literal reads nothing", tpl: "{{SET x = 5}}{{SET y = true}}{{SET z = null}}", vars: {}, blocks: {} },
  { name: "SET is not counted in blocks", tpl: "{{SET p = 1}}{{SET q = 2}}{{IF t}}{{SET r = 3}}{{END_IF}}", vars: { t: { usedIn: ["if"] } }, blocks: { IF: 1 } },
  { name: "a SET in a LIST_ITEM reads data and its name ends with the item", tpl: "{{LIST}}{{LIST_ITEM}}{{SET u = a}}${{u}}{{END_LIST_ITEM}}{{LIST_ITEM}}${{u}}{{END_LIST_ITEM}}{{END_LIST}}", vars: { a: { usedIn: ["set"] }, u: { usedIn: ["output"] } }, blocks: { LIST: 1 } },
  { name: "a SET in a ROW cell reads data and its name ends with the row", tpl: "{{TABLE}}{{ROW}}{{SET u = a}}${{u}}|1{{END_ROW}}{{ROW}}${{u}}|2{{END_ROW}}{{END_TABLE}}", vars: { a: { usedIn: ["set"] }, u: { usedIn: ["table"] } }, blocks: { TABLE: 1 } },
  { name: "a SET in a SECTION ends with the section", tpl: '{{SECTION "T"}}{{SET u = a}}${{u}}{{END_SECTION}}${{u}}', vars: { a: { usedIn: ["set"] }, u: { usedIn: ["output"] } }, blocks: { SECTION: 1 } },
  { name: "a SET in a FENCE ends with the fence", tpl: '{{FENCE lang="js"}}{{SET u = a}}${{u}}{{END_FENCE}}${{u}}', vars: { a: { usedIn: ["set"] }, u: { usedIn: ["output"] } }, blocks: { FENCE: 1 } },
  { name: "a SET in a WHEN clause ends with the clause", tpl: "{{CASE b}}{{WHEN 1}}{{SET u = a}}${{u}}{{DEFAULT}}${{u}}{{END_CASE}}", vars: { b: { usedIn: ["case"] }, a: { usedIn: ["set"] }, u: { usedIn: ["output"] } }, blocks: { CASE: 1 } },
  { name: "a SET in an ELSEIF branch reads data", tpl: "{{IF t}}{{ELSEIF b}}{{SET x = a}}${{x}}{{END_IF}}", vars: { t: { usedIn: ["if"] }, b: { usedIn: ["elseif"] }, a: { usedIn: ["set"] } }, blocks: { IF: 1 } },
  { name: "a SET of an array name used as a FOR iterable reads the array only once", tpl: "{{SET l = xs}}{{FOR l AS i}}${{i}}{{END_FOR}}", vars: { xs: { usedIn: ["set"] } }, blocks: { FOR: 1 } },
  { name: "the usedIn kinds of one name are listed together", tpl: "{{SET x = a}}{{IF a}}y{{END_IF}}{{FOR a AS i}}z{{END_FOR}}${{a}}", vars: { a: { usedIn: ["set", "if", "for", "output"] } }, blocks: { IF: 1, FOR: 1 } },
];

describe("st-analyze: analyze follows the scope of a SET", () => {
  it.each(ANALYZE_ROWS)("st-analyze: $name", (row) => {
    const o = runStatic("analyze", row.tpl);
    check(row.diag ? "ok" : o.code, `analyze accepts the template (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe("ok");
    const a = analyzed(row.tpl);
    const used: Record<string, string[]> = {};
    for (const v of a.variables) used[v.name] = [...v.usedIn].sort();
    const want: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(row.vars)) want[k] = [...v.usedIn].sort();
    check(used, "the inputs and the kinds they are used in").toEqual(want);
    for (const [k, v] of Object.entries(row.vars)) {
      const found = a.variables.find((x) => x.name === k);
      if (v.paths) check(found?.paths, `${k}: the paths`).toEqual(v.paths);
      if (v.optional !== undefined) {
        check(found?.optional, `${k}: optional`).toBe(v.optional);
        check(found?.required, `${k}: required is the opposite of optional`).toBe(!v.optional);
      }
    }
    check(a.blocks, "the block counts").toEqual(row.blocks);
    check(a.filters.map((f) => f.name).sort(), "the filters used").toEqual([...(row.filters ?? [])].sort());
    check(a.diagnostics.map((d) => d.code), "the diagnostics").toEqual(row.diag ?? []);
  });

  it("st-analyze: a diagnostic of a SET is located at the SET tag", () => {
    const m = marked("a\n  §{{SET x = s | nope}}");
    const a = analyzed(m.tpl);
    check(a.diagnostics.map((d) => ({ code: d.code, line: d.line, column: d.column })), "unknown-filter at the SET").toEqual([{ code: "unknown-filter", line: m.line, column: m.col }]);
  });

  const agree: Array<{ name: string; tpl: string; data: Record<string, any>; input: string }> = [
    { name: "a name read only in a SET expression", tpl: "{{SET x = only_here | upper}}[${{x}}]", data: {}, input: "only_here" },
    { name: "a name read only in a SET inside an IF", tpl: "{{IF t}}{{SET x = only_here}}[${{x}}]{{END_IF}}", data: { t: true }, input: "only_here" },
    { name: "a name read only in a SET inside a FOR body", tpl: "{{FOR xs AS i limit=1}}{{SET x = only_here}}[${{x}}]{{END_FOR}}", data: { xs: ["a"] }, input: "only_here" },
    { name: "a name read after the block of a SET of the same name", tpl: "{{IF t}}{{SET only_here = 1}}{{END_IF}}[${{only_here}}]", data: { t: true }, input: "only_here" },
    { name: "a name read before the SET of the same name", tpl: "[${{only_here}}]{{SET only_here = 1}}", data: {}, input: "only_here" },
  ];
  it.each(agree.flatMap((a) => (["render", "resolve"] as const).map((m) => ({ m, ...a }))))("st-analyze: [$m] $name is an input that the run also asks for", (c) => {
    const names = analyzed(c.tpl).variables.map((v) => v.name);
    check(names, `analyze lists ${c.input} as an input`).toContain(c.input);
    const entry: Entry = c.m === "render" ? "render-strict" : "resolve-strict";
    const without = run(entry, c.tpl, c.data);
    check(without.code, `${c.m}: without ${c.input} the strict run asks for it`).toBe("missing-variable");
    check(without.message ?? "", `${c.m}: the missing name is ${c.input}`).toContain(c.input);
    check(run(entry, c.tpl, { ...c.data, [c.input]: "V" }).code, `${c.m}: with ${c.input} it renders`).toBe("ok");
  });

  it.each([
    { name: "a name set and read at the top", tpl: '{{SET x = "a"}}[${{x}}]{{IF x}}y{{END_IF}}', data: {} },
    { name: "a name set in a FOR body and read there", tpl: "{{FOR xs AS i}}{{SET u = i}}[${{u}}]{{END_FOR}}", data: { xs: ["a", "b"] } },
    { name: "a name set at the top and read in nested blocks", tpl: '{{SET x = "a"}}{{IF t}}{{FOR xs AS i}}[${{x}}${{i}}]{{END_FOR}}{{END_IF}}', data: { t: true, xs: ["a"] } },
  ])("st-analyze: $name is no input and the strict run needs no data for it", (c) => {
    const names = analyzed(c.tpl).variables.map((v) => v.name);
    for (const entry of ["render-strict", "resolve-strict"] as Entry[]) {
      const o = run(entry, c.tpl, c.data);
      check(o.code, `[${entry}] the strict run succeeds with only the listed inputs ${JSON.stringify(names)} (got ${o.code} ${o.message ?? ""})`).toBe("ok");
    }
    check(names.filter((n) => n === "x" || n === "u"), "the SET name is not an input").toEqual([]);
  });
});

// =====================================================================================
// st-keywords: the lexer reads its table by own property and exports it
// =====================================================================================

const OLD_PAIRS: Array<[string, string | undefined]> = [
  ["IF", "END_IF"], ["ELSEIF", undefined], ["ELSE", undefined], ["CASE", "END_CASE"], ["WHEN", "END_WHEN"], ["DEFAULT", "END_DEFAULT"],
  ["FOR", "END_FOR"], ["LIST", "END_LIST"], ["LIST_ITEM", "END_LIST_ITEM"], ["TABLE", "END_TABLE"], ["HEADER", "END_HEADER"],
  ["ROW", "END_ROW"], ["SECTION", "END_SECTION"], ["FENCE", "END_FENCE"], ["RAW", "END_RAW"],
];
const has = (k: string) => Object.prototype.hasOwnProperty.call(KEYWORDS, k);
/** The block list derived from the keyword table, as surfaces.test.ts derives it. */
const derivedPairs = (): Array<[string, string | undefined]> =>
  Object.keys(KEYWORDS)
    .filter((k) => !k.startsWith("END_"))
    .map((k): [string, string | undefined] => [k, has(`END_${k}`) ? `END_${k}` : undefined]);

describe("st-keywords: the keyword table", () => {
  const tags = ["constructor", "toString", "hasOwnProperty", "valueOf", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString"];
  const tagCases = tags.map((t) => ({ t, ...marked("a\n  §{{" + t + "}}") }));
  it.each(tagCases.flatMap((c) => ENTRIES.map((entry) => ({ entry, c }))))("st-keywords: [$entry] {{$c.t}} is an unknown tag", ({ entry, c }) => {
    verifyOutcome(run(entry, c.tpl, DATA), ERR("syntax-error", c.line, c.col, `Unknown template tag: {{${c.t}}}`), `st-keywords [${entry}] {{${c.t}}}`);
  });
  it.each(tagCases.flatMap((c) => (["validate", "analyze"] as const).map((kind) => ({ kind, c }))))("st-keywords: [$kind] {{$c.t}} is an unknown tag", ({ kind, c }) => {
    verifyOutcome(runStatic(kind, c.tpl), ERR("syntax-error", c.line, c.col, `Unknown template tag: {{${c.t}}}`), `st-keywords [${kind}] {{${c.t}}}`);
  });
  it.each(ENTRIES)("st-keywords: [%s] {{__proto__}} keeps its message", (entry) => {
    verifyOutcome(run(entry, "{{__proto__}}", DATA), ERR("syntax-error", 1, 1, "Unknown template tag: {{__}}"), `st-keywords [${entry}] {{__proto__}}`);
  });

  it("st-keywords: the lexer exports a keyword table with SET and with no END_SET", () => {
    check(typeof KEYWORDS, "KEYWORDS is exported").toBe("object");
    check(has("SET"), "SET is a keyword").toBe(true);
    check(has("END_SET"), "END_SET is not a keyword").toBe(false);
  });
  it("st-keywords: every END_<K> keyword has an opener K", () => {
    const orphans = Object.keys(KEYWORDS).filter((k) => k.startsWith("END_") && !has(k.slice(4)));
    check(orphans, "closers with no opener").toEqual([]);
  });
  it("st-keywords: the derived block table keeps today's rows and adds SET with no closer", () => {
    const got = new Map(derivedPairs());
    const want = new Map<string, string | undefined>([...OLD_PAIRS, ["SET", undefined]]);
    check([...got.entries()].sort(), "the openers with their closers").toEqual([...want.entries()].sort());
  });
  it("st-keywords: every opener in the table has a spec().blocks entry with the closer the table gives", () => {
    for (const [open, close] of derivedPairs()) {
      const block = spec().blocks.find((b) => b.name === open);
      check(block, `spec().blocks lists ${open}`).toBeDefined();
      check(block?.closes, `${open} closes with ${close ?? "nothing"}`).toBe(close);
    }
  });
  it("st-keywords: spec().blocks has no name outside the table", () => {
    const known = derivedPairs().map(([o]) => o);
    check(spec().blocks.map((b) => b.name).filter((n) => !known.includes(n)), "names outside the table").toEqual([]);
  });
  it("st-keywords: spec().blocks lists SET with its arguments, a description and no closes", () => {
    const set = spec().blocks.find((b) => b.name === "SET");
    check(set, "SET is listed").toBeDefined();
    check(set?.closes, "SET has no closer").toBeUndefined();
    check(set?.args, "SET shows its arguments").toBe("name = expression");
    check(/local/i.test(set?.description ?? "") && /block/i.test(set?.description ?? ""), `the description says it binds a local for the rest of its block: ${set?.description}`).toBe(true);
  });
});

// =====================================================================================
// st-openapi: usedIn is not a closed enum
// =====================================================================================

describe("st-openapi: the usedIn list names its kinds in a description", () => {
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "api", "openapi.json"), "utf8"));
  const found: any[] = [];
  const walk = (node: any) => {
    if (node && typeof node === "object") {
      if (node.properties && node.properties.usedIn) found.push(node.properties.usedIn);
      for (const v of Object.values(node)) walk(v);
    }
  };
  walk(doc);
  it("st-openapi: the document has the usedIn schema of an analysis variable", () => {
    check(found.length > 0, "a usedIn schema is in api/openapi.json").toBe(true);
  });
  it.each(found.map((f, i) => ({ i, f })))("st-openapi: usedIn #$i is an array of strings with no enum", ({ f }) => {
    check(f.type, "usedIn is an array").toBe("array");
    check(f.items?.type, "its items are strings").toBe("string");
    check(f.items && "enum" in f.items, "its items have no enum").toBe(false);
  });
  it.each(found.map((f, i) => ({ i, f })))("st-openapi: usedIn #$i describes the kinds, set among them", ({ f }) => {
    const text: string = `${f.items?.description ?? ""} ${f.description ?? ""}`;
    for (const kind of ["output", "if", "elseif", "case", "for", "list_item", "table", "set"]) {
      check(new RegExp(`\\b${kind}\\b`).test(text), `the description names ${kind}: ${JSON.stringify(text)}`).toBe(true);
    }
  });
});

// =====================================================================================
// golden case
// =====================================================================================

describe("st-set: golden case", () => {
  it("st-set: golden case lang-set renders to its expected file", () => {
    const g = goldenCase("lang-set");
    check(g.count, "one golden case ran").toBe(1);
    check(g.message, "the case renders to expected.md").toBe("");
  });
});

// =====================================================================================
// st-compat: templates that were valid keep their output (the unmodified code gives these outputs)
// =====================================================================================

// [name, template, maxOutputChars (0 = default), render strict, render lenient, resolve strict, resolve lenient]
// a result starting with ! is an error: !code@line:column
type Guard = [string, string, number, string, string, string, string];
const GUARDS: Guard[] = [
  ["plain","${{a}}",0,"A","A","A","A"],
  ["plain (maxOutputChars 20)","${{a}}",20,"A","A","A","A"],
  ["defMissing","${{missing ?? \"d\"}}",0,"d","d","d","d"],
  ["defMissing (maxOutputChars 20)","${{missing ?? \"d\"}}",20,"d","d","d","d"],
  ["defEmpty","${{empty ?? \"d\"}}",0,"d","d","d","d"],
  ["defEmpty (maxOutputChars 20)","${{empty ?? \"d\"}}",20,"d","d","d","d"],
  ["defZero","${{zero ?? \"d\"}}",0,"d","d","d","d"],
  ["defZero (maxOutputChars 20)","${{zero ?? \"d\"}}",20,"d","d","d","d"],
  ["defFalse","${{f ?? \"d\"}}",0,"d","d","d","d"],
  ["defFalse (maxOutputChars 20)","${{f ?? \"d\"}}",20,"d","d","d","d"],
  ["defNull","${{nul ?? \"d\"}}",0,"d","d","d","d"],
  ["defNull (maxOutputChars 20)","${{nul ?? \"d\"}}",20,"d","d","d","d"],
  ["missing","${{missing}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["missing (maxOutputChars 20)","${{missing}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["missingFilter","${{missing | upper}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["missingFilter (maxOutputChars 20)","${{missing | upper}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["nested","${{o.k}} ${{o.n.d}} ${{xs.1}}",0,"v 1 a","v 1 a","v 1 a","v 1 a"],
  ["nested (maxOutputChars 20)","${{o.k}} ${{o.n.d}} ${{xs.1}}",20,"v 1 a","v 1 a","v 1 a","v 1 a"],
  ["math","${{b + n}}",0,"7","7","7","7"],
  ["math (maxOutputChars 20)","${{b + n}}",20,"7","7","7","7"],
  ["mathFloat","${{price + q}}",0,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathFloat (maxOutputChars 20)","${{price + q}}",20,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathLit","${{0.1 + 0.2}}",0,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathLit (maxOutputChars 20)","${{0.1 + 0.2}}",20,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathDiv","${{n / 2}}",0,"2.5","2.5","2.5","2.5"],
  ["mathDiv (maxOutputChars 20)","${{n / 2}}",20,"2.5","2.5","2.5","2.5"],
  ["mathDivZero","${{n / 0}}",0,"!type-error@1:1","!type-error@1:1","Infinity","Infinity"],
  ["mathDivZero (maxOutputChars 20)","${{n / 0}}",20,"!type-error@1:1","!type-error@1:1","Infinity","Infinity"],
  ["mathMod0","${{n % 0}}",0,"!type-error@1:1","!type-error@1:1","NaN","NaN"],
  ["mathMod0 (maxOutputChars 20)","${{n % 0}}",20,"!type-error@1:1","!type-error@1:1","NaN","NaN"],
  ["mathFilter","${{price + q | round=1}}",0,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathFilter (maxOutputChars 20)","${{price + q | round=1}}",20,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathDefault","${{price + q ?? \"d\"}}",0,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathDefault (maxOutputChars 20)","${{price + q ?? \"d\"}}",20,"0.3","0.3","0.30000000000000004","0.30000000000000004"],
  ["mathMissing","${{missing + 1}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["mathMissing (maxOutputChars 20)","${{missing + 1}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["mathBad","${{a + 1}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["mathBad (maxOutputChars 20)","${{a + 1}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["upper","${{s | upper}}",0,"HELLO WORLD","HELLO WORLD","HELLO WORLD","HELLO WORLD"],
  ["upper (maxOutputChars 20)","${{s | upper}}",20,"HELLO WORLD","HELLO WORLD","HELLO WORLD","HELLO WORLD"],
  ["chain","${{s | upper | head=5}}",0,"HELLO","HELLO","HELLO","HELLO"],
  ["chain (maxOutputChars 20)","${{s | upper | head=5}}",20,"HELLO","HELLO","HELLO","HELLO"],
  ["join","${{xs | join=\", \"}}",0,"b, a, b","b, a, b","b, a, b","b, a, b"],
  ["join (maxOutputChars 20)","${{xs | join=\", \"}}",20,"b, a, b","b, a, b","b, a, b","b, a, b"],
  ["uniqueJoin","${{xs | unique | join=\"-\"}}",0,"b-a","b-a","b-a","b-a"],
  ["uniqueJoin (maxOutputChars 20)","${{xs | unique | join=\"-\"}}",20,"b-a","b-a","b-a","b-a"],
  ["json","${{o | json}}",0,"{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}"],
  ["json (maxOutputChars 20)","${{o | json}}",20,"!limit-output@1:1","!limit-output@1:1","!limit-output@1:1","!limit-output@1:1"],
  ["jsonStr","${{s | json}}",0,"\"hello world\"","\"hello world\"","\"hello world\"","\"hello world\""],
  ["jsonStr (maxOutputChars 20)","${{s | json}}",20,"\"hello world\"","\"hello world\"","\"hello world\"","\"hello world\""],
  ["length","${{xs | length}}",0,"3","3","3","3"],
  ["length (maxOutputChars 20)","${{xs | length}}",20,"3","3","3","3"],
  ["len2","${{xs.length}}",0,"3","3","3","3"],
  ["len2 (maxOutputChars 20)","${{xs.length}}",20,"3","3","3","3"],
  ["proto","${{__proto__}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["proto (maxOutputChars 20)","${{__proto__}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["ctor","${{constructor}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["ctor (maxOutputChars 20)","${{constructor}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["oCtor","${{o.constructor}}",0,"","","",""],
  ["oCtor (maxOutputChars 20)","${{o.constructor}}",20,"","","",""],
  ["oProto","${{o.__proto__}}",0,"","","",""],
  ["oProto (maxOutputChars 20)","${{o.__proto__}}",20,"","","",""],
  ["toStr","${{o.toString}}",0,"","","",""],
  ["toStr (maxOutputChars 20)","${{o.toString}}",20,"","","",""],
  ["cyclic","${{cyc}}",0,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["cyclic (maxOutputChars 20)","${{cyc}}",20,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["cyclicJson","${{cyc | json}}",0,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["cyclicJson (maxOutputChars 20)","${{cyc | json}}",20,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["bigint","${{big}}",0,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["bigint (maxOutputChars 20)","${{big}}",20,"!type-error@1:1","!type-error@1:1","!type-error@1:1","!type-error@1:1"],
  ["bigintLen","${{big | length}}",0,"1","1","1","1"],
  ["bigintLen (maxOutputChars 20)","${{big | length}}",20,"1","1","1","1"],
  ["nullPrint","[${{nul}}]",0,"[]","[]","[]","[]"],
  ["nullPrint (maxOutputChars 20)","[${{nul}}]",20,"[]","[]","[]","[]"],
  ["objPrint","${{o}}",0,"{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}","{\"k\":\"v\",\"n\":{\"d\":1}}"],
  ["objPrint (maxOutputChars 20)","${{o}}",20,"!limit-output@1:1","!limit-output@1:1","!limit-output@1:1","!limit-output@1:1"],
  ["arrPrint","${{xs}}",0,"[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]"],
  ["arrPrint (maxOutputChars 20)","${{xs}}",20,"[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]","[\"b\",\"a\",\"b\"]"],
  ["boolPrint","${{f}}",0,"false","false","false","false"],
  ["boolPrint (maxOutputChars 20)","${{f}}",20,"false","false","false","false"],
  ["forVar","{{FOR items AS i}}${{i.n}}${{@index1}} {{END_FOR}}",0,"x1 y2 ","x1 y2 ","x1 y2 ","x1 y2 "],
  ["forVar (maxOutputChars 20)","{{FOR items AS i}}${{i.n}}${{@index1}} {{END_FOR}}",20,"x1 y2 ","x1 y2 ","x1 y2 ","x1 y2 "],
  ["forMissingMeta","${{@index0}}",0,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["forMissingMeta (maxOutputChars 20)","${{@index0}}",20,"!missing-variable@1:1","","!missing-variable@1:1",""],
  ["forShadow","{{FOR items AS a}}${{a.n}}{{END_FOR}}${{a}}",0,"xyA","xyA","xyA","xyA"],
  ["forShadow (maxOutputChars 20)","{{FOR items AS a}}${{a.n}}{{END_FOR}}${{a}}",20,"xyA","xyA","xyA","xyA"],
  ["ifCond","{{IF b > 1}}y{{ELSE}}n{{END_IF}}",0,"y","y","y","y"],
  ["ifCond (maxOutputChars 20)","{{IF b > 1}}y{{ELSE}}n{{END_IF}}",20,"y","y","y","y"],
  ["longPlain","${{long}}",0,"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"],
  ["longPlain (maxOutputChars 20)","${{long}}",20,"!limit-output@1:1","!limit-output@1:1","!limit-output@1:1","!limit-output@1:1"],
  ["tagLower","{{set x = 1}}",0,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
  ["tagLower (maxOutputChars 20)","{{set x = 1}}",20,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
  ["tagEndSet","{{END_SET}}",0,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
  ["tagEndSet (maxOutputChars 20)","{{END_SET}}",20,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
  ["tagProto","{{__proto__}}",0,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
  ["tagProto (maxOutputChars 20)","{{__proto__}}",20,"!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1","!syntax-error@1:1"],
];

function guardWant(s: string): Want {
  if (!s.startsWith("!")) return OUT(s);
  const m = /^!([a-z-]+)@(\d+):(\d+)$/.exec(s) as RegExpExecArray;
  return ERR(m[1], Number(m[2]), Number(m[3]));
}

describe("st-compat: old templates keep their output", () => {
  const cases = GUARDS.flatMap((g) => ENTRIES.map((entry, i) => ({ entry, name: g[0], tpl: g[1], limit: g[2], want: g[3 + i] as string })));
  it.each(cases)("st-compat: [$entry] $name", ({ entry, tpl, limit, want, name }) => {
    const o = run(entry, tpl, PROBE, limit ? { maxOutputChars: limit } : undefined);
    verifyOutcome(o, guardWant(want), `st-compat [${entry}] ${name}`);
  });

  it.each(ENTRIES)("st-compat: [%s] the words SET x = 1 outside a tag are plain text", (entry) => {
    check(run(entry, "SET x = 1 and more", PROBE).output, "plain text").toBe("SET x = 1 and more");
  });
  it.each(ENTRIES)("st-compat: [%s] a data name read after a FOR with the same item name is the data again", (entry) => {
    check(run(entry, "{{FOR items AS a}}${{a.n}}{{END_FOR}}[${{a}}]", PROBE).output, "xy then A").toBe("xy[A]");
  });
});
````

## 4. Diff

7 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/api/openapi.json b/api/openapi.json
index 4d89d19..0f92c9f 100644
--- a/api/openapi.json
+++ b/api/openapi.json
@@ -461,17 +461,9 @@
                 },
                 "usedIn": {
                   "type": "array",
+                  "description": "The constructs that read the name: output, if, elseif, case, for, list_item, table, set (later call and input)",
                   "items": {
-                    "type": "string",
-                    "enum": [
-                      "output",
-                      "if",
-                      "elseif",
-                      "case",
-                      "for",
-                      "list_item",
-                      "table"
-                    ]
+                    "type": "string"
                   }
                 },
                 "optional": {
diff --git a/core/src/analyze.ts b/core/src/analyze.ts
index c56a91c..33233be 100644
--- a/core/src/analyze.ts
+++ b/core/src/analyze.ts
@@ -18,9 +18,11 @@ import {
   ListItemNode,
   ListNode,
   SectionNode,
+  SetNode,
   TableHeaderNode,
   TableNode,
   TableRowNode,
+  ValueExpr,
   VariableNode,
 } from "./types";
 
@@ -31,7 +33,8 @@ export type UsageKind =
   | "case"
   | "for"
   | "list_item"
-  | "table";
+  | "table"
+  | "set";
 
 export interface VariableUsage {
   /** Root name, the part before the first dot */
@@ -92,7 +95,7 @@ export function analyze(
     maxNodes: options?.limits?.maxNodes,
   }).parse();
   const walker = new Walker();
-  walker.visitAll(ast.body);
+  walker.visitBlock(ast.body);
   return walker.result();
 }
 
@@ -107,7 +110,8 @@ class Walker {
   private filterCounts = new Map<string, number>();
   private blocks: Partial<Record<BlockKind, number>> = {};
   private diagnostics: AnalysisDiagnostic[] = [];
-  private scopes: string[] = [];
+  /** Names bound so far in each enclosing block, innermost last: loop items and SET locals */
+  private scopes: Set<string>[] = [];
   private tableDepth = 0;
 
   result(): TemplateAnalysis {
@@ -132,10 +136,26 @@ class Walker {
     for (const node of nodes) this.visit(node);
   }
 
+  /**
+   * Visit the nodes of one block: names bound inside (the given ones, such as
+   * a loop item, and every SET from its tag on) end with it
+   */
+  visitBlock(nodes: ASTNode[], bound: string[] = []): void {
+    this.scopes.push(new Set(bound));
+    this.visitAll(nodes);
+    this.scopes.pop();
+  }
+
   private visit(node: ASTNode): void {
     switch (node.type) {
       case "Variable":
-        return this.visitVariable(node as VariableNode);
+        return this.visitValue(
+          node as VariableNode,
+          node as VariableNode,
+          this.tableDepth > 0 ? "table" : "output"
+        );
+      case "Set":
+        return this.visitSet(node as SetNode);
       case "If":
         this.countBlock("IF");
         return this.visitIf(node as IfNode, "if");
@@ -169,17 +189,27 @@ class Walker {
     this.blocks[kind] = (this.blocks[kind] ?? 0) + 1;
   }
 
-  private visitVariable(node: VariableNode): void {
-    const kind: UsageKind = this.tableDepth > 0 ? "table" : "output";
-    const text = node.path.join(".");
+  /**
+   * A SET reads its expression like an output does, then binds its name for
+   * the rest of the block
+   */
+  private visitSet(node: SetNode): void {
+    this.visitValue(node.value, node, "set");
+    this.scopes[this.scopes.length - 1].add(node.name);
+  }
+
+  /** Record the reads and filters of a value expression; diagnostics sit at `at` */
+  private visitValue(expr: ValueExpr, at: ASTNode, kind: UsageKind): void {
+    const text = expr.path.join(".");
 
-    if (isMathExpression(text)) {
+    // a literal first term reads nothing
+    if (!expr.literal && isMathExpression(text)) {
       for (const name of mathVariableNames(text)) this.record(name, kind, false);
-    } else {
-      this.record(text, kind, node.defaultValue !== undefined);
+    } else if (!expr.literal) {
+      this.record(text, kind, expr.defaultValue !== undefined);
     }
 
-    for (const filter of node.filters ?? []) {
+    for (const filter of expr.filters ?? []) {
       const { name } = filter;
       this.filterCounts.set(name, (this.filterCounts.get(name) ?? 0) + 1);
       const definition = FILTER_REGISTRY.find((f) => f.name === name);
@@ -187,8 +217,8 @@ class Walker {
         this.diagnostics.push({
           code: "unknown-filter",
           message: `Unknown filter: ${name}`,
-          line: node.line,
-          column: node.column,
+          line: at.line,
+          column: at.column,
         });
         continue;
       }
@@ -196,8 +226,8 @@ class Walker {
         this.diagnostics.push({
           code: "type-error",
           message,
-          line: node.line,
-          column: node.column,
+          line: at.line,
+          column: at.column,
         });
       }
     }
@@ -208,9 +238,9 @@ class Walker {
     let branchKind = kind;
     for (;;) {
       this.visitCondition(branch.condition, branchKind, branch);
-      this.visitAll(branch.consequent);
+      this.visitBlock(branch.consequent);
       const { alternate } = branch;
-      if (Array.isArray(alternate)) return this.visitAll(alternate);
+      if (Array.isArray(alternate)) return this.visitBlock(alternate);
       if (!alternate) return;
       branch = alternate;
       branchKind = "elseif";
@@ -225,9 +255,9 @@ class Walker {
       for (const item of items) {
         if (item.kind === "path") this.record(item.path.join("."), "case", false);
       }
-      this.visitAll(when.body);
+      this.visitBlock(when.body);
     }
-    if (node.default) this.visitAll(node.default.body);
+    if (node.default) this.visitBlock(node.default.body);
   }
 
   private visitFor(node: ForNode): void {
@@ -235,29 +265,27 @@ class Walker {
     for (const arg of [node.limit, node.offset]) {
       if (arg?.kind === "path") this.record(arg.path.join("."), "for", false);
     }
-    this.scopes.push(node.itemName);
-    this.visitAll(node.body);
-    this.scopes.pop();
-    if (node.elseBody) this.visitAll(node.elseBody);
+    this.visitBlock(node.body, [node.itemName]);
+    if (node.elseBody) this.visitBlock(node.elseBody);
   }
 
   private visitSection(node: SectionNode): void {
     if (node.title.kind === "path") {
       this.record(node.title.path.join("."), "output", false);
     }
-    this.visitAll(node.body);
+    this.visitBlock(node.body);
   }
 
   private visitFence(node: FenceNode): void {
     if (node.lang?.kind === "path") {
       this.record(node.lang.path.join("."), "output", true);
     }
-    this.visitAll(node.body);
+    this.visitBlock(node.body);
   }
 
   private visitListItem(node: ListItemNode): void {
     if (node.condition) this.visitCondition(node.condition, "list_item", node);
-    this.visitAll(node.content);
+    this.visitBlock(node.content);
   }
 
   private visitTable(node: TableNode): void {
@@ -272,7 +300,7 @@ class Walker {
 
   private visitCells(node: TableHeaderNode | TableRowNode): void {
     this.tableDepth++;
-    for (const cell of node.cells) this.visitAll(cell);
+    this.visitBlock(node.cells.flat()); // one block per row
     this.tableDepth--;
   }
 
@@ -298,7 +326,9 @@ class Walker {
 
   private record(path: string, kind: UsageKind, optional: boolean): void {
     const root = path.split(".")[0];
-    if (root.startsWith("@") || this.scopes.includes(root)) return;
+    if (root.startsWith("@") || this.scopes.some((scope) => scope.has(root))) {
+      return;
+    }
 
     let entry = this.entries.get(root);
     if (!entry) {
diff --git a/core/src/interpreter.ts b/core/src/interpreter.ts
index 7f17d83..295ad13 100644
--- a/core/src/interpreter.ts
+++ b/core/src/interpreter.ts
@@ -14,6 +14,8 @@ import {
   TernaryNode,
   SectionNode,
   FenceNode,
+  SetNode,
+  ValueExpr,
   VariableLookup,
   ForWindowArg,
   TemplateValue,
@@ -71,6 +73,7 @@ const KEEPS_RAW_INPUT = new Set([
  * - Filters (head, tail, trim, escape_md, fence, heading_offset)
  * - Default operator (??)
  * - Ternary with variable references
+ * - SET: locals bound for the rest of their block
  */
 export class Interpreter {
   private strictMode: boolean;
@@ -79,7 +82,7 @@ export class Interpreter {
   private iterations = 0;
   private omittedSections = 0;
   private readonly root: RootScope;
-  /** The innermost scope: a loop frame while a loop renders, else the root */
+  /** The innermost scope: a block or loop frame while one renders, else the root */
   private scope: VariableLookup;
 
   constructor(
@@ -121,15 +124,33 @@ export class Interpreter {
    * Visit program node (root)
    */
   private visitProgram(node: ProgramNode): string {
-    const parts: string[] = [];
-    let length = 0;
-    for (const child of node.body) {
-      const output = this.visit(child);
-      length += output.length;
-      this.checkOutputLength(length, child);
-      parts.push(output);
+    return this.block(node.body, () => {
+      const parts: string[] = [];
+      let length = 0;
+      for (const child of node.body) {
+        const output = this.visit(child);
+        length += output.length;
+        this.checkOutputLength(length, child);
+        parts.push(output);
+      }
+      return parts.join("");
+    });
+  }
+
+  /**
+   * Run a block's nodes. A block that directly holds a SET gets its own frame
+   * for the run, so a SET never outlives its block and never writes the
+   * caller's data; any other block keeps the scope it has.
+   */
+  private block<T>(nodes: ASTNode[], run: () => T): T {
+    if (!nodes.some((child) => child.type === "Set")) return run();
+    const outer = this.scope;
+    this.scope = new Frame(outer);
+    try {
+      return run();
+    } finally {
+      this.scope = outer;
     }
-    return parts.join("");
   }
 
   /**
@@ -158,16 +179,20 @@ export class Interpreter {
 
   private checkOutputLength(length: number, node: ASTNode): void {
     if (length > this.limits.maxOutputChars) {
-      throw new LimitError(
-        "limit-output",
-        `Output is longer than ${this.limits.maxOutputChars} characters`,
-        node.line,
-        node.column,
-        "Render less content or raise limits.maxOutputChars"
-      );
+      throw this.outputTooLong(node.line, node.column);
     }
   }
 
+  private outputTooLong(line: number, column: number): LimitError {
+    return new LimitError(
+      "limit-output",
+      `Output is longer than ${this.limits.maxOutputChars} characters`,
+      line,
+      column,
+      "Render less content or raise limits.maxOutputChars"
+    );
+  }
+
   /**
    * Visit dispatcher
    */
@@ -191,6 +216,8 @@ export class Interpreter {
         return this.visitSection(node as SectionNode);
       case "Fence":
         return this.visitFence(node as FenceNode);
+      case "Set":
+        return this.at(node, () => this.visitSet(node as SetNode));
       case "Ternary":
         return this.at(node, () => this.visitTernary(node as TernaryNode));
       case "Comment":
@@ -211,15 +238,40 @@ export class Interpreter {
    * Visit variable node: ${{name}}, ${{user.name | filter}}, ${{a + b}}
    */
   private visitVariable(node: VariableNode): string {
+    return this.valueToString(this.evaluateValue(node));
+  }
+
+  /**
+   * Visit SET: bind the value in the block's own frame, print nothing
+   */
+  private visitSet(node: SetNode): string {
+    const value = this.evaluateValue(node.value);
+    this.checkValueSize(value);
+    if (!(this.scope instanceof Frame)) {
+      throw new Error("A SET ran outside a block frame");
+    }
+    this.scope.set(node.name, value);
+    return "";
+  }
+
+  /**
+   * The one value evaluator behind ${{ }} and SET: a path, arithmetic or a
+   * literal, then the ?? default and the filter chain. Returns the value, not
+   * its text.
+   */
+  private evaluateValue(expr: ValueExpr): TemplateValue {
+    if (expr.literal) return this.shapeValue(expr, expr.literal.value);
+
     // Check if this is a math expression (contains operators)
-    const pathStr = node.path.join(".");
+    const pathStr = expr.path.join(".");
     let mathError: unknown = null;
     if (isMathExpression(pathStr) || hasStrayCharacter(pathStr)) {
       try {
         const result = evaluateMathExpression(pathStr, this.scope, {
           zeroIsError: this.render,
         });
-        return this.render ? formatNumber(result) : String(result);
+        // render binds the number its output prints
+        return this.render ? Number(formatNumber(result)) : result;
       } catch (error) {
         if (error instanceof DivisionByZeroError) throw error;
         // Not a valid math expression, continue with normal resolution
@@ -227,35 +279,53 @@ export class Interpreter {
       }
     }
 
-    const allowUndefined = node.defaultValue !== undefined;
+    const allowUndefined = expr.defaultValue !== undefined;
     let value: TemplateValue = null;
     let lookupError: unknown = null;
     try {
-      value = this.resolveNestedPath(node.path, allowUndefined);
+      value = this.resolveNestedPath(expr.path, allowUndefined);
     } catch (error) {
       lookupError = error;
     }
     // A malformed math text is an error only when no variable has that name
-    if (mathError instanceof MathSyntaxError && !this.hasRootKey(node.path[0])) {
+    if (mathError instanceof MathSyntaxError && !this.hasRootKey(expr.path[0])) {
       throw mathError;
     }
     if (lookupError !== null) throw lookupError;
 
-    // Apply default operator if value is falsy
-    if (node.defaultValue !== undefined && !isTruthy(value)) {
-      value = node.defaultValue;
+    return this.shapeValue(expr, value);
+  }
+
+  /**
+   * Apply the ?? default (when the value is falsy), then each filter, checking
+   * the size of a text result after every filter so a chain cannot grow a text
+   * without bound
+   */
+  private shapeValue(expr: ValueExpr, start: TemplateValue): TemplateValue {
+    let value = start;
+    if (expr.defaultValue !== undefined && !isTruthy(value)) {
+      value = expr.defaultValue;
     }
 
-    // Apply filters
-    if (node.filters && node.filters.length > 0) {
-      for (const filter of node.filters) {
-        // text filters would turn an unprintable value into ""
-        if (!KEEPS_RAW_INPUT.has(filter.name)) this.valueToString(value);
-        value = applyFilters(value, [filter]) as TemplateValue;
-      }
+    for (const filter of expr.filters ?? []) {
+      // text filters would turn an unprintable value into ""
+      if (!KEEPS_RAW_INPUT.has(filter.name)) this.valueToString(value);
+      value = applyFilters(value, [filter]) as TemplateValue;
+      this.checkValueSize(value);
     }
+    return value;
+  }
 
-    return this.valueToString(value);
+  /**
+   * A text longer than maxOutputChars is a limit-output; arrays, objects and
+   * numbers are not measured (no filter grows an array past its input). The
+   * caller locates the error at its node.
+   */
+  private checkValueSize(value: TemplateValue): void {
+    if (typeof value !== "string" || value.length <= this.limits.maxOutputChars) {
+      return;
+    }
+    throw this.outputTooLong(1, 1);
   }
 
   /**
@@ -286,6 +356,10 @@ export class Interpreter {
   }
 
   private visitBody(nodes: ASTNode[]): string {
+    return this.block(nodes, () => this.renderNodes(nodes));
+  }
+
+  private renderNodes(nodes: ASTNode[]): string {
     return nodes.map((child) => this.visit(child)).join("");
   }
 
@@ -304,15 +378,11 @@ export class Interpreter {
           this.valueToString(this.resolveNestedPath(path))
         )
       );
-      if (matches) {
-        return whenNode.body.map((child) => this.visit(child)).join("");
-      }
+      if (matches) return this.visitBody(whenNode.body);
     }
 
     // Fall to DEFAULT
-    if (node.default) {
-      return node.default.body.map((child) => this.visit(child)).join("");
-    }
+    if (node.default) return this.visitBody(node.default.body);
 
     return "";
   }
@@ -435,10 +505,7 @@ export class Interpreter {
   private visitSection(node: SectionNode): string {
     const title = this.at(node, () => this.sectionTitle(node));
     const heading = `${"#".repeat(node.level)} ${title}\n`;
-    const body = node.body
-      .map((child) => this.visit(child))
-      .join("")
-      .replace(/\r\n/g, "\n");
+    const body = this.visitBody(node.body).replace(/\r\n/g, "\n");
 
     if (body.trim() === "") {
       if (!node.skipEmpty) return heading;
@@ -474,8 +541,7 @@ export class Interpreter {
       checkFenceLang(value);
       return value;
     });
-    const body = node.body.map((child) => this.visit(child)).join("");
-    return fenced(body, lang);
+    return fenced(this.visitBody(node.body), lang);
   }
 
   /**
@@ -561,16 +627,19 @@ export class Interpreter {
       }
     }
 
-    // Render content
-    let content = "";
-    for (const child of node.content) {
-      if (child.type === "List") {
-        // Nested list
-        content += "\n" + this.visitList(child as ListNode, depth + 1);
-      } else {
-        content += this.visit(child);
+    // Render content, in a block of its own
+    const content = this.block(node.content, () => {
+      let text = "";
+      for (const child of node.content) {
+        if (child.type === "List") {
+          // Nested list
+          text += "\n" + this.visitList(child as ListNode, depth + 1);
+        } else {
+          text += this.visit(child);
+        }
       }
-    }
+      return text;
+    });
 
     return content.trim();
   }
@@ -672,6 +741,10 @@ export class Interpreter {
    * Returns the characters the rows hold.
    */
   private tableRowsFrom(nodes: ASTNode[], rows: string[][], strict: boolean): number {
+    return this.block(nodes, () => this.collectRows(nodes, rows, strict));
+  }
+
+  private collectRows(nodes: ASTNode[], rows: string[][], strict: boolean): number {
     let length = 0;
     const add = (cells: string[]): void => {
       rows.push(cells);
@@ -690,7 +763,7 @@ export class Interpreter {
         add(text.split("|").map((cell) => cell.trim()));
       }
     };
-    const inline = ["Text", "Variable", "Ternary", "Comment"];
+    const inline = ["Text", "Variable", "Ternary", "Comment", "Set"];
     let run: ASTNode[] = [];
     const flush = (): void => {
       if (run.length === 1) {
@@ -724,15 +797,18 @@ export class Interpreter {
    * Returns an array of strings, one per cell
    */
   private processCellsArray(cells: ASTNode[][]): string[] {
-    return cells.map((cellNodes) => {
-      const content = cellNodes.map((node) => this.visit(node)).join("");
-      return content
-        .replace(/\r?\n/g, " ")
-        .replace(/(\\*)\|/g, (found, slashes: string) =>
-          slashes.length % 2 === 0 ? `${slashes}\\|` : found
-        )
-        .trim();
-    });
+    // one block for the whole row: a SET in one cell reads on in the next
+    return this.block(cells.flat(), () =>
+      cells.map((cellNodes) => {
+        const content = cellNodes.map((node) => this.visit(node)).join("");
+        return content
+          .replace(/\r?\n/g, " ")
+          .replace(/(\\*)\|/g, (found, slashes: string) =>
+            slashes.length % 2 === 0 ? `${slashes}\\|` : found
+          )
+          .trim();
+      })
+    );
   }
 
   /**
diff --git a/core/src/lexer.ts b/core/src/lexer.ts
index 63b9835..c8d452f 100644
--- a/core/src/lexer.ts
+++ b/core/src/lexer.ts
@@ -34,6 +34,7 @@ export const KEYWORDS: Readonly<Record<string, TokenType>> = {
   END_SECTION: TokenType.END_SECTION,
   FENCE: TokenType.FENCE,
   END_FENCE: TokenType.END_FENCE,
+  SET: TokenType.SET,
 };
 
 /** Block closers checked for balance, each with the opener it closes */
@@ -60,6 +61,7 @@ const OPENERS = new Set(Object.values(CLOSERS));
  * - Lists: {{LIST}}, {{LIST_ITEM}}, {{END_LIST}}
  * - Sections: {{SECTION "Title" level=2}}, {{END_SECTION}}
  * - Code fences: {{FENCE lang="md"}}, {{END_FENCE}}
+ * - Locals: {{SET name = expression}}
  * - Ternary: {{condition ? "true" : "false"}}
  * - Comments: {{# comment #}}
  * - Literal blocks: {{RAW}}...{{END_RAW}}; \{{ is a literal brace pair
@@ -474,7 +476,10 @@ export class Lexer {
    * Map keyword to TokenType
    */
   private getTokenType(keyword: string): TokenType | null {
-    return KEYWORDS[keyword] || null;
+    // Own property only: a word such as "constructor" is not a keyword
+    return Object.prototype.hasOwnProperty.call(KEYWORDS, keyword)
+      ? KEYWORDS[keyword]
+      : null;
   }
 
   /**
diff --git a/core/src/parser.ts b/core/src/parser.ts
index 04cfcc3..5f1b82e 100644
--- a/core/src/parser.ts
+++ b/core/src/parser.ts
@@ -24,12 +24,15 @@ import {
   FenceNode,
   FenceLang,
   FilterCall,
+  SetNode,
+  ValueExpr,
   DEFAULT_LIMITS,
 } from "./types";
 import { SyntaxError, TypeError, LimitError } from "./errors";
 import { parseFilter } from "./filters";
-import { parseWhenMatch } from "./expressions";
+import { parseLiteral, parseWhenMatch } from "./expressions";
 
+const SET_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
 const BLOCK_ARGUMENT = /(\w+)=("[^"]*"|'[^']*'|\S*)|"[^"]*"|'[^']*'|\S+/g;
 const VARIABLE_PATH = /^[A-Za-z_@][\w@]*(\.[\w@]+)*$/;
 
@@ -47,6 +50,8 @@ export class Parser {
   private nodes = 0;
   /** How many LIST_ITEM contents the parser is inside */
   private itemDepth = 0;
+  /** Item names of the FOR bodies that enclose the current token (not their ELSE bodies) */
+  private readonly loopNames: string[] = [];
   private readonly maxDepth: number;
   private readonly maxNodes: number;
 
@@ -108,6 +113,8 @@ export class Parser {
         return this.parseTableHeader();
       case TokenType.ROW:
         return this.parseTableRow();
+      case TokenType.SET:
+        return this.parseSet();
       case TokenType.COMMENT:
         return this.parseComment();
       case TokenType.EOF:
@@ -206,34 +213,107 @@ export class Parser {
     const filterExprs = parts.slice(1);
 
     // --- 2. Extract default operator (??) ---
-    let pathExpr = core;
-    let defaultValue: string | undefined = undefined;
+    const { head, defaultValue } = this.splitDefault(core);
 
+    // --- 3. Parse path ---
+    const path = head.split(".").map((p) => p.trim());
+
+    // --- 4. Parse filters ---
+    return { path, defaultValue, filters: this.parseFilters(filterExprs) };
+  }
+
+  /**
+   * Split "path ?? default" into the path text and the default text (a quoted
+   * default loses its quotes)
+   */
+  private splitDefault(core: string): { head: string; defaultValue?: string } {
     const defaultIdx = core.indexOf("??");
-    if (defaultIdx !== -1) {
-      pathExpr = core.slice(0, defaultIdx).trim();
-      defaultValue = core
+    if (defaultIdx === -1) return { head: core };
+    return {
+      head: core.slice(0, defaultIdx).trim(),
+      defaultValue: core
         .slice(defaultIdx + 2)
         .trim()
-        .replace(/^(["'])(.*)\1$/s, "$2");
-    }
+        .replace(/^(["'])(.*)\1$/s, "$2"),
+    };
+  }
 
-    // --- 3. Parse path ---
-    const path = pathExpr.split(".").map((p) => p.trim());
+  private parseFilters(filterExprs: string[]): FilterCall[] | undefined {
+    return filterExprs.length > 0 ? filterExprs.map(parseFilter) : undefined;
+  }
 
-    // --- 4. Parse filters ---
-    const filters: FilterCall[] =
-      filterExprs.length > 0
-        ? filterExprs.map(parseFilter)
-        : [];
+  /**
+   * Parse SET: {{SET name = expression}}, a single tag. Every problem is a
+   * syntax error at the tag, found at parse time even in a branch that never
+   * renders.
+   */
+  private parseSet(): SetNode {
+    const token = this.open(TokenType.SET);
+    const fail = (why: string): never => {
+      throw new SyntaxError(
+        `Invalid SET syntax: ${why}`,
+        token.line,
+        token.column,
+        "Expected: {{SET name = expression}}"
+      );
+    };
+
+    const match = /^\s+([^\s=]*)\s*=([\s\S]*)$/.exec(
+      token.value.slice("SET".length)
+    );
+    if (!match) return fail(token.value);
+    const [, name, rest] = match;
+    if (name === "") fail("a name is missing");
+    if (name.startsWith("@")) fail(`"${name}" is a name the loops own`);
+    if (!SET_NAME.test(name)) fail(`bad name "${name}"`);
+    if (this.loopNames.includes(name)) {
+      fail(`"${name}" is the item of an enclosing FOR`);
+    }
+    if (rest.startsWith("=")) fail("a single = binds, == compares");
+    const expression = rest.trim();
+    if (expression === "") fail("the expression is missing");
 
     return {
-      path,
-      defaultValue,
-      filters: filters.length > 0 ? filters : undefined,
+      type: "Set",
+      name,
+      value: this.parseSetExpression(expression, fail),
+      line: token.line,
+      column: token.column,
     };
   }
 
+  /**
+   * The expression of a SET: what ${{ }} takes, plus a literal first term
+   * (quoted text, a number, true, false or null)
+   */
+  private parseSetExpression(
+    expression: string,
+    fail: (why: string) => never
+  ): ValueExpr {
+    const quote = expression[0];
+    if (quote === '"' || quote === "'") {
+      const close = expression.indexOf(quote, 1);
+      if (close === -1) return fail("a quoted text is not closed");
+      const tail = expression.slice(close + 1).trim();
+      if (tail !== "" && !tail.startsWith("??") && !tail.startsWith("|")) {
+        return fail(`unexpected "${tail}" after the text`);
+      }
+      // the quoted text is never read for ?? or |; only what follows it is
+      const parts = this.splitOutsideQuotes(tail, "|").map((p) => p.trim());
+      return {
+        path: [],
+        literal: { value: expression.slice(1, close) },
+        defaultValue: this.splitDefault(parts[0]).defaultValue,
+        filters: this.parseFilters(parts.slice(1)),
+      };
+    }
+
+    const parsed = this.parseVariableExpression(expression);
+    // "2 * 3" is arithmetic: parseLiteral only takes a lone number
+    const literal = parseLiteral(parsed.path.join("."));
+    return literal ? { ...parsed, path: [], literal: { value: literal.value } } : parsed;
+  }
+
   /**
    * Split on a separator character, ignoring separators inside quotes.
    * A quote only opens at the start of a value, so an apostrophe inside a
@@ -507,6 +587,7 @@ export class Parser {
   private parseFor(child: ChildParser = () => this.parseNode()): ForNode {
     const token = this.open(TokenType.FOR);
     const header = this.parseForHeader(token);
+    this.loopNames.push(header.itemName);
 
     const body: ASTNode[] = [];
     let elseBody: ASTNode[] | undefined;
@@ -530,6 +611,7 @@ export class Parser {
           );
         }
         elseBody = [];
+        this.loopNames.pop(); // the ELSE body is outside the loop
         continue;
       }
       const node = child();
@@ -537,6 +619,7 @@ export class Parser {
     }
 
     this.consume(TokenType.END_FOR);
+    if (elseBody === undefined) this.loopNames.pop();
 
     const node: ForNode = {
       type: "For",
diff --git a/core/src/spec.ts b/core/src/spec.ts
index 351adec..dfbe417 100644
--- a/core/src/spec.ts
+++ b/core/src/spec.ts
@@ -105,6 +105,12 @@ const BLOCKS: Spec["blocks"] = [
     description:
       "A code fence of at least three backticks, longer than any backtick run in the rendered body, with the optional language; one leading and one trailing line break of the body are removed",
   },
+  {
+    name: "SET",
+    args: "name = expression",
+    description:
+      "Binds a local for the rest of its block: the value of a path, arithmetic, a quoted text, number, true, false or null, with ?? default and | filters, kept as it is (an array stays an array). A single tag with no closer; it prints nothing",
+  },
   {
     name: "RAW",
     closes: "END_RAW",
diff --git a/core/src/types.ts b/core/src/types.ts
index 4fe9c3b..30df1a8 100644
--- a/core/src/types.ts
+++ b/core/src/types.ts
@@ -67,6 +67,7 @@ export enum TokenType {
   END_SECTION = "END_SECTION",
   FENCE = "FENCE",
   END_FENCE = "END_FENCE",
+  SET = "SET",
   COMMENT = "COMMENT",
   EOF = "EOF",
 }
@@ -119,13 +120,31 @@ export interface TextNode extends ASTNode {
 }
 
 /**
- * Variable substitution node
+ * What the one value evaluator reads: a path (or a literal first term, only
+ * in SET), an optional default and a filter chain
  */
-export interface VariableNode extends ASTNode {
-  type: "Variable";
+export interface ValueExpr {
   path: string[];
   defaultValue?: string;
   filters?: FilterCall[];
+  /** A literal first term; the path is then empty */
+  literal?: { value: TemplateValue };
+}
+
+/**
+ * Variable substitution node
+ */
+export interface VariableNode extends ASTNode, ValueExpr {
+  type: "Variable";
+}
+
+/**
+ * SET: binds a local for the rest of its block
+ */
+export interface SetNode extends ASTNode {
+  type: "Set";
+  name: string;
+  value: ValueExpr;
 }
 
 /**
diff --git a/core/src/whitespace.ts b/core/src/whitespace.ts
index 1cedbd9..b9c5548 100644
--- a/core/src/whitespace.ts
+++ b/core/src/whitespace.ts
@@ -20,6 +20,7 @@ const STANDALONE_TAGS = new Set<TokenType>([
   TokenType.END_FENCE,
   TokenType.RAW,
   TokenType.END_RAW,
+  TokenType.SET,
   TokenType.COMMENT,
 ]);
 
diff --git a/tests/language/set.test.ts b/tests/language/set.test.ts
index 24bded5..334e2b6 100644
--- a/tests/language/set.test.ts
+++ b/tests/language/set.test.ts
@@ -707,9 +707,9 @@ const SIZE_ROWS: Row[] = [
   row("a SET of a long text under the default limit", "{{SET x = long | upper}}${{x | length}}", OUT("30")),
   // astral characters keep their length rule (UTF-16 units)
   row("astral: a literal with a filter within the limit binds", '{{SET x = "😀😀" | upper}}${{x | length}}', OUT("4"), { limits: { maxOutputChars: 4 } }),
-  always("astral: a literal with a filter over the limit is a limit-output at the SET", 'a\n  §{{SET x = "😀😀" | upper}}${{x | length}}', "limit-output", undefined, { limits: { maxOutputChars: 3 } }),
+  always("astral: a literal with a filter over the limit is a limit-output at the SET", 'a\n  §{{SET x = "😀😀😀" | upper}}${{x | length}}', "limit-output", undefined, { limits: { maxOutputChars: 4 } }),
   row("astral: a data text within the limit binds", "{{SET x = e2 | upper}}z", OUT("z"), { data: { e2: "😀😀" }, limits: { maxOutputChars: 4 } }),
-  always("astral: a data text over the limit is a limit-output at the SET", "a\n  §{{SET x = e2 | upper}}z", "limit-output", undefined, { data: { e2: "😀😀" }, limits: { maxOutputChars: 3 } }),
+  always("astral: a data text over the limit is a limit-output at the SET", "a\n  §{{SET x = e2 | upper}}z", "limit-output", undefined, { data: { e2: "😀😀😀" }, limits: { maxOutputChars: 4 } }),
   row("astral: the same text through ${{ }} within the limit", "${{e2 | upper}}", OUT("😀😀"), { data: { e2: "😀😀" }, limits: { maxOutputChars: 4 } }),
   row("astral: a chain through ${{ }} over the limit", "${{e2 | upper}}", ERR("limit-output", 1, 1), { data: { e2: "😀😀" }, limits: { maxOutputChars: 3 } }),
   row("astral: length of a bound astral text keeps the filter rule", '{{SET x = "😀😀"}}${{x | length}}', OUT("4")),
```

## Gate run

Gate command green at commit 79dd65d571b4 (1727 tests).

## Output

Answer with one JSON object and nothing else, in this shape:

```json
{
  "restatement": "the objective in your own words, one short paragraph",
  "brief_mismatch": null,
  "verification_plan": ["each check you will make, written from section 1 alone"],
  "findings": [{
    "title": "one line",
    "class": "defect | goal-risk | drift | simplification",
    "serves": { "target": "c1 | m1 | card-goal | cycle-goal | project-goal", "scenario": "the concrete failure against that target" },
    "rubric": "the rubric item or criterion cited",
    "reproduction": "falsifiable steps that show the failure",
    "evidence": ["doc:<path>", "code:<path>:<line>", "test:<name>", "diff:<path>"],
    "location": "path:line or null"
  }],
  "responses": [{ "finding": "f1", "verdict": "sustain | withdraw", "evidence": ["code:src/a.mjs:12"] }]
}
```

Rules:

- Judge the diff against section 1 and the goals it names, never against how the work was done. Write `restatement` before you read section 3.
- Product tier and up: write `verification_plan` from section 1 alone, before you read section 3.
- `brief_mismatch`: a string when the brief, the criteria and the goals contradict each other; otherwise null.
- Every finding names what it serves in `serves.target`: a criterion (c1, c2, ...), a must-not (m1, m2, ...) or a goal (card-goal, cycle-goal, project-goal). A finding that serves nothing in the objective chain is dropped.
- `defect` and `goal-risk` need a rubric item and falsifiable reproduction steps; `goal-risk` also needs evidence. Every evidence entry is `<kind>:<ref>` with a kind of doc, code, test or diff.
- Answer each question in the reviewer brief. A weak answer to a goal-critical question is a `goal-risk` finding serving that question's goal (a fix request: revise and resubmit). A weak answer to a polish question is a `drift` finding (noted for the lead, never a fix request). Strong and adequate answers need no finding.
- `responses` answers earlier findings by label when you are asked to; otherwise leave it empty.
- The Gate run line is tool output recorded by the gate, not the builder's claim. A criterion verified by tests may rely on it; you do not run, judge or ask for tests. A stale or missing line is a reason to say so, never to assume. Review is for what tests cannot catch: fit to the objective and contract, scope drift, design and readability, security, gaps in the tests themselves and edge cases nobody tested.
