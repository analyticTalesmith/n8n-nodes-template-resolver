---
type: review-packet
card: 261015-language2c13-a4-define-and-call-macros
tier: product
built_at: 2026-10-15T16:26:12.598Z
base: c96d1a74c954729614be4395dc582c4deecf58ea
head: a64405b31fbce803878fd1a89b38efabc5879c3f
read_at: a64405b31fbce803878fd1a89b38efabc5879c3f
frozen: true
brief_sha256: 96f3db9b4049616891df62e5154baa4d66c207a35c90aea92d5d80f31d4c49a1
manifest_sha256: 52089c79eaa31347060767230037db291f408dd746f7640fdb13df1eb7120888
criteria_sha256: affcf76db5dad610fff7b8d2b8e783ea23a7b286d8015f797f0c1a290668926d
scope_sha256: 93702e9aa34f792104c3aa05c2677206f6d577f6896428218d265f9c66dad4c7
diff_sha256: 5458da16674955ef3fd477a6efbcd9a8f6f5bb946cd468a038ca4362a668c2a0
omitted_paths: 7
criteria_count: 13
must_not_count: 5
---

# Review packet: 261015-language2c13-a4-define-and-call-macros

Manifest amended after the freeze at 2026-10-15T16:23:34.486Z by lead: golden case files were committed with the tests before the base, and the scope file needed no change (add -tests/golden/render-cases/lang-macro/data.json, add -tests/golden/render-cases/lang-macro/expected.md, add -tests/golden/render-cases/lang-macro/options.json, add -tests/golden/render-cases/lang-macro/template.md, edit -core/src/scope.ts)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language so prompts can be built from data (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error and every loop, call and output bounded.
Card goal: `{{DEFINE name(params)}}...{{END_DEFINE}}` (top level, hoisted) and `{{CALL name(args)}}` (single tag) give reusable text blocks; a body sees its parameters and the data only; recursion, fan-out and output growth across calls are bounded by the depth, iteration and output limits; an error inside a body is located at the failing body node and names the macro.

### Criteria

- c1 (verify: test): mc-define: hoisted: a CALL before the DEFINE works; the DEFINE renders nothing; a DEFINE inside any block is a `syntax-error` at it; a name defined twice is a `syntax-error` at the second; a duplicate or invalid parameter is a `syntax-error`.
- c2 (verify: test): mc-call: positional arguments bind to parameters; paths and literals both work; a missing path argument is `missing-variable` at the CALL in strict mode and `null` in lenient mode.
- c3 (verify: test): mc-link: an unknown macro or a wrong argument count is a `syntax-error` at the CALL in every mode, found before output and even in a branch that never renders; in `validate` and `analyze` an unknown name is a diagnostic that `validate` reports as `analysis-warning` (partials may supply it at render, L5), while a wrong count for a known name is thrown like a parse error by `analyze` and is an error in `validate`.
- c4 (verify: test): mc-scope: the body cannot read the caller's SET locals, loop names or `@` metadata (the `@parent` case is `fo-scope` in L6); a name in the body that is not a parameter reads the data; parameters shadow data; SET inside the body is local to the body and a call, and a SET of a parameter name is a `syntax-error`; the caller's scope is intact afterwards.
- c5 (verify: test): mc-depth: one runtime depth counter rises on every block entered and every CALL, and is bounded by `maxDepth` and, when a caller raises `maxDepth`, by an internal cap of 256 (question 6): an infinite recursion, and 32 chained calls each with a body nested 31 blocks deep, at default limits, and recursion through a nested-block body at a raised `maxDepth`, give a located `limit-depth` (or succeed), never a RangeError and never a `type-error`; `render`, `validate` and `analyze` turn a stray RangeError into a `limit-depth` diagnostic instead of rethrowing it or letting `locateError` retype it.
- c6 (verify: test): mc-iterations: every CALL counts one toward `maxIterations`: a fan-out of two per level over 14 levels ends in `limit-iterations`; the count appears in `stats.iterations`.
- c7 (verify: test): mc-output: `maxOutputChars` is enforced across and inside macro bodies and `IF`/`CASE` bodies under a CALL: a macro whose body is larger than the limit divided by the call count, called from an IF body, ends in `limit-output` before the work holds much more than twice the limit.
- c8 (verify: test): mc-locate: an error raised inside a body is located at the failing body node and its message names the macro and the CALL's line and column (and the partial, when the body came from one, L5); it is never moved to the CALL.
- c9 (verify: test): mc-names: macro names `__proto__`, `constructor`, `toString` and `hasOwnProperty` define and call like any name, and an unknown one is "unknown macro", never an inherited member (the table is a Map).
- c10 (verify: test): mc-ws: DEFINE and END_DEFINE join the standalone set; CALL does not (it outputs, like a variable); trim markers work on all three.
- c11 (verify: test): mc-analyze: analyze and validate walk each DEFINE body exactly once and never follow a CALL, so a fan-out or mutually recursive set of macros costs time linear in the template (rows run through `validate` and `analyze`, not only `render`); parameters are locals in the body; CALL argument paths are usage kind `call`; `blocks` counts DEFINE; unresolved names are warnings in validate; analyze lists the macros it saw in an optional `macros` field present only when DEFINEs exist (a required field would break the hand-built analysis literals in `tests/promptaware/section.test.ts` and `api/routes.ts`).
- c12 (verify: test): mc-spec: `spec().blocks` lists DEFINE (closes END_DEFINE) and CALL (no closes); the derived surfaces test passes without edits.
- c13 (verify: tool): mc-compat: the full suite passes; no existing test file changes.

### Must not

- m1: change any existing test file
- m2: add a runtime dependency
- m3: evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- m4: let an unknown macro, a wrong argument count or a bad argument pass in lenient mode (ADR 0003)
- m5: change the output or the error of any template that was valid before, except a template with no CALL that nests more than 256 blocks under a raised `maxDepth` (now `limit-depth`) and the position of a `limit-output` that now trips at the deeper child that crossed the limit

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language so prompts can be built from data (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error and every loop, call and output bounded.
Card goal: `{{DEFINE name(params)}}...{{END_DEFINE}}` (top level, hoisted) and `{{CALL name(args)}}` (single tag) give reusable text blocks; a body sees its parameters and the data only; recursion, fan-out and output growth across calls are bounded by the depth, iteration and output limits; an error inside a body is located at the failing body node and names the macro.
Must not:
- change any existing test file
- add a runtime dependency
- evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- let an unknown macro, a wrong argument count or a bad argument pass in lenient mode (ADR 0003)
- change the output or the error of any template that was valid before, except a template with no CALL that nests more than 256 blocks under a raised `maxDepth` (now `limit-depth`) and the position of a `limit-output` that now trips at the deeper child that crossed the limit

## Questions

- goal-critical: do three independent bounds hold across a CALL? Depth: an infinite recursion, a mutual recursion, 32 chained calls each 31 blocks deep, and recursion through nested blocks at `maxDepth` 1000 all end in a located `limit-depth` (never a RangeError, never a `type-error`, never a hang); iterations: every CALL counts one, a fan-out of two per level over 14 levels ends in `limit-iterations` with `stats.iterations` bounded; output: a macro called many times from an IF body, a CASE clause or another macro stops once the held output passes the limit, not after all the calls. Probe with raised `maxDepth`, raised `maxIterations`, small `maxOutputChars`, and templates that multiply (macros calling macros twice or ten times).
- goal-critical: do `render`, `validate` and `analyze` stay fast and finite on a fan-out or mutually recursive set of macros (they never follow a CALL), and does a stray RangeError (very deep nesting under a huge `maxDepth`) become a `limit-depth` diagnostic in `render`, `validate` and `analyze` instead of a thrown RangeError or a `type-error`?
- goal-critical: is the body isolated? It cannot read the caller's SET locals, FOR item, `@index0` or `@total`; parameters shadow data; a name that is not a parameter reads the data; a SET inside a body never leaks to the caller, to a second call or to the data; a SET of a parameter name is a `syntax-error`; the caller's scope is intact after a call, also after an error caught by nothing; two calls (also recursive ones) never share bindings.
- goal-critical: is every new diagnostic located at the failing node (never 1:1, never moved to the CALL), does an error inside a body keep its own line and column and name the innermost macro with the CALL's line and column, and do link errors (unknown macro, wrong count, duplicate DEFINE, DEFINE inside a block, bad parameter or argument syntax) appear before any output, in every mode, even in a branch or a DEFINE that never runs?
- goal-critical: are macro names prototype safe (`__proto__`, `constructor`, `toString`, `hasOwnProperty` as macro names, parameter names and path names; an unknown one is "Unknown macro")?
- goal-critical: does every template the base commit accepted keep its output and error (nesting at exactly `maxDepth`, LIST and TABLE with FOR and IF children, loops pinned at the FOR on output overflow, `analyze` and `validate` of old templates, `{{constructor}}`-style tags, cyclic and BigInt values, `resolveTemplate` and `render` apart)? Probe the base commit with such templates.
- goal-critical: does `analyze` agree with render (parameters are locals only inside the body; a top-level SET before a DEFINE is not a local inside the body; CALL path arguments are usage kind `call`; `blocks` counts DEFINE; `macros` present only when DEFINEs exist; unknown macro a diagnostic `validate` reports as `analysis-warning`, wrong count and duplicate thrown) and is `spec().blocks` derived so the surfaces test passes without edits?
- polish: the standalone rule (DEFINE and END_DEFINE lines vanish, a CALL line leaves its line break) and trim markers on all three; a CALL inside a LIST_ITEM, a ROW cell, a legacy TABLE-FOR body and a SECTION; CRLF; astral characters in arguments and bodies; `maxNodes` counts DEFINE and CALL.

## Rubric

- The criteria in `card.json` hold, each with a test named by its id in `tests/language/macros.test.ts`.
- One runtime depth counter covers blocks and calls; one place counts iterations; one running output check covers bodies.
- Strict versus lenient differs only for missing data (ADR 0003); syntax and link errors are the same in every mode.
- `resolveTemplate` and `render` agree on the language.
- The macro table is a Map; the body scope never reads the caller's locals; the caller's data is never written.
- `core/src/macros.ts` takes already parsed DEFINE nodes (a second source, partials, only adds nodes).
- No file outside the card's scope changed.

## Design context

- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
- core/src/interpreter.ts
- core/src/scope.ts
- core/src/parser.ts
- core/src/lexer.ts
- core/src/analyze.ts
- core/src/errors.ts
- core/src/render.ts
- core/src/types.ts
- core/src/spec.ts
```

### spec.md as of base c96d1a74c954, read at a64405b31fbc

```
# Spec: define and call macros

Source: `docs/ephemeral/research/language-2-plan.md` section L4 (criteria are frozen in `card.json` and are the contract; `mc-compat` is a tool criterion, the full suite). Decisions of the build lead, taken inside the plan, are marked "decided".

## Acceptance criteria

Verbatim from `card.json`; they are the contract.

- mc-define: hoisted: a CALL before the DEFINE works; the DEFINE renders nothing; a DEFINE inside any block is a `syntax-error` at it; a name defined twice is a `syntax-error` at the second; a duplicate or invalid parameter is a `syntax-error`.
- mc-call: positional arguments bind to parameters; paths and literals both work; a missing path argument is `missing-variable` at the CALL in strict mode and `null` in lenient mode.
- mc-link: an unknown macro or a wrong argument count is a `syntax-error` at the CALL in every mode, found before output and even in a branch that never renders; in `validate` and `analyze` an unknown name is a diagnostic that `validate` reports as `analysis-warning` (partials may supply it at render, L5), while a wrong count for a known name is thrown like a parse error by `analyze` and is an error in `validate`.
- mc-scope: the body cannot read the caller's SET locals, loop names or `@` metadata (the `@parent` case is `fo-scope` in L6); a name in the body that is not a parameter reads the data; parameters shadow data; SET inside the body is local to the body and a call, and a SET of a parameter name is a `syntax-error`; the caller's scope is intact afterwards.
- mc-depth: one runtime depth counter rises on every block entered and every CALL, and is bounded by `maxDepth` and, when a caller raises `maxDepth`, by an internal cap of 256 (question 6): an infinite recursion, and 32 chained calls each with a body nested 31 blocks deep, at default limits, and recursion through a nested-block body at a raised `maxDepth`, give a located `limit-depth` (or succeed), never a RangeError and never a `type-error`; `render`, `validate` and `analyze` turn a stray RangeError into a `limit-depth` diagnostic instead of rethrowing it or letting `locateError` retype it.
- mc-iterations: every CALL counts one toward `maxIterations`: a fan-out of two per level over 14 levels ends in `limit-iterations`; the count appears in `stats.iterations`.
- mc-output: `maxOutputChars` is enforced across and inside macro bodies and `IF`/`CASE` bodies under a CALL: a macro whose body is larger than the limit divided by the call count, called from an IF body, ends in `limit-output` before the work holds much more than twice the limit.
- mc-locate: an error raised inside a body is located at the failing body node and its message names the macro and the CALL's line and column (and the partial, when the body came from one, L5); it is never moved to the CALL.
- mc-names: macro names `__proto__`, `constructor`, `toString` and `hasOwnProperty` define and call like any name, and an unknown one is "unknown macro", never an inherited member (the table is a Map).
- mc-ws: DEFINE and END_DEFINE join the standalone set; CALL does not (it outputs, like a variable); trim markers work on all three.
- mc-analyze: analyze and validate walk each DEFINE body exactly once and never follow a CALL, so a fan-out or mutually recursive set of macros costs time linear in the template (rows run through `validate` and `analyze`, not only `render`); parameters are locals in the body; CALL argument paths are usage kind `call`; `blocks` counts DEFINE; unresolved names are warnings in validate; analyze lists the macros it saw in an optional `macros` field present only when DEFINEs exist (a required field would break the hand-built analysis literals in `tests/promptaware/section.test.ts` and `api/routes.ts`).
- mc-spec: `spec().blocks` lists DEFINE (closes END_DEFINE) and CALL (no closes); the derived surfaces test passes without edits.
- mc-compat: the full suite passes; no existing test file changes.

## Syntax settled

- `{{DEFINE name(p1, p2)}} ... {{END_DEFINE}}`: a paired block, top level only, hoisted, prints nothing. `{{CALL name(arg1, arg2)}}`: a single tag (no closer; `{{END_CALL}}` is an unknown tag), prints the macro body's output. Tag words are upper case only (`{{define ...}}` stays an unknown tag).
- `name` and each parameter: `[A-Za-z_][A-Za-z0-9_]*`. `__proto__`, `constructor`, `toString`, `hasOwnProperty`, `length` are ordinary names. Zero parameters: `DEFINE f()`, `CALL f()`. Whitespace around the name, the parentheses, the commas and the arguments is free (`{{CALL  f ( a , "b" ) }}`).
- A parameter starting with `@`, an invalid identifier, a repeated parameter, an empty entry (`f(a,,b)`, `f(,a)`, trailing comma `f(a,)`), a missing or unbalanced parenthesis, text after the closing parenthesis, a missing name: each is a `syntax-error` located at the tag, at parse time, in every mode, found even in a branch that never renders and through `validate` and `analyze` (thrown by `analyze`, an error in `validate`).
- Arguments are positional, comma separated, each exactly one of: a variable path (`name`, `a.b`, `xs.0`, `@index0`; read in the CALLER's scope), a quoted text (`"..."` or `'...'`, the text between the quotes verbatim: a comma, parenthesis, `|`, `??` or `}` inside is plain text; no escapes), a number (`5`, `-3`, `1.50`: a number value, printed as `${{ }}` prints it), `true`, `false`, `null`. Math, filters and `??` inside an argument are a `syntax-error` at the CALL (`CALL f(a + 1)`, `CALL f(a | upper)`, `CALL f(a ?? "d")`, `CALL f(a b)`). An argument value is passed as the value, not its text (an array stays an array, an object stays an object; a number stays a number).
- DEFINE at the top level only means: not inside any block (IF, ELSEIF, ELSE, CASE, WHEN, DEFAULT, FOR and its ELSE, LIST, LIST_ITEM, TABLE, HEADER, ROW, SECTION, FENCE) and not inside another DEFINE: a `syntax-error` located at the nested DEFINE. A CALL may be anywhere a variable may stand, including inside a DEFINE body (that is how macros call macros), a FOR, IF, CASE, SECTION, FENCE, LIST_ITEM content and ROW cell.
- CALL and DEFINE are NOT children of the strict LIST and TABLE child lists (directly among LIST children or TABLE children, or among the children of a FOR or IF that builds items or rows): there it is the same located `syntax-error` as any other tag (`Unexpected token in LIST: CALL`, as SET). Inside an item or a row it is fine. In the generic body of a FOR written directly in a TABLE (the legacy text-row rule) a CALL is an inline part of the row text exactly like a variable (add "Call" to the `inline` list in `collectRows`).
- A DEFINE counts as one node (and its body nodes as usual), a CALL as one node, toward `maxNodes`, located at the tag when crossed. Parse depth: a DEFINE is a block for `maxDepth` (it is parsed with `nested`; its body therefore starts at depth 1); a CALL is not a block.
- The DEFINE body is a generic body (anything a FOR body may hold, plus CALL and SET). A body may be empty.

## Macro table and linking (new file `core/src/macros.ts`)

- `macros.ts` takes already parsed DEFINE nodes, so partials (L5) only add a source. Export: a builder from a list of `DefineNode`s to a `Map<string, DefineNode>` that throws a `syntax-error` located at the SECOND definition of a name (message names the macro and the line of the first one); a walker that finds every `CallNode` anywhere in a program (inside DEFINE bodies, in branches that never render, in LIST/TABLE children, in cells) in source order and reports for each: unknown name, or known name with the wrong argument count. Keep it pure (no interpreter state); both `Interpreter` and `analyze` use it. The table is a `Map` (a name such as `__proto__` never reaches an engine object).
- Link rule (decided order): lexing and parsing errors first (as today, one throw); then the duplicate-name check; then the call checks in source order. At render (`Interpreter.interpret`, so `render`, `resolveTemplate` and a direct interpreter all link), the first problem is thrown BEFORE any output as a `syntax-error` located at the CALL: unknown `Unknown macro: <name>` (message contains "Unknown macro" and the name), wrong count `Macro '<name>' takes N argument(s), got M`. In every mode. Also when that CALL sits in a DEFINE that is never called and in a branch that never renders.
- `analyze`: parses, builds the table (a duplicate throws, like a parse error), checks counts (the first wrong count of a known name throws a `syntax-error` at the CALL, like a parse error), and for an unknown name pushes a diagnostic `{ code: "unknown-macro", message: "Unknown macro: <name>", line, column }` at the CALL and goes on. `validate` already maps any code other than `unknown-filter` and `type-error` to a warning with code `analysis-warning`; it must report the unknown macro that way (`ok` stays true when nothing else is an error) and report a thrown wrong-count or duplicate as an error diagnostic `syntax-error`.

## Runtime

- Table: `Interpreter.interpret(ast)` builds the table from the program's top-level DEFINE nodes. Nothing else runs for a DEFINE (`visit` returns `""`). CALL before its DEFINE works (hoisting).
- Calling: arguments are evaluated in the caller's scope, left to right, located at the CALL (`at(node, ...)`): a path argument reads like a `${{ }}` path read of that path: strict mode a missing root name is `missing-variable` at the CALL; lenient a missing value is `null`; a nested missing key (`o.zz`) is `null` in both modes as today. Literals are the values themselves. Then a fresh scope is made for the body: a `Frame` whose parent is the ROOT data scope (not the caller's current scope), holding the parameters (`frame.set(param, value)`), so parameters shadow data, a name that is not a parameter reads the data, and the caller's SET locals, loop names and `@` metadata (including `@total`, `@index0`) are not visible (a missing name inside the body is `missing-variable` in strict, empty in lenient, as at the top level). The body runs as a block of that frame (a SET directly in the body binds in a frame that dies with the call); the caller's scope is restored in a `finally`, also when the body throws. Two calls never share bindings.
- A SET whose name is a parameter of the DEFINE it sits in (at any block depth inside the body) is a `syntax-error` at the SET (parser: keep the parameter names of the enclosing DEFINE as `loopNames` is kept). A loop item named like a parameter is allowed (it shadows inside the loop). A SET naming a loop item stays an error as before.
- Output: the body's output text as rendered, no trimming. A body that calls other macros nests.
- Recursion is allowed (a macro may call itself or another in a cycle); only the bounds below stop it.

## The three bounds across a CALL (the most exposed part of the card)

1. Depth. One runtime counter `depth`, raised by every block entered and every CALL, lowered when it ends (in a `finally`). "Block" means exactly what the parser counts through `nested`: IF, CASE, FOR, LIST, TABLE, SECTION, FENCE (and DEFINE only at parse time). Because the FOR and IF children of LIST and TABLE are run by `collectListItems`, `rowsFromChild`, `selectBranch` and `runLoop` rather than through `visit`, the counter must be raised on those paths too: the invariant is that a template with no CALL never reaches a runtime depth greater than its parse depth, so no template valid today changes (except as decided next). The limit is `Math.min(limits.maxDepth, 256)`; crossing it is a `LimitError` `limit-depth` located at the block or CALL that crossed (opening tag), message in the style of the parser's ("Block nesting exceeds the maximum depth of N" for a block; a CALL says calls and blocks). DECIDED reading of question 6: the internal cap of 256 applies to the runtime counter always (a caller who passes `maxDepth: 1000` and nests 300 IF blocks in a template without CALL now gets `limit-depth` at the 257th block; this is the one named behaviour change of this card for old templates; parse itself is not capped here, ticket a13 keeps the parser recursion). Examples at default limits (maxDepth 32): an infinite recursion `DEFINE a / CALL a / END_DEFINE`, `CALL a`, ends in `limit-depth` at the 33rd call; 32 chained macros, each body 31 nested IF blocks around the next CALL (the DEFINE plus 31 blocks is 32 at parse: valid), ends in `limit-depth`; with `maxDepth: 1000` a macro that calls itself through two nested IFs ends in `limit-depth` once the counter passes 256, never a stack overflow.
2. Iterations. Every CALL counts one toward `maxIterations`, with FOR iterations, in `countIteration` (generalise its node parameter; keep the FOR message unchanged, add a call variant); the error is `limit-iterations` located at the CALL; `stats.iterations` (also on failure, `RenderResult.stats.iterations`) is the total of rendered FOR items and CALLs. Fan-out: 15 macros where level k calls level k-1 twice, 14 levels over a leaf, is 2^14 calls, ends in `limit-iterations` at default `maxIterations`, quickly (the check is made before the body runs).
3. Output. `maxOutputChars` is checked while a body is being built, not only after it: after each child of a body is rendered, the characters held by the bodies currently being built (this body's finished children plus the finished children of every enclosing body, across CALLs) are compared with the limit, and the first child that tips the total is the located node: `limit-output` at that child (a CALL child: at the CALL; a text or variable child inside a macro body: at that node). Bodies: the program, IF/ELSEIF/ELSE, CASE clauses, macro bodies, SECTION, FENCE, LIST_ITEM content. Recommended mechanism: one counter `held`, added to as each child's output is appended to its body and released when the body returns (the parent then adds the returned text as its own child). FOR (and TABLE-FOR / LIST-FOR) keep their own check exactly as today (`runLoop` checks the loop's accumulated length at the FOR node after each iteration, expected position unchanged: `tests/language/for-window.test.ts` pins `ERR("limit-output", 1, 1)` at the FOR) and do not feed `held`. Requirement in measurable terms: a macro whose body holds more than `maxOutputChars / N` characters called N times in an IF body (or a CASE clause, or inside another macro) stops as `limit-output` after about `N/2 + 1` calls, so `stats.iterations` of the failed render is at most about `2 * maxOutputChars / bodySize + 2`, not N. Old templates: a template whose output stays within the limit renders exactly as before; one that overflows is still `limit-output` (its position may now be the deeper child that tipped it).

## RangeError net

- `core/src/errors.ts` `locateError`: a `RangeError` is returned unchanged (never retyped into a `type-error`); every other plain `Error` is retyped as today.
- `core/src/render.ts`: `render` catches a `RangeError` (from lexing, parsing or interpreting) and returns the failure with a `limit-depth` diagnostic (`ok: false`, line 1, column 1 when no position is known, message "The template nests too deeply to run", a suggestion to flatten it or lower limits.maxDepth); `validate` reports it as an error diagnostic `limit-depth`. `core/src/analyze.ts`: `analyze` throws a `LimitError` `limit-depth` (a `TemplateError`, as for parse depth) instead of a `RangeError`. Other non-`TemplateError`s are still rethrown. (`resolveTemplate` is out of scope: it already throws the located counter errors.)

## Error location and the macro in the message

- An error raised while a macro body runs (a missing variable, a type error, a limit, an unknown filter, a math error, a nested call's argument error, a depth or iteration error at a CALL inside the body) keeps the position of the failing body node (line and column in the template text; the body's own nodes carry their own positions). The CALL node must NOT relocate it: the CALL's visit is not wrapped in `at`; only the argument evaluation is located at the CALL.
- Its message names the innermost macro whose body was running and that CALL's line and column, in one fixed form appended to the detail: ` (in macro 'name', called at line L, col C)`. `TemplateError` gains a way to append this once (the `detail`, so `RenderResult.diagnostics[].message` carries it, and the thrown error's `.message`); an error already annotated by an inner call is not annotated again by the outer calls. An error raised outside every body (top level, arguments of a top-level CALL, the link errors) has no such text. Position fields (`line`, `column`) are those of the failing node, never the CALL's. The annotation lives in one small function so L5 can add the partial name.

## Lexer, whitespace, spec

- `core/src/lexer.ts`: `KEYWORDS` gains `DEFINE`, `END_DEFINE`, `CALL` (TokenType entries added in `types.ts`); `CLOSERS` gains `END_DEFINE` -> `DEFINE` (`validateBlocks` needs DEFINE as an opener and END_DEFINE as its closer; an unclosed DEFINE and a stray END_DEFINE are reported like the other blocks).
- `core/src/whitespace.ts`: `DEFINE` and `END_DEFINE` join `STANDALONE_TAGS`; `CALL` does not (so a CALL alone on a line leaves its line break: a blank line after the body's output unless the author trims with `{{CALL f() -}}`); trim markers work on all three.
- `core/src/spec.ts`: `BLOCKS` gains `DEFINE` (args `name(param, ...)`, closes `END_DEFINE`) and `CALL` (args `name(arg, ...)`, no `closes`), descriptions saying hoisted, top level, body sees its parameters and the data only, every call counts one iteration. `tests/language/surfaces.test.ts` is derived from `KEYWORDS` and passes without any edit.

## Analyze

- `UsageKind` gains `"call"`; `BlockKind` gains `"DEFINE"`; `TemplateAnalysis` gains an optional `macros?: { name: string; params: string[] }[]` (source order), present only when the template has a DEFINE (the key is absent otherwise, not empty).
- A DEFINE body is walked once, as its own block whose bound names are exactly its parameters. The enclosing top-level scope is NOT visible while walking it: a top-level `SET x` before the DEFINE does not make `x` a local inside the body (it is data there). After the DEFINE the walker's scope is as before. Table state (`tableDepth`) is reset inside the body.
- A CALL records each path argument as a read of kind `call` (root name; optional false: a missing path argument is an error in strict mode) subject to the usual scope (a local, a loop name or a parameter is not an input; `@` names never); literal arguments read nothing. A CALL is never followed; recursion and fan-out cost nothing.
- `blocks` counts DEFINE (not CALL). Variables read in the body count as usual; macro parameters are never inputs inside the body; names that are not parameters inside the body are inputs of the template.
- `validate`: unresolved names are warnings, thrown errors are errors (see Link rule).

## Compatibility (probe the base before changing anything)

- The new tags were "Unknown template tag" before, so no valid template changes meaning. The risky parts for old templates are: the runtime depth counter (nesting at exactly `maxDepth`, LIST and TABLE with FOR and IF children, `maxDepth` 0 and 1 rows in `tests/headless/limits.test.ts` and `tests/language/list-table-children.test.ts`, SET and LIST_ITEM contents), the running output check (overflow inside IF, CASE, SECTION, FENCE bodies; `tests/language/for-window.test.ts` rows 559 to 565 pin the loop positions), `locateError` (plain errors still become `type-error`), `analyze` and `validate` on old templates, the lexer table. The test writer probes the base with such templates and keeps their output as guard rows under `mc-compat`.
- `docs/living` is not edited by this card (docs_impact none, the last card writes the documents).

## Interface (files)

- `core/src/types.ts`: `TokenType.DEFINE | END_DEFINE | CALL`; `DefineNode { type: "Define"; name; params: string[]; body: ASTNode[] }`, `CallNode { type: "Call"; name; args: CallArg[] }` with `CallArg = { kind: "path"; path: string[] } | { kind: "literal"; value: TemplateValue }`, added to the unions the interpreter and analyzer switch on.
- `core/src/lexer.ts`, `core/src/whitespace.ts`, `core/src/spec.ts` as above.
- `core/src/parser.ts`: `parseDefine` (through `nested`, top-level check, parameter list), `parseCall` (arguments), SET-parameter check, the DEFINE-inside-block error; `open(...)` counts nodes.
- `core/src/macros.ts` (new): the table builder, the call walker/checker (pure).
- `core/src/interpreter.ts`: `visitCall`, the depth counter and the held-output check, `countIteration` generalised, the link step in `interpret`, the annotate call.
- `core/src/scope.ts`: whatever a call frame needs (for example a way to open a frame over the root scope).
- `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/render.ts` as above.
- `api/openapi.json`, `docs/living/*`, README, changelog: not touched (a later card).

## Non-goals

Partials (L5), `@parent` (L6), INPUT (L7), arguments with math or filters, named or default arguments, `return` values, closures, macros as values, a call-site `limit`, memoisation, living-document edits, deltas.
```

### card.md as of base c96d1a74c954, read at a64405b31fbc

```
# Define and call macros

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Define and call macros.

## Must-haves

- `contract` `mc-define` hoisted: a CALL before the DEFINE works; the DEFINE renders nothing; a DEFINE inside any block is a `syntax-error` at it; a name defined twice is a `syntax-error` at the second; a duplicate or invalid parameter is a `syntax-error`.
- `contract` `mc-call` positional arguments bind to parameters; paths and literals both work; a missing path argument is `missing-variable` at the CALL in strict mode and `null` in lenient mode.
- `contract` `mc-link` an unknown macro or a wrong argument count is a `syntax-error` at the CALL in every mode, found before output and even in a branch that never renders; in `validate` and `analyze` an unknown name is a diagnostic that `validate` reports as `analysis-warning` (partials may supply it at render, L5), while a wrong count for a known name is thrown like a parse error by `analyze` and is an error in `validate`.
- `contract` `mc-scope` the body cannot read the caller's SET locals, loop names or `@` metadata (the `@parent` case is `fo-scope` in L6); a name in the body that is not a parameter reads the data; parameters shadow data; SET inside the body is local to the body and a call, and a SET of a parameter name is a `syntax-error`; the caller's scope is intact afterwards.
- `contract` `mc-depth` one runtime depth counter rises on every block entered and every CALL, and is bounded by `maxDepth` and, when a caller raises `maxDepth`, by an internal cap of 256 (question 6): an infinite recursion, and 32 chained calls each with a body nested 31 blocks deep, at default limits, and recursion through a nested-block body at a raised `maxDepth`, give a located `limit-depth` (or succeed), never a RangeError and never a `type-error`; `render`, `validate` and `analyze` turn a stray RangeError into a `limit-depth` diagnostic instead of rethrowing it or letting `locateError` retype it.
- `contract` `mc-iterations` every CALL counts one toward `maxIterations`: a fan-out of two per level over 14 levels ends in `limit-iterations`; the count appears in `stats.iterations`.
- `contract` `mc-output` `maxOutputChars` is enforced across and inside macro bodies and `IF`/`CASE` bodies under a CALL: a macro whose body is larger than the limit divided by the call count, called from an IF body, ends in `limit-output` before the work holds much more than twice the limit.
- `contract` `mc-locate` an error raised inside a body is located at the failing body node and its message names the macro and the CALL's line and column (and the partial, when the body came from one, L5); it is never moved to the CALL.
- `contract` `mc-names` macro names `__proto__`, `constructor`, `toString` and `hasOwnProperty` define and call like any name, and an unknown one is "unknown macro", never an inherited member (the table is a Map).
- `contract` `mc-ws` DEFINE and END_DEFINE join the standalone set; CALL does not (it outputs, like a variable); trim markers work on all three.
- `contract` `mc-analyze` analyze and validate walk each DEFINE body exactly once and never follow a CALL, so a fan-out or mutually recursive set of macros costs time linear in the template (rows run through `validate` and `analyze`, not only `render`); parameters are locals in the body; CALL argument paths are usage kind `call`; `blocks` counts DEFINE; unresolved names are warnings in validate; analyze lists the macros it saw in an optional `macros` field present only when DEFINEs exist (a required field would break the hand-built analysis literals in `tests/promptaware/section.test.ts` and `api/routes.ts`).
- `contract` `mc-spec` `spec().blocks` lists DEFINE (closes END_DEFINE) and CALL (no closes); the derived surfaces test passes without edits.
- `contract` `mc-compat` the full suite passes; no existing test file changes.

## Acceptance criteria

- mc-define: hoisted: a CALL before the DEFINE works; the DEFINE renders nothing; a DEFINE inside any block is a `syntax-error` at it; a name defined twice is a `syntax-error` at the second; a duplicate or invalid parameter is a `syntax-error`.
- mc-call: positional arguments bind to parameters; paths and literals both work; a missing path argument is `missing-variable` at the CALL in strict mode and `null` in lenient mode.
- mc-link: an unknown macro or a wrong argument count is a `syntax-error` at the CALL in every mode, found before output and even in a branch that never renders; in `validate` and `analyze` an unknown name is a diagnostic that `validate` reports as `analysis-warning` (partials may supply it at render, L5), while a wrong count for a known name is thrown like a parse error by `analyze` and is an error in `validate`.
- mc-scope: the body cannot read the caller's SET locals, loop names or `@` metadata (the `@parent` case is `fo-scope` in L6); a name in the body that is not a parameter reads the data; parameters shadow data; SET inside the body is local to the body and a call, and a SET of a parameter name is a `syntax-error`; the caller's scope is intact afterwards.
- mc-depth: one runtime depth counter rises on every block entered and every CALL, and is bounded by `maxDepth` and, when a caller raises `maxDepth`, by an internal cap of 256 (question 6): an infinite recursion, and 32 chained calls each with a body nested 31 blocks deep, at default limits, and recursion through a nested-block body at a raised `maxDepth`, give a located `limit-depth` (or succeed), never a RangeError and never a `type-error`; `render`, `validate` and `analyze` turn a stray RangeError into a `limit-depth` diagnostic instead of rethrowing it or letting `locateError` retype it.
- mc-iterations: every CALL counts one toward `maxIterations`: a fan-out of two per level over 14 levels ends in `limit-iterations`; the count appears in `stats.iterations`.
- mc-output: `maxOutputChars` is enforced across and inside macro bodies and `IF`/`CASE` bodies under a CALL: a macro whose body is larger than the limit divided by the call count, called from an IF body, ends in `limit-output` before the work holds much more than twice the limit.
- mc-locate: an error raised inside a body is located at the failing body node and its message names the macro and the CALL's line and column (and the partial, when the body came from one, L5); it is never moved to the CALL.
- mc-names: macro names `__proto__`, `constructor`, `toString` and `hasOwnProperty` define and call like any name, and an unknown one is "unknown macro", never an inherited member (the table is a Map).
- mc-ws: DEFINE and END_DEFINE join the standalone set; CALL does not (it outputs, like a variable); trim markers work on all three.
- mc-analyze: analyze and validate walk each DEFINE body exactly once and never follow a CALL, so a fan-out or mutually recursive set of macros costs time linear in the template (rows run through `validate` and `analyze`, not only `render`); parameters are locals in the body; CALL argument paths are usage kind `call`; `blocks` counts DEFINE; unresolved names are warnings in validate; analyze lists the macros it saw in an optional `macros` field present only when DEFINEs exist (a required field would break the hand-built analysis literals in `tests/promptaware/section.test.ts` and `api/routes.ts`).
- mc-spec: `spec().blocks` lists DEFINE (closes END_DEFINE) and CALL (no closes); the derived surfaces test passes without edits.
- mc-compat: the full suite passes; no existing test file changes.

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
| `core/src/macros.ts` | add | template-resolver |
| `tests/language/macros.test.ts` | add | template-resolver |
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/errors.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/lexer.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/render.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `core/src/types.ts` | edit | template-resolver |
| `core/src/whitespace.ts` | edit | template-resolver |
| `tests/language/set.test.ts` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/interpreter.ts`, `core/src/lexer.ts`, `core/src/macros.ts`, `core/src/parser.ts`, `core/src/render.ts`, `core/src/scope.ts`, `core/src/spec.ts`, `core/src/types.ts`, `core/src/whitespace.ts`, `tests/golden/render-cases/lang-macro/data.json`, `tests/golden/render-cases/lang-macro/expected.md`, `tests/golden/render-cases/lang-macro/options.json`, `tests/golden/render-cases/lang-macro/template.md`, `tests/language/macros.test.ts`, `tests/language/set.test.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: `core/src/macros.ts`, `tests/language/macros.test.ts`
- remove: none
- edit: `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/interpreter.ts`, `core/src/lexer.ts`, `core/src/parser.ts`, `core/src/render.ts`, `core/src/spec.ts`, `core/src/types.ts`, `core/src/whitespace.ts`, `tests/language/set.test.ts`
- files_scope: `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/interpreter.ts`, `core/src/lexer.ts`, `core/src/macros.ts`, `core/src/parser.ts`, `core/src/render.ts`, `core/src/scope.ts`, `core/src/spec.ts`, `core/src/types.ts`, `core/src/whitespace.ts`, `tests/golden/render-cases/lang-macro/data.json`, `tests/golden/render-cases/lang-macro/expected.md`, `tests/golden/render-cases/lang-macro/options.json`, `tests/golden/render-cases/lang-macro/template.md`, `tests/language/macros.test.ts`, `tests/language/set.test.ts`

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
  SetNode,
  ValueExpr,
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
 * - SET: locals bound for the rest of their block
 */
export class Interpreter {
  private strictMode: boolean;
  private limits: Limits;
  private render: boolean;
  private iterations = 0;
  private omittedSections = 0;
  private readonly root: RootScope;
  /** The innermost scope: a block or loop frame while one renders, else the root */
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
    return this.block(node.body, () => {
      const parts: string[] = [];
      let length = 0;
      for (const child of node.body) {
        const output = this.visit(child);
        length += output.length;
        this.checkOutputLength(length, child);
        parts.push(output);
      }
      return parts.join("");
    });
  }

  /**
   * Run a block's nodes. A block that directly holds a SET gets its own frame
   * for the run, so a SET never outlives its block and never writes the
   * caller's data; any other block keeps the scope it has.
   */
  private block<T>(nodes: ASTNode[], run: () => T): T {
    if (!nodes.some((child) => child.type === "Set")) return run();
    const outer = this.scope;
    this.scope = new Frame(outer);
    try {
      return run();
    } finally {
      this.scope = outer;
    }
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
      throw this.outputTooLong(node.line, node.column);
    }
  }

  private outputTooLong(line: number, column: number): LimitError {
    return new LimitError(
      "limit-output",
      `Output is longer than ${this.limits.maxOutputChars} characters`,
      line,
      column,
      "Render less content or raise limits.maxOutputChars"
    );
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
      case "Set":
        return this.at(node, () => this.visitSet(node as SetNode));
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
    return this.valueToString(this.evaluateValue(node));
  }

  /**
   * Visit SET: bind the value in the block's own frame, print nothing
   */
  private visitSet(node: SetNode): string {
    const value = this.evaluateValue(node.value);
    this.checkValueSize(value);
    if (!(this.scope instanceof Frame)) {
      throw new Error("A SET ran outside a block frame");
    }
    this.scope.set(node.name, value);
    return "";
  }

  /**
   * The one value evaluator behind ${{ }} and SET: a path, arithmetic or a
   * literal, then the ?? default and the filter chain. Returns the value, not
   * its text.
   */
  private evaluateValue(expr: ValueExpr): TemplateValue {
    if (expr.literal) return this.shapeValue(expr, expr.literal.value);

    // Check if this is a math expression (contains operators)
    const pathStr = expr.path.join(".");
    let mathError: unknown = null;
    if (isMathExpression(pathStr) || hasStrayCharacter(pathStr)) {
      try {
        const result = evaluateMathExpression(pathStr, this.scope, {
          zeroIsError: this.render,
        });
        // render binds the number its output prints
        return this.render ? Number(formatNumber(result)) : result;
      } catch (error) {
        if (error instanceof DivisionByZeroError) throw error;
        // Not a valid math expression, continue with normal resolution
        mathError = error;
      }
    }

    const allowUndefined = expr.defaultValue !== undefined;
    let value: TemplateValue = null;
    let lookupError: unknown = null;
    try {
      value = this.resolveNestedPath(expr.path, allowUndefined);
    } catch (error) {
      lookupError = error;
    }
    // A malformed math text is an error only when no variable has that name
    if (mathError instanceof MathSyntaxError && !this.hasRootKey(expr.path[0])) {
      throw mathError;
    }
    if (lookupError !== null) throw lookupError;

    return this.shapeValue(expr, value);
  }

  /**
   * Apply the ?? default (when the value is falsy), then each filter, checking
   * the size of a text result after every filter so a chain cannot grow a text
   * without bound
   */
  private shapeValue(expr: ValueExpr, start: TemplateValue): TemplateValue {
    let value = start;
    if (expr.defaultValue !== undefined && !isTruthy(value)) {
      value = expr.defaultValue;
    }

    for (const filter of expr.filters ?? []) {
      // text filters would turn an unprintable value into ""
      if (!KEEPS_RAW_INPUT.has(filter.name)) this.valueToString(value);
      value = applyFilters(value, [filter]) as TemplateValue;
      this.checkValueSize(value);
    }
    return value;
  }

  /**
   * A text longer than maxOutputChars is a limit-output; arrays, objects and
   * numbers are not measured (no filter grows an array past its input). The
   * caller locates the error at its node.
   */
  private checkValueSize(value: TemplateValue): void {
    if (typeof value !== "string" || value.length <= this.limits.maxOutputChars) {
      return;
    }
    throw this.outputTooLong(1, 1);
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
    return this.block(nodes, () => this.renderNodes(nodes));
  }

  private renderNodes(nodes: ASTNode[]): string {
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
      if (matches) return this.visitBody(whenNode.body);
    }

    // Fall to DEFAULT
    if (node.default) return this.visitBody(node.default.body);

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
    const body = this.visitBody(node.body).replace(/\r\n/g, "\n");

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
    return fenced(this.visitBody(node.body), lang);
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

    // Render content, in a block of its own
    const content = this.block(node.content, () => {
      let text = "";
      for (const child of node.content) {
        if (child.type === "List") {
          // Nested list
          text += "\n" + this.visitList(child as ListNode, depth + 1);
        } else {
          text += this.visit(child);
        }
      }
      return text;
    });

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
    return this.block(nodes, () => this.collectRows(nodes, rows, strict));
  }

  private collectRows(nodes: ASTNode[], rows: string[][], strict: boolean): number {
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
    const inline = ["Text", "Variable", "Ternary", "Comment", "Set"];
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
    // one block for the whole row: a SET in one cell reads on in the next
    return this.block(cells.flat(), () =>
      cells.map((cellNodes) => {
        const content = cellNodes.map((node) => this.visit(node)).join("");
        return content
          .replace(/\r?\n/g, " ")
          .replace(/(\\*)\|/g, (found, slashes: string) =>
            slashes.length % 2 === 0 ? `${slashes}\\|` : found
          )
          .trim();
      })
    );
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
  SetNode,
  ValueExpr,
  DEFAULT_LIMITS,
} from "./types";
import { SyntaxError, TypeError, LimitError } from "./errors";
import { parseFilter } from "./filters";
import { parseLiteral, parseWhenMatch } from "./expressions";

const SET_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
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
  /** Item names of the FOR bodies that enclose the current token (not their ELSE bodies) */
  private readonly loopNames: string[] = [];
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
      case TokenType.SET:
        return this.parseSet();
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
    const { head, defaultValue } = this.splitDefault(core);

    // --- 3. Parse path ---
    const path = head.split(".").map((p) => p.trim());

    // --- 4. Parse filters ---
    return { path, defaultValue, filters: this.parseFilters(filterExprs) };
  }

  /**
   * Split "path ?? default" into the path text and the default text (a quoted
   * default loses its quotes)
   */
  private splitDefault(core: string): { head: string; defaultValue?: string } {
    const defaultIdx = core.indexOf("??");
    if (defaultIdx === -1) return { head: core };
    return {
      head: core.slice(0, defaultIdx).trim(),
      defaultValue: core
        .slice(defaultIdx + 2)
        .trim()
        .replace(/^(["'])(.*)\1$/s, "$2"),
    };
  }

  private parseFilters(filterExprs: string[]): FilterCall[] | undefined {
    return filterExprs.length > 0 ? filterExprs.map(parseFilter) : undefined;
  }

  /**
   * Parse SET: {{SET name = expression}}, a single tag. Every problem is a
   * syntax error at the tag, found at parse time even in a branch that never
   * renders.
   */
  private parseSet(): SetNode {
    const token = this.open(TokenType.SET);
    const fail = (why: string): never => {
      throw new SyntaxError(
        `Invalid SET syntax: ${why}`,
        token.line,
        token.column,
        "Expected: {{SET name = expression}}"
      );
    };

    const match = /^\s+([^\s=]*)\s*=([\s\S]*)$/.exec(
      token.value.slice("SET".length)
    );
    if (!match) return fail(token.value);
    const [, name, rest] = match;
    if (name === "") fail("a name is missing");
    if (name.startsWith("@")) fail(`"${name}" is a name the loops own`);
    if (!SET_NAME.test(name)) fail(`bad name "${name}"`);
    if (this.loopNames.includes(name)) {
      fail(`"${name}" is the item of an enclosing FOR`);
    }
    if (rest.startsWith("=")) fail("a single = binds, == compares");
    const expression = rest.trim();
    if (expression === "") fail("the expression is missing");

    return {
      type: "Set",
      name,
      value: this.parseSetExpression(expression, fail),
      line: token.line,
      column: token.column,
    };
  }

  /**
   * The expression of a SET: what ${{ }} takes, plus a literal first term
   * (quoted text, a number, true, false or null)
   */
  private parseSetExpression(
    expression: string,
    fail: (why: string) => never
  ): ValueExpr {
    const quote = expression[0];
    if (quote === '"' || quote === "'") {
      const close = expression.indexOf(quote, 1);
      if (close === -1) return fail("a quoted text is not closed");
      const tail = expression.slice(close + 1).trim();
      if (tail !== "" && !tail.startsWith("??") && !tail.startsWith("|")) {
        return fail(`unexpected "${tail}" after the text`);
      }
      // the quoted text is never read for ?? or |; only what follows it is
      const parts = this.splitOutsideQuotes(tail, "|").map((p) => p.trim());
      return {
        path: [],
        literal: { value: expression.slice(1, close) },
        defaultValue: this.splitDefault(parts[0]).defaultValue,
        filters: this.parseFilters(parts.slice(1)),
      };
    }

    const parsed = this.parseVariableExpression(expression);
    // "2 * 3" is arithmetic: parseLiteral only takes a lone number
    const literal = parseLiteral(parsed.path.join("."));
    return literal ? { ...parsed, path: [], literal: { value: literal.value } } : parsed;
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
    this.loopNames.push(header.itemName);

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
        this.loopNames.pop(); // the ELSE body is outside the loop
        continue;
      }
      const node = child();
      if (node) (elseBody ?? body).push(node);
    }

    this.consume(TokenType.END_FOR);
    if (elseBody === undefined) this.loopNames.pop();

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
  SET: TokenType.SET,
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
 * - Locals: {{SET name = expression}}
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
    // Own property only: a word such as "constructor" is not a keyword
    return Object.prototype.hasOwnProperty.call(KEYWORDS, keyword)
      ? KEYWORDS[keyword]
      : null;
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
  SetNode,
  TableHeaderNode,
  TableNode,
  TableRowNode,
  ValueExpr,
  VariableNode,
} from "./types";

export type UsageKind =
  | "output"
  | "if"
  | "elseif"
  | "case"
  | "for"
  | "list_item"
  | "table"
  | "set";

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
  walker.visitBlock(ast.body);
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
  /** Names bound so far in each enclosing block, innermost last: loop items and SET locals */
  private scopes: Set<string>[] = [];
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

  /**
   * Visit the nodes of one block: names bound inside (the given ones, such as
   * a loop item, and every SET from its tag on) end with it
   */
  visitBlock(nodes: ASTNode[], bound: string[] = []): void {
    this.scopes.push(new Set(bound));
    this.visitAll(nodes);
    this.scopes.pop();
  }

  private visit(node: ASTNode): void {
    switch (node.type) {
      case "Variable":
        return this.visitValue(
          node as VariableNode,
          node as VariableNode,
          this.tableDepth > 0 ? "table" : "output"
        );
      case "Set":
        return this.visitSet(node as SetNode);
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

  /**
   * A SET reads its expression like an output does, then binds its name for
   * the rest of the block
   */
  private visitSet(node: SetNode): void {
    this.visitValue(node.value, node, "set");
    this.scopes[this.scopes.length - 1].add(node.name);
  }

  /** Record the reads and filters of a value expression; diagnostics sit at `at` */
  private visitValue(expr: ValueExpr, at: ASTNode, kind: UsageKind): void {
    const text = expr.path.join(".");

    // a literal first term reads nothing
    if (!expr.literal && isMathExpression(text)) {
      for (const name of mathVariableNames(text)) this.record(name, kind, false);
    } else if (!expr.literal) {
      this.record(text, kind, expr.defaultValue !== undefined);
    }

    for (const filter of expr.filters ?? []) {
      const { name } = filter;
      this.filterCounts.set(name, (this.filterCounts.get(name) ?? 0) + 1);
      const definition = FILTER_REGISTRY.find((f) => f.name === name);
      if (!definition) {
        this.diagnostics.push({
          code: "unknown-filter",
          message: `Unknown filter: ${name}`,
          line: at.line,
          column: at.column,
        });
        continue;
      }
      for (const message of undeclaredParameterMessages(definition, filter)) {
        this.diagnostics.push({
          code: "type-error",
          message,
          line: at.line,
          column: at.column,
        });
      }
    }
  }

  private visitIf(node: IfNode, kind: "if" | "elseif"): void {
    let branch = node;
    let branchKind = kind;
    for (;;) {
      this.visitCondition(branch.condition, branchKind, branch);
      this.visitBlock(branch.consequent);
      const { alternate } = branch;
      if (Array.isArray(alternate)) return this.visitBlock(alternate);
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
      this.visitBlock(when.body);
    }
    if (node.default) this.visitBlock(node.default.body);
  }

  private visitFor(node: ForNode): void {
    this.record(node.iterable.join("."), "for", false);
    for (const arg of [node.limit, node.offset]) {
      if (arg?.kind === "path") this.record(arg.path.join("."), "for", false);
    }
    this.visitBlock(node.body, [node.itemName]);
    if (node.elseBody) this.visitBlock(node.elseBody);
  }

  private visitSection(node: SectionNode): void {
    if (node.title.kind === "path") {
      this.record(node.title.path.join("."), "output", false);
    }
    this.visitBlock(node.body);
  }

  private visitFence(node: FenceNode): void {
    if (node.lang?.kind === "path") {
      this.record(node.lang.path.join("."), "output", true);
    }
    this.visitBlock(node.body);
  }

  private visitListItem(node: ListItemNode): void {
    if (node.condition) this.visitCondition(node.condition, "list_item", node);
    this.visitBlock(node.content);
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
    this.visitBlock(node.cells.flat()); // one block per row
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
    if (root.startsWith("@") || this.scopes.some((scope) => scope.has(root))) {
      return;
    }

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

### core/src/errors.ts

```
export type LimitCode =
  | "limit-iterations"
  | "limit-output"
  | "limit-depth"
  | "limit-nodes";

export type DiagnosticCode =
  | "syntax-error"
  | "type-error"
  | "missing-variable"
  | "unknown-filter"
  | LimitCode;

/**
 * Base template error with rich context
 */
export class TemplateError extends Error {
  constructor(
    public readonly detail: string,
    public line: number,
    public column: number,
    public readonly suggestion: string | undefined,
    public readonly code: DiagnosticCode
  ) {
    super(TemplateError.formatMessage(detail, line, column, suggestion));
    this.name = "TemplateError";
    Object.setPrototypeOf(this, TemplateError.prototype);
  }

  /**
   * Move the error to the template node that evaluated it
   */
  locate(line: number, column: number): this {
    this.line = line;
    this.column = column;
    this.message = TemplateError.formatMessage(
      this.detail,
      line,
      column,
      this.suggestion
    );
    return this;
  }

  private static formatMessage(
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ): string {
    let formatted = `Template Error (line ${line}, col ${column}):\n   ${message}`;
    if (suggestion) {
      formatted += `\n   Suggestion: ${suggestion}`;
    }
    return formatted;
  }
}

/**
 * Syntax error (lexer/parser issues)
 */
export class SyntaxError extends TemplateError {
  constructor(
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ) {
    super(message, line, column, suggestion, "syntax-error");
    this.name = "SyntaxError";
    Object.setPrototypeOf(this, SyntaxError.prototype);
  }
}

/**
 * Type error (invalid operations on values)
 */
export class TypeError extends TemplateError {
  constructor(
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ) {
    super(message, line, column, suggestion, "type-error");
    this.name = "TypeError";
    Object.setPrototypeOf(this, TypeError.prototype);
  }
}

/**
 * Math expression that cannot be parsed (unmatched parentheses, dangling operators)
 */
export class MathSyntaxError extends TypeError {
  constructor(message: string, line: number, column: number) {
    super(message, line, column);
    this.name = "MathSyntaxError";
    Object.setPrototypeOf(this, MathSyntaxError.prototype);
  }
}

/**
 * Missing variable error (strict mode)
 */
export class MissingVariableError extends TemplateError {
  constructor(
    variableName: string,
    line: number,
    column: number,
    availableVariables: string[],
    hint?: string
  ) {
    const message = `Variable '${variableName}' not found`;
    const base =
      availableVariables.length > 0
        ? `Available variables: ${availableVariables.join(", ")}\nCheck variable name or enable Lenient Mode`
        : "No variables defined. Check variable mappings.";
    const suggestion = hint === undefined ? base : `${base}\n${hint}`;
    super(message, line, column, suggestion, "missing-variable");
    this.name = "MissingVariableError";
    Object.setPrototypeOf(this, MissingVariableError.prototype);
  }
}

/**
 * Filter name that does not exist
 */
export class UnknownFilterError extends TemplateError {
  constructor(
    filterName: string,
    line: number,
    column: number,
    availableFilters: string[]
  ) {
    super(
      `Unknown filter: ${filterName}`,
      line,
      column,
      `Available filters: ${availableFilters.join(", ")}`,
      "unknown-filter"
    );
    this.name = "UnknownFilterError";
    Object.setPrototypeOf(this, UnknownFilterError.prototype);
  }
}

/**
 * Render work crossed a configured limit
 */
export class LimitError extends TemplateError {
  constructor(
    code: LimitCode,
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ) {
    super(message, line, column, suggestion, code);
    this.name = "LimitError";
    Object.setPrototypeOf(this, LimitError.prototype);
  }
}

/**
 * The error located at the node that evaluated it. A plain Error (bad filter
 * parameters, failed math) becomes a type error there.
 */
export function locateError(
  error: unknown,
  line: number,
  column: number
): unknown {
  if (error instanceof TemplateError) return error.locate(line, column);
  if (error instanceof Error) return new TypeError(error.message, line, column);
  return error;
}
```

### core/src/render.ts

```
import {
  Limits,
  TemplateValue,
  WhitespaceOptions,
  withDefaultLimits,
} from "./types";
import { DiagnosticCode, TemplateError } from "./errors";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";
import { analyze } from "./analyze";
import { estimateTokens } from "./estimate";

export interface RenderOptions extends WhitespaceOptions {
  strictMode?: boolean;
  limits?: Partial<Limits>;
  tokenEstimator?: (text: string) => number;
}

export interface Diagnostic {
  severity: "error" | "warning";
  code: DiagnosticCode | "invalid-input" | "analysis-warning";
  message: string;
  line: number;
  column: number;
  suggestion?: string;
}

export interface RenderResult {
  ok: boolean;
  output: string;
  messages: unknown[];
  stats: {
    chars: number;
    estTokens: number;
    sectionsOmitted: number;
    iterations: number;
  };
  diagnostics: Diagnostic[];
}

/**
 * Render a template against data. Template and data problems never throw:
 * they come back as ok false, an empty output and the error first in
 * diagnostics.
 */
export function render(
  template: string,
  data: Record<string, unknown>,
  options?: RenderOptions
): RenderResult {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return failure(
      {
        severity: "error",
        code: "invalid-input",
        message: "Data must be an object mapping variable names to values",
        line: 1,
        column: 1,
      },
      0
    );
  }

  const limits = withDefaultLimits(options?.limits);
  const interpreter = new Interpreter(
    new Map(Object.entries(data)) as Map<string, TemplateValue>,
    { strictMode: options?.strictMode, limits, render: true }
  );

  let output: string;
  try {
    const tokens = new Lexer(template, {
      standaloneLines: options?.standaloneLines ?? true,
    }).tokenize();
    const ast = new Parser(tokens, {
      maxDepth: limits.maxDepth,
      maxNodes: limits.maxNodes,
    }).parse();
    output = interpreter.interpret(ast);
  } catch (error) {
    if (!(error instanceof TemplateError)) throw error;
    return failure(toDiagnostic(error), interpreter.iterationCount);
  }

  const estimate = options?.tokenEstimator ?? estimateTokens;
  return {
    ok: true,
    output,
    messages: [],
    stats: {
      chars: output.length,
      estTokens: estimate(output),
      sectionsOmitted: interpreter.sectionsOmitted,
      iterations: interpreter.iterationCount,
    },
    diagnostics: [],
  };
}

/**
 * Check a template without data: syntax errors and unknown filters are
 * errors; conditions that only some data could satisfy are warnings.
 */
export function validate(
  template: string,
  options?: { limits?: Partial<Limits> }
): { ok: boolean; diagnostics: Diagnostic[] } {
  let diagnostics: Diagnostic[];
  try {
    diagnostics = analyze(template, options).diagnostics.map(
      ({ code, message, line, column }): Diagnostic =>
        code === "unknown-filter" || code === "type-error"
          ? { severity: "error", code, message, line, column }
          : { severity: "warning", code: "analysis-warning", message, line, column }
    );
  } catch (error) {
    if (!(error instanceof TemplateError)) throw error;
    diagnostics = [toDiagnostic(error)];
  }
  return {
    ok: diagnostics.every((d) => d.severity !== "error"),
    diagnostics,
  };
}

function failure(diagnostic: Diagnostic, iterations: number): RenderResult {
  return {
    ok: false,
    output: "",
    messages: [],
    stats: { chars: 0, estTokens: 0, sectionsOmitted: 0, iterations },
    diagnostics: [diagnostic],
  };
}

function toDiagnostic(error: TemplateError): Diagnostic {
  const diagnostic: Diagnostic = {
    severity: "error",
    code: error.code,
    message: error.detail,
    line: error.line,
    column: error.column,
  };
  if (error.suggestion !== undefined) diagnostic.suggestion = error.suggestion;
  return diagnostic;
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
  SET = "SET",
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
 * What the one value evaluator reads: a path (or a literal first term, only
 * in SET), an optional default and a filter chain
 */
export interface ValueExpr {
  path: string[];
  defaultValue?: string;
  filters?: FilterCall[];
  /** A literal first term; the path is then empty */
  literal?: { value: TemplateValue };
}

/**
 * Variable substitution node
 */
export interface VariableNode extends ASTNode, ValueExpr {
  type: "Variable";
}

/**
 * SET: binds a local for the rest of its block
 */
export interface SetNode extends ASTNode {
  type: "Set";
  name: string;
  value: ValueExpr;
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
    name: "SET",
    args: "name = expression",
    description:
      "Binds a local for the rest of its block: the value of a path, arithmetic, a quoted text, number, true, false or null, with ?? default and | filters, kept as it is (an array stays an array). A single tag with no closer; it prints nothing",
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

These test files are shown as committed at a64405b31fbc, the commit the contract is read at; the diff starts at base c96d1a74c954, so a file added or changed since then is in the diff too. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/language/macros.test.ts (frozen, truncated)

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

// {{DEFINE name(params)}}...{{END_DEFINE}} gives a reusable text block and {{CALL name(args)}} prints it. Every row below runs in
// all four entries (render and resolve, strict and lenient) unless it names its own. Ids: mc-define mc-call mc-link mc-scope
// mc-depth mc-iterations mc-output mc-locate mc-names mc-ws mc-analyze mc-spec mc-compat.

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
  omitted?: number;
}

type RunOptions = Record<string, any>;

function run(entry: Entry, template: string, data: Record<string, any>, limits?: Partial<Limits>, opts?: RunOptions): Outcome {
  const strictMode = entry.endsWith("strict");
  try {
    if (entry.startsWith("render")) {
      const r = render(template, data, { strictMode, limits, ...opts });
      if (r.ok) return { code: "ok", output: r.output, iterations: r.stats.iterations, omitted: r.stats.sectionsOmitted };
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
function runStatic(kind: "validate" | "analyze", template: string, limits?: Partial<Limits>): Outcome {
  try {
    if (kind === "validate") {
      const r = validate(template, limits ? { limits } : undefined);
      if (r.ok) return { code: "ok" };
      const d = (r.diagnostics.find((x) => x.severity === "error") ?? r.diagnostics[0]) as any;
      return { code: d.code, line: d.line, column: d.column, message: d.message };
    }
    const a = analyze(template, limits ? { limits } : undefined);
    const d = a.diagnostics[0] as any;
    if (!d) return { code: "ok" };
    return { code: d.code, line: d.line, column: d.column, message: d.message };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, message: e.message };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}`, message: String((e as Error)?.message) };
  }
}

/** analyze, with a thrown TemplateError turned into a failed assertion that says what was thrown. */
function analyzed(tpl: string, limits?: Partial<Limits>): any {
  try {
    return analyze(tpl, limits ? { limits } : undefined);
  } catch (e) {
    check(`${(e as any)?.code}: ${(e as Error)?.message}`, `analyze accepts ${JSON.stringify(tpl).slice(0, 200)}`).toBe("ok");
    throw e;
  }
}

type Want = { out: string } | { err: string; line: number; col: number; alts?: Array<{ line: number; col: number }>; has?: string[]; lacks?: string[]; once?: boolean };
type Wants = Want | { strict: Want; lenient: Want };
const OUT = (out: string): Want => ({ out });
const ERR = (err: string, line: number, col: number, has?: string | string[], lacks?: string | string[], once?: boolean): Want => ({
  err,
  line,
  col,
  has: has === undefined ? undefined : ([] as string[]).concat(has),
  lacks: lacks === undefined ? undefined : ([] as string[]).concat(lacks),
  once,
});
/** An error that may be located at any one of several places the spec allows. */
const ERR_ANY = (err: string, at: Array<{ line: number; col: number }>, has?: string | string[]): Want => ({ ...(ERR(err, at[0].line, at[0].col, has) as any), alts: at.slice(1) });
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
  /** extra assertions on the outcome (stats.iterations and so on) */
  also?: (o: Outcome, entry: Entry) => void;
}

const INSIDE = "(in macro";

function verifyOutcome(o: Outcome, want: Want, label: string): void {
  if ("err" in want) {
    check(o.code, `${label}: expects the error ${want.err} (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe(want.err);
    const places = [{ line: want.line, col: want.col }, ...(want.alts ?? [])];
    check(places.some((p) => p.line === o.line && p.col === o.column), `${label}: located at ${places.map((p) => `${p.line}:${p.col}`).join(" or ")} (got ${o.line}:${o.column})`).toBe(true);
    // DEFINE, END_DEFINE and CALL are known tags: their syntax errors never say "Unknown template tag"
    if (want.err === "syntax-error" && !(want.has ?? []).includes(UNKNOWN_TAG)) {
      check((o.message ?? "").includes(UNKNOWN_TAG), `${label}: the tag is known, so the error is not an unknown tag (got ${o.message ?? ""})`).toBe(false);
    }
    for (const h of want.has ?? []) check(o.message ?? "", `${label}: the message holds ${JSON.stringify(h)}`).toContain(h);
    for (const l of want.lacks ?? []) check((o.message ?? "").includes(l), `${label}: the message does not hold ${JSON.stringify(l)} (got ${o.message ?? ""})`).toBe(false);
    if (want.once) check(((o.message ?? "").match(/\(in macro/g) ?? []).length, `${label}: the macro is named once in the message (got ${o.message ?? ""})`).toBe(1);
    return;
  }
  check(o.code, `${label}: renders without an error (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe("ok");
  check(o.output, `${label}: renders ${JSON.stringify(want.out)}`).toBe(want.out);
}

function verify(entry: Entry, r: Row, id: string): void {
  const o = run(entry, r.tpl, r.data, r.limits, r.opts);
  verifyOutcome(o, pick(r.want, entry), `${id} [${entry}] ${r.name}`);
  if (r.also) r.also(o, entry);
}

function expand(rows: Row[]) {
  return rows.flatMap((r) => (r.entries ?? ENTRIES).map((entry) => ({ entry, r, name: r.name })));
}

interface Pos {
  line: number;
  col: number;
}
/** The line and column of an index in a template. */
function posOf(tpl: string, index: number): Pos {
  const before = tpl.slice(0, index);
  return { line: before.split("\n").length, col: before.length - (before.lastIndexOf("\n") + 1) + 1 };
}
/** The position of the n-th (1-based) occurrence of a text. */
function nth(tpl: string, needle: string, n = 1): Pos {
  let at = -1;
  for (let i = 0; i < n; i++) {
    at = tpl.indexOf(needle, at + 1);
    check(at >= 0, `the template holds ${n} copies of ${JSON.stringify(needle)}`).toBe(true);
  }
  return posOf(tpl, at);
}

/** A template with § at the place where the error is located and ¤ at the CALL that entered the failing body. */
function marked(tplMarked: string): { tpl: string; line: number; col: number; call: Pos } {
  let tpl = "";
  let at: Pos = { line: 1, col: 1 };
  let call: Pos = { line: 1, col: 1 };
  for (const ch of tplMarked) {
    if (ch === "§") at = posOf(tpl, tpl.length);
    else if (ch === "¤") call = posOf(tpl, tpl.length);
    else tpl += ch;
  }
  return { tpl, line: at.line, col: at.col, call };
}

const annot = (macro: string, call: Pos) => `${INSIDE} '${macro}', called at line ${call.line}, col ${call.col})`;

// ---- data: the probe data of the unmodified code, plus a few names for the macro rows ----

const cyc: any = {};
cyc.self = cyc;
const big = BigInt(5);
const PROBE: Record<string, any> = {
  a: "A", b: 2, n: 5, zero: 0, f: false, nul: null, empty: "", s: "hello world", xs: ["b", "a", "b"],
  o: { k: "v", n: { d: 1 } }, cyc, big, long: "x".repeat(30), price: 0.1, q: 0.2, items: [{ n: "x" }, { n: "y" }],
};
const DATA: Record<string, any> = {
  ...PROBE, t: true, e: [], ys: ["p", "q"], one: ["z"], five: [1, 2, 3, 4, 5], many: Array.from({ length: 50 }, (_, i) => i), x: "DX",
};

function row(name: string, tpl: string, want: Wants, extra: Partial<Row> = {}): Row {
  return { name, tpl, want, ...extra, data: { ...DATA, ...(extra.data ?? {}) } };
}
/** An error located at the § mark (the same in every mode unless `lenient` gives an output). */
function mrow(name: string, tplMarked: string, code: string, has: string | string[] | undefined, lenient: string | "same", extra: Partial<Row> = {}): Row {
  const m = marked(tplMarked);
  const err = ERR(code, m.line, m.col, has);
  return { name, tpl: m.tpl, data: DATA, want: SL(err, lenient === "same" ? err : OUT(lenient)), ...extra };
}
const always = (name: string, tplMarked: string, code: string, has?: string | string[], extra: Partial<Row> = {}): Row => mrow(name, tplMarked, code, has, "same", extra);
const MV = "missing-variable";
/**
 * An error raised inside the body of macro `macro`: located at § and named with the CALL at ¤ in the message, never
 * located at the CALL. `lenient` is the lenient output, or "same" for an error in every mode.
 */
function inBody(name: string, tplMarked: string, code: string, macro: string, lenient: string | "same", extra: Partial<Row> = {}, more: string[] = []): Row {
  const m = marked(tplMarked);
  const err = ERR(code, m.line, m.col, [annot(macro, m.call), ...more], undefined, true);
  return { name, tpl: m.tpl, data: DATA, want: SL(err, lenient === "same" ? err : OUT(lenient)), ...extra };
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

// ---- small builders ----

const rep = (s: string, n: number): string => s.repeat(n);
const def = (name: string, params: string, body: string): string => `{{DEFINE ${name}(${params})}}${body}{{END_DEFINE}}`;
const calls = (name: string, n: number): string => rep(`{{CALL ${name}()}}`, n);
const F = def("f", "p", "[\${{p}}]"); // the macro most rows call: prints its parameter in brackets
const UNKNOWN_TAG = "Unknown template tag";


// =====================================================================================
// mc-define: hoisted, top level only, prints nothing, one definition per name
// =====================================================================================

const HOIST_ROWS: Row[] = [
  row("a CALL before the DEFINE works (hoisted)", "{{CALL a()}}{{DEFINE a()}}hi{{END_DEFINE}}", OUT("hi")),
  row("the DEFINE itself prints nothing", "[{{DEFINE a()}}body{{END_DEFINE}}]", OUT("[]")),
  row("a DEFINE then a later CALL", "{{DEFINE a()}}hi{{END_DEFINE}}[{{CALL a()}}]", OUT("[hi]")),
  row("a macro called twice prints twice", "{{DEFINE a()}}hi{{END_DEFINE}}{{CALL a()}}{{CALL a()}}", OUT("hihi")),
  row("a macro never called prints nothing", "x{{DEFINE a()}}hi{{END_DEFINE}}y", OUT("xy")),
  row("an empty body prints nothing", "{{DEFINE a()}}{{END_DEFINE}}[{{CALL a()}}]", OUT("[]")),
  row("a body of blanks keeps its blanks", "{{DEFINE a()}}  {{END_DEFINE}}[{{CALL a()}}]", OUT("[  ]")),
  row("a CALL in a branch that never renders and a later CALL, the DEFINE last", "{{IF f}}{{CALL a()}}{{END_IF}}[{{CALL a()}}]{{DEFINE a()}}hi{{END_DEFINE}}", OUT("[hi]")),
  row("a CALL in a FOR before the DEFINE", "{{FOR xs AS i}}{{CALL a()}}{{END_FOR}}{{DEFINE a()}}-{{END_DEFINE}}", OUT("---")),
  row("a macro calls a macro defined after it", "{{DEFINE a()}}<{{CALL b()}}>{{END_DEFINE}}{{DEFINE b()}}B{{END_DEFINE}}{{CALL a()}}", OUT("<B>")),
  row("a macro calls a macro defined before it", "{{DEFINE b()}}B{{END_DEFINE}}{{DEFINE a()}}<{{CALL b()}}>{{END_DEFINE}}{{CALL a()}}", OUT("<B>")),
  row("names that differ in case are two macros", "{{DEFINE a()}}1{{END_DEFINE}}{{DEFINE A()}}2{{END_DEFINE}}{{CALL a()}}{{CALL A()}}", OUT("12")),
  row("a name with digits and underscores", "{{DEFINE _m_2()}}ok{{END_DEFINE}}{{CALL _m_2()}}", OUT("ok")),
  row("a macro named like a data variable", "{{DEFINE a()}}M{{END_DEFINE}}\${{a}}{{CALL a()}}", OUT("AM")),
  row("a macro named like a filter or keyword word", "{{DEFINE upper()}}U{{END_DEFINE}}{{DEFINE IF2()}}I{{END_DEFINE}}{{CALL upper()}}{{CALL IF2()}}", OUT("UI")),
  row("the same body with CRLF line breaks in the text", "{{DEFINE a()}}x\r\ny{{END_DEFINE}}{{CALL a()}}", OUT("x\ny")),
];

/** [label, text before the DEFINE, text after it] */
const CONTAINERS: Array<[string, string, string]> = [
  ["an IF", "{{IF t}}", "{{END_IF}}"],
  ["an IF branch that never renders", "{{IF f}}", "{{END_IF}}"],
  ["an ELSEIF", "{{IF f}}a{{ELSEIF t}}", "{{END_IF}}"],
  ["an ELSE", "{{IF t}}a{{ELSE}}", "{{END_IF}}"],
  ["a CASE WHEN", "{{CASE b}}{{WHEN 2}}", "{{END_CASE}}"],
  ["a CASE DEFAULT", "{{CASE b}}{{WHEN 1}}w{{DEFAULT}}", "{{END_CASE}}"],
  ["a FOR", "{{FOR xs AS i}}", "{{END_FOR}}"],
  ["the ELSE body of a FOR", "{{FOR e AS i}}x{{ELSE}}", "{{END_FOR}}"],
  ["a LIST", "{{LIST}}", "{{END_LIST}}"],
  ["a LIST_ITEM", "{{LIST}}{{LIST_ITEM}}", "{{END_LIST_ITEM}}{{END_LIST}}"],
  ["a TABLE", "{{TABLE}}", "{{END_TABLE}}"],
  ["a HEADER", "{{TABLE}}{{HEADER}}", "{{END_HEADER}}{{END_TABLE}}"],
  ["a ROW", "{{TABLE}}{{ROW}}", "{{END_ROW}}{{END_TABLE}}"],
  ["a SECTION", '{{SECTION "T"}}', "{{END_SECTION}}"],
  ["a FENCE", "{{FENCE}}", "{{END_FENCE}}"],
  ["another DEFINE", "{{DEFINE o()}}", "{{END_DEFINE}}"],
  ["an IF inside another DEFINE", "{{DEFINE o()}}{{IF t}}", "{{END_IF}}{{END_DEFINE}}"],
  ["a FOR after a CALL", "{{CALL o()}}{{FOR xs AS i}}", "{{END_FOR}}{{DEFINE o()}}{{END_DEFINE}}"],
];
const NESTED_DEFINE_ROWS: Row[] = CONTAINERS.map(([label, before, after]) =>
  always(`a DEFINE inside ${label} is a syntax-error at the DEFINE`, `${before}§${def("a", "", "x")}${after}`, "syntax-error"),
);

const TWICE_ROWS: Row[] = [
  mrow("a name defined twice is a syntax-error at the second", `${def("a", "", "x")}\n§${def("a", "", "y")}`, "syntax-error", ["line 1"], "same"),
  mrow("the second has other parameters: still a duplicate", `${def("a", "", "x")}\n§${def("a", "p", "y")}`, "syntax-error", ["line 1"], "same"),
  mrow("the third copy does not move the error", `${def("a", "", "x")}\n§${def("a", "", "y")}\n${def("a", "", "z")}`, "syntax-error", "line 1", "same"),
  mrow("after a CALL and other text", `{{CALL a()}}\nmore\n${def("a", "", "x")}\ntext\n§${def("a", "", "y")}`, "syntax-error", ["line 3"], "same"),
  mrow("the first definition of the name is on a later line", `x\n\n${def("b", "", "z")}\n${def("a", "", "x")}\n§${def("a", "", "y")}`, "syntax-error", "line 4", "same"),
  mrow("two prototype names defined twice", `${def("toString", "", "x")}\n§${def("toString", "", "y")}`, "syntax-error", ["toString", "line 1"], "same"),
  mrow("a duplicate of a macro that is never called", `${def("a", "", "x")}\n§${def("a", "", "y")}\ntext`, "syntax-error", "line 1", "same"),
  mrow("a duplicate wins over an unknown macro called earlier", `{{CALL nope()}}\n${def("a", "", "x")}\n§${def("a", "", "y")}`, "syntax-error", ["line 2"], "same"),
];

const BAD_DEFINE_TAGS = [
  "{{DEFINE}}", "{{DEFINE f}}", "{{DEFINE f(}}", "{{DEFINE f)}}", "{{DEFINE f(a,)}}", "{{DEFINE f(,a)}}", "{{DEFINE f(a,,b)}}",
  "{{DEFINE f(a,a)}}", "{{DEFINE f(a, b, a)}}", "{{DEFINE f(1a)}}", "{{DEFINE f(@a)}}", "{{DEFINE f(a.b)}}", "{{DEFINE 1f()}}",
  "{{DEFINE f() x}}", "{{DEFINE f(a b)}}", "{{DEFINE f(a))}}", "{{DEFINE f((a)}}", "{{DEFINE ()}}", "{{DEFINE f(a-b)}}",
  '{{DEFINE f("a")}}', "{{DEFINE f(1)}}", "{{DEFINE f-g()}}", "{{DEFINE f ()x}}", "{{DEFINE f(a)(b)}}", "{{DEFINE f(a) = 1}}",
];
const BAD_DEFINE_ROWS: Row[] = BAD_DEFINE_TAGS.map((tag) => always(`${tag} is a syntax-error at the tag`, `a\n§${tag}x{{END_DEFINE}}`, "syntax-error"));
const BAD_DEFINE_HIDDEN: Row[] = [
  always("a DEFINE with a bad parameter list inside a branch that never renders is a syntax-error at the tag", "{{IF f}}§{{DEFINE f(a,a)}}x{{END_DEFINE}}{{END_IF}}", "syntax-error"),
  always("a bad DEFINE after the text is found before any output", "text {{CALL a()}} more\n§{{DEFINE a(1)}}x{{END_DEFINE}}", "syntax-error"),
];
const SHAPE_ROWS: Row[] = [
  always("an unclosed DEFINE is reported at its opening tag", "a\n§{{DEFINE f()}}x", "syntax-error"),
  always("a stray END_DEFINE is reported at the closer", "a\n§{{END_DEFINE}}", "syntax-error"),
  always("an END_DEFINE that closes a block opened inside it is reported at the closer", "{{DEFINE a()}}{{IF t}}x§{{END_DEFINE}}{{END_IF}}", "syntax-error"),
  always("an END_DEFINE with arguments is a syntax-error at the closer", "{{DEFINE a()}}x§{{END_DEFINE x}}", "syntax-error"),
  always("an END_IF that closes a DEFINE is reported at the closer", "{{DEFINE a()}}x§{{END_IF}}", "syntax-error"),
  always("an unclosed DEFINE after a closed one", "{{DEFINE a()}}x{{END_DEFINE}}\n§{{DEFINE b()}}y", "syntax-error"),
];

describe("mc-define: a DEFINE is hoisted, top level, silent and unique by name", () => {
  it.each(expand(HOIST_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  it.each(expand(NESTED_DEFINE_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  it.each(expand(TWICE_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  it.each(expand(BAD_DEFINE_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  it.each(expand(BAD_DEFINE_HIDDEN))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));
  it.each(expand(SHAPE_ROWS))("mc-define: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-define"));

  // the same errors through validate (an error diagnostic) and analyze (thrown), located the same way
  const staticRows = [...NESTED_DEFINE_ROWS, ...TWICE_ROWS, ...BAD_DEFINE_ROWS, ...BAD_DEFINE_HIDDEN, ...SHAPE_ROWS];
  const statics = staticRows.flatMap((r) => (["validate", "analyze"] as const).map((kind) => ({ kind, r, name: r.name })));
  it.each(statics)("mc-define: [$kind] $name", ({ kind, r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    const o = runStatic(kind, r.tpl);
    verifyOutcome(o, ERR(want.err, want.line, want.col), `mc-define [${kind}] ${r.name}`);
  });

  it("mc-define: the failed render of a DEFINE error has no output and ok false", () => {
    const r = render("text {{DEFINE a()}}x{{END_DEFINE}} {{IF t}}{{DEFINE b()}}y{{END_DEFINE}}{{END_IF}}", DATA);
    check(r.ok, "render fails").toBe(false);
    check(r.output, "no output of a failed render").toBe("");
    check(r.diagnostics[0].code, "the code").toBe("syntax-error");
    check(r.diagnostics[0].message.includes(UNKNOWN_TAG), `the tag is known: ${r.diagnostics[0].message}`).toBe(false);
    check({ line: r.diagnostics[0].line, column: r.diagnostics[0].column }, "located at the inner DEFINE").toEqual({ line: 1, column: 44 });
  });
});

// =====================================================================================
// mc-call: arguments bind by position, paths and literals, values stay values
// =====================================================================================

/** [argument text, the output of F = "[\${{p}}]" for it] */
const ARG_CASES: Array<[string, string]> = [
  ['"hi"', "[hi]"], ["'hi'", "[hi]"], ["5", "[5]"], ["-3", "[-3]"], ["1.50", "[1.5]"], ["0", "[0]"], ["true", "[true]"], ["false", "[false]"],
  ["null", "[]"], ['""', "[]"], ["''", "[]"],
  ["a", "[A]"], ["zero", "[0]"], ["f", "[false]"], ["nul", "[]"], ["empty", "[]"], ["s", "[hello world]"], ["o.k", "[v]"], ["o.n.d", "[1]"],
  ["xs.0", "[b]"], ["xs.1", "[a]"], ["xs.length", "[3]"], ["o.zz", "[]"], ["o.n.zz.deep", "[]"],
  ["o", '[{"k":"v","n":{"d":1}}]'], ["xs", '[["b","a","b"]]'],
  ['"a,b"', "[a,b]"], ['"a)b"', "[a)b]"], ['"(x)"', "[(x)]"], ['"a|b"', "[a|b]"], ['"a ?? b"', "[a ?? b]"], ['"a}b"', "[a}b]"], ['"a{b"', "[a{b]"],
  ['"a + 1"', "[a + 1]"], ['"a | upper"', "[a | upper]"], ["'say \"hi\"'", '[say "hi"]'], ['"it\'s"', "[it's]"], ['"  pad  "', "[  pad  ]"],
  ['"a.b"', "[a.b]"], ['"a{{b}}c"', "[a{{b}}c]"], ['"x\\n"', "[x\\n]"], ['"5"', "[5]"], ['"true"', "[true]"], ['"null"', "[null]"],
];
const ARG_ROWS: Row[] = ARG_CASES.map(([arg, out]) => row(`CALL f(${arg}) binds the argument and the body prints ${JSON.stringify(out)}`, `${F}{{CALL f(${arg})}}`, OUT(out)));

const BIND_ROWS: Row[] = [
  row("positional arguments bind to parameters in order", `${def("f", "a, b", "[\${{a}}|\${{b}}]")}{{CALL f("1", "2")}}`, OUT("[1|2]")),
  row("swapped path arguments swap the values", `${def("f", "a, b", "[\${{a}}|\${{b}}]")}{{CALL f(b, a)}}`, OUT("[2|A]")),
  row("a path and a literal", `${def("f", "a, b", "[\${{a}}|\${{b}}]")}{{CALL f(a, "lit")}}{{CALL f("lit", o.k)}}`, OUT("[A|lit][lit|v]")),
  row("three parameters with letters, digits and underscores", `${def("f", "_a, B1, c_2", "\${{_a}}\${{B1}}\${{c_2}}")}{{CALL f(1, 2, 3)}}`, OUT("123")),
  row("whitespace around the parts is free", `${def("f", " a , b ", "[\${{a}}|\${{b}}]")}{{CALL  f ( a , "b" ) }}`, OUT("[A|b]")),
  row("zero parameters with a call that has spaces inside", `${def("g", "", "z")}{{CALL g()}}{{CALL g( )}}`, OUT("zz")),
  row("a call result inside text", `${F}<{{CALL f("a")}}|{{CALL f("b")}}>`, OUT("<[a]|[b]>")),
  row("the same macro with the same argument twice shares nothing", `${F}{{CALL f("x")}}{{CALL f("x")}}`, OUT("[x][x]")),
  row("two macros with the same parameter name", `${def("g", "p", "g\${{p}}")}${def("h", "p", "h\${{p}}")}{{CALL g(1)}}{{CALL h(2)}}`, OUT("g1h2")),
  row("a parameter passed on to another macro", `${def("g", "q", "<\${{q}}>")}${def("h", "p", "{{CALL g(p)}}")}{{CALL h(a)}}`, OUT("<A>")),
  row("a parameter and a literal passed on", `${def("g", "q", "<\${{q}}>")}${def("h", "p", '{{CALL g(p)}}{{CALL g("lit")}}')}{{CALL h(5)}}`, OUT("<5><lit>")),
  row("a macro called inside a macro called inside a macro", `${def("c", "", "C")}${def("b", "", "B{{CALL c()}}")}${def("a", "", "A{{CALL b()}}")}{{CALL a()}}`, OUT("ABC")),
  row("a literal containing a quote of the other kind", `${F}{{CALL f('a"b')}}{{CALL f("a'b")}}`, OUT("[a\"b][a'b]")),
];

const VALUE_ROWS: Row[] = [
  row("an array argument is walked by a FOR with limit and @total", `${def("g", "p", "{{FOR p AS i limit=2}}\${{i}}\${{@total}}{{END_FOR}}")}{{CALL g(xs)}}`, OUT("b2a2")),
  row("an array argument keeps its paths", `${def("g", "p", "\${{p.1}}\${{p.length}}")}{{CALL g(xs)}}`, OUT("a3")),
  row("an array of objects stays walkable", `${def("g", "p", "{{FOR p AS i}}\${{i.n}}{{END_FOR}}")}{{CALL g(items)}}`, OUT("xy")),
  row("an object argument is read by path", `${def("g", "p", "\${{p.k}}\${{p.n.d}}")}{{CALL g(o)}}`, OUT("v1")),
  row("a number argument is a number in math", `${def("g", "p", "\${{p + 1}}")}{{CALL g(n)}}`, OUT("6")),
  row("the literal 5 is a number in math", `${def("g", "p", "\${{p + 1}}")}{{CALL g(5)}}`, OUT("6")),
  row("the literal -3 is a number in math", `${def("g", "p", "\${{p + 1}}")}{{CALL g(-3)}}`, OUT("-2")),
  row("a number is compared as a number", `${def("g", "p", "{{IF p > 3}}y{{ELSE}}n{{END_IF}}")}{{CALL g(n)}}{{CALL g(2)}}{{CALL g(1.50)}}`, OUT("ynn")),
  row("false, true and null in a condition", `${def("g", "p", "{{IF p}}y{{ELSE}}n{{END_IF}}")}{{CALL g(false)}}{{CALL g(f)}}{{CALL g(true)}}{{CALL g(null)}}{{CALL g(a)}}`, OUT("nnyny")),
  row("a text is compared as a text", `${def("g", "p", '{{IF p == "a"}}y{{ELSE}}n{{END_IF}}')}{{CALL g("a")}}{{CALL g("b")}}`, OUT("yn")),
  row("@index0 of the caller's loop is passed as a number", `${F}{{FOR xs AS i}}{{CALL f(@index0)}}{{END_FOR}}`, OUT("[0][1][2]")),
  row("a passed @index0 is used in math", `${def("g", "p", "\${{p + 1}}")}{{FOR xs AS i}}{{CALL g(@index0)}}{{END_FOR}}`, OUT("123")),
  row("@total and @first are passed as values", `${F}{{FOR xs AS i limit=2}}{{CALL f(@total)}}{{CALL f(@first)}}{{END_FOR}}`, OUT("[2][true][2][false]")),
  row("the caller's loop item is an argument", `${F}{{FOR xs AS i}}{{CALL f(i)}}{{END_FOR}}`, OUT("[b][a][b]")),
  row("a field of the caller's loop item is an argument", `${F}{{FOR items AS it}}{{CALL f(it.n)}}{{END_FOR}}`, OUT("[x][y]")),
  row("a SET local of the caller is an argument", `${F}{{SET l = "loc"}}{{CALL f(l)}}`, OUT("[loc]")),
  row("a SET local that holds an array is an argument and stays an array", `${def("g", "p", "{{FOR p AS i}}\${{i}}{{END_FOR}}")}{{SET l = xs | sort}}{{CALL g(l)}}`, OUT("abb")),
  row("a SET local that holds a number is a number in the body", `${def("g", "p", "\${{p + 1}}")}{{SET l = 2 * 3}}{{CALL g(l)}}`, OUT("7")),
  row("an argument read in a FOR sees the item of that iteration", `${F}{{FOR items AS it}}{{CALL f(it.n)}}[\${{@index1}}]{{END_FOR}}`, OUT("[x][1][y][2]")),
  row("astral characters pass through unchanged and keep today's length rule", `${def("g", "p", "\${{p | length}}|\${{p | upper}}")}{{CALL g("😀😀")}}`, OUT("4|😀😀")),
  row("an argument that is a data text with astral characters", `${def("g", "p", "\${{p | length}}")}{{CALL g(emoji)}}`, OUT("4"), { data: { emoji: "😀😀" } }),
  row("the argument of a call inside a FOR is read per iteration", `${def("g", "p", "\${{p}}")}{{FOR many AS i limit=3}}{{CALL g(i)}}{{END_FOR}}`, OUT("012")),
];

const CONTEXT_ROWS: Row[] = [
  row("a CALL in an IF body", `${F}{{IF t}}{{CALL f("x")}}{{END_IF}}`, OUT("[x]")),
  row("a CALL in an ELSEIF body", `${F}{{IF f}}n{{ELSEIF t}}{{CALL f("x")}}{{END_IF}}`, OUT("[x]")),
  row("a CALL in an ELSE body", `${F}{{IF f}}n{{ELSE}}{{CALL f("x")}}{{END_IF}}`, OUT("[x]")),
  row("a CALL in a CASE clause", `${F}{{CASE b}}{{WHEN 2}}{{CALL f("x")}}{{END_CASE}}`, OUT("[x]")),
  row("a CALL in a CASE DEFAULT", `${F}{{CASE b}}{{WHEN 1}}w{{DEFAULT}}{{CALL f("x")}}{{END_CASE}}`, OUT("[x]")),
  row("a CALL in the ELSE body of a FOR", `${F}{{FOR e AS i}}y{{ELSE}}{{CALL f("x")}}{{END_FOR}}`, OUT("[x]")),
  row("a CALL in a SECTION", `${F}{{SECTION "T"}}{{CALL f("x")}}{{END_SECTION}}`, OUT("## T\n\n[x]\n")),
  row("a CALL in a FENCE", `${F}{{FENCE}}{{CALL f("x")}}{{END_FENCE}}`, OUT("```\n[x]\n```\n")),
  row("a CALL in a LIST_ITEM", `${F}{{LIST}}{{LIST_ITEM}}{{CALL f("x")}}{{END_LIST_ITEM}}{{END_LIST}}`, OUT("1. [x]")),
  row("a CALL in a ROW cell", `${F}{{TABLE}}{{ROW}}{{CALL f("x")}}|b{{END_ROW}}{{END_TABLE}}`, OUT("| [x] | b |")),
  row("a CALL in the body of a FOR written in a TABLE is part of the row text", `${F}{{TABLE}}{{FOR xs AS x}}{{CALL f(x)}}|1\n{{END_FOR}}{{END_TABLE}}`, OUT("| [b] | 1 |\n| [a] | 1 |\n| [b] | 1 |")),
  row("a CALL in a macro called in a LIST_ITEM of a FOR in a LIST", `${F}{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}{{CALL f(x)}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}`, OUT("1. [b]\n2. [a]\n3. [b]")),
  row("a macro whose body holds a LIST", `${def("g", "", "{{LIST}}{{LIST_ITEM}}one{{END_LIST_ITEM}}{{LIST_ITEM}}two{{END_LIST_ITEM}}{{END_LIST}}")}{{CALL g()}}`, OUT("1. one\n2. two")),
  row("a macro whose body holds a TABLE", `${def("g", "", "{{TABLE}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}")}{{CALL g()}}`, OUT("| 1 | 2 |")),
  row("a macro whose body holds a SECTION and a FENCE", `${def("g", "", '{{SECTION "S"}}{{FENCE}}c{{END_FENCE}}{{END_SECTION}}')}{{CALL g()}}`, OUT("## S\n\n```\nc\n```\n")),
  row("a macro whose body holds a FOR with an ELSE body", `${def("g", "p", "{{FOR p AS i}}\${{i}}{{ELSE}}none{{END_FOR}}")}{{CALL g(xs)}}|{{CALL g(e)}}`, OUT("bab|none")),
  row("a macro whose body holds a CASE", `${def("g", "p", '{{CASE p}}{{WHEN "a"}}A{{WHEN "b"}}B{{DEFAULT}}?{{END_CASE}}')}{{CALL g("a")}}{{CALL g("b")}}{{CALL g("c")}}`, OUT("AB?")),
  row("a CALL between texts", `${F}a{{CALL f("1")}}b{{CALL f("2")}}c`, OUT("a[1]b[2]c")),
];

const MISSING_ROWS: Row[] = [
  mrow("a missing path argument: strict error at the CALL, lenient null", `a\n  §{{CALL f(missing)}}${F}`, MV, "'missing'", "a\n  []", {}),
  mrow("a missing dotted path argument", `a\n  §{{CALL f(missing.deep)}}${F}`, MV, "'missing'", "a\n  []"),
  mrow("a missing @ name outside a loop", `a\n  §{{CALL f(@index0)}}${F}`, MV, "'@index0'", "a\n  []"),
  mrow("the second of two arguments is missing", `a\n  §{{CALL f2(a, missing)}}${def("f2", "p, q", "[\${{p}}|\${{q}}]")}`, MV, "'missing'", "a\n  [A|]"),
  mrow("a missing argument inside a FOR is located at the CALL", `${F}{{FOR xs AS i}}x\n  §{{CALL f(missing)}}{{END_FOR}}`, MV, "'missing'", "x\n  []x\n  []x\n  []"),
  mrow("lenient null makes IF false", `${def("g", "p", "{{IF p}}y{{ELSE}}n{{END_IF}}")}§{{CALL g(missing)}}`, MV, "'missing'", "n"),
  row("a nested missing key is null in both modes", `${F}{{CALL f(o.zz)}}{{CALL f(o.k.zz)}}`, OUT("[][]")),
  mrow("a nested missing key under a missing root is still an error in strict mode", `${F}§{{CALL f(missing.zz)}}`, MV, "'missing'", "[]"),
  row("a present null is a value, not a missing name", `${F}{{CALL f(nul)}}`, OUT("[]")),
  ((): Row => {
    const m = marked(`${F}§{{CALL f(missing)}}`);
    return row("the error at a CALL argument names no macro", m.tpl, SL(ERR(MV, m.line, m.col, "'missing'", INSIDE), OUT("[]")));
  })(),
];

const PRINT_ROWS: Row[] = [
  row("a cyclic value passed to a macro that never prints it is fine", `${def("g", "p", "ok")}{{CALL g(cyc)}}`, OUT("ok")),
  row("a BigInt passed to a macro that never prints it is fine", `${def("g", "p", "ok")}{{CALL g(big)}}`, OUT("ok")),
  row("a cyclic value passed on to another macro is fine", `${def("g", "q", "ok")}${def("h", "p", "{{CALL g(p)}}")}{{CALL h(cyc)}}`, OUT("ok")),
  row("a cyclic value used for its length of keys: a SET of it is fine", `${def("g", "p", "{{SET c = p}}ok")}{{CALL g(cyc)}}`, OUT("ok")),
];

describe("mc-call: arguments bind by position, paths and literals, values stay values", () => {
  it.each(expand(ARG_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));
  it.each(expand(BIND_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));
  it.each(expand(VALUE_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));
  it.each(expand(CONTEXT_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));
  it.each(expand(MISSING_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));
  it.each(expand(PRINT_ROWS))("mc-call: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-call"));

  it("mc-call: render and resolve agree on every argument case in lenient and strict mode", () => {
    for (const [arg] of ARG_CASES) {
      const tpl = `${F}{{CALL f(${arg})}}`;
      const outs = ENTRIES.map((e) => run(e, tpl, DATA).output);
      check(new Set(outs).size, `${arg}: the four entries print the same ${JSON.stringify(outs)}`).toBe(1);
    }
  });

  it("mc-call: a call does not write the caller's data (render twice, then the Map)", () => {
    const data: Record<string, any> = { a: "A", o: { k: "v" }, xs: ["b"] };
    const before = JSON.stringify(data);
    const tpl = `${def("g", "a, o", '{{SET q = "z"}}\${{a}}\${{o.k}}{{FOR xs AS i}}\${{i}}{{END_FOR}}')}{{CALL g("P", o)}}[\${{a}}]`;
    const one = render(tpl, data);
    const two = render(tpl, data);
    check(one.output, "the first render").toBe("Pvb[A]");
    check(two.output, "the second render is the same").toBe("Pvb[A]");
    check(JSON.stringify(data), "the data object is untouched").toBe(before);
    const map = new Map<string, any>(Object.entries(data));
    check(resolveTemplate(tpl, map), "resolve prints the same").toBe("Pvb[A]");
    check([...map.keys()], "the Map keys are untouched").toEqual(["a", "o", "xs"]);
    check(map.get("a"), "the Map value of the parameter name is untouched").toBe("A");
  });
});

// =====================================================================================
// mc-link: an unknown macro or a wrong argument count is found before any output
// =====================================================================================

const UNKNOWN_ROWS: Row[] = [
  mrow("an unknown macro is a syntax-error at the CALL", "a\n  §{{CALL nope()}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("a macro that differs only in case is unknown", `${def("a", "", "x")}\n§{{CALL A()}}`, "syntax-error", ["Unknown macro", "A"], "same"),
  mrow("in an IF branch that never renders", "{{IF f}}§{{CALL nope()}}{{END_IF}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in an ELSE branch that never renders", "{{IF t}}a{{ELSE}}§{{CALL nope()}}{{END_IF}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a FOR over nothing", "{{FOR e AS i}}§{{CALL nope()}}{{END_FOR}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a CASE clause that never matches", "{{CASE b}}{{WHEN 1}}§{{CALL nope()}}{{END_CASE}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a DEFINE body that is never called", `${def("a", "", "§{{CALL nope()}}")}x`, "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a LIST item", "{{LIST}}{{LIST_ITEM}}§{{CALL nope()}}{{END_LIST_ITEM}}{{END_LIST}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a ROW cell", "{{TABLE}}{{ROW}}§{{CALL nope()}}|b{{END_ROW}}{{END_TABLE}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in the body of a FOR written in a TABLE", "{{TABLE}}{{FOR xs AS x}}§{{CALL nope()}}|1\n{{END_FOR}}{{END_TABLE}}", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("in a SECTION and a FENCE", '{{SECTION "T"}}{{FENCE}}§{{CALL nope()}}{{END_FENCE}}{{END_SECTION}}', "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("after text and variables the error is still at the CALL", "text \${{a}} \nmore\n  §{{CALL nope()}} end", "syntax-error", ["Unknown macro", "nope"], "same"),
  mrow("the first unknown call in source order is reported", "x\n§{{CALL one()}}{{CALL two()}}", "syntax-error", ["Unknown macro", "one"], "same"),
  mrow("an unknown call inside a macro that comes before a later unknown call at the top", `${def("a", "", "§{{CALL inner()}}")}{{CALL outer()}}`, "syntax-error", ["Unknown macro", "inner"], "same"),
  mrow("a lexing error comes before the link check", "{{CALL nope()}}§{{FOO}}", "syntax-error", UNKNOWN_TAG, "same"),
  mrow("a parse error comes before the link check", "{{CALL nope()}}\n§{{DEFINE a(1)}}x{{END_DEFINE}}", "syntax-error", undefined, "same"),
];

const COUNT_ROWS: Row[] = [
  mrow("a call with too few arguments", `${def("a", "x, y", "")}\n§{{CALL a(1)}}`, "syntax-error", "Macro 'a' takes 2 argument(s), got 1", "same"),
  mrow("a call with too many arguments", `${def("a", "x, y", "")}\n§{{CALL a(1, 2, 3)}}`, "syntax-error", "Macro 'a' takes 2 argument(s), got 3", "same"),
  mrow("a zero-parameter macro called with an argument", `${def("z", "", "")}\n§{{CALL z(1)}}`, "syntax-error", "Macro 'z' takes 0 argument(s), got 1", "same"),
  mrow("a one-parameter macro called with none", `${F}\n§{{CALL f()}}`, "syntax-error", "Macro 'f' takes 1 argument(s), got 0", "same"),
  mrow("a wrong count in a branch that never renders", `${F}{{IF f}}§{{CALL f()}}{{END_IF}}`, "syntax-error", "takes 1 argument(s), got 0", "same"),
  mrow("a wrong count inside a macro that is never called", `${F}${def("a", "", "§{{CALL f(1, 2)}}")}x`, "syntax-error", "takes 1 argument(s), got 2", "same"),
  mrow("a wrong count for a macro defined later", `§{{CALL f(1, 2)}}${F}`, "syntax-error", "takes 1 argument(s), got 2", "same"),
  mrow("a wrong count in a FOR with no items", `${F}{{FOR e AS i}}§{{CALL f()}}{{END_FOR}}`, "syntax-error", "takes 1 argument(s), got 0", "same"),
  mrow("the first wrong call in source order is reported", `${F}\n§{{CALL f()}}{{CALL f(1, 2)}}`, "syntax-error", "got 0", "same"),
  mrow("a wrong count and an unknown macro: the first in source order is reported", `${F}\n§{{CALL nope()}}{{CALL f()}}`, "syntax-error", "Unknown macro", "same"),
  mrow("an unknown macro and then a wrong count: the first in source order is reported", `${F}\n§{{CALL f()}}{{CALL nope()}}`, "syntax-error", "got 0", "same"),
  mrow("a right count with a text argument that holds a comma is one argument", `${F}§{{CALL f("a,b", "c")}}`, "syntax-error", "takes 1 argument(s), got 2", "same"),
];

const CALL_SYNTAX: string[] = [
  "{{CALL}}", "{{CALL f}}", "{{CALL f(}}", "{{CALL f)}}", "{{CALL f(a,)}}", "{{CALL f(,a)}}", "{{CALL f(a,,b)}}", "{{CALL f(a b)}}",
  "{{CALL f(a + 1)}}", "{{CALL f(a | upper)}}", '{{CALL f(a ?? "d")}}', '{{CALL f("unclosed)}}', "{{CALL f() x}}", "{{CALL 1f()}}",
  "{{CALL f(a)(b)}}", "{{CALL f(1 2)}}",
  "{{CALL f(a * 2)}}", "{{CALL f(a == b)}}", '{{CALL f("a" "b")}}', "{{CALL f-g()}}", "{{CALL f ()x}}", "{{CALL f[a]}}",
];
const CALL_SYNTAX_ROWS: Row[] = CALL_SYNTAX.map((tag) => always(`${tag} is a syntax-error at the CALL`, `${F}\n§${tag}`, "syntax-error"));
const CALL_SYNTAX_HIDDEN: Row[] = [
  always("a bad CALL in a branch that never renders", `${F}{{IF f}}§{{CALL f(a + 1)}}{{END_IF}}`, "syntax-error"),
  always("a bad CALL in a macro that is never called", `${F}${def("g", "", "§{{CALL f(a | upper)}}")}`, "syntax-error"),
  always("a bad CALL after text that would print", `text\n§{{CALL f(a ?? "d")}}${F}`, "syntax-error"),
  always("{{END_CALL}} is an unknown tag", "a\n§{{END_CALL}}", "syntax-error", UNKNOWN_TAG),
  always("{{call f()}} in lower case is an unknown tag", "a\n§{{call f()}}", "syntax-error", UNKNOWN_TAG),
  always("{{define f()}} in lower case is an unknown tag", "a\n§{{define f()}}", "syntax-error", UNKNOWN_TAG),
  always("{{Call f()}} in mixed case is an unknown tag", "a\n§{{Call f()}}", "syntax-error", UNKNOWN_TAG),
  always("{{CALL}} among LIST children is the same located error as any other tag", `${F}{{LIST}}§{{CALL f("x")}}{{END_LIST}}`, "syntax-error", "Unexpected token in LIST: CALL"),
  always("{{CALL}} among TABLE children is the same located error", `${F}{{TABLE}}§{{CALL f("x")}}{{END_TABLE}}`, "syntax-error", "Unexpected token in TABLE: CALL"),
  always("{{CALL}} in a FOR that builds list items is the same located error", `${F}{{LIST}}{{FOR xs AS x}}§{{CALL f(x)}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}`, "syntax-error", "Unexpected token in LIST: CALL"),
  always("{{CALL}} in an IF that builds list items is the same located error", `${F}{{LIST}}{{IF t}}§{{CALL f("x")}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}`, "syntax-error", "Unexpected token in LIST: CALL"),
  always("{{CALL}} in an IF that builds table rows is the same located error", `${F}{{TABLE}}{{IF t}}§{{CALL f("x")}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}`, "syntax-error", "Unexpected token in TABLE: CALL"),
  always("{{CALL}} in a FOR that builds table rows is the same located error", `${F}{{TABLE}}{{IF t}}{{FOR xs AS x}}§{{CALL f(x)}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}`, "syntax-error", "Unexpected token in TABLE: CALL"),
];

describe("mc-link: an unknown macro or a wrong argument count is a syntax-error at the CALL", () => {
  it.each(expand(UNKNOWN_ROWS))("mc-link: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-link"));
  it.each(expand(COUNT_ROWS))("mc-link: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-link"));
  it.each(expand(CALL_SYNTAX_ROWS))("mc-link: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-link"));
  it.each(expand(CALL_SYNTAX_HIDDEN))("mc-link: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-link"));

  it.each(RENDER)("mc-link: [%s] a link error comes before any output and any work", (entry) => {
    for (const [tpl, says] of [["text \${{a}} {{FOR xs AS i}}x{{END_FOR}}{{CALL nope()}}", "Unknown macro: nope"], [`${F}{{FOR xs AS i}}{{CALL f(i)}}{{END_FOR}}{{CALL f()}}`, "Macro 'f' takes 1 argument(s), got 0"]]) {
      const o = run(entry, tpl, DATA);
      check(o.message ?? "", `[${entry}] the link error says what is wrong`).toContain(says);
      check(o.code, `[${entry}] ${tpl}: syntax-error`).toBe("syntax-error");
      check(o.output, `[${entry}] a failed render has no output`).toBe("");
      check(o.iterations, `[${entry}] no loop item or call ran before the link error`).toBe(0);
    }
  });

  // validate and analyze: an unknown name is a diagnostic (a warning in validate), a wrong count is thrown like a parse error
  const unknownStatic = UNKNOWN_ROWS.slice(0, 14);
  it.each(unknownStatic.map((r) => ({ r, name: r.name })))("mc-link: [analyze] $name is an unknown-macro diagnostic at the CALL, not a throw", ({ r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    const a = analyzed(r.tpl);
    check(a.diagnostics[0]?.code, "the first diagnostic is unknown-macro").toBe("unknown-macro");
    check({ line: a.diagnostics[0].line, column: a.diagnostics[0].column }, "located at the CALL").toEqual({ line: want.line, column: want.col });
    check(a.diagnostics[0].message, "the message names the macro").toContain("Unknown macro");
    for (const h of want.has ?? []) check(a.diagnostics[0].message, `the message holds ${h}`).toContain(h);
  });
  it.each(unknownStatic.map((r) => ({ r, name: r.name })))("mc-link: [validate] $name is an analysis-warning at the CALL and validate stays ok", ({ r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    const v = validate(r.tpl);
    check(v.ok, "an unresolved macro is a warning, not an error").toBe(true);
    const w = v.diagnostics.find((d) => d.code === "analysis-warning" && d.message.includes("Unknown macro"));
    check(w, `an analysis-warning for the unknown macro in ${JSON.stringify(v.diagnostics)}`).toBeDefined();
    check(w?.severity, "severity warning").toBe("warning");
    check({ line: w?.line, column: w?.column }, "located at the CALL").toEqual({ line: want.line, column: want.col });
  });

  const countStatic = [...COUNT_ROWS.filter((_, i) => i !== 9 && i !== 10), ...TWICE_ROWS.slice(0, 3)];
  it.each(countStatic.map((r) => ({ r, name: r.name })))("mc-link: [analyze] $name is thrown like a parse error", ({ r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    const o = runStatic("analyze", r.tpl);
    verifyOutcome(o, ERR("syntax-error", want.line, want.col, want.has), `mc-link [analyze] ${r.name}`);
    check(() => analyze(r.tpl), "analyze throws the error like a parse error").toThrow(TemplateError);
  });
  it.each(countStatic.map((r) => ({ r, name: r.name })))("mc-link: [validate] $name is an error diagnostic", ({ r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    const v = validate(r.tpl);

    check(v.ok, "validate is not ok").toBe(false);
    const d = v.diagnostics.find((x) => x.severity === "error");
    check({ code: d?.code, line: d?.line, column: d?.column }, "an error diagnostic at the CALL or the second definition").toEqual({ code: "syntax-error", line: want.line, column: want.col });
    check((d?.message ?? "").includes(UNKNOWN_TAG), `the tags are known (got ${d?.message})`).toBe(false);
  });

  const both = [
    { name: "a wrong count first and an unknown macro after", m: marked("§{{CALL a(1)}}{{CALL nope()}}"), pre: def("a", "", "x") },
    { name: "an unknown macro first and a wrong count after", m: marked("{{CALL nope()}}\n§{{CALL a(1)}}"), pre: def("a", "", "x") },
  ];
  it.each(both)("mc-link: $name: analyze throws the wrong count and validate is not ok", ({ m, pre }) => {
    const tpl = pre + m.tpl;
    const want = { line: m.line, col: m.col + (m.line === 1 ? pre.length : 0) };
    const o = runStatic("analyze", tpl);
    verifyOutcome(o, ERR("syntax-error", want.line, want.col, "takes 0 argument(s), got 1"), "mc-link analyze");
    const v = validate(tpl);
    check(v.ok, "validate is not ok").toBe(false);
    check(v.diagnostics.find((d) => d.severity === "error")?.code, "the wrong count is the error").toBe("syntax-error");
  });

  it("mc-link: two unknown macros are two diagnostics in source order, the analysis still complete", () => {
    const tpl = "\${{a}}{{CALL one()}}\n{{CALL two(a)}}";
    const a = analyzed(tpl);
    check(a.diagnostics.map((d: any) => [d.code, d.line, d.column]), "the diagnostics").toEqual([["unknown-macro", 1, 7], ["unknown-macro", 2, 1]]);
    check(a.variables.map((v: any) => v.name), "the names read are still listed").toEqual(["a"]);
    const v = validate(tpl);
    check(v.ok, "only warnings").toBe(true);
    check(v.diagnostics.map((d) => d.code), "two warnings").toEqual(["analysis-warning", "analysis-warning"]);
  });

  it("mc-link: an unknown macro beside an unknown filter: validate is not ok because of the filter, and keeps the warning", () => {
    const v = validate("\${{s | nope}}{{CALL zz()}}");
    check(v.ok, "the filter is an error").toBe(false);
    check(v.diagnostics.map((d) => `${d.severity}:${d.code}`).sort(), "both diagnostics").toEqual(["error:unknown-filter", "warning:analysis-warning"]);
  });

  it("mc-link: a known call has no diagnostic in analyze and validate", () => {
    const tpl = `${F}{{CALL f(a)}}`;
    check(analyzed(tpl).diagnostics, "no diagnostics").toEqual([]);
    check(validate(tpl), "validate is ok").toEqual({ ok: true, diagnostics: [] });
  });
});

// =====================================================================================
// mc-scope: the body sees its parameters and the data, nothing of the caller
// =====================================================================================

// the link check walks every branch of a long ELSEIF chain without a stack overflow (the existing chain tests run 8000 branches)
const elseifChain = (n: number, last: string, text = true): string =>
  `{{IF v == "0"}}${text ? "b0" : ""}` + Array.from({ length: n - 1 }, (_, i) => `{{ELSEIF v == "${i + 1}"}}${text ? `b${i + 1}` : ""}`).join("") + `{{ELSE}}${last}{{END_IF}}`;
const CHAIN_DATA = { v: "1" };
const ELSEIF_ROWS: Row[] = [
  mrow("an unknown macro in the ELSE of a 19000-branch ELSEIF chain is found", elseifChain(19000, "§{{CALL nope()}}", false), "syntax-error", ["Unknown macro", "nope"], "same", { data: CHAIN_DATA }),
  mrow("a wrong count in the ELSE of a 19000-branch ELSEIF chain is found", `${def("a", "", "x")}${elseifChain(19000, "§{{CALL a(1)}}", false)}`, "syntax-error", "takes 0 argument(s), got 1", "same", { data: CHAIN_DATA }),
  mrow("an unknown macro in the middle branch of an 8000-branch ELSEIF chain is found", elseifChain(8000, "x").replace('{{ELSEIF v == "4000"}}b4000', '{{ELSEIF v == "4000"}}§{{CALL nope()}}'), "syntax-error", ["Unknown macro", "nope"], "same", { data: CHAIN_DATA }),
  row("a known macro in the ELSE of an 8000-branch ELSEIF chain links and the chain renders its true branch", `${def("a", "", "x")}${elseifChain(8000, "{{CALL a()}}")}`, OUT("b1"), { data: CHAIN_DATA }),
  row("a known macro called by the true branch of a long chain renders", `${def("a", "", "x")}${elseifChain(8000, "z").replace('{{ELSEIF v == "1"}}b1', '{{ELSEIF v == "1"}}{{CALL a()}}')}`, OUT("x"), { data: CHAIN_DATA }),
];
describe("mc-link: a long ELSEIF chain is walked without a stack overflow", () => {
  it.each(expand(ELSEIF_ROWS))("mc-link: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-link"));
  it("mc-link: analyze and validate walk a 19000-branch chain: an unknown macro is one diagnostic at the CALL, a known one is clean", () => {
    const m = marked(elseifChain(19000, "§{{CALL nope()}}", false));
    check(analyzed(m.tpl).diagnostics.map((d: any) => [d.code, d.line, d.column]), "the unknown macro").toEqual([["unknown-macro", m.line, m.col]]);
    const v = validate(m.tpl);
    check(v.ok, "a warning, still ok").toBe(true);
    check(v.diagnostics.map((d) => [d.code, d.line, d.column]), "one warning").toEqual([["analysis-warning", m.line, m.col]]);
    const ok = `${def("a", "", "x")}${elseifChain(19000, "{{CALL a()}}", false)}`;
    check(analyzed(ok).diagnostics, "a known macro in the last branch").toEqual([]);
    check(validate(ok), "validate is ok").toEqual({ ok: true, diagnostics: [] });
  });
  it("mc-link: analyze throws a wrong count found in the last branch of a 19000-branch chain", () => {
    const m = marked(`${def("a", "", "x")}${elseifChain(19000, "§{{CALL a(1)}}", false)}`);
    verifyOutcome(runStatic("analyze", m.tpl), ERR("syntax-error", m.line, m.col, "takes 0 argument(s), got 1"), "mc-link analyze");
  });
});

const loop = (name: string) => `${def("f", "", `[§\${{${name}}}]`)}{{FOR one AS i}}{{CALL f()}}{{END_FOR}}`;
const SCOPE_ROWS: Row[] = [
  row("the body reads the data", `${def("f", "", "[\${{a}}]")}{{CALL f()}}`, OUT("[A]")),
  row("the body reads data inside nested blocks", `${def("f", "", "{{IF t}}{{FOR xs AS i limit=1}}[\${{a}}\${{i}}]{{END_FOR}}{{END_IF}}")}{{CALL f()}}`, OUT("[Ab]")),
  mrow("the body cannot read the caller's SET local", `${def("f", "", "[§\${{loc}}]")}{{SET loc = "L"}}{{CALL f()}}`, MV, "'loc'", "[]"),
  mrow("the body cannot read the caller's SET local set in a block", `${def("f", "", "[§\${{loc}}]")}{{IF t}}{{SET loc = "L"}}{{CALL f()}}{{END_IF}}`, MV, "'loc'", "[]"),
  mrow("the body cannot read the caller's FOR item", loop("i"), MV, "'i'", "[]"),
  ...["@index0", "@index1", "@total", "@first", "@last", "@notFirst", "@notLast"].map((m) => mrow(`the body cannot read the caller's ${m}`, loop(m), MV, `'${m}'`, "[]")),
  mrow("the body of a macro called from a macro cannot read the outer macro's parameter", `${def("g", "", "[§\${{p}}]")}${def("f", "p", "{{CALL g()}}")}{{CALL f("x")}}`, MV, "'p'", "[]"),
  mrow("the body cannot read the loop item of a loop inside another macro", `${def("g", "", "[§\${{j}}]")}${def("f", "", "{{FOR one AS j}}{{CALL g()}}{{END_FOR}}")}{{CALL f()}}`, MV, "'j'", "[]"),
  row("a data name with the name of the caller's SET local reads the data in the body", `${def("f", "", "[\${{x}}]")}{{SET x = "LOCAL"}}[\${{x}}]{{CALL f()}}`, OUT("[LOCAL][DX]")),
  row("a data name with the name of the caller's loop item reads the data in the body", `${def("f", "", "[\${{x}}]")}{{FOR one AS x}}\${{x}}{{CALL f()}}{{END_FOR}}`, OUT("z[DX]")),
  row("a parameter shadows the data", `${def("f", "a", "[\${{a}}]")}{{CALL f("P")}}[\${{a}}]`, OUT("[P][A]")),
  row("a parameter shadows the caller's loop item of the same name", `${def("f", "i", "[\${{i}}]")}{{FOR xs AS i limit=1}}\${{i}}{{CALL f("P")}}\${{i}}{{END_FOR}}`, OUT("b[P]b")),
  row("a parameter shadows a caller's SET local of the same name", `${def("f", "l", "[\${{l}}]")}{{SET l = "L"}}{{CALL f("P")}}[\${{l}}]`, OUT("[P][L]")),
  row("the caller's SET local is intact after the call", `${F}{{SET l = "L"}}{{CALL f("x")}}[\${{l}}]`, OUT("[x][L]")),
  row("the caller's loop item and metadata are intact after each call", `${F}{{FOR xs AS i}}{{CALL f(i)}}\${{@index0}}\${{i}}{{END_FOR}}`, OUT("[b]0b[a]1a[b]2b")),
  row("the caller's @total is intact after a call", `${F}{{FOR xs AS i}}{{CALL f("z")}}\${{@total}}{{END_FOR}}`, OUT("[z]3[z]3[z]3")),
  row("the caller's SET local is intact after a call that sets the same name", `${def("f", "", '{{SET l = "in"}}[\${{l}}]')}{{SET l = "out"}}{{CALL f()}}[\${{l}}]`, OUT("[in][out]")),
  row("a SET in the body is local to the call: the second call starts clean", `${def("f", "", '[\${{v ?? "none"}}]{{SET v = "in"}}[\${{v}}]')}{{CALL f()}}{{CALL f()}}`, OUT("[none][in][none][in]")),
  mrow("a SET in the body is gone after the call", `${def("f", "", '{{SET v = "in"}}[\${{v}}]')}{{CALL f()}}[§\${{v}}]`, MV, "'v'", "[in][]"),
  row("a SET in the body of a macro does not leak into the macro that called it", `${def("g", "", '{{SET v = "g"}}')}${def("f", "", '{{CALL g()}}[\${{v ?? "none"}}]')}{{CALL f()}}`, OUT("[none]")),
  row("a SET of another name than a parameter is fine", `${def("f", "p", "{{SET q = p}}[\${{q}}]")}{{CALL f("z")}}`, OUT("[z]")),
  row("a SET in the body reads the parameter and the data", `${def("f", "p", "{{SET q = p | upper}}{{SET r = a}}[\${{q}}\${{r}}]")}{{CALL f("z")}}`, OUT("[ZA]")),
  row("a FOR item named like a parameter is allowed and shadows inside the loop", `${def("f", "p", "{{FOR xs AS p}}\${{p}}{{END_FOR}}|\${{p}}")}{{CALL f("P")}}`, OUT("bab|P")),
  row("a SET at the top level of a name that another macro takes as a parameter is fine", `${F}{{SET p = "top"}}[\${{p}}]{{CALL f("x")}}`, OUT("[top][x]")),
  row("a SET in one macro of a name that another macro takes as a parameter is fine", `${F}${def("g", "", '{{SET p = "g"}}[\${{p}}]')}{{CALL g()}}{{CALL f("x")}}`, OUT("[g][x]")),
  row("each level of a recursion has its own parameter", `${def("c", "p", '[\${{p}}]{{IF p == "a"}}{{CALL c("b")}}{{END_IF}}{{IF p == "b"}}{{CALL c("x")}}{{END_IF}}[\${{p}}]')}{{CALL c("a")}}`, OUT("[a][b][x][x][b][a]")),
  row("a parameter named __proto__ or constructor reads back", `${def("f", "__proto__, constructor", "[\${{__proto__}}|\${{constructor}}]")}{{CALL f("p", "c")}}`, OUT("[p|c]")),
  row("a parameter named toString and hasOwnProperty reads back", `${def("f", "toString, hasOwnProperty", "[\${{toString}}|\${{hasOwnProperty}}]")}{{CALL f(1, 2)}}`, OUT("[1|2]")),
  row("a path through a parameter to constructor is empty", `${def("f", "q", "[\${{q.constructor}}][\${{q.__proto__}}][\${{q.toString}}]")}{{CALL f(o)}}`, OUT("[][][]")),
  row("a parameter holding an array reads length and index", `${def("f", "q", "\${{q.length}}\${{q.0}}")}{{CALL f(xs)}}`, OUT("3b")),
  mrow("a name that is neither a parameter nor data is missing in the body", `${def("f", "p", "[§\${{nowhere}}]")}{{CALL f(1)}}`, MV, "'nowhere'", "[]"),
  row("the data is read in place: a parameter named like a data key leaves the data key alone", `${def("f", "a", "\${{a}}")}{{CALL f("P")}}\${{a}}${def("g", "", "\${{a}}")}{{CALL g()}}`, OUT("PAA")),
];

const SET_PARAM_ROWS: Row[] = [
  always("a SET of a parameter name is a syntax-error at the SET", "{{DEFINE f(p)}}§{{SET p = 1}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of the second parameter name", "{{DEFINE f(a, p)}}x§{{SET p = 1}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside an IF in the body", "{{DEFINE f(p)}}{{IF t}}§{{SET p = 1}}{{END_IF}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside a FOR in the body", "{{DEFINE f(p)}}{{FOR xs AS i}}§{{SET p = 1}}{{END_FOR}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside the ELSE body of a FOR in the body", "{{DEFINE f(p)}}{{FOR e AS i}}x{{ELSE}}§{{SET p = 1}}{{END_FOR}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside a CASE clause in the body", "{{DEFINE f(p)}}{{CASE b}}{{WHEN 2}}§{{SET p = 1}}{{END_CASE}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside a SECTION in the body", '{{DEFINE f(p)}}{{SECTION "T"}}§{{SET p = 1}}{{END_SECTION}}{{END_DEFINE}}', "syntax-error"),
  always("a SET of a parameter name inside a LIST_ITEM in the body", "{{DEFINE f(p)}}{{LIST}}{{LIST_ITEM}}§{{SET p = 1}}{{END_LIST_ITEM}}{{END_LIST}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside a ROW in the body", "{{DEFINE f(p)}}{{TABLE}}{{ROW}}§{{SET p = 1}}a|b{{END_ROW}}{{END_TABLE}}{{END_DEFINE}}", "syntax-error"),
  always("a SET of a parameter name inside the macro that is never called", "{{DEFINE f(p)}}§{{SET p = 1}}{{END_DEFINE}}text", "syntax-error"),
  always("a SET of a prototype parameter name", "{{DEFINE f(constructor)}}§{{SET constructor = 1}}{{END_DEFINE}}", "syntax-error"),
  always("a SET naming a loop item inside a macro body is still an error", "{{DEFINE f()}}{{FOR xs AS i}}§{{SET i = 1}}{{END_FOR}}{{END_DEFINE}}", "syntax-error"),
];

describe("mc-scope: a body sees its parameters and the data, never the caller's names", () => {
  it.each(expand(SCOPE_ROWS))("mc-scope: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-scope"));
  it.each(expand(SET_PARAM_ROWS))("mc-scope: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-scope"));
  const statics = SET_PARAM_ROWS.flatMap((r) => (["validate", "analyze"] as const).map((kind) => ({ kind, r, name: r.name })));
  it.each(statics)("mc-scope: [$kind] $name", ({ kind, r }) => {
    const want = pick(r.want, "render-strict") as Extract<Want, { err: string }>;
    verifyOutcome(runStatic(kind, r.tpl), ERR(want.err, want.line, want.col), `mc-scope [${kind}] ${r.name}`);
  });
  it.each(ENTRIES)("mc-scope: [%s] the error of a body read names the macro that was running, not the caller's scope", (entry) => {
    const m = marked(`${def("g", "", "[§\${{p}}]")}${def("f", "p", "¤{{CALL g()}}")}{{CALL f("x")}}`);
    const o = run(entry, m.tpl, DATA);
    if (entry.endsWith("lenient")) return check(o.output, "lenient: empty").toBe("[]");
    verifyOutcome(o, ERR(MV, m.line, m.col, annot("g", m.call)), `mc-scope [${entry}]`);
  });
});

// =====================================================================================
// mc-depth: one runtime counter for blocks and calls, bounded by maxDepth and by 256
// =====================================================================================

const IFS = (n: number) => rep("{{IF t}}", n);
const END_IFS = (n: number) => rep("{{END_IF}}", n);
const nestedIf = (n: number, mid = "x") => IFS(n) + mid + END_IFS(n);
/** m1..mN, each body holding `nest` IFs around a CALL of the next macro (the last one holds `leaf`), then a CALL of m1. */
function chain(count: number, nest: number, leaf = "end"): string {
  let t = "";
  for (let k = 1; k <= count; k++) {
    const inner = k < count ? `{{CALL m${k + 1}()}}` : leaf;
    t += def(`m${k}`, "", IFS(nest) + inner + END_IFS(nest));
  }
  return `${t}{{CALL m1()}}`;
}
const INFINITE = `${def("a", "", "{{CALL a()}}")}{{CALL a()}}`; // the CALL inside the body is at 1:15
const MUTUAL = `${def("a", "", "{{CALL b()}}")}${def("b", "", "{{CALL a()}}")}{{CALL a()}}`;

/** The CALL of MUTUAL that makes call number n (the top call is number 1): b's body holds the odd ones, a's body the even ones. */
function mutualCrossing(n: number): Pos {
  return n % 2 === 0 ? nth(MUTUAL, "{{CALL b()}}") : nth(MUTUAL, "{{CALL a()}}");
}

const INFINITE_ROWS: Row[] = [
  row("an infinite recursion at default limits ends at the 33rd call", INFINITE, ERR("limit-depth", 1, 15, "(in macro 'a'")),
  ...[1, 2, 3, 10, 100].map((d) => row(`an infinite recursion at maxDepth ${d}`, INFINITE, ERR("limit-depth", 1, 15, "(in macro 'a'"), { limits: { maxDepth: d } })),
  ...[256, 257, 1000, 10000, 1000000].map((d) => row(`an infinite recursion at maxDepth ${d} is bounded by the cap of 256`, INFINITE, ERR("limit-depth", 1, 15, "(in macro 'a'"), { limits: { maxDepth: d } })),
  ...[32, 3, 100, 1000].map((d) => {
    const at = mutualCrossing(Math.min(d, 256) + 1);
    return row(`a mutual recursion at maxDepth ${d} ends at the call that is number ${Math.min(d, 256) + 1}`, MUTUAL, ERR("limit-depth", at.line, at.col, "(in macro '"), { limits: { maxDepth: d } });
  }),
  row("a macro that calls itself twice ends in limit-depth, not in limit-iterations", `${def("a", "", "{{CALL a()}}{{CALL a()}}")}{{CALL a()}}`, ERR("limit-depth", 1, 15)),
  ((): Row => {
    const tpl = `${def("a", "", "x{{CALL a()}}")}{{CALL a()}}`;
    const at = nth(tpl, "{{CALL a()}}");
    return row("a macro that calls itself after text ends in limit-depth", tpl, ERR("limit-depth", at.line, at.col));
  })(),
  ((): Row => {
    const tpl = `${def("a", "p", "{{CALL a(p)}}")}{{CALL a(1)}}`;
    const at = nth(tpl, "{{CALL a(p)}}");
    return row("a macro that calls itself through a parameter ends in limit-depth", tpl, ERR("limit-depth", at.line, at.col));
  })(),
  row("a macro that calls itself only while a condition holds ends when it stops holding", `${def("a", "p", '{{IF p != "end"}}{{CALL a("end")}}{{END_IF}}x')}{{CALL a("go")}}`, OUT("xx")),
];

// recursion through every kind of nested body, at default limits and at a raised maxDepth
const WRAPPERS: Array<[string, string, string]> = [
  ["two IF blocks", "{{IF t}}{{IF t}}", "{{END_IF}}{{END_IF}}"],
  ["an ELSEIF body", "{{IF f}}n{{ELSEIF t}}", "{{END_IF}}"],
  ["an ELSE body", "{{IF f}}n{{ELSE}}", "{{END_IF}}"],
  ["a FOR over one item", "{{FOR one AS i}}", "{{END_FOR}}"],
  ["the ELSE body of a FOR", "{{FOR e AS i}}y{{ELSE}}", "{{END_FOR}}"],
  ["a SECTION", '{{SECTION "T"}}', "{{END_SECTION}}"],
  ["a FENCE", "{{FENCE}}", "{{END_FENCE}}"],
  ["a CASE clause", "{{CASE b}}{{WHEN 2}}", "{{END_CASE}}"],
  ["a CASE DEFAULT", "{{CASE b}}{{WHEN 1}}w{{DEFAULT}}", "{{END_CASE}}"],
  ["a LIST_ITEM", "{{LIST}}{{LIST_ITEM}}", "{{END_LIST_ITEM}}{{END_LIST}}"],
  ["a FOR in a LIST that builds items", "{{LIST}}{{FOR one AS x}}{{LIST_ITEM}}", "{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}"],
  ["an IF in a LIST that builds items", "{{LIST}}{{IF t}}{{LIST_ITEM}}", "{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}"],
  ["a ROW", "{{TABLE}}{{ROW}}", "{{END_ROW}}{{END_TABLE}}"],
  ["a FOR and an IF in a TABLE that build rows", "{{TABLE}}{{FOR one AS x}}{{IF t}}{{ROW}}", "{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_TABLE}}"],
  ["a FOR written in a TABLE", "{{TABLE}}{{FOR one AS x}}", "|1\n{{END_FOR}}{{END_TABLE}}"],
];
const NEST_RECURSION: Array<{ label: string; tpl: string; limits?: Partial<Limits> }> = WRAPPERS.flatMap(([label, open, close]) =>
  [undefined, 1000, 100000].map((d) => ({
    label: `recursion through ${label} at ${d === undefined ? "default limits" : `maxDepth ${d}`}`,
    tpl: `${def("a", "", `${open}{{CALL a()}}${close}`)}{{CALL a()}}`,
    limits: d === undefined ? undefined : { maxDepth: d },
  })),
);

const COUNTING_ROWS: Row[] = [
  // two IFs around the CALL: the counter is 3n + 1 when call n is entered; the cap crosses at the first IF (col 15), or at the second at default limits
  row("recursion through two IFs at default limits crosses at the second IF of the 11th call", `${def("a", "", "{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}")}{{CALL a()}}`, ERR("limit-depth", 1, 23)),
  row("recursion through two IFs at maxDepth 100 crosses at the first IF of the 34th call", `${def("a", "", "{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}")}{{CALL a()}}`, ERR("limit-depth", 1, 15), { limits: { maxDepth: 100 } }),
  row("recursion through two IFs at maxDepth 1000 crosses at the first IF of the 86th call (the cap of 256)", `${def("a", "", "{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}")}{{CALL a()}}`, ERR("limit-depth", 1, 15), { limits: { maxDepth: 1000 } }),
  // a chain of a few blocks around the CALL
  ...[
    { name: "a body with three nested IFs, called at the top, at maxDepth 5", d: 5, out: "x" },
    { name: "a body with three nested IFs, called at the top, at maxDepth 4", d: 4, out: "x" },
  ].map((c) => row(c.name, `${def("a", "", nestedIf(3))}{{CALL a()}}`, OUT(c.out), { limits: { maxDepth: c.d } })),
  row("a body with three nested IFs does not parse at maxDepth 3: the DEFINE is a block", `${def("a", "", nestedIf(3))}{{CALL a()}}`, ERR("limit-depth", 1, 31), { limits: { maxDepth: 3 } }),
  row("a call from two IFs to a body of three IFs is depth 6: renders at maxDepth 6", `${def("a", "", nestedIf(3))}{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}`, OUT("x"), { limits: { maxDepth: 6 } }),
  mrow("a call from two IFs to a body of three IFs: maxDepth 5 crosses at the third IF of the body", `{{DEFINE a()}}{{IF t}}{{IF t}}§{{IF t}}x{{END_IF}}{{END_IF}}{{END_IF}}{{END_DEFINE}}{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}`, "limit-depth", undefined, "same", { limits: { maxDepth: 5 } }),
  row("maxDepth 0 does not parse a DEFINE", "{{DEFINE a()}}x{{END_DEFINE}}{{CALL a()}}", ERR("limit-depth", 1, 1), { limits: { maxDepth: 0 } }),
  row("maxDepth 1 runs a CALL to a body with no blocks", "{{DEFINE a()}}x{{END_DEFINE}}{{CALL a()}}", OUT("x"), { limits: { maxDepth: 1 } }),
  row("maxDepth 1 does not parse a body with an IF: located at the IF", "{{DEFINE a()}}{{IF t}}x{{END_IF}}{{END_DEFINE}}{{CALL a()}}", ERR("limit-depth", 1, 15), { limits: { maxDepth: 1 } }),
  ((): Row => {
    const tpl = "{{DEFINE a()}}x{{END_DEFINE}}{{IF t}}{{CALL a()}}{{END_IF}}";
    const at = nth(tpl, "{{CALL a()}}");
    return row("maxDepth 1 and a CALL inside an IF is depth 2: located at the CALL", tpl, ERR("limit-depth", at.line, at.col), { limits: { maxDepth: 1 } });
  })(),
  row("maxDepth 2 and a CALL inside an IF renders", "{{DEFINE a()}}x{{END_DEFINE}}{{IF t}}{{CALL a()}}{{END_IF}}", OUT("x"), { limits: { maxDepth: 2 } }),
  row("a macro called three levels deep: renders at maxDepth 3", `${def("a", "", "{{CALL b()}}")}${def("b", "", "{{CALL c()}}")}${def("c", "", "x")}{{CALL a()}}`, OUT("x"), { limits: { maxDepth: 3 } }),
  ((): Row => {
    const tpl = `${def("a", "", "{{CALL b()}}")}${def("b", "", "{{CALL c()}}")}${def("c", "", "x")}{{CALL a()}}`;
    const at = nth(tpl, "{{CALL c()}}");
    return row("a macro called three levels deep: maxDepth 2 crosses at the CALL in the second body, named with that macro", tpl, ERR("limit-depth", at.line, at.col, "(in macro 'b'"), { limits: { maxDepth: 2 } });
  })(),
  row("sequential calls do not add up: 40 calls at maxDepth 1", `${def("a", "", "x")}${calls("a", 40)}`, OUT(rep("x", 40)), { limits: { maxDepth: 1 } }),
  row("sequential blocks and calls do not add up at default limits", `${def("a", "", "{{IF t}}x{{END_IF}}")}${rep("{{IF t}}{{CALL a()}}{{END_IF}}", 40)}`, OUT(rep("x", 40))),
  row("calls in a FOR of 50 items at maxDepth 2: the counter falls after each item", `${def("a", "", "x")}{{FOR many AS i}}{{CALL a()}}{{END_FOR}}`, OUT(rep("x", 50)), { limits: { maxDepth: 2 } }),
  row("the counter falls after each call: three calls in one body that each hold an IF at maxDepth 3", `${def("a", "", "{{IF t}}x{{END_IF}}")}${def("b", "", "{{CALL a()}}{{CALL a()}}{{CALL a()}}")}{{CALL b()}}`, OUT("xxx"), { limits: { maxDepth: 3 } }),
];

// a path through the blocks that a LIST or a TABLE runs without visit(): the counter must rise there too (a CALL is one deeper than the parse depth)
const DA = def("a", "", "x");
const CALL_A = "{{CALL a()}}";
const PATH_ROWS: Array<{ name: string; tpl: string; ok: number; out: string }> = [
  { name: "a CALL in an IF in a FOR in an IF in a LIST item", tpl: `${DA}{{LIST}}{{IF t}}{{FOR one AS i}}{{IF t}}{{LIST_ITEM}}${CALL_A}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_LIST}}`, ok: 5, out: "1. x" },
  { name: "a CALL in a ROW in an IF in a FOR in an IF in a TABLE", tpl: `${DA}{{TABLE}}{{IF t}}{{FOR one AS i}}{{IF t}}{{ROW}}${CALL_A}|b{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}`, ok: 5, out: "| x | b |" },
  { name: "a CALL in the body of a FOR written in a TABLE", tpl: `${DA}{{TABLE}}{{FOR one AS i}}${CALL_A}|b\n{{END_FOR}}{{END_TABLE}}`, ok: 3, out: "| x | b |" },
  { name: "a CALL in an IF in a LIST item", tpl: `${DA}{{LIST}}{{LIST_ITEM}}{{IF t}}${CALL_A}{{END_IF}}{{END_LIST_ITEM}}{{END_LIST}}`, ok: 3, out: "1. x" },
  { name: "a CALL in a LIST item of a FOR in a LIST", tpl: `${DA}{{LIST}}{{FOR one AS i}}{{LIST_ITEM}}${CALL_A}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}`, ok: 3, out: "1. x" },
  { name: "a CALL in a ROW of an IF in a TABLE", tpl: `${DA}{{TABLE}}{{IF t}}{{ROW}}${CALL_A}|b{{END_ROW}}{{END_IF}}{{END_TABLE}}`, ok: 3, out: "| x | b |" },
  { name: "a CALL in a header cell of a TABLE", tpl: `${DA}{{TABLE}}{{HEADER}}${CALL_A}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}`, ok: 2, out: "| x | h |\n|:-----|:-----|\n| 1 | 2 |" },
];
const BLOCK_ROWS: Array<[string, string, string, string]> = [
  ["an IF", "{{IF t}}", "{{END_IF}}", "x"],
  ["an ELSEIF", "{{IF f}}n{{ELSEIF t}}", "{{END_IF}}", "x"],
  ["an ELSE", "{{IF f}}n{{ELSE}}", "{{END_IF}}", "x"],
  ["a CASE clause", "{{CASE b}}{{WHEN 2}}", "{{END_CASE}}", "x"],
  ["a CASE DEFAULT", "{{CASE b}}{{WHEN 1}}w{{DEFAULT}}", "{{END_CASE}}", "x"],
  ["a FOR", "{{FOR one AS i}}", "{{END_FOR}}", "x"],
  ["the ELSE body of a FOR", "{{FOR e AS i}}y{{ELSE}}", "{{END_FOR}}", "x"],
  ["a SECTION", '{{SECTION "T"}}', "{{END_SECTION}}", "## T\n\nx\n"],
  ["a FENCE", "{{FENCE}}", "{{END_FENCE}}", "```\nx\n```\n"],
  ["a LIST_ITEM", "{{LIST}}{{LIST_ITEM}}", "{{END_LIST_ITEM}}{{END_LIST}}", "1. x"],
  ["a ROW", "{{TABLE}}{{ROW}}", "{{END_ROW}}{{END_TABLE}}", "| x |"],
];
const PATH_DEPTH_ROWS: Row[] = [
  ...PATH_ROWS.flatMap((p) => {
    const at = nth(p.tpl, CALL_A);
    return [
      row(`${p.name}: renders at maxDepth ${p.ok}`, p.tpl, OUT(p.out), { limits: { maxDepth: p.ok } }),
      row(`${p.name}: maxDepth ${p.ok - 1} crosses at the CALL`, p.tpl, ERR("limit-depth", at.line, at.col), { limits: { maxDepth: p.ok - 1 } }),
    ];
  }),
  ...BLOCK_ROWS.flatMap(([label, open, close, out]) => {
    const tpl = `${DA}${open}${CALL_A}${close}`;
    const at = nth(tpl, CALL_A);
    return [
      row(`a CALL in ${label}: renders at maxDepth 2`, tpl, OUT(out), { limits: { maxDepth: 2 } }),
      row(`a CALL in ${label}: maxDepth 1 crosses at the CALL`, tpl, ERR("limit-depth", at.line, at.col), { limits: { maxDepth: 1 } }),
    ];
  }),
];

const CHAIN32 = chain(32, 31);
const CHAIN20 = chain(20, 5);
const defAt = (tpl: string, name: string, extra: number): Pos => {
  const tag = `{{DEFINE ${name}()}}`;
  const p = nth(tpl, tag);
  return { line: p.line, col: p.col + tag.length + extra };
};
const CHAIN_ROWS: Row[] = [
  row("32 chained calls with a body of 31 nested IFs end in limit-depth at default limits, at the CALL of the second macro", CHAIN32, ERR("limit-depth", nth(CHAIN32, "{{CALL m2()}}").line, nth(CHAIN32, "{{CALL m2()}}").col, "(in macro 'm1'")),
  row("the same 32 chained calls at maxDepth 32 are the same", CHAIN32, ERR("limit-depth", nth(CHAIN32, "{{CALL m2()}}").line, nth(CHAIN32, "{{CALL m2()}}").col), { limits: { maxDepth: 32 } }),
  row("the same chain at maxDepth 10000 is cut by the cap of 256 at the CALL of the ninth macro", CHAIN32, ERR("limit-depth", nth(CHAIN32, "{{CALL m9()}}").line, nth(CHAIN32, "{{CALL m9()}}").col), { limits: { maxDepth: 10000 } }),
  row("the same chain at maxDepth 1000 is cut by the cap too", CHAIN32, ERR("limit-depth", nth(CHAIN32, "{{CALL m9()}}").line, nth(CHAIN32, "{{CALL m9()}}").col), { limits: { maxDepth: 1000 } }),
  row("20 chained calls with 5 nested IFs (depth 120) render at maxDepth 10000", CHAIN20, OUT("end"), { limits: { maxDepth: 10000 } }),
  row("the same chain renders at maxDepth 256", CHAIN20, OUT("end"), { limits: { maxDepth: 256 } }),
  row("the same chain renders at maxDepth 120, exactly at the limit", CHAIN20, OUT("end"), { limits: { maxDepth: 120 } }),
  ((): Row => {
    const at = defAt(CHAIN20, "m20", 4 * "{{IF t}}".length);
    return row("the same chain at maxDepth 119 crosses at the fifth IF of the last body", CHAIN20, ERR("limit-depth", at.line, at.col, "(in macro 'm20'"), { limits: { maxDepth: 119 } });
  })(),
  ((): Row => {
    const at = defAt(CHAIN20, "m6", 1 * "{{IF t}}".length);
    return row("the same chain at default limits crosses at the second IF of the sixth body", CHAIN20, ERR("limit-depth", at.line, at.col, "(in macro 'm6'"));
  })(),
  row("5 chained calls with 5 nested IFs (depth 30) render at default limits", chain(5, 5), OUT("end")),
];

const NO_CALL_ROWS: Row[] = [
  row("300 nested IFs at maxDepth 1000 end in limit-depth at the 257th block (the cap)", nestedIf(300), ERR("limit-depth", 1, 8 * 256 + 1), { limits: { maxDepth: 1000 } }),
  row("257 nested IFs at maxDepth 1000 end in limit-depth at the 257th block", nestedIf(257), ERR("limit-depth", 1, 8 * 256 + 1), { limits: { maxDepth: 1000 } }),
  row("256 nested IFs at maxDepth 1000 render", nestedIf(256), OUT("x"), { limits: { maxDepth: 1000 } }),
  row("200 nested IFs at maxDepth 1000 render", nestedIf(200), OUT("x"), { limits: { maxDepth: 1000 } }),
  row("1000 nested IFs at maxDepth 100000 end in limit-depth at the 257th block", nestedIf(1000), ERR("limit-depth", 1, 8 * 256 + 1), { limits: { maxDepth: 100000 } }),
  row("300 nested FORs over one item at maxDepth 1000 end in limit-depth", rep("{{FOR one AS i}}", 300) + "x" + rep("{{END_FOR}}", 300), ERR("limit-depth", 1, 16 * 256 + 1), { limits: { maxDepth: 1000 } }),
  row("256 nested FORs over one item at maxDepth 1000 render", rep("{{FOR one AS i}}", 256) + "x" + rep("{{END_FOR}}", 256), OUT("x"), { limits: { maxDepth: 1000 } }),
];

describe("mc-depth: one runtime counter, bounded by maxDepth and by 256", () => {
  it.each(expand(INFINITE_ROWS))("mc-depth: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-depth"));
  it.each(NEST_RECURSION.flatMap((c) => ENTRIES.map((entry) => ({ entry, ...c }))))("mc-depth: [$entry] $label ends in a located limit-depth of the running macro", ({ entry, tpl, limits }) => {
    const o = run(entry, tpl, DATA, limits);
    check(o.code, `[${entry}] limit-depth, never a RangeError or a type-error (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
    check(o.line === 1 && (o.column ?? 0) > 1, `[${entry}] located in the body, not at 1:1 (got ${o.line}:${o.column})`).toBe(true);
    check(o.message ?? "", `[${entry}] the message names the macro`).toContain("(in macro 'a'");
  });
  it.each(expand(COUNTING_ROWS))("mc-depth: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-depth"));
  it.each(expand(PATH_DEPTH_ROWS))("mc-depth: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-depth"));
  it.each(expand(CHAIN_ROWS))("mc-depth: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-depth"));
  it.each(expand(NO_CALL_ROWS))("mc-depth: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-depth"));

  it.each(ENTRIES)("mc-depth: [%s] a depth error is a TemplateError with a code, never a RangeError or a type-error", (entry) => {
    for (const tpl of [INFINITE, MUTUAL, CHAIN32, `${def("a", "", "{{IF t}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_IF}}")}{{CALL a()}}`]) {
      for (const limits of [undefined, { maxDepth: 1000 }, { maxDepth: 100000 }]) {
        const o = run(entry, tpl, DATA, limits);
        check(o.code, `[${entry}] ${JSON.stringify(limits)}: limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
      }
    }
  });

  // validate and analyze never follow a CALL: a recursion and a long chain are plain and prompt
  it.each([
    { name: "an infinite recursion", tpl: INFINITE, macros: ["a"] },
    { name: "a mutual recursion", tpl: MUTUAL, macros: ["a", "b"] },
    { name: "32 chained macros of 31 nested IFs", tpl: CHAIN32, macros: Array.from({ length: 32 }, (_, i) => `m${i + 1}`) },
  ])("mc-depth: validate and analyze of $name return a clean result", ({ tpl, macros }) => {
    const started = Date.now();
    const v = validate(tpl);
    check(v, "validate finds nothing wrong").toEqual({ ok: true, diagnostics: [] });
    const a = analyzed(tpl);
    check(a.diagnostics, "analyze finds nothing wrong").toEqual([]);
    check(a.macros.map((m: any) => m.name), "analyze lists the macros it saw").toEqual(macros);
    check(Date.now() - started < 2000, "both return promptly").toBe(true);
  });

  // a stray RangeError becomes a limit-depth diagnostic in render, validate and analyze
  const DEEP = [5000].map((n) => ({ n, tpl: nestedIf(n) }));
  const RAISED = { maxDepth: 100000 };
  it.each(DEEP)("mc-depth: render of $n nested IFs at maxDepth 100000 is a limit-depth diagnostic, not a RangeError", ({ tpl }) => {
    const o = run("render-strict", tpl, DATA, RAISED);
    check(o.code, `limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
    const r = render(tpl, DATA, { limits: RAISED });
    check(r.ok, "render did not succeed").toBe(false);
    check(r.output, "no output").toBe("");
    check(r.diagnostics[0].severity, "an error diagnostic").toBe("error");
    check(r.diagnostics[0].line >= 1 && r.diagnostics[0].column >= 1, "a position").toBe(true);
  });
  it.each(DEEP)("mc-depth: validate of $n nested IFs at maxDepth 100000 is an error diagnostic limit-depth", ({ tpl }) => {
    const o = runStatic("validate", tpl, RAISED);
    check(o.code, `limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
    const v = validate(tpl, { limits: RAISED });
    check(v.ok, "validate is not ok").toBe(false);
    check(v.diagnostics.map((d) => `${d.severity}:${d.code}`), "one error diagnostic").toEqual(["error:limit-depth"]);
  });
  it.each(DEEP)("mc-depth: analyze of $n nested IFs at maxDepth 100000 throws a TemplateError limit-depth", ({ tpl }) => {
    const o = runStatic("analyze", tpl, RAISED);
    check(o.code, `limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
    check(() => analyze(tpl, { limits: RAISED }), "analyze throws a TemplateError").toThrow(TemplateError);
  });
  // a stack overflow inside the interpreter or the analyzer (a condition nested far deeper than any block) passes through locateError unchanged
  const PARENS = [
    { name: "an IF condition with 25000 nested parentheses", cond: rep("(", 25000) + "a" + rep(")", 25000) },
  ];
  it.each(PARENS)("mc-depth: render of $name is a limit-depth diagnostic, not a type-error", ({ cond }) => {
    for (const tpl of [`{{IF ${cond}}}x{{END_IF}}`, `${def("f", "", `{{IF ${cond}}}x{{END_IF}}`)}{{CALL f()}}`]) {
      for (const strictMode of [true]) {
        const r = render(tpl, DATA, { strictMode });
        check(r.ok, "render fails").toBe(false);
        check(r.diagnostics[0].code, `a stack overflow is a limit-depth, not a type-error (got ${r.diagnostics[0].code}: ${r.diagnostics[0].message})`).toBe("limit-depth");
        check(r.output, "no output").toBe("");
      }
    }
  });
  it.each(PARENS)("mc-depth: validate of $name is an error diagnostic limit-depth", ({ cond }) => {
    const o = runStatic("validate", `{{IF ${cond}}}x{{END_IF}}`);
    check(o.code, `limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
    const v = validate(`{{IF ${cond}}}x{{END_IF}}`);
    check(v.ok, "validate is not ok").toBe(false);
    check(v.diagnostics.map((d) => `${d.severity}:${d.code}`), "one error diagnostic").toEqual(["error:limit-depth"]);
  });
  it.each(PARENS)("mc-depth: analyze of $name throws a TemplateError limit-depth, not a RangeError", ({ cond }) => {
    const o = runStatic("analyze", `{{IF ${cond}}}x{{END_IF}}`);
    check(o.code, `limit-depth (got ${o.code} ${o.message ?? ""})`).toBe("limit-depth");
  });
  it("mc-depth: a plain Error from a filter is still a type-error but a RangeError is not retyped", () => {
    const r = render("a\n  \${{s | head=x}}", DATA);
    check(r.diagnostics[0]?.code, "a bad filter parameter is a type-error").toBe("type-error");
    const deep = run("render-strict", nestedIf(5000), DATA, RAISED);
    check(deep.code, `a stack overflow is a limit-depth (got ${deep.code})`).toBe("limit-depth");
  });
});

// =====================================================================================
// mc-iterations: every CALL counts one with the FOR items
// =====================================================================================

/** leaf l0 prints x; level k calls level k-1 twice; the top calls level `levels`. 2^(levels+1) - 1 calls in all. */
function fan(levels: number): string {
  let t = def("l0", "", "x");
  for (let k = 1; k <= levels; k++) t += def(`l${k}`, "", `{{CALL l${k - 1}()}}{{CALL l${k - 1}()}}`);
  return `${t}{{CALL l${levels}()}}`;
}
const callsIn = (levels: number) => 2 ** (levels + 1) - 1;
const startsWithCall = (tpl: string, o: Outcome) => tpl.split("\n")[(o.line ?? 1) - 1]?.slice((o.column ?? 1) - 1).startsWith("{{CALL") ?? false;
const ITER_ENTRIES: Entry[] = ["render-strict", "resolve-lenient"];
const iters = (n: number) => (o: Outcome, entry: Entry): void => {
  if (entry.startsWith("render")) check(o.iterations, `[${entry}] stats.iterations counts the FOR items and the CALLs`).toBe(n);
};

const ITER_ROWS: Row[] = [
  row("a fan-out of 12 levels (8191 calls) renders at default limits", fan(12), OUT(rep("x", 4096)), { entries: ITER_ENTRIES, also: iters(callsIn(12)) }),
  row("a fan-out of 10 levels is exactly 2047 calls: renders with maxIterations 2047", fan(10), OUT(rep("x", 1024)), { limits: { maxIterations: 2047 }, also: iters(2047) }),
  row("a fan-out of 14 levels with maxIterations 100000 renders 32767 calls", fan(14), OUT(rep("x", 16384)), { limits: { maxIterations: 100000 }, entries: ITER_ENTRIES, also: iters(callsIn(14)) }),
  row("a fan-out of 15 levels with maxIterations 100000 renders 65535 calls", fan(15), OUT(rep("x", 32768)), { limits: { maxIterations: 100000 }, entries: ITER_ENTRIES, also: iters(callsIn(15)) }),
  row("each CALL counts one: exactly maxIterations calls render", `${def("a", "", "x")}${calls("a", 5)}`, OUT("xxxxx"), { limits: { maxIterations: 5 }, also: iters(5) }),
  row("ten calls at the top level count ten", `${def("a", "", "x")}${calls("a", 10)}`, OUT(rep("x", 10)), { also: iters(10) }),
  row("a CALL with an empty body still counts one", `${def("a", "", "")}{{CALL a()}}`, OUT(""), { also: iters(1) }),
  row("a macro called from a macro counts both calls", `${def("b", "", "x")}${def("a", "", "{{CALL b()}}{{CALL b()}}")}{{CALL a()}}`, OUT("xx"), { also: iters(3) }),
  row("a DEFINE counts nothing", `${def("a", "", "x")}text`, OUT("text"), { also: iters(0) }),
  row("a CALL in a branch that does not run counts nothing", `${def("a", "", "x")}{{IF f}}{{CALL a()}}{{END_IF}}`, OUT(""), { also: iters(0) }),
  row("FOR items and CALLs add up: 3 items each calling once is 6", `${def("a", "", "x")}{{FOR xs AS i}}{{CALL a()}}{{END_FOR}}`, OUT("xxx"), { limits: { maxIterations: 6 }, also: iters(6) }),
  row("a CALL in the ELSE body of a FOR counts one and the empty loop none", `${def("a", "", "x")}{{FOR e AS i}}y{{ELSE}}{{CALL a()}}{{END_FOR}}`, OUT("x"), { also: iters(1) }),
  row("a FOR of 5 items in a macro called 3 times is 3 + 15 = 18", `${def("a", "", "{{FOR five AS i}}\${{i}}{{END_FOR}}")}{{CALL a()}}{{CALL a()}}{{CALL a()}}`, OUT("123451234512345"), { limits: { maxIterations: 18 }, also: iters(18) }),
  row("a nested macro in a FOR of a macro adds all of them", `${def("c", "", "x")}${def("b", "", "{{FOR xs AS i}}{{CALL c()}}{{END_FOR}}")}{{CALL b()}}`, OUT("xxx"), { also: iters(7) }),
  row("maxIterations 0 renders a template with no CALL and no FOR", "text \${{a}}", OUT("text A"), { limits: { maxIterations: 0 }, also: iters(0) }),
];
describe("mc-iterations: every CALL counts one toward maxIterations", () => {
  it.each(expand(ITER_ROWS))("mc-iterations: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-iterations"));

  const fails: Array<{ name: string; levels: number; limits?: Partial<Limits> }> = [
    { name: "14 levels at default limits (32767 calls)", levels: 14 },
    { name: "13 levels at default limits (16383 calls)", levels: 13 },
    { name: "10 levels with maxIterations 2046", levels: 10, limits: { maxIterations: 2046 } },
    { name: "16 levels with maxIterations 100000 (131071 calls)", levels: 16, limits: { maxIterations: 100000 } },
    { name: "14 levels with maxIterations 16000", levels: 14, limits: { maxIterations: 16000 } },
  ];
  it.each(fails.flatMap((f) => ENTRIES.map((entry) => ({ entry, ...f }))))("mc-iterations: [$entry] a fan-out of $name ends in limit-iterations at a CALL, quickly", ({ entry, levels, limits }) => {
    const tpl = fan(levels);
    const started = Date.now();
    const o = run(entry, tpl, DATA, limits);
    check(o.code, `[${entry}] limit-iterations (got ${o.code} ${o.message ?? ""})`).toBe("limit-iterations");
    check(startsWithCall(tpl, o), `[${entry}] located at a CALL tag (${o.line}:${o.column})`).toBe(true);
    check(Date.now() - started < 3000, `[${entry}] the failure is fast`).toBe(true);
    if (entry.startsWith("render")) check(o.iterations, `[${entry}] a failed render still reports its iterations`).toBeGreaterThanOrEqual(limits?.maxIterations ?? 10000);
  });

  const exact = `${def("a", "", "x")}${calls("a", 5)}`;
  const forCall = `${def("a", "", "x")}{{FOR xs AS i}}{{CALL a()}}{{END_FOR}}`;
  const inMacro = `${def("a", "", "{{FOR five AS i}}\${{i}}{{END_FOR}}")}{{CALL a()}}{{CALL a()}}{{CALL a()}}`;
  const failRows: Row[] = [
    row("one call more than maxIterations is located at the last CALL", exact, ERR("limit-iterations", nth(exact, "{{CALL a()}}", 5).line, nth(exact, "{{CALL a()}}", 5).col), { limits: { maxIterations: 4 }, also: (o, e) => e.startsWith("render") && check(o.iterations, "iterations reported").toBeGreaterThanOrEqual(4) }),
    row("maxIterations 0 fails at the first CALL", exact, ERR("limit-iterations", nth(exact, "{{CALL a()}}", 1).line, nth(exact, "{{CALL a()}}", 1).col), { limits: { maxIterations: 0 } }),
    row("3 items each calling once with maxIterations 5 fails at the CALL of the last item", forCall, ERR("limit-iterations", nth(forCall, "{{CALL a()}}").line, nth(forCall, "{{CALL a()}}").col), { limits: { maxIterations: 5 } }),
    row("3 items each calling once with maxIterations 4 fails at the FOR for the last item", forCall, ERR("limit-iterations", nth(forCall, "{{FOR xs").line, nth(forCall, "{{FOR xs").col), { limits: { maxIterations: 4 } }),
    row("a FOR of 5 items in a macro called 3 times with maxIterations 17 fails at the FOR in the body, named with the macro", inMacro, ERR("limit-iterations", nth(inMacro, "{{FOR five").line, nth(inMacro, "{{FOR five").col, "(in macro 'a'"), { limits: { maxIterations: 17 } }),
    mrow("maxIterations 1 fails at the second CALL", `${def("a", "", "x")}{{CALL a()}}§{{CALL a()}}`, "limit-iterations", undefined, "same", { limits: { maxIterations: 1 } }),
  ];
  it.each(expand(failRows))("mc-iterations: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-iterations"));
  it("mc-iterations: the macro that held the crossing CALL is named in the message", () => {
    const m = marked(`${def("b", "", "x")}${def("a", "", "§{{CALL b()}}")}¤{{CALL a()}}`);
    for (const entry of ENTRIES) {
      verifyOutcome(run(entry, m.tpl, DATA, { maxIterations: 1 }), ERR("limit-iterations", m.line, m.col, annot("a", m.call)), `mc-iterations [${entry}]`);
    }
  });
});

// =====================================================================================
// mc-output: maxOutputChars is enforced across and inside macro bodies
// =====================================================================================

const LIMIT = 1000;
const X100 = rep("x", 100);
const ADEF = def("a", "", X100);
const OUT_LIMITS = { maxOutputChars: LIMIT };
/** Where a template puts its 100 calls: [label, a function from the calls to the whole template] */
const OUT_WRAPS: Array<[string, (c: string) => string]> = [
  ["the top level", (c) => c],
  ["an IF body", (c) => `{{IF t}}${c}{{END_IF}}`],
  ["an ELSEIF body", (c) => `{{IF f}}n{{ELSEIF t}}${c}{{END_IF}}`],
  ["an ELSE body", (c) => `{{IF f}}n{{ELSE}}${c}{{END_IF}}`],
  ["two nested IFs", (c) => `{{IF t}}{{IF t}}${c}{{END_IF}}{{END_IF}}`],
  ["a CASE clause", (c) => `{{CASE b}}{{WHEN 2}}${c}{{END_CASE}}`],
  ["a CASE DEFAULT", (c) => `{{CASE b}}{{WHEN 1}}w{{DEFAULT}}${c}{{END_CASE}}`],
  ["a SECTION body", (c) => `{{SECTION "T"}}${c}{{END_SECTION}}`],
  ["a FENCE body", (c) => `{{FENCE}}${c}{{END_FENCE}}`],
  ["a LIST_ITEM", (c) => `{{LIST}}{{LIST_ITEM}}${c}{{END_LIST_ITEM}}{{END_LIST}}`],
  ["another macro", (c) => `${def("b", "", c)}{{CALL b()}}`],
  ["an IF in another macro", (c) => `${def("b", "", `{{IF t}}${c}{{END_IF}}`)}{{CALL b()}}`],
  ["a CASE in another macro", (c) => `${def("b", "", `{{CASE b}}{{WHEN 2}}${c}{{END_CASE}}`)}{{CALL b()}}`],
  ["a macro that calls a macro that holds an IF", (c) => `${def("c", "", `{{IF t}}${c}{{END_IF}}`)}${def("b", "", "{{CALL c()}}")}{{CALL b()}}`],
];
const stopsNearTheLimit = (bodySize: number, count = 100) => (o: Outcome, entry: Entry): void => {
  if (!entry.startsWith("render")) return;
  const bound = Math.min(count, (2 * LIMIT) / bodySize + 2);
  check(o.iterations, `[${entry}] the failed render did not run all ${count} calls: stats.iterations ${o.iterations} <= ${bound}`).toBeLessThanOrEqual(bound);
  check(o.iterations, `[${entry}] some calls ran`).toBeGreaterThanOrEqual(1);
};
/** The text of the macro a (defined first): the child inside the body that tips the held total at the eleventh call. */
const BODY_TEXT: Pos = { line: 1, col: 15 };
const OUT_ROWS: Row[] = OUT_WRAPS.map(([label, wrap]) => {
  const tpl = ADEF + wrap(calls("a", 100));
  const at = nth(tpl, "{{CALL a()}}", 11);
  return row(`100 calls of a 100-character macro from ${label} end in limit-output at the 11th call`, tpl, ERR_ANY("limit-output", [at, BODY_TEXT]), { limits: OUT_LIMITS, also: stopsNearTheLimit(100) });
});
const BODY_ROWS: Row[] = [
  ...[1000, 1001].map((n): Row => {
    const m = marked(`{{DEFINE a()}}§${rep("x", n)}{{END_DEFINE}}¤{{CALL a()}}`);
    return n > LIMIT
      ? { name: `a macro body of ${n} characters is over the limit of ${LIMIT}: limit-output at its text, named with the macro`, tpl: m.tpl, data: DATA, limits: OUT_LIMITS, want: ERR("limit-output", m.line, m.col, annot("a", m.call)) }
      : row(`a macro body of ${n} characters called once fits a limit of ${LIMIT} exactly`, m.tpl, OUT(rep("x", n)), { limits: OUT_LIMITS });
  }),
  row("10 calls of 100 characters fit a limit of 1000 exactly", ADEF + calls("a", 10), OUT(rep("x", 1000)), { limits: OUT_LIMITS }),
  row("10 calls in an IF body fit a limit of 1000 exactly", `${ADEF}{{IF t}}${calls("a", 10)}{{END_IF}}`, OUT(rep("x", 1000)), { limits: OUT_LIMITS }),
  row("10 calls from another macro fit a limit of 1000 exactly", `${ADEF}${def("b", "", calls("a", 10))}{{CALL b()}}`, OUT(rep("x", 1000)), { limits: OUT_LIMITS }),
  ((): Row => {
    const tpl = ADEF + calls("a", 11);
    const at = nth(tpl, "{{CALL a()}}", 11);
    return row("an eleventh call crosses the limit at the eleventh CALL or at the text of its body", tpl, ERR_ANY("limit-output", [at, BODY_TEXT]), { limits: OUT_LIMITS });
  })(),
  ((): Row => {
    const m = marked(`${def("a", "", "§" + rep("x", 600))}{{DEFINE b()}}${rep("y", 600)}¤{{CALL a()}}{{END_DEFINE}}{{CALL b()}}`);
    return { name: "a body of 0.6 of the limit that calls a body of 0.6 of the limit: limit-output at the text of the inner one", tpl: m.tpl, data: DATA, limits: OUT_LIMITS, want: ERR("limit-output", m.line, m.col, annot("a", m.call), undefined, true) };
  })(),
  ((): Row => {
    const m = marked(`{{DEFINE a()}}§${rep("x", 600)}{{END_DEFINE}}${rep("y", 500)}¤{{CALL a()}}`);
    return { name: "text held by the caller counts: 500 characters at the top and a body of 600 end in limit-output at the text of the body", tpl: m.tpl, data: DATA, limits: OUT_LIMITS, want: ERR("limit-output", m.line, m.col, annot("a", m.call)) };
  })(),
  ((): Row => {
    const tpl = `${def("a", "", rep("x", 100))}${def("b", "", calls("a", 50))}{{CALL b()}}`;
    const at = nth(tpl, "{{CALL a()}}", 11);
    return row("a fan-out: a macro calling a 100-character macro 50 times stops at the 11th call", tpl, ERR_ANY("limit-output", [at, BODY_TEXT]), { limits: OUT_LIMITS, also: stopsNearTheLimit(100, 51) });
  })(),
  row("a body of 1/10 of the limit called 9 times fits", `${def("a", "", rep("x", 100))}${calls("a", 9)}`, OUT(rep("x", 900)), { limits: OUT_LIMITS }),
  row("a macro called in a FOR over two items: 2 x 400 characters fit", `${def("a", "", rep("x", 400))}{{FOR ys AS i}}{{CALL a()}}{{END_FOR}}`, OUT(rep("x", 800)), { limits: OUT_LIMITS }),
  ((): Row => {
    const tpl = `${def("a", "", rep("x", 400))}{{FOR xs AS i}}{{CALL a()}}{{END_FOR}}`;
    const at = nth(tpl, "{{FOR xs");
    return row("a loop alone over the limit keeps its place at the FOR: 3 x 400 characters", tpl, ERR("limit-output", at.line, at.col), { limits: OUT_LIMITS });
  })(),
  ((): Row => {
    const tpl = `${def("a", "", rep("x", 400))}{{FOR xs AS i}}{{IF t}}{{CALL a()}}{{END_IF}}{{END_FOR}}`;
    const at = nth(tpl, "{{FOR xs");
    return row("a loop whose body holds an IF and a CALL keeps its place at the FOR", tpl, ERR("limit-output", at.line, at.col), { limits: OUT_LIMITS });
  })(),
  ((): Row => {
    const tpl = `${def("a", "", rep("x", 400))}{{FOR xs AS i}}{{CALL a()}}{{END_FOR}}`;
    return row("a loop of calls that fits the limit exactly renders", tpl, OUT(rep("x", 1200)), { limits: { maxOutputChars: 1200 } });
  })(),
];

describe("mc-output: maxOutputChars is enforced across and inside macro bodies", () => {
  it.each(expand(OUT_ROWS))("mc-output: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-output"));
  it.each(expand(BODY_ROWS))("mc-output: [$entry] $name", ({ entry, r }) => verify(entry, r, "mc-output"));

  it.each(ENTRIES)("mc-output: [%s] 100 calls in a FOR over one item end in limit-output", (entry) => {
    const tpl = `${ADEF}{{FOR one AS i}}${calls("a", 100)}{{END_FOR}}`;
    const o = run(entry, tpl, DATA, OUT_LIMITS);
    check(o.code, `[${entry}] limit-output (got ${o.code} ${o.message ?? ""})`).toBe("limit-output");
  });
  it.each(ENTRIES)("mc-output: [%s] a variable text longer than the limit in a body is a limit-output at that variable", (entry) => {
    const m = marked(`{{DEFINE a(p)}}[§\${{p | upper}}]{{END_DEFINE}}\n¤{{CALL a(long)}}`);
    verifyOutcome(run(entry, m.tpl, DATA, { maxOutputChars: 20 }), ERR("limit-output", m.line, m.col, annot("a", m.call)), `mc-output [${entry}]`);
  });
  it.each(ENTRIES)("mc-output: [%s] the limit is checked while the body is built: 5000 calls in an IF body of a 1000-character limit stop at once", (entry) => {
    const tpl = `${ADEF}{{IF t}}${calls("a", 5000)}{{END_IF}}`;
    const started = Date.now();
    const o = run(entry, tpl, DATA, { ...OUT_LIMITS, maxNodes: 100000 });
    check(o.code, `[${entry}] limit-output`).toBe("limit-output");
    check(Date.now() - started < 2000, `[${entry}] stopped quickly`).toBe(true);
    if (entry.startsWith("render")) check(o.iterations, `[${entry}] about 11 calls ran, not 5000`).toBeLessThanOrEqual(22);
  });
});

// =====================================================================================
// mc-locate: an error in a body is located at the failing body node and names the macro
// =====================================================================================

const FB = (body: string) => `{{DEFINE f(p)}}${body}{{END_DEFINE}}`;
const LOCATE_ROWS: Row[] = [
  inBody("a missing variable in the body", `${FB("[§\${{missing}}]")}\nx ¤{{CALL f("a")}}`, MV, "f", "\nx []", {}, ["'missing'"]),
  inBody("a missing variable after other text on later lines", `{{DEFINE f(p)}}line\n  one [§\${{missing}}]{{END_DEFINE}}\n\n  ¤{{CALL f("a")}}`, MV, "f", "\n\n  line\n  one []"),
  inBody("a cyclic value through upper is a type-error at the variable", `${FB("[§\${{p | upper}}]")}\n  ¤{{CALL f(cyc)}}`, "type-error", "f", "same"),
  inBody("a cyclic value printed is a type-error at the variable", `${FB("[§\${{p}}]")}\n  ¤{{CALL f(cyc)}}`, "type-error", "f", "same"),
  inBody("a BigInt printed is a type-error at the variable", `${FB("[§\${{p}}]")}\n  ¤{{CALL f(big)}}`, "type-error", "f", "same"),
  inBody("an unknown filter is an unknown-filter at the variable", `${FB("[§\${{p | nope}}]")}\n  ¤{{CALL f("s")}}`, "unknown-filter", "f", "same", {}, ["nope"]),
  inBody("a bad filter parameter is a type-error at the variable", `${FB("[§\${{p | head=x}}]")}\n  ¤{{CALL f("s")}}`, "type-error", "f", "same"),
  inBody("a division by zero in render is a type-error at the variable", `${FB("[§\${{n / 0}}]")}\n  ¤{{CALL f(1)}}`, "type-error", "f", "same", { entries: RENDER }, ["divide"]),
  row("a division by zero in resolve is Infinity as at the top level", `${FB("[\${{n / 0}}]")}\n{{CALL f(1)}}`, OUT("\n[Infinity]"), { entries: RESOLVE }),
  inBody("a missing argument of a CALL in a body is located at that inner CALL", `{{DEFINE h(q)}}{{END_DEFINE}}{{DEFINE g()}}x\n  §{{CALL h(missing)}}{{END_DEFINE}}\n¤{{CALL g()}}`, MV, "g", "\nx\n  ", {}, ["'missing'"]),
  inBody("an error in a block of the body", `${FB("{{IF t}}[§\${{missing}}]{{END_IF}}")}\n¤{{CALL f(1)}}`, MV, "f", "\n[]"),
  inBody("an error in a FOR of the body", `${FB("{{FOR xs AS i}}[§\${{missing}}]{{END_FOR}}")}\n¤{{CALL f(1)}}`, MV, "f", "\n[][][]"),
  inBody("an error in a SECTION of the body", `${FB('{{SECTION "T"}}[§\${{missing}}]{{END_SECTION}}')}\n¤{{CALL f(1)}}`, MV, "f", "\n## T\n\n[]\n"),
  inBody("an error in a SET of the body is located at the SET", `${FB("§{{SET v = missing}}z")}\n¤{{CALL f(1)}}`, MV, "f", "\nz"),
  inBody("an error in the condition of an IF in the body is located at the IF", `${FB("\n  §{{IF missing > 1}}x{{END_IF}}")}\n¤{{CALL f(1)}}`, "type-error", "f", "same"),
````

Truncated: showing the first 98295 of 159436 bytes (section cap 98304 bytes).

## 4. Diff

7 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/core/src/analyze.ts b/core/src/analyze.ts
index 33233be..99efabd 100644
--- a/core/src/analyze.ts
+++ b/core/src/analyze.ts
@@ -1,5 +1,12 @@
 import { Lexer } from "./lexer";
 import { Parser } from "./parser";
+import { LimitError, SyntaxError } from "./errors";
+import {
+  buildMacroTable,
+  findCalls,
+  linkProblems,
+  topLevelDefines,
+} from "./macros";
 import { FILTER_REGISTRY, undeclaredParameterMessages } from "./filters";
 import {
   conditionOperands,
@@ -10,7 +17,9 @@ import {
 } from "./expressions";
 import {
   ASTNode,
+  CallNode,
   CaseNode,
+  DefineNode,
   FenceNode,
   ForNode,
   IfNode,
@@ -34,7 +43,8 @@ export type UsageKind =
   | "for"
   | "list_item"
   | "table"
-  | "set";
+  | "set"
+  | "call";
 
 export interface VariableUsage {
   /** Root name, the part before the first dot */
@@ -62,6 +72,7 @@ export interface AnalysisDiagnostic {
 }
 
 export type BlockKind =
+  | "DEFINE"
   | "IF"
   | "CASE"
   | "FOR"
@@ -76,6 +87,8 @@ export interface TemplateAnalysis {
   /** Count per block kind present in the template */
   blocks: Partial<Record<BlockKind, number>>;
   diagnostics: AnalysisDiagnostic[];
+  /** The macros the template defines, in source order; present only when it defines any */
+  macros?: { name: string; params: string[] }[];
 }
 
 /** Nesting bound for analyze when the caller sets no maxDepth */
@@ -84,19 +97,39 @@ const ANALYZE_MAX_DEPTH = 256;
 /**
  * Report the variables a template reads and the filters it applies, derived
  * from the parsed template. Loop item names (inside their loop) and
- * @-metadata are not inputs.
+ * @-metadata are not inputs. A macro body is walked once and a CALL is never
+ * followed, so the work is linear in the template however the macros call
+ * each other.
+ *
+ * A duplicate macro name or a wrong argument count is thrown like a parse
+ * error; an unknown macro is a diagnostic, since partials may supply it at
+ * render.
  */
 export function analyze(
   template: string,
   options?: { limits?: Partial<Limits> }
 ): TemplateAnalysis {
-  const ast = new Parser(new Lexer(template).tokenize(), {
-    maxDepth: options?.limits?.maxDepth ?? ANALYZE_MAX_DEPTH,
-    maxNodes: options?.limits?.maxNodes,
-  }).parse();
-  const walker = new Walker();
-  walker.visitBlock(ast.body);
-  return walker.result();
+  try {
+    const ast = new Parser(new Lexer(template).tokenize(), {
+      maxDepth: options?.limits?.maxDepth ?? ANALYZE_MAX_DEPTH,
+      maxNodes: options?.limits?.maxNodes,
+    }).parse();
+    const macros = buildMacroTable(topLevelDefines(ast));
+    const walker = new Walker(macros);
+    walker.checkCounts(findCalls(ast.body));
+    walker.visitBlock(ast.body);
+    return walker.result();
+  } catch (error) {
+    // a stack overflow in a very deep template is a depth error, not a crash
+    if (!(error instanceof RangeError)) throw error;
+    throw new LimitError(
+      "limit-depth",
+      "The template nests too deeply to analyze",
+      1,
+      1,
+      "Flatten the nested blocks or lower limits.maxDepth"
+    );
+  }
 }
 
 interface Entry {
@@ -113,9 +146,25 @@ class Walker {
   /** Names bound so far in each enclosing block, innermost last: loop items and SET locals */
   private scopes: Set<string>[] = [];
   private tableDepth = 0;
+  private macroList: { name: string; params: string[] }[] = [];
+
+  constructor(private readonly macros: Map<string, DefineNode>) {}
+
+  /** Throw the first call, in source order, that gives a known macro the wrong number of arguments */
+  checkCounts(calls: CallNode[]): void {
+    const wrong = linkProblems(calls, this.macros).find((p) => p.kind === "arity");
+    if (wrong) {
+      throw new SyntaxError(
+        wrong.message,
+        wrong.call.line,
+        wrong.call.column,
+        "Give the call as many arguments as the macro has parameters"
+      );
+    }
+  }
 
   result(): TemplateAnalysis {
-    return {
+    const result: TemplateAnalysis = {
       variables: Array.from(this.entries, ([name, entry]) => ({
         name,
         paths: Array.from(entry.paths),
@@ -130,6 +179,8 @@ class Walker {
       blocks: this.blocks,
       diagnostics: this.diagnostics,
     };
+    if (this.macroList.length > 0) result.macros = this.macroList;
+    return result;
   }
 
   visitAll(nodes: ASTNode[]): void {
@@ -156,6 +207,11 @@ class Walker {
         );
       case "Set":
         return this.visitSet(node as SetNode);
+      case "Define":
+        this.countBlock("DEFINE");
+        return this.visitDefine(node as DefineNode);
+      case "Call":
+        return this.visitCall(node as CallNode);
       case "If":
         this.countBlock("IF");
         return this.visitIf(node as IfNode, "if");
@@ -189,6 +245,39 @@ class Walker {
     this.blocks[kind] = (this.blocks[kind] ?? 0) + 1;
   }
 
+  /**
+   * A DEFINE body is walked once, as a block of its own: its names are its
+   * parameters, and nothing of the scope around the DEFINE is visible in it
+   */
+  private visitDefine(node: DefineNode): void {
+    this.macroList.push({ name: node.name, params: node.params });
+    const outerScopes = this.scopes;
+    const outerTableDepth = this.tableDepth;
+    this.scopes = [];
+    this.tableDepth = 0;
+    try {
+      this.visitBlock(node.body, node.params);
+    } finally {
+      this.scopes = outerScopes;
+      this.tableDepth = outerTableDepth;
+    }
+  }
+
+  /** A CALL reads each path argument; an unknown macro is a diagnostic; the body is not followed */
+  private visitCall(node: CallNode): void {
+    for (const arg of node.args) {
+      if (arg.kind === "path") this.record(arg.path.join("."), "call", false);
+    }
+    if (!this.macros.has(node.name)) {
+      this.diagnostics.push({
+        code: "unknown-macro",
+        message: `Unknown macro: ${node.name}`,
+        line: node.line,
+        column: node.column,
+      });
+    }
+  }
+
   /**
    * A SET reads its expression like an output does, then binds its name for
    * the rest of the block
diff --git a/core/src/errors.ts b/core/src/errors.ts
index e050391..372feeb 100644
--- a/core/src/errors.ts
+++ b/core/src/errors.ts
@@ -15,8 +15,11 @@ export type DiagnosticCode =
  * Base template error with rich context
  */
 export class TemplateError extends Error {
+  /** True once a macro call has said where the error came from */
+  private noted = false;
+
   constructor(
-    public readonly detail: string,
+    public detail: string,
     public line: number,
     public column: number,
     public readonly suggestion: string | undefined,
@@ -42,6 +45,24 @@ export class TemplateError extends Error {
     return this;
   }
 
+  /**
+   * Append a note to the detail (where a macro body was called from). Only
+   * the first note sticks: the innermost call knows best, and the calls
+   * around it pass the error on unchanged.
+   */
+  addNote(note: string): this {
+    if (this.noted) return this;
+    this.noted = true;
+    this.detail += note;
+    this.message = TemplateError.formatMessage(
+      this.detail,
+      this.line,
+      this.column,
+      this.suggestion
+    );
+    return this;
+  }
+
   private static formatMessage(
     message: string,
     line: number,
@@ -163,7 +184,9 @@ export class LimitError extends TemplateError {
 
 /**
  * The error located at the node that evaluated it. A plain Error (bad filter
- * parameters, failed math) becomes a type error there.
+ * parameters, failed math) becomes a type error there. A RangeError (a stack
+ * overflow in a deeply nested template) is left as it is: it is no fault of
+ * the node it passes, and render turns it into a depth error.
  */
 export function locateError(
   error: unknown,
@@ -171,6 +194,7 @@ export function locateError(
   column: number
 ): unknown {
   if (error instanceof TemplateError) return error.locate(line, column);
+  if (error instanceof RangeError) return error;
   if (error instanceof Error) return new TypeError(error.message, line, column);
   return error;
 }
diff --git a/core/src/interpreter.ts b/core/src/interpreter.ts
index 295ad13..d538000 100644
--- a/core/src/interpreter.ts
+++ b/core/src/interpreter.ts
@@ -15,6 +15,9 @@ import {
   SectionNode,
   FenceNode,
   SetNode,
+  DefineNode,
+  CallNode,
+  CallArg,
   ValueExpr,
   VariableLookup,
   ForWindowArg,
@@ -27,6 +30,7 @@ import {
   MissingVariableError,
   MathSyntaxError,
   LimitError,
+  TemplateError,
   locateError,
 } from "./errors";
 import {
@@ -49,6 +53,13 @@ import {
 import { applyFilters, fenced, checkFenceLang, valueToText } from "./filters";
 import { COLLECTION_FILTERS } from "./filters-collection";
 import { Frame, RootScope, readOwn } from "./scope";
+import { linkProgram, macroNote } from "./macros";
+
+/**
+ * The deepest run-time nesting of blocks and calls, whatever maxDepth says: it
+ * keeps the interpreter's own recursion far from the engine's stack limit
+ */
+const MAX_RUNTIME_DEPTH = 256;
 
 /** Filters that take any value as it is, so they run before the unprintable check */
 const KEEPS_RAW_INPUT = new Set([
@@ -74,6 +85,7 @@ const KEEPS_RAW_INPUT = new Set([
  * - Default operator (??)
  * - Ternary with variable references
  * - SET: locals bound for the rest of their block
+ * - DEFINE and CALL: macros whose bodies see their parameters and the data
  */
 export class Interpreter {
   private strictMode: boolean;
@@ -81,6 +93,12 @@ export class Interpreter {
   private render: boolean;
   private iterations = 0;
   private omittedSections = 0;
+  /** Blocks and calls being run now, bounded by depthCap */
+  private depth = 0;
+  private readonly depthCap: number;
+  /** Characters of the finished children of every body being built, across calls */
+  private held = 0;
+  private macros = new Map<string, DefineNode>();
   private readonly root: RootScope;
   /** The innermost scope: a block or loop frame while one renders, else the root */
   private scope: VariableLookup;
@@ -92,12 +110,13 @@ export class Interpreter {
     this.strictMode = options?.strictMode ?? true;
     this.render = options?.render ?? false;
     this.limits = withDefaultLimits(options?.limits);
+    this.depthCap = Math.min(this.limits.maxDepth, MAX_RUNTIME_DEPTH);
     this.root = new RootScope(variables);
     this.scope = this.root;
   }
 
   /**
-   * FOR iterations run by the latest interpret call
+   * FOR iterations and CALLs run by the latest interpret call
    */
   get iterationCount(): number {
     return this.iterations;
@@ -116,7 +135,11 @@ export class Interpreter {
   interpret(ast: ProgramNode): string {
     this.iterations = 0;
     this.omittedSections = 0;
+    this.depth = 0;
+    this.held = 0;
     this.scope = this.root;
+    // linking comes first: a bad call is found before any output
+    this.macros = linkProgram(ast);
     return this.visitProgram(ast);
   }
 
@@ -124,17 +147,64 @@ export class Interpreter {
    * Visit program node (root)
    */
   private visitProgram(node: ProgramNode): string {
-    return this.block(node.body, () => {
-      const parts: string[] = [];
-      let length = 0;
-      for (const child of node.body) {
-        const output = this.visit(child);
-        length += output.length;
-        this.checkOutputLength(length, child);
+    return this.block(node.body, () => this.renderChildren(node.body));
+  }
+
+  /**
+   * Render the children of one body and join them. Each finished child adds its
+   * characters to the ones already held by every body being built (this one
+   * and the ones around it, across calls); the child that tips the total over
+   * maxOutputChars is where the error is located, or `at` when the caller
+   * names the node (a loop keeps its own place). The body's characters are
+   * released when it returns: the parent then adds the returned text.
+   */
+  private renderChildren(
+    nodes: ASTNode[],
+    at?: ASTNode,
+    render: (child: ASTNode) => string = (child) => this.visit(child)
+  ): string {
+    const parts: string[] = [];
+    let mine = 0;
+    try {
+      for (const child of nodes) {
+        const output = render(child);
         parts.push(output);
+        mine += output.length;
+        this.held += output.length;
+        if (this.held > this.limits.maxOutputChars) {
+          const node = at ?? child;
+          throw this.outputTooLong(node.line, node.column);
+        }
       }
-      return parts.join("");
-    });
+    } finally {
+      this.held -= mine;
+    }
+    return parts.join("");
+  }
+
+  /**
+   * Run a block or a call one level deeper. The counter rises on every block
+   * entered and every CALL and falls when it ends, so it bounds recursion and
+   * nesting alike; crossing the cap is located at the opening tag.
+   */
+  private enter<T>(node: ASTNode, what: "block" | "call", run: () => T): T {
+    if (this.depth >= this.depthCap) {
+      throw new LimitError(
+        "limit-depth",
+        what === "call"
+          ? `Calls and blocks nest deeper than the maximum depth of ${this.depthCap}`
+          : `Block nesting exceeds the maximum depth of ${this.depthCap}`,
+        node.line,
+        node.column,
+        "Flatten nested blocks, end the recursion sooner or raise limits.maxDepth (a depth above 256 is never run)"
+      );
+    }
+    this.depth++;
+    try {
+      return run();
+    } finally {
+      this.depth--;
+    }
   }
 
   /**
@@ -164,12 +234,15 @@ export class Interpreter {
     }
   }
 
-  private countIteration(node: ForNode): void {
+  /** One FOR item or one CALL, counted toward maxIterations */
+  private countIteration(node: ForNode | CallNode): void {
     this.iterations++;
     if (this.iterations > this.limits.maxIterations) {
       throw new LimitError(
         "limit-iterations",
-        `Loops ran more than ${this.limits.maxIterations} iterations in total`,
+        node.type === "Call"
+          ? `Loops and macro calls ran more than ${this.limits.maxIterations} iterations in total`
+          : `Loops ran more than ${this.limits.maxIterations} iterations in total`,
         node.line,
         node.column,
         "Iterate over less data or raise limits.maxIterations"
@@ -218,6 +291,10 @@ export class Interpreter {
         return this.visitFence(node as FenceNode);
       case "Set":
         return this.at(node, () => this.visitSet(node as SetNode));
+      case "Define":
+        return ""; // hoisted into the macro table; prints nothing
+      case "Call":
+        return this.visitCall(node as CallNode);
       case "Ternary":
         return this.at(node, () => this.visitTernary(node as TernaryNode));
       case "Comment":
@@ -254,6 +331,44 @@ export class Interpreter {
     return "";
   }
 
+  /**
+   * Visit CALL: read the arguments in the caller's scope, then run the macro
+   * body in a scope of its own. The call counts one iteration and one level of
+   * depth. An error raised inside the body keeps the position of the failing
+   * body node and says which macro was running.
+   */
+  private visitCall(node: CallNode): string {
+    const macro = this.macros.get(node.name) as DefineNode; // linked in interpret
+    this.countIteration(node);
+    const args = this.at(node, () => node.args.map((arg) => this.readArgument(arg)));
+    return this.enter(node, "call", () => this.runMacro(macro, node, args));
+  }
+
+  /** An argument value, passed as the value (an array stays an array) */
+  private readArgument(arg: CallArg): TemplateValue {
+    return arg.kind === "literal" ? arg.value : this.resolveNestedPath(arg.path);
+  }
+
+  /**
+   * Run a macro body in a fresh frame over the data alone: its parameters
+   * shadow the data, and the caller's locals, loop names and @ metadata are
+   * out of reach. The caller's scope comes back whatever happens.
+   */
+  private runMacro(macro: DefineNode, call: CallNode, args: TemplateValue[]): string {
+    const frame = new Frame(this.root);
+    macro.params.forEach((param, i) => frame.set(param, args[i]));
+    const outer = this.scope;
+    this.scope = frame;
+    try {
+      return this.renderChildren(macro.body);
+    } catch (error) {
+      if (error instanceof TemplateError) error.addNote(macroNote(macro, call));
+      throw error;
+    } finally {
+      this.scope = outer;
+    }
+  }
+
   /**
    * The one value evaluator behind ${{ }} and SET: a path, arithmetic or a
    * literal, then the ?? default and the filter chain. Returns the value, not
@@ -332,7 +447,7 @@ export class Interpreter {
    * Visit IF node
    */
   private visitIf(node: IfNode): string {
-    return this.visitBody(this.selectBranch(node));
+    return this.enter(node, "block", () => this.visitBody(this.selectBranch(node)));
   }
 
   /**
@@ -355,18 +470,19 @@ export class Interpreter {
     }
   }
 
-  private visitBody(nodes: ASTNode[]): string {
-    return this.block(nodes, () => this.renderNodes(nodes));
-  }
-
-  private renderNodes(nodes: ASTNode[]): string {
-    return nodes.map((child) => this.visit(child)).join("");
+  /** `loop` is the FOR whose body this is: its output limit is located there */
+  private visitBody(nodes: ASTNode[], loop?: ForNode): string {
+    return this.block(nodes, () => this.renderChildren(nodes, loop));
   }
 
   /**
    * Visit CASE node
    */
   private visitCase(node: CaseNode): string {
+    return this.enter(node, "block", () => this.runCase(node));
+  }
+
+  private runCase(node: CaseNode): string {
     const valueStr = this.at(node, () =>
       this.valueToString(this.resolveNestedPath(node.expression.split(".")))
     );
@@ -392,11 +508,13 @@ export class Interpreter {
    */
   private visitFor(node: ForNode): string {
     const results: string[] = [];
-    this.runLoop(node, false, (nodes) => {
-      const output = this.visitBody(nodes);
-      results.push(output);
-      return output.length;
-    });
+    this.enter(node, "block", () =>
+      this.runLoop(node, false, (nodes) => {
+        const output = this.visitBody(nodes, node);
+        results.push(output);
+        return output.length;
+      })
+    );
     return results.join("");
   }
 
@@ -503,6 +621,10 @@ export class Interpreter {
    * skipEmpty is set
    */
   private visitSection(node: SectionNode): string {
+    return this.enter(node, "block", () => this.runSection(node));
+  }
+
+  private runSection(node: SectionNode): string {
     const title = this.at(node, () => this.sectionTitle(node));
     const heading = `${"#".repeat(node.level)} ${title}\n`;
     const body = this.visitBody(node.body).replace(/\r\n/g, "\n");
@@ -536,6 +658,10 @@ export class Interpreter {
    * Visit FENCE: the rendered body in a code fence sized to it
    */
   private visitFence(node: FenceNode): string {
+    return this.enter(node, "block", () => this.runFence(node));
+  }
+
+  private runFence(node: FenceNode): string {
     const lang = this.at(node, () => {
       const value = this.fenceLang(node);
       checkFenceLang(value);
@@ -568,7 +694,7 @@ export class Interpreter {
    */
   private visitList(node: ListNode, depth = 0): string {
     const lines: string[] = [];
-    this.collectListItems(node.items, depth, lines);
+    this.enter(node, "block", () => this.collectListItems(node.items, depth, lines));
     return lines.join("\n");
   }
 
@@ -595,17 +721,17 @@ export class Interpreter {
           length += line.length;
         }
       } else if (child.type === "If") {
-        length += this.collectListItems(
-          this.selectBranch(child as IfNode),
-          depth,
-          lines
+        length += this.enter(child, "block", () =>
+          this.collectListItems(this.selectBranch(child as IfNode), depth, lines)
         );
       } else if (child.type === "For") {
-        this.runLoop(child as ForNode, false, (nodes) => {
-          const added = this.collectListItems(nodes, depth, lines);
-          length += added;
-          return added;
-        });
+        this.enter(child, "block", () =>
+          this.runLoop(child as ForNode, false, (nodes) => {
+            const added = this.collectListItems(nodes, depth, lines);
+            length += added;
+            return added;
+          })
+        );
       }
     }
     return length;
@@ -628,18 +754,13 @@ export class Interpreter {
     }
 
     // Render content, in a block of its own
-    const content = this.block(node.content, () => {
-      let text = "";
-      for (const child of node.content) {
-        if (child.type === "List") {
-          // Nested list
-          text += "\n" + this.visitList(child as ListNode, depth + 1);
-        } else {
-          text += this.visit(child);
-        }
-      }
-      return text;
-    });
+    const content = this.block(node.content, () =>
+      this.renderChildren(node.content, undefined, (child) =>
+        child.type === "List"
+          ? "\n" + this.visitList(child as ListNode, depth + 1) // nested list
+          : this.visit(child)
+      )
+    );
 
     return content.trim();
   }
@@ -648,6 +769,10 @@ export class Interpreter {
    * Visit TABLE node
    */
   private visitTable(node: TableNode): string {
+    return this.enter(node, "block", () => this.runTable(node));
+  }
+
+  private runTable(node: TableNode): string {
     const rows: string[][] = [];
 
     // Process header
@@ -719,15 +844,19 @@ export class Interpreter {
   private rowsFromChild(child: TableChild, rows: string[][], strict: boolean): number {
     if (child.type === "For") {
       let length = 0;
-      this.runLoop(child, true, (nodes) => {
-        const added = this.tableRowsFrom(nodes, rows, strict);
-        length += added;
-        return added;
-      });
+      this.enter(child, "block", () =>
+        this.runLoop(child, true, (nodes) => {
+          const added = this.tableRowsFrom(nodes, rows, strict);
+          length += added;
+          return added;
+        })
+      );
       return length;
     }
     if (child.type === "If") {
-      return this.tableRowsFrom(this.selectBranch(child), rows, strict);
+      return this.enter(child, "block", () =>
+        this.tableRowsFrom(this.selectBranch(child), rows, strict)
+      );
     }
     const cells = this.processCellsArray(child.cells);
     rows.push(cells);
@@ -763,7 +892,7 @@ export class Interpreter {
         add(text.split("|").map((cell) => cell.trim()));
       }
     };
-    const inline = ["Text", "Variable", "Ternary", "Comment", "Set"];
+    const inline = ["Text", "Variable", "Ternary", "Comment", "Set", "Call"];
     let run: ASTNode[] = [];
     const flush = (): void => {
       if (run.length === 1) {
diff --git a/core/src/lexer.ts b/core/src/lexer.ts
index c8d452f..22af9f8 100644
--- a/core/src/lexer.ts
+++ b/core/src/lexer.ts
@@ -35,6 +35,9 @@ export const KEYWORDS: Readonly<Record<string, TokenType>> = {
   FENCE: TokenType.FENCE,
   END_FENCE: TokenType.END_FENCE,
   SET: TokenType.SET,
+  DEFINE: TokenType.DEFINE,
+  END_DEFINE: TokenType.END_DEFINE,
+  CALL: TokenType.CALL,
 };
 
 /** Block closers checked for balance, each with the opener it closes */
@@ -46,6 +49,7 @@ const CLOSERS: Partial<Record<TokenType, TokenType>> = {
   [TokenType.END_LIST]: TokenType.LIST,
   [TokenType.END_SECTION]: TokenType.SECTION,
   [TokenType.END_FENCE]: TokenType.FENCE,
+  [TokenType.END_DEFINE]: TokenType.DEFINE,
 };
 const OPENERS = new Set(Object.values(CLOSERS));
 
@@ -62,6 +66,7 @@ const OPENERS = new Set(Object.values(CLOSERS));
  * - Sections: {{SECTION "Title" level=2}}, {{END_SECTION}}
  * - Code fences: {{FENCE lang="md"}}, {{END_FENCE}}
  * - Locals: {{SET name = expression}}
+ * - Macros: {{DEFINE name(params)}}...{{END_DEFINE}}, {{CALL name(args)}}
  * - Ternary: {{condition ? "true" : "false"}}
  * - Comments: {{# comment #}}
  * - Literal blocks: {{RAW}}...{{END_RAW}}; \{{ is a literal brace pair
diff --git a/core/src/macros.ts b/core/src/macros.ts
new file mode 100644
index 0000000..caece62
--- /dev/null
+++ b/core/src/macros.ts
@@ -0,0 +1,321 @@
+import { SyntaxError } from "./errors";
+import {
+  ASTNode,
+  CallArg,
+  CallNode,
+  DefineNode,
+  IfNode,
+  ProgramNode,
+  CaseNode,
+  ForNode,
+  ListItemNode,
+  ListNode,
+  SectionNode,
+  FenceNode,
+  TableNode,
+  TableHeaderNode,
+  TableRowNode,
+} from "./types";
+
+/**
+ * Macros as pure functions over the parsed tree: the tag headers, the table of
+ * definitions and the link check. Nothing here holds interpreter state, so the
+ * interpreter and analyze share it, and a later source of macros (partials)
+ * only has to hand over more DEFINE nodes.
+ */
+
+const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*/;
+const WHOLE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
+const PATH = /^[A-Za-z_@][\w@]*(\.[\w@]+)*$/;
+const NUMBER = /^-?\d+(\.\d+)?$/;
+
+/** What a header parser returns when the tag text is wrong */
+export interface HeaderError {
+  error: string;
+}
+
+export interface DefineHeader {
+  name: string;
+  params: string[];
+}
+
+export interface CallHeader {
+  name: string;
+  args: CallArg[];
+}
+
+const fail = (error: string): HeaderError => ({ error });
+
+function skipSpaces(text: string, from: number): number {
+  let i = from;
+  while (i < text.length && /\s/.test(text[i])) i++;
+  return i;
+}
+
+/**
+ * Read `  name (` from the text after the tag word; returns the name and the
+ * index just after the opening parenthesis
+ */
+function readName(text: string): { name: string; at: number } | HeaderError {
+  if (text !== "" && !/^\s/.test(text)) return fail("a space must follow the tag word");
+  let i = skipSpaces(text, 0);
+  const match = IDENTIFIER.exec(text.slice(i));
+  if (!match) {
+    return fail(i >= text.length ? "a name is missing" : `bad name near "${text.slice(i, i + 12)}"`);
+  }
+  const name = match[0];
+  i = skipSpaces(text, i + name.length);
+  if (text[i] !== "(") return fail('"(" must follow the name');
+  return { name, at: i + 1 };
+}
+
+/** The text must hold nothing after the closing parenthesis at `close` */
+function checkEnd(text: string, close: number): HeaderError | null {
+  const rest = text.slice(close + 1).trim();
+  return rest === "" ? null : fail(`unexpected "${rest.slice(0, 12)}" after the )`);
+}
+
+/**
+ * Read the text after DEFINE: `name(param, param)`. A parameter is a plain
+ * identifier, given once.
+ */
+export function parseDefineHeader(text: string): DefineHeader | HeaderError {
+  const head = readName(text);
+  if ("error" in head) return head;
+  const close = text.indexOf(")", head.at);
+  if (close === -1) return fail("the closing ) is missing");
+  const unexpected = checkEnd(text, close);
+  if (unexpected) return unexpected;
+
+  const inner = text.slice(head.at, close);
+  const params: string[] = [];
+  if (inner.trim() === "") return { name: head.name, params };
+  const seen = new Set<string>();
+  for (const raw of inner.split(",")) {
+    const param = raw.trim();
+    if (param === "") return fail("a parameter is empty");
+    if (param.startsWith("@")) return fail(`"${param}" is a name the loops own`);
+    if (!WHOLE_IDENTIFIER.test(param)) {
+      return fail(`bad parameter "${param}"`);
+    }
+    if (seen.has(param)) return fail(`parameter "${param}" is given twice`);
+    seen.add(param);
+    params.push(param);
+  }
+  return { name: head.name, params };
+}
+
+/** One unquoted argument: true, false, null, a number or a variable path */
+function readWord(word: string): CallArg | HeaderError {
+  if (word === "") return fail("an argument is empty");
+  if (word === "true") return { kind: "literal", value: true };
+  if (word === "false") return { kind: "literal", value: false };
+  if (word === "null") return { kind: "literal", value: null };
+  if (NUMBER.test(word)) return { kind: "literal", value: Number(word) };
+  if (PATH.test(word)) return { kind: "path", path: word.split(".") };
+  return fail(`bad argument "${word}" (an argument is a path, a quoted text, a number, true, false or null)`);
+}
+
+/**
+ * Read the text after CALL: `name(arg, arg)`, character by character. A quoted
+ * text is taken as it is up to the same quote, so a comma, a parenthesis, a
+ * pipe or two question marks inside it are plain text.
+ */
+export function parseCallHeader(text: string): CallHeader | HeaderError {
+  const head = readName(text);
+  if ("error" in head) return head;
+
+  const args: CallArg[] = [];
+  let i = skipSpaces(text, head.at);
+  if (text[i] === ")") return finishCall(text, i, head.name, args);
+
+  for (;;) {
+    i = skipSpaces(text, i);
+    const quote = text[i];
+    if (quote === '"' || quote === "'") {
+      const end = text.indexOf(quote, i + 1);
+      if (end === -1) return fail("a quoted text is not closed");
+      args.push({ kind: "literal", value: text.slice(i + 1, end) });
+      i = end + 1;
+    } else {
+      let end = i;
+      while (end < text.length && text[end] !== "," && text[end] !== ")") end++;
+      const arg = readWord(text.slice(i, end).trim());
+      if ("error" in arg) return arg;
+      args.push(arg);
+      i = end;
+    }
+
+    i = skipSpaces(text, i);
+    if (text[i] === ",") {
+      i++;
+    } else if (text[i] === ")") {
+      return finishCall(text, i, head.name, args);
+    } else {
+      return fail(
+        i >= text.length ? "the closing ) is missing" : `unexpected "${text.slice(i, i + 12)}" after an argument`
+      );
+    }
+  }
+}
+
+function finishCall(text: string, close: number, name: string, args: CallArg[]): CallHeader | HeaderError {
+  return checkEnd(text, close) ?? { name, args };
+}
+
+/**
+ * The macros of a program by name. A Map, so a name such as __proto__ or
+ * constructor is a key and never reaches an engine object. A name defined
+ * twice is a syntax error at the second definition.
+ */
+export function buildMacroTable(defines: DefineNode[]): Map<string, DefineNode> {
+  const table = new Map<string, DefineNode>();
+  for (const define of defines) {
+    const first = table.get(define.name);
+    if (first) {
+      throw new SyntaxError(
+        `Macro '${define.name}' is already defined at line ${first.line}`,
+        define.line,
+        define.column,
+        "Give each macro a name of its own"
+      );
+    }
+    table.set(define.name, define);
+  }
+  return table;
+}
+
+/** The DEFINE nodes of a program; the parser allows them at the top level only */
+export function topLevelDefines(program: ProgramNode): DefineNode[] {
+  return program.body.filter((node): node is DefineNode => node.type === "Define");
+}
+
+/**
+ * Every CALL in the nodes, wherever it sits (DEFINE bodies, branches that never
+ * render, LIST and TABLE children, cells), in source order. It walks with its
+ * own stack, so a long ELSEIF chain or a wide template cannot overflow the
+ * call stack.
+ */
+export function findCalls(nodes: ASTNode[]): CallNode[] {
+  const calls: CallNode[] = [];
+  const pending: ASTNode[] = [];
+  const push = (list: ASTNode[] | undefined): void => {
+    if (list) for (const node of list) pending.push(node);
+  };
+  const pushCells = (cells: ASTNode[][]): void => {
+    for (const cell of cells) push(cell);
+  };
+
+  push(nodes);
+  while (pending.length > 0) {
+    const node = pending.pop() as ASTNode;
+    switch (node.type) {
+      case "Call":
+        calls.push(node as CallNode);
+        break;
+      case "Define":
+        push((node as DefineNode).body);
+        break;
+      case "If": {
+        const branch = node as IfNode;
+        push(branch.consequent);
+        if (Array.isArray(branch.alternate)) push(branch.alternate);
+        else if (branch.alternate) pending.push(branch.alternate);
+        break;
+      }
+      case "Case": {
+        const { cases, default: fallback } = node as CaseNode;
+        for (const when of cases) push(when.body);
+        push(fallback?.body);
+        break;
+      }
+      case "For": {
+        const loop = node as ForNode;
+        push(loop.body);
+        push(loop.elseBody);
+        break;
+      }
+      case "List":
+        push((node as ListNode).items);
+        break;
+      case "ListItem":
+        push((node as ListItemNode).content);
+        break;
+      case "Table": {
+        const table = node as TableNode;
+        if (table.header) pending.push(table.header);
+        push(table.rows);
+        break;
+      }
+      case "Header":
+      case "TableRow":
+        pushCells((node as TableHeaderNode | TableRowNode).cells);
+        break;
+      case "Section":
+      case "Fence":
+        push((node as SectionNode | FenceNode).body);
+        break;
+    }
+  }
+  return calls.sort((a, b) => a.line - b.line || a.column - b.column);
+}
+
+/** One CALL that does not match the macro table */
+export interface LinkProblem {
+  call: CallNode;
+  kind: "unknown" | "arity";
+  message: string;
+}
+
+/**
+ * The problems of the calls, in the order given: a name no macro has, or a
+ * known name with the wrong number of arguments
+ */
+export function linkProblems(
+  calls: CallNode[],
+  table: Map<string, DefineNode>
+): LinkProblem[] {
+  const problems: LinkProblem[] = [];
+  for (const call of calls) {
+    const macro = table.get(call.name);
+    if (!macro) {
+      problems.push({ call, kind: "unknown", message: `Unknown macro: ${call.name}` });
+    } else if (macro.params.length !== call.args.length) {
+      problems.push({
+        call,
+        kind: "arity",
+        message: `Macro '${call.name}' takes ${macro.params.length} argument(s), got ${call.args.length}`,
+      });
+    }
+  }
+  return problems;
+}
+
+/**
+ * The macro table of a program, after the link check: a duplicate name, then
+ * the first unknown macro or wrong argument count in source order, is a syntax
+ * error at it, whether or not the call would ever run.
+ */
+export function linkProgram(program: ProgramNode): Map<string, DefineNode> {
+  const table = buildMacroTable(topLevelDefines(program));
+  const [first] = linkProblems(findCalls(program.body), table);
+  if (first) {
+    throw new SyntaxError(
+      first.message,
+      first.call.line,
+      first.call.column,
+      first.kind === "unknown"
+        ? "Define it with {{DEFINE name(param, ...)}}"
+        : "Give the call as many arguments as the macro has parameters"
+    );
+  }
+  return table;
+}
+
+/**
+ * What an error raised in a macro body says about where the body came from.
+ * The one place the wording lives, so a later source of macros can add to it.
+ */
+export function macroNote(macro: DefineNode, call: CallNode): string {
+  return ` (in macro '${macro.name}', called at line ${call.line}, col ${call.column})`;
+}
diff --git a/core/src/parser.ts b/core/src/parser.ts
index 5f1b82e..cc0bad5 100644
--- a/core/src/parser.ts
+++ b/core/src/parser.ts
@@ -25,12 +25,15 @@ import {
   FenceLang,
   FilterCall,
   SetNode,
+  DefineNode,
+  CallNode,
   ValueExpr,
   DEFAULT_LIMITS,
 } from "./types";
 import { SyntaxError, TypeError, LimitError } from "./errors";
 import { parseFilter } from "./filters";
 import { parseLiteral, parseWhenMatch } from "./expressions";
+import { parseCallHeader, parseDefineHeader } from "./macros";
 
 const SET_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
 const BLOCK_ARGUMENT = /(\w+)=("[^"]*"|'[^']*'|\S*)|"[^"]*"|'[^']*'|\S+/g;
@@ -52,6 +55,8 @@ export class Parser {
   private itemDepth = 0;
   /** Item names of the FOR bodies that enclose the current token (not their ELSE bodies) */
   private readonly loopNames: string[] = [];
+  /** Parameter names of the DEFINE whose body is being parsed */
+  private macroParams: string[] = [];
   private readonly maxDepth: number;
   private readonly maxNodes: number;
 
@@ -115,6 +120,10 @@ export class Parser {
         return this.parseTableRow();
       case TokenType.SET:
         return this.parseSet();
+      case TokenType.DEFINE:
+        return this.parseDefine();
+      case TokenType.CALL:
+        return this.parseCall();
       case TokenType.COMMENT:
         return this.parseComment();
       case TokenType.EOF:
@@ -269,6 +278,9 @@ export class Parser {
     if (this.loopNames.includes(name)) {
       fail(`"${name}" is the item of an enclosing FOR`);
     }
+    if (this.macroParams.includes(name)) {
+      fail(`"${name}" is a parameter of the enclosing DEFINE`);
+    }
     if (rest.startsWith("=")) fail("a single = binds, == compares");
     const expression = rest.trim();
     if (expression === "") fail("the expression is missing");
@@ -357,6 +369,88 @@ export class Parser {
     return parts;
   }
 
+  /**
+   * Parse DEFINE: {{DEFINE name(param, ...)}}...{{END_DEFINE}}. It sits at the
+   * top level only: any block around it (another DEFINE included) is an error
+   * at the DEFINE.
+   */
+  private parseDefine(): DefineNode {
+    if (this.depth > 0) {
+      const token = this.current();
+      throw new SyntaxError(
+        "A {{DEFINE}} must sit at the top level, outside every block",
+        token.line,
+        token.column,
+        "Move the DEFINE out of the block; a CALL can still sit anywhere"
+      );
+    }
+    return this.nested(() => this.parseDefineBlock());
+  }
+
+  private parseDefineBlock(): DefineNode {
+    const token = this.open(TokenType.DEFINE);
+    const header = parseDefineHeader(token.value.slice("DEFINE".length));
+    if ("error" in header) {
+      throw new SyntaxError(
+        `Invalid DEFINE syntax: ${header.error}`,
+        token.line,
+        token.column,
+        "Expected: {{DEFINE name(param, ...)}}"
+      );
+    }
+
+    this.macroParams = header.params;
+    const body: ASTNode[] = [];
+    while (!this.check(TokenType.END_DEFINE)) {
+      if (this.isAtEnd()) {
+        throw new SyntaxError(
+          "Unclosed {{DEFINE}} block",
+          token.line,
+          token.column,
+          "Add {{END_DEFINE}}"
+        );
+      }
+      const node = this.parseNode();
+      if (node) body.push(node);
+    }
+    this.consume(TokenType.END_DEFINE);
+    this.macroParams = [];
+
+    return {
+      type: "Define",
+      name: header.name,
+      params: header.params,
+      body,
+      line: token.line,
+      column: token.column,
+    };
+  }
+
+  /**
+   * Parse CALL: {{CALL name(arg, ...)}}, a single tag. Every problem is a
+   * syntax error at the tag, found at parse time even in a branch that never
+   * renders.
+   */
+  private parseCall(): CallNode {
+    const token = this.open(TokenType.CALL);
+    const header = parseCallHeader(token.value.slice("CALL".length));
+    if ("error" in header) {
+      throw new SyntaxError(
+        `Invalid CALL syntax: ${header.error}`,
+        token.line,
+        token.column,
+        "Expected: {{CALL name(arg, ...)}} with paths, quoted text, numbers, true, false or null as arguments"
+      );
+    }
+    return {
+      type: "Call",
+      name: header.name,
+      args: header.args,
+      line: token.line,
+      column: token.column,
+    };
+  }
+
   /**
    * Parse IF block: {{IF condition}}...{{ELSEIF}}...{{ELSE}}...{{END_IF}}
    * ELSEIF branches nest in the alternate of the branch before them and are
diff --git a/core/src/render.ts b/core/src/render.ts
index 7d55556..cb6581e 100644
--- a/core/src/render.ts
+++ b/core/src/render.ts
@@ -4,7 +4,7 @@ import {
   WhitespaceOptions,
   withDefaultLimits,
 } from "./types";
-import { DiagnosticCode, TemplateError } from "./errors";
+import { DiagnosticCode, LimitError, TemplateError } from "./errors";
 import { Lexer } from "./lexer";
 import { Parser } from "./parser";
 import { Interpreter } from "./interpreter";
@@ -79,6 +79,10 @@ export function render(
     }).parse();
     output = interpreter.interpret(ast);
   } catch (error) {
+    // a stack overflow inside a very deep template is a depth error, not a crash
+    if (error instanceof RangeError) {
+      return failure(toDiagnostic(tooDeep()), interpreter.iterationCount);
+    }
     if (!(error instanceof TemplateError)) throw error;
     return failure(toDiagnostic(error), interpreter.iterationCount);
   }
@@ -134,6 +138,17 @@ function failure(diagnostic: Diagnostic, iterations: number): RenderResult {
   };
 }
 
+/** The error for a template that overflowed the stack; no position is known */
+function tooDeep(): TemplateError {
+  return new LimitError(
+    "limit-depth",
+    "The template nests too deeply to run",
+    1,
+    1,
+    "Flatten the nested blocks or lower limits.maxDepth"
+  );
+}
+
 function toDiagnostic(error: TemplateError): Diagnostic {
   const diagnostic: Diagnostic = {
     severity: "error",
diff --git a/core/src/spec.ts b/core/src/spec.ts
index dfbe417..d9c8a2c 100644
--- a/core/src/spec.ts
+++ b/core/src/spec.ts
@@ -111,6 +111,19 @@ const BLOCKS: Spec["blocks"] = [
     description:
       "Binds a local for the rest of its block: the value of a path, arithmetic, a quoted text, number, true, false or null, with ?? default and | filters, kept as it is (an array stays an array). A single tag with no closer; it prints nothing",
   },
+  {
+    name: "DEFINE",
+    closes: "END_DEFINE",
+    args: "name(param, ...)",
+    description:
+      "A reusable text block, hoisted: a CALL may come before it. Top level only, never inside another block, and it prints nothing. The body sees its parameters and the data only, never the caller's SET locals, loop names or @ metadata",
+  },
+  {
+    name: "CALL",
+    args: "name(arg, ...)",
+    description:
+      "Prints the output of a macro for its arguments, each a variable path (read in the caller's scope), a quoted text, a number, true, false or null. A single tag with no closer; every call counts one iteration toward maxIterations, and recursion is bounded by the depth limit",
+  },
   {
     name: "RAW",
     closes: "END_RAW",
diff --git a/core/src/types.ts b/core/src/types.ts
index 30df1a8..98182a4 100644
--- a/core/src/types.ts
+++ b/core/src/types.ts
@@ -68,6 +68,9 @@ export enum TokenType {
   FENCE = "FENCE",
   END_FENCE = "END_FENCE",
   SET = "SET",
+  DEFINE = "DEFINE",
+  END_DEFINE = "END_DEFINE",
+  CALL = "CALL",
   COMMENT = "COMMENT",
   EOF = "EOF",
 }
@@ -147,6 +150,34 @@ export interface SetNode extends ASTNode {
   value: ValueExpr;
 }
 
+/**
+ * DEFINE: a reusable text block, hoisted from the top level of the template.
+ * Its body sees its parameters and the data, nothing of the caller.
+ */
+export interface DefineNode extends ASTNode {
+  type: "Define";
+  name: string;
+  params: string[];
+  body: ASTNode[];
+}
+
+/**
+ * One argument of a CALL: a variable path read in the caller's scope, or a
+ * literal value
+ */
+export type CallArg =
+  | { kind: "path"; path: string[] }
+  | { kind: "literal"; value: TemplateValue };
+
+/**
+ * CALL: prints the output of a macro body for the given arguments
+ */
+export interface CallNode extends ASTNode {
+  type: "Call";
+  name: string;
+  args: CallArg[];
+}
+
 /**
  * Ternary operator node
  */
diff --git a/core/src/whitespace.ts b/core/src/whitespace.ts
index b9c5548..6fc5f94 100644
--- a/core/src/whitespace.ts
+++ b/core/src/whitespace.ts
@@ -21,6 +21,8 @@ const STANDALONE_TAGS = new Set<TokenType>([
   TokenType.RAW,
   TokenType.END_RAW,
   TokenType.SET,
+  TokenType.DEFINE,
+  TokenType.END_DEFINE,
   TokenType.COMMENT,
 ]);
 
diff --git a/tests/language/set.test.ts b/tests/language/set.test.ts
index 334e2b6..2b5d283 100644
--- a/tests/language/set.test.ts
+++ b/tests/language/set.test.ts
@@ -864,7 +864,7 @@ describe("st-keywords: the keyword table", () => {
   });
   it("st-keywords: the derived block table keeps today's rows and adds SET with no closer", () => {
     const got = new Map(derivedPairs());
-    const want = new Map<string, string | undefined>([...OLD_PAIRS, ["SET", undefined]]);
+    const want = new Map<string, string | undefined>([...OLD_PAIRS, ["SET", undefined], ["DEFINE", "END_DEFINE"], ["CALL", undefined]]);
     check([...got.entries()].sort(), "the openers with their closers").toEqual([...want.entries()].sort());
   });
   it("st-keywords: every opener in the table has a spec().blocks entry with the closer the table gives", () => {
```

## Gate run

Gate command green at commit a64405b31fbc (3330 tests).

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
