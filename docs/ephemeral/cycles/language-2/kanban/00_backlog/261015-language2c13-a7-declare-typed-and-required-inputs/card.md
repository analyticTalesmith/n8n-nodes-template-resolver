# Declare typed and required inputs

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Declare typed and required inputs.

## Must-haves

- `contract` `in-declare` inside any block, declared twice, an unknown type, an unknown argument or an invalid name is a `syntax-error` located at the tag, in every mode.
- `contract` `in-type` a present value of the wrong type is a `type-error` located at the INPUT; the check uses the coercion rules the language already uses (a numeric text satisfies `number`, a comma text or JSON array text satisfies `array`, `yes`/`no`/`1`/`0` satisfy `boolean`; arrays and objects do not satisfy `string`); the value is checked, never rewritten (question 3); null or missing skips the check.
- `contract` `in-required` a required input that is missing or null is a `missing-variable` error located at the INPUT in strict and lenient mode, with the message "Required input 'x' is missing"; an empty string is present; a declared required input that no one reads is still required.
- `contract` `in-optional` a declared input without `required` that is missing reads as null in strict mode too (question 2), and a FOR over it iterates nothing (its ELSE renders); undeclared variables keep the strict rule.
- `contract` `in-analyze` declared inputs appear in analyze with `declared: true` and `typeHint`, and their `optional` is taken from the declaration (`optional` is true without `required`, whatever the reads), so `required` keeps its documented meaning `!optional`; the new fields are present only on declared inputs, so every existing analyze assertion holds; one that is never read has usage kind `input` only and `validate` warns about it as `analysis-warning`.
- `contract` `in-node` the n8n node's strict check (it uses `!optional`) names an unmapped declared required input and does not throw for an unmapped declared optional input; in lenient mode the node does not fill a declared required input with `""`, and its missing-variable error comes from render; an explicitly mapped empty string is present.
- `contract` `in-openapi` the OpenAPI analysis schema lists `declared` and `typeHint`, and the analyze route returns them.
- `contract` `in-ws` INPUT joins the standalone set and takes trim markers.
- `contract` `in-spec` `spec().blocks` lists INPUT with no `closes`; the derived surfaces test passes without edits.
- `contract` `in-compat` the full suite passes; no existing test file changes.

## Acceptance criteria

- in-declare: inside any block, declared twice, an unknown type, an unknown argument or an invalid name is a `syntax-error` located at the tag, in every mode.
- in-type: a present value of the wrong type is a `type-error` located at the INPUT; the check uses the coercion rules the language already uses (a numeric text satisfies `number`, a comma text or JSON array text satisfies `array`, `yes`/`no`/`1`/`0` satisfy `boolean`; arrays and objects do not satisfy `string`); the value is checked, never rewritten (question 3); null or missing skips the check.
- in-required: a required input that is missing or null is a `missing-variable` error located at the INPUT in strict and lenient mode, with the message "Required input 'x' is missing"; an empty string is present; a declared required input that no one reads is still required.
- in-optional: a declared input without `required` that is missing reads as null in strict mode too (question 2), and a FOR over it iterates nothing (its ELSE renders); undeclared variables keep the strict rule.
- in-analyze: declared inputs appear in analyze with `declared: true` and `typeHint`, and their `optional` is taken from the declaration (`optional` is true without `required`, whatever the reads), so `required` keeps its documented meaning `!optional`; the new fields are present only on declared inputs, so every existing analyze assertion holds; one that is never read has usage kind `input` only and `validate` warns about it as `analysis-warning`.
- in-node: the n8n node's strict check (it uses `!optional`) names an unmapped declared required input and does not throw for an unmapped declared optional input; in lenient mode the node does not fill a declared required input with `""`, and its missing-variable error comes from render; an explicitly mapped empty string is present.
- in-openapi: the OpenAPI analysis schema lists `declared` and `typeHint`, and the analyze route returns them.
- in-ws: INPUT joins the standalone set and takes trim markers.
- in-spec: `spec().blocks` lists INPUT with no `closes`; the derived surfaces test passes without edits.
- in-compat: the full suite passes; no existing test file changes.

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
| `core/src/inputs.ts` | add | template-resolver |
| `n8n-workflow` | add | template-resolver |
| `tests/headless/node.test.ts` | add | template-resolver |
| `tests/language/input.test.ts` | add | template-resolver |
| `api/openapi.json` | edit | template-resolver |
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/errors.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/lexer.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `core/src/types.ts` | edit | template-resolver |
| `core/src/whitespace.ts` | edit | template-resolver |
| `n8n/TemplateResolver.node.ts` | edit | template-resolver |

Files scope: `api/openapi.json`, `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/inputs.ts`, `core/src/interpreter.ts`, `core/src/lexer.ts`, `core/src/parser.ts`, `core/src/spec.ts`, `core/src/types.ts`, `core/src/whitespace.ts`, `n8n-workflow`, `n8n/TemplateResolver.node.ts`, `tests/headless/node.test.ts`, `tests/language/input.test.ts`
<!-- end generated scope -->
