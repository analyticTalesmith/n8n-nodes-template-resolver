---
type: review-packet
card: 261015-language3911-a1-dispatch-filters-from-one-registry-with
tier: product
built_at: 2026-10-15T02:23:25.915Z
base: 49e3aebd8eaf7b6001162841f2387f79f7297c1f
head: 0005c77618b551da3c03960e2486d42bd61beb74
read_at: 0005c77618b551da3c03960e2486d42bd61beb74
frozen: true
brief_sha256: 8129f2277734285a9bc82e6bc2be5a025e2e96373f05ca71c5399925ddcaad06
manifest_sha256: 24e359250acaf2edf957b713101a76489858d63540d6cfc8538fce36135986c7
criteria_sha256: 87fc4a50c974d102660872e442f8e2af5ed2bdc19ad5d9eea0373e0d7efc8976
scope_sha256: d701d54c0d77babf6fcadf2545a7b84a8af26b4189bea483998883ed785a9012
diff_sha256: 8761ba3a2c9f09924627973b0c1ae40cedb6050dad930ae8a39c0ae9a67f9c74
omitted_paths: 8
criteria_count: 6
must_not_count: 4
---

# Review packet: 261015-language3911-a1-dispatch-filters-from-one-registry-with

Manifest amended after the freeze at 2026-10-15T02:22:56.465Z by lead: stubs and the spec test amendment were committed by the test writer before the base; errors.ts needed no change (add -core/src/filters-collection.ts, add -core/src/filters-text.ts, add -tests/language/filter-registry.test.ts, edit -core/src/errors.ts, edit -core/src/types.ts, edit -tests/headless/spec.test.ts)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: every filter is dispatched from one registry that also feeds spec() and analyze, filters take and return values, and filter arguments are parsed once at parse time with quotes respected; no existing template output changes.

### Criteria

- c1 (verify: test): fr-registry: render, spec() and analyze use one table of filter definitions {name, params, description, paramNames, apply}: a definition added to the table is accepted by render, listed by spec() and accepted by analyze and validate with no other change, and spec() exposes only name, params and description (no function)
- c2 (verify: test): fr-values: filters receive and return values; the six existing filters coerce their input to text first exactly as the output step does, so every existing template renders the same output as before
- c3 (verify: test): fr-args: filter calls are parsed once at parse time, quote-aware: fence="a=b" and fence="a:b" keep the whole language text; a named parameter the filter does not declare (escape_md:mode=block) is a type-error located at the variable instead of a silent fallback; parseFilter and the strings it parsed before still give the same results
- c4 (verify: test): fr-default-quote: an unterminated quote in a ?? default (an apostrophe or a double quote that never closes) no longer swallows the filters after it, and a closed quoted default still keeps a pipe inside it
- c5 (verify: test): fr-groups: core/src/filters-text.ts and core/src/filters-collection.ts exist, each exporting an empty list of filter definitions that the registry includes, so later cards add rows there without touching the dispatch
- c6 (verify: tool): fr-compat: the full existing suite passes; the only existing test file changed is tests/headless/spec.test.ts, whose fixed six-name list becomes a check that spec lists exactly the registry

### Must not

- m1: change any existing test expectation other than the one named amendment (tests/headless/spec.test.ts)
- m2: change what any existing filter outputs
- m3: add a runtime dependency
- m4: evaluate template text as code

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: every filter is dispatched from one registry that also feeds spec() and analyze, filters take and return values, and filter arguments are parsed once at parse time with quotes respected; no existing template output changes.
Must not:
- change any existing test expectation other than the one named amendment (tests/headless/spec.test.ts)
- change what any existing filter outputs
- add a runtime dependency
- evaluate template text as code

## Questions

goal-critical: can a filter be added to the table and be missing from render, spec() or analyze?
goal-critical: does any existing template render a different output than before?
goal-critical: does every bad filter call (unknown filter, undeclared parameter, bad value) fail with a located error in every mode, and never silently fall back?
goal-critical: can a quote inside a filter argument or a ?? default hide a pipe or truncate a value?
polish: does spec() leak a function or a field beyond name, params and description?
polish: is the new code small and does it avoid a second filter list?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope
- the registry is the only place a filter name is listed

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
- docs/living/architecture/prompt-aware-contract.md
```

### spec.md as of base 49e3aebd8eaf, read at 0005c77618b5

```
# Spec

## Acceptance criteria

- fr-registry: render, spec() and analyze use one table of filter definitions {name, params, description, paramNames, apply}: a definition added to the table is accepted by render, listed by spec() and accepted by analyze and validate with no other change, and spec() exposes only name, params and description (no function)
- fr-values: filters receive and return values; the six existing filters coerce their input to text first exactly as the output step does, so every existing template renders the same output as before
- fr-args: filter calls are parsed once at parse time, quote-aware: fence="a=b" and fence="a:b" keep the whole language text; a named parameter the filter does not declare (escape_md:mode=block) is a type-error located at the variable instead of a silent fallback; parseFilter and the strings it parsed before still give the same results
- fr-default-quote: an unterminated quote in a ?? default (an apostrophe or a double quote that never closes) no longer swallows the filters after it, and a closed quoted default still keeps a pipe inside it
- fr-groups: core/src/filters-text.ts and core/src/filters-collection.ts exist, each exporting an empty list of filter definitions that the registry includes, so later cards add rows there without touching the dispatch
- fr-compat: the full existing suite passes; the only existing test file changed is tests/headless/spec.test.ts, whose fixed six-name list becomes a check that spec lists exactly the registry

## Interface (names the tests may import)

- `core/src/types.ts`: `FilterDefinition { name: string; params: string; description: string; paramNames: string[]; apply(input: unknown, params: Record<string, string>): unknown }`.
- `core/src/filters.ts`: `FILTER_REGISTRY: FilterDefinition[]`, a plain mutable array (tests push a definition into it and remove it again); it holds the six existing filters followed by the entries of `TEXT_FILTERS` and `COLLECTION_FILTERS`. `FILTERS` stays exported (the same names). `parseFilter(string)`, `applyFilter(value, call)` and `applyFilters(value, calls)` stay exported under the same names; for every current filter, a string in gives a string out.
- `core/src/filters-text.ts` exports `TEXT_FILTERS: FilterDefinition[]` (empty); `core/src/filters-collection.ts` exports `COLLECTION_FILTERS: FilterDefinition[]` (empty).
- No name is looked up once at module load: a definition pushed into the registry later must be seen by render, spec() and analyze.
- `paramNames` of the six existing filters: `head`, `tail`, `escape_md`, `fence`, `heading_offset` take `["value"]`; `trim` takes `[]`. A call whose params hold a name outside `paramNames` throws a `type-error` located at the variable; spec() stays `{name, params, description}` per filter.

## Examples

- `render('${{ v | fence="a=b" }}', {v:'x'}, {standaloneLines:false}).output` is a fence whose language is `a=b`.
- `render('${{ v | escape_md:mode=block }}', {v:'- x'})` fails with a `type-error` at 1:1.
- `${{x ?? '90s hits | head=3}}` renders the default `'90s hits` cut to `'90`, the same as before the quoting fix of an earlier card; `${{x ?? "abc | trim}}` keeps `trim` applying.
```

### card.md as of base 49e3aebd8eaf, read at 0005c77618b5

```
# Dispatch filters from one registry with quote-aware arguments

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Every filter is dispatched from one registry table that also feeds spec() and analyze, filters take and return values, and filter arguments are parsed once at parse time with quotes respected, so the later filter cards only add rows to the table and no output of an existing template changes.

## Must-haves

- `contract` `fr-registry` render, spec() and analyze use one table of filter definitions {name, params, description, paramNames, apply}: a definition added to the table is accepted by render, listed by spec() and accepted by analyze and validate with no other change, and spec() exposes only name, params and description (no function)
- `contract` `fr-values` filters receive and return values; the six existing filters coerce their input to text first exactly as the output step does, so every existing template renders the same output as before
- `contract` `fr-args` filter calls are parsed once at parse time, quote-aware: fence="a=b" and fence="a:b" keep the whole language text; a named parameter the filter does not declare (escape_md:mode=block) is a type-error located at the variable instead of a silent fallback; parseFilter and the strings it parsed before still give the same results
- `contract` `fr-default-quote` an unterminated quote in a ?? default (an apostrophe or a double quote that never closes) no longer swallows the filters after it, and a closed quoted default still keeps a pipe inside it
- `contract` `fr-groups` core/src/filters-text.ts and core/src/filters-collection.ts exist, each exporting an empty list of filter definitions that the registry includes, so later cards add rows there without touching the dispatch
- `contract` `fr-compat` the full existing suite passes; the only existing test file changed is tests/headless/spec.test.ts, whose fixed six-name list becomes a check that spec lists exactly the registry

## Acceptance criteria

- fr-registry: render, spec() and analyze use one table of filter definitions {name, params, description, paramNames, apply}: a definition added to the table is accepted by render, listed by spec() and accepted by analyze and validate with no other change, and spec() exposes only name, params and description (no function)
- fr-values: filters receive and return values; the six existing filters coerce their input to text first exactly as the output step does, so every existing template renders the same output as before
- fr-args: filter calls are parsed once at parse time, quote-aware: fence="a=b" and fence="a:b" keep the whole language text; a named parameter the filter does not declare (escape_md:mode=block) is a type-error located at the variable instead of a silent fallback; parseFilter and the strings it parsed before still give the same results
- fr-default-quote: an unterminated quote in a ?? default (an apostrophe or a double quote that never closes) no longer swallows the filters after it, and a closed quoted default still keeps a pipe inside it
- fr-groups: core/src/filters-text.ts and core/src/filters-collection.ts exist, each exporting an empty list of filter definitions that the registry includes, so later cards add rows there without touching the dispatch
- fr-compat: the full existing suite passes; the only existing test file changed is tests/headless/spec.test.ts, whose fixed six-name list becomes a check that spec lists exactly the registry

## Must-nots

- change any existing test expectation other than the one named amendment
- change what any existing filter outputs
- add a runtime dependency
- evaluate template text as code

## Context links

- [Template resolver module](../../../../../../living/architecture/modules/template-resolver.md)
- [Unknown names are errors (ADR 0003)](../../../../../../living/decisions/adr/0003-unknown-names-are-always-errors.md)

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter, or the root README.md), or give user_docs_waiver, one line with the reason none changes. A card that changes only documents needs nothing, and the root README.md counts as user facing without a tag. If no user can see it, write `none`. -->

## Interface contract

core/src/types.ts gains FilterDefinition {name, params (the signature text spec shows), description, paramNames (the named parameters it accepts; a shorthand name=value is the parameter value), apply(input: unknown, params: Record<string,string>): unknown}. core/src/filters.ts exports FILTER_REGISTRY, a mutable array of FilterDefinition that includes the entries of TEXT_FILTERS (filters-text.ts) and COLLECTION_FILTERS (filters-collection.ts); FILTERS stays exported and equals the registry names. parseFilter(string) keeps its signature; applyFilter and applyFilters accept and return values (strings in, strings out for every current filter). FilterCall nodes in the AST carry the parsed name and params. spec().filters stays a list of {name, params, description}.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/filters.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/filters-collection.ts`, `core/src/filters-text.ts`, `core/src/filters.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/spec.ts`, `core/src/types.ts`, `tests/headless/spec.test.ts`, `tests/language/filter-registry.test.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: none
- remove: none
- edit: `core/src/analyze.ts`, `core/src/filters.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/spec.ts`
- files_scope: `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/filters-collection.ts`, `core/src/filters-text.ts`, `core/src/filters.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/spec.ts`, `core/src/types.ts`, `tests/headless/spec.test.ts`, `tests/language/filter-registry.test.ts`

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

### docs/living/architecture/prompt-aware-contract.md

```
---
summary: First half of the prompt-aware language: whitespace rules, RAW and escaping, SECTION, FENCE, heading offset and escape modes.
state: built
---

# Prompt-aware language contract (first half)

Settled decisions apply: ADR 0001 (every block is `{{KEYWORD ...}}...{{END_KEYWORD}}`), ADR 0002 (standalone block-tag lines vanish by default, `-` markers trim, an option turns the default off), ADR 0003 (unknown names always error).

## Whitespace

- **Standalone rule.** A line that holds only whitespace and one or more block tags is removed together with its line break. Block tags for this rule: IF, ELSEIF, ELSE, END_IF, CASE, WHEN, END_WHEN, DEFAULT, END_DEFAULT, END_CASE, FOR, END_FOR, SECTION, END_SECTION, FENCE, END_FENCE, RAW, END_RAW and comments `{{# ... #}}`. LIST, LIST_ITEM, TABLE, HEADER, ROW and their END tags are not subject to the rule (they have their own spacing). Lines that also hold text or a variable are untouched.
- **Trim markers.** `{{- TAG ...}}` removes all whitespace (spaces, tabs, line breaks) before the tag; `{{TAG ... -}}` removes all whitespace after it. Both may be combined. Trim markers apply first and the standalone rule then applies to what remains: after trimming, a tag line that now shares its line with preceding text is no longer standalone, so its own line break stays (`a\n{{- IF x}}\nb\n{{END_IF}}\n` with x true renders `a\nb\n`). They work on every block tag and comment, are independent of the standalone option, and are never part of an expression.
- **Option.** `standaloneLines` (boolean) in render options; default `true` for `render` (and so for the API, CLI and the n8n node), default `false` for the legacy `resolveTemplate` string function so its existing tests keep their oracle. The n8n node gets a boolean option "Remove Standalone Tag Lines" (`standaloneLines`, default on).

## RAW and escaping

- `{{RAW}}...{{END_RAW}}` outputs its content literally (no tags, variables or comments are interpreted; CRLF becomes LF; spaces are kept). An unclosed RAW is a `syntax-error` located at the RAW tag. With standaloneLines off, a line break right after the RAW tag is part of the literal content.
- `\{{` outputs `{{` literally (the backslash is consumed); a backslash not followed by `{{` is ordinary text. `\\{{` outputs one literal backslash followed by an active tag (only a single backslash directly before `{{` escapes).

## SECTION

`{{SECTION "Title" level=2}}...{{END_SECTION}}`. Title is a quoted string or a variable path; `level` is 1 to 6 (default 2, clamped); `skip_empty` defaults to true, `skip_empty=false` keeps an empty section.

- Output is `<hashes> <title>`, a blank line, the body with leading and trailing blank lines trimmed, and one trailing line break. Consecutive sections are separated by exactly the blank lines the template holds between them (the SECTION tag lines vanish under the standalone rule), nothing is added. Body line breaks are normalized to LF.
- With skip_empty=false an empty section outputs only the heading line and its line break (a heading line such as `## Title` followed by one line break).
- When the rendered body is empty (only whitespace) and skip_empty is true, nothing is output (heading and spacing included) and `stats.sectionsOmitted` counts it. The blank lines the template holds around an omitted section stay.
- A section nests like any block (counts toward maxDepth); an empty or non-string title, a non-integer level or a non-boolean skip_empty is a `type-error` located at the SECTION tag; a stray END_SECTION or an unclosed SECTION is a `syntax-error`. analyze reports variables read in a title or body with usedIn `output`.

## Filters

- `heading_offset=N` (integer, may be negative): shifts every markdown ATX heading line (`#` to `######` followed by a space) by N levels, clamped to 1 to 6; headings inside fenced code blocks, headings indented by spaces and non-heading `#` text are untouched. Missing or non-integer parameter is a `type-error`.
- `escape_md=inline` (default, the existing behavior; plain `escape_md` is inline) and `escape_md=block`: inline escaping plus line-start escaping so a value cannot fake structure (block mode adds nothing for characters inline mode already escapes; otherwise a backslash before a leading `#`, `>`, `-`, `+`, `*`, `|`, the `.` or `)` that follows a leading digit run (written `1\.`, since digits cannot be escaped), a line of three or more `-`, `=`, `` ` `` or `~` gets one backslash before its first character). Modes are case-sensitive; an empty or any other mode is a `type-error`.
- `fence` (optional `lang`): wraps the value in an auto-sized fence, same rules as FENCE below.

## FENCE

`{{FENCE lang="markdown"}}...{{END_FENCE}}` outputs a fenced code block whose fence is the shortest run of at least three backticks that is longer than any backtick run inside the body, followed by the optional language, a line break, the body (one leading and one trailing line break removed), a line break, the fence and a trailing line break. `lang` is a quoted string or variable path.

## Surfaces

`spec()` lists every new block and filter and the new option; the API and CLI accept `standaloneLines` (API: `options.standaloneLines`, a boolean, anything else is 400 `invalid-request`; CLI: `--no-standalone-lines` and `--standalone-lines`, both together a usage error, exit 2); the n8n node passes its "Remove Standalone Tag Lines" option to `render`; the OpenAPI document and the README describe them.
```

## Frozen tests (read-only)

These test files are shown as committed at 0005c77618b5, the commit the contract is read at; the diff starts at base 49e3aebd8eaf, so a file added or changed since then is in the diff too. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/language/filter-registry.test.ts (frozen)

````
import {
  FILTERS,
  FILTER_REGISTRY,
  Lexer,
  Parser,
  analyze,
  parseFilter,
  render,
  resolveTemplate,
  spec,
  validate,
} from "../../core/src";
import { FilterCall, FilterDefinition, VariableNode } from "../../core/src/types";
import { TEXT_FILTERS } from "../../core/src/filters-text";
import { COLLECTION_FILTERS } from "../../core/src/filters-collection";

// Jest has no assertion-message argument; each test name states the behavior expected,
// and the red reason is read from the matcher's expected/received pair.
const RAW = { standaloneLines: false };
const SIX = ["head", "tail", "trim", "escape_md", "fence", "heading_offset"];

// Definitions a test pushes into the shared registry; afterEach takes them out again.
const pushed: FilterDefinition[] = [];

function register(def: FilterDefinition): FilterDefinition {
  FILTER_REGISTRY.push(def);
  pushed.push(def);
  return def;
}

afterEach(() => {
  for (const def of pushed.splice(0)) {
    const at = FILTER_REGISTRY.indexOf(def);
    if (at >= 0) FILTER_REGISTRY.splice(at, 1);
  }
});

function shout(): FilterDefinition {
  return {
    name: "shout",
    params: "shout",
    description: "d",
    paramNames: [],
    apply: (v) => String(v).toUpperCase(),
  };
}

/** A probe filter that records every input and parameter set it receives; returns the input unless told otherwise. */
function probe(paramNames: string[], returns?: unknown) {
  const inputs: unknown[] = [];
  const paramSets: Record<string, string>[] = [];
  register({
    name: "probe",
    params: "probe",
    description: "records what it receives",
    paramNames,
    apply: (input, params) => {
      inputs.push(input);
      paramSets.push(params);
      return returns === undefined ? input : returns;
    },
  });
  return { inputs, paramSets };
}

function variableNode(source: string): VariableNode {
  const ast = new Parser(new Lexer(source).tokenize()).parse();
  return ast.body.find((n) => n.type === "Variable") as VariableNode;
}

describe("fr-registry: one table feeds render, spec and analyze", () => {
  const TEMPLATE = "${{ a | shout }}";

  it("fr-registry: before a definition is pushed the filter is unknown everywhere", () => {
    const r = render(TEMPLATE, { a: "x" });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe("unknown-filter");
    expect(validate(TEMPLATE).ok).toBe(false);
    expect(analyze(TEMPLATE).diagnostics.map((d) => d.code)).toContain("unknown-filter");
    expect(spec().filters.map((f) => f.name)).not.toContain("shout");
  });

  it("fr-registry: a pushed definition is rendered with no other change", () => {
    register(shout());
    const r = render(TEMPLATE, { a: "x" });
    expect(r.ok).toBe(true);
    expect(r.output).toBe("X");
  });

  it("fr-registry: a pushed definition is listed by spec with exactly name, params and description", () => {
    register(shout());
    const entry = spec().filters.find((f) => f.name === "shout");
    expect(entry).toBeDefined();
    expect(Object.keys(entry!).sort()).toEqual(["description", "name", "params"]);
    expect(JSON.parse(JSON.stringify(entry))).toEqual({
      name: "shout",
      params: "shout",
      description: "d",
    });
  });

  it("fr-registry: a pushed definition is accepted and counted by analyze and validate", () => {
    register(shout());
    const a = analyze(TEMPLATE);
    expect(a.diagnostics.map((d) => d.code)).not.toContain("unknown-filter");
    expect(a.filters).toContainEqual({ name: "shout", count: 1 });
    expect(validate(TEMPLATE).ok).toBe(true);
    expect(analyze("${{ a | shout }} ${{ b | shout }}").filters).toContainEqual({
      name: "shout",
      count: 2,
    });
  });

  it("fr-registry: after removal the filter is unknown again, nothing is cached at load", () => {
    const def = register(shout());
    expect(render(TEMPLATE, { a: "x" }).ok).toBe(true);
    FILTER_REGISTRY.splice(FILTER_REGISTRY.indexOf(def), 1);
    expect(render(TEMPLATE, { a: "x" }).ok).toBe(false);
    expect(validate(TEMPLATE).ok).toBe(false);
    expect(spec().filters.map((f) => f.name)).not.toContain("shout");
  });

  it("fr-registry: spec filter names equal the registry names in order", () => {
    expect(FILTER_REGISTRY.length).toBeGreaterThan(0);
    expect(spec().filters.map((f) => f.name)).toEqual(FILTER_REGISTRY.map((f) => f.name));
  });

  it("fr-registry: FILTERS names equal the registry names in order", () => {
    expect(FILTER_REGISTRY.length).toBeGreaterThan(0);
    expect(FILTERS.map((f) => f.name)).toEqual(FILTER_REGISTRY.map((f) => f.name));
  });
});

describe("fr-values: filters receive and return values", () => {
  const ARR = [1, 2, 3];
  const OBJ = { a: 1, b: "x" };

  const inputRows: [string, unknown][] = [
    ["array keeps identity", ARR],
    ["object keeps identity", OBJ],
    ["number stays a number", 42],
    ["string stays a string", "text"],
    ["boolean stays a boolean", true],
  ];

  it.each(inputRows)("fr-values: probe input, %s", (_n, value) => {
    const p = probe([]);
    render("${{ x | probe }}", { x: value }, RAW);
    expect(p.inputs).toHaveLength(1);
    expect(typeof p.inputs[0]).toBe(typeof value);
    expect(p.inputs[0] === value).toBe(true);
  });

  it.each(inputRows)("fr-values: a returned value prints as it would unfiltered, %s", (_n, value) => {
    probe([]);
    const filtered = render("${{ x | probe }}", { x: value }, RAW);
    const plain = render("${{ x }}", { x: value }, RAW);
    expect(filtered.ok).toBe(true);
    expect(filtered.output).toBe(plain.output);
  });

  it.each<[string, unknown]>([
    ["array", [1, 2]],
    ["object", { k: "v" }],
    ["number", 5],
  ])("fr-values: a returned %s is printed without being flattened to a string first", (_n, returned) => {
    probe([], returned);
    const filtered = render("${{ x | probe }}", { x: "ignored" }, RAW);
    const plain = render("${{ y }}", { y: returned }, RAW);
    expect(filtered.ok).toBe(true);
    expect(filtered.output).toBe(plain.output);
  });

  // Expected values were observed from today's output, row by row.
  const DATA: Record<string, unknown> = {
    number: 12345,
    array: [1, 2, 3],
    object: { a: 1, b: "x" },
    boolean: true,
    nul: null,
    text: "  - Hello *w*  ",
  };
  const EXPECTED: Record<string, Record<string, string>> = {
    "head=3": {
      number: "123",
      array: "[1,",
      object: '{"a',
      boolean: "tru",
      nul: "",
      text: "  -",
    },
    "tail=3": {
      number: "345",
      array: ",3]",
      object: 'x"}',
      boolean: "rue",
      nul: "",
      text: "*  ",
    },
    trim: {
      number: "12345",
      array: "[1,2,3]",
      object: '{"a":1,"b":"x"}',
      boolean: "true",
      nul: "",
      text: "- Hello *w*",
    },
    escape_md: {
      number: "12345",
      array: "\\[1,2,3\\]",
      object: '{"a":1,"b":"x"}',
      boolean: "true",
      nul: "",
      text: "  - Hello \\*w\\*  ",
    },
    fence: {
      number: "```\n12345\n```\n",
      array: "```\n[1,2,3]\n```\n",
      object: '```\n{"a":1,"b":"x"}\n```\n',
      boolean: "```\ntrue\n```\n",
      nul: "```\n\n```\n",
      text: "```\n  - Hello *w*  \n```\n",
    },
    "heading_offset=1": {
      number: "12345",
      array: "[1,2,3]",
      object: '{"a":1,"b":"x"}',
      boolean: "true",
      nul: "",
      text: "  - Hello *w*  ",
    },
  };
  const rows: [string, string, string][] = [];
  for (const [filter, byKind] of Object.entries(EXPECTED)) {
    for (const [kind, out] of Object.entries(byKind)) rows.push([filter, kind, out]);
  }

  it.each(rows)("fr-values: %s on %s data prints what it printed before", (filter, kind, expected) => {
    const r = render("${{ v | " + filter + " }}", { v: DATA[kind] }, RAW);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  const chainRows: [string, string, unknown, string][] = [
    ["trim then head", "${{ v | trim | head=4 }}", "  - Hello *w*  ", "- He"],
    ["head then trim on an array", "${{ v | head=3 | trim }}", [1, 2, 3], "[1,"],
    ["heading_offset then head", "${{ v | heading_offset=1 | head=6 }}", "# T\n## U", "## T\n#"],
    ["heading_offset on headings", "${{ v | heading_offset=1 }}", "# T\n## U", "## T\n### U"],
  ];
  it.each(chainRows)("fr-values: chained filters, %s", (_n, template, value, expected) => {
    const r = render(template, { v: value }, RAW);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  it("fr-values: a quoted head count behaves like an unquoted one", () => {
    expect(render('${{ v | head="3" }}', { v: "abcdef" }, RAW).output).toBe("abc");
    expect(render("${{ v | head=3 }}", { v: "abcdef" }, RAW).output).toBe("abc");
  });
});

describe("fr-args: filter calls are parsed once, quote-aware", () => {
  const parseRows: [string, string, FilterCall[]][] = [
    ['fence="a=b"', '${{ v | fence="a=b" }}', [{ name: "fence", params: { value: "a=b" } }]],
    ['fence="a:b"', '${{ v | fence="a:b" }}', [{ name: "fence", params: { value: "a:b" } }]],
    ["fence='c++'", "${{ v | fence='c++' }}", [{ name: "fence", params: { value: "c++" } }]],
    ["fence=js", "${{ v | fence=js }}", [{ name: "fence", params: { value: "js" } }]],
    ["head=3", "${{ v | head=3 }}", [{ name: "head", params: { value: "3" } }]],
    ['head="3"', '${{ v | head="3" }}', [{ name: "head", params: { value: "3" } }]],
    ["trim", "${{ v | trim }}", [{ name: "trim", params: {} }]],
    ['fence="a|b"', '${{ v | fence="a|b" }}', [{ name: "fence", params: { value: "a|b" } }]],
    [
      "a pipe inside quotes then more filters",
      '${{ v | fence="a|b" | head=3 | trim }}',
      [
        { name: "fence", params: { value: "a|b" } },
        { name: "head", params: { value: "3" } },
        { name: "trim", params: {} },
      ],
    ],
    [
      "named params with a comma and an equals sign inside quotes",
      '${{ v | probe:find="a, b",with="c=d" }}',
      [{ name: "probe", params: { find: "a, b", with: "c=d" } }],
    ],
  ];

  it.each(parseRows)("fr-args: parsed once, %s", (_n, source, expected) => {
    expect(variableNode(source).filters).toEqual(expected);
  });

  const renderRows: [string, string, string][] = [
    ['fence="a=b"', '${{ v | fence="a=b" }}', "```a=b\nx\n```\n"],
    ['fence="a:b"', '${{ v | fence="a:b" }}', "```a:b\nx\n```\n"],
    ["fence='c++'", "${{ v | fence='c++' }}", "```c++\nx\n```\n"],
    ["fence=js", "${{ v | fence=js }}", "```js\nx\n```\n"],
    ['fence="a|b"', '${{ v | fence="a|b" }}', "```a|b\nx\n```\n"],
  ];

  it.each(renderRows)("fr-args: rendered fence language, %s", (_n, template, expected) => {
    const r = render(template, { v: "x" }, RAW);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  it("fr-args: a probe with declared names receives exactly its parsed parameters", () => {
    const p = probe(["find", "with"]);
    const r = render('${{ v | probe:find="a, b",with="c=d" }}', { v: "x" }, RAW);
    expect(r.ok).toBe(true);
    expect(p.paramSets).toEqual([{ find: "a, b", with: "c=d" }]);
  });

  it("fr-args: parseFilter keeps the shapes it always returned", () => {
    expect(parseFilter("trim")).toEqual({ name: "trim", params: {} });
    expect(parseFilter("  head = 100  ")).toEqual({ name: "head", params: { value: "100" } });
    expect(parseFilter('head="100"')).toEqual({ name: "head", params: { value: "100" } });
    expect(parseFilter('replace:find="a=b",with="c, d"')).toEqual({
      name: "replace",
      params: { find: "a=b", with: "c, d" },
    });
  });

  it("fr-args: plain escape_md modes still work", () => {
    const src = "- x *y*\n# h";
    expect(render("${{ v | escape_md=block }}", { v: src }, RAW).output).toBe("\\- x \\*y\\*\n\\# h");
    expect(render("${{ v | escape_md=inline }}", { v: src }, RAW).output).toBe("- x \\*y\\*\n\\# h");
  });

  // Located at the variable; a variable on line 2 column 3 proves the location is not a default 1:1.
  const noParams = (): FilterDefinition => ({
    name: "probe",
    params: "probe",
    description: "d",
    paramNames: [],
    apply: (v) => v,
  });
  const errorRows: [string, string, number, number, (() => FilterDefinition) | null][] = [
    ["escape_md:mode=block", "${{ v | escape_md:mode=block }}", 1, 1, null],
    ["escape_md:mode=block on line 2", "intro\n  ${{ v | escape_md:mode=block }}", 2, 3, null],
    ["head:count=2", "intro\n  ${{ v | head:count=2 }}", 2, 3, null],
    ["head with value plus an undeclared name", "intro\n  ${{ v | head:value=3,count=2 }}", 2, 3, null],
    ["fence:lang=js", "intro\n  ${{ v | fence:lang=js }}", 2, 3, null],
    ["trim:x=1", "intro\n  ${{ v | trim:x=1 }}", 2, 3, null],
    ["probe with no declared names, probe:x=1", "intro\n  ${{ v | probe:x=1 }}", 2, 3, noParams],
  ];

  describe.each([
    ["lenient", false],
    ["strict", true],
  ])("%s mode", (_label, strictMode) => {
    it.each(errorRows)(
      "fr-args: an undeclared parameter is a type-error at the variable, %s",
      (_n, template, line, column, make) => {
        if (make) register(make());
        const r = render(template, { v: "x" }, { ...RAW, strictMode });
        expect(r.ok).toBe(false);
        expect(r.output).toBe("");
        expect(r.diagnostics[0]?.code).toBe("type-error");
        expect({ line: r.diagnostics[0]?.line, column: r.diagnostics[0]?.column }).toEqual({
          line,
          column,
        });
      }
    );
  });
});

describe("fr-default-quote: an unterminated quote in a default does not swallow the filters", () => {
  const rows: [string, string, string][] = [
    ["an apostrophe that never closes", "${{x ?? '90s hits | head=3}}", "'90"],
    ["a double quote that never closes", '${{x ?? "abc | trim}}', '"abc'],
    ["a closed quoted default keeps its pipe", '${{x ?? "a | b" | head=3}}', "a |"],
    ["a closed single-quoted default", "${{x ?? 'it' | head=1}}", "i"],
  ];

  it.each(rows)("fr-default-quote: render, %s", (_n, template, expected) => {
    const r = render(template, {}, RAW);
    expect(r.ok).toBe(true);
    expect(r.output).toBe(expected);
  });

  it.each(rows)("fr-default-quote: resolveTemplate lenient, %s", (_n, template, expected) => {
    expect(resolveTemplate(template, new Map(), { strictMode: false })).toBe(expected);
  });
});

describe("fr-groups: filter groups feed the registry", () => {
  it("fr-groups: both groups are arrays", () => {
    expect(Array.isArray(TEXT_FILTERS)).toBe(true);
    expect(Array.isArray(COLLECTION_FILTERS)).toBe(true);
  });

  it("fr-groups: the first six registry entries are the existing filters in order", () => {
    expect(FILTER_REGISTRY.slice(0, 6).map((f) => f.name)).toEqual(SIX);
  });

  it("fr-groups: the registry is the six plus both groups", () => {
    expect(FILTER_REGISTRY.length).toBe(6 + TEXT_FILTERS.length + COLLECTION_FILTERS.length);
    expect(FILTER_REGISTRY.slice(6)).toEqual([...TEXT_FILTERS, ...COLLECTION_FILTERS]);
  });

  it("fr-groups: every definition has name, params, description, paramNames and apply", () => {
    expect(FILTER_REGISTRY.length).toBeGreaterThan(0);
    const shapes = FILTER_REGISTRY.map((d) => [
      typeof d.name,
      typeof d.params,
      typeof d.description,
      Array.isArray(d.paramNames),
      typeof d.apply,
    ]);
    expect(shapes).toEqual(
      FILTER_REGISTRY.map(() => ["string", "string", "string", true, "function"])
    );
  });

  it("fr-groups: names are unique", () => {
    expect(FILTER_REGISTRY.length).toBeGreaterThan(0);
    const names = FILTER_REGISTRY.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("fr-groups: declared parameter names of the six existing filters", () => {
    const byName = Object.fromEntries(FILTER_REGISTRY.map((f) => [f.name, f.paramNames]));
    expect(byName).toMatchObject({
      head: ["value"],
      tail: ["value"],
      trim: [],
      escape_md: ["value"],
      fence: ["value"],
      heading_offset: ["value"],
    });
  });
});
````

### tests/headless/spec.test.ts (frozen)

```
import { FILTER_REGISTRY, spec } from "../../core/src";

// The registry is the source of the engine filters; a later filter card adds a row, not an edit here.
// An empty registry yields one blank name so the per-filter test fails by assertion, not by an empty table.
const REGISTRY_NAMES = FILTER_REGISTRY.map((f) => f.name);
const ENGINE_FILTERS = REGISTRY_NAMES.length > 0 ? REGISTRY_NAMES : [""];
const BLOCKS = ["IF", "FOR", "CASE", "LIST", "TABLE"];
const OPERATORS = [
  "==",
  "!=",
  "contains",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
  "AND",
  "OR",
  "NOT",
];

describe("rr-spec: the language spec", () => {
  const s = spec();

  it("rr-spec: has a non-empty version string", () => {
    expect(typeof s.version).toBe("string");
    expect(s.version.length).toBeGreaterThan(0);
  });

  it.each(ENGINE_FILTERS)(
    "rr-spec: filter %s is listed with a description",
    (name) => {
      const f = s.filters.find((x) => x.name === name);
      expect(f).toBeDefined();
      expect(f!.description.length).toBeGreaterThan(0);
    }
  );

  it("rr-spec: lists exactly the engine's filters", () => {
    expect(REGISTRY_NAMES.length).toBeGreaterThan(0);
    expect(s.filters.map((f) => f.name).sort()).toEqual(
      [...REGISTRY_NAMES].sort()
    );
  });

  it.each(BLOCKS)(
    "rr-spec: block %s is listed with args and description",
    (name) => {
      const b = s.blocks.find((x) => x.name === name);
      expect(b).toBeDefined();
      expect(typeof b!.args).toBe("string");
      expect(b!.description.length).toBeGreaterThan(0);
    }
  );

  it.each(OPERATORS)("rr-spec: operator %s is listed", (op) => {
    expect(s.operators).toContain(op);
  });

  it("rr-spec: limits equal the default limits", () => {
    expect(s.limits).toEqual({
      maxIterations: 10000,
      maxOutputChars: 1000000,
      maxDepth: 32,
    });
  });

  it("rr-spec: describes variable and comment syntax", () => {
    expect(s.syntax.variable.length).toBeGreaterThan(0);
    expect(s.syntax.comment.length).toBeGreaterThan(0);
  });
});
```

## 4. Diff

8 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/core/src/analyze.ts b/core/src/analyze.ts
index 4e1af2d..2a45c96 100644
--- a/core/src/analyze.ts
+++ b/core/src/analyze.ts
@@ -1,6 +1,6 @@
 import { Lexer } from "./lexer";
 import { Parser } from "./parser";
-import { FILTERS, parseFilter } from "./filters";
+import { FILTER_REGISTRY } from "./filters";
 import {
   conditionOperands,
   hasBareWhitespace,
@@ -75,8 +75,6 @@ export interface TemplateAnalysis {
   diagnostics: AnalysisDiagnostic[];
 }
 
-const KNOWN_FILTERS = new Set(FILTERS.map((f) => f.name));
-
 /**
  * Report the variables a template reads and the filters it applies, derived
  * from the parsed template. Loop item names (inside their loop) and
@@ -176,9 +174,9 @@ class Walker {
     }
 
     for (const filter of node.filters ?? []) {
-      const { name } = parseFilter(filter.name);
+      const { name } = filter;
       this.filterCounts.set(name, (this.filterCounts.get(name) ?? 0) + 1);
-      if (!KNOWN_FILTERS.has(name)) {
+      if (!FILTER_REGISTRY.some((f) => f.name === name)) {
         this.diagnostics.push({
           code: "unknown-filter",
           message: `Unknown filter: ${name}`,
diff --git a/core/src/filters.ts b/core/src/filters.ts
index 9207061..dfb5c7f 100644
--- a/core/src/filters.ts
+++ b/core/src/filters.ts
@@ -1,8 +1,17 @@
-import { FilterCall, FilterDefinition } from "./types";
+import { FilterCall, FilterDefinition, TemplateValue } from "./types";
 import { UnknownFilterError } from "./errors";
+import { tryCoerceToString } from "./coercion";
+import { TEXT_FILTERS } from "./filters-text";
+import { COLLECTION_FILTERS } from "./filters-collection";
 
-/** Signature-only stub: the registry of every filter definition. */
-export const FILTER_REGISTRY: FilterDefinition[] = [];
+/**
+ * A value as the output step prints it: nothing for null, JSON for arrays and
+ * objects, the plain form for the rest
+ */
+export function valueToText(value: TemplateValue): string {
+  if (value == null) return "";
+  return tryCoerceToString(value) || "";
+}
 
 /**
  * Parse filter string into FilterCall object
@@ -14,23 +23,29 @@ export const FILTER_REGISTRY: FilterDefinition[] = [];
  */
 export function parseFilter(filterString: string): FilterCall {
   const trimmed = filterString.trim();
+  const eqIdx = trimmed.indexOf("=");
+  const colonIdx = trimmed.indexOf(":");
 
   // Simple filter (no params)
-  if (!trimmed.includes("=") && !trimmed.includes(":")) {
+  if (eqIdx === -1 && colonIdx === -1) {
     return { name: trimmed, params: {} };
   }
 
-  // Shorthand single param: head=100
-  if (trimmed.includes("=") && !trimmed.includes(":")) {
-    const [name, value] = trimmed.split("=").map((s) => s.trim());
+  // Shorthand single param: head=100. Whichever of "=" and ":" comes first
+  // ends the name, so a quoted value may hold either.
+  if (colonIdx === -1 || (eqIdx !== -1 && eqIdx < colonIdx)) {
     return {
-      name,
-      params: { value: value.replace(/^["']|["']$/g, "") },
+      name: trimmed.slice(0, eqIdx).trim(),
+      params: {
+        value: trimmed
+          .slice(eqIdx + 1)
+          .trim()
+          .replace(/^["']|["']$/g, ""),
+      },
     };
   }
 
   // Named params: replace:find="old",with="new"
-  const colonIdx = trimmed.indexOf(":");
   const name = trimmed.slice(0, colonIdx).trim();
   const paramsStr = trimmed.slice(colonIdx + 1);
 
@@ -88,72 +103,118 @@ function parseParam(param: string, params: Record<string, string>): void {
 }
 
 /**
- * Every filter applyFilter accepts
+ * A built-in filter: its input is coerced to text first, exactly as the
+ * output step would print it
  */
-export const FILTERS: { name: string; params: string; description: string }[] =
-  [
-    {
-      name: "head",
-      params: "head=N",
-      description:
-        "First N characters; a negative N drops the last |N| characters",
-    },
-    {
-      name: "tail",
-      params: "tail=N",
-      description:
-        "Last N characters; a negative N drops the first |N| characters",
-    },
-    {
-      name: "trim",
-      params: "",
-      description: "Leading and trailing whitespace removed",
-    },
-    {
-      name: "escape_md",
-      params: "escape_md[=inline|block]",
-      description:
-        "Markdown special characters escaped with a backslash (inline, the default); block also escapes line starts that would read as structure: headings, quotes, list markers, tables, rules and fences",
-    },
-    {
-      name: "fence",
-      params: "fence[=lang]",
-      description:
-        "The value in a code fence of at least three backticks, longer than any backtick run inside it, with the optional language; one leading and one trailing line break of the value are removed",
-    },
-    {
-      name: "heading_offset",
-      params: "heading_offset=N",
-      description:
-        "Markdown ATX headings shifted by N levels (negative N shifts up), clamped to 1-6; headings inside fenced code are untouched",
-    },
-  ];
+function textFilter(
+  name: string,
+  params: string,
+  description: string,
+  paramNames: string[],
+  apply: (text: string, params: Record<string, string>) => string
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
+ * Every filter render, spec and analyze accept. A plain mutable array: a
+ * definition added to it is seen by all three, so nothing reads it once at
+ * load.
+ */
+export const FILTER_REGISTRY: FilterDefinition[] = [
+  textFilter(
+    "head",
+    "head=N",
+    "First N characters; a negative N drops the last |N| characters",
+    ["value"],
+    applyHeadFilter
+  ),
+  textFilter(
+    "tail",
+    "tail=N",
+    "Last N characters; a negative N drops the first |N| characters",
+    ["value"],
+    applyTailFilter
+  ),
+  textFilter(
+    "trim",
+    "",
+    "Leading and trailing whitespace removed",
+    [],
+    (text) => text.trim()
+  ),
+  textFilter(
+    "escape_md",
+    "escape_md[=inline|block]",
+    "Markdown special characters escaped with a backslash (inline, the default); block also escapes line starts that would read as structure: headings, quotes, list markers, tables, rules and fences",
+    ["value"],
+    applyEscapeMdFilter
+  ),
+  textFilter(
+    "fence",
+    "fence[=lang]",
+    "The value in a code fence of at least three backticks, longer than any backtick run inside it, with the optional language; one leading and one trailing line break of the value are removed",
+    ["value"],
+    (text, params) => fenced(text, params.value ?? "")
+  ),
+  textFilter(
+    "heading_offset",
+    "heading_offset=N",
+    "Markdown ATX headings shifted by N levels (negative N shifts up), clamped to 1-6; headings inside fenced code are untouched",
+    ["value"],
+    applyHeadingOffsetFilter
+  ),
+  ...TEXT_FILTERS,
+  ...COLLECTION_FILTERS,
+];
+
+/**
+ * Name, parameter form and description of every filter registered now
+ */
+export function listFilters(): FilterSummary[] {
+  return FILTER_REGISTRY.map(({ name, params, description }) => ({
+    name,
+    params,
+    description,
+  }));
+}
+
+type FilterSummary = { name: string; params: string; description: string };
 
 /**
- * Apply single filter to text
+ * The built-in and group filters as they were registered at load; spec() and
+ * analyze read the registry itself, so they also see a later addition
  */
-export function applyFilter(text: string, filter: FilterCall): string {
-  switch (filter.name) {
-    case "head":
-      return applyHeadFilter(text, filter.params);
-    case "tail":
-      return applyTailFilter(text, filter.params);
-    case "trim":
-      return text.trim();
-    case "escape_md":
-      return applyEscapeMdFilter(text, filter.params);
-    case "fence":
-      return fenced(text, filter.params.value ?? "");
-    case "heading_offset":
-      return applyHeadingOffsetFilter(text, filter.params);
-    default:
-      throw new UnknownFilterError(
-        filter.name,
-        1,
-        1,
-        FILTERS.map((f) => f.name)
+export const FILTERS: FilterSummary[] = listFilters();
+
+/**
+ * Apply single filter to a value: an unknown name or a parameter the filter
+ * does not declare is an error
+ */
+export function applyFilter(value: unknown, filter: FilterCall): unknown {
+  const definition = FILTER_REGISTRY.find((f) => f.name === filter.name);
+  if (!definition) {
+    throw new UnknownFilterError(
+      filter.name,
+      1,
+      1,
+      FILTER_REGISTRY.map((f) => f.name)
+    );
+  }
+  for (const key of Object.keys(filter.params)) {
+    if (!definition.paramNames.includes(key)) {
+      throw new Error(
+        `Filter ${filter.name} has no parameter '${key}' (accepts: ${definition.paramNames.join(", ") || "none"})`
       );
+    }
   }
+  return definition.apply(value, filter.params);
 }
 
 /**
@@ -339,14 +400,8 @@ function escapeInline(text: string): string {
 }
 
 /**
- * Apply chain of filters to text (left to right)
+ * Apply chain of filters to a value (left to right)
  */
-export function applyFilters(text: string, filters: FilterCall[]): string {
-  let result = text;
-
-  for (const filter of filters) {
-    result = applyFilter(result, filter);
-  }
-
-  return result;
+export function applyFilters(value: unknown, filters: FilterCall[]): unknown {
+  return filters.reduce(applyFilter, value);
 }
diff --git a/core/src/interpreter.ts b/core/src/interpreter.ts
index 45c145a..9a8a589 100644
--- a/core/src/interpreter.ts
+++ b/core/src/interpreter.ts
@@ -28,19 +28,13 @@ import {
 import {
   tryCoerceToArray,
   tryCoerceStringForPathSegment,
-  tryCoerceToString,
 } from "./coercion";
 import {
   evaluateCondition,
   evaluateMathExpression,
   isTruthy,
 } from "./expressions";
-import {
-  parseFilter,
-  applyFilters,
-  fenced,
-  checkFenceLang,
-} from "./filters";
+import { applyFilters, fenced, checkFenceLang, valueToText } from "./filters";
 
 /**
  * Interpreter: Walks AST and produces output string
@@ -221,9 +215,7 @@ export class Interpreter {
 
     // Apply filters
     if (node.filters && node.filters.length > 0) {
-      const text = this.valueToString(value);
-      const filters = node.filters.map((f) => parseFilter(f.name));
-      value = applyFilters(text, filters);
+      value = applyFilters(value, node.filters) as TemplateValue;
     }
 
     return this.valueToString(value);
@@ -697,10 +689,7 @@ export class Interpreter {
    * Convert value to string for output
    */
   private valueToString(value: TemplateValue): string {
-    if (value == null) return "";
-
-    const str = tryCoerceToString(value);
-    return str || "";
+    return valueToText(value);
   }
 
   /**
diff --git a/core/src/parser.ts b/core/src/parser.ts
index 948a79a..41e5bc0 100644
--- a/core/src/parser.ts
+++ b/core/src/parser.ts
@@ -24,6 +24,7 @@ import {
   DEFAULT_LIMITS,
 } from "./types";
 import { SyntaxError, TypeError, LimitError } from "./errors";
+import { parseFilter } from "./filters";
 
 const BLOCK_ARGUMENT = /(\w+)=("[^"]*"|'[^']*'|\S*)|"[^"]*"|'[^']*'|\S+/g;
 const VARIABLE_PATH = /^[A-Za-z_@][\w@]*(\.[\w@]+)*$/;
@@ -188,7 +189,7 @@ export class Parser {
       defaultValue = core
         .slice(defaultIdx + 2)
         .trim()
-        .replace(/^["']|["']$/g, "");
+        .replace(/^(["'])(.*)\1$/s, "$2");
     }
 
     // --- 3. Parse path ---
@@ -197,10 +198,7 @@ export class Parser {
     // --- 4. Parse filters ---
     const filters: FilterCall[] =
       filterExprs.length > 0
-        ? filterExprs.map((f) => ({
-            name: f,
-            params: {},
-          }))
+        ? filterExprs.map(parseFilter)
         : [];
 
     return {
@@ -213,11 +211,17 @@ export class Parser {
   /**
    * Split on a separator character, ignoring separators inside quotes.
    * A quote only opens at the start of a value, so an apostrophe inside a
-   * word is plain text.
+   * word is plain text, and so is a quote that never closes: the split is
+   * redone with that quote left out.
    */
-  private splitOutsideQuotes(text: string, separator: string): string[] {
+  private splitOutsideQuotes(
+    text: string,
+    separator: string,
+    plainQuotes: ReadonlySet<number> = new Set()
+  ): string[] {
     const parts: string[] = [];
     let quote: string | null = null;
+    let quoteAt = -1;
     let start = 0;
 
     for (let i = 0; i < text.length; i++) {
@@ -226,14 +230,23 @@ export class Parser {
         if (ch === quote) quote = null;
       } else if (
         (ch === '"' || ch === "'") &&
+        !plainQuotes.has(i) &&
         /(^|\?\?|=)\s*$/.test(text.slice(start, i))
       ) {
         quote = ch;
+        quoteAt = i;
       } else if (ch === separator) {
         parts.push(text.slice(start, i));
         start = i + 1;
       }
     }
+    if (quote) {
+      return this.splitOutsideQuotes(
+        text,
+        separator,
+        new Set(plainQuotes).add(quoteAt)
+      );
+    }
     parts.push(text.slice(start));
     return parts;
   }
diff --git a/core/src/spec.ts b/core/src/spec.ts
index eab7589..d060adb 100644
--- a/core/src/spec.ts
+++ b/core/src/spec.ts
@@ -1,5 +1,5 @@
 import { DEFAULT_LIMITS, Limits } from "./types";
-import { FILTERS } from "./filters";
+import { listFilters } from "./filters";
 
 export interface Spec {
   version: string;
@@ -147,7 +147,7 @@ export function spec(): Spec {
   return {
     version: LANGUAGE_VERSION,
     blocks: BLOCKS.map((b) => ({ ...b })),
-    filters: FILTERS.map((f) => ({ ...f })),
+    filters: listFilters(),
     operators: [...OPERATORS],
     limits: { ...DEFAULT_LIMITS },
     options: OPTIONS.map((o) => ({ ...o })),
```

## Gate run

Gate command green at commit 0005c77618b5 (107 tests).

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
