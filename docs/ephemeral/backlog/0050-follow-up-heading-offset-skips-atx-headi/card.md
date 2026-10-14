# Follow-up: heading_offset skips ATX headings indented by one to three spaces, though its own fence detection honours tha

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 0042-add-the-auto-sized-fence-heading-offset
Finding: f7 (drift)
Serves: c4: c4 says heading_offset shifts every ATX heading line. In CommonMark an ATX heading may be indented by up to three spaces, and the filter's own fence detection accepts that indent (/^ {0,3}(`{3,}|~{3,})/). The heading rewrite only matches /^(#{1,6}) /, so a drafted value with ' # Notes' or ' ## Detail' keeps its level while the headings around it shift. The resulting document hierarchy is wrong (a sub-heading can end up above its parent). A tab after the hashes ('# Title') is skipped the same way.
Reproduction: render('${{ v | heading_offset=1 }}', { v: ' # indented ## three # top' }, { standaloneLines: false }).output is ' # indented ## three ## top'. The expected output is ' ## indented ### three ## top'. Smallest fix: match /^( {0,3})(#{1,6})(?=[ ])/ in the rewrite and keep the captured indent.
Evidence: code:core/src/filters.ts:283
Evidence: code:core/src/filters.ts:297
Evidence: doc:docs/living/architecture/prompt-aware-contract.md

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

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
