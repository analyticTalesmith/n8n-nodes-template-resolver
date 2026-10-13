---
type: review-packet
card: 0008-conditions-evaluate-negation-boolean-wor
tier: product
built_at: 2026-10-13T21:48:29.901Z
base: e7069db9c344f65385b3956ece624de0aad10268
head: 413e6517a20dca1987b3aafd9cbdc7e64e45bc15
frozen: true
brief_sha256: 7dedb657d21c61928dd4629231e00fdc56990c8aac2f20d7a9e0eba9e275f28a
manifest_sha256: bb5f51df59adf3c68cf9295a7323c255a9b89074d503ffa7e04c5814e5e0c32d
criteria_sha256: c0cc789f45fa6dbfdf6e09dd78d7bcd7dc264c6b62ea78150a97b01c10b42f86
scope_sha256: 3925f6c632e9e67f8fe4a4ac91840069ef059aa62f032cfe1e60a6e5fd0324a7
diff_sha256: 1dc9d18bf549a264b3ec6671006bde60d5e90e5c1b888ca12c0a4e98915de1cf
omitted_paths: 8
criteria_count: 6
must_not_count: 3
---

# Review packet: 0008-conditions-evaluate-negation-boolean-wor

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: Conditions must evaluate what they say

### Criteria

- c1 (verify: test): co-01: NOT a, !a, and NOT (a) negate the variable
- c2 (verify: test): co-02: a && b, a || b, a and b, a or b evaluate as AND and OR
- c3 (verify: test): co-03: AND or OR inside a quoted string literal does not split the condition
- c4 (verify: test): co-04: an unquoted contains, startsWith or endsWith right-hand side is read as a variable
- c5 (verify: test): co-05: == and != compare numerically when both sides are numeric
- c6 (verify: test): co-06: an unknown word next to an operator is an error, not false

### Must not

- m1: change behavior outside the named defects
- m2: edit or delete any existing test
- m3: add a runtime dependency

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: Conditions must evaluate what they say
Must not:
- change behavior outside the named defects
- edit or delete any existing test
- add a runtime dependency

## Questions

goal-critical: does each frozen regression test fail before the fix for the stated reason and pass after?
goal-critical: do all pre-existing tests still pass?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/modules/template-resolver.md
```

### spec.md as of base e7069db

```
# Spec

## Acceptance criteria

- co-01: NOT a, !a, and NOT (a) negate the variable
- co-02: a && b, a || b, a and b, a or b evaluate as AND and OR
- co-03: AND or OR inside a quoted string literal does not split the condition
- co-04: an unquoted contains, startsWith or endsWith right-hand side is read as a variable
- co-05: == and != compare numerically when both sides are numeric
- co-06: an unknown word next to an operator is an error, not false
```

### card.md as of base e7069db

```
# Conditions evaluate negation, boolean words and numeric equality

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Conditions must evaluate what they say. (1) Negation and boolean forms `NOT a`, `!a`, `a && b`, `a || b` and case-insensitive `and`, `or`, `not` must work like NOT(a), AND and OR, and AND or OR inside a quoted string must not split the condition. (2) The right-hand side of contains, startsWith and endsWith, when unquoted, must be evaluated as a variable expression. (3) `==` and `!=` must compare numerically when both sides are numeric (so "5.0" equals 5), and a missing variable must equal null. An unknown word next to an operator must be an error, not silently false.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `co-01` NOT a, !a, and NOT (a) negate the variable
- `contract` `co-02` a && b, a || b, a and b, a or b evaluate as AND and OR
- `contract` `co-03` AND or OR inside a quoted string literal does not split the condition
- `contract` `co-04` an unquoted contains, startsWith or endsWith right-hand side is read as a variable
- `contract` `co-05` == and != compare numerically when both sides are numeric
- `contract` `co-06` an unknown word next to an operator is an error, not false


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change behavior outside the named defects
- edit or delete any existing test
- add a runtime dependency


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

none: no public interface changes.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `nodes/TemplateResolver/expressions.ts` | edit | template-resolver |

Files scope: `nodes/TemplateResolver/expressions.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: none
- remove: none
- edit: `nodes/TemplateResolver/expressions.ts`
- files_scope: `nodes/TemplateResolver/expressions.ts`

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

`extractAllVariables` collects roots from `${{name...}}`, from `{{IF|CASE|FOR name}}` (case-insensitive tag word) and from `{{name ?` patterns, drops names starting with `@`, and returns them unique and sorted [src: nodes/TemplateResolver/utils.ts:16-44]. It does not exclude the `AS` name of a `FOR` tag, so `${{item}}` inside a loop adds `item` to the detected set [src: nodes/TemplateResolver/utils.ts:17-23]. In the node, an unmapped detected name therefore counts as missing, and in strict mode triggers the error in step 5 before resolution [src: nodes/TemplateResolver/TemplateResolver.node.ts:217-229] [open: Q2]

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
- Q2. In strict mode, `${{item}}` for a `FOR ... AS item` name appears to be counted as an unmapped variable by `extractAllVariables` and the node's precheck, which would raise the "unmapped variables" error before the loop runs. Whether tests or users exercise this, and what is intended, was not checked (tests not read). Looked at: `utils.ts:16-24`, `TemplateResolver.node.ts:216-229`.
- Q3. The lexer comment documents a `{{cond ? "a" : "b"}}` ternary and `utils.ts` detects its condition name, but no lexer or parser path produces it; a tag of that shape reaches the unknown-tag error. Whether the ternary is intended to work is not stated in the code.
- Q4. The `FOR` loop clears the entire loop context at its end (`interpreter.ts:231`), so a nested inner loop would remove the outer item and index values for the rest of the outer iteration. Not run; effect on real templates unconfirmed.
- Q5. `isTruthy` comment lists `null`, `undefined` and `none` strings as falsy but the code treats them as truthy. Which is intended is unknown.
- Q7. `MissingVariableError` suggests enabling "Lenient Mode", while the node parameter is named "Strict Mode". Whether another name for the setting exists is unknown.
- Q8. The error-message prefix is double-encoded text in the source; whether tests or consumers depend on the exact bytes is unknown (tests not read). Several comments in `lexer.ts`, `parser.ts`, `filters.ts` and `coercion.ts` show the same encoding damage for arrows.
- Q9. The interpreter prints swallowed math errors with `console.log`; whether that output is intended for n8n execution logs is unknown. Looked at: `interpreter.ts:111-118`.

## Answered

- Q6. A leading negative number such as `-3 + 1` ends in `MissingVariableError` for the key `-3 + 1` in strict mode and renders empty in lenient mode: the math attempt fails ("Invalid math expression"), the error is swallowed, and normal lookup finds no such key. Answered from source by research:lead (`interpreter.ts:110-119`, `interpreter.ts:468-477`, `expressions.ts:564-566`).
```

## Frozen tests (read-only)

These test files were committed before the work began, at base e7069db. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/regressions/condition-operators.test.ts (frozen)

```
import { resolveTemplate } from "../../nodes/TemplateResolver/TemplateResolver.node";
import { VariableMap, TemplateValue } from "../../nodes/TemplateResolver/types";

function vars(entries: [string, TemplateValue][]): VariableMap {
  return new Map(entries);
}

/** Render `{{IF cond}}Y{{ELSE}}N{{END_IF}}`; a thrown error is captured, not escaped. */
function run(
  cond: string,
  entries: [string, TemplateValue][]
): { out: string | null; error: string | null } {
  try {
    return {
      out: resolveTemplate(
        `{{IF ${cond}}}Y{{ELSE}}N{{END_IF}}`,
        vars(entries),
        undefined
      ),
      error: null,
    };
  } catch (e) {
    return { out: null, error: e instanceof Error ? e.message : String(e) };
  }
}

function expectRender(
  cond: string,
  entries: [string, TemplateValue][],
  expected: "Y" | "N"
): void {
  expect(run(cond, entries)).toEqual({ out: expected, error: null });
}

describe("condition operators", () => {
  it("co-01: NOT a negates the variable", () => {
    expectRender("NOT a", [["a", false]], "Y");
    expectRender("NOT a", [["a", "false"]], "Y");
    expectRender("NOT a", [["a", true]], "N");
    expectRender("NOT a", [["a", "true"]], "N");
  });

  it("co-01: !a negates the variable", () => {
    expectRender("!a", [["a", false]], "Y");
    expectRender("!a", [["a", "false"]], "Y");
    expectRender("!a", [["a", true]], "N");
    expectRender("!a", [["a", "true"]], "N");
  });

  it("co-01: NOT (a) negates the variable", () => {
    expectRender("NOT (a)", [["a", false]], "Y");
    expectRender("NOT (a)", [["a", "false"]], "Y");
    expectRender("NOT (a)", [["a", true]], "N");
  });

  it("co-02: && and 'and' (any case) evaluate as AND", () => {
    for (const op of ["&&", "and", "AND", "And"]) {
      expectRender(`a ${op} b`, [["a", true], ["b", true]], "Y");
      expectRender(`a ${op} b`, [["a", true], ["b", false]], "N");
      expectRender(`a ${op} b`, [["a", false], ["b", true]], "N");
      expectRender(`a ${op} b`, [["a", false], ["b", false]], "N");
    }
  });

  it("co-02: || and 'or' (any case) evaluate as OR", () => {
    for (const op of ["||", "or", "OR", "Or"]) {
      expectRender(`a ${op} b`, [["a", true], ["b", true]], "Y");
      expectRender(`a ${op} b`, [["a", true], ["b", false]], "Y");
      expectRender(`a ${op} b`, [["a", false], ["b", true]], "Y");
      expectRender(`a ${op} b`, [["a", false], ["b", false]], "N");
    }
  });

  it("co-02: lowercase not, and, or combine with AND binding tighter than OR", () => {
    const e: [string, TemplateValue][] = [
      ["a", true],
      ["b", false],
      ["c", true],
    ];
    expectRender("not b and c", e, "Y");
    expectRender("a and not c", e, "N");
    expectRender("b and c or a", e, "Y");
    expectRender("b && c || b", e, "N");
  });

  it("co-03: AND inside a quoted string does not split the condition", () => {
    expectRender('a == "x AND y"', [["a", "x AND y"]], "Y");
    expectRender('a == "x AND y"', [["a", "x"]], "N");
    expectRender("a == 'x AND y'", [["a", "x AND y"]], "Y");
  });

  it("co-03: OR inside a quoted string does not split the condition", () => {
    expectRender('a == "x OR y"', [["a", "x OR y"]], "Y");
    expectRender('a == "x OR y"', [["a", "y"]], "N");
    expectRender('a contains "x OR y"', [["a", "say x OR y now"]], "Y");
  });

  it("co-03: a real AND outside the quotes still splits", () => {
    expectRender(
      'a == "x AND y" AND b',
      [["a", "x AND y"], ["b", true]],
      "Y"
    );
    expectRender(
      'a == "x AND y" AND b',
      [["a", "x AND y"], ["b", false]],
      "N"
    );
  });

  it("co-04: unquoted contains right-hand side is a variable", () => {
    expectRender("s contains t", [["s", "hello world"], ["t", "world"]], "Y");
    expectRender("s contains t", [["s", "hello world"], ["t", "xyz"]], "N");
  });

  it("co-04: unquoted startsWith right-hand side is a variable", () => {
    expectRender("s startsWith t", [["s", "hello world"], ["t", "hello"]], "Y");
    expectRender("s startsWith t", [["s", "hello world"], ["t", "world"]], "N");
  });

  it("co-04: unquoted endsWith right-hand side is a variable", () => {
    expectRender("s endsWith t", [["s", "hello world"], ["t", "world"]], "Y");
    expectRender("s endsWith t", [["s", "hello world"], ["t", "hello"]], "N");
  });

  it("co-05: == compares numerically when both sides are numeric", () => {
    expectRender("n == 5", [["n", "5.0"]], "Y");
    expectRender("n == 5", [["n", 5]], "Y");
    expectRender("n == 5.0", [["n", "5"]], "Y");
    expectRender("n == 6", [["n", "5.0"]], "N");
  });

  it("co-05: != compares numerically when both sides are numeric", () => {
    expectRender("n != 5", [["n", "5.0"]], "N");
    expectRender("n != 5", [["n", 5]], "N");
    expectRender("n != 6", [["n", "5.0"]], "Y");
  });

  it("co-05: a missing variable equals null", () => {
    expectRender("missing == null", [["other", "x"]], "Y");
    expectRender("missing != null", [["other", "x"]], "N");
    expectRender("other == null", [["other", "x"]], "N");
    expectRender("other != null", [["other", "x"]], "Y");
  });

  it("co-06: an unknown word between operands is an error, not false", () => {
    const r = run("a xor b", [["a", true], ["b", false]]);
    expect(r.out).toBeNull();
    expect(r.error).not.toBeNull();
  });

  it("co-06: a misspelled operator is an error, not false", () => {
    const r = run("a contain b", [["a", "hello"], ["b", "ell"]]);
    expect(r.out).toBeNull();
    expect(r.error).not.toBeNull();
  });

  it("guard-existing-forms: NOT(a), AND, OR and quoted contains keep working", () => {
    expectRender("NOT(a)", [["a", false]], "Y");
    expectRender("a AND b", [["a", true], ["b", true]], "Y");
    expectRender("a OR b", [["a", false], ["b", true]], "Y");
    expectRender('s contains "world"', [["s", "hello world"]], "Y");
    expectRender("s startsWith 'hello'", [["s", "hello world"]], "Y");
  });

  it("guard-comparisons: string equality, != and ordering are unchanged", () => {
    expectRender('s == "abc"', [["s", "abc"]], "Y");
    expectRender('s == "abd"', [["s", "abc"]], "N");
    expectRender('s != "abd"', [["s", "abc"]], "Y");
    expectRender("n > 3", [["n", "5"]], "Y");
    expectRender("a != b", [["a", "x"], ["b", "y"]], "Y");
  });
});
```

## 4. Diff

8 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/nodes/TemplateResolver/expressions.ts b/nodes/TemplateResolver/expressions.ts
index 7970d6a..69def79 100644
--- a/nodes/TemplateResolver/expressions.ts
+++ b/nodes/TemplateResolver/expressions.ts
@@ -60,7 +60,7 @@ export function isTruthy(value: any): boolean {
  * - Comparisons: ==, !=, >, <, >=, <=
  * - String ops: contains, startsWith, endsWith
  * - Type checks: isEmpty, isNotEmpty, isArray, isNumber, isObject, isBoolean
- * - Logical: AND, OR, NOT()
+ * - Logical: AND, OR, NOT (also &&, ||, !, case-insensitive)
  * - Parentheses for grouping
  */
 export function evaluateCondition(
@@ -69,14 +69,6 @@ export function evaluateCondition(
 ): boolean {
   const trimmed = condition.trim();
 
-  // Handle NOT() wrapper - verify the closing paren matches NOT(
-  if (trimmed.startsWith("NOT(") && trimmed.endsWith(")")) {
-    const inner = trimmed.slice(4, -1);
-    if (isBalancedParens(inner)) {
-      return !evaluateCondition(inner, variables);
-    }
-  }
-
   // Handle parentheses for grouping - only if they're matching outer parens
   if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
     const inner = trimmed.slice(1, -1);
@@ -90,6 +82,10 @@ export function evaluateCondition(
   const logicalResult = tryEvaluateLogical(trimmed, variables);
   if (logicalResult !== null) return logicalResult;
 
+  // Handle negation: NOT x, NOT (x), !x
+  const negated = trimmed.match(/^(?:NOT\b|!(?!=))\s*([\s\S]+)$/i);
+  if (negated) return !evaluateCondition(negated[1], variables);
+
   // Handle comparison operators
   const comparisonResult = tryEvaluateComparison(trimmed, variables);
   if (comparisonResult !== null) return comparisonResult;
@@ -102,6 +98,15 @@ export function evaluateCondition(
   const typeResult = tryEvaluateTypeCheck(trimmed, variables);
   if (typeResult !== null) return typeResult;
 
+  if (!variables.has(trimmed) && hasBareWhitespace(trimmed)) {
+    throw new TypeError(
+      `Unrecognized condition: ${trimmed}`,
+      1,
+      1,
+      "Use a supported operator: ==, !=, >, <, >=, <=, contains, startsWith, endsWith, AND, OR, NOT"
+    );
+  }
+
   // Simple truthiness check
   const value = resolveValue(trimmed, variables);
   return isTruthy(value);
@@ -121,36 +126,50 @@ function isBalancedParens(str: string): boolean {
 }
 
 /**
- * Try to evaluate logical operators (AND, OR)
- */
-/**
- * Try to evaluate logical operators (AND, OR)
+ * Try to evaluate logical operators (AND/&&, OR/||) outside parentheses and quotes
  */
 function tryEvaluateLogical(
   expr: string,
   variables: VariableMap
 ): boolean | null {
-  // Find AND/OR not inside parentheses
   let depth = 0;
+  let quoteChar: string | null = null;
   let orPos = -1;
+  let orLen = 0;
   let andPos = -1;
+  let andLen = 0;
 
-  for (let i = 0; i < expr.length - 3; i++) {
-    // -3 to allow for " OR " or "AND"
-    if (expr[i] === "(") depth++;
-    if (expr[i] === ")") depth--;
+  for (let i = 0; i < expr.length; i++) {
+    const char = expr[i];
 
-    if (depth === 0) {
-      // Check for OR (lower precedence, evaluate last)
-      if (expr.slice(i, i + 4) === " OR ") {
-        orPos = i;
-        // Don't break - keep looking for rightmost OR
-      }
-      // Check for AND (higher precedence)
-      if (expr.slice(i, i + 5) === " AND ") {
-        if (orPos === -1) {
-          // Only record AND if no OR found yet
+    if (quoteChar !== null) {
+      if (char === quoteChar && expr[i - 1] !== "\\") quoteChar = null;
+      continue;
+    }
+    if (char === '"' || char === "'") {
+      quoteChar = char;
+      continue;
+    }
+    if (char === "(") depth++;
+    if (char === ")") depth--;
+    if (depth !== 0) continue;
+
+    if (expr.startsWith("||", i)) {
+      orPos = i;
+      orLen = 2;
+    } else if (expr.startsWith("&&", i)) {
+      andPos = i;
+      andLen = 2;
+    } else if (/\s/.test(char)) {
+      const word = expr.slice(i).match(/^\s+(and|or)\s/i);
+      if (word) {
+        const len = word[0].length - 1;
+        if (word[1].toLowerCase() === "or") {
+          orPos = i;
+          orLen = len;
+        } else {
           andPos = i;
+          andLen = len;
         }
       }
     }
@@ -159,7 +178,7 @@ function tryEvaluateLogical(
   // OR has lower precedence - split on rightmost OR first
   if (orPos !== -1) {
     const left = expr.slice(0, orPos).trim();
-    const right = expr.slice(orPos + 4).trim();
+    const right = expr.slice(orPos + orLen).trim();
     return (
       evaluateCondition(left, variables) || evaluateCondition(right, variables)
     );
@@ -168,7 +187,7 @@ function tryEvaluateLogical(
   // Then split on rightmost AND
   if (andPos !== -1) {
     const left = expr.slice(0, andPos).trim();
-    const right = expr.slice(andPos + 5).trim();
+    const right = expr.slice(andPos + andLen).trim();
     return (
       evaluateCondition(left, variables) && evaluateCondition(right, variables)
     );
@@ -176,6 +195,44 @@ function tryEvaluateLogical(
 
   return null;
 }
+
+/**
+ * True when the expression has whitespace outside quotes, meaning it holds
+ * more than one bare word
+ */
+function hasBareWhitespace(expr: string): boolean {
+  let quoteChar: string | null = null;
+  for (let i = 0; i < expr.length; i++) {
+    const char = expr[i];
+    if (quoteChar !== null) {
+      if (char === quoteChar && expr[i - 1] !== "\\") quoteChar = null;
+    } else if (char === '"' || char === "'") {
+      quoteChar = char;
+    } else if (/\s/.test(char)) {
+      return true;
+    }
+  }
+  return false;
+}
+
+/**
+ * Numeric value of a number or numeric string, otherwise null
+ */
+function numericOf(value: TemplateValue): number | null {
+  return typeof value === "number" || typeof value === "string"
+    ? tryCoerceToNumber(value)
+    : null;
+}
+
+function valuesEqual(left: TemplateValue, right: TemplateValue): boolean {
+  const l = left === undefined ? null : left;
+  const r = right === undefined ? null : right;
+  const leftNum = numericOf(l);
+  const rightNum = numericOf(r);
+  if (leftNum !== null && rightNum !== null) return leftNum === rightNum;
+  return String(l) == String(r);
+}
+
 /**
  * Try to evaluate comparison operators (==, !=, >, <, >=, <=)
  */
@@ -203,10 +260,10 @@ function tryEvaluateComparison(
 
           switch (op) {
             case "==":
-              return String(left) == String(right);
+              return valuesEqual(left, right);
 
             case "!=":
-              return String(left) != String(right);
+              return !valuesEqual(left, right);
 
             case ">":
             case "<":
@@ -286,7 +343,10 @@ function tryEvaluateStringOp(
 
     if (match) {
       const leftValue = resolveValue(match[1].trim(), variables);
-      const rightValue = match[2].trim().replace(/^["']|["']$/g, "");
+      const rightValue = tryCoerceToString(
+        resolveValue(match[2].trim(), variables)
+      );
+      if (rightValue === null) return false;
 
       const leftStr = tryCoerceToString(leftValue);
       if (leftStr === null) return false;
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
