---
type: review-packet
card: 0013-add-the-golden-file-test-harness
tier: product
built_at: 2026-10-13T21:59:33.047Z
base: 292dd776abb07dbb75973d266568dcd4e75a70c1
head: 2f88efbea8869bed4aa85361a7f67beb0a936bce
frozen: true
brief_sha256: 6db13ad33a19b112d8984eeed9f357c0f732bfefd34ca5309bf069bdc0b16714
manifest_sha256: 730d56b2e9c460bed7a2f8e2d2daabf2faf789ab3e6e89e02c6ef3b577843f0d
criteria_sha256: 3bad4f9f1dce4f5da3a0a40a5bf10fc157b19de2f47e120df77993bedcdf0d3d
scope_sha256: 56626eebfc41e36f2a055c4d6bba47a8a2dea0108a2d14c78321751f05035ea7
diff_sha256: 50bd049b2e1a20f913f40da079d16aa076d62e99c02b4f6cef6bee774e1baba6
omitted_paths: 8
criteria_count: 5
must_not_count: 2
---

# Review packet: 0013-add-the-golden-file-test-harness

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: A harness that runs every case folder under tests/golden/cases/<name>/ (template.md, data.json, optional options.json, and expected.md or expected-error.txt), compares the rendered output byte for byte, names the failing case and shows a first-difference excerpt, and rewrites the expected files when UPDATE_GOLDEN=1

### Criteria

- c1 (verify: test): gf-01: the harness discovers every case folder and passes when output equals the expected file exactly
- c2 (verify: test): gf-02: a mismatch fails with the case name and the first differing line
- c3 (verify: test): gf-03: an expected-error.txt case passes when rendering throws a message containing that text
- c4 (verify: test): gf-04: UPDATE_GOLDEN=1 rewrites the expected files instead of failing
- c5 (verify: test): gf-05: the shipped suite holds at least eight cases and they all pass against the real resolver

### Must not

- m1: edit or delete any existing test body
- m2: add a runtime dependency

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: A harness that runs every case folder under tests/golden/cases/<name>/ (template.md, data.json, optional options.json, and expected.md or expected-error.txt), compares the rendered output byte for byte, names the failing case and shows a first-difference excerpt, and rewrites the expected files when UPDATE_GOLDEN=1
Must not:
- edit or delete any existing test body
- add a runtime dependency

## Questions

goal-critical: does each frozen test fail before the change for the stated reason and pass after?
goal-critical: do all pre-existing tests still pass?

## Rubric

- cases are plain files readable without running code

## Design context

- docs/living/architecture/modules/template-resolver.md
```

### spec.md as of base 292dd77

```
# Spec

## Acceptance criteria

- gf-01: the harness discovers every case folder and passes when output equals the expected file exactly
- gf-02: a mismatch fails with the case name and the first differing line
- gf-03: an expected-error.txt case passes when rendering throws a message containing that text
- gf-04: UPDATE_GOLDEN=1 rewrites the expected files instead of failing
- gf-05: the shipped suite holds at least eight cases and they all pass against the real resolver
```

### card.md as of base 292dd77

```
# Add the golden-file test harness

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

A harness that runs every case folder under tests/golden/cases/<name>/ (template.md, data.json, optional options.json, and expected.md or expected-error.txt), compares the rendered output byte for byte, names the failing case and shows a first-difference excerpt, and rewrites the expected files when UPDATE_GOLDEN=1. Ship at least eight cases covering IF/ELSEIF, CASE, nested FOR, LIST, TABLE, filters, ?? defaults and an error case. The harness takes the render function as a parameter so later surfaces (API, CLI, node) can run the same cases.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `gf-01` the harness discovers every case folder and passes when output equals the expected file exactly
- `contract` `gf-02` a mismatch fails with the case name and the first differing line
- `contract` `gf-03` an expected-error.txt case passes when rendering throws a message containing that text
- `contract` `gf-04` UPDATE_GOLDEN=1 rewrites the expected files instead of failing
- `contract` `gf-05` the shipped suite holds at least eight cases and they all pass against the real resolver


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- edit or delete any existing test body
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

tests/golden/harness.ts exports runGoldenCases(casesDir, render, options).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/golden/golden.test.ts` | add | template-resolver |
| `tests/golden/harness.ts` | add | template-resolver |

Files scope: `tests/golden/`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: `tests/golden/cases/case-when-default/data.json`, `tests/golden/cases/case-when-default/expected.md`, `tests/golden/cases/case-when-default/template.md`, `tests/golden/cases/default-fallback/data.json`, `tests/golden/cases/default-fallback/expected.md`, `tests/golden/cases/default-fallback/template.md`, `tests/golden/cases/error-missing-variable/data.json`, `tests/golden/cases/error-missing-variable/expected-error.txt`, `tests/golden/cases/error-missing-variable/template.md`, `tests/golden/cases/filter-chain/data.json`, `tests/golden/cases/filter-chain/expected.md`, `tests/golden/cases/filter-chain/template.md`, `tests/golden/cases/for-nested-loops/data.json`, `tests/golden/cases/for-nested-loops/expected.md`, `tests/golden/cases/for-nested-loops/template.md`, `tests/golden/cases/if-elseif-else/data.json`, `tests/golden/cases/if-elseif-else/expected.md`, `tests/golden/cases/if-elseif-else/template.md`, `tests/golden/cases/list-nested-conditional/data.json`, `tests/golden/cases/list-nested-conditional/expected.md`, `tests/golden/cases/list-nested-conditional/template.md`, `tests/golden/cases/table-with-for-rows/data.json`, `tests/golden/cases/table-with-for-rows/expected.md`, `tests/golden/cases/table-with-for-rows/template.md`, `tests/golden/golden.test.ts`, `tests/golden/harness.ts`
- remove: none
- edit: none
- files_scope: `tests/golden/cases/case-when-default/data.json`, `tests/golden/cases/case-when-default/expected.md`, `tests/golden/cases/case-when-default/template.md`, `tests/golden/cases/default-fallback/data.json`, `tests/golden/cases/default-fallback/expected.md`, `tests/golden/cases/default-fallback/template.md`, `tests/golden/cases/error-missing-variable/data.json`, `tests/golden/cases/error-missing-variable/expected-error.txt`, `tests/golden/cases/error-missing-variable/template.md`, `tests/golden/cases/filter-chain/data.json`, `tests/golden/cases/filter-chain/expected.md`, `tests/golden/cases/filter-chain/template.md`, `tests/golden/cases/for-nested-loops/data.json`, `tests/golden/cases/for-nested-loops/expected.md`, `tests/golden/cases/for-nested-loops/template.md`, `tests/golden/cases/if-elseif-else/data.json`, `tests/golden/cases/if-elseif-else/expected.md`, `tests/golden/cases/if-elseif-else/template.md`, `tests/golden/cases/list-nested-conditional/data.json`, `tests/golden/cases/list-nested-conditional/expected.md`, `tests/golden/cases/list-nested-conditional/template.md`, `tests/golden/cases/table-with-for-rows/data.json`, `tests/golden/cases/table-with-for-rows/expected.md`, `tests/golden/cases/table-with-for-rows/template.md`, `tests/golden/golden.test.ts`, `tests/golden/harness.ts`

## 2. Your verification plan

Before you read section 3, write `verification_plan`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.

## 3. Design context

### docs/living/architecture/modules/template-resolver.md

```
---
summary: The template resolver module as it is: lexer, parser, interpreter, filters, coercion, errors and the n8n node, with its syntax and failure handling.
state: planned
provenance: recovered
recovered_at: 712fcfd7f7af0b329e6506120a25f0db8e58de06
recovered_in: 0002-describe-the-template-resolver-as-it-is
---

# Template resolver module

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

## Behavior

### Tokenizing

- `${{` starts a variable token; content runs to the first `}}` and is trimmed; no nesting [src: nodes/TemplateResolver/lexer.ts:149-153] [src: nodes/TemplateResolver/lexer.ts:178-200]
- A bare `{{` starts a tag; spaces and tabs after `{{` are skipped; `{{#` begins a comment ended by `#}}` and becomes a `COMMENT` token [src: nodes/TemplateResolver/lexer.ts:214-231] [src: nodes/TemplateResolver/lexer.ts:257-277]
- A tag body is scanned to its matching `}}`, counting nested `{{` pairs [src: nodes/TemplateResolver/lexer.ts:320-346]
- The keyword is the leading run of `[A-Z_]` characters; it must be one of the 22 listed names (`IF`, `ELSEIF`, `ELSE`, `END_IF`, `CASE`, `WHEN`, `DEFAULT`, `END_WHEN`, `END_DEFAULT`, `END_CASE`, `FOR`, `END_FOR`, `LIST`, `LIST_ITEM`, `END_LIST_ITEM`, `END_LIST`, `TABLE`, `HEADER`, `END_HEADER`, `ROW`, `END_ROW`, `END_TABLE`) or a `SyntaxError` "Unknown template tag" is thrown [src: nodes/TemplateResolver/lexer.ts:359-394] [src: nodes/TemplateResolver/lexer.ts:237-244]. Keywords are case-sensitive uppercase; a plain `{{name}}` without `$` reaches this error. [src: nodes/TemplateResolver/lexer.ts:237-244]
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
- A top-level `HEADER` or `ROW` token outside `TABLE`, when closed by its `END_*` tag, parses into a node type the interpreter's `visit` switch does not list, so it renders as an empty string; when not closed it raises "Unclosed {{HEADER}} block" or "Unclosed {{ROW}} block" [src: nodes/TemplateResolver/parser.ts:75-80] [src: nodes/TemplateResolver/interpreter.ts:73-95] [src: nodes/TemplateResolver/parser.ts:747-754] [src: nodes/TemplateResolver/parser.ts:780-787]. A stray `END_IF`, `END_FOR`, `END_CASE`, `END_TABLE` or `END_LIST` throws "Unexpected {{END_X}} without matching" from the lexer's block validation, and any other tag type the parser's `parseNode` does not handle (for example `ELSE`) raises "Unexpected token" [src: nodes/TemplateResolver/lexer.ts:55-123] [src: nodes/TemplateResolver/parser.ts:83-89]

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

## Frozen tests (read-only)

These test files were committed before the work began, at base 292dd77. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/golden-harness.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// jest's expect() takes no message argument, so the message travels inside the
// compared value and shows in the matcher diff.
function eq(message: string, actual: unknown, expected: unknown): void {
  expect({ message, actual }).toEqual({ message, actual: expected });
}

function has(text: unknown, part: string): boolean {
  return typeof text === "string" && text.includes(part);
}

type Result = { name: string; passed: boolean; message?: string };
type Render = (template: string, data: any, options: any) => string;

function loadHarness(): any {
  try {
    return require("./golden/harness");
  } catch {
    return null;
  }
}

function loadResolver(): any {
  const coreDir = path.join(__dirname, "..", "core", "src");
  try {
    if (fs.existsSync(coreDir)) {
      return require("../core/src").resolveTemplate;
    }
    return require("../nodes/TemplateResolver/TemplateResolver.node")
      .resolveTemplate;
  } catch {
    return null;
  }
}

function run(
  casesDir: string,
  render: Render,
  options?: { update?: boolean },
): Result[] {
  const mod = loadHarness();
  eq("the golden harness module loads from tests/golden/harness", mod !== null, true);
  eq(
    "the harness exports runGoldenCases as a function",
    mod !== null && typeof mod.runGoldenCases,
    "function",
  );
  return options === undefined
    ? mod.runGoldenCases(casesDir, render)
    : mod.runGoldenCases(casesDir, render, options);
}

function makeCase(
  root: string,
  name: string,
  files: Record<string, string>,
): void {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const all: Record<string, string> = {
    "template.md": "T",
    "data.json": "{}",
    ...files,
  };
  for (const [f, content] of Object.entries(all)) {
    fs.writeFileSync(path.join(dir, f), content);
  }
}

const upper: Render = (t) => t.toUpperCase();

describe("golden-file harness", () => {
  let root: string;
  let savedEnv: string | undefined;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "golden-"));
    savedEnv = process.env.UPDATE_GOLDEN;
    delete process.env.UPDATE_GOLDEN;
  });
  afterEach(() => {
    if (savedEnv === undefined) delete process.env.UPDATE_GOLDEN;
    else process.env.UPDATE_GOLDEN = savedEnv;
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("gf-01: discovers every case folder in sorted order and passes on an exact match", () => {
    makeCase(root, "c-beta", { "template.md": "b\n", "expected.md": "B\n" });
    makeCase(root, "a-alpha", { "template.md": "a\n", "expected.md": "A\n" });
    makeCase(root, "d-gamma", { "template.md": "g\n", "expected.md": "G\n" });
    const results = run(root, upper);
    eq(
      "case names are returned in sorted order",
      results.map((r) => r.name),
      ["a-alpha", "c-beta", "d-gamma"],
    );
    eq(
      "every exactly matching case passes",
      results.map((r) => r.passed),
      [true, true, true],
    );
  });

  test("gf-01: passes data and options from the case files to render", () => {
    makeCase(root, "with-inputs", {
      "template.md": "tpl",
      "data.json": '{"x":1}',
      "options.json": '{"strictMode":false}',
      "expected.md": 'tpl|{"x":1}|{"strictMode":false}',
    });
    const results = run(
      root,
      (t, d, o) => `${t}|${JSON.stringify(d)}|${JSON.stringify(o)}`,
    );
    eq("one result for the one case", results.length, 1);
    eq(
      "render receives the template text, parsed data and parsed options",
      results[0].passed,
      true,
    );
  });

  test("gf-01: the comparison is byte exact, so a missing trailing newline fails", () => {
    makeCase(root, "newline", { "template.md": "a", "expected.md": "A\n" });
    const results = run(root, upper);
    eq("one result for the one case", results.length, 1);
    eq(
      "output without the trailing newline does not equal expected with one",
      results[0].passed,
      false,
    );
  });

  test("gf-02: a mismatch fails with the case name, the 1-based line number and both lines", () => {
    makeCase(root, "mismatch-case", {
      "template.md": "one\ntwo\nthree\n",
      "expected.md": "ONE\nTWO\nXXXXX\n",
    });
    const results = run(root, upper);
    eq("one result for the one case", results.length, 1);
    const r = results[0];
    eq("a mismatch is not passed", r.passed, false);
    eq("a failure carries a message", typeof r.message, "string");
    eq("message names the case", has(r.message, "mismatch-case"), true);
    eq("message gives the 1-based number of the first differing line", has(r.message, "3"), true);
    eq("message shows the actual line", has(r.message, "THREE"), true);
    eq("message shows the expected line", has(r.message, "XXXXX"), true);
  });

  test("gf-02: the reported line is the first difference, not a later one", () => {
    makeCase(root, "first-diff", {
      "template.md": "a\nb\nc\n",
      "expected.md": "A\nBAD\nCBAD\n",
    });
    const results = run(root, upper);
    eq("one result for the one case", results.length, 1);
    const r = results[0];
    eq("mismatch fails", r.passed, false);
    eq("message shows the first differing expected line", has(r.message, "BAD"), true);
    eq("message does not report the later differing line", has(r.message, "CBAD"), false);
  });

  test("gf-03: expected-error.txt passes when render throws a message containing the trimmed text", () => {
    makeCase(root, "err-ok", { "expected-error.txt": "  unclosed IF  \n" });
    const results = run(root, () => {
      throw new Error("Parse error: unclosed IF at line 1");
    });
    eq("one result for the one case", results.length, 1);
    eq(
      "a thrown message containing the trimmed file text passes",
      results[0].passed,
      true,
    );
  });

  test("gf-03: an error case fails when render does not throw", () => {
    makeCase(root, "err-nothrow", { "expected-error.txt": "boom" });
    const results = run(root, () => "fine");
    eq("one result for the one case", results.length, 1);
    eq("no throw fails an error case", results[0].passed, false);
    eq("message names the case", has(results[0].message, "err-nothrow"), true);
  });

  test("gf-03: an error case fails when the thrown message differs", () => {
    makeCase(root, "err-differs", { "expected-error.txt": "boom" });
    const results = run(root, () => {
      throw new Error("something else");
    });
    eq("one result for the one case", results.length, 1);
    eq("a different message fails", results[0].passed, false);
    eq("message names the case", has(results[0].message, "err-differs"), true);
  });

  test("gf-04: options.update rewrites expected.md with the render output and passes", () => {
    makeCase(root, "stale", { "template.md": "new", "expected.md": "old" });
    makeCase(root, "absent", { "template.md": "fresh" });
    const results = run(root, upper, { update: true });
    eq("updated cases pass", results.map((r) => r.passed), [true, true]);
    eq(
      "the stale expected file is rewritten with the output",
      fs.readFileSync(path.join(root, "stale", "expected.md"), "utf8"),
      "NEW",
    );
    const absent = path.join(root, "absent", "expected.md");
    eq(
      "a case with no expected file gets one written",
      fs.existsSync(absent) ? fs.readFileSync(absent, "utf8") : null,
      "FRESH",
    );
  });

  test("gf-04: UPDATE_GOLDEN=1 updates when options.update is undefined", () => {
    makeCase(root, "env", { "template.md": "abc", "expected.md": "old" });
    process.env.UPDATE_GOLDEN = "1";
    const results = run(root, upper, {});
    eq("the case passes in update mode", results.map((r) => r.passed), [true]);
    eq(
      "expected.md is rewritten from the environment switch",
      fs.readFileSync(path.join(root, "env", "expected.md"), "utf8"),
      "ABC",
    );
  });

  test("gf-04: without update a stale expected file is left untouched and fails", () => {
    makeCase(root, "noupdate", { "template.md": "abc", "expected.md": "old" });
    const results = run(root, upper, { update: false });
    eq("one result for the one case", results.length, 1);
    eq("mismatch fails when not updating", results[0].passed, false);
    eq(
      "the expected file is not rewritten",
      fs.readFileSync(path.join(root, "noupdate", "expected.md"), "utf8"),
      "old",
    );
  });

  test("gf-04: update mode rewrites expected-error.txt with the thrown message", () => {
    makeCase(root, "err-update", { "expected-error.txt": "stale text" });
    const results = run(
      root,
      () => {
        throw new Error("the real message");
      },
      { update: true },
    );
    eq("the error case passes in update mode", results.map((r) => r.passed), [true]);
    eq(
      "expected-error.txt holds the thrown message",
      fs.readFileSync(path.join(root, "err-update", "expected-error.txt"), "utf8").trim(),
      "the real message",
    );
  });

  test("gf-05: the shipped suite holds at least eight cases covering the required topics", () => {
    const casesDir = path.join(__dirname, "golden", "cases");
    eq("tests/golden/cases exists", fs.existsSync(casesDir), true);
    const names = fs
      .readdirSync(casesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    eq("at least eight case folders", names.length >= 8, true);
    for (const n of names) {
      const dir = path.join(casesDir, n);
      eq(`${n} has template.md`, fs.existsSync(path.join(dir, "template.md")), true);
      eq(`${n} has data.json`, fs.existsSync(path.join(dir, "data.json")), true);
      const expectedCount = ["expected.md", "expected-error.txt"].filter((f) =>
        fs.existsSync(path.join(dir, f)),
      ).length;
      eq(`${n} has exactly one expected file`, expectedCount, 1);
    }
    for (const topic of ["if", "case", "for", "list", "table", "filter", "default", "error"]) {
      eq(
        `a case directory name contains "${topic}"`,
        names.some((n) => n.toLowerCase().includes(topic)),
        true,
      );
    }
  });

  test("gf-05: every shipped case passes against the real resolver", () => {
    const casesDir = path.join(__dirname, "golden", "cases");
    eq("tests/golden/cases exists", fs.existsSync(casesDir), true);
    const resolveTemplate = loadResolver();
    eq("the real resolveTemplate loads", typeof resolveTemplate, "function");
    const render: Render = (template, data, options) =>
      resolveTemplate(template, new Map(Object.entries(data ?? {})), options);
    const results = run(casesDir, render);
    eq("at least eight cases ran", results.length >= 8, true);
    const failed = results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.message}`);
    eq("no case failed", failed, []);
  });
});
```

## 4. Diff

8 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/tests/golden/cases/case-when-default/data.json b/tests/golden/cases/case-when-default/data.json
new file mode 100644
index 0000000..ecb04dd
--- /dev/null
+++ b/tests/golden/cases/case-when-default/data.json
@@ -0,0 +1 @@
+{"plan":"pro","other":"enterprise"}
\ No newline at end of file
diff --git a/tests/golden/cases/case-when-default/expected.md b/tests/golden/cases/case-when-default/expected.md
new file mode 100644
index 0000000..11e8d76
--- /dev/null
+++ b/tests/golden/cases/case-when-default/expected.md
@@ -0,0 +1,2 @@
+Plan: Pro tier
+Plan: Unknown tier
diff --git a/tests/golden/cases/case-when-default/template.md b/tests/golden/cases/case-when-default/template.md
new file mode 100644
index 0000000..a885033
--- /dev/null
+++ b/tests/golden/cases/case-when-default/template.md
@@ -0,0 +1,2 @@
+Plan: {{CASE plan}}{{WHEN "free"}}Free tier{{END_WHEN}}{{WHEN "pro"}}Pro tier{{END_WHEN}}{{DEFAULT}}Unknown tier{{END_DEFAULT}}{{END_CASE}}
+Plan: {{CASE other}}{{WHEN "free"}}Free tier{{END_WHEN}}{{DEFAULT}}Unknown tier{{END_DEFAULT}}{{END_CASE}}
diff --git a/tests/golden/cases/default-fallback/data.json b/tests/golden/cases/default-fallback/data.json
new file mode 100644
index 0000000..61eb2bb
--- /dev/null
+++ b/tests/golden/cases/default-fallback/data.json
@@ -0,0 +1 @@
+{"nick":"","name":"Sam"}
\ No newline at end of file
diff --git a/tests/golden/cases/default-fallback/expected.md b/tests/golden/cases/default-fallback/expected.md
new file mode 100644
index 0000000..fa61c20
--- /dev/null
+++ b/tests/golden/cases/default-fallback/expected.md
@@ -0,0 +1,4 @@
+friend
+Sam
+a|b
+none
diff --git a/tests/golden/cases/default-fallback/template.md b/tests/golden/cases/default-fallback/template.md
new file mode 100644
index 0000000..62badaa
--- /dev/null
+++ b/tests/golden/cases/default-fallback/template.md
@@ -0,0 +1,4 @@
+${{nick ?? "friend"}}
+${{name ?? "friend"}}
+${{nick ?? "a|b" | trim}}
+${{missing.deep ?? "none"}}
diff --git a/tests/golden/cases/error-missing-variable/data.json b/tests/golden/cases/error-missing-variable/data.json
new file mode 100644
index 0000000..9e26dfe
--- /dev/null
+++ b/tests/golden/cases/error-missing-variable/data.json
@@ -0,0 +1 @@
+{}
\ No newline at end of file
diff --git a/tests/golden/cases/error-missing-variable/expected-error.txt b/tests/golden/cases/error-missing-variable/expected-error.txt
new file mode 100644
index 0000000..0536789
--- /dev/null
+++ b/tests/golden/cases/error-missing-variable/expected-error.txt
@@ -0,0 +1 @@
+Variable 'who' not found
\ No newline at end of file
diff --git a/tests/golden/cases/error-missing-variable/template.md b/tests/golden/cases/error-missing-variable/template.md
new file mode 100644
index 0000000..b1a4990
--- /dev/null
+++ b/tests/golden/cases/error-missing-variable/template.md
@@ -0,0 +1 @@
+Hello ${{who}}
diff --git a/tests/golden/cases/filter-chain/data.json b/tests/golden/cases/filter-chain/data.json
new file mode 100644
index 0000000..a217ddd
--- /dev/null
+++ b/tests/golden/cases/filter-chain/data.json
@@ -0,0 +1 @@
+{"title":"   Hello World   ","raw":"*bold* _x_ [l](u)"}
\ No newline at end of file
diff --git a/tests/golden/cases/filter-chain/expected.md b/tests/golden/cases/filter-chain/expected.md
new file mode 100644
index 0000000..019ba20
--- /dev/null
+++ b/tests/golden/cases/filter-chain/expected.md
@@ -0,0 +1,3 @@
+Hello
+rld
+\*bold\* \_x\_ \[l\]\(u\)
diff --git a/tests/golden/cases/filter-chain/template.md b/tests/golden/cases/filter-chain/template.md
new file mode 100644
index 0000000..29cd882
--- /dev/null
+++ b/tests/golden/cases/filter-chain/template.md
@@ -0,0 +1,3 @@
+${{title | trim | head=5}}
+${{title | trim | tail=3}}
+${{raw | escape_md}}
diff --git a/tests/golden/cases/for-nested-loops/data.json b/tests/golden/cases/for-nested-loops/data.json
new file mode 100644
index 0000000..22f2079
--- /dev/null
+++ b/tests/golden/cases/for-nested-loops/data.json
@@ -0,0 +1 @@
+{"teams":[{"name":"Red","members":["Ann","Bo"]},{"name":"Blue","members":["Cy"]}]}
\ No newline at end of file
diff --git a/tests/golden/cases/for-nested-loops/expected.md b/tests/golden/cases/for-nested-loops/expected.md
new file mode 100644
index 0000000..8f2bad3
--- /dev/null
+++ b/tests/golden/cases/for-nested-loops/expected.md
@@ -0,0 +1,2 @@
+1. Red: Ann, Bo (team Red of 1)
+2. Blue: Cy (team Blue of 2, last)
diff --git a/tests/golden/cases/for-nested-loops/template.md b/tests/golden/cases/for-nested-loops/template.md
new file mode 100644
index 0000000..f26c7d6
--- /dev/null
+++ b/tests/golden/cases/for-nested-loops/template.md
@@ -0,0 +1,2 @@
+{{FOR teams AS team}}${{@index1}}. ${{team.name}}: {{FOR team.members AS m}}${{m}}{{IF @notLast}}, {{END_IF}}{{END_FOR}} (team ${{team.name}} of ${{@index1}}{{IF @last}}, last{{END_IF}})
+{{END_FOR}}
\ No newline at end of file
diff --git a/tests/golden/cases/if-elseif-else/data.json b/tests/golden/cases/if-elseif-else/data.json
new file mode 100644
index 0000000..efcd787
--- /dev/null
+++ b/tests/golden/cases/if-elseif-else/data.json
@@ -0,0 +1 @@
+{"score":80,"passed":true,"name":"Joanne","banned":false}
\ No newline at end of file
diff --git a/tests/golden/cases/if-elseif-else/expected.md b/tests/golden/cases/if-elseif-else/expected.md
new file mode 100644
index 0000000..c21e873
--- /dev/null
+++ b/tests/golden/cases/if-elseif-else/expected.md
@@ -0,0 +1,2 @@
+Grade B
+Welcome Joanne
diff --git a/tests/golden/cases/if-elseif-else/template.md b/tests/golden/cases/if-elseif-else/template.md
new file mode 100644
index 0000000..4e2005e
--- /dev/null
+++ b/tests/golden/cases/if-elseif-else/template.md
@@ -0,0 +1,2 @@
+{{IF score >= 90}}Grade A{{ELSEIF score >= 75 AND passed}}Grade B{{ELSE}}Retry{{END_IF}}
+{{IF name contains "ann" AND NOT(banned)}}Welcome ${{name}}{{END_IF}}
diff --git a/tests/golden/cases/list-nested-conditional/data.json b/tests/golden/cases/list-nested-conditional/data.json
new file mode 100644
index 0000000..2a02066
--- /dev/null
+++ b/tests/golden/cases/list-nested-conditional/data.json
@@ -0,0 +1 @@
+{"beta":true,"hidden":false}
\ No newline at end of file
diff --git a/tests/golden/cases/list-nested-conditional/expected.md b/tests/golden/cases/list-nested-conditional/expected.md
new file mode 100644
index 0000000..edbf019
--- /dev/null
+++ b/tests/golden/cases/list-nested-conditional/expected.md
@@ -0,0 +1,5 @@
+1. Install
+2. Enable beta
+   1. Opt in
+   2. Send feedback
+3. Done
diff --git a/tests/golden/cases/list-nested-conditional/template.md b/tests/golden/cases/list-nested-conditional/template.md
new file mode 100644
index 0000000..e9dd53b
--- /dev/null
+++ b/tests/golden/cases/list-nested-conditional/template.md
@@ -0,0 +1,6 @@
+{{LIST}}
+{{LIST_ITEM}}Install{{END_LIST_ITEM}}
+{{LIST_ITEM beta}}Enable beta{{LIST}}{{LIST_ITEM}}Opt in{{END_LIST_ITEM}}{{LIST_ITEM}}Send feedback{{END_LIST_ITEM}}{{END_LIST}}{{END_LIST_ITEM}}
+{{LIST_ITEM hidden}}Skipped{{END_LIST_ITEM}}
+{{LIST_ITEM missing | fallback="Done"}}Never shown{{END_LIST_ITEM}}
+{{END_LIST}}
diff --git a/tests/golden/cases/table-with-for-rows/data.json b/tests/golden/cases/table-with-for-rows/data.json
new file mode 100644
index 0000000..d51ef76
--- /dev/null
+++ b/tests/golden/cases/table-with-for-rows/data.json
@@ -0,0 +1 @@
+{"rows":[{"item":"Bolt","qty":10,"note":"a|b"},{"item":"Nut","qty":5,"note":"plain"}]}
\ No newline at end of file
diff --git a/tests/golden/cases/table-with-for-rows/expected.md b/tests/golden/cases/table-with-for-rows/expected.md
new file mode 100644
index 0000000..cccf2b3
--- /dev/null
+++ b/tests/golden/cases/table-with-for-rows/expected.md
@@ -0,0 +1,4 @@
+| Item | Qty | Note |
+|:-----|:-----:|-----:|
+| Bolt | 10 | a\|b |
+| Nut | 5 | plain |
diff --git a/tests/golden/cases/table-with-for-rows/template.md b/tests/golden/cases/table-with-for-rows/template.md
new file mode 100644
index 0000000..af36c8e
--- /dev/null
+++ b/tests/golden/cases/table-with-for-rows/template.md
@@ -0,0 +1 @@
+{{TABLE align="left|center|right"}}{{HEADER}}Item|Qty|Note{{END_HEADER}}{{FOR rows AS r}}{{ROW}}${{r.item}}|${{r.qty}}|${{r.note}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}
diff --git a/tests/golden/golden.test.ts b/tests/golden/golden.test.ts
new file mode 100644
index 0000000..96b8e25
--- /dev/null
+++ b/tests/golden/golden.test.ts
@@ -0,0 +1,15 @@
+import * as path from "path";
+import { resolveTemplate } from "../../core/src";
+import { runGoldenCases } from "./harness";
+
+describe("golden cases", () => {
+  test("every case renders to its expected file", () => {
+    const results = runGoldenCases(
+      path.join(__dirname, "cases"),
+      (template, data, options) =>
+        resolveTemplate(template, new Map(Object.entries(data)), options),
+    );
+    const failures = results.filter((r) => !r.passed).map((r) => r.message);
+    expect(failures.join("\n\n")).toBe("");
+  });
+});
diff --git a/tests/golden/harness.ts b/tests/golden/harness.ts
new file mode 100644
index 0000000..b39d4f0
--- /dev/null
+++ b/tests/golden/harness.ts
@@ -0,0 +1,114 @@
+import * as fs from "fs";
+import * as path from "path";
+
+export type GoldenRender = (
+  template: string,
+  data: any,
+  options: any,
+) => string;
+
+export type GoldenResult = { name: string; passed: boolean; message?: string };
+
+function readIfExists(file: string): string | null {
+  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
+}
+
+function firstDifference(name: string, actual: string, expected: string): string {
+  const actualLines = actual.split("\n");
+  const expectedLines = expected.split("\n");
+  const count = Math.max(actualLines.length, expectedLines.length);
+  for (let i = 0; i < count; i++) {
+    if (actualLines[i] !== expectedLines[i]) {
+      return [
+        `${name}: output differs from expected.md at line ${i + 1}`,
+        `  actual:   ${JSON.stringify(actualLines[i] ?? "(no line)")}`,
+        `  expected: ${JSON.stringify(expectedLines[i] ?? "(no line)")}`,
+      ].join("\n");
+    }
+  }
+  return `${name}: output differs from expected.md`;
+}
+
+function runCase(
+  dir: string,
+  name: string,
+  render: GoldenRender,
+  update: boolean,
+): GoldenResult {
+  const template = fs.readFileSync(path.join(dir, "template.md"), "utf8");
+  const data = JSON.parse(readIfExists(path.join(dir, "data.json")) ?? "{}");
+  const optionsText = readIfExists(path.join(dir, "options.json"));
+  const options = optionsText === null ? undefined : JSON.parse(optionsText);
+
+  const expectedFile = path.join(dir, "expected.md");
+  const errorFile = path.join(dir, "expected-error.txt");
+  const wantsError =
+    fs.existsSync(errorFile) && !(update && fs.existsSync(expectedFile));
+
+  let output = "";
+  let thrown: string | null = null;
+  try {
+    output = render(template, data, options);
+  } catch (error) {
+    thrown = error instanceof Error ? error.message : String(error);
+  }
+
+  if (wantsError) {
+    if (update && thrown !== null) {
+      fs.writeFileSync(errorFile, thrown);
+      return { name, passed: true };
+    }
+    const expectedError = fs.readFileSync(errorFile, "utf8").trim();
+    if (thrown === null) {
+      return {
+        name,
+        passed: false,
+        message: `${name}: expected an error containing ${JSON.stringify(expectedError)} but render succeeded`,
+      };
+    }
+    if (!thrown.includes(expectedError)) {
+      return {
+        name,
+        passed: false,
+        message: `${name}: expected an error containing ${JSON.stringify(expectedError)} but got ${JSON.stringify(thrown)}`,
+      };
+    }
+    return { name, passed: true };
+  }
+
+  if (thrown !== null) {
+    return {
+      name,
+      passed: false,
+      message: `${name}: render threw ${JSON.stringify(thrown)}`,
+    };
+  }
+  if (update) {
+    fs.writeFileSync(expectedFile, output);
+    return { name, passed: true };
+  }
+  const expected = readIfExists(expectedFile);
+  if (expected === null) {
+    return {
+      name,
+      passed: false,
+      message: `${name}: no expected.md or expected-error.txt`,
+    };
+  }
+  if (output === expected) return { name, passed: true };
+  return { name, passed: false, message: firstDifference(name, output, expected) };
+}
+
+export function runGoldenCases(
+  casesDir: string,
+  render: GoldenRender,
+  options?: { update?: boolean },
+): GoldenResult[] {
+  const update = options?.update ?? process.env.UPDATE_GOLDEN === "1";
+  return fs
+    .readdirSync(casesDir, { withFileTypes: true })
+    .filter((entry) => entry.isDirectory())
+    .map((entry) => entry.name)
+    .sort()
+    .map((name) => runCase(path.join(casesDir, name), name, render, update));
+}
```

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
