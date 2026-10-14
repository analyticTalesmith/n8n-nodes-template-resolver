# Return a structured render result from core and the n8n node

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

render() returns {ok, output, messages, stats, diagnostics} and never throws for template or data problems; validate, spec and the estimator exist; analyze reports required and block counts; the n8n node renders through the structured result.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `rr-result` render returns ok, output, messages, stats (chars, estTokens, sectionsOmitted, iterations) and diagnostics; on a template or data error it does not throw, returns ok false, an empty output and the located error first in diagnostics
- `contract` `rr-validate` validate returns ok and diagnostics for syntax errors and unknown filters without needing data
- `contract` `rr-analyze` analyze variables carry required (the opposite of optional) and the result carries blocks, a count per block kind
- `contract` `rr-spec` spec lists blocks, filters, operators, limits and a version, and every filter the engine accepts appears in it
- `contract` `rr-estimator` estTokens is ceil(chars/4) by default and a tokenEstimator option replaces it
- `contract` `rr-compat` resolveTemplate still returns a string and throws, and limits in render options bound the render with their diagnostics
- `contract` `nd-output` the n8n node writes the render output to the configured field, and a failed render throws a node error whose message carries the first diagnostic with line and column
- `contract` `nd-nodeps` package.json declares no runtime dependencies, tsconfig builds api and cli folders, and package.json exposes the template-resolver bin
- `contract` `rr-robust` render and validate never throw for non-object data (null, array, string), cyclic data values or a cyclic value looped over in strict mode; each returns ok false with a diagnostic


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change what resolveTemplate returns for any passing template
- add a runtime dependency
- import n8n or do I/O in core


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the README card documents the surface.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

render, validate, spec, estimateTokens, RenderOptions, RenderResult, Diagnostic exported from core (see design.md).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/headless/render-robust.test.ts` | add | none |
| `core/src/analyze.ts` | edit | none |
| `core/src/estimate.ts` | edit | none |
| `core/src/filters.ts` | edit | none |
| `core/src/index.ts` | edit | none |
| `core/src/interpreter.ts` | edit | none |
| `core/src/render.ts` | edit | none |
| `core/src/spec.ts` | edit | none |
| `docs/ephemeral/cycles/headless/test-plan.md` | edit | none |
| `docs/ephemeral/work/0028-return-a-structured-render-result-from-c/spec.md` | edit | none |
| `n8n/TemplateResolver.node.ts` | edit | none |
| `package.json` | edit | none |
| `tsconfig.json` | edit | none |

Files scope: `core/src/`, `docs/ephemeral/cycles/headless/test-plan.md`, `docs/ephemeral/work/0028-return-a-structured-render-result-from-c`, `n8n/`, `package.json`, `tests/headless`, `tsconfig.json`
<!-- end generated scope -->
