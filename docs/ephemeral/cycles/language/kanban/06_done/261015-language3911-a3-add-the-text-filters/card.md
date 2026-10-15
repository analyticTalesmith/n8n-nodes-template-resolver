# Add the text filters

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Authors can reshape text in the language with upper, lower, title, replace, indent, quote, round and default, each a row in the text filter group of the registry, with wrong or missing parameters reported as located type-errors.

## Must-haves

- `contract` `ft-text` each of upper, lower, title, replace (replace:find="a",with="b", every occurrence), indent (indent=N spaces on every non-empty line, default 2), quote (a JSON-style double-quoted string) and round (round=N decimal places, default 0) gives the expected output for a table of inputs, including empty, number, boolean and non-string input coerced to text first; no existing filter output changes
- `contract` `ft-params` a missing required parameter (replace without find, round or indent with a non-integer) or a parameter the filter does not declare is a type-error located at the variable, in every mode
- `contract` `ft-default` default="x" replaces a value that is not truthy (missing, null, empty text, 0, false, empty list, empty object); the existing ?? keeps its current behaviour in this card

## Acceptance criteria

- ft-text: each of upper, lower, title, replace (replace:find="a",with="b", every occurrence), indent (indent=N spaces on every non-empty line, default 2), quote (a JSON-style double-quoted string) and round (round=N decimal places, default 0) gives the expected output for a table of inputs, including empty, number, boolean and non-string input coerced to text first; no existing filter output changes
- ft-params: a missing required parameter (replace without find, round or indent with a non-integer) or a parameter the filter does not declare is a type-error located at the variable, in every mode
- ft-default: default="x" replaces a value that is not truthy (missing, null, empty text, 0, false, empty list, empty object); the existing ?? keeps its current behaviour in this card

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

core/src/filters-text.ts exports TEXT_FILTERS: FilterDefinition[] with rows upper (no params), lower, title, replace (params: find, with), indent (shorthand = spaces), quote, round (shorthand = places) and default (shorthand = replacement text). No dispatch or parser change.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/language/filters-text.test.ts` | add | template-resolver |
| `core/src/filters-text.ts` | edit | template-resolver |

Files scope: `core/src/filters-text.ts`, `tests/language/filters-text.test.ts`
<!-- end generated scope -->
