# Restructure into a pure core and a thin n8n wrapper

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Move the resolver into core/src (lexer, parser, expressions, interpreter, filters, coercion, errors, types, utils and a resolve entry that exports resolveTemplate) and keep only the n8n node class, its json, icon and index in n8n/. Core imports nothing from n8n and does no I/O; the node imports core only through its public entry (decision: the node imports core directly). No behavior change: every pre-existing test passes with only its import specifiers changed. package.json n8n.nodes, tsconfig and jest config follow the new layout, and the build still produces the node entry.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `rs-01` no file under core/ imports n8n-workflow, any n8n package, or a Node I/O module (fs, net, http, child_process)
- `contract` `rs-02` the n8n wrapper imports the core only through core/src/index.ts, and core/src/index.ts exports resolveTemplate
- `contract` `rs-03` the pre-existing test file differs from its base version only in import and mock specifier lines
- `contract` `rs-04` the pre-existing suite passes with at least 446 passing tests and none failing
- `contract` `rs-05` the build succeeds and every path in package.json n8n.nodes exists afterwards


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

Core public entry core/src/index.ts exports the resolver surface the node and tests use today; resolveTemplate keeps its signature.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/coercion.ts` | add | template-resolver |
| `core/src/errors.ts` | add | template-resolver |
| `core/src/expressions.ts` | add | template-resolver |
| `core/src/filters.ts` | add | template-resolver |
| `core/src/index.ts` | add | template-resolver |
| `core/src/interpreter.ts` | add | template-resolver |
| `core/src/lexer.ts` | add | template-resolver |
| `core/src/parser.ts` | add | template-resolver |
| `core/src/resolve.ts` | add | template-resolver |
| `core/src/types.ts` | add | template-resolver |
| `core/src/utils.ts` | add | template-resolver |
| `n8n/TemplateResolver.node.json` | add | template-resolver |
| `n8n/TemplateResolver.node.ts` | add | template-resolver |
| `n8n/icoTemplateResolver.svg` | add | template-resolver |
| `n8n/index.ts` | add | template-resolver |
| `jest.config.js` | edit | template-resolver |
| `package.json` | edit | template-resolver |
| `tests/TemplateResolver.node.test.ts` | edit | template-resolver |
| `tsconfig.json` | edit | template-resolver |
| `nodes/TemplateResolver/TemplateResolver.node.json` | remove | template-resolver |
| `nodes/TemplateResolver/TemplateResolver.node.ts` | remove | template-resolver |
| `nodes/TemplateResolver/coercion.ts` | remove | template-resolver |
| `nodes/TemplateResolver/errors.ts` | remove | template-resolver |
| `nodes/TemplateResolver/expressions.ts` | remove | template-resolver |
| `nodes/TemplateResolver/filters.ts` | remove | template-resolver |
| `nodes/TemplateResolver/icoTemplateResolver.svg` | remove | template-resolver |
| `nodes/TemplateResolver/index.ts` | remove | template-resolver |
| `nodes/TemplateResolver/interpreter.ts` | remove | template-resolver |
| `nodes/TemplateResolver/lexer.ts` | remove | template-resolver |
| `nodes/TemplateResolver/parser.ts` | remove | template-resolver |
| `nodes/TemplateResolver/types.ts` | remove | template-resolver |
| `nodes/TemplateResolver/utils.ts` | remove | template-resolver |

Files scope: `core/`, `jest.config.js`, `n8n/`, `nodes/`, `package.json`, `tests/TemplateResolver.node.test.ts`, `tsconfig.json`
<!-- end generated scope -->
