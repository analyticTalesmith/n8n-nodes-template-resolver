# Follow-up: Pre-existing tests passing cannot be confirmed from the packet; END_* tags beyond the frozen examples now rej

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 0006-parse-pipe-defaults-else-if-and-tag-argu
Finding: f3 (drift)
Serves: cycle-goal: The packet includes no pre-existing test files and no CI result. The new lexer check rejects arguments on every END_* tag (END_WHEN, END_DEFAULT, END_LIST_ITEM, END_HEADER, END_ROW, END_TABLE, END_LIST, END_CASE), not only END_IF and END_FOR. That matches the card's wording ('closing and ELSE tags'), so it is in scope. But if any existing test or golden file writes a closing tag with a trailing word, that test would now fail. This is noted for the lead to confirm with a green test run; it is not a fix request.
Reproduction: Run the full jest suite at head 1c62228 and search the existing tests and fixtures for /\{\{END_[A-Z_]+\s+\S/ or /\{\{ELSE\s+\S/.
Evidence: diff:nodes/TemplateResolver/lexer.ts
Evidence: code:nodes/TemplateResolver/lexer.ts:246-262

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |

Files scope: none
<!-- end generated scope -->
