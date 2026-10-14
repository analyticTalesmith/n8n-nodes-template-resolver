# Serve render, validate, analyze and spec over HTTP

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

A stateless HTTP API over core using only node's http module, an OpenAPI document served and committed, and an end-to-end test that starts the server on an ephemeral port.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `ap-routes` POST /v1/render, /v1/validate, /v1/analyze and GET /v1/spec return the documented 200 bodies, and a template error is a 200 with ok false and located diagnostics
- `contract` `ap-errors` bad JSON, a missing or non-string template, a non-object data and bad option types return 400 invalid-request; unknown paths 404 not-found; wrong methods 405 method-not-allowed with Allow; bodies over maxBodyBytes 413 payload-too-large; a non-JSON POST content type 415 unsupported-media-type; every response is JSON
- `contract` `ap-limits` request limits can only lower the server limits and a request cannot raise them
- `contract` `oa-doc` GET /v1/openapi.json serves api/openapi.json byte for byte, it is OpenAPI 3.1, and its paths and methods equal the router table
- `contract` `e2-server` the end-to-end test listens on port 0 on 127.0.0.1, exercises every route over real HTTP with node's http client, and closes the server


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- add a runtime dependency
- listen on any host but 127.0.0.1 unless asked
- leave a server or socket open after a test


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the README card documents the surface.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

createServer(options) and listen helper from api/index.ts; the HTTP surface in design.md.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `api/index.ts` | add | none |
| `api/openapi.json` | add | none |
| `api/routes.ts` | add | none |
| `api/server.ts` | add | none |
| `x` | edit | none |

Files scope: `api/`
<!-- end generated scope -->
