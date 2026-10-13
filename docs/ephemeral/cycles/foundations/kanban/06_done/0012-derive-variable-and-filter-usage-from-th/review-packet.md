---
type: review-packet
card: 0012-derive-variable-and-filter-usage-from-th
tier: product
built_at: 2026-10-13T22:01:12.639Z
base: dca9cee9598720e6e31bae2f135734f38d838daa
head: 4903ccd0e7b7fbd16dfd7d90936191155a0cd79f
frozen: true
brief_sha256: 374dd11340f9597d22fee169d58c98bb2e1a9796b90e141fcd87dadc328e4be9
manifest_sha256: a3bd3f1984f747b4016de820923a7ccb65d5b92060c156fd34ef08912411f7d7
criteria_sha256: 928b460d70a60e21d892c0e8117c986126ef19876affd78f41412617302db9f1
scope_sha256: 9373fa319d1e3fbdcfd506fa6b9b0e17dd98a29589343c07a535d3193ec59b95
diff_sha256: 6b3e7de3cb548dd224c8740bd6ef92ca173d167aee1857d912fa517cc3fe6c3b
omitted_paths: 8
criteria_count: 7
must_not_count: 2
---

# Review packet: 0012-derive-variable-and-filter-usage-from-th

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: Add analyze(template) to core, returning the variables a template reads (root name, full paths, where used: output, IF, ELSEIF, CASE, FOR source, LIST_ITEM, TABLE cells, filter arguments, comparison operands including the right side of contains) and the filters it applies, all derived from the parsed AST and expression tokens, not from regexes on the source

### Criteria

- c1 (verify: test): an-01: analyze reports variables used in output tags, IF, ELSEIF, CASE, FOR sources, LIST_ITEM conditions and table cells
- c2 (verify: test): an-02: variables on either side of AND, OR and comparison operators, including the right side of contains, are reported
- c3 (verify: test): an-03: FOR item variables, @-metadata and operator words such as NOT are not reported as inputs
- c4 (verify: test): an-04: a variable with a ?? default is reported optional and the node strict mode accepts it unmapped
- c5 (verify: test): an-05: analyze lists every filter used with its name, and an unknown filter is reported as a diagnostic
- c6 (verify: test): an-06: strict mode no longer rejects a template whose only unmapped names are FOR item variables
- c7 (verify: test): an-07: the regex-based extractAllVariables no longer exists in core

### Must not

- m1: edit or delete any existing test body
- m2: add a runtime dependency

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: Add analyze(template) to core, returning the variables a template reads (root name, full paths, where used: output, IF, ELSEIF, CASE, FOR source, LIST_ITEM, TABLE cells, filter arguments, comparison operands including the right side of contains) and the filters it applies, all derived from the parsed AST and expression tokens, not from regexes on the source
Must not:
- edit or delete any existing test body
- add a runtime dependency

## Questions

goal-critical: does each frozen test fail before the change for the stated reason and pass after?
goal-critical: do all pre-existing tests still pass?

## Rubric

- no regular expression is run over raw template source to find variables

## Design context

- docs/living/architecture/modules/template-resolver.md
```

### spec.md as of base dca9cee

```
# Spec

## Acceptance criteria

- an-01: analyze reports variables used in output tags, IF, ELSEIF, CASE, FOR sources, LIST_ITEM conditions and table cells
- an-02: variables on either side of AND, OR and comparison operators, including the right side of contains, are reported
- an-03: FOR item variables, @-metadata and operator words such as NOT are not reported as inputs
- an-04: a variable with a ?? default is reported optional and the node strict mode accepts it unmapped
- an-05: analyze lists every filter used with its name, and an unknown filter is reported as a diagnostic
- an-06: strict mode no longer rejects a template whose only unmapped names are FOR item variables
- an-07: the regex-based extractAllVariables no longer exists in core
```

### card.md as of base dca9cee

```
# Derive variable and filter usage from the AST

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Add analyze(template) to core, returning the variables a template reads (root name, full paths, where used: output, IF, ELSEIF, CASE, FOR source, LIST_ITEM, TABLE cells, filter arguments, comparison operands including the right side of contains) and the filters it applies, all derived from the parsed AST and expression tokens, not from regexes on the source. The node strict-mode pre-check uses it, replacing extractAllVariables. Loop item variables and @-metadata are not reported as inputs; a variable with a ?? default is reported as optional; NOT and other operator words are never variables. Remove the regex detection.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `an-01` analyze reports variables used in output tags, IF, ELSEIF, CASE, FOR sources, LIST_ITEM conditions and table cells
- `contract` `an-02` variables on either side of AND, OR and comparison operators, including the right side of contains, are reported
- `contract` `an-03` FOR item variables, @-metadata and operator words such as NOT are not reported as inputs
- `contract` `an-04` a variable with a ?? default is reported optional and the node strict mode accepts it unmapped
- `contract` `an-05` analyze lists every filter used with its name, and an unknown filter is reported as a diagnostic
- `contract` `an-06` strict mode no longer rejects a template whose only unmapped names are FOR item variables
- `contract` `an-07` the regex-based extractAllVariables no longer exists in core


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

New core export analyze(template: string): { variables: {name, paths, usedIn, optional}[], filters: {name, count}[], diagnostics }, exact shape fixed by the frozen tests.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/analyze.ts` | add | template-resolver |
| `core/src/index.ts` | edit | template-resolver |
| `core/src/utils.ts` | edit | template-resolver |
| `n8n/TemplateResolver.node.ts` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/index.ts`, `core/src/utils.ts`, `n8n/TemplateResolver.node.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

Each row is a change outside the card's scope that its lead approved. A builder who can edit the card folder can add a row, so the human gate is the backstop.

| Date | Path | Kind | Reason | Approved by |
| --- | --- | --- | --- | --- |
| 2026-10-13 | `core/src/expressions.ts` | edit | export the evaluator's condition-splitting helpers so analyze shares them; behaviour preserving | project lead (front approval) |

### Manifest and scope

- add: `core/src/analyze.ts`
- remove: `core/src/utils.ts`
- edit: `core/src/index.ts`, `n8n/TemplateResolver.node.ts`
- files_scope: `core/src/analyze.ts`, `core/src/index.ts`, `core/src/utils.ts`, `n8n/TemplateResolver.node.ts`

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

These test files were committed before the work began, at base dca9cee. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/analyze.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as path from "path";

/** Load the core entry lazily so a missing module is an assertion failure, not a load error. */
function load(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../core/src");
  } catch {
    return null;
  }
}

/** Load the n8n node lazily for the same reason. */
function loadNode(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../n8n/TemplateResolver.node");
  } catch {
    return null;
  }
}

type Usage = {
  name: string;
  paths: string[];
  usedIn: string[];
  optional: boolean;
};

function analyzeOf(template: string): {
  variables: Usage[];
  filters: { name: string; count: number }[];
  diagnostics: { code?: string; message: string }[];
} {
  const core = load();
  expect(core).not.toBeNull();
  expect(typeof core.analyze).toBe("function");
  return core.analyze(template);
}

function names(template: string): string[] {
  return analyzeOf(template)
    .variables.map((v) => v.name)
    .sort();
}

function find(template: string, name: string): Usage | undefined {
  return analyzeOf(template).variables.find((v) => v.name === name);
}

/** Run the node's execute path for one item with the given mappings and strict mode. */
async function runNode(
  template: string,
  mappings: { variableName: string; value: string }[],
  strictMode: boolean
): Promise<{ output?: string; error?: string }> {
  const mod = loadNode();
  expect(mod).not.toBeNull();
  const node = new mod.TemplateResolver();
  const params: Record<string, any> = {
    template,
    variableMappings: { mappings },
    strictMode,
    showDetectedVariables: false,
    outputField: "out",
  };
  const ctx = {
    getInputData: () => [{ json: {} }],
    getNodeParameter: (name: string, _i: number, dflt?: any) =>
      name in params ? params[name] : dflt,
    continueOnFail: () => false,
    getNode: () => ({ name: "TemplateResolver" }),
  };
  try {
    const result = await node.execute.call(ctx);
    return { output: result[0][0].json.out };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

describe("analyze: variable and filter usage", () => {
  test("an-01: output tags report the root name, full path and the output construct", () => {
    const u = find("Hi ${{user.name}} and ${{user.email}}", "user");
    expect(u).toBeDefined();
    expect(u!.paths.slice().sort()).toEqual(["user.email", "user.name"]);
    expect(u!.usedIn).toEqual(["output"]);
    expect(u!.optional).toBe(false);
  });

  test("an-01: IF, ELSEIF and CASE subjects are reported with their construct", () => {
    const t =
      "{{IF a}}A{{ELSEIF b}}B{{END_IF}}" +
      '{{CASE c}}{{WHEN "x"}}X{{END_WHEN}}{{END_CASE}}';
    expect(names(t)).toEqual(["a", "b", "c"]);
    expect(find(t, "a")!.usedIn).toEqual(["if"]);
    expect(find(t, "b")!.usedIn).toEqual(["elseif"]);
    expect(find(t, "c")!.usedIn).toEqual(["case"]);
  });

  test("an-01: a FOR source is reported as for", () => {
    const t = "{{FOR items AS item}}x{{END_FOR}}";
    expect(names(t)).toEqual(["items"]);
    expect(find(t, "items")!.usedIn).toEqual(["for"]);
  });

  test("an-01: a LIST_ITEM condition is reported as list_item", () => {
    const t =
      '{{LIST}}{{LIST_ITEM show | fallback="none"}}A{{END_LIST_ITEM}}{{END_LIST}}';
    expect(names(t)).toEqual(["show"]);
    expect(find(t, "show")!.usedIn).toEqual(["list_item"]);
  });

  test("an-01: table cells are reported as table", () => {
    const t =
      "{{TABLE}}{{HEADER}}Name|Age{{END_HEADER}}{{ROW}}${{name}}|${{age}}{{END_ROW}}{{END_TABLE}}";
    expect(names(t)).toEqual(["age", "name"]);
    expect(find(t, "name")!.usedIn).toEqual(["table"]);
    expect(find(t, "age")!.usedIn).toEqual(["table"]);
  });

  test("an-01: the same variable used in two constructs lists both, distinct", () => {
    const t = "{{IF a}}${{a}} ${{a}}{{END_IF}}";
    const u = find(t, "a");
    expect(u).toBeDefined();
    expect(u!.usedIn.slice().sort()).toEqual(["if", "output"]);
    expect(u!.paths).toEqual(["a"]);
  });

  test("an-02: both operands of AND and OR are reported", () => {
    expect(names("{{IF a AND b}}x{{END_IF}}")).toEqual(["a", "b"]);
    expect(names("{{IF a OR b}}x{{END_IF}}")).toEqual(["a", "b"]);
    expect(names("{{IF a && b}}x{{END_IF}}")).toEqual(["a", "b"]);
    expect(names("{{IF a || b}}x{{END_IF}}")).toEqual(["a", "b"]);
  });

  test("an-02: both sides of a comparison are reported", () => {
    expect(names("{{IF a == b}}x{{END_IF}}")).toEqual(["a", "b"]);
    expect(find("{{IF a == b}}x{{END_IF}}", "b")!.usedIn).toEqual(["if"]);
  });

  test("an-02: the right side of contains is reported", () => {
    expect(names("{{IF s contains t}}x{{END_IF}}")).toEqual(["s", "t"]);
  });

  test("an-02: a literal right-hand side is not a variable", () => {
    expect(names('{{IF s contains "t"}}x{{END_IF}}')).toEqual(["s"]);
    expect(names("{{IF n == 5}}x{{END_IF}}")).toEqual(["n"]);
  });

  test("an-03: FOR item variables are not inputs, in the body or with a path", () => {
    const t = "{{FOR xs AS x}}${{x}} ${{x.name}}{{END_FOR}}";
    expect(names(t)).toEqual(["xs"]);
  });

  test("an-03: @-metadata is not an input", () => {
    const t =
      "{{FOR xs AS x}}${{@index}} ${{@index0}} {{IF @first}}F{{END_IF}} {{IF @last}}L{{END_IF}}{{END_FOR}}";
    expect(names(t)).toEqual(["xs"]);
  });

  test("an-03: the word NOT is never a variable", () => {
    expect(names("{{IF NOT(a)}}x{{END_IF}}")).toEqual(["a"]);
    expect(names("{{IF NOT a}}x{{END_IF}}")).toEqual(["a"]);
  });

  test("an-03: a FOR item name used only outside its loop is still an input", () => {
    const t = "{{FOR xs AS x}}${{x}}{{END_FOR}}${{x}}";
    expect(names(t)).toEqual(["x", "xs"]);
  });

  test("an-04: a variable with a ?? default is optional", () => {
    const u = find('${{x ?? "d"}}', "x");
    expect(u).toBeDefined();
    expect(u!.optional).toBe(true);
  });

  test("an-04: a variable with one guarded and one unguarded use is not optional", () => {
    const u = find('${{x ?? "d"}} ${{x}}', "x");
    expect(u).toBeDefined();
    expect(u!.optional).toBe(false);
  });

  test("an-04: a variable without a default is not optional", () => {
    const u = find("${{x}}", "x");
    expect(u).toBeDefined();
    expect(u!.optional).toBe(false);
  });

  test("an-04: strict mode accepts an unmapped variable that has a ?? default", async () => {
    const r = await runNode('${{x ?? "d"}}', [], true);
    expect(r.error).toBeUndefined();
    expect(r.output).toBe("d");
  });

  test("an-04: strict mode still rejects an unmapped variable without a default", async () => {
    const r = await runNode("${{x}}", [], true);
    expect(r.error).toBeDefined();
    expect(r.error).toMatch(/unmapped variables: x/);
  });

  test("an-05: every filter used is listed with its name", () => {
    const a = analyzeOf("${{x | trim | head=3}}");
    const filterNames = a.filters.map((f) => f.name).sort();
    expect(filterNames).toEqual(["head", "trim"]);
    expect(a.diagnostics).toEqual([]);
  });

  test("an-05: a filter used twice has count 2", () => {
    const a = analyzeOf("${{x | trim}} ${{y | trim}}");
    expect(a.filters.find((f) => f.name === "trim")?.count).toBe(2);
  });

  test("an-05: an unknown filter is reported as a diagnostic naming it", () => {
    const a = analyzeOf("${{x | nosuchfilter}}");
    expect(a.diagnostics.length).toBeGreaterThan(0);
    expect(a.diagnostics.some((d) => d.message.includes("nosuchfilter"))).toBe(
      true
    );
  });

  test("an-06: strict mode does not reject a template whose only unmapped name is a FOR item", async () => {
    const r = await runNode(
      "{{FOR xs AS x}}${{x}}{{END_FOR}}",
      [{ variableName: "xs", value: '["a","b"]' }],
      true
    );
    expect(r.error).toBeUndefined();
    expect(r.output).toBe("ab");
  });

  test("an-06: strict mode still names a genuinely unmapped loop source", async () => {
    const r = await runNode("{{FOR xs AS x}}${{x}}{{END_FOR}}", [], true);
    expect(r.error).toBeDefined();
    expect(r.error).toMatch(/unmapped variables: xs/);
  });

  test("an-07: core/src contains no extractAllVariables", () => {
    const dir = path.join(__dirname, "..", "core", "src");
    expect(fs.existsSync(dir)).toBe(true);
    const offenders: string[] = [];
    const walk = (d: string): void => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (fs.readFileSync(p, "utf8").includes("extractAllVariables"))
          offenders.push(path.relative(dir, p));
      }
    };
    if (fs.existsSync(dir)) walk(dir);
    expect(offenders).toEqual([]);
  });

  test("an-07: core does not export extractAllVariables", () => {
    const core = load();
    expect(core).not.toBeNull();
    expect(core.extractAllVariables).toBeUndefined();
  });
});
```

## 4. Diff

8 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/core/src/analyze.ts b/core/src/analyze.ts
new file mode 100644
index 0000000..2701f06
--- /dev/null
+++ b/core/src/analyze.ts
@@ -0,0 +1,222 @@
+import { Lexer } from "./lexer";
+import { Parser } from "./parser";
+import { parseFilter } from "./filters";
+import {
+  conditionOperands,
+  hasBareWhitespace,
+  isMathExpression,
+  mathVariableNames,
+  parseLiteral,
+} from "./expressions";
+import {
+  ASTNode,
+  CaseNode,
+  ForNode,
+  IfNode,
+  ListItemNode,
+  ListNode,
+  TableHeaderNode,
+  TableNode,
+  TableRowNode,
+  VariableNode,
+} from "./types";
+
+export type UsageKind =
+  | "output"
+  | "if"
+  | "elseif"
+  | "case"
+  | "for"
+  | "list_item"
+  | "table";
+
+export interface VariableUsage {
+  /** Root name, the part before the first dot */
+  name: string;
+  /** Distinct full paths read, in source order */
+  paths: string[];
+  /** Distinct constructs that read it, in source order */
+  usedIn: UsageKind[];
+  /** True when every read supplies a ?? default */
+  optional: boolean;
+}
+
+export interface FilterUsage {
+  name: string;
+  count: number;
+}
+
+export interface AnalysisDiagnostic {
+  code: string;
+  message: string;
+  line: number;
+  column: number;
+}
+
+export interface TemplateAnalysis {
+  variables: VariableUsage[];
+  filters: FilterUsage[];
+  diagnostics: AnalysisDiagnostic[];
+}
+
+const KNOWN_FILTERS = new Set(["head", "tail", "trim", "escape_md"]);
+
+/**
+ * Report the variables a template reads and the filters it applies, derived
+ * from the parsed template. Loop item names (inside their loop) and
+ * @-metadata are not inputs.
+ */
+export function analyze(template: string): TemplateAnalysis {
+  const ast = new Parser(new Lexer(template).tokenize()).parse();
+  const walker = new Walker();
+  walker.visitAll(ast.body);
+  return walker.result();
+}
+
+interface Entry {
+  paths: Set<string>;
+  usedIn: Set<UsageKind>;
+  allOptional: boolean;
+}
+
+class Walker {
+  private entries = new Map<string, Entry>();
+  private filterCounts = new Map<string, number>();
+  private diagnostics: AnalysisDiagnostic[] = [];
+  private scopes: string[] = [];
+  private tableDepth = 0;
+
+  result(): TemplateAnalysis {
+    return {
+      variables: Array.from(this.entries, ([name, entry]) => ({
+        name,
+        paths: Array.from(entry.paths),
+        usedIn: Array.from(entry.usedIn),
+        optional: entry.allOptional,
+      })),
+      filters: Array.from(this.filterCounts, ([name, count]) => ({
+        name,
+        count,
+      })),
+      diagnostics: this.diagnostics,
+    };
+  }
+
+  visitAll(nodes: ASTNode[]): void {
+    for (const node of nodes) this.visit(node);
+  }
+
+  private visit(node: ASTNode): void {
+    switch (node.type) {
+      case "Variable":
+        return this.visitVariable(node as VariableNode);
+      case "If":
+        return this.visitIf(node as IfNode, "if");
+      case "Case":
+        return this.visitCase(node as CaseNode);
+      case "For":
+        return this.visitFor(node as ForNode);
+      case "List":
+        return (node as ListNode).items.forEach((i) => this.visitListItem(i));
+      case "Table":
+        return this.visitTable(node as TableNode);
+      case "Header":
+      case "TableRow":
+        return this.visitCells(node as TableHeaderNode | TableRowNode);
+    }
+  }
+
+  private visitVariable(node: VariableNode): void {
+    const kind: UsageKind = this.tableDepth > 0 ? "table" : "output";
+    const text = node.path.join(".");
+
+    if (isMathExpression(text)) {
+      for (const name of mathVariableNames(text)) this.record(name, kind, false);
+    } else {
+      this.record(text, kind, node.defaultValue !== undefined);
+    }
+
+    for (const filter of node.filters ?? []) {
+      const { name } = parseFilter(filter.name);
+      this.filterCounts.set(name, (this.filterCounts.get(name) ?? 0) + 1);
+      if (!KNOWN_FILTERS.has(name)) {
+        this.diagnostics.push({
+          code: "unknown-filter",
+          message: `Unknown filter: ${name}`,
+          line: node.line,
+          column: node.column,
+        });
+      }
+    }
+  }
+
+  private visitIf(node: IfNode, kind: "if" | "elseif"): void {
+    this.visitCondition(node.condition, kind, node);
+    this.visitAll(node.consequent);
+    if (Array.isArray(node.alternate)) this.visitAll(node.alternate);
+    else if (node.alternate) this.visitIf(node.alternate, "elseif");
+  }
+
+  private visitCase(node: CaseNode): void {
+    this.record(node.expression, "case", false);
+    for (const when of node.cases) this.visitAll(when.body);
+    if (node.default) this.visitAll(node.default.body);
+  }
+
+  private visitFor(node: ForNode): void {
+    this.record(node.iterable.join("."), "for", false);
+    this.scopes.push(node.itemName);
+    this.visitAll(node.body);
+    this.scopes.pop();
+  }
+
+  private visitListItem(node: ListItemNode): void {
+    if (node.condition) this.visitCondition(node.condition, "list_item", node);
+    this.visitAll(node.content);
+  }
+
+  private visitTable(node: TableNode): void {
+    if (node.header) this.visitCells(node.header);
+    for (const row of node.rows) this.visitCells(row);
+  }
+
+  private visitCells(node: TableHeaderNode | TableRowNode): void {
+    this.tableDepth++;
+    for (const cell of node.cells) this.visitAll(cell);
+    this.tableDepth--;
+  }
+
+  private visitCondition(
+    condition: string,
+    kind: UsageKind,
+    at: ASTNode
+  ): void {
+    for (const operand of conditionOperands(condition)) {
+      if (operand === "" || parseLiteral(operand) !== null) continue;
+      if (hasBareWhitespace(operand)) {
+        this.diagnostics.push({
+          code: "unrecognized-condition",
+          message: `Unrecognized condition: ${operand}`,
+          line: at.line,
+          column: at.column,
+        });
+        continue;
+      }
+      this.record(operand, kind, false);
+    }
+  }
+
+  private record(path: string, kind: UsageKind, optional: boolean): void {
+    const root = path.split(".")[0];
+    if (root.startsWith("@") || this.scopes.includes(root)) return;
+
+    let entry = this.entries.get(root);
+    if (!entry) {
+      entry = { paths: new Set(), usedIn: new Set(), allOptional: true };
+      this.entries.set(root, entry);
+    }
+    entry.paths.add(path);
+    entry.usedIn.add(kind);
+    if (!optional) entry.allOptional = false;
+  }
+}
diff --git a/core/src/expressions.ts b/core/src/expressions.ts
index c35e283..259fc3c 100644
--- a/core/src/expressions.ts
+++ b/core/src/expressions.ts
@@ -71,21 +71,16 @@ export function evaluateCondition(
   const trimmed = condition.trim();
 
   // Handle parentheses for grouping - only if they're matching outer parens
-  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
-    const inner = trimmed.slice(1, -1);
-    // Check if the inner content is balanced - if so, these are wrapping parens
-    if (isBalancedParens(inner)) {
-      return evaluateCondition(inner, variables);
-    }
-  }
+  const unwrapped = unwrapParens(trimmed);
+  if (unwrapped !== null) return evaluateCondition(unwrapped, variables);
 
   // Handle logical operators (AND, OR)
   const logicalResult = tryEvaluateLogical(trimmed, variables);
   if (logicalResult !== null) return logicalResult;
 
   // Handle negation: NOT x, NOT (x), !x
-  const negated = trimmed.match(/^(?:NOT\b|!(?!=))\s*([\s\S]+)$/i);
-  if (negated) return !evaluateCondition(negated[1], variables);
+  const negated = splitNegation(trimmed);
+  if (negated !== null) return !evaluateCondition(negated, variables);
 
   // Handle comparison operators
   const comparisonResult = tryEvaluateComparison(trimmed, variables);
@@ -127,12 +122,32 @@ function isBalancedParens(str: string): boolean {
 }
 
 /**
- * Try to evaluate logical operators (AND/&&, OR/||) outside parentheses and quotes
+ * The inner text when the whole expression is wrapped in matching parentheses,
+ * otherwise null
  */
-function tryEvaluateLogical(
-  expr: string,
-  variables: VariableMap
-): boolean | null {
+export function unwrapParens(expr: string): string | null {
+  if (expr.startsWith("(") && expr.endsWith(")")) {
+    const inner = expr.slice(1, -1);
+    if (isBalancedParens(inner)) return inner;
+  }
+  return null;
+}
+
+/**
+ * The negated operand of NOT x, NOT (x) or !x, otherwise null
+ */
+export function splitNegation(expr: string): string | null {
+  const negated = expr.match(/^(?:NOT\b|!(?!=))\s*([\s\S]+)$/i);
+  return negated ? negated[1] : null;
+}
+
+/**
+ * Split on the lowest-precedence logical operator (AND/&&, OR/||) outside
+ * parentheses and quotes: the rightmost OR first, then the rightmost AND
+ */
+export function splitLogical(
+  expr: string
+): { op: "or" | "and"; left: string; right: string } | null {
   let depth = 0;
   let quoteChar: string | null = null;
   let orPos = -1;
@@ -176,32 +191,45 @@ function tryEvaluateLogical(
     }
   }
 
-  // OR has lower precedence - split on rightmost OR first
   if (orPos !== -1) {
-    const left = expr.slice(0, orPos).trim();
-    const right = expr.slice(orPos + orLen).trim();
-    return (
-      evaluateCondition(left, variables) || evaluateCondition(right, variables)
-    );
+    return {
+      op: "or",
+      left: expr.slice(0, orPos).trim(),
+      right: expr.slice(orPos + orLen).trim(),
+    };
   }
 
-  // Then split on rightmost AND
   if (andPos !== -1) {
-    const left = expr.slice(0, andPos).trim();
-    const right = expr.slice(andPos + andLen).trim();
-    return (
-      evaluateCondition(left, variables) && evaluateCondition(right, variables)
-    );
+    return {
+      op: "and",
+      left: expr.slice(0, andPos).trim(),
+      right: expr.slice(andPos + andLen).trim(),
+    };
   }
 
   return null;
 }
 
+/**
+ * Try to evaluate logical operators (AND/&&, OR/||) outside parentheses and quotes
+ */
+function tryEvaluateLogical(
+  expr: string,
+  variables: VariableMap
+): boolean | null {
+  const split = splitLogical(expr);
+  if (split === null) return null;
+  const left = evaluateCondition(split.left, variables);
+  return split.op === "or"
+    ? left || evaluateCondition(split.right, variables)
+    : left && evaluateCondition(split.right, variables);
+}
+
 /**
  * True when the expression has whitespace outside quotes, meaning it holds
  * more than one bare word
  */
-function hasBareWhitespace(expr: string): boolean {
+export function hasBareWhitespace(expr: string): boolean {
   let quoteChar: string | null = null;
   for (let i = 0; i < expr.length; i++) {
     const char = expr[i];
@@ -235,12 +263,11 @@ function valuesEqual(left: TemplateValue, right: TemplateValue): boolean {
 }
 
 /**
- * Try to evaluate comparison operators (==, !=, >, <, >=, <=)
+ * Split on the first comparison operator (==, !=, >=, <=, >, <) outside quotes
  */
-function tryEvaluateComparison(
-  expr: string,
-  variables: VariableMap
-): boolean | null {
+export function splitComparison(
+  expr: string
+): { op: string; left: string; right: string } | null {
   const operators = ["==", "!=", ">=", "<=", ">", "<"];
 
   let inQuotes = false;
@@ -253,25 +280,11 @@ function tryEvaluateComparison(
     if (!inQuotes) {
       for (const op of operators) {
         if (expr.startsWith(op, i)) {
-          const leftExpr = expr.slice(0, i).trim();
-          const rightExpr = expr.slice(i + op.length).trim();
-
-          const left = resolveValue(leftExpr, variables);
-          const right = resolveValue(rightExpr, variables);
-
-          switch (op) {
-            case "==":
-              return valuesEqual(left, right);
-
-            case "!=":
-              return !valuesEqual(left, right);
-
-            case ">":
-            case "<":
-            case ">=":
-            case "<=":
-              return evaluateNumericComparison(left, right, op);
-          }
+          return {
+            op,
+            left: expr.slice(0, i).trim(),
+            right: expr.slice(i + op.length).trim(),
+          };
         }
       }
     }
@@ -295,6 +308,29 @@ function tryEvaluateComparison(
   return null;
 }
 
+/**
+ * Try to evaluate comparison operators (==, !=, >, <, >=, <=)
+ */
+function tryEvaluateComparison(
+  expr: string,
+  variables: VariableMap
+): boolean | null {
+  const split = splitComparison(expr);
+  if (split === null) return null;
+
+  const left = resolveValue(split.left, variables);
+  const right = resolveValue(split.right, variables);
+
+  switch (split.op) {
+    case "==":
+      return valuesEqual(left, right);
+    case "!=":
+      return !valuesEqual(left, right);
+    default:
+      return evaluateNumericComparison(left, right, split.op);
+  }
+}
+
 /**
  * Evaluate numeric comparison (>, <, >=, <=)
  */
@@ -330,49 +366,56 @@ function evaluateNumericComparison(
 }
 
 /**
- * Try to evaluate string operators (contains, startsWith, endsWith)
+ * Split on the first string operator (contains, startsWith, endsWith)
  */
-function tryEvaluateStringOp(
-  expr: string,
-  variables: VariableMap
-): boolean | null {
+export function splitStringOp(
+  expr: string
+): { op: string; left: string; right: string } | null {
   const operators = ["contains", "startsWith", "endsWith"];
 
   for (const op of operators) {
     const regex = new RegExp(`(.+?)\\s+${op}\\s+(.+)`, "i");
     const match = expr.match(regex);
-
-    if (match) {
-      const leftValue = resolveValue(match[1].trim(), variables);
-      const rightValue = tryCoerceToString(
-        resolveValue(match[2].trim(), variables)
-      );
-      if (rightValue === null) return false;
-
-      const leftStr = tryCoerceToString(leftValue);
-      if (leftStr === null) return false;
-
-      switch (op) {
-        case "contains":
-          return leftStr.includes(rightValue);
-        case "startsWith":
-          return leftStr.startsWith(rightValue);
-        case "endsWith":
-          return leftStr.endsWith(rightValue);
-      }
-    }
+    if (match) return { op, left: match[1].trim(), right: match[2].trim() };
   }
 
   return null;
 }
 
 /**
- * Try to evaluate type check operators
+ * Try to evaluate string operators (contains, startsWith, endsWith)
  */
-function tryEvaluateTypeCheck(
+function tryEvaluateStringOp(
   expr: string,
   variables: VariableMap
 ): boolean | null {
+  const split = splitStringOp(expr);
+  if (split === null) return null;
+
+  const leftValue = resolveValue(split.left, variables);
+  const rightValue = tryCoerceToString(resolveValue(split.right, variables));
+  if (rightValue === null) return false;
+
+  const leftStr = tryCoerceToString(leftValue);
+  if (leftStr === null) return false;
+
+  switch (split.op) {
+    case "contains":
+      return leftStr.includes(rightValue);
+    case "startsWith":
+      return leftStr.startsWith(rightValue);
+    default:
+      return leftStr.endsWith(rightValue);
+  }
+}
+
+/**
+ * Split a trailing type-check operator (isEmpty, isNotEmpty, isArray,
+ * isNumber, isObject, isBoolean) from its operand
+ */
+export function splitTypeCheck(
+  expr: string
+): { check: string; operand: string } | null {
   const checks = [
     "isEmpty",
     "isNotEmpty",
@@ -385,40 +428,143 @@ function tryEvaluateTypeCheck(
   for (const check of checks) {
     const regex = new RegExp(`(.+?)\\s+${check}$`, "i");
     const match = expr.match(regex);
+    if (match) return { check, operand: match[1].trim() };
+  }
 
-    if (match) {
-      const value = resolveValue(match[1].trim(), variables);
+  return null;
+}
 
-      switch (check) {
-        case "isEmpty": {
-          if (value == null) return true;
-          if (typeof value === "string") return value.trim() === "";
-          if (Array.isArray(value)) return value.length === 0;
-          if (typeof value === "object") return Object.keys(value).length === 0;
-          return false;
-        }
-        case "isNotEmpty": {
-          if (value == null) return false;
-          if (typeof value === "string") return value.trim() !== "";
-          if (Array.isArray(value)) return value.length > 0;
-          if (typeof value === "object") return Object.keys(value).length > 0;
-          return true;
-        }
-        case "isArray":
-          return tryCoerceToArray(value) !== null;
-        case "isNumber":
-          return tryCoerceToNumber(value) !== null;
-        case "isObject":
-          return tryCoerceToObject(value) !== null;
-        case "isBoolean":
-          return tryCoerceToBoolean(value) !== null;
-      }
+/**
+ * Try to evaluate type check operators
+ */
+function tryEvaluateTypeCheck(
+  expr: string,
+  variables: VariableMap
+): boolean | null {
+  const split = splitTypeCheck(expr);
+  if (split === null) return null;
+
+  const value = resolveValue(split.operand, variables);
+
+  switch (split.check) {
+    case "isEmpty": {
+      if (value == null) return true;
+      if (typeof value === "string") return value.trim() === "";
+      if (Array.isArray(value)) return value.length === 0;
+      if (typeof value === "object") return Object.keys(value).length === 0;
+      return false;
+    }
+    case "isNotEmpty": {
+      if (value == null) return false;
+      if (typeof value === "string") return value.trim() !== "";
+      if (Array.isArray(value)) return value.length > 0;
+      if (typeof value === "object") return Object.keys(value).length > 0;
+      return true;
     }
+    case "isArray":
+      return tryCoerceToArray(value) !== null;
+    case "isNumber":
+      return tryCoerceToNumber(value) !== null;
+    case "isObject":
+      return tryCoerceToObject(value) !== null;
+    default:
+      return tryCoerceToBoolean(value) !== null;
+  }
+}
+
+/**
+ * The value of a literal operand (true, false, null, a number or a quoted
+ * string), or null when the operand is not a literal
+ */
+export function parseLiteral(expr: string): { value: TemplateValue } | null {
+  if (expr === "true") return { value: true };
+  if (expr === "false") return { value: false };
+  if (expr === "null") return { value: null };
+
+  if (/^-?\d+(\.\d+)?$/.test(expr)) return { value: Number(expr) };
+
+  const first = expr[0];
+  const last = expr[expr.length - 1];
+  if ((first === `"` && last === `"`) || (first === `'` && last === `'`)) {
+    return { value: expr.substring(1, expr.length - 1) };
   }
 
   return null;
 }
 
+/**
+ * The operand expressions a condition reads, in source order. Mirrors the
+ * structure evaluateCondition walks: grouping, logical operators, negation,
+ * comparisons, string operators and type checks split the text; whatever is
+ * left is an operand (a literal or a variable path).
+ */
+export function conditionOperands(condition: string): string[] {
+  const trimmed = condition.trim();
+
+  const unwrapped = unwrapParens(trimmed);
+  if (unwrapped !== null) return conditionOperands(unwrapped);
+
+  const logical = splitLogical(trimmed);
+  if (logical !== null) {
+    return [
+      ...conditionOperands(logical.left),
+      ...conditionOperands(logical.right),
+    ];
+  }
+
+  const negated = splitNegation(trimmed);
+  if (negated !== null) return conditionOperands(negated);
+
+  const comparison = splitComparison(trimmed);
+  if (comparison !== null) return [comparison.left, comparison.right];
+
+  const stringOp = splitStringOp(trimmed);
+  if (stringOp !== null) return [stringOp.left, stringOp.right];
+
+  const typeCheck = splitTypeCheck(trimmed);
+  if (typeCheck !== null) return [typeCheck.operand];
+
+  return [trimmed];
+}
+
+/**
+ * True when the text is an arithmetic expression rather than a plain path
+ */
+export function isMathExpression(expr: string): boolean {
+  return /[+\-*/%()]/.test(expr);
+}
+
+/**
+ * The variable names in a math expression, using the same name characters
+ * the math tokenizer reads
+ */
+export function mathVariableNames(expr: string): string[] {
+  const names: string[] = [];
+  let i = 0;
+
+  while (i < expr.length) {
+    const char = expr[i];
+
+    if (/\s/.test(char) || ["+", "-", "*", "/", "%", "(", ")"].includes(char)) {
+      i++;
+      continue;
+    }
+
+    let name = "";
+    while (i < expr.length && /[a-zA-Z0-9_@.]/.test(expr[i])) {
+      name += expr[i];
+      i++;
+    }
+    if (name === "") {
+      i++;
+    } else if (!/^[\d.]+$/.test(name)) {
+      names.push(name);
+    }
+  }
+
+  return names;
+}
+
 /**
  * Resolve variable value (supports dot notation)
  */
@@ -428,20 +574,8 @@ function resolveValue(expr: string, variables: VariableMap): TemplateValue {
   // Normalize whitespace everywhere
   expr = expr.trim();
 
-  // Literal booleans
-  if (expr === "true") return true;
-  if (expr === "false") return false;
-  if (expr === "null") return null;
-
-  // Numeric literal
-  if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
-
-  // Robust string-literal detection
-  const first = expr[0];
-  const last = expr[expr.length - 1];
-  if ((first === `"` && last === `"`) || (first === `'` && last === `'`)) {
-    return expr.substring(1, expr.length - 1);
-  }
+  const literal = parseLiteral(expr);
+  if (literal) return literal.value;
 
   // Variable path resolution
   const path = expr.split(".");
diff --git a/core/src/index.ts b/core/src/index.ts
index 73f1ff3..7139e62 100644
--- a/core/src/index.ts
+++ b/core/src/index.ts
@@ -22,8 +22,8 @@ export * from "./expressions";
 // Interpreter
 export * from "./interpreter";
 
-// Utilities
-export * from "./utils";
+// Template analysis
+export * from "./analyze";
 
 // Template resolution
 export { resolveTemplate } from "./resolve";
diff --git a/core/src/utils.ts b/core/src/utils.ts
deleted file mode 100644
index 67a71f1..0000000
--- a/core/src/utils.ts
+++ /dev/null
@@ -1,45 +0,0 @@
-/**
- * Extract all variable names from a template string
- *
- * Finds all instances of:
- * - ${{varName}}
- * - ${{user.name}}
- * - {{IF varName}}
- * - {{FOR items AS item}}
- * - {{CASE status}}
- *
- * Returns unique variable names (root level only)
- */
-export function extractAllVariables(template: string): string[] {
-  const variables = new Set<string>();
-
-  // Match ${{varName}} and ${{user.name}}
-  const varPattern = /\$\{\{([a-zA-Z_@][a-zA-Z0-9_@.]*)/g;
-  let match;
-  while ((match = varPattern.exec(template)) !== null) {
-    const rootVar = match[1].split(".")[0].split("|")[0].split("??")[0].trim();
-    if (rootVar && !rootVar.startsWith("@")) {
-      variables.add(rootVar);
-    }
-  }
-
-  // Match {{IF varName}}, {{CASE varName}}, etc.
-  const controlPattern = /\{\{(IF|CASE|FOR)\s+([a-zA-Z_][a-zA-Z0-9_@.]*)/gi;
-  while ((match = controlPattern.exec(template)) !== null) {
-    const rootVar = match[2].split(".")[0].split(" ")[0].trim();
-    if (rootVar && !rootVar.startsWith("@")) {
-      variables.add(rootVar);
-    }
-  }
-
-  // Match ternary conditions: {{varName ? ... : ...}}
-  const ternaryPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_@.]*)\s*\?/g;
-  while ((match = ternaryPattern.exec(template)) !== null) {
-    const rootVar = match[1].split(".")[0].trim();
-    if (rootVar && !rootVar.startsWith("@")) {
-      variables.add(rootVar);
-    }
-  }
-
-  return Array.from(variables).sort();
-}
diff --git a/n8n/TemplateResolver.node.ts b/n8n/TemplateResolver.node.ts
index 057fd6c..99e39a1 100644
--- a/n8n/TemplateResolver.node.ts
+++ b/n8n/TemplateResolver.node.ts
@@ -1,4 +1,4 @@
-import { VariableMap, extractAllVariables, resolveTemplate } from "../core/src";
+import { VariableMap, analyze, resolveTemplate } from "../core/src";
 import {
   IExecuteFunctions,
   INodeExecutionData,
@@ -170,7 +170,13 @@ By \${{author}}
         ) as string;
 
         // Extract variables from template
-        const detectedVariables = extractAllVariables(template);
+        const analysis = analyze(template);
+        const detectedVariables = analysis.variables
+          .map((v) => v.name)
+          .sort();
+        const requiredVariables = new Set(
+          analysis.variables.filter((v) => !v.optional).map((v) => v.name)
+        );
 
         // Build variable map
         const variables: VariableMap = new Map();
@@ -188,10 +194,14 @@ By \${{author}}
           (v) => !variables.has(v)
         );
 
-        if (strictMode && missingVariables.length > 0) {
+        const missingRequired = missingVariables.filter((v) =>
+          requiredVariables.has(v)
+        );
+
+        if (strictMode && missingRequired.length > 0) {
           throw new NodeOperationError(
             this.getNode(),
-            `Template requires unmapped variables: ${missingVariables.join(", ")}. ` +
+            `Template requires unmapped variables: ${missingRequired.join(", ")}. ` +
               `Add mappings or disable "Strict Mode". ` +
               `Detected variables: ${detectedVariables.join(", ")}`,
             { itemIndex }
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
