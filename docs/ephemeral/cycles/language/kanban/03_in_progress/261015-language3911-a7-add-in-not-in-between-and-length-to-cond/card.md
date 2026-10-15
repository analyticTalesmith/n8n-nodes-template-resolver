# Add in, not in, between and length to conditions

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Conditions can test membership, ranges and sizes with in, not in, between [a, b] and .length, and equality no longer coerces a quoted literal to a number.

## Must-haves

- `contract` `op-in` x in ["a","b"], x in list_var and x in "text" (substring) and the not in forms evaluate as written, with a located type-error for an operand that cannot be tested
- `contract` `op-between` x between [1, 10] is inclusive at both ends; a non-numeric operand is a type-error located at the condition
- `contract` `op-length` .length works on arrays and strings in conditions and in output; an object key named length wins over the built-in
- `contract` `op-equality` a side written as a quoted literal compares as text (z == "01234" is false for 1234); an unquoted number on the right of contains keeps its written text
- `contract` `op-unknown` an unrecognized word next to an operator is an error in every mode (ADR 0003), not only in strict mode
- `contract` `op-spec` spec() and analyze list the new operators, and analyze records the variables read by in, between and length

## Acceptance criteria

- op-in: x in ["a","b"], x in list_var and x in "text" (substring) and the not in forms evaluate as written, with a located type-error for an operand that cannot be tested
- op-between: x between [1, 10] is inclusive at both ends; a non-numeric operand is a type-error located at the condition
- op-length: .length works on arrays and strings in conditions and in output; an object key named length wins over the built-in
- op-equality: a side written as a quoted literal compares as text (z == "01234" is false for 1234); an unquoted number on the right of contains keeps its written text
- op-unknown: an unrecognized word next to an operator is an error in every mode (ADR 0003), not only in strict mode
- op-spec: spec() and analyze list the new operators, and analyze records the variables read by in, between and length

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

spec().operators gains in, not in, between, .length. No change to the existing operator spellings. Each precedence pairing of the new operators with AND, OR and NOT has a table row.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/language/operators.test.ts` | add | template-resolver |
| `core/src/expressions.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/spec.ts`, `tests/language/operators.test.ts`
<!-- end generated scope -->
