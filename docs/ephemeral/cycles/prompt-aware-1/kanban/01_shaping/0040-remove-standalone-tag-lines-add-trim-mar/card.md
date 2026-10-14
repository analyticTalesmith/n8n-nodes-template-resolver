# Remove standalone tag lines, add trim markers, RAW and brace escaping

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Lines that hold only a block tag vanish from the output, '-' markers trim adjacent whitespace, RAW blocks and the escaped opening brace pair output literal braces, all as the contract says. Existing templates keep their old spacing through resolveTemplate.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `ws-standalone` with standaloneLines on, a line holding only whitespace and block tags (IF, ELSEIF, ELSE, END_IF, CASE, WHEN, END_WHEN, DEFAULT, END_DEFAULT, END_CASE, FOR, END_FOR and comments) disappears with its line break, while a line that also holds text or a variable, and LIST, LIST_ITEM, TABLE, HEADER and ROW tags, keep their old spacing
- `contract` `ws-trim` a minus marker after the opening braces trims all whitespace before the tag and a minus marker before the closing braces trims all whitespace after it, both on every block tag and comment, with the standalone option on or off
- `contract` `ws-option` render defaults standaloneLines to true, resolveTemplate defaults it to false so the whole existing suite is unchanged, and an explicit option wins in both
- `contract` `rw-raw` RAW and END_RAW output their content literally (no tags, variables or comments), keep spaces, turn CRLF into LF, work inside FOR and untaken IF branches, and an unclosed RAW is a syntax-error located at the RAW tag
- `contract` `rw-escape` a backslash directly before the opening brace pair outputs the brace pair literally and consumes the backslash; a backslash elsewhere is text; two backslashes before the pair give a literal backslash and an active tag
- `contract` `rw-spec` spec lists RAW and its closer and the standaloneLines option


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change any existing test expectation
- change what resolveTemplate renders by default
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the surfaces card documents it.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

RenderOptions.standaloneLines; resolveTemplate options.standaloneLines; RAW block; the escaped brace pair (see docs/living/architecture/prompt-aware-contract.md).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/interpreter.ts` | edit | none |
| `core/src/lexer.ts` | edit | none |
| `core/src/parser.ts` | edit | none |
| `core/src/render.ts` | edit | none |
| `core/src/resolve.ts` | edit | none |
| `core/src/spec.ts` | edit | none |
| `core/src/types.ts` | edit | none |

Files scope: `core/src/`
<!-- end generated scope -->
