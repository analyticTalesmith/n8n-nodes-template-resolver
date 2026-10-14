# Expose the prompt-aware options on the api, cli, node and in the docs

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

The API, CLI and n8n node accept the standaloneLines option, the OpenAPI document, README, changelog and living documents describe every new construct, and golden cases prove a realistic prompt end to end.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `sf-api` POST /v1/render accepts options.standaloneLines (boolean, a non-boolean is 400 invalid-request), the OpenAPI document describes it, and the served document still equals the committed file
- `contract` `sf-cli` render accepts --no-standalone-lines and --standalone-lines, giving both together is a usage error exit 2, and the usage text lists them
- `contract` `sf-node` the node has a boolean option for standalone lines that defaults to true and reaches render
- `contract` `sf-golden` golden cases rendered through render cover a prompt template using sections, fences, offset headings, escaped values, RAW and trim markers, with standalone lines on and off
- `contract` `sf-docs` the README documents the whitespace rule and trim markers, RAW and brace escaping, SECTION, FENCE, heading_offset and the escape modes with examples, and names the standalone option on every surface
- `contract` `sf-living` the cycle deltas turn the prompt-aware contract and the module documents into built documents after the merge


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change any existing test expectation
- document what the code does not do
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

README.md and changelog.md are the user documentation this card writes.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

options.standaloneLines (API), --standalone-lines and --no-standalone-lines (CLI), a node boolean option.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `README.md` | edit | none |
| `api/openapi.json` | edit | none |
| `api/routes.ts` | edit | none |
| `changelog.md` | edit | none |
| `cli/main.ts` | edit | none |
| `docs/living/architecture/modules/api.md` | edit | none |
| `docs/living/architecture/modules/cli.md` | edit | none |
| `docs/living/architecture/modules/template-resolver.md` | edit | none |
| `docs/living/architecture/prompt-aware-contract.md` | edit | none |
| `n8n/TemplateResolver.node.ts` | edit | none |
| `tests/promptaware/surfaces.test.ts` | edit | none |

Files scope: `README.md`, `api/`, `changelog.md`, `cli/`, `docs/living/`, `n8n/`, `tests/golden/`, `tests/promptaware`
<!-- end generated scope -->
