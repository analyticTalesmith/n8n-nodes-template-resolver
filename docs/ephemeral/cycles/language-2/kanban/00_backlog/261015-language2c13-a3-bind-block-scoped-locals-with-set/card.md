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
| `tests/golden/render-cases/lang-set/data.json` | add | template-resolver |
| `tests/golden/render-cases/lang-set/expected.md` | add | template-resolver |
| `tests/golden/render-cases/lang-set/options.json` | add | template-resolver |
| `tests/golden/render-cases/lang-set/template.md` | add | template-resolver |
| `tests/language/set.test.ts` | add | template-resolver |
| `api/openapi.json` | edit | template-resolver |
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/lexer.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/scope.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `core/src/types.ts` | edit | template-resolver |
| `core/src/whitespace.ts` | edit | template-resolver |
| `tests/language/surfaces.test.ts` | edit | template-resolver |
| `visitVariable` | edit | template-resolver |

Files scope: `api/openapi.json`, `core/src/analyze.ts`, `core/src/interpreter.ts`, `core/src/lexer.ts`, `core/src/parser.ts`, `core/src/scope.ts`, `core/src/spec.ts`, `core/src/types.ts`, `core/src/whitespace.ts`, `tests/golden/render-cases/lang-set/data.json`, `tests/golden/render-cases/lang-set/expected.md`, `tests/golden/render-cases/lang-set/options.json`, `tests/golden/render-cases/lang-set/template.md`, `tests/language/set.test.ts`, `tests/language/surfaces.test.ts`, `visitVariable`
<!-- end generated scope -->
