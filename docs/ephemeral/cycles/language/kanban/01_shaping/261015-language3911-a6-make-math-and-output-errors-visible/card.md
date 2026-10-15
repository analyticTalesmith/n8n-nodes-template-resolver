# Make math and output errors visible

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Math and output mistakes stop being silent: division or modulo by zero, a malformed math expression and a cyclic value end render with a located error in every mode, results print without binary float noise and a hyphen between two letters is part of a name. All in render only: resolveTemplate keeps its outputs.

## Must-haves

- `contract` `mt-zero` /0 and %0 are a type-error located at the variable in render (resolveTemplate keeps printing Infinity as before)
- `contract` `mt-float` arithmetic results print with at most 15 significant digits (0.1+0.2 prints 0.3; 1/3 keeps its digits; integers and negative numbers print unchanged)
- `contract` `mt-hyphen` a hyphen with a letter on both sides is part of one name, a - b and n-1 stay arithmetic, and a missing hyphenated name suggests the spaced form
- `contract` `mt-lenient` a malformed math expression fails render in lenient mode too, with a located diagnostic instead of empty output
- `contract` `mt-cyclic` a cyclic or unprintable value used as output is a type-error located at the variable instead of ok true with empty text

## Acceptance criteria

- mt-zero: /0 and %0 are a type-error located at the variable in render (resolveTemplate keeps printing Infinity as before)
- mt-float: arithmetic results print with at most 15 significant digits (0.1+0.2 prints 0.3; 1/3 keeps its digits; integers and negative numbers print unchanged)
- mt-hyphen: a hyphen with a letter on both sides is part of one name, a - b and n-1 stay arithmetic, and a missing hyphenated name suggests the spaced form
- mt-lenient: a malformed math expression fails render in lenient mode too, with a located diagnostic instead of empty output
- mt-cyclic: a cyclic or unprintable value used as output is a type-error located at the variable instead of ok true with empty text

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

No new public names. Render-only behaviour changes; resolveTemplate outputs stay (the existing tests that pin Infinity and the old ?? keep passing). Document the render-only divergence in the module page and the language contract.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/language/math.test.ts` | add | template-resolver |
| `core/src/errors.ts` | edit | template-resolver |
| `core/src/expressions.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/render.ts` | edit | template-resolver |

Files scope: `core/src/errors.ts`, `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/render.ts`, `tests/language/math.test.ts`
<!-- end generated scope -->
