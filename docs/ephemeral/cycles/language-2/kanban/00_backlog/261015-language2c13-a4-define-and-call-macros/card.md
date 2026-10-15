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
| `tests/golden/render-cases/lang-macro/data.json` | add | template-resolver |
| `tests/golden/render-cases/lang-macro/expected.md` | add | template-resolver |
| `tests/golden/render-cases/lang-macro/options.json` | add | template-resolver |
| `tests/golden/render-cases/lang-macro/template.md` | add | template-resolver |
| `tests/language/macros.test.ts` | add | template-resolver |
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/errors.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/lexer.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/render.ts` | edit | template-resolver |
| `core/src/scope.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `core/src/types.ts` | edit | template-resolver |
| `core/src/whitespace.ts` | edit | template-resolver |
| `locateError` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/interpreter.ts`, `core/src/lexer.ts`, `core/src/macros.ts`, `core/src/parser.ts`, `core/src/render.ts`, `core/src/scope.ts`, `core/src/spec.ts`, `core/src/types.ts`, `core/src/whitespace.ts`, `locateError`, `tests/golden/render-cases/lang-macro/data.json`, `tests/golden/render-cases/lang-macro/expected.md`, `tests/golden/render-cases/lang-macro/options.json`, `tests/golden/render-cases/lang-macro/template.md`, `tests/language/macros.test.ts`
<!-- end generated scope -->
