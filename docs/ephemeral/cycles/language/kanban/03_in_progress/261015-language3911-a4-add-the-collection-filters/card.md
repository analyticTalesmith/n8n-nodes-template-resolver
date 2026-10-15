# Add the collection filters

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Authors can join, count, pick, order, de-duplicate, slice, split and serialize lists in the language with join, length, first, last, sort, unique, slice, lines and json, each a row in the collection filter group of the registry.

## Must-haves

- `contract` `fc-collection` a table per filter over arrays, string inputs coerced exactly as FOR coerces them, objects and empty or missing input: join (join=", "), length (items of a list, characters of a text, keys of an object), first, last, slice (slice:start=1,end=3), lines (split text on line breaks, CRLF included) and unique
- `contract` `fc-order` sort is stable and deterministic: numbers numeric, strings by code unit, sort=key orders objects by that key, a mixed list sorts numbers before strings; unique keeps the first occurrence of each value
- `contract` `fc-json` json prints a compact JSON text of the value with stable key order; a cyclic value is a type-error located at the variable; a wrong or undeclared parameter on any collection filter is a type-error located at the variable

## Acceptance criteria

- fc-collection: a table per filter over arrays, string inputs coerced exactly as FOR coerces them, objects and empty or missing input: join (join=", "), length (items of a list, characters of a text, keys of an object), first, last, slice (slice:start=1,end=3), lines (split text on line breaks, CRLF included) and unique
- fc-order: sort is stable and deterministic: numbers numeric, strings by code unit, sort=key orders objects by that key, a mixed list sorts numbers before strings; unique keeps the first occurrence of each value
- fc-json: json prints a compact JSON text of the value with stable key order; a cyclic value is a type-error located at the variable; a wrong or undeclared parameter on any collection filter is a type-error located at the variable

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

core/src/filters-collection.ts exports COLLECTION_FILTERS: FilterDefinition[] with rows join (shorthand = separator), length, first, last, sort (shorthand = key), unique, slice (params: start, end), lines and json. No dispatch or parser change.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/language/filters-collection.test.ts` | add | template-resolver |
| `core/src/filters-collection.ts` | edit | template-resolver |

Files scope: `core/src/filters-collection.ts`, `tests/language/filters-collection.test.ts`
<!-- end generated scope -->
