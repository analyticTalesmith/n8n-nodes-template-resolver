# Derive variable and filter usage from the AST

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Add analyze(template) to core, returning the variables a template reads (root name, full paths, where used: output, IF, ELSEIF, CASE, FOR source, LIST_ITEM, TABLE cells, filter arguments, comparison operands including the right side of contains) and the filters it applies, all derived from the parsed AST and expression tokens, not from regexes on the source. The node strict-mode pre-check uses it, replacing extractAllVariables. Loop item variables and @-metadata are not reported as inputs; a variable with a ?? default is reported as optional; NOT and other operator words are never variables. Remove the regex detection.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `an-01` analyze reports variables used in output tags, IF, ELSEIF, CASE, FOR sources, LIST_ITEM conditions and table cells
- `contract` `an-02` variables on either side of AND, OR and comparison operators, including the right side of contains, are reported
- `contract` `an-03` FOR item variables, @-metadata and operator words such as NOT are not reported as inputs
- `contract` `an-04` a variable with a ?? default is reported optional and the node strict mode accepts it unmapped
- `contract` `an-05` analyze lists every filter used with its name, and an unknown filter is reported as a diagnostic
- `contract` `an-06` strict mode no longer rejects a template whose only unmapped names are FOR item variables
- `contract` `an-07` the regex-based extractAllVariables no longer exists in core


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

New core export analyze(template: string): { variables: {name, paths, usedIn, optional}[], filters: {name, count}[], diagnostics }, exact shape fixed by the frozen tests.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/analyze.ts` | add | template-resolver |
| `core/src/index.ts` | edit | template-resolver |
| `n8n/TemplateResolver.node.ts` | edit | template-resolver |
| `core/src/utils.ts` | remove | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/index.ts`, `core/src/utils.ts`, `n8n/TemplateResolver.node.ts`
<!-- end generated scope -->
