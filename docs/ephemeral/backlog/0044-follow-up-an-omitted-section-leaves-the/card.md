# Follow-up: An omitted section leaves the template's blank lines from both sides, so its neighbours end up separated by t

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 0041-add-section-that-drops-its-heading-when
Finding: f1 (drift)
Serves: card-goal: The goal-critical question asks whether an empty section leaves no stray blank lines. Take the usual prompt layout of sections separated by one blank line: when the middle section is empty, its own tag lines vanish but the blank line before it and the blank line after it both remain. The surviving sections are then separated by two blank lines, not one, so the omission leaves visible spacing behind. The same happens between paragraphs and in a FOR loop whose iterations are separated by a blank line.
Reproduction: render('{{SECTION "A"}} a {{END_SECTION}} {{SECTION "B"}} {{END_SECTION}} {{SECTION "C"}} c {{END_SECTION}} ', {}, {standaloneLines:true}).output is '## A a ## C c ' (two blank lines between A and C). The same template with standaloneLines:false gives '## A a ## C c '. render('p1 {{SECTION "B"}} ${{x}} {{END_SECTION}} p2 ', {x:''}, {standaloneLines:true}).output is 'p1 p2 '. The frozen tests only cover omitted sections with no surrounding blank lines, so they do not catch this. Smallest fix: when skip_empty drops a section, also drop one blank line that the template holds right after it, by collapsing the line break that follows the omitted section's standalone END_SECTION line, so that two neighbours never get more blank lines between them than the template held between any one pair. Alternatively, have the lead record in the contract that the doubled blank line is accepted.
Evidence: code:core/src/interpreter.ts:340
Evidence: doc:docs/living/architecture/prompt-aware-contract.md
Evidence: test:sc-empty: own-line tags around an empty body, standaloneLines true

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
