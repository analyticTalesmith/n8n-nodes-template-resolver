---
type: review-packet
card: 261015-language3911-a3-add-the-text-filters
tier: product
built_at: 2026-10-15T03:40:29.828Z
base: f4e552a71ebe770925d1bd5eb5a33fdaf91c1974
head: 2534436c6d0bfe9619a26038e8ee3724180e21e3
read_at: 2534436c6d0bfe9619a26038e8ee3724180e21e3
frozen: true
brief_sha256: b8c2cbe6503ca0262a3d73019f3016d601fe54e9dd5f9c4922710e7df2b35caa
manifest_sha256: 4b358cdbaae10f433c2580bc5001444c7338fb4c07bcd4ee9717dd58da6f944d
criteria_sha256: 3afaec3ab66d775f61aeb6516e48fcd56ac96b1c328e103b9b50ee81a3025f1a
scope_sha256: 9efaef929a6791f1ecffc91abad1db6c36e323df1076b617b5f6038f67126930
diff_sha256: b9d0296759bc70b81774ff9b8906e397846481f8e2d0369ee90aaebceb7e4145
omitted_paths: 24
criteria_count: 3
must_not_count: 5
---

# Review packet: 261015-language3911-a3-add-the-text-filters

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: authors can reshape text with upper, lower, title, replace, indent, quote, round and default, each a row in the text filter group of the registry, with wrong or missing parameters reported as located type-errors.

### Criteria

- c1 (verify: test): ft-text: each of upper, lower, title, replace (replace:find="a",with="b", every occurrence), indent (indent=N spaces on every non-empty line, default 2), quote (a JSON-style double-quoted string) and round (round=N decimal places, default 0) gives the expected output for a table of inputs, including empty, number, boolean and non-string input coerced to text first; no existing filter output changes
- c2 (verify: test): ft-params: a missing required parameter (replace without find, round or indent with a non-integer) or a parameter the filter does not declare is a type-error located at the variable, in every mode
- c3 (verify: test): ft-default: default="x" replaces a value that is not truthy (missing, null, empty text, 0, false, empty list, empty object); the existing ?? keeps its current behaviour in this card

### Must not

- m1: change any existing test expectation
- m2: change what any existing filter outputs, or what `??` does
- m3: add a runtime dependency
- m4: evaluate template text as code or compile a template-supplied regular expression
- m5: let an unknown name or bad parameter pass in lenient mode (ADR 0003)

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: authors can reshape text with upper, lower, title, replace, indent, quote, round and default, each a row in the text filter group of the registry, with wrong or missing parameters reported as located type-errors.
Must not:
- change any existing test expectation
- change what any existing filter outputs, or what `??` does
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Questions

goal-critical: does every bad parameter (missing find, non-integer or out-of-range indent or round, an undeclared parameter, default without a value) end in a located type-error in every mode, never a silent fallback?
goal-critical: does replace match literal text only, with every occurrence replaced and no pattern ever compiled from template text?
goal-critical: does default replace exactly the values that are not truthy, and does `??` keep its current behaviour?
goal-critical: does any existing template render a different output than before?
polish: does round avoid binary float noise (1.005 with round=2) and indent leave empty lines and line breaks alone?
polish: are the eight rows small, in the text group only, with no second filter list and no dispatch or parser change?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope
- the registry is the only place a filter name is listed

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
```

### spec.md as of base f4e552a71ebe, read at 2534436c6d0b

```
# Spec

## Acceptance criteria

- ft-text: each of upper, lower, title, replace (replace:find="a",with="b", every occurrence), indent (indent=N spaces on every non-empty line, default 2), quote (a JSON-style double-quoted string) and round (round=N decimal places, default 0) gives the expected output for a table of inputs, including empty, number, boolean and non-string input coerced to text first; no existing filter output changes
- ft-params: a missing required parameter (replace without find, round or indent with a non-integer) or a parameter the filter does not declare is a type-error located at the variable, in every mode
- ft-default: default="x" replaces a value that is not truthy (missing, null, empty text, 0, false, empty list, empty object); the existing ?? keeps its current behaviour in this card

## Interface (names the tests may import)

- `core/src/filters-text.ts` exports `TEXT_FILTERS: FilterDefinition[]` (type in `core/src/types.ts`) with the rows `upper`, `lower`, `title`, `replace` (paramNames `["find","with"]`), `indent` (paramNames `["value"]`), `quote`, `round` (paramNames `["value"]`) and `default` (paramNames `["value"]`), in this order. The registry in `core/src/filters.ts` already includes the group; no dispatch or parser change.

## Behavior settled for this card

- Every filter except `default` coerces its input to text exactly as the output step prints it (`valueToText`); `default` reads the raw value and uses the interpreter's truthiness (`isTruthy`).
- `upper`, `lower`, `quote` take no parameter. `title` upper-cases the first letter of each whitespace-separated word and lower-cases the rest.
- `replace` replaces every non-overlapping occurrence of the literal `find` (required, non-empty) by `with` (optional, default empty text); no pattern is ever compiled.
- `indent=N` (default 2, integer 0 to 100) adds N spaces to every line of positive length; line breaks are kept. `round=N` (default 0, integer 0 to 20) rounds half away from zero in decimal arithmetic and prints exactly N decimals; input that is not a finite number passes through unchanged.
- `quote` prints the JSON double-quoted form of the text. `default=X` (required) returns X when the raw input is not truthy.
- A missing or non-integer or out-of-range parameter throws an error that the interpreter reports as a type-error at the variable; an undeclared parameter is already a type-error by the registry. `validate` and `analyze` run without data, so they check names and undeclared parameters only; a bad parameter value surfaces at render.

## Examples

- `${{ s | replace:find="a",with="b" }}` over `banana` is `bbnbnb`.
- `${{ n | round=2 }}` over `1.005` is `1.01`; over `3.1` is `3.10`.
- `${{ t | indent=4 }}` over `a\n\nb` is `    a\n\n    b`.
- `${{ x | default="n/a" }}` with `x` of `0` is `n/a`; `${{ x | indent=two }}` fails with a type-error located at the variable.
```

### card.md as of base f4e552a71ebe, read at 2534436c6d0b

```
# Add the text filters

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Authors can reshape text in the language with upper, lower, title, replace, indent, quote, round and default, each a row in the text filter group of the registry, with wrong or missing parameters reported as located type-errors.

## Must-haves

- `contract` `ft-text` each of upper, lower, title, replace (replace:find="a",with="b", every occurrence), indent (indent=N spaces on every non-empty line, default 2), quote (a JSON-style double-quoted string) and round (round=N decimal places, default 0) gives the expected output for a table of inputs, including empty, number, boolean and non-string input coerced to text first; no existing filter output changes
- `contract` `ft-params` a missing required parameter (replace without find, round or indent with a non-integer) or a parameter the filter does not declare is a type-error located at the variable, in every mode
- `contract` `ft-default` default="x" replaces a value that is not truthy (missing, null, empty text, 0, false, empty list, empty object); the existing ?? keeps its current behaviour in this card

## Acceptance criteria

- ft-text: each of upper, lower, title, replace (replace:find="a",with="b", every occurrence), indent (indent=N spaces on every non-empty line, default 2), quote (a JSON-style double-quoted string) and round (round=N decimal places, default 0) gives the expected output for a table of inputs, including empty, number, boolean and non-string input coerced to text first; no existing filter output changes
- ft-params: a missing required parameter (replace without find, round or indent with a non-integer) or a parameter the filter does not declare is a type-error located at the variable, in every mode
- ft-default: default="x" replaces a value that is not truthy (missing, null, empty text, 0, false, empty list, empty object); the existing ?? keeps its current behaviour in this card

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

core/src/filters-text.ts exports TEXT_FILTERS: FilterDefinition[] with rows upper (no params), lower, title, replace (params: find, with), indent (shorthand = spaces), quote, round (shorthand = places) and default (shorthand = replacement text). No dispatch or parser change.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/language/filters-text.test.ts` | add | template-resolver |
| `core/src/filters-text.ts` | edit | template-resolver |

Files scope: `core/src/filters-text.ts`, `tests/language/filters-text.test.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

Each row is a change outside the card's scope that its lead approved. A builder who can edit the card folder can add a row, so the human gate is the backstop.

| Date | Path | Kind | Reason | Approved by |
| --- | --- | --- | --- | --- |
| 2026-10-15 | `docs/ephemeral/cycles/language/deltas/text-filters-contract.md` | add | delta for the living contract this card changes (docs_impact) | build lead, authorized by the project lead's brief |
| 2026-10-15 | `docs/ephemeral/cycles/language/deltas/text-filters-module-page.md` | add | delta for the living module page this card changes (docs_impact) | build lead, authorized by the project lead's brief |

### Manifest and scope

- add: `tests/language/filters-text.test.ts`
- remove: none
- edit: `core/src/filters-text.ts`
- files_scope: `core/src/filters-text.ts`, `tests/language/filters-text.test.ts`

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

These test files are shown as committed at 2534436c6d0b, the commit the contract is read at; the diff starts at base f4e552a71ebe, so a file added or changed since then is in the diff too. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/language/filters-text.test.ts (frozen)

````
import { FILTER_REGISTRY, analyze, render, spec, validate } from "../../core/src";
import { TEXT_FILTERS } from "../../core/src/filters-text";

// Jest has no assertion-message argument; each test name states the behavior expected,
// and the red reason is read from the matcher's expected/received pair.
const RAW = { standaloneLines: false };
const LENIENT = { ...RAW, strictMode: false };
const STRICT = { ...RAW, strictMode: true };

const SIX = ["head", "tail", "trim", "escape_md", "fence", "heading_offset"];
const EIGHT = ["upper", "lower", "title", "replace", "indent", "quote", "round", "default"];

/** Marks a variable that is absent from the data. */
const MISSING = Symbol("missing");

/** Renders `${{ v | <call> }}` in lenient mode; the data holds `v` unless the row says it is missing. */
function run(call: string, value: unknown) {
  const data = value === MISSING ? {} : { v: value };
  return render("${{ v | " + call + " }}", data, LENIENT);
}

type Row = [label: string, value: unknown, expected: string];

const ARR = [1, 2, 3];
const OBJ = { a: 1, b: "x" };

function tableTests(name: string, call: string, rows: Row[]) {
  it.each(rows)("ft-text: " + name + " (" + call + "), %s", (_label, value, expected) => {
    const r = run(call, value);
    expect(r.diagnostics).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });
}

describe("ft-text: the registry holds the eight text filters after the six", () => {
  it("ft-text: the registry names are the six existing filters then the eight new ones in order", () => {
    expect(FILTER_REGISTRY.slice(0, 6).map((f) => f.name)).toEqual(SIX);
    expect(FILTER_REGISTRY.slice(6, 14).map((f) => f.name)).toEqual(EIGHT);
  });

  it("ft-text: TEXT_FILTERS holds the eight names in order", () => {
    expect(TEXT_FILTERS.map((f) => f.name)).toEqual(EIGHT);
  });

  it("ft-text: declared parameter names are none, none, none, find and with, value, none, value, value", () => {
    const byName = Object.fromEntries(TEXT_FILTERS.map((f) => [f.name, f.paramNames]));
    expect(byName).toEqual({
      upper: [],
      lower: [],
      title: [],
      replace: ["find", "with"],
      indent: ["value"],
      quote: [],
      round: ["value"],
      default: ["value"],
    });
  });

  it("ft-text: spec lists the eight with a non-empty params text and description", () => {
    const listed = spec().filters.filter((f) => EIGHT.includes(f.name));
    expect(listed.map((f) => f.name)).toEqual(EIGHT);
    for (const f of listed) {
      expect(f.params.startsWith(f.name)).toBe(true);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });
});

describe("ft-text: upper", () => {
  tableTests("upper", "upper", [
    ["text", "abc Def", "ABC DEF"],
    ["empty text", "", ""],
    ["missing variable", MISSING, ""],
    ["null", null, ""],
    ["number 3.14159", 3.14159, "3.14159"],
    ["number 0", 0, "0"],
    ["number 1000000", 1000000, "1000000"],
    ["boolean true", true, "TRUE"],
    ["boolean false", false, "FALSE"],
    ["array printed form", ARR, "[1,2,3]"],
    ["object printed form", OBJ, '{"A":1,"B":"X"}'],
    ["multi-line", "a\nb", "A\nB"],
    ["CRLF", "a\r\nb", "A\r\nB"],
    ["unicode", "éclair ñ", "ÉCLAIR Ñ"],
  ]);
});

describe("ft-text: lower", () => {
  tableTests("lower", "lower", [
    ["text", "ABC Def", "abc def"],
    ["empty text", "", ""],
    ["missing variable", MISSING, ""],
    ["null", null, ""],
    ["number 3.14159", 3.14159, "3.14159"],
    ["number 0", 0, "0"],
    ["number 1000000", 1000000, "1000000"],
    ["boolean true", true, "true"],
    ["array printed form", ARR, "[1,2,3]"],
    ["object printed form", { A: 1, B: "X" }, '{"a":1,"b":"x"}'],
    ["multi-line", "A\nB", "a\nb"],
    ["CRLF", "A\r\nB", "a\r\nb"],
    ["unicode", "ÉCLAIR Ñ", "éclair ñ"],
  ]);
});

describe("ft-text: title", () => {
  tableTests("title", "title", [
    ["rest of each word lower-cased", "hello WORLD", "Hello World"],
    ["all caps", "HELLO", "Hello"],
    ["already titled", "Hello World", "Hello World"],
    ["empty text", "", ""],
    ["missing variable", MISSING, ""],
    ["null", null, ""],
    ["number 3.14159", 3.14159, "3.14159"],
    ["number 0", 0, "0"],
    ["number 1000000", 1000000, "1000000"],
    ["boolean true", true, "True"],
    ["boolean false", false, "False"],
    ["array printed form", ARR, "[1,2,3]"],
    ["whitespace kept as is", "  hello   wORLD  ", "  Hello   World  "],
    ["line break separates words", "ab\ncD", "Ab\nCd"],
    ["CRLF separates words", "ab\r\ncD", "Ab\r\nCd"],
    ["apostrophe is not a word break", "o'NEIL", "O'neil"],
    ["hyphen is not a word break", "hello-WORLD", "Hello-world"],
    ["unicode", "éCLAIR ñANDÚ", "Éclair Ñandú"],
  ]);
});

describe("ft-text: replace", () => {
  tableTests("replace", 'replace:find="a",with="b"', [
    ["every occurrence", "banana", "bbnbnb"],
    ["adjacent occurrences", "aaa", "bbb"],
    ["no occurrence", "xyz", "xyz"],
    ["empty text", "", ""],
    ["missing variable", MISSING, ""],
    ["null", null, ""],
    ["matching is case sensitive", "Aa", "Ab"],
    ["boolean false coerced to text", false, "fblse"],
    ["array printed form", [1, "a"], '[1,"b"]'],
    ["object printed form", OBJ, '{"b":1,"b":"x"}'],
    ["CRLF kept", "a\r\nb", "b\r\nb"],
    ["multi-line", "a\na", "b\nb"],
    ["unicode", "ààb", "ààb"],
  ]);

  tableTests("replace", 'replace:find="1",with="7"', [
    ["number 3.14159 coerced to text", 3.14159, "3.74759"],
    ["number 1000000", 1000000, "7000000"],
  ]);

  tableTests("replace", 'replace:find="é",with="e"', [["unicode find", "éé x", "ee x"]]);
  tableTests("replace", 'replace:find="r",with="R"', [["boolean true coerced to text", true, "tRue"]]);

  tableTests("replace", 'replace:find="aa",with="b"', [
    ["non-overlapping, four a", "aaaa", "bb"],
    ["non-overlapping, three a", "aaa", "ba"],
  ]);

  tableTests("replace", 'replace:find="a"', [
    ["with omitted deletes", "banana", "bnn"],
    ["with omitted on empty text", "", ""],
  ]);

  tableTests("replace", 'replace:find="a",with=""', [["with empty deletes", "banana", "bnn"]]);

  tableTests("replace", 'replace:find=".",with="!"', [
    ["find is literal text, dots only", "a.b.c", "a!b!c"],
    ["a dot does not match any character", "abc", "abc"],
  ]);

  tableTests("replace", 'replace:find="(x)",with="y"', [
    ["find with pattern characters is literal", "a(x)b x", "ayb x"],
  ]);

  tableTests("replace", 'replace:find="a",with="$&$&"', [
    ["with is literal, no special replacement patterns", "banana", "b$&$&n$&$&n$&$&"],
  ]);

  tableTests("replace", 'replace:find="*",with="-"', [["find with a star is literal", "a*b**", "a-b--"]]);

  it("ft-text: replace chained after upper replaces in the upper-cased text", () => {
    const r = run('upper | replace:find="A",with="b"', "banana");
    expect(r.ok).toBe(true);
    expect(r.output).toBe("BbNbNb");
  });
});

describe("ft-text: indent", () => {
  tableTests("indent", "indent", [
    ["default is two spaces on every line", "a\nb", "  a\n  b"],
    ["single line", "a", "  a"],
    ["empty lines are left empty", "a\n\nb", "  a\n\n  b"],
    ["final line break does not gain spaces", "a\n", "  a\n"],
    ["only a line break", "\n", "\n"],
    ["empty text", "", ""],
    ["missing variable", MISSING, ""],
    ["null", null, ""],
    ["number 42", 42, "  42"],
    ["number 0", 0, "  0"],
    ["boolean true", true, "  true"],
    ["array printed form", ARR, "  [1,2,3]"],
    ["object printed form", OBJ, '  {"a":1,"b":"x"}'],
    ["CRLF lines kept and empty line left empty", "a\r\n\r\nb", "  a\r\n\r\n  b"],
    ["final CRLF does not gain spaces", "a\r\n", "  a\r\n"],
    ["a line of only a space is not empty", "a\n \nb", "  a\n   \n  b"],
    ["unicode", "é\nñ", "  é\n  ñ"],
  ]);

  tableTests("indent", "indent=4", [
    ["four spaces", "a\nb", "    a\n    b"],
    ["empty lines still empty", "a\n\nb\n", "    a\n\n    b\n"],
  ]);

  tableTests("indent", "indent=0", [["zero spaces leaves text unchanged", "a\n\nb", "a\n\nb"]]);

  tableTests("indent", 'indent="3"', [["a quoted count behaves like an unquoted one", "a", "   a"]]);

  tableTests("indent", "indent=100", [["the upper bound is allowed", "a", " ".repeat(100) + "a"]]);

  tableTests("indent", "indent=1", [["number input coerced to text", 3.14159, " 3.14159"]]);
});

describe("ft-text: quote", () => {
  const rows: Row[] = [
    ["text", "abc", '"abc"'],
    ["empty text", "", '""'],
    ["missing variable", MISSING, '""'],
    ["null", null, '""'],
    ["number 3.14159", 3.14159, '"3.14159"'],
    ["number 0", 0, '"0"'],
    ["number 1000000", 1000000, '"1000000"'],
    ["boolean true", true, '"true"'],
    ["boolean false", false, '"false"'],
    ["array printed form", ARR, JSON.stringify("[1,2,3]")],
    ["object printed form", OBJ, JSON.stringify('{"a":1,"b":"x"}')],
    ["double quotes escaped", 'say "hi"', JSON.stringify('say "hi"')],
    ["backslash escaped", "a\\b", JSON.stringify("a\\b")],
    ["line break escaped", "a\nb", JSON.stringify("a\nb")],
    ["CRLF escaped", "a\r\nb", JSON.stringify("a\r\nb")],
    ["tab escaped", "a\tb", JSON.stringify("a\tb")],
    ["control character escaped", "a\u0001b", JSON.stringify("a\u0001b")],
    ["unicode kept", "éclair ñ", JSON.stringify("éclair ñ")],
  ];
  tableTests("quote", "quote", rows);

  it("ft-text: quote output parses back to the coerced text", () => {
    const r = run("quote", 'x "y" \\ \n\t');
    expect(r.ok).toBe(true);
    expect(JSON.parse(r.output)).toBe('x "y" \\ \n\t');
  });
});

describe("ft-text: round", () => {
  tableTests("round", "round", [
    ["default zero places", 3.14159, "3"],
    ["half rounds up", 2.5, "3"],
    ["negative half rounds away from zero", -2.5, "-3"],
    ["number 0", 0, "0"],
    ["number 1000000", 1000000, "1000000"],
    ["string number", "3.7", "4"],
    ["text half", "0.5", "1"],
    ["negative text half", "-0.5", "-1"],
    ["1.5", "1.5", "2"],
    ["-1.5", "-1.5", "-2"],
    ["negative zero prints 0", -0.4, "0"],
    ["negative zero text prints 0", "-0", "0"],
    ["not a number passes through", "abc", "abc"],
    ["empty text passes through", "", ""],
    ["missing variable gives empty text", MISSING, ""],
    ["null gives empty text", null, ""],
    ["boolean true is not a number", true, "true"],
    ["boolean false is not a number", false, "false"],
    ["array is not a number", ARR, "[1,2,3]"],
    ["object is not a number", OBJ, '{"a":1,"b":"x"}'],
    ["Infinity is not finite", "Infinity", "Infinity"],
    ["NaN is not finite", "NaN", "NaN"],
  ]);

  tableTests("round", "round=2", [
    ["number 3.14159", 3.14159, "3.14"],
    ["1.005 rounds in decimal arithmetic", 1.005, "1.01"],
    ["1.005 as text", "1.005", "1.01"],
    ["2.675 rounds in decimal arithmetic", "2.675", "2.68"],
    ["-1.005 rounds away from zero", "-1.005", "-1.01"],
    ["pads to exactly two decimals", 3.1, "3.10"],
    ["integer padded", "10", "10.00"],
    ["zero padded", 0, "0.00"],
    ["empty text passes through", "", ""],
    ["not a number passes through", "abc", "abc"],
  ]);

  tableTests("round", "round=1", [
    ["0.05 rounds up", "0.05", "0.1"],
    ["large value", "1234567.891", "1234567.9"],
    ["1000000", 1000000, "1000000.0"],
  ]);

  tableTests("round", "round=0", [["explicit zero", "2.5", "3"]]);
  tableTests("round", 'round="2"', [["quoted places", "3.14159", "3.14"]]);
  tableTests("round", "round=20", [["twenty places is allowed", "0.1", "0.10000000000000000000"]]);

  it("ft-text: round then quote chains", () => {
    const r = run("round=1 | quote", 3.14159);
    expect(r.ok).toBe(true);
    expect(r.output).toBe('"3.1"');
  });

  it("ft-text: round passes text through to quote unchanged", () => {
    const r = run("round=1 | quote", "abc");
    expect(r.ok).toBe(true);
    expect(r.output).toBe('"abc"');
  });
});

describe("ft-text: existing filters keep their output", () => {
  const rows: [string, string, unknown, string][] = [
    ["trim", "trim", "  a  ", "a"],
    ["head=2", "head=2", "abc", "ab"],
    ["tail=2", "tail=2", "abc", "bc"],
    ["escape_md", "escape_md", "*a*", "\\*a\\*"],
    ["fence", "fence=js", "x", "```js\nx\n```\n"],
    ["heading_offset=1", "heading_offset=1", "# T", "## T"],
    ["trim then upper", "trim | upper", "  ab ", "AB"],
    ["upper then head", "upper | head=2", "abc", "AB"],
  ];
  it.each(rows)("ft-text: %s", (_n, call, value, expected) => {
    const r = run(call, value);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });
});

// Located at the variable: line 2, column 3 proves the location is not a default 1:1.
const TEXT_ERROR_CALLS: [string, string][] = [
  ["replace without find", "replace"],
  ["replace with only with", 'replace:with="b"'],
  ["replace with an empty find", 'replace:find=""'],
  ["replace with an undeclared name", 'replace:find="a",x=1'],
  ["replace with find, with and an undeclared name", 'replace:find="a",with="b",x=1'],
  ["replace with the shorthand value", "replace=a"],
  ["indent=x", "indent=x"],
  ["indent=1.5", "indent=1.5"],
  ["indent=-1", "indent=-1"],
  ["indent=101", "indent=101"],
  ["indent with an empty value", 'indent=""'],
  ["indent:x=1", "indent:x=1"],
  ["round=x", "round=x"],
  ["round=1.5", "round=1.5"],
  ["round=-1", "round=-1"],
  ["round=21", "round=21"],
  ["round with an empty value", 'round=""'],
  ["round:x=1", "round:x=1"],
  ["default without a value", "default"],
  ["default:x=1", 'default:x="1"'],
  ["upper=1", "upper=1"],
  ["upper:x=1", "upper:x=1"],
  ["lower=1", "lower=1"],
  ["lower:x=1", "lower:x=1"],
  ["title=1", "title=1"],
  ["title:x=1", "title:x=1"],
  ["quote=1", "quote=1"],
  ["quote:x=1", "quote:x=1"],
];

// A static check has no data, so it can only know a parameter name the filter does not declare;
// a missing or malformed parameter value is found when the filter runs.
const UNDECLARED_CALLS = TEXT_ERROR_CALLS.filter(([n]) =>
  [
    "replace with an undeclared name",
    "replace with find, with and an undeclared name",
    "replace with the shorthand value",
    "indent:x=1",
    "round:x=1",
    "default:x=1",
    "upper=1",
    "upper:x=1",
    "lower=1",
    "lower:x=1",
    "title=1",
    "title:x=1",
    "quote=1",
    "quote:x=1",
  ].includes(n)
);

describe.each([
  ["lenient", LENIENT],
  ["strict", STRICT],
])("ft-params: %s mode", (_mode, options) => {
  it.each(TEXT_ERROR_CALLS)("ft-params: a bad or missing parameter is a type-error at the variable, %s", (_n, call) => {
    const template = "intro\n  ${{ v | " + call + " }}";
    const r = render(template, { v: "x" }, options);
    expect(r.ok).toBe(false);
    expect(r.output).toBe("");
    expect(r.diagnostics[0]?.code).toBe("type-error");
    expect({ line: r.diagnostics[0]?.line, column: r.diagnostics[0]?.column }).toEqual({ line: 2, column: 3 });
  });

  it.each(UNDECLARED_CALLS)("ft-params: validate and analyze agree with render on an undeclared parameter, %s", (_n, call) => {
    const template = "intro\n  ${{ v | " + call + " }}";
    const v = validate(template);
    expect(v.ok).toBe(false);
    expect(v.diagnostics[0]).toMatchObject({ severity: "error", code: "type-error", line: 2, column: 3 });
    const a = analyze(template).diagnostics[0];
    expect(a).toMatchObject({ code: "type-error", line: 2, column: 3 });
    const r = render(template, { v: "x" }, options);
    expect(a?.message).toBe(r.diagnostics[0]?.message);
  });
});

describe("ft-params: valid calls give no diagnostic", () => {
  const valid = [
    "upper",
    "lower",
    "title",
    "quote",
    'replace:find="a"',
    'replace:find="a",with="b"',
    'replace:find="a",with=""',
    "indent",
    "indent=0",
    "indent=100",
    "round",
    "round=0",
    "round=20",
    'default="x"',
    "default=x",
  ];
  it.each(valid)("ft-params: %s is accepted by validate and analyze", (call) => {
    const template = "intro\n  ${{ v | " + call + " }}";
    expect(validate(template).ok).toBe(true);
    expect(analyze(template).diagnostics).toEqual([]);
  });
});

describe("ft-default: default replaces a value that is not truthy", () => {
  const rows: Row[] = [
    ["missing variable in lenient mode", MISSING, "X"],
    ["null", null, "X"],
    ["empty text", "", "X"],
    ["number 0", 0, "X"],
    ["boolean false", false, "X"],
    ["empty list", [], "X"],
    ["empty object", {}, "X"],
    ["the text 0 (as ?? treats it today)", "0", "X"],
    ["the text false (as ?? treats it today)", "false", "X"],
    ["non-empty text", "hi", "hi"],
    ["number 1", 1, "1"],
    ["number 3.14159", 3.14159, "3.14159"],
    ["boolean true", true, "true"],
    ["non-empty list", [1], "[1]"],
    ["non-empty object", { a: 1 }, '{"a":1}'],
  ];
  tableTests("default", 'default="X"', rows);
  tableTests("default", "default=X", rows.slice(0, 2).concat(rows.slice(9, 10)));
  tableTests("default", 'default:value="X"', rows.slice(0, 2).concat(rows.slice(9, 10)));

  tableTests("default", 'default="n/a" | upper', [
    ["default then upper, falsy", null, "N/A"],
    ["default then upper, truthy", "hi", "HI"],
  ]);
  tableTests("default", 'upper | default="x"', [["falsy after upper", MISSING, "x"]]);
  tableTests("default", 'trim | default="x"', [["a blank value trimmed to empty text", "   ", "x"]]);

  it("ft-default: the replacement is printed as given, not as the input", () => {
    const r = run('default="a b"', 0);
    expect(r.ok).toBe(true);
    expect(r.output).toBe("a b");
  });
});

describe("ft-default: ?? keeps its current behaviour", () => {
  const rows: Row[] = [
    ["missing variable", MISSING, "X"],
    ["null", null, "X"],
    ["empty text", "", "X"],
    ["number 0", 0, "X"],
    ["boolean false", false, "X"],
    ["empty list", [], "X"],
    ["empty object", {}, "X"],
    ["the text 0", "0", "X"],
    ["the text false", "false", "X"],
    ["blank text", "  ", "X"],
    ["non-empty text", "hi", "hi"],
    ["number 1", 1, "1"],
    ["boolean true", true, "true"],
    ["non-empty list", [1], "[1]"],
    ["non-empty object", { a: 1 }, '{"a":1}'],
  ];

  it.each(rows)("ft-default: v ?? \"X\", %s", (_label, value, expected) => {
    const data = value === MISSING ? {} : { v: value };
    const r = render('${{ v ?? "X" }}', data, LENIENT);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  it("ft-default: in strict mode ?? covers a missing variable", () => {
    const r = render('${{ m ?? "X" }}', {}, STRICT);
    expect(r.ok).toBe(true);
    expect(r.output).toBe("X");
  });

  it("ft-default: in strict mode the default filter reports the missing variable first", () => {
    const r = render('${{ m | default="X" }}', {}, STRICT);
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe("missing-variable");
  });

  it("ft-default: the default filter and ?? agree on every shared lenient row", () => {
    for (const [label, value] of rows) {
      const data = value === MISSING ? {} : { v: value };
      const viaFilter = render('${{ v | default="X" }}', data, LENIENT);
      const viaOperator = render('${{ v ?? "X" }}', data, LENIENT);
      if (label === "blank text") continue;
      expect(viaFilter.output).toBe(viaOperator.output);
    }
  });
});
````

## 4. Diff

24 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/core/src/filters-text.ts b/core/src/filters-text.ts
index 7a622d6..548d9fb 100644
--- a/core/src/filters-text.ts
+++ b/core/src/filters-text.ts
@@ -1,3 +1,149 @@
-import { FilterDefinition } from "./types";
+import { FilterDefinition, TemplateValue } from "./types";
+import { valueToText } from "./filters";
+import { isTruthy } from "./expressions";
 
-export const TEXT_FILTERS: FilterDefinition[] = [];
+type Params = Record<string, string>;
+
+/**
+ * A row whose input is coerced to text exactly as the output step prints it.
+ * valueToText is read inside apply only: filters.ts imports this file, so it
+ * is not yet defined at load.
+ */
+function textRow(
+  name: string,
+  params: string,
+  description: string,
+  paramNames: string[],
+  apply: (text: string, params: Params) => string
+): FilterDefinition {
+  return {
+    name,
+    params,
+    description,
+    paramNames,
+    apply: (input, given) => apply(valueToText(input as TemplateValue), given),
+  };
+}
+
+/**
+ * A whole-number parameter within min..max; an absent one gives the fallback
+ * when there is one, otherwise an error
+ */
+function integerParam(
+  filter: string,
+  value: string | undefined,
+  min: number,
+  max: number,
+  fallback?: number
+): number {
+  if (value === undefined && fallback !== undefined) return fallback;
+  const n = value !== undefined && /^\d+$/.test(value) ? Number(value) : NaN;
+  if (!(n >= min && n <= max)) {
+    throw new Error(
+      `${filter} requires a whole number from ${min} to ${max} (e.g., ${filter}=2), got ${value ?? "none"}`
+    );
+  }
+  return n;
+}
+
+function titleCase(text: string): string {
+  return text.replace(/\S+/g, (word) => {
+    const [first, ...rest] = word;
+    return first.toUpperCase() + rest.join("").toLowerCase();
+  });
+}
+
+/** Literal replacement: no pattern is compiled and `with` has no special forms */
+function replaceLiteral(text: string, params: Params): string {
+  const { find, with: replacement = "" } = params;
+  if (!find) {
+    throw new Error("replace requires a non-empty find parameter (e.g., replace:find=\"a\",with=\"b\")");
+  }
+  return text.split(find).join(replacement);
+}
+
+function indentLines(text: string, params: Params): string {
+  const pad = " ".repeat(integerParam("indent", params.value, 0, 100, 2));
+  return text
+    .split("\n")
+    .map((line) => (line === "" || line === "\r" ? line : pad + line))
+    .join("\n");
+}
+
+/**
+ * Round a decimal number given as text to `places` places, half away from
+ * zero, working on its digits so 1.005 gives 1.01; text that is not a plain
+ * decimal number (optionally with an exponent) is returned as null
+ */
+function roundDecimal(text: string, places: number): string | null {
+  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
+  if (!match || !/\d/.test(match[2] + (match[3] ?? ""))) return null;
+  const [, sign, whole, fraction = "", exponent = "0"] = match;
+  const point = whole.length + Number(exponent);
+  let digits = whole + fraction;
+  if (point < 0) digits = "0".repeat(-point) + digits;
+  digits = digits.padEnd(Math.max(point, 0), "0");
+  const cut = Math.max(point, 0);
+  const afterPoint = digits.slice(cut).padEnd(places + 1, "0");
+  const kept = (digits.slice(0, cut) || "0") + afterPoint.slice(0, places);
+  const scaled = BigInt(kept) + BigInt(afterPoint[places] >= "5" ? 1 : 0);
+  const padded = scaled.toString().padStart(places + 1, "0");
+  const intPart = padded.slice(0, padded.length - places);
+  const result = places > 0 ? `${intPart}.${padded.slice(-places)}` : intPart;
+  return sign === "-" && scaled !== BigInt(0) ? `-${result}` : result;
+}
+
+function roundText(text: string, params: Params): string {
+  const places = integerParam("round", params.value, 0, 20, 0);
+  return roundDecimal(text, places) ?? text;
+}
+
+function defaultTo(input: unknown, params: Params): unknown {
+  if (params.value === undefined) {
+    throw new Error('default requires a value (e.g., default="n/a")');
+  }
+  return isTruthy(input) ? input : params.value;
+}
+
+export const TEXT_FILTERS: FilterDefinition[] = [
+  textRow("upper", "upper", "Text in upper case", [], (text) => text.toUpperCase()),
+  textRow("lower", "lower", "Text in lower case", [], (text) => text.toLowerCase()),
+  textRow(
+    "title",
+    "title",
+    "First letter of each whitespace-separated word in upper case, the rest in lower case",
+    [],
+    titleCase
+  ),
+  textRow(
+    "replace",
+    'replace:find="a",with="b"',
+    "Every occurrence of the literal text find replaced by with (empty when omitted); find is required and never read as a pattern",
+    ["find", "with"],
+    replaceLiteral
+  ),
+  textRow(
+    "indent",
+    "indent[=N]",
+    "N spaces (default 2, from 0 to 100) added at the start of every non-empty line; line breaks are kept",
+    ["value"],
+    indentLines
+  ),
+  textRow("quote", "quote", "Text as a JSON double-quoted string, with quotes, backslashes and control characters escaped", [], (text) =>
+    JSON.stringify(text)
+  ),
+  textRow(
+    "round",
+    "round[=N]",
+    "A number rounded half away from zero to exactly N decimal places (default 0, up to 20); anything that is not a finite number is left as it is",
+    ["value"],
+    roundText
+  ),
+  {
+    name: "default",
+    params: 'default="x"',
+    description: "The given value when the input is missing, empty, 0, false, an empty list or an empty object; otherwise the input",
+    paramNames: ["value"],
+    apply: defaultTo,
+  },
+];
diff --git a/docs/living/architecture/language-contract.md b/docs/living/architecture/language-contract.md
index b08287e..1d1c181 100644
--- a/docs/living/architecture/language-contract.md
+++ b/docs/living/architecture/language-contract.md
@@ -22,3 +22,19 @@ The contract for the template language beyond the prompt-aware constructs: filte
 - **Defaults.** A quote in a `??` default opens only when a value starts with it and closes; an unterminated quote is plain text and never hides the filters after it.
 - **Static checks.** `validate` and `analyze` report an undeclared parameter as a `type-error` at the variable, the same code, position and wording as `render`.
 - **Known gap.** `FILTERS` (exported for compatibility) is a snapshot of the registry names taken at load; code that needs the live list reads `FILTER_REGISTRY` or `spec()`.
+
+### Text filters
+
+Group in `filters-text.ts`. Each coerces its input to text as the output step prints it, except `default`. A missing or invalid parameter value is a `type-error` at the variable in every mode; `validate` and `analyze` run without data, so they check names and undeclared parameters, and a bad value shows at render. The shorthand `name=value` is the parameter `value`.
+
+| Filter | Result |
+|---|---|
+| `upper`, `lower` | the text in upper or lower case; no parameter |
+| `title` | the first letter of each whitespace-separated word in upper case, the rest in lower case; no parameter |
+| `replace:find="a",with="b"` | every non-overlapping occurrence of the literal `find` (required, non-empty) replaced by `with` (default empty text); never read as a pattern |
+| `indent[=N]` | N spaces (whole number 0 to 100, default 2) before every line that has characters; line breaks are kept |
+| `quote` | the text as a JSON double-quoted string; no parameter |
+| `round[=N]` | a number rounded half away from zero to exactly N decimals (whole number 0 to 20, default 0), computed on its digits so `1.005` with `round=2` gives `1.01`; text that is not a number is left as it is |
+| `default="x"` | `x` (required) when the raw value is not truthy (missing, null, empty text, 0, false, empty list, empty object), else the value; `??` keeps its own rule |
+
+In strict mode a missing variable is reported before `default` runs, so `default` replaces missing data in lenient mode only.
diff --git a/docs/living/architecture/modules/template-resolver.md b/docs/living/architecture/modules/template-resolver.md
index fbfbe22..209b2a1 100644
--- a/docs/living/architecture/modules/template-resolver.md
+++ b/docs/living/architecture/modules/template-resolver.md
@@ -144,7 +144,7 @@ Order tried by `evaluateCondition`: `NOT(...)` wrapper, outer parentheses, then
 
 ### Filters
 
-Every filter is one definition in `FILTER_REGISTRY` (`core/src/filters.ts`; the text and collection groups are `filters-text.ts` and `filters-collection.ts`): `render`, `spec()`, `analyze` and `validate` all read that table, and a definition added to it is accepted by all four. Filters receive and return values; the six built-ins coerce to text first. A call is parsed once at parse time, quote-aware (`fence="a=b"` keeps `a=b`), and a parameter the filter does not declare is a located `type-error` in every mode (also reported by `validate` and `analyze`). An unterminated quote in a `??` default is plain text and no longer hides the filters after it. See `docs/living/architecture/language-contract.md`. The paragraph below describes the older string-only behavior and the filter names it lists.
+Every filter is one definition in `FILTER_REGISTRY` (`core/src/filters.ts`; the text and collection groups are `filters-text.ts` and `filters-collection.ts`): `render`, `spec()`, `analyze` and `validate` all read that table, and a definition added to it is accepted by all four. Filters receive and return values; the six built-ins coerce to text first. A call is parsed once at parse time, quote-aware (`fence="a=b"` keeps `a=b`), and a parameter the filter does not declare is a located `type-error` in every mode (also reported by `validate` and `analyze`). An unterminated quote in a `??` default is plain text and no longer hides the filters after it. The text group `filters-text.ts` adds `upper`, `lower`, `title`, `replace`, `indent`, `quote`, `round` and `default`; a bad parameter value throws from the filter and is reported as a `type-error` at the variable. See `docs/living/architecture/language-contract.md`. The paragraph below describes the older string-only behavior and the filter names it lists.
 
 Applied left to right to the string form of the value, after `??`. Syntax per filter: bare name, `name=value`, or `name:key="v",key2="v2"` [src: nodes/TemplateResolver/filters.ts:11-65]. Implemented names: `head=N` (first N characters; negative N drops the last N), `tail=N` (last N; `0` gives `""`; negative N drops the first N), `trim`, `escape_md` (backslash-escapes `\ * _ [ ] ( ) # ` > ~ |`) [src: nodes/TemplateResolver/filters.ts:89-186]. Any other name throws a plain `Error` "Unknown filter" [src: nodes/TemplateResolver/filters.ts:99-100]
 
```

## Gate run

Gate command green at commit 2534436c6d0b (310 tests).

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
