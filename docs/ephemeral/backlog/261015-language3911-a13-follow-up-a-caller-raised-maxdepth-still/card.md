# Follow-up: A caller-raised maxDepth still lets deep nesting overflow the stack in render and analyze

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Source card: 261015-language3911-a5-bound-the-total-node-count-of-a-template
Finding: f4 (drift)
Serves: c2: Nesting is bounded only by maxDepth, and the spec decision says a caller maxDepth is obeyed exactly. A core caller passing limits { maxDepth: 100000 } with about 19000 nested IF blocks stays under maxNodes 20000. The parser and interpreter then recurse several frames per level and can throw a RangeError, which render rethrows because it only catches TemplateError. That breaks 'render never throws' and the 'no stack overflow in any mode' wording. The API is protected by the server ceiling, so this concerns only direct core and CLI --max-depth callers. Recorded for the lead as a possible follow-up ticket (a hard internal nesting cap, or turning RangeError into a coded limit-depth). It is not a fix request for this card.
Reproduction: render('{{IF t}}'.repeat(19000) + 'x' + '{{END_IF}}'.repeat(19000), {t:'x'}, { limits: { maxDepth: 100000 } }) can throw a RangeError instead of returning ok or a coded diagnostic. No frozen test covers a raised maxDepth.
Evidence: code:core/src/analyze.ts:91
Evidence: code:core/src/render.ts:76
Evidence: test:ln-elseif: [render-strict] 5000 nested IF blocks give a coded limit-depth

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["node", "node_modules/jest/bin/jest.js", "--json", "--runTestsByPath", "src/x.test.ts"]`, or `["node", "node_modules/vitest/vitest.mjs", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (a gate is an argv started without a shell, so it names a node script and never a launcher such as a .cmd file) (the report file is rewritten by every run). Test-first is proved on the gate command, or for a card that lists only `gates` (gate null) on its first selected gates entry, and `core/scripts/red-evidence.mjs` writes the log to `docs/ephemeral/work/<card>/red-evidence.md` (the work folder, not the card folder). With jest give the test path as `--runTestsByPath src/x.test.ts` before any reporter option such as `--reporters=...`: an option that takes a list, placed before the path, reads the path as another reporter. -->

## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, so count the folders from it up to docs/: a backlog card (docs/ephemeral/backlog/<id>/) writes [Glossary](../../../living/domain/glossary.md); a cycle card (docs/ephemeral/cycles/<cycle>/kanban/<column>/<id>/) writes [Glossary](../../../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter, or the root README.md), or give user_docs_waiver, one line with the reason none changes. A card that changes only documents needs nothing, and the root README.md counts as user facing without a tag. If no user can see it, write `none`. -->

## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |

Files scope: none
<!-- end generated scope -->
