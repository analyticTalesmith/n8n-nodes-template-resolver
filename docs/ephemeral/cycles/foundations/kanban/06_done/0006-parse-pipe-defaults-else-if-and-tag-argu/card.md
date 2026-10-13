# Parse pipe defaults, ELSE IF and tag arguments

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Three parsing defects. (1) A `??` default that contains a pipe, `${{x ?? "a|b"}}`, must yield the default `a|b` instead of splitting at the pipe and throwing an unknown-filter error. (2) `{{ELSE IF x}}` (two words) must be rejected with an error naming ELSEIF, not silently treated as a plain ELSE that drops the condition. (3) Closing and ELSE tags that carry stray arguments (`{{END_IF garbage}}`, `{{ELSE garbage}}`, `{{END_FOR junk}}`) must be rejected.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `pd-01` a ?? default holding a pipe inside quotes renders the default literally when the value is missing
- `contract` `pd-02` a pipe-bearing ?? default followed by a real filter still applies the filter to the result
- `contract` `pd-03` ELSE IF with a condition is a syntax error whose message says to use ELSEIF
- `contract` `pd-04` END and ELSE tags with trailing arguments are syntax errors


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change behavior outside the named defects
- edit or delete any existing test
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

none: no public interface changes.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `nodes/TemplateResolver/lexer.ts` | edit | template-resolver |
| `nodes/TemplateResolver/parser.ts` | edit | template-resolver |

Files scope: `nodes/TemplateResolver/lexer.ts`, `nodes/TemplateResolver/parser.ts`
<!-- end generated scope -->
