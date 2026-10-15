---
type: review-packet
card: 261015-language3911-a5-bound-the-total-node-count-of-a-template
tier: product
built_at: 2026-10-15T03:42:56.844Z
base: f4e552a71ebe770925d1bd5eb5a33fdaf91c1974
head: bde45031262c225bcc5964e05620bd7d4e9cce30
read_at: bde45031262c225bcc5964e05620bd7d4e9cce30
frozen: true
brief_sha256: af657247650903bd788ed4119535864dcd3dce3db945023063242e849e7c9b6a
manifest_sha256: d385e855723f85b089d9273f82a97e34a8d0ddeb664ceb7f08d3ce3118de6613
criteria_sha256: 9ef6068d08ecf5affc66afba545ad0fbb5f17d9ed261f488b456aa01b444c0ce
scope_sha256: 6d192b40847d2b0e8bff5ba737213b31ebc34bca51a57afb752545612e7f2f99
diff_sha256: 7b7ef6f980a12f0dcb77701f8331d9b89d0b03be9150c20390c23ea586c7ae61
omitted_paths: 22
criteria_count: 4
must_not_count: 4
---

# Review packet: 261015-language3911-a5-bound-the-total-node-count-of-a-template

Manifest amended after the freeze at 2026-10-15T03:41:15.366Z by build-lead: pre-base stubs and fixture edits are done; the node limit deltas are recorded for the living documents (add +docs/ephemeral/cycles/language/deltas/node-limit-1.md, add +docs/ephemeral/cycles/language/deltas/node-limit-2.md, add +docs/ephemeral/cycles/language/deltas/node-limit-3.md, add +docs/ephemeral/cycles/language/deltas/node-limit-4.md, edit -core/src/errors.ts, edit -tests/headless/spec.test.ts, scope +docs/ephemeral/cycles/language/deltas)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: a template can no longer be made arbitrarily large: limits.maxNodes (default 20000) is counted at parse, and an oversize template or a very long ELSEIF chain fails with a located limit-nodes diagnostic in render, validate and analyze, on the API and the CLI too; analyze applies the caller's limits.

### Criteria

- c1 (verify: test): ln-limit: limits.maxNodes (default 20000) is counted at parse; exceeding it is a limit-nodes diagnostic located at the node that crossed it, in render, validate and analyze
- c2 (verify: test): ln-elseif: an ELSEIF chain of 20000 branches gives limit-nodes, not a RangeError, and no stack overflow occurs for deep or long input in any mode
- c3 (verify: test): ln-surfaces: the API accepts and lowers options.limits.maxNodes, the CLI takes --max-nodes, and the OpenAPI Limits schema lists it
- c4 (verify: test): ln-analyze: analyze applies the caller limits, else the defaults, and no longer throws limit-depth for nesting beyond 32 when the caller did not ask for that limit

### Must not

- m1: change any existing test expectation other than the named amendments (the default-limits fixtures in tests/headless/spec.test.ts, limits.test.ts and api.test.ts gain maxNodes: 20000)
- m2: change what any existing template outputs
- m3: add a runtime dependency
- m4: evaluate template text as code

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: a template can no longer be made arbitrarily large: limits.maxNodes (default 20000) is counted at parse, and an oversize template or a very long ELSEIF chain fails with a located limit-nodes diagnostic in render, validate and analyze, on the API and the CLI too; analyze applies the caller's limits.
Must not:
- change any existing test expectation other than the named amendments (the default-limits fixtures in tests/headless/spec.test.ts, limits.test.ts and api.test.ts gain maxNodes: 20000)
- change what any existing template outputs
- add a runtime dependency
- evaluate template text as code

## Questions

goal-critical: can a template still make the parser, the interpreter or the analyzer overflow the stack (a long ELSEIF chain under 20000 nodes, deep nesting) instead of ending in a result or a coded, located diagnostic?
goal-critical: is limit-nodes located at the node that crossed the limit, with the same code and position in render, validate, analyze and resolveTemplate?
goal-critical: does analyze() of ordinary deep nesting (40 and 200 blocks) succeed with no limits given, while a caller maxDepth is still obeyed exactly?
goal-critical: does the API lower options.limits.maxNodes (never raise it), and do validate and analyze on the server use the server's maxNodes?
polish: does the CLI --max-nodes parse like --max-depth, and do the usage text and the OpenAPI Limits and RequestLimits schemas list it?
polish: is the added code small, and are the ELSEIF loops free of duplicated logic?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope (the card amends its scope to the interpreter, the API routes and two default-limits fixtures)
- the node count lives in one place in the parser

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/architecture/headless-contract.md
- docs/living/architecture/language-contract.md
```

### spec.md as of base f4e552a71ebe, read at bde45031262c

```
# Spec

## Acceptance criteria

- ln-limit: limits.maxNodes (default 20000) is counted at parse; every AST node except the Program root counts, in document order and parent before children, at the opening token; the node numbered maxNodes + 1 raises a limit-nodes diagnostic located at that node, in render, validate and analyze (and as a thrown TemplateError from resolveTemplate and analyze)
- ln-elseif: an ELSEIF chain of 20000 branches gives limit-nodes, not a RangeError; a long chain under the limit (including empty-body branches) parses, renders and analyzes without overflowing the stack; deep nesting ends in a coded limit-depth in every mode
- ln-surfaces: the API accepts and lowers options.limits.maxNodes (a bad value is 400 invalid-request), validate and analyze on the server apply the server's maxNodes, the CLI render takes --max-nodes like --max-depth, and the OpenAPI Limits and RequestLimits schemas list it; spec().limits and DEFAULT_LIMITS carry maxNodes 20000
- ln-analyze: analyze applies the caller's limits (maxDepth, maxNodes), else the defaults; with no caller maxDepth it no longer fails for nesting beyond 32 and bounds only absurd nesting with a coded limit-depth

## Interface

- `core/src/types.ts`: `Limits.maxNodes: number`, `DEFAULT_LIMITS.maxNodes = 20000`, `withDefaultLimits` fills it.
- `core/src/errors.ts`: `LimitCode` gains `"limit-nodes"`.
- `Parser` options gain `maxNodes`; render, validate, analyze and resolveTemplate pass `limits.maxNodes`.
- CLI: `render --max-nodes <n>`. API: `options.limits.maxNodes`.

## Decisions

- Analyze with no caller maxDepth uses an internal ceiling of 256 nested blocks; a caller maxDepth is obeyed exactly. render and resolveTemplate keep the default of 32.
- ELSEIF chains are parsed, interpreted and analyzed iteratively; the AST shape (nested IfNode in `alternate`) does not change.
- Scope amendments: `core/src/interpreter.ts` (iterative ELSEIF), `api/routes.ts` (validate and analyze pass the server's limits), and the one-line default-limits fixtures in `tests/headless/limits.test.ts` and `tests/headless/api.test.ts`.
```

### card.md as of base f4e552a71ebe, read at bde45031262c

```
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
| `docs/ephemeral/cycles/language/deltas/node-limit-1.md` | add | api, cli, template-resolver |
| `docs/ephemeral/cycles/language/deltas/node-limit-2.md` | add | api, cli, template-resolver |
| `docs/ephemeral/cycles/language/deltas/node-limit-3.md` | add | api, cli, template-resolver |
| `docs/ephemeral/cycles/language/deltas/node-limit-4.md` | add | api, cli, template-resolver |
| `tests/language/limits-nodes.test.ts` | add | api, cli, template-resolver |
| `api/openapi.json` | edit | api, cli, template-resolver |
| `api/routes.ts` | edit | api, cli, template-resolver |
| `cli/main.ts` | edit | api, cli, template-resolver |
| `core/src/analyze.ts` | edit | api, cli, template-resolver |
| `core/src/interpreter.ts` | edit | api, cli, template-resolver |
| `core/src/parser.ts` | edit | api, cli, template-resolver |
| `core/src/render.ts` | edit | api, cli, template-resolver |
| `core/src/resolve.ts` | edit | api, cli, template-resolver |
| `core/src/types.ts` | edit | api, cli, template-resolver |
| `tests/headless/api.test.ts` | edit | api, cli, template-resolver |
| `tests/headless/limits.test.ts` | edit | api, cli, template-resolver |

Files scope: `api/openapi.json`, `api/routes.ts`, `cli/main.ts`, `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/render.ts`, `core/src/resolve.ts`, `core/src/types.ts`, `docs/ephemeral/cycles/language/deltas`, `tests/headless/api.test.ts`, `tests/headless/limits.test.ts`, `tests/headless/spec.test.ts`, `tests/language/limits-nodes.test.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: `docs/ephemeral/cycles/language/deltas/node-limit-1.md`, `docs/ephemeral/cycles/language/deltas/node-limit-2.md`, `docs/ephemeral/cycles/language/deltas/node-limit-3.md`, `docs/ephemeral/cycles/language/deltas/node-limit-4.md`, `tests/language/limits-nodes.test.ts`
- remove: none
- edit: `api/openapi.json`, `api/routes.ts`, `cli/main.ts`, `core/src/analyze.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/render.ts`, `core/src/resolve.ts`, `core/src/types.ts`, `tests/headless/api.test.ts`, `tests/headless/limits.test.ts`
- files_scope: `api/openapi.json`, `api/routes.ts`, `cli/main.ts`, `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/render.ts`, `core/src/resolve.ts`, `core/src/types.ts`, `docs/ephemeral/cycles/language/deltas`, `tests/headless/api.test.ts`, `tests/headless/limits.test.ts`, `tests/headless/spec.test.ts`, `tests/language/limits-nodes.test.ts`

## 2. Your verification plan

Before you read section 3, write `verification_plan`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.

## 3. Design context

### docs/living/architecture/modules/template-resolver.md

```
---
summary: The template resolver module as it is: lexer, parser, interpreter, filters, coercion, errors and the n8n node, with its syntax and failure handling.
state: built
provenance: recovered
recovered_at: 712fcfd7f7af0b329e6506120a25f0db8e58de06
recovered_in: 0002-describe-the-template-resolver-as-it-is
---

# Template resolver module

> Since recovery: the source moved from `nodes/TemplateResolver/` to `core/src/` (pure library) and `n8n/` (node wrapper), and the syntax bugs listed in the foundations pull request are fixed. Tags in this document cite the recovered commit, not the current tree.

## Purpose

The module `nodes/TemplateResolver/` turns a template string containing `${{var}}` substitutions and `{{...}}` block tags into plain text, and exposes that as one n8n node. Readers are the teams changing template syntax, error reporting or node parameters. Repository-level facts are in `docs/living/architecture/overview.md`.

## Scope read

Read in full: `lexer.ts`, `parser.ts`, `expressions.ts`, `interpreter.ts`, `filters.ts`, `coercion.ts`, `errors.ts`, `types.ts`, `utils.ts`, `index.ts`, `TemplateResolver.node.ts` (all in `nodes/TemplateResolver/`). Not read: the test file, `README.md`, any spec or planning document, and `icoTemplateResolver.svg`. Nothing was executed, so every behavior below is read from source, not observed. Paths and line numbers are relative to `C:/n8n-run`.

## Responsibility

Pipeline: `resolveTemplate(template, variables, options)` runs `new Lexer(template).tokenize()`, then `new Parser(tokens).parse()`, then `new Interpreter(variables, options).interpret(ast)` and returns the string [src: nodes/TemplateResolver/TemplateResolver.node.ts:22-38]

- `lexer.ts`: splits the text into `Token`s (`TEXT`, `VARIABLE`, tag types, `COMMENT`, `EOF`) with line and column, and checks that block openers and closers balance [src: nodes/TemplateResolver/lexer.ts:142-174] [src: nodes/TemplateResolver/lexer.ts:28-137]
- `parser.ts`: recursive descent from tokens to an AST rooted at a `Program` node [src: nodes/TemplateResolver/parser.ts:36-52]
- `expressions.ts`: truthiness, condition evaluation (logical, comparison, string and type-check operators) and arithmetic for `${{...}}` [src: nodes/TemplateResolver/expressions.ts:26-108] [src: nodes/TemplateResolver/expressions.ts:434-569]
- `interpreter.ts`: walks the AST and builds the output string, owning variable lookup, loop context, list and table rendering [src: nodes/TemplateResolver/interpreter.ts:45-96] [src: nodes/TemplateResolver/interpreter.ts:239-395] [src: nodes/TemplateResolver/interpreter.ts:451-508]
- `filters.ts`: parses and applies the `head`, `tail`, `trim` and `escape_md` filters [src: nodes/TemplateResolver/filters.ts:89-102]
- `coercion.ts`: lenient conversion of values to number, array, object, boolean and string [src: nodes/TemplateResolver/coercion.ts:15-275]
- `errors.ts`: `TemplateError` and subclasses `SyntaxError`, `TypeError`, `MissingVariableError` [src: nodes/TemplateResolver/errors.ts:4-81]
- `types.ts`: `TemplateValue`, `VariableMap`, `FilterCall`, `TokenType` and the AST node interfaces [src: nodes/TemplateResolver/types.ts:5-232]
- `utils.ts`: `extractAllVariables`, which scans the raw template for root variable names [src: nodes/TemplateResolver/utils.ts:13-45]
- `TemplateResolver.node.ts`: `resolveTemplate` and the n8n node class `TemplateResolver` [src: nodes/TemplateResolver/TemplateResolver.node.ts:22] [src: nodes/TemplateResolver/TemplateResolver.node.ts:66]
- `index.ts`: re-exports all of the above [src: nodes/TemplateResolver/index.ts:2-29]

## Interface

Exports (via `index.ts`) used by callers: `resolveTemplate(template: string, variables: VariableMap, options?: { strictMode?: boolean }): string` [src: nodes/TemplateResolver/TemplateResolver.node.ts:22-26]; `Lexer`, `Parser`, `Interpreter` classes; `evaluateCondition`, `evaluateExpression`, `evaluateMathExpression`, `isTruthy`; `parseFilter`, `applyFilter`, `applyFilters`; the `tryCoerceTo*` functions; `extractAllVariables`; the error classes [src: nodes/TemplateResolver/index.ts:2-29]

`VariableMap` is `Map<string, TemplateValue>`; a `TemplateValue` is string, number, boolean, null, undefined, an array or an object of those [src: nodes/TemplateResolver/types.ts:5-17]. `Interpreter` defaults `strictMode` to `true` when the option is absent [src: nodes/TemplateResolver/interpreter.ts:53]

### n8n node parameters

Node `displayName` `Template Resolver`, internal name `templateResolver`, group `transform`, version 1, one `main` input and output, `usableAsTool: true`, icon `fa:file-code` [src: nodes/TemplateResolver/TemplateResolver.node.ts:67-81]

| name | type | default | notes |
|---|---|---|---|
| `template` | string (10 rows) | `""` | required [src: nodes/TemplateResolver/TemplateResolver.node.ts:83-109] |
| `variableMappings` | fixedCollection, multipleValues | `{}` | collection `mappings` of `variableName` (string, required) and `value` (string) [src: nodes/TemplateResolver/TemplateResolver.node.ts:110-147] |
| `strictMode` | boolean | `true` | [src: nodes/TemplateResolver/TemplateResolver.node.ts:148-155] |
| `showDetectedVariables` | boolean | `false` | [src: nodes/TemplateResolver/TemplateResolver.node.ts:156-163] |
| `outputField` | string | `resolved_prompt` | [src: nodes/TemplateResolver/TemplateResolver.node.ts:164-170] |

The `value` description says it supports n8n expressions; the code only reads the already-fetched parameter value via `getNodeParameter` [src: nodes/TemplateResolver/TemplateResolver.node.ts:136-143] [src: nodes/TemplateResolver/TemplateResolver.node.ts:181-200] [open: Q1]

### Execute path

`execute()` loops over `this.getInputData()` and, per item index [src: nodes/TemplateResolver/TemplateResolver.node.ts:174-178]

1. Reads `template`, `variableMappings` (default `{ mappings: [] }`), `strictMode`, `showDetectedVariables`, `outputField` [src: nodes/TemplateResolver/TemplateResolver.node.ts:181-200]
2. Computes `detectedVariables = extractAllVariables(template)` [src: nodes/TemplateResolver/TemplateResolver.node.ts:203]
3. Builds a `Map` from the mappings, keeping a mapping only when `variableName` is truthy and `value !== undefined` [src: nodes/TemplateResolver/TemplateResolver.node.ts:205-213]
4. Computes `mappedVariables` and `missingVariables` (detected names not in the map) [src: nodes/TemplateResolver/TemplateResolver.node.ts:216-219]
5. If `strictMode` and any are missing, throws `NodeOperationError` listing missing and detected names [src: nodes/TemplateResolver/TemplateResolver.node.ts:221-229]
6. If not strict, sets each missing name to `""` [src: nodes/TemplateResolver/TemplateResolver.node.ts:231-236]
7. Calls `resolveTemplate(template, variables, { strictMode })` [src: nodes/TemplateResolver/TemplateResolver.node.ts:239]
8. Outputs `{ [outputField]: resolved }`, plus `_template_metadata` (`detected_variables`, `mapped_variables`, `missing_variables`, `variable_count` = number detected) when `showDetectedVariables` is on; each item carries `pairedItem: { item: itemIndex }` [src: nodes/TemplateResolver/TemplateResolver.node.ts:242-258]
9. Returns `[returnData]` [src: nodes/TemplateResolver/TemplateResolver.node.ts:283]

`extractAllVariables` collects roots from `${{name...}}`, from `{{IF|CASE|FOR name}}` (case-insensitive tag word) and from `{{name ?` patterns, drops names starting with `@`, and returns them unique and sorted [src: nodes/TemplateResolver/utils.ts:16-44]. It does not exclude the `AS` name of a `FOR` tag, so `${{item}}` inside a loop adds `item` to the detected set [src: nodes/TemplateResolver/utils.ts:13-45]. In the node, an unmapped detected name therefore counts as missing, and in strict mode triggers the error in step 5 before resolution [src: nodes/TemplateResolver/TemplateResolver.node.ts:216-229] [answer: Q2] [open: Q10]

## Structured result, diagnostics and limits

Added after recovery, in the current tree (`core/src/render.ts`, `spec.ts`, `types.ts`, `errors.ts`, `estimate.ts`); the full contract is `docs/living/architecture/headless-contract.md`.

- `render(template, data, { strictMode?, standaloneLines?, limits?, tokenEstimator? })` returns `{ ok, output, messages, stats: { chars, estTokens, sectionsOmitted, iterations }, diagnostics }` and never throws for template or data problems: on failure `ok` is false, `output` is `""` and the one diagnostic is the error that stopped rendering. `messages` is always `[]` for now; `sectionsOmitted` counts the SECTION blocks omitted for an empty body. `estTokens` defaults to `estimateTokens`, `Math.ceil(chars / 4)`.
- `validate(template, { limits? })` returns `{ ok, diagnostics }` without data: parse errors and unknown filters are errors; conditions `analyze` cannot read become warnings with code `analysis-warning`; `ok` is false only when an error is present.
- A diagnostic is `{ severity, code, message, line, column, suggestion? }`. Every `TemplateError` carries a `code` (`syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`) and the 1-based line and column of the node that failed: runtime errors are relocated to the evaluating node, and plain `Error`s from filters or math become `type-error` there. `render` adds `invalid-input` for data that is not an object.
- `Limits { maxIterations, maxOutputChars, maxDepth }` with `DEFAULT_LIMITS` 10000 (total FOR iterations across the render), 1000000 (output characters) and 32 (block nesting, enforced by the parser, so also by `analyze` and `validate`); `withDefaultLimits` fills omitted ones. `resolveTemplate` accepts `limits` too and keeps throwing.
- `spec()` describes the language: `version` (the language version, `"1.0"`), `blocks`, `filters`, `operators`, the default `limits`, the render `options` and `syntax` (variable, comment, trim markers, escape).
- `analyze` additionally reports `required` per variable (always `!optional`) and `blocks`, a count per block kind (`IF`, `CASE`, `FOR`, `LIST`, `TABLE`, `SECTION`, `FENCE`); it throws on a template that does not parse.
- The n8n node now detects variables with `analyze`, fails early in strict mode on unmapped required variables, renders with `render` and turns a failed result into a `NodeOperationError` carrying the first diagnostic's message, line and column.
- Consumers besides the node: the api module (`api/`, HTTP) and the cli module (`cli/`, bin `template-resolver`) call `render`, `validate`, `analyze` and `spec` and add only transport; see `api.md` and `cli.md`.

## Prompt-aware constructs

Added in the current tree (`core/src/whitespace.ts`, the lexer, parser and interpreter, `filters.ts`, `spec.ts`); the full contract is `docs/living/architecture/prompt-aware-contract.md`.

- Whitespace: the lexer passes its tokens through `applyWhitespace` before parsing. Trim markers `{{-` and `-}}` apply first; then, when `standaloneLines` is on, a line holding only block tags (IF, CASE, FOR, SECTION, FENCE, RAW, their parts and comments) and whitespace is removed with its line break. LIST, TABLE and their parts keep their own spacing. `standaloneLines` defaults to true for `render` and false for `resolveTemplate`.
- `{{RAW}}...{{END_RAW}}` content is one literal text token; `\{{` outputs `{{` (the backslash is consumed) and `\\{{` outputs one backslash before an active tag.
- `{{SECTION title level=N skip_empty=bool}}` outputs `<hashes> <title>`, a blank line and the trimmed body, or nothing (counted in `stats.sectionsOmitted`) when the body renders empty and skip_empty is true.
- `{{FENCE lang=...}}` and the `fence[=lang]` filter wrap content in a backtick fence longer than any backtick run inside it.
- Filters `heading_offset=N` (shifts ATX heading lines, clamped to 1 to 6, outside fenced code) and `escape_md=inline|block` (block adds line-start escaping).
- The n8n node passes its `standaloneLines` parameter ("Remove Standalone Tag Lines", default true) to `render`.

## Behavior

### Tokenizing

- `${{` starts a variable token; content runs to the first `}}` and is trimmed; no nesting [src: nodes/TemplateResolver/lexer.ts:149-153] [src: nodes/TemplateResolver/lexer.ts:178-200]
- A bare `{{` starts a tag; spaces and tabs after `{{` are skipped; `{{#` begins a comment ended by `#}}` and becomes a `COMMENT` token [src: nodes/TemplateResolver/lexer.ts:214-231] [src: nodes/TemplateResolver/lexer.ts:257-277]
- A tag body is scanned to its matching `}}`, counting nested `{{` pairs [src: nodes/TemplateResolver/lexer.ts:320-346]
- The keyword is the leading run of `[A-Z_]` characters; it must be one of the 22 listed names (`IF`, `ELSEIF`, `ELSE`, `END_IF`, `CASE`, `WHEN`, `DEFAULT`, `END_WHEN`, `END_DEFAULT`, `END_CASE`, `FOR`, `END_FOR`, `LIST`, `LIST_ITEM`, `END_LIST_ITEM`, `END_LIST`, `TABLE`, `HEADER`, `END_HEADER`, `ROW`, `END_ROW`, `END_TABLE`) or a `SyntaxError` "Unknown template tag" is thrown, except that content equal to an inherited `Object.prototype` member name (for example `{{constructor}}`) is not rejected there and fails later in the parser with "Unexpected token" [src: nodes/TemplateResolver/lexer.ts:359-394] [src: nodes/TemplateResolver/lexer.ts:237-244]. Keywords are case-sensitive uppercase; a plain `{{name}}` without `$` reaches this error. [src: nodes/TemplateResolver/lexer.ts:237-244]
- Text between tags becomes `TEXT` with `\r\n` normalized to `\n` [src: nodes/TemplateResolver/lexer.ts:289-315]
- After `EOF`, `validateBlocks` requires every `IF`, `FOR`, `CASE`, `TABLE`, `LIST` to be closed in stack order by its `END_*`; `WHEN`, `DEFAULT`, `LIST_ITEM`, `HEADER`, `ROW` are not tracked there [src: nodes/TemplateResolver/lexer.ts:28-137]
- The lexer header comment lists a ternary form `{{condition ? "true" : "false"}}`, but the lexer has no ternary path and the parser never creates a `Ternary` node, although `TernaryNode` and `visitTernary` exist [src: nodes/TemplateResolver/lexer.ts:14] [src: nodes/TemplateResolver/types.ts:107-112] [src: nodes/TemplateResolver/interpreter.ts:411-419] [open: Q3]

### Parsing (tags supported)

- Variable `${{path}}`: split on `|` first (rest are filters, stored as raw strings), then on the first `??` (default value, outer quotes stripped), then path split on `.` [src: nodes/TemplateResolver/parser.ts:131-171]
- `{{IF cond}}` ... `{{ELSEIF cond}}` ... `{{ELSE}}` ... `{{END_IF}}`; `ELSEIF` chains become nested `If` nodes in `alternate`; `END_IF` is required [src: nodes/TemplateResolver/parser.ts:176-293] [src: nodes/TemplateResolver/parser.ts:298-350]
- `{{CASE expr}}` containing `{{WHEN "v"}}...` and `{{DEFAULT}}...`; only whitespace text between clauses is allowed; `END_WHEN` and `END_DEFAULT` are optional; the `WHEN` value is the first quoted string in the tag [src: nodes/TemplateResolver/parser.ts:355-485] [src: nodes/TemplateResolver/parser.ts:882-885]
- `{{FOR path AS name}}` ... `{{END_FOR}}`; regex `FOR\s+(.+?)\s+AS\s+(\w+)`, case-insensitive; the iterable path is split on `.` [src: nodes/TemplateResolver/parser.ts:490-544]
- `{{LIST}}` containing `{{LIST_ITEM [cond] [| fallback="text"]}}` ... optional `{{END_LIST_ITEM}}` ... `{{END_LIST}}`; non-whitespace text directly inside `LIST` is a syntax error [src: nodes/TemplateResolver/parser.ts:549-654]
- `{{TABLE [align="a|b|c"]}}` containing optional `{{HEADER}}...`, `{{ROW}}...` (with optional `END_HEADER`, `END_ROW`) and `{{FOR}}` blocks, ended by `END_TABLE`; header and row content is split into cells on literal `|` in text nodes [src: nodes/TemplateResolver/parser.ts:659-735] [src: nodes/TemplateResolver/parser.ts:740-850]
- Comments produce a `Comment` node [src: nodes/TemplateResolver/parser.ts:855-863]
- A top-level `HEADER` or `ROW` token outside `TABLE`, when closed by its `END_*` tag, parses into a node type the interpreter's `visit` switch does not list, so it renders as an empty string; when the file ends before the closing tag it raises "Unclosed {{HEADER}} block" or "Unclosed {{ROW}} block" (a `ROW` followed directly by another `ROW` or `END_TABLE` ends without raising) [src: nodes/TemplateResolver/parser.ts:75-80] [src: nodes/TemplateResolver/interpreter.ts:73-95] [src: nodes/TemplateResolver/parser.ts:747-754] [src: nodes/TemplateResolver/parser.ts:780-787]. A stray `END_IF`, `END_FOR`, `END_CASE`, `END_TABLE` or `END_LIST` throws "Unexpected {{END_X}} without matching" from the lexer's block validation, and any other tag type the parser's `parseNode` does not handle (for example `ELSE`) raises "Unexpected token" [src: nodes/TemplateResolver/lexer.ts:55-123] [src: nodes/TemplateResolver/parser.ts:83-89]

### Interpreting

- Text passes through; comments render as `""` [src: nodes/TemplateResolver/interpreter.ts:75-92]
- Variable: if the joined path text contains any of `+ - * / %` or parentheses it is first tried as a math expression, and any error in that attempt is logged with `console.log` and swallowed before normal lookup [src: nodes/TemplateResolver/interpreter.ts:110-119] [src: nodes/TemplateResolver/interpreter.ts:142-147]. Then lookup, then the `??` default replaces a value that fails `isTruthy`, then filters run on the string form [src: nodes/TemplateResolver/interpreter.ts:121-136] [open: Q9]
- Lookup (`resolveNestedPath`): loop variables win over variables; a missing root throws `MissingVariableError` when strict and no `??` is present, else yields `null` [src: nodes/TemplateResolver/interpreter.ts:455-477]. Later path segments walk objects, array indexes (`parseInt`) and JSON-object strings (via `tryCoerceToObject`); a null intermediate, a string that is not a JSON object, or a primitive gives `null`, while a missing property on an object or index in an array gives `undefined` [src: nodes/TemplateResolver/interpreter.ts:483-507]
- Output formatting: `null`/`undefined` render as `""`; other values via `tryCoerceToString` (JSON for arrays and objects) [src: nodes/TemplateResolver/interpreter.ts:513-518] [src: nodes/TemplateResolver/coercion.ts:255-275]
- `IF`: `evaluateCondition` on the condition with variables plus loop context; `ELSE` array or nested `If` for `ELSEIF` [src: nodes/TemplateResolver/interpreter.ts:152-170]
- `CASE`: the expression is looked up with strict lookup, compared as a string with `===` to each `WHEN` value (case-sensitive); no match falls to `DEFAULT`, else `""` [src: nodes/TemplateResolver/interpreter.ts:175-192]
- `FOR`: iterable coerced with `tryCoerceToArray`; a non-coercible value throws `TypeError` in strict mode and renders `""` otherwise [src: nodes/TemplateResolver/interpreter.ts:197-211]. Per iteration it sets the item name and the loop variables `@index0`, `@index1`, `@first`, `@last`, `@notFirst`, `@notLast`; bodies are concatenated with no separator [src: nodes/TemplateResolver/interpreter.ts:215-233]. After the loop the whole loop context is cleared, including outer-loop entries [src: nodes/TemplateResolver/interpreter.ts:231] [open: Q4]
- `LIST`: items rendered as `N. text`, joined with `\n`, indented three spaces per depth; a list nested directly in an item's content is appended after a newline at depth + 1; an item whose condition is false renders its `fallback` or is skipped without consuming a number; item content is trimmed [src: nodes/TemplateResolver/interpreter.ts:239-284]
- `TABLE`: header and row cells are rendered and trimmed; a row that wraps a `FOR` iterates the array (nothing is rendered if the iterable is not coercible, even in strict mode) and renders each `ROW` in its body; rows are padded to the widest row; with a header it emits a `| a | b |` line, then a separator `|:-----|` whose dashes are `max(5, header cell length)` with `:` placement from `align` (`left` default, `center`, `right`), then data rows; without a header, just rows [src: nodes/TemplateResolver/interpreter.ts:289-395]
- Ternary: only reachable if a `Ternary` node is given; evaluates `condition`, and a value of the form `${{path}}` is looked up, else used literally [src: nodes/TemplateResolver/interpreter.ts:411-440]

### Conditions and operators (`expressions.ts`)

Order tried by `evaluateCondition`: `NOT(...)` wrapper, outer parentheses, then ` OR ` (rightmost split), ` AND ` (rightmost split), comparison, string operator, type check, finally truthiness of the resolved value [src: nodes/TemplateResolver/expressions.ts:66-108] [src: nodes/TemplateResolver/expressions.ts:129-178]

- `AND`, `OR`, `NOT(` are uppercase, space-delimited and matched only outside parentheses (for `AND`/`OR`) [src: nodes/TemplateResolver/expressions.ts:138-156]
- Comparison `== != >= <= > <` found left to right outside quotes; `==` and `!=` compare `String(left)` and `String(right)`; ordering operators coerce both sides to numbers and throw `TypeError` if either is not numeric [src: nodes/TemplateResolver/expressions.ts:182-238] [src: nodes/TemplateResolver/expressions.ts:243-272]
- String operators `contains`, `startsWith`, `endsWith` (regex flag `i`); the right side is a literal with outer quotes stripped, not a variable; a left side that is `null` yields `false` [src: nodes/TemplateResolver/expressions.ts:277-306]
- Type checks `isEmpty`, `isNotEmpty`, `isArray`, `isNumber`, `isObject`, `isBoolean` as a trailing word [src: nodes/TemplateResolver/expressions.ts:311-359]
- Operand resolution: literals `true`, `false`, `null`, numbers and quoted strings; otherwise a dotted path over the variable map where string intermediates are `JSON.parse`d and a missing name yields `undefined` rather than an error [src: nodes/TemplateResolver/expressions.ts:364-416]. Conditions therefore never raise `MissingVariableError`. [src: nodes/TemplateResolver/expressions.ts:364-416]
- `isTruthy`: `null`/`undefined` false; strings trimmed and lowercased, false for `""`, `false`, `0`, `no`, true otherwise; numbers non-zero; booleans as is; arrays non-empty; objects with keys [src: nodes/TemplateResolver/expressions.ts:26-53]. The doc comment above it also lists `null`, `undefined` and `none` as falsy strings, which the body does not implement [src: nodes/TemplateResolver/expressions.ts:17-18] [src: nodes/TemplateResolver/expressions.ts:33] [open: Q5]
- Math (`+ - * / %`, parentheses; `*` `/` `%` before `+` `-`): identifiers resolve through `resolveValue` and must coerce to a number or a `TypeError` is thrown; unmatched parentheses or a leftover token shape throw `TypeError` [src: nodes/TemplateResolver/expressions.ts:445-569]. The `-` character is pushed as an operator before the signed-number branch is tested [src: nodes/TemplateResolver/expressions.ts:462-470] [answer: Q6]

### Filters

Every filter is one definition in `FILTER_REGISTRY` (`core/src/filters.ts`; the text and collection groups are `filters-text.ts` and `filters-collection.ts`): `render`, `spec()`, `analyze` and `validate` all read that table, and a definition added to it is accepted by all four. Filters receive and return values; the six built-ins coerce to text first. A call is parsed once at parse time, quote-aware (`fence="a=b"` keeps `a=b`), and a parameter the filter does not declare is a located `type-error` in every mode (also reported by `validate` and `analyze`). An unterminated quote in a `??` default is plain text and no longer hides the filters after it. See `docs/living/architecture/language-contract.md`. The paragraph below describes the older string-only behavior and the filter names it lists.

Applied left to right to the string form of the value, after `??`. Syntax per filter: bare name, `name=value`, or `name:key="v",key2="v2"` [src: nodes/TemplateResolver/filters.ts:11-65]. Implemented names: `head=N` (first N characters; negative N drops the last N), `tail=N` (last N; `0` gives `""`; negative N drops the first N), `trim`, `escape_md` (backslash-escapes `\ * _ [ ] ( ) # ` > ~ |`) [src: nodes/TemplateResolver/filters.ts:89-186]. Any other name throws a plain `Error` "Unknown filter" [src: nodes/TemplateResolver/filters.ts:99-100]

### Coercion and repair of string input

- Number: numbers (not `NaN`), booleans (1/0), non-empty trimmed numeric strings; else `null` [src: nodes/TemplateResolver/coercion.ts:15-35]
- Array: arrays pass; strings starting with `[` have trailing and leading commas removed and are `JSON.parse`d, falling back to comma splitting when unclosed or invalid; strings starting with `{` give `null`; any other string is split on commas (double quotes group, empty pieces dropped, outer brackets or braces stripped); other primitives become one-item arrays; objects give `null` [src: nodes/TemplateResolver/coercion.ts:48-153]
- Object: objects pass; strings that start with `{` and end with `}` are repaired (stray commas collapsed, trailing and leading commas removed) then parsed; anything else `null` [src: nodes/TemplateResolver/coercion.ts:165-201]
- Boolean: booleans; `1`/`0`; case-insensitive `true`/`yes`/`1` and `false`/`no`/`0`; else `null` [src: nodes/TemplateResolver/coercion.ts:214-243]

## Failure handling

- Error classes: `TemplateError(message, line, column, suggestion?)` formats its message as a line starting with a glyph prefix, then `Template Error (line L, col C):`, the message on an indented line, and an optional `Suggestion:` line; subclasses set `name` to `SyntaxError`, `TypeError`, `MissingVariableError` and shadow the global names [src: nodes/TemplateResolver/errors.ts:4-60]. `MissingVariableError` text is `Variable 'x' not found`; when variables are defined the suggestion lists them and names "Lenient Mode", otherwise it reads "No variables defined. Check variable mappings." [src: nodes/TemplateResolver/errors.ts:65-81] [open: Q7]
- The prefix glyph in the source file is stored as mojibake (bytes `c3 a2 c2 9d c5 92`), not a clean emoji [src: nodes/TemplateResolver/errors.ts:22] [open: Q8]
- Position info: lexer and parser errors carry real token line and column; runtime errors from the interpreter and expressions use fixed `1, 1` (`MissingVariableError`, math and comparison `TypeError`) or the node's own position (`FOR` `TypeError`) [src: nodes/TemplateResolver/interpreter.ts:470-475] [src: nodes/TemplateResolver/expressions.ts:252-257] [src: nodes/TemplateResolver/interpreter.ts:203-208]
- Filter errors (`Unknown filter`, `head`/`tail` parameter problems) are plain `Error`, not `TemplateError`, and carry no position [src: nodes/TemplateResolver/filters.ts:100-117] [src: nodes/TemplateResolver/filters.ts:131-139]
- Structural errors raised: unknown tag, unclosed variable, tag or comment, unmatched or unclosed block, missing `END_*`, bad `FOR` syntax, unexpected text or token inside `CASE`, `LIST`, `TABLE`, `consume` mismatch [src: nodes/TemplateResolver/lexer.ts:55-123] [src: nodes/TemplateResolver/lexer.ts:203-208] [src: nodes/TemplateResolver/lexer.ts:237-244] [src: nodes/TemplateResolver/lexer.ts:278-283] [src: nodes/TemplateResolver/lexer.ts:348-353] [src: nodes/TemplateResolver/parser.ts:364-396] [src: nodes/TemplateResolver/parser.ts:529-534] [src: nodes/TemplateResolver/parser.ts:555-585] [src: nodes/TemplateResolver/parser.ts:668-711] [src: nodes/TemplateResolver/parser.ts:914-924]
- Strict mode: affects missing root variables (not in conditions) and non-iterable `FOR` values; with `??` present a missing root does not throw [src: nodes/TemplateResolver/interpreter.ts:121-122] [src: nodes/TemplateResolver/interpreter.ts:468-477]
- Node level: any error inside the item loop is caught; with `continueOnFail()` the item becomes `{ error: message, error_type: name }`; otherwise a `NodeOperationError` is rethrown as is, or any other error is wrapped in a new `NodeOperationError` with the same message and `itemIndex` [src: nodes/TemplateResolver/TemplateResolver.node.ts:259-280]. Wrapping drops the original class name from the thrown error. [src: nodes/TemplateResolver/TemplateResolver.node.ts:273-279]

## Dependencies

- Runtime import: `n8n-workflow` (`IExecuteFunctions`, `INodeExecutionData`, `INodeType`, `INodeTypeDescription`, `NodeOperationError`), used only by `TemplateResolver.node.ts`; declared as a peer dependency [src: nodes/TemplateResolver/TemplateResolver.node.ts:6-12] [src: package.json:47-49]
- All other files import only from sibling files; there are no third-party packages in the resolver core [src: nodes/TemplateResolver/coercion.ts:2] [src: nodes/TemplateResolver/expressions.ts:1-9] [src: nodes/TemplateResolver/filters.ts:1] [src: nodes/TemplateResolver/interpreter.ts:1-28] [src: nodes/TemplateResolver/lexer.ts:1-2] [src: nodes/TemplateResolver/parser.ts:1-21]
- Internal order: `types` and `errors` are leaves; `coercion` uses `types`; `filters` uses `types`; `expressions` uses `types`, `errors`, `coercion`; `lexer` and `parser` use `types` and `errors`; `interpreter` uses `types`, `errors`, `coercion`, `expressions`, `filters`; the node file uses `types`, `lexer`, `parser`, `interpreter`, `utils` [src: nodes/TemplateResolver/coercion.ts:2] [src: nodes/TemplateResolver/expressions.ts:1-9] [src: nodes/TemplateResolver/filters.ts:1] [src: nodes/TemplateResolver/interpreter.ts:1-28] [src: nodes/TemplateResolver/lexer.ts:1-2] [src: nodes/TemplateResolver/parser.ts:1-21] [src: nodes/TemplateResolver/TemplateResolver.node.ts:1-5]
- `TemplateMetadata` and `VariableMappingsCollection` are declared both in `types.ts` and (unexported) in the node file [src: nodes/TemplateResolver/types.ts:217-232] [src: nodes/TemplateResolver/TemplateResolver.node.ts:43-58]
- Tests mock `n8n-workflow` through `__mocks__/n8n-workflow.ts` [src: jest.config.js:6-8]

## Open questions

- Q1. Whether n8n expressions typed in a mapping `value` (for example `={{ $json.title }}`) are evaluated before `execute()` sees them is n8n runtime behavior outside this repository; the code only calls `getNodeParameter`. Looked at: `TemplateResolver.node.ts:136-143,181-200`.
- Q3. The lexer comment documents a `{{cond ? "a" : "b"}}` ternary and `utils.ts` detects its condition name, but no lexer or parser path produces it; a tag of that shape reaches the unknown-tag error. Whether the ternary is intended to work is not stated in the code.
- Q4. The `FOR` loop clears the entire loop context at its end (`interpreter.ts:231`), so a nested inner loop would remove the outer item and index values for the rest of the outer iteration. Not run; effect on real templates unconfirmed.
- Q5. `isTruthy` comment lists `null`, `undefined` and `none` strings as falsy but the code treats them as truthy. Which is intended is unknown.
- Q7. `MissingVariableError` suggests enabling "Lenient Mode", while the node parameter is named "Strict Mode". Whether another name for the setting exists is unknown.
- Q8. The error-message prefix is double-encoded text in the source; whether tests or consumers depend on the exact bytes is unknown (tests not read). Several comments in `lexer.ts`, `parser.ts`, `filters.ts` and `coercion.ts` show the same encoding damage for arrows.
- Q9. The interpreter prints swallowed math errors with `console.log`; whether that output is intended for n8n execution logs is unknown. Looked at: `interpreter.ts:111-118`.
- Q10. Whether tests exercise a `FOR` item name used as `${{item}}` under strict mode, and whether that behavior is intended, was not checked (tests not read).

## Answered

- Q2. Code path: `extractAllVariables` adds the root of every `${{name}}`, including a `FOR ... AS` item name, to the detected set (`utils.ts:13-45`), and in strict mode the node throws when a detected name has no mapping (`TemplateResolver.node.ts:216-229`). Answered from source by research:lead.

- Q6. A leading negative number such as `-3 + 1` ends in `MissingVariableError` for the key `-3 + 1` in strict mode and renders empty in lenient mode: the math attempt fails ("Invalid math expression"), the error is swallowed, and normal lookup finds no such key. Answered from source by research:lead (`interpreter.ts:110-119`, `interpreter.ts:468-477`, `expressions.ts:564-566`).
```

### docs/living/architecture/headless-contract.md

````
---
summary: Contract for the headless cycle: the structured render result, diagnostics, limits, the HTTP API, the OpenAPI document and the CLI.
state: built
---

# Headless contract

Decisions already settled in the ADRs apply (0003 unknown names always error, 0004 structured result, 0005 dependency-free estimator, 0006 node imports core). No new runtime dependency: node's `http`, `util.parseArgs`, `fs` only. Module detail: `modules/template-resolver.md` (core), `modules/api.md`, `modules/cli.md`.

## Core

```ts
interface Limits { maxIterations: number; maxOutputChars: number; maxDepth: number }
// DEFAULT_LIMITS: maxIterations 10000 (total FOR iterations across the render), maxOutputChars 1000000, maxDepth 32 (nesting of blocks)
interface RenderOptions { strictMode?: boolean; limits?: Partial<Limits>; tokenEstimator?: (text: string) => number }
interface Diagnostic { severity: "error" | "warning"; code: DiagnosticCode | "invalid-input" | "analysis-warning"; message: string; line: number; column: number; suggestion?: string }
interface RenderResult { ok: boolean; output: string; messages: unknown[]; stats: { chars: number; estTokens: number; sectionsOmitted: number; iterations: number }; diagnostics: Diagnostic[] }
render(template: string, data: Record<string, unknown>, options?: RenderOptions): RenderResult   // never throws for template or data problems
validate(template: string, options?: { limits?: Partial<Limits> }): { ok: boolean; diagnostics: Diagnostic[] }
analyze(template, options?: { limits? }): existing result plus `required` on each variable (= !optional) and `blocks: Partial<Record<"IF" | "CASE" | "FOR" | "LIST" | "TABLE", number>>` (count per block kind present)
spec(): { version: string; blocks: {name, closes?, args, description}[]; filters: {name, params, description}[]; operators: string[]; limits: Limits; syntax: {variable, comment} }
```

- `messages` is an empty array until MESSAGE blocks exist; `sectionsOmitted` is 0 until SECTION exists. `stats.iterations` is reported on failure too.
- Diagnostic codes: `syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth` (carried by `TemplateError` as `DiagnosticCode`), plus `invalid-input` (render, data not an object) and `analysis-warning` (validate). Every diagnostic has the 1-based line and column of the offending template node or tag; runtime errors (missing variable, bad filter parameters, math, type) carry the location of the node that failed, never a placeholder 1:1.
- On failure `ok` is false, `output` is `""`, and the only diagnostic is the error that stopped rendering.
- `validate` maps `analyze`'s diagnostics: `unknown-filter` stays an error; every other analysis finding (an unrecognized condition) becomes a warning with code `analysis-warning`. A template that does not parse gives its error. `ok` is false only when an error is present.
- `analyze` still throws a `TemplateError` for a template that does not parse; its callers (validate, the API, the CLI, the node) turn that into a diagnostic or an error.
- `analyze`'s own diagnostics have the analysis shape `{ code, message, line, column }` (no `severity`, no `suggestion`), with codes `unknown-filter` and `unrecognized-condition`. `POST /v1/analyze` puts a parse failure (`syntax-error` or `limit-depth`) in that same shape; `template-resolver analyze` prints it to stderr instead.
- `spec().version` is the template language version, `"1.0"`, not the package version.
- Estimator default: `Math.ceil(chars / 4)`, documented as an estimate with roughly +/-30 percent error for English prose.
- `resolveTemplate` (throwing string API) keeps its behavior, accepts `limits`, and is implemented over the same engine.
- The n8n node detects variables with `analyze`; in strict mode an unmapped required variable is a NodeOperationError naming the unmapped and detected variables and the first render error. Otherwise it calls `render` and writes `result.output` to the configured output field; a failed render becomes a NodeOperationError (or continue-on-fail item) with the first diagnostic's message and location.

## HTTP API (`api/`)

`createServer(options?: { limits?, tokenEstimator?, maxBodyBytes? }): http.Server` and `listen(server, port = 0, host = "127.0.0.1")`; default host 127.0.0.1, `maxBodyBytes` 1 MiB.

| Route | Request body | Response (200) |
|---|---|---|
| POST /v1/render | `{template, data?, options?: {strictMode?, limits?}}` | RenderResult |
| POST /v1/validate | `{template}` | `{ok, diagnostics}` |
| POST /v1/analyze | `{template}` | analysis |
| GET /v1/spec | | spec() |
| GET /v1/openapi.json | | the committed `api/openapi.json` |

- Template problems are results, not HTTP errors: 200 with `ok: false` and diagnostics. An unparseable template on `/v1/analyze` gives 200 with empty variables, filters and blocks and the error in `diagnostics`.
- Malformed requests: 400 `{error: {code: "invalid-request", message}}` (bad JSON, non-object body, missing or non-string `template`, non-object `data`, `options` or `options.limits`, non-boolean `strictMode`, a limit that is not a non-negative integer); 404 `not-found`; 405 `method-not-allowed` with `Allow`; 413 `payload-too-large`; 415 `unsupported-media-type` when POST content-type is not JSON; 500 `internal-error` for an unexpected exception. All responses are JSON.
- Server option limits are the ceiling: a request may only lower a limit, never raise it above the server's (the effective value is the minimum). `validate` and `analyze` use the server's `maxDepth`.
- `api/openapi.json` is committed, OpenAPI 3.1, describes every route, request and response schema; a test proves its paths and methods equal the router's table.

## CLI (`cli/`, bin `template-resolver`)

`template-resolver <render|validate|analyze|spec|serve> [options]`

- `render <template-file|-> [--data <file|->] [--strict | --no-strict] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]`: prints output to stdout; diagnostics as `file:line:col: severity code: message` on stderr; exit 0 on ok, 1 on template errors, 2 on usage or I/O errors. With `--json` prints the full RenderResult to stdout (exit codes unchanged). Strict by default; limit flags set the render's limits directly.
- `validate <template-file|->`, `analyze <template-file|->`: print JSON; `validate` exits 1 when not ok; `analyze` of an unparseable template prints the diagnostic to stderr and exits 1.
- `spec`: prints the spec JSON. `serve [--port n] [--host h]`: starts the API with default server options (default 127.0.0.1:3000), prints `listening on http://host:port`, and on SIGINT or SIGTERM closes and exits 0; a port that cannot be bound exits 2.
- `-` reads stdin; only one input may be stdin. `--help` prints usage to stdout (exit 0); no arguments print usage to stderr (exit 2).

## Engine surface under render

- `TemplateError` (and its subclasses) carry a string `code` from the diagnostic codes above; `line` and `column` are always the failing node's position (1-based). Plain `Error`s thrown by filters or math are converted to `TemplateError` at the node that evaluates them (unknown filter: `unknown-filter`; bad parameters: `type-error`).
- `resolveTemplate(template, variables, { strictMode?, limits? })` accepts `limits`; exceeding one throws a `TemplateError` with code `limit-iterations`, `limit-output` or `limit-depth` located at the node that crossed it.
- `DEFAULT_LIMITS` and `withDefaultLimits` are exported from core.
````

### docs/living/architecture/language-contract.md

```
---
summary: "New language contract: filter registry and argument syntax first; later cards append their constructs"
state: built
---

# Language contract

<!-- Fill the summary with one sentence a reader can use to decide whether to open this document. State starts as planned; it becomes built when the work ships and validated only after a close review. -->

## Purpose

<!-- What this document is for and who reads it. Link to related documents, never copy them. Add the sections this kind of document needs below. -->

The contract for the template language beyond the prompt-aware constructs: filters, operators, CASE and FOR upgrades, SET, INPUT, macros and partials. It is written one card at a time; the first section is the filter registry. Settled decisions apply: [ADR 0001](../decisions/adr/0001-house-style-for-every-block.md) (paired blocks), [ADR 0003](../decisions/adr/0003-unknown-names-are-always-errors.md) (unknown names are errors in every mode). Companion: [prompt-aware-contract.md](prompt-aware-contract.md).

## Filters

- **One registry.** Every filter is one definition in one table: `name`, `params` (the signature text spec() shows), `description`, `paramNames` (the named parameters it accepts; the shorthand `name=value` is the parameter `value`) and `apply(input, params)`. render, `spec()`, `analyze` and `validate` read this table and nothing else; a filter added to it is accepted by all four. `spec()` shows only `name`, `params` and `description`.
- **Groups.** Core filters live in `filters.ts`; text filters and collection filters are added by later cards to `filters-text.ts` and `filters-collection.ts`, which the registry includes.
- **Values.** A filter receives the resolved value and returns a value; the text printed is the output step's text form of the final value. The existing filters coerce their input to text exactly as the output step does, so no existing output changes.
- **Arguments.** A filter call is written `name`, `name=value` or `name:key=value,key=value`. It is parsed once at parse time, respecting quotes: `fence="a=b"` and `fence="a:b"` keep the whole value. A parameter name the filter does not declare (`escape_md:mode=block`) is a `type-error` located at the variable (ADR 0003), in every mode.
- **Defaults.** A quote in a `??` default opens only when a value starts with it and closes; an unterminated quote is plain text and never hides the filters after it.
- **Static checks.** `validate` and `analyze` report an undeclared parameter as a `type-error` at the variable, the same code, position and wording as `render`.
- **Known gap.** `FILTERS` (exported for compatibility) is a snapshot of the registry names taken at load; code that needs the live list reads `FILTER_REGISTRY` or `spec()`.
```

## Frozen tests (read-only)

These test files are shown as committed at bde45031262c, the commit the contract is read at; the diff starts at base f4e552a71ebe, so a file added or changed since then is in the diff too. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/language/limits-nodes.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  DEFAULT_LIMITS,
  TemplateError,
  analyze,
  render,
  resolveTemplate,
  spec,
  validate,
  withDefaultLimits,
} from "../../core/src";
import { Limits, TemplateValue } from "../../core/src/types";
import { main } from "../../cli/main";
import { call, check, postJson, Running, start, stop } from "../headless/http-helpers";

// Every template that must render ok gets the data it needs, so strict mode never fails on a missing variable.
const DATA: Record<string, TemplateValue> = { a: "v", t: "x", xs: ["a"], v: "none" };

type Mode = "render-lenient" | "render-strict" | "validate" | "analyze" | "resolve";
const MODES: Mode[] = ["render-lenient", "render-strict", "validate", "analyze", "resolve"];

interface Outcome {
  /** "ok" or the diagnostic code; "threw:<name>" for any uncoded exception such as a RangeError */
  code: string;
  line?: number;
  column?: number;
  severity?: string;
  message?: string;
  suggestion?: string;
  output?: string;
  blocks?: Record<string, number | undefined>;
}

function fromError(e: unknown): Outcome {
  if (e instanceof TemplateError) {
    return {
      code: e.code,
      line: e.line,
      column: e.column,
      severity: "error",
      message: e.detail,
      suggestion: e.suggestion,
    };
  }
  return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}`, message: String((e as Error)?.message) };
}

function outcome(
  mode: Mode,
  template: string,
  limits?: Partial<Limits>,
  data: Record<string, TemplateValue> = DATA
): Outcome {
  try {
    if (mode === "render-lenient" || mode === "render-strict") {
      const r = render(template, data, { strictMode: mode === "render-strict", limits });
      if (r.ok) return { code: "ok", output: r.output };
      const d = r.diagnostics[0];
      return { code: d.code, line: d.line, column: d.column, severity: d.severity, message: d.message, suggestion: d.suggestion, output: r.output };
    }
    if (mode === "validate") {
      const r = validate(template, { limits });
      if (r.ok) return { code: "ok" };
      const d = r.diagnostics.find((x) => x.severity === "error") ?? r.diagnostics[0];
      return { code: d.code, line: d.line, column: d.column, severity: d.severity, message: d.message, suggestion: d.suggestion };
    }
    if (mode === "analyze") {
      const a = analyze(template, { limits });
      return { code: "ok", blocks: a.blocks };
    }
    const out = resolveTemplate(template, new Map(Object.entries(data)), { strictMode: true, limits });
    return { code: "ok", output: out };
  } catch (e) {
    return fromError(e);
  }
}

const vars = (n: number) => "${{a}}".repeat(n);
const nest = (n: number) => "{{IF t}}".repeat(n) + "x" + "{{END_IF}}".repeat(n);

describe("ln-limit: maxNodes is counted at parse and the crossing node is located", () => {
  interface Row {
    name: string;
    template: string;
    maxNodes: number;
    code: "ok" | "limit-nodes";
    line?: number;
    column?: number;
  }
  const rows: Row[] = [];
  for (const n of [1, 5, 20]) {
    rows.push({ name: `${n} adjacent variables fit exactly in ${n}`, template: vars(n), maxNodes: n, code: "ok" });
    rows.push({ name: `${n + 1} adjacent variables cross ${n} at column ${6 * n + 1}`, template: vars(n + 1), maxNodes: n, code: "limit-nodes", line: 1, column: 6 * n + 1 });
  }
  rows.push(
    { name: "a text run plus 3 variables fit in 4", template: "ab\n" + vars(3), maxNodes: 4, code: "ok" },
    { name: "the crossing variable on the second line is located on line 2 column 19", template: "ab\n" + vars(4), maxNodes: 4, code: "limit-nodes", line: 2, column: 19 },
    { name: "IF with one text child is two nodes and fits in 2", template: "{{IF t}}x{{END_IF}}", maxNodes: 2, code: "ok" },
    { name: "IF with one text child crosses 1 at the text (column 9)", template: "{{IF t}}x{{END_IF}}", maxNodes: 1, code: "limit-nodes", line: 1, column: 9 },
    { name: "IF with ELSEIF is four nodes and fits in 4", template: "{{IF t}}a{{ELSEIF t}}b{{END_IF}}", maxNodes: 4, code: "ok" },
    { name: "IF with ELSEIF crosses 3 at the ELSEIF body (column 22)", template: "{{IF t}}a{{ELSEIF t}}b{{END_IF}}", maxNodes: 3, code: "limit-nodes", line: 1, column: 22 },
    { name: "an ELSE adds no node: IF, text, text fit in 3", template: "{{IF t}}a{{ELSE}}b{{END_IF}}", maxNodes: 3, code: "ok" },
    { name: "a FOR body counts its children and fits in 3", template: "{{FOR xs AS i}}${{i}}${{i}}{{END_FOR}}", maxNodes: 3, code: "ok" },
    { name: "a FOR body counts its children: the second body variable crosses 2 (column 22)", template: "{{FOR xs AS i}}${{i}}${{i}}{{END_FOR}}", maxNodes: 2, code: "limit-nodes", line: 1, column: 22 },
    { name: "a TABLE row counts its cell content and fits in 3", template: "{{TABLE}}{{ROW}}${{a}}{{END_ROW}}{{END_TABLE}}", maxNodes: 3, code: "ok" },
    { name: "a TABLE row counts its cell content: the cell variable crosses 2 (column 17)", template: "{{TABLE}}{{ROW}}${{a}}{{END_ROW}}{{END_TABLE}}", maxNodes: 2, code: "limit-nodes", line: 1, column: 17 },
    { name: "maxNodes 0 accepts the empty template", template: "", maxNodes: 0, code: "ok" },
    { name: "maxNodes 0 rejects any text at 1:1", template: "x", maxNodes: 0, code: "limit-nodes", line: 1, column: 1 },
    { name: "the parse error wins over a later missing variable when the count crossed first", template: "${{missing}}${{a}}${{a}}", maxNodes: 2, code: "limit-nodes", line: 1, column: 19 }
  );
  const cases = MODES.flatMap((mode) => rows.map((row) => ({ mode, ...row })));

  it.each(cases)("ln-limit: [$mode] $name", (c) => {
    const o = outcome(c.mode, c.template, { maxNodes: c.maxNodes });
    check(o.code, `${c.mode}: code is ${c.code}`).toBe(c.code);
    if (c.code === "limit-nodes") {
      check({ line: o.line, column: o.column }, `${c.mode}: located at the crossing node`).toEqual({ line: c.line, column: c.column });
    }
  });

  it.each(MODES)("ln-limit: [%s] an absent limit means 20000: 20000 variables render, 20001 cross at column 120001", (mode) => {
    check(outcome(mode, vars(20000)).code, `${mode}: 20000 nodes are fine by default`).toBe("ok");
    const o = outcome(mode, vars(20001));
    check(o.code, `${mode}: node 20001 crosses the default limit`).toBe("limit-nodes");
    check({ line: o.line, column: o.column }, `${mode}: located at node 20001`).toEqual({ line: 1, column: 120001 });
  });

  it.each(MODES)("ln-limit: [%s] the diagnostic is an error with a message and a suggestion naming limits.maxNodes", (mode) => {
    const o = outcome(mode, vars(3), { maxNodes: 2 });
    check(o.code, `${mode}: limit-nodes`).toBe("limit-nodes");
    check(o.severity, `${mode}: severity error`).toBe("error");
    check((o.message ?? "").length, `${mode}: has a message`).toBeGreaterThan(0);
    check(o.suggestion ?? "", `${mode}: suggestion names the option`).toContain("limits.maxNodes");
  });

  it.each(["render-lenient", "render-strict"] as Mode[])("ln-limit: [%s] render returns ok false and an empty output and never throws", (mode) => {
    let result: ReturnType<typeof render> | undefined;
    expect(() => {
      result = render(vars(3), DATA, { strictMode: mode === "render-strict", limits: { maxNodes: 2 } });
    }).not.toThrow();
    check(result?.ok, "ok is false").toBe(false);
    check(result?.output, "output is empty").toBe("");
    check(result?.diagnostics[0]?.code, "first diagnostic is limit-nodes").toBe("limit-nodes");
  });

  it("ln-limit: validate reports ok false with the limit-nodes error diagnostic", () => {
    const r = validate(vars(3), { limits: { maxNodes: 2 } });
    check(r.ok, "validate is not ok").toBe(false);
    check(r.diagnostics.map((d) => `${d.severity}:${d.code}`), "validate lists the error").toContain("error:limit-nodes");
  });

  it.each([vars(7), "ab\n" + vars(6), "{{IF t}}a{{ELSEIF t}}b{{ELSEIF t}}c{{END_IF}}"])(
    "ln-limit: code and location are identical across render, validate and analyze for %#",
    (template) => {
      const all = MODES.map((m) => outcome(m, template, { maxNodes: 3 }));
      const first = { code: all[0].code, line: all[0].line, column: all[0].column };
      check(first.code, "render crosses the limit").toBe("limit-nodes");
      for (let i = 1; i < all.length; i++) {
        check({ code: all[i].code, line: all[i].line, column: all[i].column }, `${MODES[i]} equals render`).toEqual(first);
      }
    }
  );

  const existing = [
    { name: "maxDepth keeps limit-depth", template: "{{IF t}}{{IF t}}x{{END_IF}}{{END_IF}}", limits: { maxDepth: 1, maxNodes: 100 }, code: "limit-depth", modes: MODES },
    { name: "maxIterations keeps limit-iterations", template: "{{FOR xs AS i}}${{i}}{{END_FOR}}", limits: { maxIterations: 0, maxNodes: 100 }, code: "limit-iterations", modes: ["render-lenient", "render-strict", "resolve"] as Mode[] },
    { name: "maxOutputChars keeps limit-output", template: "abcdefghij", limits: { maxOutputChars: 5, maxNodes: 100 }, code: "limit-output", modes: ["render-lenient", "render-strict", "resolve"] as Mode[] },
  ].flatMap((r) => r.modes.map((mode) => ({ ...r, mode })));
  it.each(existing)("ln-limit: [$mode] $name next to maxNodes", (c) => {
    check(outcome(c.mode, c.template, c.limits).code, `${c.mode}: ${c.code}`).toBe(c.code);
  });
});

describe("ln-elseif: long chains and deep nesting never overflow the stack", () => {
  const chain = (n: number, body: (i: number) => string, tail = "") =>
    Array.from({ length: n }, (_, i) => `{{${i === 0 ? "IF" : "ELSEIF"} v == "${i}"}}${body(i)}`).join("") + tail + "{{END_IF}}";

  it.each(MODES)("ln-elseif: [%s] an ELSEIF chain of 20000 branches gives limit-nodes, no RangeError, no thrown render", (mode) => {
    const o = outcome(mode, "{{IF t}}a" + "{{ELSEIF t}}b".repeat(20000) + "{{END_IF}}");
    check(o.code, `${mode}: limit-nodes`).toBe("limit-nodes");
  });

  it.each(MODES)("ln-elseif: [%s] 30000 variables give limit-nodes", (mode) => {
    check(outcome(mode, vars(30000)).code, `${mode}: limit-nodes`).toBe("limit-nodes");
  });

  it.each(MODES)("ln-elseif: [%s] an empty-body chain of 19000 branches is under the limit and is ok without a RangeError", (mode) => {
    const o = outcome(mode, "{{IF t}}" + "{{ELSEIF t}}".repeat(19000) + "{{END_IF}}");
    check(o.code, `${mode}: ok`).toBe("ok");
  });

  const sizes = [5000, 8000];
  const matches = sizes.flatMap((n) => MODES.map((mode) => ({ n, mode, hit: Math.floor(n / 2) })));
  it.each(matches)("ln-elseif: [$mode] a chain of $n branches renders the one true branch ($hit) and analyzes ok", (c) => {
    const t = chain(c.n, (i) => `b${i}`);
    const o = outcome(c.mode, t, undefined, { ...DATA, v: String(c.hit) });
    check(o.code, `${c.mode}: ok`).toBe("ok");
    if (c.mode !== "analyze" && c.mode !== "validate") {
      check(o.output, `${c.mode}: the first true branch body`).toBe(`b${c.hit}`);
    }
    if (c.mode === "analyze") check(o.blocks?.IF, "analyze counts one IF block").toBe(1);
  });

  it.each(["render-lenient", "render-strict", "resolve"] as Mode[])("ln-elseif: [%s] a chain of 3000 branches ending in ELSE renders the else text when none match", (mode) => {
    const t = chain(3000, (i) => `b${i}`, "{{ELSE}}fallback");
    check(outcome(mode, t).output, `${mode}: else text`).toBe("fallback");
  });

  it.each(["render-lenient", "render-strict", "resolve"] as Mode[])("ln-elseif: [%s] 40 nested IF blocks give limit-depth by default at the 33rd tag", (mode) => {
    const o = outcome(mode, nest(40));
    check(o.code, `${mode}: limit-depth, not a RangeError`).toBe("limit-depth");
    check({ line: o.line, column: o.column }, `${mode}: the 33rd opening tag`).toEqual({ line: 1, column: 8 * 32 + 1 });
  });

  it.each(MODES)("ln-elseif: [%s] 5000 nested IF blocks give a coded limit-depth", (mode) => {
    const o = outcome(mode, nest(5000));
    check(o.code, `${mode}: coded limit-depth`).toBe("limit-depth");
  });
});

describe("ln-analyze: analyze applies the caller limits, else the defaults", () => {
  it.each([40, 200])("ln-analyze: %i nested IF blocks return an analysis with that many IF blocks", (n) => {
    const o = outcome("analyze", nest(n));
    check(o.code, "analysis returned, no limit-depth").toBe("ok");
    check(o.blocks?.IF, "IF block count equals the nesting").toBe(n);
  });

  it("ln-analyze: 1000 nested IF blocks throw a TemplateError limit-depth, not a RangeError", () => {
    const o = outcome("analyze", nest(1000));
    check(o.code, "coded limit-depth").toBe("limit-depth");
  });

  it("ln-analyze: a caller maxDepth of 5 passes 5 nested blocks and fails the 6th at its opening tag", () => {
    check(outcome("analyze", nest(5), { maxDepth: 5 }).code, "5 nested pass").toBe("ok");
    const o = outcome("analyze", nest(6), { maxDepth: 5 });
    check(o.code, "6 nested fail").toBe("limit-depth");
    check({ line: o.line, column: o.column }, "located at the 6th tag").toEqual({ line: 1, column: 8 * 5 + 1 });
  });

  it("ln-analyze: a caller maxNodes of 3 applies to analyze", () => {
    const o = outcome("analyze", nest(40), { maxNodes: 3 });
    check(o.code, "limit-nodes").toBe("limit-nodes");
    check({ line: o.line, column: o.column }, "the fourth node").toEqual({ line: 1, column: 8 * 3 + 1 });
  });

  it("ln-analyze: a caller maxNodes leaves maxDepth unset, so 40 nested blocks still pass with a large maxNodes", () => {
    check(outcome("analyze", nest(40), { maxNodes: 100 }).code, "no depth failure").toBe("ok");
  });

  it("ln-analyze: validate of 40 nested blocks is ok", () => {
    check(outcome("validate", nest(40)).code, "validate ok").toBe("ok");
  });

  it("ln-analyze: render keeps the default depth 32 and fails 40 nested blocks at the 33rd tag", () => {
    const o = outcome("render-strict", nest(40));
    check(o.code, "limit-depth").toBe("limit-depth");
    check({ line: o.line, column: o.column }, "33rd tag").toEqual({ line: 1, column: 8 * 32 + 1 });
  });
});

describe("ln-surfaces: API, CLI and OpenAPI carry maxNodes", () => {
  let running: Running | undefined;
  afterEach(async () => {
    await stop(running);
    running = undefined;
  });
  async function up(limits?: Partial<Limits>): Promise<Running> {
    running = await start(limits ? { limits } : undefined);
    return running;
  }
  const codes = (r: { json: any }): string[] => (r.json?.diagnostics ?? []).map((d: any) => d.code);

  it("ln-surfaces: a request maxNodes of 5 lowers the server's 10 and 6 variables fail", async () => {
    const r = await postJson(await up({ maxNodes: 10 }), "/v1/render", { template: vars(6), data: DATA, options: { limits: { maxNodes: 5 } } });
    check(r.status, "200").toBe(200);
    check(r.json?.ok, "ok false").toBe(false);
    check(codes(r), "limit-nodes reported").toContain("limit-nodes");
  });

  it.each([
    { name: "a request value of 50 is capped at the server's 10: 11 fail", n: 11, options: { limits: { maxNodes: 50 } }, ok: false },
    { name: "a request value of 50 is capped at the server's 10: 10 pass", n: 10, options: { limits: { maxNodes: 50 } }, ok: true },
    { name: "a request without it uses the server's 10: 11 fail", n: 11, options: undefined, ok: false },
    { name: "a request without it uses the server's 10: 10 pass", n: 10, options: undefined, ok: true },
  ])("ln-surfaces: $name", async (c) => {
    const r = await postJson(await up({ maxNodes: 10 }), "/v1/render", { template: vars(c.n), data: DATA, options: c.options });
    check(r.status, "200").toBe(200);
    check(r.json?.ok, `ok is ${c.ok}`).toBe(c.ok);
    if (!c.ok) check(codes(r), "limit-nodes reported").toContain("limit-nodes");
  });

  it.each([-1, 1.5, "3"])("ln-surfaces: options.limits.maxNodes of %p is a 400 invalid-request naming maxNodes", async (value) => {
    const r = await postJson(await up(), "/v1/render", { template: "x", options: { limits: { maxNodes: value } } });
    check(r.status, "400").toBe(400);
    check(r.json?.error?.code, "invalid-request").toBe("invalid-request");
    check(String(r.json?.error?.message), "message names maxNodes").toContain("maxNodes");
  });

  it("ln-surfaces: POST /v1/validate applies the server maxNodes", async () => {
    const r = await postJson(await up({ maxNodes: 10 }), "/v1/validate", { template: vars(11) });
    check(r.json?.ok, "ok false").toBe(false);
    check(
      (r.json?.diagnostics ?? []).map((d: any) => `${d.severity}:${d.code}`),
      "limit-nodes error diagnostic"
    ).toContain("error:limit-nodes");
  });

  it("ln-surfaces: POST /v1/analyze applies the server maxNodes and answers with the analysis diagnostic shape", async () => {
    const r = await postJson(await up({ maxNodes: 10 }), "/v1/analyze", { template: vars(11) });
    check(r.status, "200").toBe(200);
    check(r.json?.variables, "no variables").toEqual([]);
    check(r.json?.filters, "no filters").toEqual([]);
    check(r.json?.blocks, "no blocks").toEqual({});
    check(r.json?.diagnostics?.length, "one diagnostic").toBe(1);
    const d = r.json.diagnostics[0];
    check({ code: d.code, line: d.line, column: d.column, hasMessage: typeof d.message === "string" }, "diagnostic shape").toEqual({
      code: "limit-nodes",
      line: 1,
      column: 61,
      hasMessage: true,
    });
  });

  describe("cli", () => {
    let dir: string;
    beforeAll(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-nodes-"));
    });
    afterAll(() => {
      fs.rmSync(dir, { recursive: true, force: true });
    });
    const file = (name: string, content: string) => {
      const p = path.join(dir, name);
      fs.writeFileSync(p, content);
      return p;
    };
    async function run(argv: string[]) {
      const r = { code: -1, out: "", err: "" };
      r.code = await main(argv, {
        readStdin: async () => "",
        stdout: (t) => {
          r.out += t;
        },
        stderr: (t) => {
          r.err += t;
        },
      });
      return r;
    }

    it("ln-surfaces: render --max-nodes 3 with 4 variables exits 1 with a located limit-nodes line on stderr", async () => {
      const t = file("n4.txt", vars(4));
      const d = file("n4.json", JSON.stringify({ a: "v" }));
      const r = await run(["render", t, "--data", d, "--max-nodes", "3"]);
      check(r.code, "exit 1").toBe(1);
      check(r.err, "stderr names code, line and column").toMatch(/:1:19: error limit-nodes:/);
    });

    it("ln-surfaces: render --max-nodes 4 with 4 variables exits 0", async () => {
      const t = file("n4b.txt", vars(4));
      const d = file("n4b.json", JSON.stringify({ a: "v" }));
      const r = await run(["render", t, "--data", d, "--max-nodes", "4"]);
      check({ code: r.code, out: r.out }, "exit 0 and the output").toEqual({ code: 0, out: "vvvv" });
    });

    it.each(["abc", "-1", "1.5"])("ln-surfaces: --max-nodes %s exits 2 with the non-negative integer message naming the flag", async (value) => {
      const t = file("n4c.txt", "x");
      const r = await run(["render", t, "--max-nodes", value]);
      check(r.code, "exit 2").toBe(2);
      check(r.err, "message names the flag and the rule").toContain("--max-nodes must be a non-negative integer");
    });

    it("ln-surfaces: --json carries the limit-nodes diagnostic", async () => {
      const t = file("n4d.txt", vars(4));
      const d = file("n4d.json", JSON.stringify({ a: "v" }));
      const r = await run(["render", t, "--data", d, "--max-nodes", "3", "--json"]);
      const result = r.out ? JSON.parse(r.out) : { diagnostics: [{}] };
      check(result.ok, "ok false").toBe(false);
      check(result.diagnostics[0].code, "limit-nodes").toBe("limit-nodes");
    });

    it("ln-surfaces: the usage text printed for --help names --max-nodes", async () => {
      const r = await run(["--help"]);
      check(r.out, "usage lists --max-nodes").toContain("--max-nodes");
    });

    it("ln-surfaces: analyze of a 40-deep nested template exits 0", async () => {
      const r = await run(["analyze", file("deep.txt", nest(40))]);
      check(r.code, "exit 0").toBe(0);
    });
  });

  describe("openapi and spec", () => {
    const doc = () => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "api", "openapi.json"), "utf8"));

    it("ln-surfaces: Limits lists maxNodes as a required integer with minimum 0", () => {
      const limits = doc().components.schemas.Limits;
      check(limits.properties.maxNodes?.type, "type integer").toBe("integer");
      check(limits.properties.maxNodes?.minimum, "minimum 0").toBe(0);
      check(limits.required, "required").toContain("maxNodes");
    });

    it("ln-surfaces: RequestLimits lists maxNodes", () => {
      check(doc().components.schemas.RequestLimits.properties.maxNodes, "present").toBeDefined();
    });

    const expected = { maxIterations: 10000, maxOutputChars: 1000000, maxDepth: 32, maxNodes: 20000 };
    it("ln-surfaces: spec().limits and GET /v1/spec equal the defaults with maxNodes 20000", async () => {
      check(spec().limits, "spec().limits").toEqual(expected);
      const r = await call(await up(), "GET", "/v1/spec");
      check(r.json?.limits, "GET /v1/spec limits").toEqual(expected);
    });

    it("ln-surfaces: DEFAULT_LIMITS.maxNodes is 20000 and withDefaultLimits fills or keeps it", () => {
      check(DEFAULT_LIMITS.maxNodes, "default").toBe(20000);
      check(withDefaultLimits({}).maxNodes, "filled").toBe(20000);
      check(withDefaultLimits({ maxNodes: 7 }).maxNodes, "kept").toBe(7);
    });
  });
});
```

## 4. Diff

22 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

Delta documents shown below as the card's own deliverables: docs/ephemeral/cycles/language/deltas/node-limit-1.md, docs/ephemeral/cycles/language/deltas/node-limit-2.md, docs/ephemeral/cycles/language/deltas/node-limit-3.md, docs/ephemeral/cycles/language/deltas/node-limit-4.md.

````diff
diff --git a/api/openapi.json b/api/openapi.json
index 9bf9e01..4d89d19 100644
--- a/api/openapi.json
+++ b/api/openapi.json
@@ -190,7 +190,8 @@
         "required": [
           "maxIterations",
           "maxOutputChars",
-          "maxDepth"
+          "maxDepth",
+          "maxNodes"
         ],
         "properties": {
           "maxIterations": {
@@ -207,6 +208,11 @@
             "type": "integer",
             "minimum": 0,
             "description": "Nesting of blocks"
+          },
+          "maxNodes": {
+            "type": "integer",
+            "minimum": 0,
+            "description": "Total nodes in the parsed template"
           }
         }
       },
@@ -225,6 +231,10 @@
           "maxDepth": {
             "type": "integer",
             "minimum": 0
+          },
+          "maxNodes": {
+            "type": "integer",
+            "minimum": 0
           }
         }
       },
diff --git a/api/routes.ts b/api/routes.ts
index 4ccb4b1..8a24ca0 100644
--- a/api/routes.ts
+++ b/api/routes.ts
@@ -64,13 +64,13 @@ function renderRoute(body: Record<string, unknown>, context: RouteContext): unkn
 }
 
 function validateRoute(body: Record<string, unknown>, context: RouteContext): unknown {
-  return validate(requireTemplate(body), { limits: { maxDepth: context.limits.maxDepth } });
+  return validate(requireTemplate(body), { limits: context.limits });
 }
 
 function analyzeRoute(body: Record<string, unknown>, context: RouteContext): TemplateAnalysis {
   const template = requireTemplate(body);
   try {
-    return analyze(template, { limits: { maxDepth: context.limits.maxDepth } });
+    return analyze(template, { limits: context.limits });
   } catch (error) {
     if (!(error instanceof TemplateError)) throw error;
     return {
diff --git a/cli/main.ts b/cli/main.ts
index a79841f..43c6387 100644
--- a/cli/main.ts
+++ b/cli/main.ts
@@ -15,7 +15,8 @@ const USAGE = `Usage: template-resolver <command> [options]
 Commands:
   render <template-file|-> [--data <file|->] [--strict | --no-strict]
          [--standalone-lines | --no-standalone-lines]
-         [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]
+         [--max-iterations n] [--max-output-chars n] [--max-depth n]
+         [--max-nodes n] [--json]
       Render a template and print the output. A line holding only block tags
       is removed by default; --no-standalone-lines keeps it.
   validate <template-file|->   Check a template; prints {ok, diagnostics} as JSON.
@@ -46,6 +47,7 @@ const COMMAND_OPTIONS: Record<string, Options> = {
     "max-iterations": { type: "string" },
     "max-output-chars": { type: "string" },
     "max-depth": { type: "string" },
+    "max-nodes": { type: "string" },
     json: { type: "boolean" },
   },
   validate: {},
@@ -96,13 +98,30 @@ export async function main(argv: string[], io: CliIo): Promise<number> {
 
 function parseCommand(args: string[], options: Options): { values: Values; positionals: string[] } {
   try {
-    const { values, positionals } = parseArgs({ args, options, allowPositionals: true, strict: true });
+    const { values, positionals } = parseArgs({
+      args: joinNegativeValues(args, options),
+      options,
+      allowPositionals: true,
+      strict: true,
+    });
     return { values: values as Values, positionals };
   } catch (error) {
     throw new UsageError(error.message);
   }
 }
 
+/** parseArgs rejects "--flag -1" as ambiguous; "--flag=-1" lets parseCount name the flag. */
+function joinNegativeValues(args: string[], options: Options): string[] {
+  const joined: string[] = [];
+  for (const arg of args) {
+    const previous = joined[joined.length - 1];
+    const flag = previous?.startsWith("--") ? options?.[previous.slice(2)] : undefined;
+    if (flag?.type === "string" && /^-\d/.test(arg)) joined[joined.length - 1] = `${previous}=${arg}`;
+    else joined.push(arg);
+  }
+  return joined;
+}
+
 function oneInput(positionals: string[]): string {
   if (positionals.length !== 1) throw new UsageError("expected one template file or '-'");
   return positionals[0];
@@ -191,6 +210,7 @@ function parseLimits(values: Values): Partial<Limits> {
     ["max-iterations", "maxIterations"],
     ["max-output-chars", "maxOutputChars"],
     ["max-depth", "maxDepth"],
+    ["max-nodes", "maxNodes"],
   ];
   const limits: Partial<Limits> = {};
   for (const [flag, key] of flags) {
diff --git a/core/src/analyze.ts b/core/src/analyze.ts
index df97869..98b52f5 100644
--- a/core/src/analyze.ts
+++ b/core/src/analyze.ts
@@ -75,6 +75,9 @@ export interface TemplateAnalysis {
   diagnostics: AnalysisDiagnostic[];
 }
 
+/** Nesting bound for analyze when the caller sets no maxDepth */
+const ANALYZE_MAX_DEPTH = 256;
+
 /**
  * Report the variables a template reads and the filters it applies, derived
  * from the parsed template. Loop item names (inside their loop) and
@@ -85,7 +88,8 @@ export function analyze(
   options?: { limits?: Partial<Limits> }
 ): TemplateAnalysis {
   const ast = new Parser(new Lexer(template).tokenize(), {
-    maxDepth: options?.limits?.maxDepth,
+    maxDepth: options?.limits?.maxDepth ?? ANALYZE_MAX_DEPTH,
+    maxNodes: options?.limits?.maxNodes,
   }).parse();
   const walker = new Walker();
   walker.visitAll(ast.body);
@@ -198,10 +202,17 @@ class Walker {
   }
 
   private visitIf(node: IfNode, kind: "if" | "elseif"): void {
-    this.visitCondition(node.condition, kind, node);
-    this.visitAll(node.consequent);
-    if (Array.isArray(node.alternate)) this.visitAll(node.alternate);
-    else if (node.alternate) this.visitIf(node.alternate, "elseif");
+    let branch = node;
+    let branchKind = kind;
+    for (;;) {
+      this.visitCondition(branch.condition, branchKind, branch);
+      this.visitAll(branch.consequent);
+      const { alternate } = branch;
+      if (Array.isArray(alternate)) return this.visitAll(alternate);
+      if (!alternate) return;
+      branch = alternate;
+      branchKind = "elseif";
+    }
   }
 
   private visitCase(node: CaseNode): void {
diff --git a/core/src/interpreter.ts b/core/src/interpreter.ts
index 9a8a589..623e7b9 100644
--- a/core/src/interpreter.ts
+++ b/core/src/interpreter.ts
@@ -235,25 +235,23 @@ export class Interpreter {
    * Visit IF node
    */
   private visitIf(node: IfNode): string {
-    const result = this.at(node, () =>
-      evaluateCondition(node.condition, this.getAllVariables())
-    );
+    let branch = node;
+    for (;;) {
+      const current = branch;
+      const result = this.at(current, () =>
+        evaluateCondition(current.condition, this.getAllVariables())
+      );
+      if (result) return this.visitBody(current.consequent);
 
-    if (result) {
-      return node.consequent.map((child) => this.visit(child)).join("");
-    }
-
-    if (node.alternate) {
-      if (Array.isArray(node.alternate)) {
-        // ELSE branch
-        return node.alternate.map((child) => this.visit(child)).join("");
-      } else {
-        // ELSEIF (nested IfNode)
-        return this.visitIf(node.alternate);
-      }
+      const { alternate } = current;
+      if (!alternate) return "";
+      if (Array.isArray(alternate)) return this.visitBody(alternate);
+      branch = alternate;
     }
+  }
 
-    return "";
+  private visitBody(nodes: ASTNode[]): string {
+    return nodes.map((child) => this.visit(child)).join("");
   }
 
   /**
diff --git a/core/src/parser.ts b/core/src/parser.ts
index 41e5bc0..7002a44 100644
--- a/core/src/parser.ts
+++ b/core/src/parser.ts
@@ -37,13 +37,16 @@ const VARIABLE_PATH = /^[A-Za-z_@][\w@]*(\.[\w@]+)*$/;
 export class Parser {
   private pos = 0;
   private depth = 0;
+  private nodes = 0;
   private readonly maxDepth: number;
+  private readonly maxNodes: number;
 
   constructor(
     private tokens: Token[],
-    options?: { maxDepth?: number }
+    options?: { maxDepth?: number; maxNodes?: number }
   ) {
     this.maxDepth = options?.maxDepth ?? DEFAULT_LIMITS.maxDepth;
+    this.maxNodes = options?.maxNodes ?? DEFAULT_LIMITS.maxNodes;
   }
 
   /**
@@ -135,7 +138,7 @@ export class Parser {
    * Parse text node
    */
   private parseText(): TextNode {
-    const token = this.consume(TokenType.TEXT);
+    const token = this.open(TokenType.TEXT);
     return {
       type: "Text",
       content: token.value,
@@ -148,7 +151,7 @@ export class Parser {
    * Parse variable: ${{name}}, ${{user.name | filter}}
    */
   private parseVariable(): VariableNode {
-    const token = this.consume(TokenType.VARIABLE);
+    const token = this.open(TokenType.VARIABLE);
     const parts = this.parseVariableExpression(token.value);
 
     return {
@@ -253,15 +256,31 @@ export class Parser {
 
   /**
    * Parse IF block: {{IF condition}}...{{ELSEIF}}...{{ELSE}}...{{END_IF}}
+   * ELSEIF branches nest in the alternate of the branch before them and are
+   * parsed in a loop, so a long chain does not deepen the call stack.
    */
   private parseIf(): IfNode {
-    const token = this.consume(TokenType.IF);
-    const condition = this.extractCondition(token.value);
+    const root = this.parseIfBranch(TokenType.IF);
+    let last = root;
+    while (this.check(TokenType.ELSEIF)) {
+      const branch = this.parseIfBranch(TokenType.ELSEIF);
+      last.alternate = branch;
+      last = branch;
+    }
+    if (this.check(TokenType.ELSE)) last.alternate = this.parseElse(last);
 
+    this.consume(TokenType.END_IF);
+    return root;
+  }
+
+  /**
+   * Parse the head and body of an IF or ELSEIF branch, up to the next
+   * ELSEIF, ELSE or END_IF
+   */
+  private parseIfBranch(type: TokenType.IF | TokenType.ELSEIF): IfNode {
+    const token = this.open(type);
     const consequent: ASTNode[] = [];
-    let alternate: ASTNode[] | IfNode | null = null;
 
-    // Parse consequent (true branch)
     while (
       !this.check(TokenType.ELSEIF) &&
       !this.check(TokenType.ELSE) &&
@@ -269,7 +288,9 @@ export class Parser {
     ) {
       if (this.isAtEnd()) {
         throw new SyntaxError(
-          `Unclosed {{IF}} block starting at line ${token.line}`,
+          type === TokenType.IF
+            ? `Unclosed {{IF}} block starting at line ${token.line}`
+            : "Unclosed {{ELSEIF}} block",
           token.line,
           token.column,
           "Add {{END_IF}}"
@@ -279,162 +300,42 @@ export class Parser {
       if (node) consequent.push(node);
     }
 
-    // Parse ELSEIF/ELSE
-    if (this.check(TokenType.ELSEIF)) {
-      // ELSEIF becomes nested IfNode
-      const elseIfToken = this.consume(TokenType.ELSEIF);
-      const elseIfCondition = this.extractCondition(elseIfToken.value);
-
-      // Create nested IF node
-      const nestedIf: IfNode = {
-        type: "If",
-        condition: elseIfCondition,
-        consequent: [],
-        alternate: null,
-        line: elseIfToken.line,
-        column: elseIfToken.column,
-      };
-
-      // Parse ELSEIF body
-      while (
-        !this.check(TokenType.ELSEIF) &&
-        !this.check(TokenType.ELSE) &&
-        !this.check(TokenType.END_IF)
-      ) {
-        if (this.isAtEnd()) {
-          throw new SyntaxError(
-            "Unclosed {{ELSEIF}} block",
-            elseIfToken.line,
-            elseIfToken.column,
-            "Add {{END_IF}}"
-          );
-        }
-        const node = this.parseNode();
-        if (node) nestedIf.consequent.push(node);
-      }
-
-      // Check for more ELSEIF or ELSE
-      if (this.check(TokenType.ELSEIF) || this.check(TokenType.ELSE)) {
-        // Recursively handle more branches
-        if (this.check(TokenType.ELSEIF)) {
-          this.consume(TokenType.ELSEIF);
-          // Put token back and recurse
-          this.pos--;
-          // Parse as new IF starting from ELSEIF
-          const recursiveIf = this.parseElseIf();
-          nestedIf.alternate = recursiveIf;
-        } else {
-          // ELSE after ELSEIF
-          this.consume(TokenType.ELSE);
-          const elseBody: ASTNode[] = [];
-          while (!this.check(TokenType.END_IF)) {
-            if (this.isAtEnd()) {
-              throw new SyntaxError(
-                "Unclosed {{ELSE}} block",
-                token.line,
-                token.column,
-                "Add {{END_IF}}"
-              );
-            }
-            const node = this.parseNode();
-            if (node) elseBody.push(node);
-          }
-          nestedIf.alternate = elseBody;
-        }
-      }
-
-      alternate = nestedIf;
-    } else if (this.check(TokenType.ELSE)) {
-      this.consume(TokenType.ELSE);
-      alternate = [];
-      while (!this.check(TokenType.END_IF)) {
-        if (this.isAtEnd()) {
-          throw new SyntaxError(
-            "Unclosed {{ELSE}} block",
-            token.line,
-            token.column,
-            "Add {{END_IF}}"
-          );
-        }
-        const node = this.parseNode();
-        if (node) (alternate as ASTNode[]).push(node);
-      }
-    }
-
-    this.consume(TokenType.END_IF);
-
     return {
       type: "If",
-      condition,
+      condition: this.extractCondition(token.value),
       consequent,
-      alternate,
+      alternate: null,
       line: token.line,
       column: token.column,
     };
   }
 
   /**
-   * Helper to parse ELSEIF as nested IF
+   * Parse the ELSE body of a branch, up to END_IF
    */
-  private parseElseIf(): IfNode {
-    const token = this.consume(TokenType.ELSEIF);
-    const condition = this.extractCondition(token.value);
-
-    const consequent: ASTNode[] = [];
-
-    while (
-      !this.check(TokenType.ELSEIF) &&
-      !this.check(TokenType.ELSE) &&
-      !this.check(TokenType.END_IF)
-    ) {
+  private parseElse(branch: IfNode): ASTNode[] {
+    this.consume(TokenType.ELSE);
+    const body: ASTNode[] = [];
+    while (!this.check(TokenType.END_IF)) {
       if (this.isAtEnd()) {
         throw new SyntaxError(
-          "Unclosed {{ELSEIF}} block",
-          token.line,
-          token.column,
+          "Unclosed {{ELSE}} block",
+          branch.line,
+          branch.column,
           "Add {{END_IF}}"
         );
       }
       const node = this.parseNode();
-      if (node) consequent.push(node);
-    }
-
-    let alternate: ASTNode[] | IfNode | null = null;
-
-    if (this.check(TokenType.ELSEIF)) {
-      alternate = this.parseElseIf();
-    } else if (this.check(TokenType.ELSE)) {
-      this.consume(TokenType.ELSE);
-      alternate = [];
-      while (!this.check(TokenType.END_IF)) {
-        if (this.isAtEnd()) {
-          throw new SyntaxError(
-            "Unclosed {{ELSE}} block",
-            token.line,
-            token.column,
-            "Add {{END_IF}}"
-          );
-        }
-        const node = this.parseNode();
-        if (node) (alternate as ASTNode[]).push(node);
-      }
+      if (node) body.push(node);
     }
-
-    return {
-      type: "If",
-      condition,
-      consequent,
-      alternate,
-      line: token.line,
-      column: token.column,
-    };
+    return body;
   }
 
   /**
    * Parse CASE block: {{CASE var}}{{WHEN "val"}}...{{END_WHEN}}{{DEFAULT}}...{{END_CASE}}
    */
   private parseCase(): CaseNode {
-    const token = this.consume(TokenType.CASE);
+    const token = this.open(TokenType.CASE);
     const expression = this.extractExpression(token.value);
 
     const cases: WhenNode[] = [];
@@ -493,7 +394,7 @@ export class Parser {
    * Parse WHEN clause
    */
   private parseWhen(): WhenNode {
-    const token = this.consume(TokenType.WHEN);
+    const token = this.open(TokenType.WHEN);
     const value = this.extractQuotedValue(token.value);
 
     const body: ASTNode[] = [];
@@ -534,7 +435,7 @@ export class Parser {
    * Parse DEFAULT clause
    */
   private parseDefault(): DefaultNode {
-    const token = this.consume(TokenType.DEFAULT);
+    const token = this.open(TokenType.DEFAULT);
 
     const body: ASTNode[] = [];
     while (!this.check(TokenType.END_DEFAULT)) {
@@ -569,7 +470,7 @@ export class Parser {
    * Parse FOR loop: {{FOR items AS item}}...{{END_FOR}}
    */
   private parseFor(): ForNode {
-    const token = this.consume(TokenType.FOR);
+    const token = this.open(TokenType.FOR);
     const { iterable, itemName } = this.parseForExpression(token.value);
 
     const body: ASTNode[] = [];
@@ -628,7 +529,7 @@ export class Parser {
    * Parse SECTION: {{SECTION "Title" level=2 skip_empty=false}}...{{END_SECTION}}
    */
   private parseSection(): SectionNode {
-    const token = this.consume(TokenType.SECTION);
+    const token = this.open(TokenType.SECTION);
     const { title, level, skipEmpty } = this.parseSectionArguments(token);
 
     const body: ASTNode[] = [];
@@ -725,7 +626,7 @@ export class Parser {
    * Parse FENCE: {{FENCE lang="md"}}...{{END_FENCE}}
    */
   private parseFence(): FenceNode {
-    const token = this.consume(TokenType.FENCE);
+    const token = this.open(TokenType.FENCE);
     const lang = this.parseFenceLang(token);
 
     const body: ASTNode[] = [];
@@ -791,7 +692,7 @@ export class Parser {
    * Parse LIST: {{LIST}}{{LIST_ITEM}}...{{END_LIST_ITEM}}{{END_LIST}}
    */
   private parseList(): ListNode {
-    const token = this.consume(TokenType.LIST);
+    const token = this.open(TokenType.LIST);
     const items: ListItemNode[] = [];
 
     while (!this.check(TokenType.END_LIST)) {
@@ -843,7 +744,7 @@ export class Parser {
    * Parse LIST_ITEM
    */
   private parseListItem(): ListItemNode {
-    const token = this.consume(TokenType.LIST_ITEM);
+    const token = this.open(TokenType.LIST_ITEM);
 
     // Parse optional condition and fallback
     const { condition, fallback } = this.parseListItemAttributes(token.value);
@@ -901,7 +802,7 @@ export class Parser {
    * Parse TABLE: {{TABLE}}{{HEADER}}...{{ROW}}...{{END_TABLE}}
    */
   private parseTable(): TableNode {
-    const token = this.consume(TokenType.TABLE);
+    const token = this.open(TokenType.TABLE);
     const alignment = this.parseTableAlignment(token.value);
 
     let header: TableHeaderNode | null = null;
@@ -923,6 +824,7 @@ export class Parser {
         rows.push(this.parseTableRow());
       } else if (this.check(TokenType.FOR)) {
         // Allow FOR loops to generate rows
+        this.count(this.current());
         const forNode = this.nested(() => this.parseFor());
 
         // Wrap in a special TableRowNode
@@ -982,7 +884,7 @@ export class Parser {
    * Parse table header
    */
   private parseTableHeader(): TableHeaderNode {
-    const token = this.consume(TokenType.HEADER);
+    const token = this.open(TokenType.HEADER);
 
     const content: ASTNode[] = [];
 
@@ -1015,7 +917,7 @@ export class Parser {
    * Parse table row
    */
   private parseTableRow(): TableRowNode {
-    const token = this.consume(TokenType.ROW);
+    const token = this.open(TokenType.ROW);
 
     const content: ASTNode[] = [];
 
@@ -1097,7 +999,7 @@ export class Parser {
    * Parse comment (excluded from output)
    */
   private parseComment(): CommentNode {
-    const token = this.consume(TokenType.COMMENT);
+    const token = this.open(TokenType.COMMENT);
     return {
       type: "Comment",
       content: token.value,
@@ -1152,6 +1054,29 @@ export class Parser {
     return this.tokens[this.pos - 1];
   }
 
+  /**
+   * Consume the opening token of a node, counting the node against maxNodes
+   */
+  private open(type: TokenType): Token {
+    const token = this.consume(type);
+    this.count(token);
+    return token;
+  }
+
+  /**
+   * Count one node, failing at its opening token once maxNodes is crossed
+   */
+  private count(token: Token): void {
+    if (++this.nodes <= this.maxNodes) return;
+    throw new LimitError(
+      "limit-nodes",
+      `Template exceeds the maximum of ${this.maxNodes} nodes`,
+      token.line,
+      token.column,
+      "Shorten the template or raise limits.maxNodes"
+    );
+  }
+
   /**
    * Consume expected token type or throw error
    */
diff --git a/core/src/render.ts b/core/src/render.ts
index d604990..9c6c184 100644
--- a/core/src/render.ts
+++ b/core/src/render.ts
@@ -73,7 +73,10 @@ export function render(
     const tokens = new Lexer(template, {
       standaloneLines: options?.standaloneLines ?? true,
     }).tokenize();
-    const ast = new Parser(tokens, { maxDepth: limits.maxDepth }).parse();
+    const ast = new Parser(tokens, {
+      maxDepth: limits.maxDepth,
+      maxNodes: limits.maxNodes,
+    }).parse();
     output = interpreter.interpret(ast);
   } catch (error) {
     if (!(error instanceof TemplateError)) throw error;
diff --git a/core/src/resolve.ts b/core/src/resolve.ts
index 5f949c0..1e4690f 100644
--- a/core/src/resolve.ts
+++ b/core/src/resolve.ts
@@ -33,7 +33,10 @@ export function resolveTemplate(
   const tokens = lexer.tokenize();
 
   // Parse to AST
-  const parser = new Parser(tokens, { maxDepth: limits.maxDepth });
+  const parser = new Parser(tokens, {
+    maxDepth: limits.maxDepth,
+    maxNodes: limits.maxNodes,
+  });
   const ast = parser.parse();
 
   // Interpret
diff --git a/core/src/types.ts b/core/src/types.ts
index 2831187..d54a440 100644
--- a/core/src/types.ts
+++ b/core/src/types.ts
@@ -303,7 +303,7 @@ export const DEFAULT_LIMITS: Limits = {
   maxIterations: 10000,
   maxOutputChars: 1000000,
   maxDepth: 32,
-  maxNodes: 0,
+  maxNodes: 20000,
 };
 
 /**
diff --git a/docs/living/architecture/headless-contract.md b/docs/living/architecture/headless-contract.md
index c6dddae..2837ded 100644
--- a/docs/living/architecture/headless-contract.md
+++ b/docs/living/architecture/headless-contract.md
@@ -10,8 +10,8 @@ Decisions already settled in the ADRs apply (0003 unknown names always error, 00
 ## Core
 
 ```ts
-interface Limits { maxIterations: number; maxOutputChars: number; maxDepth: number }
-// DEFAULT_LIMITS: maxIterations 10000 (total FOR iterations across the render), maxOutputChars 1000000, maxDepth 32 (nesting of blocks)
+interface Limits { maxIterations: number; maxOutputChars: number; maxDepth: number; maxNodes: number }
+// DEFAULT_LIMITS: maxIterations 10000 (total FOR iterations across the render), maxOutputChars 1000000, maxDepth 32 (nesting of blocks), maxNodes 20000 (total AST nodes of the template, counted at parse)
 interface RenderOptions { strictMode?: boolean; limits?: Partial<Limits>; tokenEstimator?: (text: string) => number }
 interface Diagnostic { severity: "error" | "warning"; code: DiagnosticCode | "invalid-input" | "analysis-warning"; message: string; line: number; column: number; suggestion?: string }
 interface RenderResult { ok: boolean; output: string; messages: unknown[]; stats: { chars: number; estTokens: number; sectionsOmitted: number; iterations: number }; diagnostics: Diagnostic[] }
@@ -22,11 +22,11 @@ spec(): { version: string; blocks: {name, closes?, args, description}[]; filters
 ```
 
 - `messages` is an empty array until MESSAGE blocks exist; `sectionsOmitted` is 0 until SECTION exists. `stats.iterations` is reported on failure too.
-- Diagnostic codes: `syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth` (carried by `TemplateError` as `DiagnosticCode`), plus `invalid-input` (render, data not an object) and `analysis-warning` (validate). Every diagnostic has the 1-based line and column of the offending template node or tag; runtime errors (missing variable, bad filter parameters, math, type) carry the location of the node that failed, never a placeholder 1:1.
+- Diagnostic codes: `syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`, `limit-nodes` (carried by `TemplateError` as `DiagnosticCode`), plus `invalid-input` (render, data not an object) and `analysis-warning` (validate). Every diagnostic has the 1-based line and column of the offending template node or tag; runtime errors (missing variable, bad filter parameters, math, type) carry the location of the node that failed, never a placeholder 1:1.
 - On failure `ok` is false, `output` is `""`, and the only diagnostic is the error that stopped rendering.
 - `validate` maps `analyze`'s diagnostics: `unknown-filter` stays an error; every other analysis finding (an unrecognized condition) becomes a warning with code `analysis-warning`. A template that does not parse gives its error. `ok` is false only when an error is present.
 - `analyze` still throws a `TemplateError` for a template that does not parse; its callers (validate, the API, the CLI, the node) turn that into a diagnostic or an error.
-- `analyze`'s own diagnostics have the analysis shape `{ code, message, line, column }` (no `severity`, no `suggestion`), with codes `unknown-filter` and `unrecognized-condition`. `POST /v1/analyze` puts a parse failure (`syntax-error` or `limit-depth`) in that same shape; `template-resolver analyze` prints it to stderr instead.
+- `analyze`'s own diagnostics have the analysis shape `{ code, message, line, column }` (no `severity`, no `suggestion`), with codes `unknown-filter` and `unrecognized-condition`. `POST /v1/analyze` puts a parse failure (`syntax-error`, `limit-depth` or `limit-nodes`) in that same shape; `template-resolver analyze` prints it to stderr instead.
 - `spec().version` is the template language version, `"1.0"`, not the package version.
 - Estimator default: `Math.ceil(chars / 4)`, documented as an estimate with roughly +/-30 percent error for English prose.
 - `resolveTemplate` (throwing string API) keeps its behavior, accepts `limits`, and is implemented over the same engine.
@@ -46,14 +46,14 @@ spec(): { version: string; blocks: {name, closes?, args, description}[]; filters
 
 - Template problems are results, not HTTP errors: 200 with `ok: false` and diagnostics. An unparseable template on `/v1/analyze` gives 200 with empty variables, filters and blocks and the error in `diagnostics`.
 - Malformed requests: 400 `{error: {code: "invalid-request", message}}` (bad JSON, non-object body, missing or non-string `template`, non-object `data`, `options` or `options.limits`, non-boolean `strictMode`, a limit that is not a non-negative integer); 404 `not-found`; 405 `method-not-allowed` with `Allow`; 413 `payload-too-large`; 415 `unsupported-media-type` when POST content-type is not JSON; 500 `internal-error` for an unexpected exception. All responses are JSON.
-- Server option limits are the ceiling: a request may only lower a limit, never raise it above the server's (the effective value is the minimum). `validate` and `analyze` use the server's `maxDepth`.
+- Server option limits are the ceiling: a request may only lower a limit, never raise it above the server's (the effective value is the minimum). `validate` and `analyze` use the server's `maxDepth` and `maxNodes`.
 - `api/openapi.json` is committed, OpenAPI 3.1, describes every route, request and response schema; a test proves its paths and methods equal the router's table.
 
 ## CLI (`cli/`, bin `template-resolver`)
 
 `template-resolver <render|validate|analyze|spec|serve> [options]`
 
-- `render <template-file|-> [--data <file|->] [--strict | --no-strict] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]`: prints output to stdout; diagnostics as `file:line:col: severity code: message` on stderr; exit 0 on ok, 1 on template errors, 2 on usage or I/O errors. With `--json` prints the full RenderResult to stdout (exit codes unchanged). Strict by default; limit flags set the render's limits directly.
+- `render <template-file|-> [--data <file|->] [--strict | --no-strict] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--max-nodes n] [--json]`: prints output to stdout; diagnostics as `file:line:col: severity code: message` on stderr; exit 0 on ok, 1 on template errors, 2 on usage or I/O errors. With `--json` prints the full RenderResult to stdout (exit codes unchanged). Strict by default; limit flags set the render's limits directly.
 - `validate <template-file|->`, `analyze <template-file|->`: print JSON; `validate` exits 1 when not ok; `analyze` of an unparseable template prints the diagnostic to stderr and exits 1.
 - `spec`: prints the spec JSON. `serve [--port n] [--host h]`: starts the API with default server options (default 127.0.0.1:3000), prints `listening on http://host:port`, and on SIGINT or SIGTERM closes and exits 0; a port that cannot be bound exits 2.
 - `-` reads stdin; only one input may be stdin. `--help` prints usage to stdout (exit 0); no arguments print usage to stderr (exit 2).
@@ -61,5 +61,5 @@ spec(): { version: string; blocks: {name, closes?, args, description}[]; filters
 ## Engine surface under render
 
 - `TemplateError` (and its subclasses) carry a string `code` from the diagnostic codes above; `line` and `column` are always the failing node's position (1-based). Plain `Error`s thrown by filters or math are converted to `TemplateError` at the node that evaluates them (unknown filter: `unknown-filter`; bad parameters: `type-error`).
-- `resolveTemplate(template, variables, { strictMode?, limits? })` accepts `limits`; exceeding one throws a `TemplateError` with code `limit-iterations`, `limit-output` or `limit-depth` located at the node that crossed it.
+- `resolveTemplate(template, variables, { strictMode?, limits? })` accepts `limits`; exceeding one throws a `TemplateError` with code `limit-iterations`, `limit-output`, `limit-depth` or `limit-nodes` located at the node that crossed it.
 - `DEFAULT_LIMITS` and `withDefaultLimits` are exported from core.
diff --git a/docs/living/architecture/modules/api.md b/docs/living/architecture/modules/api.md
index 6653274..cc9374e 100644
--- a/docs/living/architecture/modules/api.md
+++ b/docs/living/architecture/modules/api.md
@@ -23,7 +23,7 @@ createServer(options?: { limits?: Partial<Limits>; tokenEstimator?: (text: strin
 listen(server: http.Server, port = 0, host = "127.0.0.1"): Promise<{ port: number; host: string }>
 ```
 
-Limits left out take core's defaults (`maxIterations` 10000, `maxOutputChars` 1000000, `maxDepth` 32); `maxBodyBytes` defaults to 1 MiB (1048576). `listen` binds loopback unless told otherwise.
+Limits left out take core's defaults (`maxIterations` 10000, `maxOutputChars` 1000000, `maxDepth` 32, `maxNodes` 20000); `maxBodyBytes` defaults to 1 MiB (1048576). `listen` binds loopback unless told otherwise.
 
 | Route | Request body | Response (200) |
 |---|---|---|
@@ -35,7 +35,7 @@ Limits left out take core's defaults (`maxIterations` 10000, `maxOutputChars` 10
 
 - `data` defaults to `{}`, `options.strictMode` to core's default (strict).
 - `options.limits` may only lower the server's limits: each given value must be a non-negative integer and the effective limit is `min(requested, server)`.
-- `validate` and `analyze` run with the server's `maxDepth`. An `analyze` of a template that does not parse answers 200 with empty `variables`, `filters` and `blocks` and the parse error (`syntax-error` or `limit-depth`) in `diagnostics`. Analysis diagnostics have the shape `{code, message, line, column}`, without the `severity` and `suggestion` of render and validate diagnostics; besides parse errors their codes are `unknown-filter` and `unrecognized-condition`.
+- `validate` and `analyze` run with the server's limits (`maxDepth` and `maxNodes`). An `analyze` of a template that does not parse answers 200 with empty `variables`, `filters` and `blocks` and the parse error (`syntax-error`, `limit-depth` or `limit-nodes`) in `diagnostics`. Analysis diagnostics have the shape `{code, message, line, column}`, without the `severity` and `suggestion` of render and validate diagnostics; besides parse errors their codes are `unknown-filter` and `unrecognized-condition`.
 - The query string is ignored when matching a route. The OpenAPI document is served in the committed file's exact serialization.
 
 ### Standalone lines and the prompt-aware constructs
diff --git a/docs/living/architecture/modules/cli.md b/docs/living/architecture/modules/cli.md
index 015cc90..4bd7f31 100644
--- a/docs/living/architecture/modules/cli.md
+++ b/docs/living/architecture/modules/cli.md
@@ -25,7 +25,7 @@ Built to `dist/cli/index.js`, which `package.json` names as the bin `template-re
 
 | Command | Does |
 |---|---|
-| `render <template-file\|-> [--data <file\|->] [--strict \| --no-strict] [--standalone-lines \| --no-standalone-lines] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]` | renders; output to stdout, diagnostics to stderr as `file:line:column: severity code: message`; `--json` prints the whole render result to stdout instead |
+| `render <template-file\|-> [--data <file\|->] [--strict \| --no-strict] [--standalone-lines \| --no-standalone-lines] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--max-nodes n] [--json]` | renders; output to stdout, diagnostics to stderr as `file:line:column: severity code: message`; `--json` prints the whole render result to stdout instead |
 | `validate <template-file\|->` | prints core `validate`'s `{ok, diagnostics}` as JSON |
 | `analyze <template-file\|->` | prints core `analyze` as JSON, whose diagnostics are `{code, message, line, column}` (`unknown-filter`, `unrecognized-condition`); a template that does not parse prints its diagnostic to stderr |
 | `spec` | prints core `spec()` as JSON |
diff --git a/docs/living/architecture/modules/template-resolver.md b/docs/living/architecture/modules/template-resolver.md
index fbfbe22..07a6ec5 100644
--- a/docs/living/architecture/modules/template-resolver.md
+++ b/docs/living/architecture/modules/template-resolver.md
@@ -76,8 +76,8 @@ Added after recovery, in the current tree (`core/src/render.ts`, `spec.ts`, `typ
 
 - `render(template, data, { strictMode?, standaloneLines?, limits?, tokenEstimator? })` returns `{ ok, output, messages, stats: { chars, estTokens, sectionsOmitted, iterations }, diagnostics }` and never throws for template or data problems: on failure `ok` is false, `output` is `""` and the one diagnostic is the error that stopped rendering. `messages` is always `[]` for now; `sectionsOmitted` counts the SECTION blocks omitted for an empty body. `estTokens` defaults to `estimateTokens`, `Math.ceil(chars / 4)`.
 - `validate(template, { limits? })` returns `{ ok, diagnostics }` without data: parse errors and unknown filters are errors; conditions `analyze` cannot read become warnings with code `analysis-warning`; `ok` is false only when an error is present.
-- A diagnostic is `{ severity, code, message, line, column, suggestion? }`. Every `TemplateError` carries a `code` (`syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`) and the 1-based line and column of the node that failed: runtime errors are relocated to the evaluating node, and plain `Error`s from filters or math become `type-error` there. `render` adds `invalid-input` for data that is not an object.
-- `Limits { maxIterations, maxOutputChars, maxDepth }` with `DEFAULT_LIMITS` 10000 (total FOR iterations across the render), 1000000 (output characters) and 32 (block nesting, enforced by the parser, so also by `analyze` and `validate`); `withDefaultLimits` fills omitted ones. `resolveTemplate` accepts `limits` too and keeps throwing.
+- A diagnostic is `{ severity, code, message, line, column, suggestion? }`. Every `TemplateError` carries a `code` (`syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`, `limit-nodes`) and the 1-based line and column of the node that failed: runtime errors are relocated to the evaluating node, and plain `Error`s from filters or math become `type-error` there. `render` adds `invalid-input` for data that is not an object.
+- `Limits { maxIterations, maxOutputChars, maxDepth, maxNodes }` with `DEFAULT_LIMITS` 10000 (total FOR iterations across the render), 1000000 (output characters), 32 (block nesting, enforced by the parser) and 20000 (total AST nodes, counted by the parser: every node except the program root, parent before children, at its opening token; node `maxNodes + 1` is a `limit-nodes` error located there, in `render`, `validate`, `analyze` and `resolveTemplate`). `analyze` and `validate` apply the caller's `maxNodes` and `maxDepth`; with no `maxDepth` given, `analyze` does not apply 32 and only bounds nesting at 256 blocks (`limit-depth`). ELSEIF chains are parsed, run and analyzed in loops, so a long chain ends in a result or `limit-nodes`, never a stack overflow; `withDefaultLimits` fills omitted ones. `resolveTemplate` accepts `limits` too and keeps throwing.
 - `spec()` describes the language: `version` (the language version, `"1.0"`), `blocks`, `filters`, `operators`, the default `limits`, the render `options` and `syntax` (variable, comment, trim markers, escape).
 - `analyze` additionally reports `required` per variable (always `!optional`) and `blocks`, a count per block kind (`IF`, `CASE`, `FOR`, `LIST`, `TABLE`, `SECTION`, `FENCE`); it throws on a template that does not parse.
 - The n8n node now detects variables with `analyze`, fails early in strict mode on unmapped required variables, renders with `render` and turns a failed result into a `NodeOperationError` carrying the first diagnostic's message, line and column.
diff --git a/tests/headless/api.test.ts b/tests/headless/api.test.ts
index 699b47d..0cc3bee 100644
--- a/tests/headless/api.test.ts
+++ b/tests/headless/api.test.ts
@@ -148,6 +148,7 @@ describe("ap-routes: documented 200 bodies", () => {
       maxIterations: 10000,
       maxOutputChars: 1000000,
       maxDepth: 32,
+      maxNodes: 20000,
     });
   });
 });
diff --git a/tests/headless/limits.test.ts b/tests/headless/limits.test.ts
index 15a14a1..51f9b91 100644
--- a/tests/headless/limits.test.ts
+++ b/tests/headless/limits.test.ts
@@ -179,7 +179,7 @@ describe("lm-depth: block nesting is bounded and the throw is located at the off
 
 describe("lm-defaults: defaults, partial limits and unchanged rendering", () => {
   it("lm-defaults: DEFAULT_LIMITS is 10000 iterations, 1000000 output chars, depth 32", () => {
-    expect(DEFAULT_LIMITS).toEqual({ maxIterations: 10000, maxOutputChars: 1000000, maxDepth: 32 });
+    expect(DEFAULT_LIMITS).toEqual({ maxIterations: 10000, maxOutputChars: 1000000, maxDepth: 32, maxNodes: 20000 });
   });
 
   it("lm-defaults: with no limits option, 10000 iterations render and 10001 throw limit-iterations", () => {
diff --git a/docs/ephemeral/cycles/language/deltas/node-limit-1.md b/docs/ephemeral/cycles/language/deltas/node-limit-1.md
new file mode 100644
index 0000000..8c97b9a
--- /dev/null
+++ b/docs/ephemeral/cycles/language/deltas/node-limit-1.md
@@ -0,0 +1,10 @@
+---
+summary: "limits.maxNodes (default 20000), the limit-nodes code, iterative ELSEIF chains and analyze limits"
+op: modify
+target: docs/living/architecture/modules/template-resolver.md
+status: open
+---
+
+# Proposed change
+
+<!-- Say what changes in the target document. For add: what the planned document will cover. For modify: which parts change and why. For remove: why the document goes. For recover: the area the recovered document describes; apply it by slug when its archaeology card is done. Other changes are applied when the cycle merges, and the document becomes built. Nobody sets validated here: only an approved close review does. -->
diff --git a/docs/ephemeral/cycles/language/deltas/node-limit-2.md b/docs/ephemeral/cycles/language/deltas/node-limit-2.md
new file mode 100644
index 0000000..49d3128
--- /dev/null
+++ b/docs/ephemeral/cycles/language/deltas/node-limit-2.md
@@ -0,0 +1,10 @@
+---
+summary: "limits.maxNodes (default 20000), the limit-nodes code, iterative ELSEIF chains and analyze limits"
+op: modify
+target: docs/living/architecture/modules/api.md
+status: open
+---
+
+# Proposed change
+
+<!-- Say what changes in the target document. For add: what the planned document will cover. For modify: which parts change and why. For remove: why the document goes. For recover: the area the recovered document describes; apply it by slug when its archaeology card is done. Other changes are applied when the cycle merges, and the document becomes built. Nobody sets validated here: only an approved close review does. -->
diff --git a/docs/ephemeral/cycles/language/deltas/node-limit-3.md b/docs/ephemeral/cycles/language/deltas/node-limit-3.md
new file mode 100644
index 0000000..15984f4
--- /dev/null
+++ b/docs/ephemeral/cycles/language/deltas/node-limit-3.md
@@ -0,0 +1,10 @@
+---
+summary: "limits.maxNodes (default 20000), the limit-nodes code, iterative ELSEIF chains and analyze limits"
+op: modify
+target: docs/living/architecture/modules/cli.md
+status: open
+---
+
+# Proposed change
+
+<!-- Say what changes in the target document. For add: what the planned document will cover. For modify: which parts change and why. For remove: why the document goes. For recover: the area the recovered document describes; apply it by slug when its archaeology card is done. Other changes are applied when the cycle merges, and the document becomes built. Nobody sets validated here: only an approved close review does. -->
diff --git a/docs/ephemeral/cycles/language/deltas/node-limit-4.md b/docs/ephemeral/cycles/language/deltas/node-limit-4.md
new file mode 100644
index 0000000..772348d
--- /dev/null
+++ b/docs/ephemeral/cycles/language/deltas/node-limit-4.md
@@ -0,0 +1,10 @@
+---
+summary: "limits.maxNodes (default 20000), the limit-nodes code, iterative ELSEIF chains and analyze limits"
+op: modify
+target: docs/living/architecture/headless-contract.md
+status: open
+---
+
+# Proposed change
+
+<!-- Say what changes in the target document. For add: what the planned document will cover. For modify: which parts change and why. For remove: why the document goes. For recover: the area the recovered document describes; apply it by slug when its archaeology card is done. Other changes are applied when the cycle merges, and the document becomes built. Nobody sets validated here: only an approved close review does. -->
````

## Gate run

Gate command green at commit bde45031262c (193 tests).

## Output

Answer with one JSON object and nothing else, in this shape:

```json
{
  "restatement": "the objective in your own words, one short paragraph",
  "brief_mismatch": null,
  "verification_plan": ["each check you will make, written from section 1 alone"],
  "findings": [{
    "title": "one line",
    "class": "defect | goal-risk | drift | simplification",
    "serves": { "target": "c1 | m1 | card-goal | cycle-goal | project-goal", "scenario": "the concrete failure against that target" },
    "rubric": "the rubric item or criterion cited",
    "reproduction": "falsifiable steps that show the failure",
    "evidence": ["doc:<path>", "code:<path>:<line>", "test:<name>", "diff:<path>"],
    "location": "path:line or null"
  }],
  "responses": [{ "finding": "f1", "verdict": "sustain | withdraw", "evidence": ["code:src/a.mjs:12"] }]
}
```

Rules:

- Judge the diff against section 1 and the goals it names, never against how the work was done. Write `restatement` before you read section 3.
- Product tier and up: write `verification_plan` from section 1 alone, before you read section 3.
- `brief_mismatch`: a string when the brief, the criteria and the goals contradict each other; otherwise null.
- Every finding names what it serves in `serves.target`: a criterion (c1, c2, ...), a must-not (m1, m2, ...) or a goal (card-goal, cycle-goal, project-goal). A finding that serves nothing in the objective chain is dropped.
- `defect` and `goal-risk` need a rubric item and falsifiable reproduction steps; `goal-risk` also needs evidence. Every evidence entry is `<kind>:<ref>` with a kind of doc, code, test or diff.
- Answer each question in the reviewer brief. A weak answer to a goal-critical question is a `goal-risk` finding serving that question's goal (a fix request: revise and resubmit). A weak answer to a polish question is a `drift` finding (noted for the lead, never a fix request). Strong and adequate answers need no finding.
- `responses` answers earlier findings by label when you are asked to; otherwise leave it empty.
- The Gate run line is tool output recorded by the gate, not the builder's claim. A criterion verified by tests may rely on it; you do not run, judge or ask for tests. A stale or missing line is a reason to say so, never to assume. Review is for what tests cannot catch: fit to the objective and contract, scope drift, design and readability, security, gaps in the tests themselves and edge cases nobody tested.
