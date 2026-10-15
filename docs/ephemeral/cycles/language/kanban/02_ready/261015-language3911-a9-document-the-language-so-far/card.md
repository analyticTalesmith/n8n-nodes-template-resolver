# Document the language so far

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

The README, the changelog, the language contract, the module pages and a new ADR describe every filter, operator, limit and WHEN form built in this cycle, and a test keeps spec() in step with the lexer and the registry.

## Must-haves

- `contract` `ld-spec` a test proves every lexer keyword and every registry filter appears in spec(), and every operator the evaluator supports appears in spec().operators
- `contract` `ld-readme` the README documents each filter, operator, limit option and WHEN form of this cycle with an example that renders as shown (a golden case renders the README example)
- `contract` `ld-contract` the language contract, the template-resolver module page, the api and cli module pages and the headless contract match the code
- `contract` `ld-adr` ADR 0007 (statement tags without a body: SET, INPUT and CALL are single tags like ELSE, recorded beside ADR 0001) exists with the options considered

## Acceptance criteria

- ld-spec: a test proves every lexer keyword and every registry filter appears in spec(), and every operator the evaluator supports appears in spec().operators
- ld-readme: the README documents each filter, operator, limit option and WHEN form of this cycle with an example that renders as shown (a golden case renders the README example)
- ld-contract: the language contract, the template-resolver module page, the api and cli module pages and the headless contract match the code
- ld-adr: ADR 0007 (statement tags without a body: SET, INPUT and CALL are single tags like ELSE, recorded beside ADR 0001) exists with the options considered

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

Documentation, one test file and one golden case. The living documents change through deltas the lead records in the cycle; the ADR is a new document written through an add delta.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/golden/render-cases/lang-filters-showcase/template.md` | add | api, cli, template-resolver |
| `tests/language/surfaces.test.ts` | add | api, cli, template-resolver |
| `README.md` | edit | api, cli, template-resolver |
| `changelog.md` | edit | api, cli, template-resolver |

Files scope: `README.md`, `changelog.md`, `tests/golden/render-cases/lang-filters-showcase/template.md`, `tests/language/surfaces.test.ts`
<!-- end generated scope -->
