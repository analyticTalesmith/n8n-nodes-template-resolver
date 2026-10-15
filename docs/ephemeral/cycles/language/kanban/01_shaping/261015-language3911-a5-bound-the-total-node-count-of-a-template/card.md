# Bound the total node count of a template

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

A template can no longer be made arbitrarily large: limits.maxNodes (default 20000) is counted at parse and an oversize or very long ELSEIF chain fails with a located limit-nodes diagnostic in render, validate and analyze, on the API and CLI too.

## Must-haves

- `contract` `ln-limit` limits.maxNodes (default 20000) is counted at parse; exceeding it is a limit-nodes diagnostic located at the node that crossed it, in render, validate and analyze
- `contract` `ln-elseif` an ELSEIF chain of 20000 branches gives limit-nodes, not a RangeError, and no stack overflow occurs for deep or long input in any mode
- `contract` `ln-surfaces` the API accepts and lowers options.limits.maxNodes, the CLI takes --max-nodes, and the OpenAPI Limits schema lists it
- `contract` `ln-analyze` analyze applies the caller limits, else the defaults, and no longer throws limit-depth for nesting beyond 32 when the caller did not ask for that limit

## Acceptance criteria

- ln-limit: limits.maxNodes (default 20000) is counted at parse; exceeding it is a limit-nodes diagnostic located at the node that crossed it, in render, validate and analyze
- ln-elseif: an ELSEIF chain of 20000 branches gives limit-nodes, not a RangeError, and no stack overflow occurs for deep or long input in any mode
- ln-surfaces: the API accepts and lowers options.limits.maxNodes, the CLI takes --max-nodes, and the OpenAPI Limits schema lists it
- ln-analyze: analyze applies the caller limits, else the defaults, and no longer throws limit-depth for nesting beyond 32 when the caller did not ask for that limit

## Must-nots

- change any existing test expectation other than the one named amendment (if any)
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Context links

- [Template resolver module](../../../../../../living/architecture/modules/template-resolver.md)
- [Unknown names are errors (ADR 0003)](../../../../../../living/decisions/adr/0003-unknown-names-are-always-errors.md)
- [Language contract](../../../../../../living/architecture/language-contract.md)

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter, or the root README.md), or give user_docs_waiver, one line with the reason none changes. A card that changes only documents needs nothing, and the root README.md counts as user facing without a tag. If no user can see it, write `none`. -->

## Interface contract

types.ts: Limits gains maxNodes (DEFAULT_LIMITS.maxNodes = 20000); errors.ts gains the code limit-nodes. CLI: --max-nodes <n>. API: options.limits.maxNodes. tests/headless/spec.test.ts: the one named amendment, the limits fixture gains maxNodes.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/language/limits-nodes.test.ts` | add | api, cli, template-resolver |
| `api/openapi.json` | edit | api, cli, template-resolver |
| `api/routes.ts` | edit | api, cli, template-resolver |
| `cli/main.ts` | edit | api, cli, template-resolver |
| `core/src/analyze.ts` | edit | api, cli, template-resolver |
| `core/src/errors.ts` | edit | api, cli, template-resolver |
| `core/src/interpreter.ts` | edit | api, cli, template-resolver |
| `core/src/parser.ts` | edit | api, cli, template-resolver |
| `core/src/render.ts` | edit | api, cli, template-resolver |
| `core/src/resolve.ts` | edit | api, cli, template-resolver |
| `core/src/types.ts` | edit | api, cli, template-resolver |
| `tests/headless/spec.test.ts` | edit | api, cli, template-resolver |

Files scope: `api/openapi.json`, `api/routes.ts`, `cli/main.ts`, `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/render.ts`, `core/src/resolve.ts`, `core/src/types.ts`, `tests/headless/spec.test.ts`, `tests/language/limits-nodes.test.ts`
<!-- end generated scope -->
