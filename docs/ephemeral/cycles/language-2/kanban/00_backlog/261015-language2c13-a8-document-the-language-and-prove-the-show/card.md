# Document the language and prove the showcase

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Document the language and prove the showcase.

## Must-haves

- `contract` `ld2-spec` the derived surfaces test covers every lexer keyword; every new construct and option has a spec() entry and a README mention.
- `contract` `ld2-readme` the README has one section per new construct (FOR window and ELSE, pairs and `@parent`, LIST and TABLE children, SET, INPUT, DEFINE/CALL, partials, `--partials`, `options.partials`) with examples whose templates the test renders and compares verbatim, as the filters showcase does.
- `contract` `ld2-showcase` the golden case `lang-seo-brief` (template, data, options with partials, expected) renders identically through `render`, the CLI (`--partials` file written by the test) and the API; CRLF checkout safe.
- `contract` `ld2-changelog` the changelog lists the constructs and the three behaviour changes (FOR arguments, table-cell pipes after an even backslash run, inherited path members).
- `contract` `ld2-openapi` the OpenAPI document's analysis schema describes the usage kinds, the `macros` field and `declared`/`typeHint`, its block-name and standalone-lines descriptions name DEFINE, SET, INPUT and CALL, and its `usedIn` description names every kind of the `UsageKind` union (a test compares them).
- `contract` `ld2-docs` the language contract, the template-resolver, api and cli module pages, the headless contract and ADR 0007 match the code; each new rule of section C appears in the contract with its error behaviour.
- `contract` `ld2-compat` the full suite passes, `tests/promptaware/docs.test.ts` included.

## Acceptance criteria

- ld2-spec: the derived surfaces test covers every lexer keyword; every new construct and option has a spec() entry and a README mention.
- ld2-readme: the README has one section per new construct (FOR window and ELSE, pairs and `@parent`, LIST and TABLE children, SET, INPUT, DEFINE/CALL, partials, `--partials`, `options.partials`) with examples whose templates the test renders and compares verbatim, as the filters showcase does.
- ld2-showcase: the golden case `lang-seo-brief` (template, data, options with partials, expected) renders identically through `render`, the CLI (`--partials` file written by the test) and the API; CRLF checkout safe.
- ld2-changelog: the changelog lists the constructs and the three behaviour changes (FOR arguments, table-cell pipes after an even backslash run, inherited path members).
- ld2-openapi: the OpenAPI document's analysis schema describes the usage kinds, the `macros` field and `declared`/`typeHint`, its block-name and standalone-lines descriptions name DEFINE, SET, INPUT and CALL, and its `usedIn` description names every kind of the `UsageKind` union (a test compares them).
- ld2-docs: the language contract, the template-resolver, api and cli module pages, the headless contract and ADR 0007 match the code; each new rule of section C appears in the contract with its error behaviour.
- ld2-compat: the full suite passes, `tests/promptaware/docs.test.ts` included.

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
| `tests/golden/render-cases/lang-seo-brief/data.json` | add | template-resolver |
| `tests/golden/render-cases/lang-seo-brief/expected.md` | add | template-resolver |
| `tests/golden/render-cases/lang-seo-brief/options.json` | add | template-resolver |
| `tests/golden/render-cases/lang-seo-brief/template.md` | add | template-resolver |
| `tests/language/surfaces-language-2.test.ts` | add | template-resolver |
| `README.md` | edit | template-resolver |
| `api/openapi.json` | edit | template-resolver |
| `changelog.md` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `ld2-spec` | edit | template-resolver |
| `spec().version` | edit | template-resolver |

Files scope: `README.md`, `api/openapi.json`, `changelog.md`, `core/src/spec.ts`, `ld2-spec`, `spec().version`, `tests/golden/render-cases/lang-seo-brief/data.json`, `tests/golden/render-cases/lang-seo-brief/expected.md`, `tests/golden/render-cases/lang-seo-brief/options.json`, `tests/golden/render-cases/lang-seo-brief/template.md`, `tests/language/surfaces-language-2.test.ts`
<!-- end generated scope -->
