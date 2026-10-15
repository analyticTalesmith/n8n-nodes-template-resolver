# Pass partials in the render options and expose them in the API, CLI and OpenAPI

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Pass partials in the render options and expose them in the API, CLI and OpenAPI.

## Must-haves

- `contract` `pt-option` `render`, `validate` and `analyze` accept `partials`; partial texts are lexed with the same whitespace options as the template; CALL resolves into them; partials are not interpreted as output and unreferenced ones cost only parse time.
- `contract` `pt-only` text, a variable, a block other than DEFINE or any other tag in a partial is a `syntax-error` whose message names the partial and whose line and column are inside that partial's text.
- `contract` `pt-dup` a name defined twice in one partial, in two partials or in a partial and the template is a `syntax-error` naming both places.
- `contract` `pt-nodes` partial nodes count toward `maxNodes` (one shared counter across the template and every partial); crossing it is `limit-nodes` located in the partial that crossed it and named; the same in validate and analyze.
- `contract` `pt-validate` without a `partials` option an unknown CALL is an `analysis-warning`; with the option given (even `{}`) it is an error; render without partials is always an error.
- `contract` `pt-depth` mutual recursion across two partials is `limit-depth`; fan-out across partials hits `limit-iterations` and `limit-output` as in `mc-iterations` and `mc-output`; the same templates through `validate` and `analyze` return promptly (no expansion).
- `contract` `pt-source` every node knows its source (the template or a partial's name); a runtime error inside a macro body defined in a partial names that partial in its message, and `analyze`/`validate` findings in a partial do too.
- `contract` `pt-names` partial names `__proto__`, `constructor` are ordinary labels; a partial map built from JSON with those keys never touches a prototype.
- `contract` `pt-api` `options.partials` on `/v1/render`, `/v1/validate` and `/v1/analyze`; a non-object or a non-string entry is 400 `invalid-request` naming the key; partial nodes count against the server's `maxNodes`.
- `contract` `pt-cli` `--partials <file.json>` on `render`, `validate` and `analyze`; unreadable or invalid JSON or a non-object-of-strings is exit 2; usage text lists the flag.
- `contract` `pt-openapi` the OpenAPI document describes `options.partials` on the three routes.
- `contract` `pt-spec` `spec().options` lists `partials`.
- `contract` `pt-compat` the full suite passes; no existing test file changes.

## Acceptance criteria

- pt-option: `render`, `validate` and `analyze` accept `partials`; partial texts are lexed with the same whitespace options as the template; CALL resolves into them; partials are not interpreted as output and unreferenced ones cost only parse time.
- pt-only: text, a variable, a block other than DEFINE or any other tag in a partial is a `syntax-error` whose message names the partial and whose line and column are inside that partial's text.
- pt-dup: a name defined twice in one partial, in two partials or in a partial and the template is a `syntax-error` naming both places.
- pt-nodes: partial nodes count toward `maxNodes` (one shared counter across the template and every partial); crossing it is `limit-nodes` located in the partial that crossed it and named; the same in validate and analyze.
- pt-validate: without a `partials` option an unknown CALL is an `analysis-warning`; with the option given (even `{}`) it is an error; render without partials is always an error.
- pt-depth: mutual recursion across two partials is `limit-depth`; fan-out across partials hits `limit-iterations` and `limit-output` as in `mc-iterations` and `mc-output`; the same templates through `validate` and `analyze` return promptly (no expansion).
- pt-source: every node knows its source (the template or a partial's name); a runtime error inside a macro body defined in a partial names that partial in its message, and `analyze`/`validate` findings in a partial do too.
- pt-names: partial names `__proto__`, `constructor` are ordinary labels; a partial map built from JSON with those keys never touches a prototype.
- pt-api: `options.partials` on `/v1/render`, `/v1/validate` and `/v1/analyze`; a non-object or a non-string entry is 400 `invalid-request` naming the key; partial nodes count against the server's `maxNodes`.
- pt-cli: `--partials <file.json>` on `render`, `validate` and `analyze`; unreadable or invalid JSON or a non-object-of-strings is exit 2; usage text lists the flag.
- pt-openapi: the OpenAPI document describes `options.partials` on the three routes.
- pt-spec: `spec().options` lists `partials`.
- pt-compat: the full suite passes; no existing test file changes.

## Must-nots

- change any existing test expectation other than the one named amendment (if any)
- add a runtime dependency
- evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- let an unknown name or bad argument pass in lenient mode (ADR 0003)

## Context links

- [Language contract](../../../../../../living/architecture/language-contract.md)
- [Unknown names are errors (ADR 0003)](../../../../../../living/decisions/adr/0003-unknown-names-are-always-errors.md)

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter, or the root README.md), or give user_docs_waiver, one line with the reason none changes. A card that changes only documents needs nothing, and the root README.md counts as user facing without a tag. If no user can see it, write `none`. -->

## Interface contract

See the plan section for this card in docs/ephemeral/research/language-2-plan.md (syntax settled here, files, risks); the criteria above are the contract.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `options.json` | add | template-resolver |
| `resolveTemplate` | add | template-resolver |
| `tests/golden/render-cases/lang-partials/data.json` | add | template-resolver |
| `tests/golden/render-cases/lang-partials/expected.md` | add | template-resolver |
| `tests/golden/render-cases/lang-partials/options.json` | add | template-resolver |
| `tests/golden/render-cases/lang-partials/template.md` | add | template-resolver |
| `tests/language/partials.test.ts` | add | template-resolver |
| `api/openapi.json` | edit | template-resolver |
| `api/routes.ts` | edit | template-resolver |
| `cli/main.ts` | edit | template-resolver |
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/index.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/macros.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/render.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `core/src/types.ts` | edit | template-resolver |

Files scope: `api/openapi.json`, `api/routes.ts`, `cli/main.ts`, `core/src/analyze.ts`, `core/src/index.ts`, `core/src/interpreter.ts`, `core/src/macros.ts`, `core/src/parser.ts`, `core/src/render.ts`, `core/src/spec.ts`, `core/src/types.ts`, `options.json`, `resolveTemplate`, `tests/golden/render-cases/lang-partials/data.json`, `tests/golden/render-cases/lang-partials/expected.md`, `tests/golden/render-cases/lang-partials/options.json`, `tests/golden/render-cases/lang-partials/template.md`, `tests/language/partials.test.ts`
<!-- end generated scope -->
