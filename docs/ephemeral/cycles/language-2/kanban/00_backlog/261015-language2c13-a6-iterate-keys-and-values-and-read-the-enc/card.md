# Iterate keys and values and read the enclosing loop

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Iterate keys and values and read the enclosing loop.

## Must-haves

- `contract` `fo-pairs` objects, arrays, JSON-object text, empty and non-iterable input in strict and lenient mode; `limit`, `offset`, ELSE and `@total` apply to pairs.
- `contract` `fo-parent` every metadata name through one and two levels; a missing level or an outermost loop is a missing variable (strict error, lenient empty).
- `contract` `fo-scope` `k` and `v` never leak after END_FOR; `@parent` is not visible inside a macro body called from the loop (a body loop has its own parent chain).
- `contract` `fo-errors` three names, a repeated name, an invalid name or a SET name collision is a `syntax-error` at the FOR.
- `contract` `fo-analyze` `k`, `v` and `@parent` are not inputs.
- `contract` `fo-compat` the full suite passes; no existing test file changes.

## Acceptance criteria

- fo-pairs: objects, arrays, JSON-object text, empty and non-iterable input in strict and lenient mode; `limit`, `offset`, ELSE and `@total` apply to pairs.
- fo-parent: every metadata name through one and two levels; a missing level or an outermost loop is a missing variable (strict error, lenient empty).
- fo-scope: `k` and `v` never leak after END_FOR; `@parent` is not visible inside a macro body called from the loop (a body loop has its own parent chain).
- fo-errors: three names, a repeated name, an invalid name or a SET name collision is a `syntax-error` at the FOR.
- fo-analyze: `k`, `v` and `@parent` are not inputs.
- fo-compat: the full suite passes; no existing test file changes.

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
| `tests/golden/render-cases/lang-for-pairs/data.json` | add | template-resolver |
| `tests/golden/render-cases/lang-for-pairs/expected.md` | add | template-resolver |
| `tests/golden/render-cases/lang-for-pairs/options.json` | add | template-resolver |
| `tests/golden/render-cases/lang-for-pairs/template.md` | add | template-resolver |
| `tests/language/for-pairs.test.ts` | add | template-resolver |
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/scope.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `core/src/types.ts` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/scope.ts`, `core/src/spec.ts`, `core/src/types.ts`, `tests/golden/render-cases/lang-for-pairs/data.json`, `tests/golden/render-cases/lang-for-pairs/expected.md`, `tests/golden/render-cases/lang-for-pairs/options.json`, `tests/golden/render-cases/lang-for-pairs/template.md`, `tests/language/for-pairs.test.ts`
<!-- end generated scope -->
