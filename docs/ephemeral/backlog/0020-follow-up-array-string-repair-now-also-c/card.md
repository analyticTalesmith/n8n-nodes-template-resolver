# Follow-up: Array-string repair now also collapses doubled commas between elements, which changes FOR/index results for i

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 0007-string-inputs-keep-commas-and-index-like
Finding: f3 (drift)
Serves: m1: At base, tryCoerceToArray stripped only ',]' and '[,' from a '['-prefixed string. '[1,,2]' therefore failed JSON.parse and fell back to comma splitting, which gives string pieces. At head, repairStructuralCommas also collapses the doubled comma, so JSON.parse succeeds and gives the numbers [1,2]. Rendered FOR output is the same. Type-sensitive checks on items, or JSON output of an indexed sub-array, could differ. This is a small widening beyond the named defects. It is not a criterion failure.
Reproduction: Run resolveTemplate('{{FOR a AS x}}{{IF x isNumber}}N{{ELSE}}S{{END_IF}}{{END_FOR}}', new Map([['a','[1,,2]']]), {strictMode:false}) at base and at head, and compare. The results differ only if isNumber distinguishes a numeric string from a number.
Evidence: diff:nodes/TemplateResolver/coercion.ts
Evidence: doc:docs/living/architecture/modules/template-resolver.md

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
