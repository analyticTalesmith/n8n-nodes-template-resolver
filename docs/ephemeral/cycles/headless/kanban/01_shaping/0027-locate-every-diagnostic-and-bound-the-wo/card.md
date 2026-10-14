# Locate every diagnostic and bound the work with limits

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Every template error carries a code and the line and column of the node that failed, and the engine stops runaway work at configurable limits. This is the engine surface the structured render result, the API and the CLI report from.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `dg-syntax` syntax, missing-variable and unknown-filter errors carry the codes syntax-error, missing-variable and unknown-filter with the line and column of the failing tag or variable
- `contract` `dg-runtime` math, filter-parameter and type errors carry the line and column of the node that evaluates them, not a placeholder 1:1, and the code type-error
- `contract` `lm-iterations` more total FOR iterations than limits.maxIterations throws limit-iterations located at the loop
- `contract` `lm-output` output longer than limits.maxOutputChars throws limit-output
- `contract` `lm-depth` block nesting deeper than limits.maxDepth throws limit-depth located at the offending block
- `contract` `lm-defaults` DEFAULT_LIMITS is exported with maxIterations 10000, maxOutputChars 1000000 and maxDepth 32, a partial limits option keeps the other defaults, and a template under every limit renders as before


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change what any currently passing template renders
- add a runtime dependency
- import n8n or do I/O in core


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: no user-visible surface until the structured result card.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

TemplateError.code; resolveTemplate options.limits; DEFAULT_LIMITS (see docs/ephemeral/cycles/headless/design.md, engine surface).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/errors.ts` | edit | none |
| `core/src/expressions.ts` | edit | none |
| `core/src/filters.ts` | edit | none |
| `core/src/interpreter.ts` | edit | none |
| `core/src/parser.ts` | edit | none |
| `core/src/resolve.ts` | edit | none |
| `core/src/types.ts` | edit | none |

Files scope: `core/src/`
<!-- end generated scope -->
