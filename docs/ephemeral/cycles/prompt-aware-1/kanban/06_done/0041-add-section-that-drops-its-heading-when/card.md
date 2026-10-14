# Add SECTION that drops its heading when empty

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

SECTION writes a heading and its body and drops itself, heading and spacing included, when its body renders empty; omissions are counted in stats.sectionsOmitted.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `sc-heading` a SECTION with a quoted or variable title writes hashes, a space and the title, a blank line, the body with leading and trailing blank lines trimmed and one trailing line break, and consecutive sections are separated by one blank line
- `contract` `sc-level` level defaults to 2, is clamped to 1 through 6, and a non-integer level is a type-error located at the SECTION tag
- `contract` `sc-empty` a SECTION whose rendered body is only whitespace produces no output at all, heading and spacing included, and render stats count it in sectionsOmitted, also inside FOR loops and nested sections
- `contract` `sc-keep` skip_empty=false keeps the heading of an empty section and does not count an omission
- `contract` `sc-errors` an empty or missing title is a type-error, an unclosed SECTION is a syntax-error at its tag, and SECTION counts toward maxDepth
- `contract` `sc-analyze` analyze counts SECTION in blocks, reads variables in the title and the body, and spec lists SECTION and END_SECTION


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change any existing test expectation
- change output for templates without SECTION
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the surfaces card documents it.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

the SECTION block; RenderResult.stats.sectionsOmitted (see the prompt-aware contract).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/analyze.ts` | edit | none |
| `core/src/interpreter.ts` | edit | none |
| `core/src/lexer.ts` | edit | none |
| `core/src/parser.ts` | edit | none |
| `core/src/render.ts` | edit | none |
| `core/src/spec.ts` | edit | none |
| `core/src/types.ts` | edit | none |
| `core/src/whitespace.ts` | edit | none |

Files scope: `core/src/`
<!-- end generated scope -->
