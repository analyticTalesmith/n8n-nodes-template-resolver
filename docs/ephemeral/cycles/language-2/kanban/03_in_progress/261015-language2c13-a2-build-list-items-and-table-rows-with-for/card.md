# Build LIST items and TABLE rows with FOR and IF

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Build LIST items and TABLE rows with FOR and IF.

## Must-haves

- `contract` `lc-list` FOR and IF/ELSEIF/ELSE (nested to any allowed depth) inside LIST yield LIST_ITEMs, numbered without gaps across mixed static and generated items; items skipped by their own condition or fallback keep today's numbering rule.
- `contract` `lc-table` IF/ELSEIF/ELSE inside TABLE, and a FOR or IF inside either, yield ROWs; rows are padded to the widest row as before; the header rule is unchanged.
- `contract` `lc-close` a LIST_ITEM without END_LIST_ITEM ends at the next item, END_LIST, and now also at END_FOR, ELSE, ELSEIF or END_IF of the enclosing child block; a ROW without END_ROW does the same inside an IF or FOR that builds rows; an unclosed item followed by a FOR or IF is that item's content (no new guess), and a LIST_ITEM found inside such content is a `syntax-error` whose suggestion says to close the item with END_LIST_ITEM.
- `contract` `lc-errors` any other tag or non-whitespace text inside a FOR or IF that builds LIST items, or an IF that builds TABLE rows, is a `syntax-error` at its own position, in every mode; comments and whitespace are always allowed. A FOR placed directly in a TABLE keeps today's text-row fallback (a body that is not a ROW is rendered and split on `|` into a row), so no existing table template changes (question 4).
- `contract` `lc-limits` FOR and IF in LIST and TABLE count toward maxNodes, maxDepth (parse) and maxIterations (run) exactly as elsewhere.
- `contract` `lc-ws` the standalone rule and trim markers apply to the FOR, IF, ELSE and END tags in LIST and TABLE as elsewhere; LIST, TABLE and their parts keep their own spacing.
- `contract` `lc-analyze` analyze visits generated items and rows; FOR names inside are scoped; kinds are `list_item` and `table` as today.
- `contract` `lc-pipes` in a table cell a pipe after an even run of backslashes is escaped, after an odd run is left as written. This changes the output of a previously valid template (a cell holding two backslashes and a pipe): named in question 5 and the changelog.
- `contract` `lc-compat` the full suite passes; no existing test file changes.

## Acceptance criteria

- lc-list: FOR and IF/ELSEIF/ELSE (nested to any allowed depth) inside LIST yield LIST_ITEMs, numbered without gaps across mixed static and generated items; items skipped by their own condition or fallback keep today's numbering rule.
- lc-table: IF/ELSEIF/ELSE inside TABLE, and a FOR or IF inside either, yield ROWs; rows are padded to the widest row as before; the header rule is unchanged.
- lc-close: a LIST_ITEM without END_LIST_ITEM ends at the next item, END_LIST, and now also at END_FOR, ELSE, ELSEIF or END_IF of the enclosing child block; a ROW without END_ROW does the same inside an IF or FOR that builds rows; an unclosed item followed by a FOR or IF is that item's content (no new guess), and a LIST_ITEM found inside such content is a `syntax-error` whose suggestion says to close the item with END_LIST_ITEM.
- lc-errors: any other tag or non-whitespace text inside a FOR or IF that builds LIST items, or an IF that builds TABLE rows, is a `syntax-error` at its own position, in every mode; comments and whitespace are always allowed. A FOR placed directly in a TABLE keeps today's text-row fallback (a body that is not a ROW is rendered and split on `|` into a row), so no existing table template changes (question 4).
- lc-limits: FOR and IF in LIST and TABLE count toward maxNodes, maxDepth (parse) and maxIterations (run) exactly as elsewhere.
- lc-ws: the standalone rule and trim markers apply to the FOR, IF, ELSE and END tags in LIST and TABLE as elsewhere; LIST, TABLE and their parts keep their own spacing.
- lc-analyze: analyze visits generated items and rows; FOR names inside are scoped; kinds are `list_item` and `table` as today.
- lc-pipes: in a table cell a pipe after an even run of backslashes is escaped, after an odd run is left as written. This changes the output of a previously valid template (a cell holding two backslashes and a pipe): named in question 5 and the changelog.
- lc-compat: the full suite passes; no existing test file changes.

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
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `core/src/types.ts` | edit | template-resolver |
| `tests/language/list-table-children.test.ts` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/spec.ts`, `core/src/types.ts`, `tests/golden/render-cases/lang-list-for/data.json`, `tests/golden/render-cases/lang-list-for/expected.md`, `tests/golden/render-cases/lang-list-for/options.json`, `tests/golden/render-cases/lang-list-for/template.md`, `tests/golden/render-cases/lang-table-if/data.json`, `tests/golden/render-cases/lang-table-if/expected.md`, `tests/golden/render-cases/lang-table-if/options.json`, `tests/golden/render-cases/lang-table-if/template.md`, `tests/language/list-table-children.test.ts`
<!-- end generated scope -->
