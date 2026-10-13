# Add the golden-file test harness

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

A harness that runs every case folder under tests/golden/cases/<name>/ (template.md, data.json, optional options.json, and expected.md or expected-error.txt), compares the rendered output byte for byte, names the failing case and shows a first-difference excerpt, and rewrites the expected files when UPDATE_GOLDEN=1. Ship at least eight cases covering IF/ELSEIF, CASE, nested FOR, LIST, TABLE, filters, ?? defaults and an error case. The harness takes the render function as a parameter so later surfaces (API, CLI, node) can run the same cases.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `gf-01` the harness discovers every case folder and passes when output equals the expected file exactly
- `contract` `gf-02` a mismatch fails with the case name and the first differing line
- `contract` `gf-03` an expected-error.txt case passes when rendering throws a message containing that text
- `contract` `gf-04` UPDATE_GOLDEN=1 rewrites the expected files instead of failing
- `contract` `gf-05` the shipped suite holds at least eight cases and they all pass against the real resolver


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- edit or delete any existing test body
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

tests/golden/harness.ts exports runGoldenCases(casesDir, render, options).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/golden/golden.test.ts` | add | template-resolver |
| `tests/golden/harness.ts` | add | template-resolver |

Files scope: `tests/golden/`
<!-- end generated scope -->
