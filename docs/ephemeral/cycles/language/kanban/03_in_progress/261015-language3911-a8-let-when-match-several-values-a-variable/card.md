# Let WHEN match several values, a variable or a comparison

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

A CASE branch can match several values, a variable or a comparison, so authors stop chaining IF for every choice.

## Must-haves

- `contract` `cs-values` {{WHEN "a", "b"}} matches either value
- `contract` `cs-var` {{WHEN other}} compares with the variable value under strict-mode rules for a missing variable
- `contract` `cs-compare` {{WHEN >= 10}} works with == != > < >= <=, using the equality of the operators card
- `contract` `cs-errors` an empty WHEN, or a comparison mixed with a list of values, is a syntax-error located at the tag
- `contract` `cs-analyze` analyze records WHEN variables as case usage

## Acceptance criteria

- cs-values: {{WHEN "a", "b"}} matches either value
- cs-var: {{WHEN other}} compares with the variable value under strict-mode rules for a missing variable
- cs-compare: {{WHEN >= 10}} works with == != > < >= <=, using the equality of the operators card
- cs-errors: an empty WHEN, or a comparison mixed with a list of values, is a syntax-error located at the tag
- cs-analyze: analyze records WHEN variables as case usage

## Must-nots

- change any existing test expectation other than the one named amendment (if any)
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Context links

- [Template resolver module](../../../../../../living/architecture/modules/template-resolver.md)
- [Unknown names are errors (ADR 0003)](../../../../../../living/decisions/adr/0003-unknown-names-are-always-errors.md)
- [Language contract](../../../../../../living/architecture/language-contract.md)

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter, or the root README.md), or give user_docs_waiver, one line with the reason none changes. A card that changes only documents needs nothing, and the root README.md counts as user facing without a tag. If no user can see it, write `none`. -->

## Interface contract

No new keyword. The CASE node gains a list of WHEN matchers (values, variable or comparison). A golden case lang-case under tests/golden/render-cases, picked up by the existing golden harness (add its sibling files in the same folder as the existing cases do).

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/golden/render-cases/lang-case/template.md` | add | template-resolver |
| `tests/language/case.test.ts` | add | template-resolver |
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/expressions.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `core/src/types.ts` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/spec.ts`, `core/src/types.ts`, `tests/golden/render-cases/lang-case/template.md`, `tests/language/case.test.ts`
<!-- end generated scope -->
