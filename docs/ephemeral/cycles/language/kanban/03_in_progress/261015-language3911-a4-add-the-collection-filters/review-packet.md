---
type: review-packet
card: 261015-language3911-a4-add-the-collection-filters
tier: product
built_at: 2026-10-15T03:42:56.414Z
base: f4e552a71ebe770925d1bd5eb5a33fdaf91c1974
head: 010500d4fdf40784c46721cfe422866a7d77d53a
read_at: 010500d4fdf40784c46721cfe422866a7d77d53a
frozen: true
brief_sha256: 2e466b9d9813faa13daa678b64f2ff36ace8a2e69b63d5de8384b2920a0df4ae
manifest_sha256: 85d614fde7ccb87301fdf2c1ff8e3dcb90c15b992455265c84b7f494ab90d5e9
criteria_sha256: 3b928fd3dc090262a7bcb295862ee34705bd79b09035be23ce32ba74addba5d9
scope_sha256: b8c7a15dd22f1f86e5754e523931ebaf0cff14681b082ba83497d24070bab79a
diff_sha256: 8de8a0a43675bfce2bbb6952e3f8454f6f4a72cecef293bf70410af96f5fcad9
omitted_paths: 21
criteria_count: 3
must_not_count: 4
---

# Review packet: 261015-language3911-a4-add-the-collection-filters

Manifest amended after the freeze at 2026-10-15T03:40:11.051Z by build lead: the card records one delta per living document it changes (add +docs/ephemeral/cycles/language/deltas/collection-filters-contract.md, add +docs/ephemeral/cycles/language/deltas/collection-filters-module-page.md, scope +docs/ephemeral/cycles/language/deltas)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: authors can join, count, pick, order, de-duplicate, slice, split and serialize lists with join, length, first, last, sort, unique, slice, lines and json, each a definition in the collection group of the one filter registry.

### Criteria

- c1 (verify: test): fc-collection: a table per filter over arrays, string inputs coerced exactly as FOR coerces them, objects and empty or missing input: join (join=", "), length (items of a list, characters of a text, keys of an object), first, last, slice (slice:start=1,end=3), lines (split text on line breaks, CRLF included) and unique
- c2 (verify: test): fc-order: sort is stable and deterministic: numbers numeric, strings by code unit, sort=key orders objects by that key, a mixed list sorts numbers before strings; unique keeps the first occurrence of each value
- c3 (verify: test): fc-json: json prints a compact JSON text of the value with stable key order; a cyclic value is a type-error located at the variable; a wrong or undeclared parameter on any collection filter is a type-error located at the variable

### Must not

- m1: change any existing test expectation
- m2: add a runtime dependency
- m3: evaluate template text as code or compile a template-supplied regular expression
- m4: let an unknown name or bad parameter pass in lenient mode

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: authors can join, count, pick, order, de-duplicate, slice, split and serialize lists with join, length, first, last, sort, unique, slice, lines and json, each a definition in the collection group of the one filter registry.
Must not:
- change any existing test expectation
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode

## Questions

goal-critical: does any collection filter give a different result for the same input on two runs, or depend on object insertion order, locale or platform (sort, unique, json)?
goal-critical: does a cyclic value make json, unique or sort overflow the stack or hang instead of giving a located type-error?
goal-critical: does a bad parameter (undeclared name, missing join separator, non-integer slice bound) or an object given to a list filter fail with a located type-error in every mode, never silently?
goal-critical: do string inputs coerce exactly as FOR coerces them, and does a missing value in lenient mode behave as an empty list?
goal-critical: does any filter mutate its input value?
polish: is stability of sort proved by a test with equal keys, and is unique's first-occurrence order proved?
polish: is the new code small, free of a second filter list, and free of duplicated comparison or stable-JSON logic?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope (filters-collection.ts and its test file)
- the registry is the only place a filter name is listed

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
```

### spec.md as of base f4e552a71ebe, read at 010500d4fdf4

```
# Spec

## Acceptance criteria

- fc-collection: a table per filter over arrays, string inputs coerced exactly as FOR coerces them, objects and empty or missing input: join (join=", "), length (items of a list, characters of a text, keys of an object), first, last, slice (slice:start=1,end=3), lines (split text on line breaks, CRLF included) and unique
- fc-order: sort is stable and deterministic: numbers numeric, strings by code unit, sort=key orders objects by that key, a mixed list sorts numbers before strings; unique keeps the first occurrence of each value
- fc-json: json prints a compact JSON text of the value with stable key order; a cyclic value is a type-error located at the variable; a wrong or undeclared parameter on any collection filter is a type-error located at the variable

## Interface (names the tests may import)

- `core/src/filters-collection.ts` exports `COLLECTION_FILTERS: FilterDefinition[]` (type in `core/src/types.ts`) with the rows `join` (shorthand = separator, paramNames `["value"]`), `length`, `first`, `last`, `sort` (shorthand = key, paramNames `["value"]`), `unique`, `slice` (paramNames `["start","end"]`), `lines` and `json`, in this order. The registry in `core/src/filters.ts` already includes the group; no dispatch or parser change.

## Behavior settled for this card

- List filters (`join first last sort unique slice`) coerce their input as FOR does (`tryCoerceToArray`); null or missing is the empty list; an object given to them is a type-error; the input is never mutated.
- `join=SEP` needs the separator (`join=""` is allowed); items print as the output step prints them. `length` of a string counts characters (not coerced), of an object its keys, of null 0. `first` and `last` of an empty list are null.
- `slice:start=S,end=E` has `Array.prototype.slice` semantics; each given bound is an integer text, else a type-error. `lines` splits the text form on `\r\n`, `\r` or `\n`; one trailing break adds no empty item.
- `sort`: numbers (numeric), then strings (code unit), then all other values in original order; `sort=key` orders object items by that property, items without it last; stable. `unique`: same type and same value (objects by stable JSON text), first occurrence kept.
- `json`: compact, object keys sorted by code unit at every depth; null and missing give `null`; a cyclic value is a type-error, a shared non-cyclic reference is not.
- A returned list or number prints as the output step prints it (a list as compact JSON) and passes to the next filter as a value.

## Examples

- `${{ xs | join=", " }}` over `["a","b"]` is `a, b`; `${{ xs | sort | first }}` over `[3,1,2]` is `1`.
- `${{ o | json }}` over `{b:1,a:{d:1,c:2}}` is `{"a":{"c":2,"d":1},"b":1}`.
- `${{ xs | slice:start=1,end=3 }}` over `["a","b","c","d"]` is `["b","c"]`.
- `${{ v | json:pretty=1 }}` fails with a type-error located at the variable.
```

### card.md as of base f4e552a71ebe, read at 010500d4fdf4

```
# Add the collection filters

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Authors can join, count, pick, order, de-duplicate, slice, split and serialize lists in the language with join, length, first, last, sort, unique, slice, lines and json, each a row in the collection filter group of the registry.

## Must-haves

- `contract` `fc-collection` a table per filter over arrays, string inputs coerced exactly as FOR coerces them, objects and empty or missing input: join (join=", "), length (items of a list, characters of a text, keys of an object), first, last, slice (slice:start=1,end=3), lines (split text on line breaks, CRLF included) and unique
- `contract` `fc-order` sort is stable and deterministic: numbers numeric, strings by code unit, sort=key orders objects by that key, a mixed list sorts numbers before strings; unique keeps the first occurrence of each value
- `contract` `fc-json` json prints a compact JSON text of the value with stable key order; a cyclic value is a type-error located at the variable; a wrong or undeclared parameter on any collection filter is a type-error located at the variable

## Acceptance criteria

- fc-collection: a table per filter over arrays, string inputs coerced exactly as FOR coerces them, objects and empty or missing input: join (join=", "), length (items of a list, characters of a text, keys of an object), first, last, slice (slice:start=1,end=3), lines (split text on line breaks, CRLF included) and unique
- fc-order: sort is stable and deterministic: numbers numeric, strings by code unit, sort=key orders objects by that key, a mixed list sorts numbers before strings; unique keeps the first occurrence of each value
- fc-json: json prints a compact JSON text of the value with stable key order; a cyclic value is a type-error located at the variable; a wrong or undeclared parameter on any collection filter is a type-error located at the variable

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

core/src/filters-collection.ts exports COLLECTION_FILTERS: FilterDefinition[] with rows join (shorthand = separator), length, first, last, sort (shorthand = key), unique, slice (params: start, end), lines and json. No dispatch or parser change.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `docs/ephemeral/cycles/language/deltas/collection-filters-contract.md` | add | template-resolver |
| `docs/ephemeral/cycles/language/deltas/collection-filters-module-page.md` | add | template-resolver |
| `tests/language/filters-collection.test.ts` | add | template-resolver |
| `core/src/filters-collection.ts` | edit | template-resolver |

Files scope: `core/src/filters-collection.ts`, `docs/ephemeral/cycles/language/deltas`, `tests/language/filters-collection.test.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: `docs/ephemeral/cycles/language/deltas/collection-filters-contract.md`, `docs/ephemeral/cycles/language/deltas/collection-filters-module-page.md`, `tests/language/filters-collection.test.ts`
- remove: none
- edit: `core/src/filters-collection.ts`
- files_scope: `core/src/filters-collection.ts`, `docs/ephemeral/cycles/language/deltas`, `tests/language/filters-collection.test.ts`

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

### docs/living/decisions/adr/0003-unknown-names-are-always-errors.md

```
---
summary: Unknown filters and unknown identifiers are always errors; strict mode only governs missing data.
type: adr
domain: language
status: accepted
date: 2026-10-13
state: built
---

# Unknown names are always errors, strict mode governs missing data

**Context.** Unknown filters throw today but unknown identifiers followed by operators silently evaluate false, and strict mode mixes missing data with misspelled names.

**Decision.** A filter, operator or identifier that the language does not define is a syntax-level error in every mode. Strict mode decides only what happens when a defined variable has no value in the data.

**Alternatives.** Report unknown names as errors in strict mode only; rejected because a typo then passes silently in the default mode.

**Consequences.** Typos are caught before a run by validate and analyze. Missing data stays tolerant by default.
```

## Frozen tests (read-only)

These test files are shown as committed at 010500d4fdf4, the commit the contract is read at; the diff starts at base f4e552a71ebe, so a file added or changed since then is in the diff too. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/language/filters-collection.test.ts (frozen)

```
import { FILTER_REGISTRY, analyze, render, validate } from "../../core/src";
import { COLLECTION_FILTERS } from "../../core/src/filters-collection";

// Jest has no assertion-message argument; each test name states the behavior expected,
// and the red reason is read from the matcher's expected/received pair.
const RAW = { standaloneLines: false };
const NAMES = ["join", "length", "first", "last", "sort", "unique", "slice", "lines", "json"];

function def(name: string) {
  const d = COLLECTION_FILTERS.find((f) => f.name === name);
  if (!d) throw new Error("no collection filter " + name);
  return d;
}

function out(template: string, v: unknown, strictMode = false) {
  return render(template, { v }, { ...RAW, strictMode });
}

describe("fc-collection: registry shape", () => {
  it("fc-collection: the nine rows are in order and feed the registry", () => {
    expect(COLLECTION_FILTERS.map((f) => f.name)).toEqual(NAMES);
    expect(FILTER_REGISTRY.slice(-NAMES.length).map((f) => f.name)).toEqual(NAMES);
  });

  it.each<[string, string, string[]]>([
    ["join", "join=SEP", ["value"]],
    ["length", "", []],
    ["first", "", []],
    ["last", "", []],
    ["sort", "sort[=key]", ["value"]],
    ["unique", "", []],
    ["slice", "slice[:start=N,end=N]", ["start", "end"]],
    ["lines", "", []],
    ["json", "", []],
  ])("fc-collection: %s declares its params text and names", (name, params, paramNames) => {
    expect(def(name).params).toBe(params);
    expect(def(name).paramNames).toEqual(paramNames);
    expect(def(name).description.length).toBeGreaterThan(0);
  });
});

describe("fc-collection: apply tables", () => {
  const V = (value: string) => ({ value });
  const rows: [string, string, unknown, Record<string, string>, unknown][] = [
    // join
    ["join", "array", ["a", "b", "c"], V(", "), "a, b, c"],
    ["join", "comma string", "a,b,c", V("-"), "a-b-c"],
    ["join", "JSON array string", '["x","y"]', V("+"), "x+y"],
    ["join", "element text forms", [1, null, { a: 1 }, [2]], V("|"), '1||{"a":1}|[2]'],
    ["join", "empty separator", ["a", "b"], V(""), "ab"],
    ["join", "empty list", [], V(","), ""],
    ["join", "null", null, V(","), ""],
    ["join", "undefined", undefined, V(","), ""],
    ["join", "number", 5, V(","), "5"],
    ["join", "boolean", true, V(","), "true"],
    ["join", "nested array", [[1, 2], [3]], V(";"), "[1,2];[3]"],
    // length
    ["length", "array", ["a", "b"], {}, 2],
    ["length", "comma string counts characters", "a,b,c", {}, 5],
    ["length", "object counts keys", { a: 1, b: 2, c: 3 }, {}, 3],
    ["length", "number text form", 12345, {}, 5],
    ["length", "boolean text form", true, {}, 4],
    ["length", "null", null, {}, 0],
    ["length", "undefined", undefined, {}, 0],
    ["length", "empty list", [], {}, 0],
    ["length", "empty string", "", {}, 0],
    ["length", "nested array counts top items", [[1, 2], [3]], {}, 2],
    // first
    ["first", "array", ["a", "b"], {}, "a"],
    ["first", "comma string", "a,b,c", {}, "a"],
    ["first", "JSON array string", '["x","y"]', {}, "x"],
    ["first", "empty list", [], {}, null],
    ["first", "null", null, {}, null],
    ["first", "undefined", undefined, {}, null],
    ["first", "number", 7, {}, 7],
    ["first", "boolean", true, {}, true],
    ["first", "nested array", [[1, 2], [3]], {}, [1, 2]],
    // last
    ["last", "array", ["a", "b"], {}, "b"],
    ["last", "comma string", "a,b,c", {}, "c"],
    ["last", "JSON array string", '["x","y"]', {}, "y"],
    ["last", "empty list", [], {}, null],
    ["last", "null", null, {}, null],
    ["last", "undefined", undefined, {}, null],
    ["last", "number", 7, {}, 7],
    ["last", "nested array", [[1, 2], [3, 4]], {}, [3, 4]],
    // slice
    ["slice", "start and end", ["a", "b", "c", "d"], { start: "1", end: "3" }, ["b", "c"]],
    ["slice", "no parameters copies the list", ["a", "b"], {}, ["a", "b"]],
    ["slice", "negative start", ["a", "b", "c", "d"], { start: "-2" }, ["c", "d"]],
    ["slice", "negative end", ["a", "b", "c", "d"], { end: "-1" }, ["a", "b", "c"]],
    ["slice", "start only", ["a", "b", "c"], { start: "2" }, ["c"]],
    ["slice", "end only", ["a", "b", "c"], { end: "2" }, ["a", "b"]],
    ["slice", "plus sign accepted", ["a", "b", "c"], { start: "+1" }, ["b", "c"]],
    ["slice", "past the end", ["a"], { start: "5" }, []],
    ["slice", "comma string", "a,b,c", { start: "1" }, ["b", "c"]],
    ["slice", "JSON array string", '["x","y","z"]', { end: "1" }, ["x"]],
    ["slice", "null", null, { start: "1" }, []],
    ["slice", "number is a one-item list", 5, {}, [5]],
    ["slice", "empty list", [], { start: "0", end: "2" }, []],
    // lines
    ["lines", "LF", "a\nb", {}, ["a", "b"]],
    ["lines", "CRLF", "a\r\nb", {}, ["a", "b"]],
    ["lines", "CR", "a\rb", {}, ["a", "b"]],
    ["lines", "one trailing break adds nothing", "a\nb\n", {}, ["a", "b"]],
    ["lines", "two trailing breaks add one empty", "a\n\n", {}, ["a", ""]],
    ["lines", "blank line between", "a\n\nb", {}, ["a", "", "b"]],
    ["lines", "empty string", "", {}, []],
    ["lines", "null", null, {}, []],
    ["lines", "undefined", undefined, {}, []],
    ["lines", "lone break", "\n", {}, [""]],
    ["lines", "number text form", 12, {}, ["12"]],
    ["lines", "object text form", { a: 1 }, {}, ['{"a":1}']],
    ["lines", "no break", "abc", {}, ["abc"]],
    // unique (list behavior; order rows are under fc-order)
    ["unique", "comma string", "a,b,a", {}, ["a", "b"]],
    ["unique", "empty list", [], {}, []],
    ["unique", "null", null, {}, []],
    ["unique", "undefined", undefined, {}, []],
  ];

  it.each(rows)("fc-collection: %s over %s", (name, _label, input, params, expected) => {
    expect(def(name).apply(input, params)).toEqual(expected);
  });

  it("fc-collection: slice returns a new list, not the input", () => {
    const input = ["a", "b"];
    expect(def("slice").apply(input, {})).not.toBe(input);
    expect(input).toEqual(["a", "b"]);
  });

  it.each(["join", "first", "last", "sort", "unique", "slice"])(
    "fc-collection: %s rejects an object input as a type-error saying a list is needed",
    (name) => {
      const params: Record<string, string> = name === "join" ? { value: "," } : {};
      expect(() => def(name).apply({ a: 1 }, params)).toThrow(/list/i);
    }
  );

  it("fc-collection: join with no separator throws", () => {
    expect(() => def("join").apply(["a"], {})).toThrow(/separator|join/i);
  });

  it.each<[string, Record<string, string>, RegExp]>([
    ["start a", { start: "a" }, /start/],
    ["start empty", { start: "" }, /start/],
    ["start 1.5", { start: "1.5" }, /start/],
    ["start 1e2", { start: "1e2" }, /start/],
    ["end 1.5", { end: "1.5" }, /end/],
    ["end x", { end: "x" }, /end/],
  ])("fc-collection: slice with a bad integer (%s) names the parameter", (_n, params, re) => {
    expect(() => def("slice").apply(["a", "b", "c"], params)).toThrow(re);
  });
});

describe("fc-collection: render", () => {
  const rows: [string, string, unknown, string][] = [
    ["join with a quoted separator", '${{ v | join=", " }}', ["a", "b", "c"], "a, b, c"],
    ["join an empty separator", '${{ v | join="" }}', ["a", "b"], "ab"],
    ["join a comma string", '${{ v | join=" - " }}', "a,b,c", "a - b - c"],
    ["join an empty list", '${{ v | join="," }}', [], ""],
    ["length of a list", "${{ v | length }}", ["a", "b", "c"], "3"],
    ["length of a text", "${{ v | length }}", "a,b,c", "5"],
    ["length of an object", "${{ v | length }}", { a: 1, b: 2 }, "2"],
    ["first", "${{ v | first }}", "a,b,c", "a"],
    ["first of an empty list prints nothing", "${{ v | first }}", [], ""],
    ["last", "${{ v | last }}", ["a", "b", "c"], "c"],
    ["last of an empty list prints nothing", "${{ v | last }}", [], ""],
    ["slice prints as JSON", "${{ v | slice:start=1,end=3 }}", ["a", "b", "c", "d"], '["b","c"]'],
    ["slice with no parameters", "${{ v | slice }}", ["a", "b"], '["a","b"]'],
    ["lines then length", "${{ v | lines | length }}", "a\r\nb\r\nc\r\n", "3"],
    ["lines prints as JSON", "${{ v | lines }}", "a\nb", '["a","b"]'],
    ["unique then length gives a number", "${{ v | unique | length }}", ["a", "b", "a"], "2"],
    ["slice then join", '${{ v | slice:start=1 | join="+" }}', ["a", "b", "c"], "b+c"],
    ["join of a missing variable in lenient mode", '${{ v | join="," }}', undefined, ""],
    ["length of a missing variable in lenient mode", "${{ v | length }}", undefined, "0"],
    ["length of a null", "${{ v | length }}", null, "0"],
  ];

  it.each(rows)("fc-collection: %s", (_n, template, value, expected) => {
    const r = out(template, value);
    expect(r.diagnostics).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  it("fc-collection: a missing variable renders the same as an empty list in lenient mode", () => {
    const r = render('${{ v | join="," }}|${{ v | length }}', {}, { ...RAW, strictMode: false });
    expect(r.ok).toBe(true);
    expect(r.output).toBe("|0");
  });

  const errorRows: [string, string, unknown][] = [
    ["join with no separator", "intro\n  ${{ v | join }}", ["a"]],
    ["join over an object", 'intro\n  ${{ v | join="," }}', { a: 1 }],
    ["first over an object", "intro\n  ${{ v | first }}", { a: 1 }],
    ["slice with start=a", "intro\n  ${{ v | slice:start=a }}", ["a"]],
    ["slice with end=1.5", "intro\n  ${{ v | slice:end=1.5 }}", ["a"]],
  ];

  describe.each([
    ["lenient", false],
    ["strict", true],
  ])("%s mode", (_label, strictMode) => {
    it.each(errorRows)("fc-collection: a type-error at the variable, %s", (_n, template, value) => {
      const r = out(template, value, strictMode);
      expect(r.ok).toBe(false);
      expect(r.diagnostics[0]?.code).toBe("type-error");
      expect(r.diagnostics[0]?.message).not.toMatch(/not implemented/);
      expect({ line: r.diagnostics[0]?.line, column: r.diagnostics[0]?.column }).toEqual({
        line: 2,
        column: 3,
      });
    });
  });
});

describe("fc-order: sort", () => {
  const V = (value: string) => ({ value });
  const rows: [string, unknown, Record<string, string>, unknown][] = [
    ["numbers ascending", [3, 1, 2], {}, [1, 2, 3]],
    ["numbers numerically, not as text", [10, 9, 1], {}, [1, 9, 10]],
    ["negative numbers", [-1, -10, 5], {}, [-10, -1, 5]],
    ["strings by code unit, capitals first", ["b", "a", "B"], {}, ["B", "a", "b"]],
    ["numeric-looking strings by code unit", ["9", "10"], {}, ["10", "9"]],
    ["numbers before strings", [2, "b", 1, "a"], {}, [1, 2, "a", "b"]],
    [
      "others after, in original order",
      [true, "b", null, 2, { x: 1 }, "a", [1]],
      {},
      [2, "a", "b", true, null, { x: 1 }, [1]],
    ],
    ["objects without a key keep their order", [{ a: 2 }, { a: 1 }], {}, [{ a: 2 }, { a: 1 }]],
    ["comma string", "b,a,c", {}, ["a", "b", "c"]],
    ["JSON array string", "[3,1,2]", {}, [1, 2, 3]],
    ["empty list", [], {}, []],
    ["null", null, {}, []],
    ["undefined", undefined, {}, []],
    ["number is a one-item list", 4, {}, [4]],
    [
      "sort=key orders objects by that key",
      [{ k: 2, n: "a" }, { k: 1, n: "b" }],
      V("k"),
      [{ k: 1, n: "b" }, { k: 2, n: "a" }],
    ],
    [
      "sort=key with mixed key types: numbers then strings",
      [{ k: "b" }, { k: 1 }, { k: "a" }],
      V("k"),
      [{ k: 1 }, { k: "a" }, { k: "b" }],
    ],
    [
      "sort=key puts non-objects and missing keys last, in order",
      [{ k: 2 }, 5, { z: 1 }, { k: 1 }],
      V("k"),
      [{ k: 1 }, { k: 2 }, 5, { z: 1 }],
    ],
    [
      "sort=key is stable for equal keys",
      [
        { k: 1, n: "a" },
        { k: 0, n: "b" },
        { k: 1, n: "c" },
        { k: 0, n: "d" },
      ],
      V("k"),
      [
        { k: 0, n: "b" },
        { k: 0, n: "d" },
        { k: 1, n: "a" },
        { k: 1, n: "c" },
      ],
    ],
    ["sort=key on an empty list", [], V("k"), []],
  ];

  it.each(rows)("fc-order: sort, %s", (_n, input, params, expected) => {
    expect(def("sort").apply(input, params)).toEqual(expected);
  });

  it.each(rows.filter((r) => Array.isArray(r[1]) && (r[1] as unknown[]).length > 0))(
    "fc-order: sort is deterministic and does not mutate its input, %s",
    (_n, input, params, expected) => {
      const before = JSON.stringify(input);
      const a = def("sort").apply(input, params);
      const b = def("sort").apply(input, params);
      expect(JSON.stringify(input)).toBe(before);
      expect(a).not.toBe(input);
      expect(a).toEqual(b);
      expect(a).toEqual(expected);
    }
  );

  it.each<[string, string, unknown, string]>([
    ["sort then first gives the smallest", "${{ v | sort | first }}", [3, 1, 2], "1"],
    ["sort then last", "${{ v | sort | last }}", [3, 1, 2], "3"],
    ["sort prints as JSON", "${{ v | sort }}", [3, 1, 2], "[1,2,3]"],
    ["sort=key then first then json", "${{ v | sort=k | first | json }}", [{ k: 2 }, { k: 1 }], '{"k":1}'],
    ["sort then join", '${{ v | sort | join="," }}', ["b", "a"], "a,b"],
  ])("fc-order: render, %s", (_n, template, value, expected) => {
    const r = out(template, value);
    expect(r.diagnostics).toEqual([]);
    expect(r.output).toBe(expected);
  });
});

describe("fc-order: unique", () => {
  const rows: [string, unknown, unknown][] = [
    ["keeps the first occurrence, order kept", [1, 2, 1, 3, 2], [1, 2, 3]],
    ["strings", ["b", "a", "b"], ["b", "a"]],
    ["1 and the string 1 differ", [1, "1", 1, "1"], [1, "1"]],
    ["true and the string true differ", [true, "true", true], [true, "true"]],
    ["0 and false differ", [0, false, 0], [0, false]],
    ["deep-equal objects collapse", [{ a: 1 }, { a: 1 }, { a: 2 }], [{ a: 1 }, { a: 2 }]],
    ["objects equal across key order", [{ a: 1, b: 2 }, { b: 2, a: 1 }], [{ a: 1, b: 2 }]],
    ["deep-equal arrays collapse", [[1, 2], [1, 2], [2, 1]], [[1, 2], [2, 1]]],
    ["all equal", [1, 1, 1], [1]],
    ["already unique", ["x", "y"], ["x", "y"]],
    ["JSON array string", '["x","y","x"]', ["x", "y"]],
  ];

  it.each(rows)("fc-order: unique, %s", (_n, input, expected) => {
    expect(def("unique").apply(input, {})).toEqual(expected);
  });

  it("fc-order: unique does not mutate its input and returns a new list", () => {
    const input = [1, 1, 2];
    const result = def("unique").apply(input, {});
    expect(input).toEqual([1, 1, 2]);
    expect(result).not.toBe(input);
    expect(result).toEqual([1, 2]);
  });

  it("fc-order: unique renders as JSON in first-occurrence order", () => {
    const r = out("${{ v | unique }}", ["b", "a", "b", "c", "a"]);
    expect(r.output).toBe('["b","a","c"]');
  });
});

describe("fc-json: json", () => {
  const cyclicObject: Record<string, unknown> = { a: 1 };
  cyclicObject.self = cyclicObject;
  const cyclicArray: unknown[] = [1];
  cyclicArray.push(cyclicArray);
  const innerList: unknown[] = [];
  const nestedCycle: Record<string, unknown> = { x: { y: innerList } };
  innerList.push(nestedCycle);
  const shared = { a: 1 };

  const rows: [string, unknown, string][] = [
    ["keys sorted at every depth", { b: 1, a: { d: 1, c: 2 } }, '{"a":{"c":2,"d":1},"b":1}'],
    ["keys sorted by code unit", { a: 1, B: 2 }, '{"B":2,"a":1}'],
    ["arrays keep their order", [3, 1, 2], "[3,1,2]"],
    ["objects inside arrays are sorted", [{ b: 1, a: 2 }], '[{"a":2,"b":1}]'],
    ["compact, no spaces", { a: [1, 2], b: "x y" }, '{"a":[1,2],"b":"x y"}'],
    ["a string is quoted", "a", '"a"'],
    ["a string with quotes is escaped", 'a"b', '"a\\"b"'],
    ["a number", 1.5, "1.5"],
    ["a boolean", false, "false"],
    ["null", null, "null"],
    ["undefined", undefined, "null"],
    ["empty object", {}, "{}"],
    ["empty array", [], "[]"],
    ["a shared, non-cyclic reference is not an error", [shared, shared], '[{"a":1},{"a":1}]'],
  ];

  it.each(rows)("fc-json: json, %s", (_n, input, expected) => {
    expect(def("json").apply(input, {})).toBe(expected);
  });

  it.each<[string, unknown]>([
    ["an object holding itself", cyclicObject],
    ["an array holding itself", cyclicArray],
    ["a deep cycle", nestedCycle],
  ])("fc-json: json of %s throws and says cyclic", (_n, input) => {
    expect(() => def("json").apply(input, {})).toThrow(/cyclic/i);
  });

  it.each<[string, string, unknown, string]>([
    ["an object", "${{ v | json }}", { b: 1, a: { d: 1, c: 2 } }, '{"a":{"c":2,"d":1},"b":1}'],
    ["a string", "${{ v | json }}", "hi", '"hi"'],
    ["a list", "${{ v | json }}", [2, 1], "[2,1]"],
    ["a missing variable in lenient mode", "${{ v | json }}", undefined, "null"],
    ["a null", "${{ v | json }}", null, "null"],
  ])("fc-json: render, %s", (_n, template, value, expected) => {
    const r = out(template, value);
    expect(r.diagnostics).toEqual([]);
    expect(r.output).toBe(expected);
  });

  describe.each([
    ["lenient", false],
    ["strict", true],
  ])("%s mode", (_label, strictMode) => {
    it.each<[string, unknown]>([
      ["an object holding itself", cyclicObject],
      ["an array holding itself", cyclicArray],
    ])("fc-json: a cyclic value is a type-error at the variable, %s", (_n, value) => {
      const r = out("intro\n  ${{ v | json }}", value, strictMode);
      expect(r.ok).toBe(false);
      expect(r.output).toBe("");
      expect(r.diagnostics[0]?.code).toBe("type-error");
      expect(r.diagnostics[0]?.message).toMatch(/cyclic/i);
      expect({ line: r.diagnostics[0]?.line, column: r.diagnostics[0]?.column }).toEqual({
        line: 2,
        column: 3,
      });
    });
  });
});

describe("fc-json: parameter errors on every collection filter", () => {
  const rows: [string, string][] = [
    ["join:sep=\",\"", 'intro\n  ${{ v | join:sep="," }}'],
    ["length:x=1", "intro\n  ${{ v | length:x=1 }}"],
    ["first:x=1", "intro\n  ${{ v | first:x=1 }}"],
    ["last:x=1", "intro\n  ${{ v | last:x=1 }}"],
    ["sort:by=k", "intro\n  ${{ v | sort:by=k }}"],
    ["unique:x=1", "intro\n  ${{ v | unique:x=1 }}"],
    ["slice:count=2", "intro\n  ${{ v | slice:count=2 }}"],
    ["slice:start=1,count=2", "intro\n  ${{ v | slice:start=1,count=2 }}"],
    ["lines:x=1", "intro\n  ${{ v | lines:x=1 }}"],
    ["json:pretty=1", "intro\n  ${{ v | json:pretty=1 }}"],
  ];

  it("fc-json: every collection filter is covered by a parameter-error row", () => {
    const covered = new Set(rows.map(([, t]) => /\| (\w+)/.exec(t)![1]));
    expect([...covered].sort()).toEqual([...NAMES].sort());
  });

  describe.each([
    ["lenient", false],
    ["strict", true],
  ])("%s mode", (_label, strictMode) => {
    it.each(rows)(
      "fc-json: render reports an undeclared parameter as a type-error at the variable, %s",
      (_n, template) => {
        const r = out(template, ["a", "b"], strictMode);
        expect(r.ok).toBe(false);
        expect(r.output).toBe("");
        expect(r.diagnostics[0]?.code).toBe("type-error");
        expect(r.diagnostics[0]?.message).not.toMatch(/not implemented/);
        expect({ line: r.diagnostics[0]?.line, column: r.diagnostics[0]?.column }).toEqual({
          line: 2,
          column: 3,
        });
      }
    );

    it.each(rows)("fc-json: validate and analyze report the same error, %s", (_n, template) => {
      const v = validate(template);
      expect(v.ok).toBe(false);
      expect(v.diagnostics[0]).toMatchObject({ severity: "error", code: "type-error", line: 2, column: 3 });
      const a = analyze(template).diagnostics[0];
      expect(a).toMatchObject({ code: "type-error", line: 2, column: 3 });
      expect(a?.message).toBe(out(template, ["a", "b"], strictMode).diagnostics[0]?.message);
    });
  });

  it.each([
    ["join", '${{ v | join="," }}'],
    ["length", "${{ v | length }}"],
    ["first", "${{ v | first }}"],
    ["last", "${{ v | last }}"],
    ["sort", "${{ v | sort }}"],
    ["sort=key", "${{ v | sort=k }}"],
    ["unique", "${{ v | unique }}"],
    ["slice", "${{ v | slice:start=1,end=2 }}"],
    ["lines", "${{ v | lines }}"],
    ["json", "${{ v | json }}"],
  ])("fc-json: declared parameters give no diagnostic in validate or analyze, %s", (_n, template) => {
    expect(validate(template).ok).toBe(true);
    expect(analyze(template).diagnostics).toEqual([]);
  });
});
```

## 4. Diff

21 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

Delta documents shown below as the card's own deliverables: docs/ephemeral/cycles/language/deltas/collection-filters-contract.md, docs/ephemeral/cycles/language/deltas/collection-filters-module-page.md.

```diff
diff --git a/core/src/filters-collection.ts b/core/src/filters-collection.ts
index 1d99d44..ac154a6 100644
--- a/core/src/filters-collection.ts
+++ b/core/src/filters-collection.ts
@@ -1,26 +1,216 @@
-import { FilterDefinition } from "./types";
+import { tryCoerceToArray, tryCoerceToString } from "./coercion";
+import { FilterDefinition, TemplateValue } from "./types";
 
-function neutral(): unknown {
-  return null;
+const MISSING = Symbol("missing");
+
+/** A value as the output step prints it (the same rule as `valueToText` in filters.ts) */
+function textOf(value: unknown): string {
+  if (value == null) return "";
+  return tryCoerceToString(value as TemplateValue) || "";
+}
+
+/** The input of a list filter: coerced as FOR coerces it; null is the empty list */
+function toList(filter: string, input: unknown): unknown[] {
+  const list = tryCoerceToArray(input as TemplateValue);
+  if (list) return list;
+  if (typeof input === "object" && input !== null) {
+    throw new Error(`${filter} needs a list, got an object`);
+  }
+  return [];
+}
+
+function isPlainObject(value: unknown): value is Record<string, unknown> {
+  return typeof value === "object" && value !== null && !Array.isArray(value);
+}
+
+/**
+ * Compact JSON with object keys sorted by code unit at every depth. Walks with
+ * an explicit stack so a deep nest cannot overflow the call stack, and tracks
+ * only the current path so a shared, non-cyclic reference is fine.
+ */
+function stableJson(value: unknown): string {
+  interface Frame {
+    node: unknown[] | Record<string, unknown>;
+    keys: string[] | null;
+    size: number;
+    next: number;
+  }
+  const parts: string[] = [];
+  const path = new Set<object>();
+  const stack: Frame[] = [];
+
+  const enter = (v: unknown): void => {
+    if (typeof v !== "object" || v === null) {
+      parts.push(JSON.stringify(v) ?? "null");
+      return;
+    }
+    if (path.has(v)) throw new Error("Cannot serialize a cyclic value");
+    path.add(v);
+    if (Array.isArray(v)) {
+      parts.push("[");
+      stack.push({ node: v, keys: null, size: v.length, next: 0 });
+    } else {
+      const keys = Object.keys(v).sort();
+      parts.push("{");
+      stack.push({ node: v as Record<string, unknown>, keys, size: keys.length, next: 0 });
+    }
+  };
+
+  enter(value);
+  while (stack.length > 0) {
+    const frame = stack[stack.length - 1];
+    if (frame.next === frame.size) {
+      parts.push(frame.keys ? "}" : "]");
+      path.delete(frame.node);
+      stack.pop();
+      continue;
+    }
+    if (frame.next > 0) parts.push(",");
+    let child: unknown;
+    if (frame.keys) {
+      const key = frame.keys[frame.next];
+      parts.push(JSON.stringify(key) + ":");
+      child = (frame.node as Record<string, unknown>)[key];
+    } else {
+      child = (frame.node as unknown[])[frame.next];
+    }
+    frame.next++;
+    enter(child);
+  }
+  return parts.join("");
+}
+
+/** Numbers, then strings, then the rest, then what has no sort value at all */
+function rank(v: unknown): number {
+  if (v === MISSING) return 3;
+  if (typeof v === "number") return 0;
+  if (typeof v === "string") return 1;
+  return 2;
+}
+
+function compare(a: unknown, b: unknown): number {
+  const ra = rank(a);
+  const rb = rank(b);
+  if (ra !== rb) return ra - rb;
+  if (ra === 0) return (a as number) - (b as number);
+  if (ra === 1) return (a as string) < (b as string) ? -1 : (a as string) > (b as string) ? 1 : 0;
+  return 0;
 }
 
-function stub(
-  name: string,
-  params: string,
-  description: string,
-  paramNames: string[]
-): FilterDefinition {
-  return { name, params, description, paramNames, apply: neutral };
+function toBound(name: string, text: string | undefined): number | undefined {
+  if (text === undefined) return undefined;
+  if (!/^[+-]?\d+$/.test(text)) {
+    throw new Error(`slice ${name} must be a whole number, got "${text}"`);
+  }
+  return parseInt(text, 10);
 }
 
 export const COLLECTION_FILTERS: FilterDefinition[] = [
-  stub("join", "join=SEP", "Items joined with SEP, each as the output step prints it", ["value"]),
-  stub("length", "", "Items of a list, characters of a text, keys of an object", []),
-  stub("first", "", "First item of a list, empty when there is none", []),
-  stub("last", "", "Last item of a list, empty when there is none", []),
-  stub("sort", "sort[=key]", "Stable sort: numbers, then strings, then the rest; sort=key orders objects by that key", ["value"]),
-  stub("unique", "", "List with the first occurrence of each value, order kept", []),
-  stub("slice", "slice[:start=N,end=N]", "Part of a list from start up to end; negative counts from the end", ["start", "end"]),
-  stub("lines", "", "Text split on line breaks into a list", []),
-  stub("json", "", "Compact JSON text with object keys in stable order", []),
+  {
+    name: "join",
+    params: "join=SEP",
+    description: "Items joined with SEP, each as the output step prints it",
+    paramNames: ["value"],
+    apply(input, params) {
+      const sep = params.value;
+      if (sep === undefined) throw new Error("join needs a separator, as join=SEP");
+      return toList("join", input).map(textOf).join(sep);
+    },
+  },
+  {
+    name: "length",
+    params: "",
+    description: "Items of a list, characters of a text, keys of an object",
+    paramNames: [],
+    apply(input) {
+      if (input == null) return 0;
+      if (typeof input === "string" || Array.isArray(input)) return input.length;
+      if (typeof input === "object") return Object.keys(input).length;
+      return String(input).length;
+    },
+  },
+  {
+    name: "first",
+    params: "",
+    description: "First item of a list, empty when there is none",
+    paramNames: [],
+    apply(input) {
+      const list = toList("first", input);
+      return list.length > 0 ? list[0] : null;
+    },
+  },
+  {
+    name: "last",
+    params: "",
+    description: "Last item of a list, empty when there is none",
+    paramNames: [],
+    apply(input) {
+      const list = toList("last", input);
+      return list.length > 0 ? list[list.length - 1] : null;
+    },
+  },
+  {
+    name: "sort",
+    params: "sort[=key]",
+    description:
+      "Stable sort: numbers, then strings, then the rest; sort=key orders objects by that key",
+    paramNames: ["value"],
+    apply(input, params) {
+      const key = params.value;
+      const keyed = toList("sort", input).map((item) => ({
+        item,
+        by:
+          key === undefined
+            ? item
+            : isPlainObject(item) && Object.prototype.hasOwnProperty.call(item, key)
+              ? item[key]
+              : MISSING,
+      }));
+      return keyed.sort((a, b) => compare(a.by, b.by)).map((entry) => entry.item);
+    },
+  },
+  {
+    name: "unique",
+    params: "",
+    description: "List with the first occurrence of each value, order kept",
+    paramNames: [],
+    apply(input) {
+      const seen = new Set<string>();
+      return toList("unique", input).filter((item) => {
+        const id = typeof item + ":" + (typeof item === "object" ? stableJson(item) : String(item));
+        if (seen.has(id)) return false;
+        seen.add(id);
+        return true;
+      });
+    },
+  },
+  {
+    name: "slice",
+    params: "slice[:start=N,end=N]",
+    description: "Part of a list from start up to end; negative counts from the end",
+    paramNames: ["start", "end"],
+    apply(input, params) {
+      return toList("slice", input).slice(toBound("start", params.start), toBound("end", params.end));
+    },
+  },
+  {
+    name: "lines",
+    params: "",
+    description: "Text split on line breaks into a list",
+    paramNames: [],
+    apply(input) {
+      const text = textOf(input);
+      if (text === "") return [];
+      const items = text.split(/\r\n|\r|\n/);
+      if (items[items.length - 1] === "") items.pop();
+      return items;
+    },
+  },
+  {
+    name: "json",
+    params: "",
+    description: "Compact JSON text with object keys in stable order",
+    paramNames: [],
+    apply: (input) => stableJson(input),
+  },
 ];
diff --git a/docs/living/architecture/language-contract.md b/docs/living/architecture/language-contract.md
index b08287e..cbb4215 100644
--- a/docs/living/architecture/language-contract.md
+++ b/docs/living/architecture/language-contract.md
@@ -22,3 +22,18 @@ The contract for the template language beyond the prompt-aware constructs: filte
 - **Defaults.** A quote in a `??` default opens only when a value starts with it and closes; an unterminated quote is plain text and never hides the filters after it.
 - **Static checks.** `validate` and `analyze` report an undeclared parameter as a `type-error` at the variable, the same code, position and wording as `render`.
 - **Known gap.** `FILTERS` (exported for compatibility) is a snapshot of the registry names taken at load; code that needs the live list reads `FILTER_REGISTRY` or `spec()`.
+
+### Collection filters
+
+Nine filters in `filters-collection.ts` (`COLLECTION_FILTERS`), in this order: `join=SEP`, `length`, `first`, `last`, `sort[=key]`, `unique`, `slice[:start=N,end=N]`, `lines`, `json`.
+
+- **Input.** `join first last sort unique slice` coerce their input as FOR does: an array passes through, a text such as `"a,b,c"` or `'["x","y"]'` becomes a list, a number or boolean a one-item list, null or a missing value the empty list. An object given to one of them is a `type-error`. No filter changes its input.
+- **Output.** A filter returns a value: `join`, `json` a text; `length` a number; `first`, `last` an item (null when the list is empty); `sort`, `unique`, `slice`, `lines` a list, which the output step prints as compact JSON and the next filter receives as a list.
+- **join.** `join=SEP` needs its separator (`join=""` is allowed); items print as the output step prints them.
+- **length.** Items of a list, characters of a text (not split into items), keys of an object, characters of a number or boolean's text form; 0 for null or missing.
+- **slice.** `Array.prototype.slice` semantics (negative counts from the end); each given bound is an integer, else a `type-error`.
+- **lines.** The text form split on `\r\n`, `\r` or `\n`; one trailing line break adds no empty item.
+- **sort.** Stable and deterministic: numbers numeric, then strings by code unit (so `"10"` before `"9"`), then every other value in its original order. `sort=key` orders object items by that property with the same rule; items without it come last.
+- **unique.** Keeps the first occurrence; two values are equal when they have the same type and value (`1` and `"1"` differ), objects and arrays by their `json` text.
+- **json.** Compact JSON with object keys sorted by code unit at every depth; null and missing give `null`; a cyclic value is a `type-error`, a shared non-cyclic reference is not.
+- **Errors.** A parameter a collection filter does not declare is a located `type-error` in every mode, as for every filter.
diff --git a/docs/living/architecture/modules/template-resolver.md b/docs/living/architecture/modules/template-resolver.md
index fbfbe22..3582001 100644
--- a/docs/living/architecture/modules/template-resolver.md
+++ b/docs/living/architecture/modules/template-resolver.md
@@ -148,6 +148,8 @@ Every filter is one definition in `FILTER_REGISTRY` (`core/src/filters.ts`; the
 
 Applied left to right to the string form of the value, after `??`. Syntax per filter: bare name, `name=value`, or `name:key="v",key2="v2"` [src: nodes/TemplateResolver/filters.ts:11-65]. Implemented names: `head=N` (first N characters; negative N drops the last N), `tail=N` (last N; `0` gives `""`; negative N drops the first N), `trim`, `escape_md` (backslash-escapes `\ * _ [ ] ( ) # ` > ~ |`) [src: nodes/TemplateResolver/filters.ts:89-186]. Any other name throws a plain `Error` "Unknown filter" [src: nodes/TemplateResolver/filters.ts:99-100]
 
+Collection filters (`filters-collection.ts`): `join=SEP`, `length`, `first`, `last`, `sort[=key]`, `unique`, `slice[:start=N,end=N]`, `lines` and `json`. List input is coerced as FOR coerces it, a missing value is the empty list, an object given to a list filter is a `type-error`, `sort` and `json` are deterministic (code-unit order, sorted keys) and `json` rejects a cyclic value. Details: `docs/living/architecture/language-contract.md`.
+
 ### Coercion and repair of string input
 
 - Number: numbers (not `NaN`), booleans (1/0), non-empty trimmed numeric strings; else `null` [src: nodes/TemplateResolver/coercion.ts:15-35]
diff --git a/tests/language/filters-collection.test.ts b/tests/language/filters-collection.test.ts
index 2e536da..d6b8e32 100644
--- a/tests/language/filters-collection.test.ts
+++ b/tests/language/filters-collection.test.ts
@@ -185,7 +185,7 @@ describe("fc-collection: render", () => {
   });
 
   it("fc-collection: a missing variable renders the same as an empty list in lenient mode", () => {
-    const r = render('${{ v | join="," }}|${{ v | length }}', {}, RAW);
+    const r = render('${{ v | join="," }}|${{ v | length }}', {}, { ...RAW, strictMode: false });
     expect(r.ok).toBe(true);
     expect(r.output).toBe("|0");
   });
diff --git a/docs/ephemeral/cycles/language/deltas/collection-filters-contract.md b/docs/ephemeral/cycles/language/deltas/collection-filters-contract.md
new file mode 100644
index 0000000..39e740e
--- /dev/null
+++ b/docs/ephemeral/cycles/language/deltas/collection-filters-contract.md
@@ -0,0 +1,10 @@
+---
+summary: "Collection filters: join, length, first, last, sort, unique, slice, lines and json, with coercion, ordering and error rules"
+op: modify
+target: docs/living/architecture/language-contract.md
+status: open
+---
+
+# Proposed change
+
+<!-- Say what changes in the target document. For add: what the planned document will cover. For modify: which parts change and why. For remove: why the document goes. For recover: the area the recovered document describes; apply it by slug when its archaeology card is done. Other changes are applied when the cycle merges, and the document becomes built. Nobody sets validated here: only an approved close review does. -->
diff --git a/docs/ephemeral/cycles/language/deltas/collection-filters-module-page.md b/docs/ephemeral/cycles/language/deltas/collection-filters-module-page.md
new file mode 100644
index 0000000..a8747b1
--- /dev/null
+++ b/docs/ephemeral/cycles/language/deltas/collection-filters-module-page.md
@@ -0,0 +1,10 @@
+---
+summary: Filters section lists the collection filter group and its behavior
+op: modify
+target: docs/living/architecture/modules/template-resolver.md
+status: open
+---
+
+# Proposed change
+
+<!-- Say what changes in the target document. For add: what the planned document will cover. For modify: which parts change and why. For remove: why the document goes. For recover: the area the recovered document describes; apply it by slug when its archaeology card is done. Other changes are applied when the cycle merges, and the document becomes built. Nobody sets validated here: only an approved close review does. -->
```

## Gate run

Gate command green at commit 010500d4fdf4 (249 tests).

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
