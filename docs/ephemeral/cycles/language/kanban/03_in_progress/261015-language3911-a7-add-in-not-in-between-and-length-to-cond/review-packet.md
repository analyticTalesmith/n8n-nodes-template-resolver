---
type: review-packet
card: 261015-language3911-a7-add-in-not-in-between-and-length-to-cond
tier: product
built_at: 2026-10-15T04:43:01.353Z
base: 65cebdfba62585e9d114f2078d66d3672376b259
head: 8259664d71be4af8d7c4405e8b62d1e16e230ea0
read_at: 8259664d71be4af8d7c4405e8b62d1e16e230ea0
frozen: true
brief_sha256: 0cf49156b3c5bf8fe2557f8053216822bb2fdfead74797d4c7b661034508ed0a
manifest_sha256: 8504e5345febe308d85b583fb65ec595a0921f326bcc828246709676ea220251
criteria_sha256: 0a4d4fcec9da8aa3b6a79b1f945b3b093276262a9b8c2cca9a6678127640a46b
scope_sha256: fb2a98579659e844a34ecc78e8dc4fa2657bdc492cd8775ea1f7e170edf475e5
diff_sha256: 4092e88afa835395f9f2d78be9655867e66a73485994426b108af56e27b88511
omitted_paths: 7
criteria_count: 6
must_not_count: 4
---

# Review packet: 261015-language3911-a7-add-in-not-in-between-and-length-to-cond

Manifest amended after the freeze at 2026-10-15T04:42:12.607Z by lead: analyze.ts needed no change: conditionOperands is shared and lives in expressions.ts (edit -core/src/analyze.ts)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: conditions test membership, ranges and sizes with `in`, `not in`, `between [a, b]` and `.length`; equality no longer coerces a quoted literal to a number; an unrecognized word next to an operator is an error in every mode. Conditions behave the same in render and resolveTemplate.

### Criteria

- c1 (verify: test): op-in: x in ["a","b"], x in list_var and x in "text" (substring) and the not in forms evaluate as written, with a located type-error for an operand that cannot be tested
- c2 (verify: test): op-between: x between [1, 10] is inclusive at both ends; a non-numeric operand is a type-error located at the condition
- c3 (verify: test): op-length: .length works on arrays and strings in conditions and in output; an object key named length wins over the built-in
- c4 (verify: test): op-equality: a side written as a quoted literal compares as text (z == "01234" is false for 1234); an unquoted number on the right of contains keeps its written text
- c5 (verify: test): op-unknown: an unrecognized word next to an operator is an error in every mode (ADR 0003), not only in strict mode
- c6 (verify: test): op-spec: spec() and analyze list the new operators, and analyze records the variables read by in, between and length

### Must not

- m1: change any existing test expectation
- m2: add a runtime dependency
- m3: evaluate template text as code or compile a template-supplied regular expression
- m4: let an unknown name or bad parameter pass in lenient mode (ADR 0003)

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: conditions test membership, ranges and sizes with `in`, `not in`, `between [a, b]` and `.length`; equality no longer coerces a quoted literal to a number; an unrecognized word next to an operator is an error in every mode. Conditions behave the same in render and resolveTemplate.
Must not:
- change any existing test expectation
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Questions

goal-critical: do `x in [..]`, `x in list_var`, `x in "text"` and their `not in` forms give the specified result for numbers vs text, missing and null left sides, empty lists and strings, and a type-error (located at the condition, never a raw exception) for an operand that cannot be tested, including cyclic objects and BigInt?
goal-critical: is `between` inclusive at both ends and a type-error for any non-numeric operand or a list that is not exactly two items?
goal-critical: does `.length` give the element count of an array and the UTF-16 length of a string in conditions, output, math and CASE, let an own key named `length` (even null) win, and leave missing data null?
goal-critical: does a quoted literal side compare as text in `==`, `!=` and `in`, while unquoted comparisons and the unquoted number right of `contains` keep their written text?
goal-critical: is every unrecognized word or extra word next to an operator an error in strict and lenient mode, in render and resolveTemplate, and does analyze agree?
goal-critical: do the new operators combine with AND, OR, NOT and parentheses without a precedence surprise, and do operator words inside quotes or list literals never split?
polish: do evaluateCondition and conditionOperands share the same split helpers, and do both path walkers share one length helper rather than copies?

## Rubric

- each criterion is met by the diff and its test
- the card scope is respected (expressions, interpreter, analyze, spec and the operators test file)
- unknown names, operators and filters are still errors in every mode

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
```

### spec.md as of base 65cebdfba625, read at 8259664d71be

```
# Spec

## Acceptance criteria

- op-in: `x in ["a","b"]`, `x in list_var` and `x in "text"` (substring) and the `not in` forms evaluate as written, with a located `type-error` for an operand that cannot be tested
- op-between: `x between [1, 10]` is inclusive at both ends; a non-numeric operand is a `type-error` located at the condition
- op-length: `.length` works on arrays and strings in conditions and in output; an object key named `length` wins over the built-in
- op-equality: a side written as a quoted literal compares as text (`z == "01234"` is false for 1234); an unquoted number on the right of `contains` keeps its written text
- op-unknown: an unrecognized word next to an operator is an error in every mode (ADR 0003), not only in strict mode
- op-spec: `spec()` and `analyze` list the new operators, and `analyze` records the variables read by `in`, `between` and `length`

## Behavior settled

Same in `render` and `resolveTemplate`; strict mode governs missing data only, and conditions never raise a missing-variable error (a missing name reads as null). Errors are `type-error`, located at the IF, ELSEIF, LIST_ITEM or ternary node (never 1:1 in the output), and never a raw JavaScript exception (cyclic values and BigInt included: do not call `JSON.stringify` on an operand in a message).

**Operand.** A literal (`true`, `false`, `null`, a number, a quoted string) or a variable path. An operand that is not a literal, is not itself a variable key and has whitespace outside quotes (`b c`) is a `type-error` "Unrecognized condition" in every mode, for every operator's operands (comparison, string, type-check, `in`, `between`, list items); `analyze` already reports the same text as `unrecognized-condition`. An unknown operator word (`a like b`, `a matches /x/`, `a equals b`) ends in the same error; no regular expression written in a template is ever compiled.

**in / not in.** Case-insensitive operator words, written with whitespace on both sides. Right side is one of: a list literal `[a, "b", 3]` (items are operands separated by commas outside quotes; `[]` is the empty list; an empty item, a nested `[`, or a missing `]` is a `type-error`), a variable path, or a quoted text. Bracket and comma splitting respects quotes (`x in ["a,b", "c]"]`) and escaped quotes the way the logical split does.
- Right side an array (literal or variable): true when some element equals the left side by the `==` rule below (numeric when neither side is quoted and both are numeric, else text). Array or object elements and BigInt elements never match.
- Right side a string (quoted or from a variable): substring test, case-sensitive, the same result as `"text" contains x` (an empty left side is contained).
- Left side missing or null: false for `in`, true for `not in` (missing data, no error). `not in` is exactly the negation of `in`.
- `type-error`: the right side is a number, boolean or non-array object; the left side is an array, an object (cyclic or not) or a BigInt.
- A list variable that is a text such as `"a,b"` is a string, tested as substring (no coercion to a list).

**between.** `x between [lo, hi]`, word case-insensitive, exactly two operands (variable paths or literals); each of x, lo, hi goes through the same number coercion as `>` (numbers and numeric text). Inclusive at both ends; lo greater than hi is simply false (no swap). Any operand that is not numeric (including null or missing x, as with `>`), a list with other than two items, or a right side that is not a list literal is a `type-error` located at the condition.

**Precedence.** `in`, `not in` and `between` split at the same tier as `contains`: after AND/OR, NOT and the comparison operators, before type checks. They are found outside quotes, brackets and parentheses. NOT, AND and OR combine with them with no new rule: `NOT x in [..]` is `NOT (x in [..])`, `a in [..] AND b`, `a OR b not in [..]`, `(a in [..]) AND (b between [1,2])`. Chaining two operators (`a in b == c`, `a in b in c`, `a between [1,2] contains x`) is an Unrecognized condition error, never a silent result. The operator words inside a quoted string never split (`title contains "in the end"`, `x == "a between b"`).

**.length.** A path segment named `length`, in conditions (`items.length > 2`), in output (`${{items.length}}`, in math, a CASE subject, a ternary value) and after any segment (`user.tags.length`, `items.0.length`). Rules, applied in order at the segment: an array gives its element count; a string gives its UTF-16 code unit count (the same unit as the `length` filter, so one emoji is 2), unless the string is a JSON object with its own key `length`, which then wins; an object with an own key `length` (any value, null and undefined included) returns that key; any other value (number, boolean, null, an object without the key) behaves as before (null). Missing data stays null (no zero). `length` as the root name is an ordinary variable.

**Equality (op-equality).** `==` and `!=`: when either side is written as a quoted literal both sides compare as text (`String(left) == String(right)`); otherwise the existing rule (numeric when both read as numbers, else text) is unchanged. `contains`, `startsWith`, `endsWith`: the right side written as an unquoted number keeps its written text (`x contains 1.50` looks for `1.50`, `007` for `007`), no round trip through a number; quoted text and variables as before. The same quoted-versus-unquoted rule decides the match for `in` list items. Existing outputs for unquoted comparisons do not change.

**Spec and analyze.** `spec().operators` gains `in`, `not in`, `between`, `.length` (existing entries keep their order and spelling; each name appears once). `analyze` lists as read variables the left operand, the right operand or every list item that is a variable path, the bounds and left of `between`, and the root of a `.length` path (path text is recorded as written, e.g. `items.length`); literals are not variables; loop names and `@` names stay excluded. A malformed `in` or `between` condition gives the `unrecognized-condition` diagnostic at the condition, as `validate` shows it.

## Interface

- `core/src/expressions.ts`: `splitMembership` and `splitBetween` (exported, like `splitStringOp`), used by both `evaluateCondition` and `conditionOperands` so the evaluator and `analyze` read the same operands; one length helper used by both path walkers (`resolveValue` here and `resolveNestedPath` in `interpreter.ts`); `parseLiteral` may carry whether the operand was quoted and its written text. No other public name changes.
- `spec.ts`: four entries added to the operator list. `analyze.ts` changes only if `conditionOperands` needs it.
- Out of scope: lexer and parser (the conditions must already reach `evaluateCondition` intact; report if one does not), filters, `matches`.
```

### card.md as of base 65cebdfba625, read at 8259664d71be

```
# Add in, not in, between and length to conditions

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Conditions can test membership, ranges and sizes with in, not in, between [a, b] and .length, and equality no longer coerces a quoted literal to a number.

## Must-haves

- `contract` `op-in` x in ["a","b"], x in list_var and x in "text" (substring) and the not in forms evaluate as written, with a located type-error for an operand that cannot be tested
- `contract` `op-between` x between [1, 10] is inclusive at both ends; a non-numeric operand is a type-error located at the condition
- `contract` `op-length` .length works on arrays and strings in conditions and in output; an object key named length wins over the built-in
- `contract` `op-equality` a side written as a quoted literal compares as text (z == "01234" is false for 1234); an unquoted number on the right of contains keeps its written text
- `contract` `op-unknown` an unrecognized word next to an operator is an error in every mode (ADR 0003), not only in strict mode
- `contract` `op-spec` spec() and analyze list the new operators, and analyze records the variables read by in, between and length

## Acceptance criteria

- op-in: x in ["a","b"], x in list_var and x in "text" (substring) and the not in forms evaluate as written, with a located type-error for an operand that cannot be tested
- op-between: x between [1, 10] is inclusive at both ends; a non-numeric operand is a type-error located at the condition
- op-length: .length works on arrays and strings in conditions and in output; an object key named length wins over the built-in
- op-equality: a side written as a quoted literal compares as text (z == "01234" is false for 1234); an unquoted number on the right of contains keeps its written text
- op-unknown: an unrecognized word next to an operator is an error in every mode (ADR 0003), not only in strict mode
- op-spec: spec() and analyze list the new operators, and analyze records the variables read by in, between and length

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

spec().operators gains in, not in, between, .length. No change to the existing operator spellings. Each precedence pairing of the new operators with AND, OR and NOT has a table row.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/language/operators.test.ts` | add | template-resolver |
| `core/src/expressions.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/spec.ts`, `tests/language/operators.test.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: `tests/language/operators.test.ts`
- remove: none
- edit: `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/spec.ts`
- files_scope: `core/src/analyze.ts`, `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/spec.ts`, `tests/language/operators.test.ts`

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
- A diagnostic is `{ severity, code, message, line, column, suggestion? }`. Every `TemplateError` carries a `code` (`syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`, `limit-nodes`) and the 1-based line and column of the node that failed: runtime errors are relocated to the evaluating node, and plain `Error`s from filters or math become `type-error` there. `render` adds `invalid-input` for data that is not an object.
- `Limits { maxIterations, maxOutputChars, maxDepth, maxNodes }` with `DEFAULT_LIMITS` 10000 (total FOR iterations across the render), 1000000 (output characters), 32 (block nesting, enforced by the parser) and 20000 (total AST nodes, counted by the parser: every node except the program root, parent before children, at its opening token; node `maxNodes + 1` is a `limit-nodes` error located there, in `render`, `validate`, `analyze` and `resolveTemplate`). `analyze` and `validate` apply the caller's `maxNodes` and `maxDepth`; with no `maxDepth` given, `analyze` does not apply 32 and only bounds nesting at 256 blocks (`limit-depth`). ELSEIF chains are parsed, run and analyzed in loops, so a long chain ends in a result or `limit-nodes`, never a stack overflow; `withDefaultLimits` fills omitted ones. `resolveTemplate` accepts `limits` too and keeps throwing.
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
- Variable: if the joined path text contains any of `+ - * / %` or parentheses it (or text holding a character no name or operator uses next to a number, such as `2 $ 3`) is first tried as a math expression; a hyphen between two ASCII letters joins a name (`first-name`) and does not count as an operator. The expression shape is checked before any variable is read. A failed attempt falls through to normal lookup, except that a malformed expression (`MathSyntaxError`) stays an error when no variable has that name, in strict and lenient mode alike, and in `render` a division or modulo by zero (`DivisionByZeroError`) is a `type-error` at the variable that is never swallowed. In `render` the result prints with at most 15 significant digits (`formatNumber`); `resolveTemplate` prints `String(result)` and keeps `Infinity`, `NaN` and float noise [src: core/src/interpreter.ts visitVariable] [src: core/src/expressions.ts]. Then lookup, then the `??` default replaces a value that fails `isTruthy`, then filters run on the string form [src: nodes/TemplateResolver/interpreter.ts:121-136] [open: Q9]
- Lookup (`resolveNestedPath`): loop variables win over variables; a missing root throws `MissingVariableError` when strict and no `??` is present, else yields `null` [src: nodes/TemplateResolver/interpreter.ts:455-477]. Later path segments walk objects, array indexes (`parseInt`) and JSON-object strings (via `tryCoerceToObject`); a null intermediate, a string that is not a JSON object, or a primitive gives `null`, while a missing property on an object or index in an array gives `undefined` [src: nodes/TemplateResolver/interpreter.ts:483-507]
- Output formatting: `null`/`undefined` render as `""`; other values via `tryCoerceToString` (JSON for arrays and objects); a value with no text form (a cyclic object or array, a BigInt) is a `type-error` located at the variable (or the CASE node) in every mode, also before a filter that turns its input into text (`default` and the collection filters `length first last sort unique slice json` run first; `lines` and `join` check; the final value is always checked) [src: nodes/TemplateResolver/interpreter.ts:513-518] [src: nodes/TemplateResolver/coercion.ts:255-275]
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
- Math (`+ - * / %`, parentheses; `*` `/` `%` before `+` `-`): identifiers resolve through `resolveValue` and must coerce to a number or a `TypeError` is thrown; unmatched parentheses or a leftover token shape throw `TypeError` [src: nodes/TemplateResolver/expressions.ts:445-569]. A `-` directly before a digit is a sign when no number or `)` comes before it (`-3 + 1` is -2); a `-` with ASCII letters on both sides belongs to a name, so `a - b`, `a -b`, `n-1` and `x1-y` stay subtraction. `render` passes `render: true` to the `Interpreter` for the zero error and the 15-digit printing; `resolveTemplate` does not [answer: Q6]

### Filters

Every filter is one definition in `FILTER_REGISTRY` (`core/src/filters.ts`; the text and collection groups are `filters-text.ts` and `filters-collection.ts`): `render`, `spec()`, `analyze` and `validate` all read that table, and a definition added to it is accepted by all four. Filters receive and return values; the six built-ins coerce to text first. A call is parsed once at parse time, quote-aware (`fence="a=b"` keeps `a=b`), and a parameter the filter does not declare is a located `type-error` in every mode (also reported by `validate` and `analyze`). An unterminated quote in a `??` default is plain text and no longer hides the filters after it. The text group `filters-text.ts` adds `upper`, `lower`, `title`, `replace`, `indent`, `quote`, `round` and `default`; a bad parameter value throws from the filter and is reported as a `type-error` at the variable. See `docs/living/architecture/language-contract.md`. The paragraph below describes the older string-only behavior and the filter names it lists.

Applied left to right to the string form of the value, after `??`. Syntax per filter: bare name, `name=value`, or `name:key="v",key2="v2"` [src: nodes/TemplateResolver/filters.ts:11-65]. Implemented names: `head=N` (first N characters; negative N drops the last N), `tail=N` (last N; `0` gives `""`; negative N drops the first N), `trim`, `escape_md` (backslash-escapes `\ * _ [ ] ( ) # ` > ~ |`) [src: nodes/TemplateResolver/filters.ts:89-186]. Any other name throws a plain `Error` "Unknown filter" [src: nodes/TemplateResolver/filters.ts:99-100]

Collection filters (`filters-collection.ts`): `join=SEP`, `length`, `first`, `last`, `sort[=key]`, `unique`, `slice[:start=N,end=N]`, `lines` and `json`. List input is coerced as FOR coerces it, a missing value is the empty list, an object given to a list filter is a `type-error`, `sort` and `json` are deterministic (code-unit order, sorted keys) and `json` rejects a cyclic value. Details: `docs/living/architecture/language-contract.md`.

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

### Text filters

Group in `filters-text.ts`. Each coerces its input to text as the output step prints it, except `default`. A missing or invalid parameter value is a `type-error` at the variable in every mode; `validate` and `analyze` run without data, so they check names and undeclared parameters, and a bad value shows at render. The shorthand `name=value` is the parameter `value`.

| Filter | Result |
|---|---|
| `upper`, `lower` | the text in upper or lower case; no parameter |
| `title` | the first letter of each whitespace-separated word in upper case, the rest in lower case; no parameter |
| `replace:find="a",with="b"` | every non-overlapping occurrence of the literal `find` (required, non-empty) replaced by `with` (default empty text); never read as a pattern |
| `indent[=N]` | N spaces (whole number 0 to 100, default 2) before every line that has characters; line breaks are kept |
| `quote` | the text as a JSON double-quoted string; no parameter |
| `round[=N]` | a number rounded half away from zero to exactly N decimals (whole number 0 to 20, default 0), computed on its digits so `1.005` with `round=2` gives `1.01`; text that is not a finite number, or has an exponent beyond 400 (`1e400`), is left as it is |
| `default="x"` | `x` (required) when the raw value is not truthy by the language rule: missing, null, empty or whitespace-only text, the texts `0`, `false` and `no` in any letter case, the number 0, false, an empty list or an empty object; else the value. `??` keeps its own rule |

In strict mode a missing variable is reported before `default` runs, so `default` replaces missing data in lenient mode only.
### Collection filters

Nine filters in `filters-collection.ts` (`COLLECTION_FILTERS`), in this order: `join=SEP`, `length`, `first`, `last`, `sort[=key]`, `unique`, `slice[:start=N,end=N]`, `lines`, `json`.

- **Input.** `join first last sort unique slice` coerce their input as FOR does: an array passes through, a text such as `"a,b,c"` or `'["x","y"]'` becomes a list, a number or boolean a one-item list, null or a missing value the empty list. An object given to one of them is a `type-error`. No filter changes its input.
- **Output.** A filter returns a value: `join`, `json` a text; `length` a number; `first`, `last` an item (null when the list is empty); `sort`, `unique`, `slice`, `lines` a list, which the output step prints as compact JSON and the next filter receives as a list.
- **join.** `join=SEP` needs its separator (`join=""` is allowed); items print as the output step prints them.
- **length.** Items of a list, UTF-16 code units of a text (not split into items, so one emoji counts 2), keys of an object, characters of a number or boolean's text form; 0 for null or missing.
- **slice.** `Array.prototype.slice` semantics (negative counts from the end); each given bound is an integer, else a `type-error`.
- **lines.** The text form split on `\r\n`, `\r` or `\n`; one trailing line break adds no empty item.
- **sort.** Stable and deterministic: numbers numeric, then strings by code unit (so `"10"` before `"9"`), then every other value in its original order. `sort=key` orders object items by that property with the same rule; items without it come last.
- **unique.** Keeps the first occurrence; two values are equal when they have the same type and value (`1` and `"1"` differ), objects and arrays by their `json` text.
- **json.** Compact JSON with object keys sorted by code unit at every depth; null and missing give `null`; a cyclic value is a `type-error`, a shared non-cyclic reference is not.
- **Errors.** A parameter a collection filter does not declare is a located `type-error` in every mode, as for every filter.

## Math and output errors

- **Zero.** In `render`, `/` or `%` with a zero divisor (also `0 / 0` and a divisor computed to zero) is a `type-error` located at the variable, in every mode. `resolveTemplate` keeps its old output (`Infinity`, `NaN`): this is a render-only divergence, as `standaloneLines` is.
- **Float printing.** In `render`, an arithmetic result prints with at most 15 significant digits (`0.1 + 0.2` prints `0.3`; `1 / 3` prints `0.333333333333333`; integers of any size and negative numbers print unchanged). `resolveTemplate` prints the plain number, so `0.1 + 0.2` stays `0.30000000000000004` there.
- **Hyphens in names.** A hyphen with an ASCII letter on both sides is part of one name (`first-name`, `user.first-name`, `a-b + 1` reads the key `a-b`); `a - b`, `a -b`, `n-1`, `x1-y` and `1-a` are arithmetic. A missing hyphenated name in strict mode is a `missing-variable` error whose suggestion shows the spaced form. `analyze` lists a hyphenated name as one variable. Applies in `render` and `resolveTemplate`.
- **Malformed math.** A malformed expression, whatever the data holds (so `total * ` errors whether or not `total` exists) (`(1 + 2`, `1 +`, `1 + * 2`, `2 $ 3`) is a located `type-error` in lenient mode too, instead of empty output. A well-formed expression that names a missing or non-numeric variable stays missing data: empty in lenient mode. The error never replaces an existing key, and a missing name with an odd character (`a:b`, `Order #`) is plain missing data, not math. Applies in both entry points.
- **Unprintable output.** A value with no text form (a cyclic object or array, a BigInt) used as output, as a CASE subject or before a filter that turns its input into text (every filter except `default` and the collection filters that keep a value: `length first last sort unique slice json`, so `xs | length` still counts, while `lines` and `join` check) is a `type-error` located at the variable or CASE node, in every mode; `null` and missing still print as empty. Applies in both entry points.
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

These test files are shown as committed at 8259664d71be, the commit the contract is read at; the diff starts at base 65cebdfba625, so a file added or changed since then is in the diff too. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/language/operators.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TemplateError } from "../../core/src";
import { analyze } from "../../core/src/analyze";
import { render } from "../../core/src/render";
import { resolveTemplate } from "../../core/src/resolve";
import { spec } from "../../core/src/spec";
import { check } from "../headless/http-helpers";

type Entry = "render-strict" | "render-lenient" | "resolve-strict" | "resolve-lenient";
const ENTRIES: Entry[] = ["render-strict", "render-lenient", "resolve-strict", "resolve-lenient"];

interface Outcome {
  /** "ok" or the diagnostic code; "threw:<name>" for an exception that is not a TemplateError */
  code: string;
  line?: number;
  column?: number;
  severity?: string;
  message?: string;
  output?: string;
}

function run(entry: Entry, template: string, data: Record<string, any>): Outcome {
  const strictMode = entry.endsWith("strict");
  try {
    if (entry.startsWith("render")) {
      const r = render(template, data, { strictMode });
      if (r.ok) return { code: "ok", output: r.output };
      const d = r.diagnostics[0];
      return { code: d.code, line: d.line, column: d.column, severity: d.severity, message: d.message, output: r.output };
    }
    const out = resolveTemplate(template, new Map(Object.entries(data)), { strictMode });
    return { code: "ok", output: out };
  } catch (e) {
    if (e instanceof TemplateError) {
      return { code: e.code, line: e.line, column: e.column, severity: "error", message: e.message };
    }
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}` };
  }
}

/** A readable form of the row data for the test name; never throws on cyclic values or BigInt. */
function show(data: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(data, (_k, v) => {
      if (typeof v === "bigint") return `${v}n`;
      if (v && typeof v === "object") {
        if (seen.has(v)) return "[cycle]";
        seen.add(v);
      }
      return v;
    });
  } catch {
    return "[unprintable]";
  }
}

// ---- where the condition sits: never line 1, never column 1, so a 1:1 default fails ----

type Form = "if" | "elseif" | "list";
const ALL_FORMS: Form[] = ["if", "elseif", "list"];

function wrap(form: Form, cond: string): string {
  if (form === "if") return `a\nb\n  {{IF ${cond}}}Y{{ELSE}}N{{END_IF}}`;
  if (form === "elseif") return `a\nb\n  {{IF false}}Z{{ELSEIF ${cond}}}Y{{ELSE}}N{{END_IF}}`;
  return `a\nb\n  {{LIST}}\n    {{LIST_ITEM ${cond}}}Y{{END_LIST_ITEM}}{{END_LIST}}`;
}
const LOC: Record<Form, { line: number; column: number }> = {
  if: { line: 3, column: 3 },
  elseif: { line: 3, column: 16 },
  list: { line: 4, column: 5 },
};

/** "true" or "false" for a condition that evaluated, otherwise the error code. */
function verdict(form: Form, o: Outcome): string {
  if (o.code !== "ok") return o.code;
  const text = o.output ?? "";
  if (form === "list") return text.includes("Y") ? "true" : "false";
  if (text.endsWith("Y")) return "true";
  if (text.endsWith("N")) return "false";
  return `odd:${text}`;
}

function expectLocatedTypeError(entry: Entry, form: Form, o: Outcome, what: string): void {
  check(o.code, `${entry}/${form}: ${what} is a type-error`).toBe("type-error");
  check(o.severity, `${entry}/${form}: ${what} has severity error`).toBe("error");
  check({ line: o.line, column: o.column }, `${entry}/${form}: ${what} is located at its ${form} node`).toEqual(LOC[form]);
}

interface Row {
  cond: string;
  data: Record<string, any>;
  want: "true" | "false" | "type-error";
  /** a type-error about the operand itself, not the "Unrecognized condition" error for text the engine cannot read */
  typed?: boolean;
}
const T = (cond: string, data: Record<string, any>, want: Row["want"], typed = false): Row => ({ cond, data, want, typed });

function expand(rows: Row[], forms: Form[] = ["if"]) {
  return ENTRIES.flatMap((entry) =>
    forms.flatMap((form) => rows.map((r) => ({ entry, form, cond: r.cond, data: r.data, want: r.want, typed: !!r.typed, dj: show(r.data) })))
  );
}

function verifyRow(c: { entry: Entry; form: Form; cond: string; data: Record<string, any>; want: Row["want"]; typed?: boolean }, extraError?: string): void {
  const o = run(c.entry, wrap(c.form, c.cond), c.data);
  if (c.want === "type-error") {
    expectLocatedTypeError(c.entry, c.form, o, c.cond);
    if (c.typed) check((o.message ?? "").includes("Unrecognized condition"), `${c.entry}/${c.form}: ${c.cond} is rejected for its operand, not as an Unrecognized condition`).toBe(false);
    if (extraError) check(o.message ?? "", `${c.entry}/${c.form}: ${c.cond} reports "${extraError}"`).toContain(extraError);
    return;
  }
  check(verdict(c.form, o), `${c.entry}/${c.form}: ${c.cond} with ${show(c.data)} is ${c.want}`).toBe(c.want);
}

const cyc: any = {};
cyc.self = cyc;
const cycArr: any[] = [];
cycArr.push(cycArr);

// =====================================================================================
// op-in
// =====================================================================================

describe("op-in: in and not in", () => {
  const rows: Row[] = [
    // array literal, text items
    T('x in ["a","b"]', { x: "a" }, "true"),
    T('x in ["a","b"]', { x: "b" }, "true"),
    T('x in ["a","b"]', { x: "c" }, "false"),
    T('x not in ["a","b"]', { x: "c" }, "true"),
    T('x not in ["a","b"]', { x: "a" }, "false"),
    T('x in ["a", "a"]', { x: "a" }, "true"),
    // numbers against text: a quoted item compares as text
    T("x in [1, 2]", { x: 2 }, "true"),
    T("x in [1, 2]", { x: 3 }, "false"),
    T("x in [1, 2]", { x: "2" }, "true"),
    T("x in [1, 2.5]", { x: "2.50" }, "true"),
    T('n in ["1"]', { n: 1 }, "true"),
    T('n in ["01"]', { n: 1 }, "false"),
    T('n in ["1.0"]', { n: 1 }, "false"),
    T("n in [01]", { n: 1 }, "true"),
    T("n in [-1, 2]", { n: -1 }, "true"),
    T('n not in ["01"]', { n: 1 }, "true"),
    // array variable
    T("x in list", { x: "b", list: ["a", "b"] }, "true"),
    T("x in list", { x: "z", list: ["a", "b"] }, "false"),
    T("x in list", { x: 1, list: [1, 2] }, "true"),
    T("x in list", { x: "1", list: [1, 2] }, "true"),
    T("x not in list", { x: "z", list: ["a", "b"] }, "true"),
    T("x not in list", { x: "a", list: ["a", "b"] }, "false"),
    T("x in list", { x: "a", list: [] }, "false"),
    T("x in list", { x: "a", list: [null, "a"] }, "true"),
    T("x in list", { x: "b", list: [null, "a"] }, "false"),
    // object, array and BigInt elements never match
    T("x in list", { x: 1, list: [[1]] }, "false"),
    T("x in list", { x: "[object Object]", list: [{ a: 1 }] }, "false"),
    T("x in list", { x: 10, list: [BigInt(10)] }, "false"),
    T("x in list", { x: "10", list: [BigInt(10), { a: 1 }] }, "false"),
    // empty list
    T("x in []", { x: "a" }, "false"),
    T("x not in []", { x: "a" }, "true"),
    // missing and null left side: data, not an error, in every mode
    T('x in ["a"]', {}, "false"),
    T('x not in ["a"]', {}, "true"),
    T('x in ["a"]', { x: null }, "false"),
    T('x not in ["a"]', { x: null }, "true"),
    T("x in list", { list: ["a"] }, "false"),
    T("x not in list", { list: ["a"] }, "true"),
    T('x in "abc"', {}, "false"),
    T('x not in "abc"', { x: null }, "true"),
    T("x in [null]", {}, "false"),
    // a missing right side is missing data: no error, nothing is in it
    T("x in list", { x: "a" }, "false"),
    T("x not in list", { x: "a" }, "true"),
    // list items that are variables
    T("x in [a, b]", { x: "q", a: "p", b: "q" }, "true"),
    T("x in [a, b]", { x: "z", a: "p", b: "q" }, "false"),
    T("x in [a]", { x: "p" }, "false"),
    T('x in [a, "k"]', { x: "k", a: "p" }, "true"),
    T("x in [a, b]", { x: 3, a: 1, b: 3 }, "true"),
    // quoted items hold commas, brackets and operator words
    T('x in ["a,b", "c"]', { x: "a,b" }, "true"),
    T('x in ["a,b", "c"]', { x: "a" }, "false"),
    T('x in ["a,b", "c"]', { x: "b" }, "false"),
    T('x in ["c]", "d["]', { x: "c]" }, "true"),
    T('x in ["c]", "d["]', { x: "d[" }, "true"),
    T('x in ["[", "]"]', { x: "[" }, "true"),
    T('x in ["a and b", "c in d", "e not in f"]', { x: "c in d" }, "true"),
    T('x in ["a and b", "c in d", "e not in f"]', { x: "a and b" }, "true"),
    T('x in ["a and b", "c in d", "e not in f"]', { x: "e not in f" }, "true"),
    T('x in ["a and b", "c in d", "e not in f"]', { x: "c" }, "false"),
    T('x in ["a OR b"]', { x: "a OR b" }, "true"),
    T('x in ["a between b"]', { x: "a between b" }, "true"),
    T('x in ["a==b", ">"]', { x: "a==b" }, "true"),
    T('x in ["a==b", ">"]', { x: ">" }, "true"),
    T('x in ["a contains b"]', { x: "a contains b" }, "true"),
    // escaped quotes keep the split intact
    T('x in ["a\\"]", "z"]', { x: "z" }, "true"),
    T('x in ["a\\",b", "z"]', { x: "z" }, "true"),
    T('x in ["a\\",b", "z"]', { x: "b" }, "false"),
    // text right side: quoted or variable, a substring test
    T('x in "hello world"', { x: "lo w" }, "true"),
    T('x in "hello world"', { x: "xyz" }, "false"),
    T('x in "hello world"', { x: "LO" }, "false"),
    T('x not in "hello world"', { x: "xyz" }, "true"),
    T('x not in "hello world"', { x: "hello" }, "false"),
    T('x in "hello world"', { x: "" }, "true"),
    T("x in t", { x: "ell", t: "hello" }, "true"),
    T("x in t", { x: "Ell", t: "hello" }, "false"),
    T("x in t", { x: "", t: "hello" }, "true"),
    T("x in t", { x: "", t: "" }, "true"),
    T("x in t", { x: "z", t: "" }, "false"),
    T("x in t", { x: "b", t: "a,b" }, "true"),
    T("x in t", { x: "c", t: "a,b" }, "false"),
    T("x in t", { x: 2, t: "a2b" }, "true"),
    // operator words in any case
    T('x IN ["a"]', { x: "a" }, "true"),
    T('x In ["a"]', { x: "b" }, "false"),
    T('x Not In ["a"]', { x: "a" }, "false"),
    T('x NOT IN ["a"]', { x: "b" }, "true"),
    T('x not IN "abc"', { x: "z" }, "true"),
    // names that merely contain an operator word are variables
    T('intro in ["a"]', { intro: "a" }, "true"),
    T("x in inbox", { x: "b", inbox: "abc" }, "true"),
    T('x in ["a"] AND index == 1', { x: "a", index: 1 }, "true"),
  ];
  it.each(expand(rows))("op-in: [$entry] $cond with $dj is $want", (c) => verifyRow(c));

  const formRows: Row[] = [
    T('x in ["a","b"]', { x: "b" }, "true"),
    T('x in ["a","b"]', { x: "q" }, "false"),
    T('x not in ["a","b"]', { x: "q" }, "true"),
    T('x in "hello"', { x: "ell" }, "true"),
    T("x in list", { x: 2, list: [1, 2] }, "true"),
    T("x not in list", { x: 2, list: [1, 2] }, "false"),
  ];
  it.each(expand(formRows, ["elseif", "list"]))("op-in: [$entry/$form] $cond with $dj is $want", (c) => verifyRow(c));

  const errorRows: Row[] = [
    // the right side cannot be searched
    T("x in 5", { x: "a" }, "type-error", true),
    T("x in n", { x: 5, n: 5 }, "type-error", true),
    T("x in true", { x: "a" }, "type-error", true),
    T("x in flag", { x: true, flag: true }, "type-error", true),
    T("x in obj", { x: "a", obj: { a: 1 } }, "type-error", true),
    T("x not in 5", { x: "a" }, "type-error", true),
    T("x not in obj", { x: "a", obj: { a: 1 } }, "type-error", true),
    T("x in cyc", { x: "a", cyc }, "type-error", true),
    T("x in big", { x: "a", big: BigInt(10) }, "type-error", true),
    // the left side cannot be tested
    T('a in ["a"]', { a: ["a"] }, "type-error", true),
    T("a in list", { a: [1], list: [[1]] }, "type-error", true),
    T('a in ["a"]', { a: { k: 1 } }, "type-error", true),
    T('a not in ["a"]', { a: { k: 1 } }, "type-error", true),
    T('a in ["a"]', { a: cyc }, "type-error", true),
    T('a not in "abc"', { a: cyc }, "type-error", true),
    T('a in "abc"', { a: cycArr }, "type-error", true),
    T('a in ["a"]', { a: BigInt(10) }, "type-error", true),
    T('a not in ["a"]', { a: BigInt(10) }, "type-error", true),
    T('a in "abc"', { a: BigInt(10) }, "type-error", true),
    // malformed list forms
    T("x in [1,]", { x: 1 }, "type-error"),
    T("x in [,1]", { x: 1 }, "type-error"),
    T("x in [1,,2]", { x: 1 }, "type-error"),
    T("x in [1 2]", { x: 1 }, "type-error"),
    T("x in [[1]]", { x: 1 }, "type-error"),
    T("x in [1", { x: 1 }, "type-error"),
    T('x in ["a"', { x: "a" }, "type-error"),
    T("x in [", { x: 1 }, "type-error"),
    T("x not in [1", { x: 1 }, "type-error"),
    T("x in", { x: 1 }, "type-error"),
  ];
  it.each(expand(errorRows, ALL_FORMS))("op-in: [$entry/$form] $cond with $dj is a located type-error", (c) => verifyRow(c));
});

// =====================================================================================
// op-between
// =====================================================================================

describe("op-between: between [lo, hi]", () => {
  const rows: Row[] = [
    T("x between [1, 10]", { x: 5 }, "true"),
    T("x between [1, 10]", { x: 1 }, "true"),
    T("x between [1, 10]", { x: 10 }, "true"),
    T("x between [1, 10]", { x: 0 }, "false"),
    T("x between [1, 10]", { x: 11 }, "false"),
    T("x between [1, 10]", { x: 0.99 }, "false"),
    T("x between [1, 10]", { x: 10.01 }, "false"),
    T("x between [1,10]", { x: 7 }, "true"),
    T("x between [1, 10]", { x: "5" }, "true"),
    T("x between [1, 10]", { x: "10" }, "true"),
    T("x between [1, 10]", { x: "11" }, "false"),
    T("x between [-5, -1]", { x: -3 }, "true"),
    T("x between [-5, -1]", { x: -5 }, "true"),
    T("x between [-5, -1]", { x: -6 }, "false"),
    T("x between [-5, -1]", { x: 0 }, "false"),
    T("x between [0.5, 1.5]", { x: 1.5 }, "true"),
    T("x between [0.5, 1.5]", { x: 1.51 }, "false"),
    T("x between [0.5, 1.5]", { x: "0.5" }, "true"),
    T("x between [lo, hi]", { x: 3, lo: 2, hi: 4 }, "true"),
    T("x between [lo, hi]", { x: 5, lo: 2, hi: 4 }, "false"),
    T("x between [lo, hi]", { x: 2, lo: "2", hi: "4" }, "true"),
    T("x between [lo, 4]", { x: 1, lo: 2 }, "false"),
    T("x between [2, hi]", { x: 4, hi: 4 }, "true"),
    T("x between [10, 1]", { x: 5 }, "false"),
    T("x between [10, 1]", { x: 1 }, "false"),
    T("x between [10, 1]", { x: 10 }, "false"),
    T("x between [5, 5]", { x: 5 }, "true"),
    T("x between [5, 5]", { x: 6 }, "false"),
    T("x BETWEEN [1, 10]", { x: 5 }, "true"),
    T("x Between [1, 10]", { x: 11 }, "false"),
    T("a.b between [1, 10]", { a: { b: 4 } }, "true"),
    T("items.length between [1, 3]", { items: [1, 2] }, "true"),
    T("items.length between [3, 5]", { items: [1, 2] }, "false"),
    T("NOT x between [1, 5]", { x: 3 }, "false"),
    T("NOT x between [1, 5]", { x: 9 }, "true"),
  ];
  it.each(expand(rows))("op-between: [$entry] $cond with $dj is $want", (c) => verifyRow(c));

  const formRows: Row[] = [
    T("x between [1, 10]", { x: 10 }, "true"),
    T("x between [1, 10]", { x: 11 }, "false"),
    T("x between [lo, hi]", { x: 3, lo: 2, hi: 4 }, "true"),
  ];
  it.each(expand(formRows, ["elseif", "list"]))("op-between: [$entry/$form] $cond with $dj is $want", (c) => verifyRow(c));

  const errorRows: Row[] = [
    T("x between [1]", { x: 1 }, "type-error"),
    T("x between [1, 2, 3]", { x: 1 }, "type-error"),
    T("x between []", { x: 1 }, "type-error"),
    T("x between [, 2]", { x: 1 }, "type-error"),
    T("x between [1, ]", { x: 1 }, "type-error"),
    T("x between [1, 10", { x: 1 }, "type-error"),
    T("x between 5", { x: 1 }, "type-error"),
    T("x between lo", { x: 5, lo: [1, 10] }, "type-error"),
    T('x between "1,10"', { x: 5 }, "type-error"),
    T("x between [[1], 10]", { x: 5 }, "type-error"),
    T("x between [1 2, 10]", { x: 5 }, "type-error"),
    T("x between [1, 10]", { x: "abc" }, "type-error", true),
    T("x between [1, 10]", {}, "type-error", true),
    T("x between [1, 10]", { x: null }, "type-error", true),
    T("x between [1, 10]", { x: [5] }, "type-error", true),
    T("x between [1, 10]", { x: { a: 5 } }, "type-error", true),
    T("x between [1, 10]", { x: cyc }, "type-error", true),
    T("x between [1, 10]", { x: cycArr }, "type-error", true),
    T("x between [1, 10]", { x: BigInt(5) }, "type-error", true),
    T('x between ["a", 10]', { x: 5 }, "type-error", true),
    T('x between [1, "b"]', { x: 5 }, "type-error", true),
    T("x between [lo, 10]", { x: 5 }, "type-error", true),
    T("x between [lo, 10]", { x: 5, lo: "abc" }, "type-error", true),
    T("x between [lo, 10]", { x: 5, lo: cyc }, "type-error", true),
    T("x between [1, hi]", { x: 5, hi: BigInt(10) }, "type-error", true),
    T("x between [1, hi]", { x: 5, hi: null }, "type-error", true),
    // not between is not an operator
    T("x not between [1, 10]", { x: 5 }, "type-error"),
    T("x NOT BETWEEN [1, 10]", { x: 5 }, "type-error"),
  ];
  it.each(expand(errorRows, ALL_FORMS))("op-between: [$entry/$form] $cond with $dj is a located type-error", (c) => verifyRow(c));

  it.each(ENTRIES)("op-between: [%s] not between names the Unrecognized condition error", (entry) => {
    const o = run(entry, wrap("if", "x not between [1, 10]"), { x: 5 });
    check(o.code, `${entry}: not between is a type-error`).toBe("type-error");
    check(o.message ?? "", `${entry}: the message says Unrecognized condition`).toContain("Unrecognized condition");
  });
});

// =====================================================================================
// op-length
// =====================================================================================

describe("op-length: .length on arrays and strings", () => {
  const outRows: { tpl: string; data: Record<string, any>; out: string }[] = [
    { tpl: "${{items.length}}", data: { items: [1, 2, 3] }, out: "3" },
    { tpl: "${{items.length}}", data: { items: [] }, out: "0" },
    { tpl: "${{items.length}}", data: { items: [null] }, out: "1" },
    { tpl: "${{s.length}}", data: { s: "hello" }, out: "5" },
    { tpl: "${{s.length}}", data: { s: "" }, out: "0" },
    { tpl: "${{s.length}}", data: { s: "😀" }, out: "2" },
    { tpl: "${{s.length}}", data: { s: "a😀" }, out: "3" },
    { tpl: "${{user.tags.length}}", data: { user: { tags: ["a", "b"] } }, out: "2" },
    { tpl: "${{user.name.length}}", data: { user: { name: "Ann" } }, out: "3" },
    { tpl: "${{items.0.length}}", data: { items: ["ab", "c"] }, out: "2" },
    { tpl: "${{items.0.length}}", data: { items: [[1, 2, 3]] }, out: "3" },
    { tpl: "${{items.length + 1}}", data: { items: [1, 2, 3] }, out: "4" },
    { tpl: "${{items.length | upper}}", data: { items: [1, 2, 3] }, out: "3" },
    { tpl: "n=${{items.length}};m=${{s.length}}", data: { items: [1], s: "ab" }, out: "n=1;m=2" },
    { tpl: "${{c.length}}", data: { c: cycArr }, out: "1" },
    // an own key named length wins over the built-in
    { tpl: "${{o.length}}", data: { o: { length: 7 } }, out: "7" },
    { tpl: "${{o.length}}", data: { o: { length: 0 } }, out: "0" },
    { tpl: "${{o.length}}", data: { o: { length: null } }, out: "" },
    { tpl: "${{s.length}}", data: { s: '{"length": 5}' }, out: "5" },
    { tpl: "${{s.length}}", data: { s: '{"a":1}' }, out: "7" },
    // anything else keeps today's null
    { tpl: "${{o.length}}", data: { o: { a: 1 } }, out: "" },
    { tpl: "${{n.length}}", data: { n: 12345 }, out: "" },
    { tpl: "${{b.length}}", data: { b: true }, out: "" },
    { tpl: "${{b.length}}", data: { b: BigInt(10) }, out: "" },
    // a root variable named length is an ordinary variable
    { tpl: "${{length}}", data: { length: 5 }, out: "5" },
    { tpl: "${{length.length}}", data: { length: "abc" }, out: "3" },
    // loops
    { tpl: "{{FOR names AS n}}${{n.length}},{{END_FOR}}", data: { names: ["ab", "cde"] }, out: "2,3," },
    { tpl: "{{FOR rows AS r}}${{r.length}};{{END_FOR}}", data: { rows: [[1], [1, 2]] }, out: "1;2;" },
    { tpl: "{{FOR names AS n}}{{IF n.length > 2}}${{n}}{{END_IF}}{{END_FOR}}", data: { names: ["ab", "cde"] }, out: "cde" },
    // CASE subject
    { tpl: '{{CASE items.length}}{{WHEN "3"}}three{{END_WHEN}}{{DEFAULT}}d{{END_DEFAULT}}{{END_CASE}}', data: { items: [1, 2, 3] }, out: "three" },
    { tpl: '{{CASE items.length}}{{WHEN "3"}}three{{END_WHEN}}{{DEFAULT}}d{{END_DEFAULT}}{{END_CASE}}', data: { items: [1, 2] }, out: "d" },
    { tpl: '{{CASE s.length}}{{WHEN "2"}}two{{END_WHEN}}{{DEFAULT}}d{{END_DEFAULT}}{{END_CASE}}', data: { s: "😀" }, out: "two" },
  ];
  it.each(ENTRIES.flatMap((entry) => outRows.map((r) => ({ entry, ...r, dj: show(r.data) }))))("op-length: [$entry] $tpl with $dj prints $out", (c) => {
    const o = run(c.entry, c.tpl, c.data);
    check(o.code, `${c.entry}: ${c.tpl} renders`).toBe("ok");
    check(o.output, `${c.entry}: ${c.tpl} with ${c.dj} prints ${c.out}`).toBe(c.out);
  });

  it.each(ENTRIES)("op-length: [%s] a missing array stays empty, and strict mode reports the missing variable as before", (entry) => {
    const o = run(entry, "${{items.length}}", {});
    if (entry.endsWith("strict")) {
      check(o.code, `${entry}: strict reports the missing variable`).toBe("missing-variable");
    } else {
      check(o.code, `${entry}: lenient renders`).toBe("ok");
      check(o.output, `${entry}: a missing array gives empty output, not 0`).toBe("");
    }
  });

  const condRows: Row[] = [
    T("items.length > 2", { items: [1, 2, 3] }, "true"),
    T("items.length > 2", { items: [1, 2] }, "false"),
    T("items.length == 3", { items: [1, 2, 3] }, "true"),
    T("items.length >= 3", { items: [1, 2, 3] }, "true"),
    T("items.length < 3", { items: [1, 2, 3] }, "false"),
    T("items.length != 3", { items: [1, 2, 3] }, "false"),
    T("items.length == 0", { items: [] }, "true"),
    T("items.length > 0", { items: [] }, "false"),
    T("items.length between [1, 3]", { items: [1, 2, 3] }, "true"),
    T("items.length between [4, 5]", { items: [1, 2, 3] }, "false"),
    T("s.length > 1", { s: "😀" }, "true"),
    T("s.length == 2", { s: "😀" }, "true"),
    T("s.length == 1", { s: "😀" }, "false"),
    T("s.length == 3", { s: "a😀" }, "true"),
    T("s.length == 0", { s: "" }, "true"),
    T("s.length >= 5", { s: "hello" }, "true"),
    T("user.tags.length > 1", { user: { tags: ["a", "b"] } }, "true"),
    T("items.0.length == 2", { items: ["ab"] }, "true"),
    T("items.0.length == 2", { items: ["abc"] }, "false"),
    T('items.length > 0 AND items.0 == "a"', { items: ["a"] }, "true"),
    T("NOT items.length > 2", { items: [1, 2, 3] }, "false"),
    T("o.length > 5", { o: { length: 7 } }, "true"),
    T("o.length > 5", { o: { length: 0 } }, "false"),
    T("c.length == 1", { c: cycArr }, "true"),
    T("length > 3", { length: 5 }, "true"),
    // a missing array follows the ordering-operator rule: null is non-numeric
    T("items.length > 0", {}, "type-error"),
    T("o.length > 0", { o: { a: 1 } }, "type-error"),
    T("n.length > 0", { n: 5 }, "type-error"),
  ];
  it.each(expand(condRows))("op-length: [$entry] $cond with $dj is $want", (c) => verifyRow(c));

  const formRows: Row[] = [
    T("items.length > 2", { items: [1, 2, 3] }, "true"),
    T("items.length > 2", { items: [1] }, "false"),
    T("s.length == 2", { s: "😀" }, "true"),
  ];
  it.each(expand(formRows, ["elseif", "list"]))("op-length: [$entry/$form] $cond with $dj is $want", (c) => verifyRow(c));
});

// =====================================================================================
// op-equality
// =====================================================================================

describe("op-equality: a quoted side compares as text, an unquoted number keeps its written text", () => {
  const rows: Row[] = [
    T('z == "01234"', { z: 1234 }, "false"),
    T('z == "01234"', { z: "01234" }, "true"),
    T('z == "01234"', { z: "1234" }, "false"),
    T('z == "1234"', { z: 1234 }, "true"),
    T('z == "1234"', { z: "1234" }, "true"),
    T('"01234" == z', { z: 1234 }, "false"),
    T('"1" == 1', {}, "true"),
    T('"1.0" == 1', {}, "false"),
    T('1 == "1.0"', {}, "false"),
    T('z == "1.0"', { z: 1 }, "false"),
    T('z == "1.0"', { z: "1.0" }, "true"),
    T('z != "01234"', { z: 1234 }, "true"),
    T('z != "01234"', { z: "01234" }, "false"),
    T('z != "1234"', { z: 1234 }, "false"),
    T('"1.0" != 1', {}, "true"),
    // unquoted numeric equality is unchanged
    T("z == 01234", { z: 1234 }, "true"),
    T("1234 == 01234", {}, "true"),
    T("a == b", { a: "1.0", b: "1" }, "true"),
    T("a == b", { a: "01234", b: 1234 }, "true"),
    T("a != b", { a: "1.0", b: "1" }, "false"),
    T("z != 01234", { z: 1234 }, "false"),
    T("z == 1.0", { z: 1 }, "true"),
    // contains, startsWith and endsWith keep the written number
    T("x contains 1.50", { x: "v1.50" }, "true"),
    T("x contains 1.50", { x: "v1.5" }, "false"),
    T("x contains 007", { x: "a007" }, "true"),
    T("x contains 007", { x: "a7" }, "false"),
    T("x startsWith 007", { x: "007z" }, "true"),
    T("x startsWith 007", { x: "7z" }, "false"),
    T("x endsWith 1.50", { x: "a1.50" }, "true"),
    T("x endsWith 1.50", { x: "a1.5" }, "false"),
    T('x contains "007"', { x: "a007" }, "true"),
    T('x contains "007"', { x: "a7" }, "false"),
    T("x contains y", { x: "a7", y: 7 }, "true"),
    T("x contains y", { x: "a007", y: "007" }, "true"),
    T("x contains 7", { x: "a7" }, "true"),
    T("x contains 7", { x: "a8" }, "false"),
  ];
  it.each(expand(rows))("op-equality: [$entry] $cond with $dj is $want", (c) => verifyRow(c));

  const formRows: Row[] = [
    T('z == "01234"', { z: 1234 }, "false"),
    T('z == "1234"', { z: 1234 }, "true"),
    T("x contains 007", { x: "a7" }, "false"),
  ];
  it.each(expand(formRows, ["elseif", "list"]))("op-equality: [$entry/$form] $cond with $dj is $want", (c) => verifyRow(c));

  const noThrow = [
    { cond: 'x == "a"', data: { x: cyc } },
    { cond: 'x != "a"', data: { x: cyc } },
    { cond: 'x == "a"', data: { x: BigInt(10) } },
    { cond: "x == 10", data: { x: BigInt(10) } },
    { cond: "x == y", data: { x: cyc, y: cyc } },
    { cond: 'x contains "a"', data: { x: cyc } },
    { cond: "x contains y", data: { x: "a", y: BigInt(10) } },
    { cond: "x.length > 0", data: { x: cyc } },
    { cond: "x.length > 0", data: { x: BigInt(10) } },
  ];
  it.each(ENTRIES.flatMap((entry) => noThrow.map((r) => ({ entry, ...r, dj: show(r.data) }))))(
    "op-equality: [$entry] $cond with $dj never throws a raw exception",
    (c) => {
      const o = run(c.entry, wrap("if", c.cond), c.data);
      check(o.code.startsWith("threw:"), `${c.entry}: ${c.cond} ends in a result or a located type-error, got ${o.code}`).toBe(false);
      if (o.code !== "ok") expectLocatedTypeError(c.entry, "if", o, c.cond);
    }
  );
});

// =====================================================================================
// op-unknown
// =====================================================================================

describe("op-unknown: an unrecognized word next to an operator is an error in every mode", () => {
  const data = { a: 1, b: 2, c: 3, x: "q" };
  const rows: Row[] = [
    T("a like b", data, "type-error"),
    T("a equals b", data, "type-error"),
    T("a matches /x/", data, "type-error"),
    T("a == b c", data, "type-error"),
    T("a != b c", data, "type-error"),
    T("a > b c", data, "type-error"),
    T("a contains b c", data, "type-error"),
    T("a startsWith b c", data, "type-error"),
    T("a isEmpty b", data, "type-error"),
    T("a in [x y]", data, "type-error"),
    T("a in b in c", data, "type-error"),
    T("a in b == c", data, "type-error"),
    T("a == b in c", data, "type-error"),
    T("a between [1, 2] contains x", data, "type-error"),
    T("a in b contains c", data, "type-error"),
    T("a == b c AND x", data, "type-error"),
    T("x OR a like b", data, "type-error"),
    T("NOT a == b c", data, "type-error"),
    T("(a == b c)", data, "type-error"),
  ];
  it.each(expand(rows, ALL_FORMS))("op-unknown: [$entry/$form] $cond is a located Unrecognized condition error", (c) =>
    verifyRow(c, "Unrecognized condition")
  );

  // a variable key that contains a space, used as a whole condition, keeps today's behavior
  it.each(ENTRIES)("op-unknown: [%s] a present variable key with a space still reads as that variable", (entry) => {
    const o = run(entry, wrap("if", "first name"), { "first name": 1 });
    check(verdict("if", o), `${entry}: the key "first name" is truthy`).toBe("true");
  });
  it.each(ENTRIES)("op-unknown: [%s] an absent key with a space is the Unrecognized condition error", (entry) => {
    const o = run(entry, wrap("if", "first name"), {});
    expectLocatedTypeError(entry, "if", o, "first name");
    check(o.message ?? "", `${entry}: the message says Unrecognized condition`).toContain("Unrecognized condition");
  });

  const analyzeRows = [
    "a == b c",
    "a contains b c",
    "a in [x y]",
    "a in b in c",
    "a in b == c",
    "a between [1, 2] contains x",
    "x in [1",
    "x between [1",
  ];
  it.each(analyzeRows)("op-unknown: analyze reports %s as unrecognized-condition at the condition", (cond) => {
    const r = analyze(wrap("if", cond));
    const d = r.diagnostics.find((x) => x.code === "unrecognized-condition");
    check(d, `analyze reports an unrecognized-condition diagnostic for ${cond}`).toBeDefined();
    check({ line: d?.line, column: d?.column }, `the diagnostic for ${cond} is located at the IF`).toEqual(LOC.if);
  });
});

// =====================================================================================
// precedence: in, not in and between combine with AND, OR, NOT, ! and parentheses
// =====================================================================================

describe("op-in: precedence with logical words, negation, parentheses and quotes", () => {
  const rows: Row[] = [
    T("a in [1] AND b", { a: 1, b: true }, "true"),
    T("a in [1] AND b", { a: 2, b: true }, "false"),
    T("a in [1] AND b", { a: 1, b: false }, "false"),
    T("b AND a in [1]", { a: 1, b: true }, "true"),
    T("b AND a in [1]", { a: 2, b: true }, "false"),
    T("a in [1] OR b", { a: 2, b: true }, "true"),
    T("a in [1] OR b", { a: 2, b: false }, "false"),
    T("b OR a in [1]", { a: 1, b: false }, "true"),
    T("b OR a in [1]", { a: 2, b: false }, "false"),
    T("a not in [1] AND b", { a: 2, b: true }, "true"),
    T("a not in [1] AND b", { a: 1, b: true }, "false"),
    T("b OR a not in [1]", { a: 1, b: false }, "false"),
    T("b OR a not in [1]", { a: 2, b: false }, "true"),
    T("a between [1, 5] AND b", { a: 3, b: true }, "true"),
    T("a between [1, 5] AND b", { a: 9, b: true }, "false"),
    T("b AND a between [1, 5]", { a: 3, b: true }, "true"),
    T("b AND a between [1, 5]", { a: 9, b: true }, "false"),
    T("a between [1, 5] OR b", { a: 9, b: true }, "true"),
    T("a between [1, 5] OR b", { a: 9, b: false }, "false"),
    T("b OR a between [1, 5]", { a: 3, b: false }, "true"),
    T("b OR a between [1, 5]", { a: 9, b: false }, "false"),
    T("NOT x in [1, 2]", { x: 1 }, "false"),
    T("NOT x in [1, 2]", { x: 3 }, "true"),
    T("! x in [1, 2]", { x: 1 }, "false"),
    T("!x in [1, 2]", { x: 3 }, "true"),
    T("NOT x not in [1, 2]", { x: 1 }, "true"),
    T("NOT x not in [1, 2]", { x: 3 }, "false"),
    T("! x between [1, 5]", { x: 3 }, "false"),
    T("! x between [1, 5]", { x: 9 }, "true"),
    T("NOT x in [1, 2] AND y", { x: 3, y: true }, "true"),
    T("NOT x in [1, 2] AND y", { x: 3, y: false }, "false"),
    T("NOT x in [1, 2] AND y", { x: 1, y: false }, "false"),
    T("NOT x in [1, 2] OR y", { x: 1, y: true }, "true"),
    T("NOT x in [1, 2] OR y", { x: 1, y: false }, "false"),
    T("(x in [1, 2])", { x: 1 }, "true"),
    T("((x in [1, 2]) OR y)", { x: 5, y: true }, "true"),
    T("(a in [1]) AND (b between [1, 2])", { a: 1, b: 2 }, "true"),
    T("(a in [1]) AND (b between [1, 2])", { a: 1, b: 3 }, "false"),
    T("(a in [1]) AND (b between [1, 2])", { a: 2, b: 2 }, "false"),
    T("(a in [1] OR b in [1]) AND c", { a: 1, b: 9, c: false }, "false"),
    T("(a in [1] OR b in [1]) AND c", { a: 1, b: 9, c: true }, "true"),
    T("a in [1] OR b in [2] AND c", { a: 1, b: 9, c: false }, "true"),
    T("a in [1] OR b in [2] AND c", { a: 2, b: 2, c: true }, "true"),
    T("a in [1] OR b in [2] AND c", { a: 2, b: 2, c: false }, "false"),
    T("a in [1] OR b in [2] AND c", { a: 2, b: 9, c: true }, "false"),
    T("NOT (x in [1, 2]) AND y between [1, 5]", { x: 3, y: 2 }, "true"),
    T("NOT (x in [1, 2]) AND y between [1, 5]", { x: 1, y: 2 }, "false"),
    T("NOT (x in [1, 2]) AND y between [1, 5]", { x: 3, y: 9 }, "false"),
    T('x == "a" AND y in ["b"]', { x: "a", y: "b" }, "true"),
    T('x == "a" AND y in ["b"]', { x: "a", y: "c" }, "false"),
    T('y in ["b"] AND x == "a"', { x: "z", y: "b" }, "false"),
    T("x isNumber AND x in [1, 2]", { x: 1 }, "true"),
    T("x isNumber AND x in [1, 2]", { x: "a" }, "false"),
    T("x in [1] AND x isNumber", { x: 1 }, "true"),
    // operator words inside quotes never split
    T('title contains "in the end"', { title: "in the end of it" }, "true"),
    T('title contains "in the end"', { title: "the end" }, "false"),
    T('x == "a between b"', { x: "a between b" }, "true"),
    T('x == "a between b"', { x: "a" }, "false"),
    T('x == "a not in b"', { x: "a not in b" }, "true"),
    T('x == "a in b"', { x: "a in b" }, "true"),
    T('x == "a in b"', { x: "a" }, "false"),
    T('x contains "between [1, 2]"', { x: "between [1, 2]" }, "true"),
    T('x in ["a in b", "c"]', { x: "a in b" }, "true"),
    T('x in ["(", ")"]', { x: "(" }, "true"),
    T('x in ["(", ")"]', { x: ")" }, "true"),
    T('(x in ["(a", "b"]) OR false', { x: "b" }, "true"),
    T('(x in ["(a", "b"]) OR false', { x: "c" }, "false"),
    T('x in ["a AND b"] OR y', { x: "a AND b", y: false }, "true"),
    T('inbox contains "a"', { inbox: "cat" }, "true"),
  ];
  it.each(expand(rows))("op-in: [$entry] precedence $cond with $dj is $want", (c) => verifyRow(c));
});

// =====================================================================================
// op-spec
// =====================================================================================

describe("op-spec: spec and analyze list the new operators and the variables they read", () => {
  const OLD = ["==", "!=", ">", "<", ">=", "<=", "contains", "startsWith", "endsWith", "isEmpty", "isNotEmpty", "isArray", "isNumber", "isObject", "isBoolean", "AND", "OR", "NOT"];

  it.each(["in", "not in", "between", ".length"])("op-spec: spec().operators lists %s exactly once", (name) => {
    const count = spec().operators.filter((o) => o === name).length;
    check(count, `${name} appears once in spec().operators`).toBe(1);
  });

  it("op-spec: the existing operators keep their order and spelling", () => {
    const kept = spec().operators.filter((o) => OLD.includes(o));
    check(kept, "the existing entries are unchanged and in order").toEqual(OLD);
    check(spec().operators.length, "exactly four entries are added").toBe(OLD.length + 4);
  });

  const names = (tpl: string) => analyze(tpl).variables.map((v) => v.name).sort();
  const varRows: { tpl: string; names: string[] }[] = [
    { tpl: '{{IF x in ["a", y]}}A{{END_IF}}', names: ["x", "y"] },
    { tpl: "{{IF x in list}}A{{END_IF}}", names: ["list", "x"] },
    { tpl: "{{IF x not in list}}A{{END_IF}}", names: ["list", "x"] },
    { tpl: '{{IF x in "text"}}A{{END_IF}}', names: ["x"] },
    { tpl: "{{IF x between [lo, hi]}}A{{END_IF}}", names: ["hi", "lo", "x"] },
    { tpl: "{{IF x between [1, hi]}}A{{END_IF}}", names: ["hi", "x"] },
    { tpl: "{{IF x between [1, 10]}}A{{END_IF}}", names: ["x"] },
    { tpl: '{{IF x in ["a", 1, true, null]}}A{{END_IF}}', names: ["x"] },
    { tpl: "{{IF items.length > 2}}A{{END_IF}}", names: ["items"] },
    { tpl: "{{IF a in b AND c.length > 1}}A{{END_IF}}", names: ["a", "b", "c"] },
    { tpl: "${{items.length}}", names: ["items"] },
    { tpl: "${{items.length + n}}", names: ["items", "n"] },
    { tpl: "{{LIST}}{{LIST_ITEM x in list}}A{{END_LIST_ITEM}}{{END_LIST}}", names: ["list", "x"] },
    { tpl: "{{IF false}}Z{{ELSEIF x between [lo, 5]}}A{{END_IF}}", names: ["lo", "x"] },
    { tpl: "{{FOR names AS n}}{{IF n in allowed}}${{@index0}}{{END_IF}}{{END_FOR}}", names: ["allowed", "names"] },
    { tpl: "{{FOR names AS n}}{{IF n.length > 1}}A{{END_IF}}{{END_FOR}}", names: ["names"] },
    { tpl: '{{FOR names AS n}}{{IF x in [n, "k"]}}A{{END_IF}}{{END_FOR}}', names: ["names", "x"] },
  ];
  it.each(varRows)("op-spec: analyze reads $names from $tpl", (c) => {
    check(names(c.tpl), `variables read by ${c.tpl}`).toEqual(c.names);
  });

  const pathRows: { tpl: string; name: string; paths: string[] }[] = [
    { tpl: "{{IF items.length > 2}}A{{END_IF}}", name: "items", paths: ["items.length"] },
    { tpl: "{{IF a in b AND c.length > 1}}A{{END_IF}}", name: "c", paths: ["c.length"] },
    { tpl: "${{items.length}}", name: "items", paths: ["items.length"] },
    { tpl: "{{IF user.tags.length > 1}}A{{END_IF}}", name: "user", paths: ["user.tags.length"] },
    { tpl: "{{IF x in list.items}}A{{END_IF}}", name: "list", paths: ["list.items"] },
    { tpl: "{{IF x between [r.lo, r.hi]}}A{{END_IF}}", name: "r", paths: ["r.hi", "r.lo"] },
  ];
  it.each(pathRows)("op-spec: analyze records the path text of $name in $tpl", (c) => {
    const v = analyze(c.tpl).variables.find((x) => x.name === c.name);
    check(v, `${c.name} is a read variable in ${c.tpl}`).toBeDefined();
    check([...(v?.paths ?? [])].sort(), `paths recorded for ${c.name}`).toEqual(c.paths);
  });

  it.each(['{{IF x in ["a", y]}}A{{END_IF}}', "{{IF x between [lo, hi]}}A{{END_IF}}", "{{IF items.length > 2}}A{{END_IF}}"])(
    "op-spec: a well formed condition %s raises no diagnostic",
    (tpl) => {
      check(analyze(tpl).diagnostics, `no diagnostics for ${tpl}`).toEqual([]);
    }
  );

  it.each(["x in [1", "x between [1", "x in [1,]", "x between [1, 2, 3]"])("op-spec: a malformed %s gives unrecognized-condition", (cond) => {
    const codes = analyze(wrap("if", cond)).diagnostics.map((d) => d.code);
    check(codes, `diagnostic codes for ${cond}`).toContain("unrecognized-condition");
  });
});
```

## 4. Diff

7 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/core/src/expressions.ts b/core/src/expressions.ts
index 68f267b..745410a 100644
--- a/core/src/expressions.ts
+++ b/core/src/expressions.ts
@@ -59,20 +59,34 @@ export function isTruthy(value: any): boolean {
  * Supports:
  * - Simple truthiness: "varName"
  * - Comparisons: ==, !=, >, <, >=, <=
+ * - Membership and range: in, not in, between [lo, hi]
  * - String ops: contains, startsWith, endsWith
  * - Type checks: isEmpty, isNotEmpty, isArray, isNumber, isObject, isBoolean
  * - Logical: AND, OR, NOT (also &&, ||, !, case-insensitive)
  * - Parentheses for grouping
+ *
+ * Every operand is checked before anything runs, so text the language cannot
+ * read is an error even in a branch a short-circuit would skip.
  */
 export function evaluateCondition(
   condition: string,
   variables: VariableMap
+): boolean {
+  for (const operand of conditionOperands(condition)) {
+    readableOperand(operand, variables);
+  }
+  return evaluateConditionText(condition, variables);
+}
+
+function evaluateConditionText(
+  condition: string,
+  variables: VariableMap
 ): boolean {
   const trimmed = condition.trim();
 
   // Handle parentheses for grouping - only if they're matching outer parens
   const unwrapped = unwrapParens(trimmed);
-  if (unwrapped !== null) return evaluateCondition(unwrapped, variables);
+  if (unwrapped !== null) return evaluateConditionText(unwrapped, variables);
 
   // Handle logical operators (AND, OR)
   const logicalResult = tryEvaluateLogical(trimmed, variables);
@@ -80,12 +94,18 @@ export function evaluateCondition(
 
   // Handle negation: NOT x, NOT (x), !x
   const negated = splitNegation(trimmed);
-  if (negated !== null) return !evaluateCondition(negated, variables);
+  if (negated !== null) return !evaluateConditionText(negated, variables);
 
   // Handle comparison operators
   const comparisonResult = tryEvaluateComparison(trimmed, variables);
   if (comparisonResult !== null) return comparisonResult;
 
+  // Handle membership and range operators
+  const membershipResult = tryEvaluateMembership(trimmed, variables);
+  if (membershipResult !== null) return membershipResult;
+  const betweenResult = tryEvaluateBetween(trimmed, variables);
+  if (betweenResult !== null) return betweenResult;
+
   // Handle string operators
   const stringResult = tryEvaluateStringOp(trimmed, variables);
   if (stringResult !== null) return stringResult;
@@ -94,26 +114,95 @@ export function evaluateCondition(
   const typeResult = tryEvaluateTypeCheck(trimmed, variables);
   if (typeResult !== null) return typeResult;
 
-  if (!variables.has(trimmed) && hasBareWhitespace(trimmed)) {
-    throw new TypeError(
-      `Unrecognized condition: ${trimmed}`,
-      1,
-      1,
-      "Use a supported operator: ==, !=, >, <, >=, <=, contains, startsWith, endsWith, AND, OR, NOT"
-    );
+  // Simple truthiness check
+  return isTruthy(readOperand(trimmed, variables).value);
+}
+
+const UNRECOGNIZED_HINT =
+  "Use a supported operator: ==, !=, >, <, >=, <=, contains, startsWith, endsWith, in, not in, between, AND, OR, NOT";
+
+function unrecognizedCondition(text: string): TypeError {
+  return new TypeError(`Unrecognized condition: ${text}`, 1, 1, UNRECOGNIZED_HINT);
+}
+
+function safeString(value: unknown): string {
+  try {
+    return String(value);
+  } catch {
+    return "[unprintable]";
   }
+}
 
-  // Simple truthiness check
-  const value = resolveValue(trimmed, variables);
-  return isTruthy(value);
+/**
+ * A value as text for an error message; never throws (cycles, BigInt)
+ */
+function describeOperand(value: unknown): string {
+  try {
+    const json = JSON.stringify(value);
+    if (json !== undefined) return json;
+  } catch {
+    // fall through to the plain string form
+  }
+  return safeString(value);
+}
+
+/** An operand read from a condition: its value, and how it was written */
+interface Operand {
+  value: TemplateValue;
+  /** True when written as a quoted literal */
+  quoted: boolean;
+  /** The written text of a number literal */
+  text?: string;
+}
+
+/**
+ * Read one operand: a literal or a variable path. Text that is neither, is
+ * not a variable key and holds a bare space is not a condition we can read.
+ */
+function readOperand(expr: string, variables: VariableMap): Operand {
+  const text = expr.trim();
+  if (text === "") return { value: null, quoted: false };
+
+  const literal = parseLiteral(text);
+  if (literal) {
+    return { value: literal.value, quoted: literal.quoted, text: literal.text };
+  }
+  readableOperand(text, variables);
+  return { value: resolveValue(text, variables), quoted: false };
 }
 
 /**
- * Check if parentheses in a string are balanced
+ * Throw the Unrecognized condition error for an operand that is not a
+ * literal, not a variable key and holds a bare space
+ */
+function readableOperand(text: string, variables: VariableMap): void {
+  if (
+    text !== "" &&
+    parseLiteral(text) === null &&
+    !variables.has(text) &&
+    hasBareWhitespace(text)
+  ) {
+    throw unrecognizedCondition(text);
+  }
+}
+
+/**
+ * Check if parentheses in a string are balanced; parentheses inside quotes
+ * do not count
  */
 function isBalancedParens(str: string): boolean {
   let depth = 0;
-  for (const char of str) {
+  let quoteChar: string | null = null;
+  for (let i = 0; i < str.length; i++) {
+    const char = str[i];
+    if (quoteChar !== null) {
+      if (char === quoteChar && str[i - 1] !== "\\") quoteChar = null;
+      continue;
+    }
+    if (char === '"' || char === "'") {
+      quoteChar = char;
+      continue;
+    }
     if (char === "(") depth++;
     if (char === ")") depth--;
     if (depth < 0) return false; // More closing than opening
@@ -219,10 +308,10 @@ function tryEvaluateLogical(
 ): boolean | null {
   const split = splitLogical(expr);
   if (split === null) return null;
-  const left = evaluateCondition(split.left, variables);
+  const left = evaluateConditionText(split.left, variables);
   return split.op === "or"
-    ? left || evaluateCondition(split.right, variables)
-    : left && evaluateCondition(split.right, variables);
+    ? left || evaluateConditionText(split.right, variables)
+    : left && evaluateConditionText(split.right, variables);
 }
 
 /**
@@ -253,13 +342,20 @@ function numericOf(value: TemplateValue): number | null {
     : null;
 }
 
-function valuesEqual(left: TemplateValue, right: TemplateValue): boolean {
-  const l = left === undefined ? null : left;
-  const r = right === undefined ? null : right;
-  const leftNum = numericOf(l);
-  const rightNum = numericOf(r);
-  if (leftNum !== null && rightNum !== null) return leftNum === rightNum;
-  return String(l) == String(r);
+/**
+ * The one equality rule behind ==, != and in: when either side was written
+ * as a quoted literal both compare as text, otherwise numbers compare
+ * numerically and anything else as text
+ */
+function valuesEqual(left: Operand, right: Operand): boolean {
+  const l = left.value === undefined ? null : left.value;
+  const r = right.value === undefined ? null : right.value;
+  if (!left.quoted && !right.quoted) {
+    const leftNum = numericOf(l);
+    const rightNum = numericOf(r);
+    if (leftNum !== null && rightNum !== null) return leftNum === rightNum;
+  }
+  return safeString(l) === safeString(r);
 }
 
 /**
@@ -318,8 +414,8 @@ function tryEvaluateComparison(
   const split = splitComparison(expr);
   if (split === null) return null;
 
-  const left = resolveValue(split.left, variables);
-  const right = resolveValue(split.right, variables);
+  const left = readOperand(split.left, variables);
+  const right = readOperand(split.right, variables);
 
   switch (split.op) {
     case "==":
@@ -327,7 +423,7 @@ function tryEvaluateComparison(
     case "!=":
       return !valuesEqual(left, right);
     default:
-      return evaluateNumericComparison(left, right, split.op);
+      return evaluateNumericComparison(left.value, right.value, split.op);
   }
 }
 
@@ -344,7 +440,7 @@ function evaluateNumericComparison(
 
   if (leftNum === null || rightNum === null) {
     throw new TypeError(
-      `Cannot use operator '${op}' with non-numeric values: ${JSON.stringify(left)} ${op} ${JSON.stringify(right)}`,
+      `Cannot use operator '${op}' with non-numeric values: ${describeOperand(left)} ${op} ${describeOperand(right)}`,
       1,
       1,
       "Use isNumber check first: {{IF age isNumber AND age > 18}}"
@@ -365,6 +461,232 @@ function evaluateNumericComparison(
   }
 }
 
+/**
+ * Split on the first whitespace-delimited operator word that matches the
+ * pattern, found outside quotes, brackets and parentheses
+ */
+function splitOnWord(
+  expr: string,
+  pattern: RegExp
+): { word: string; left: string; right: string } | null {
+  let depth = 0;
+  let quoteChar: string | null = null;
+
+  for (let i = 0; i < expr.length; i++) {
+    const char = expr[i];
+
+    if (quoteChar !== null) {
+      if (char === quoteChar && expr[i - 1] !== "\\") quoteChar = null;
+      continue;
+    }
+    if (char === '"' || char === "'") {
+      quoteChar = char;
+      continue;
+    }
+    if (char === "(" || char === "[") depth++;
+    if (char === ")" || char === "]") depth--;
+    if (depth !== 0 || !/\s/.test(char)) continue;
+
+    const match = expr.slice(i).match(pattern);
+    if (match) {
+      return {
+        word: match[1].toLowerCase().replace(/\s+/g, " "),
+        left: expr.slice(0, i).trim(),
+        right: expr.slice(i + match[0].length).trim(),
+      };
+    }
+  }
+
+  return null;
+}
+
+/**
+ * Split on the first `in` or `not in` (any case) outside quotes, brackets
+ * and parentheses
+ */
+export function splitMembership(
+  expr: string
+): { op: "in" | "not in"; left: string; right: string } | null {
+  const split = splitOnWord(expr, /^\s+(not\s+in|in)\s+/i);
+  if (split === null) return null;
+  return {
+    op: split.word === "in" ? "in" : "not in",
+    left: split.left,
+    right: split.right,
+  };
+}
+
+/**
+ * Split on the first `between` (any case) outside quotes, brackets and
+ * parentheses
+ */
+export function splitBetween(
+  expr: string
+): { left: string; right: string } | null {
+  const split = splitOnWord(expr, /^\s+(between)\s+/i);
+  return split === null ? null : { left: split.left, right: split.right };
+}
+
+/**
+ * The items of a list literal such as [a, "b", 3], each trimmed, or null
+ * when the text is not one list: a missing bracket, a nested bracket, an
+ * empty item or text after the closing bracket. [] is the empty list.
+ */
+function parseListLiteral(text: string): string[] | null {
+  const list = text.trim();
+  if (list.length < 2 || !list.startsWith("[") || !list.endsWith("]")) {
+    return null;
+  }
+
+  const items: string[] = [];
+  let quoteChar: string | null = null;
+  let start = 1;
+
+  for (let i = 1; i < list.length; i++) {
+    const char = list[i];
+    if (quoteChar !== null) {
+      if (char === quoteChar && list[i - 1] !== "\\") quoteChar = null;
+      continue;
+    }
+    if (char === '"' || char === "'") {
+      quoteChar = char;
+      continue;
+    }
+    if (char === "[") return null;
+    if (char === "]" && i !== list.length - 1) return null;
+    if (char === "," || char === "]") {
+      items.push(list.slice(start, i).trim());
+      start = i + 1;
+    }
+  }
+
+  if (quoteChar !== null) return null;
+  if (items.length === 1 && items[0] === "") return [];
+  return items.includes("") ? null : items;
+}
+
+function isScalar(value: TemplateValue): boolean {
+  return (
+    typeof value === "string" ||
+    typeof value === "number" ||
+    typeof value === "boolean"
+  );
+}
+
+/**
+ * Try to evaluate `x in right` and `x not in right`; the right side is a
+ * list literal, a list variable or a text
+ */
+function tryEvaluateMembership(
+  expr: string,
+  variables: VariableMap
+): boolean | null {
+  const split = splitMembership(expr);
+  if (split === null) return null;
+
+  const left = readOperand(split.left, variables);
+
+  let items: Operand[] | null = null;
+  let text: string | null = null;
+  if (split.right.startsWith("[")) {
+    const written = parseListLiteral(split.right);
+    if (written === null) throw unrecognizedCondition(expr);
+    items = written.map((item) => readOperand(item, variables));
+  } else {
+    const right = readOperand(split.right, variables).value;
+    if (Array.isArray(right)) {
+      items = right.map((value) => ({ value, quoted: false }));
+    } else if (typeof right === "string") {
+      text = right;
+    } else if (right != null) {
+      throw new TypeError(
+        `Cannot use '${split.op}' with a right side that is not a list or text: ${describeOperand(right)}`,
+        1,
+        1,
+        "Use a list such as [\"a\", \"b\"], a list variable or a text"
+      );
+    }
+  }
+
+  const found = isMember(left, items, text, split.op);
+  return split.op === "in" ? found : !found;
+}
+
+/**
+ * True when the left operand is in the list or text; missing data (a null
+ * left side or no right side) is not a member
+ */
+function isMember(
+  left: Operand,
+  items: Operand[] | null,
+  text: string | null,
+  op: string
+): boolean {
+  if (items === null && text === null) return false;
+  if (left.value == null) return false;
+  if (!isScalar(left.value)) {
+    throw new TypeError(
+      `Cannot use '${op}' with a left side that is not a text, number or boolean: ${describeOperand(left.value)}`,
+      1,
+      1,
+      "Test one value at a time, for example inside a FOR loop"
+    );
+  }
+
+  if (text !== null) return text.includes(safeString(left.value));
+  return (items ?? []).some(
+    (item) => isScalar(item.value) && valuesEqual(left, item)
+  );
+}
+
+/**
+ * Try to evaluate `x between [lo, hi]`: inclusive, numeric
+ */
+function tryEvaluateBetween(
+  expr: string,
+  variables: VariableMap
+): boolean | null {
+  const split = splitBetween(expr);
+  if (split === null) return null;
+
+  const bounds = parseListLiteral(split.right);
+  if (bounds === null || bounds.length !== 2) throw unrecognizedCondition(expr);
+
+  const [value, low, high] = [split.left, ...bounds].map((operand) => {
+    const read = readOperand(operand, variables).value;
+    const number = tryCoerceToNumber(read);
+    if (number === null) {
+      throw new TypeError(
+        `Cannot use 'between' with a non-numeric value: ${describeOperand(read)}`,
+        1,
+        1,
+        "Use isNumber check first: {{IF age isNumber AND age between [18, 65]}}"
+      );
+    }
+    return number;
+  });
+  return value >= low && value <= high;
+}
+
+/**
+ * The built-in .length of an array or a string, as { value }; null when the
+ * built-in does not apply and the segment reads as an ordinary key. A string
+ * that is a JSON object with its own key length gives that key.
+ */
+export function builtInLength(
+  current: TemplateValue
+): { value: TemplateValue } | null {
+  if (Array.isArray(current)) return { value: current.length };
+  if (typeof current === "string") {
+    const object = tryCoerceToObject(current);
+    if (object && Object.prototype.hasOwnProperty.call(object, "length")) {
+      return { value: object.length };
+    }
+    return { value: current.length };
+  }
+  return null;
+}
+
 /**
  * Split on the first string operator (contains, startsWith, endsWith)
  */
@@ -392,11 +714,14 @@ function tryEvaluateStringOp(
   const split = splitStringOp(expr);
   if (split === null) return null;
 
-  const leftValue = resolveValue(split.left, variables);
-  const rightValue = tryCoerceToString(resolveValue(split.right, variables));
+  const left = readOperand(split.left, variables);
+  const right = readOperand(split.right, variables);
+  // A number written without quotes keeps its written text (007, 1.50)
+  const rightValue =
+    right.text !== undefined ? right.text : tryCoerceToString(right.value);
   if (rightValue === null) return false;
 
-  const leftStr = tryCoerceToString(leftValue);
+  const leftStr = tryCoerceToString(left.value);
   if (leftStr === null) return false;
 
   switch (split.op) {
@@ -444,7 +769,7 @@ function tryEvaluateTypeCheck(
   const split = splitTypeCheck(expr);
   if (split === null) return null;
 
-  const value = resolveValue(split.operand, variables);
+  const value = readOperand(split.operand, variables).value;
 
   switch (split.check) {
     case "isEmpty": {
@@ -474,19 +799,27 @@ function tryEvaluateTypeCheck(
 
 /**
  * The value of a literal operand (true, false, null, a number or a quoted
- * string), or null when the operand is not a literal
+ * string), or null when the operand is not a literal. A quoted string is
+ * marked quoted; a number carries its written text.
  */
-export function parseLiteral(expr: string): { value: TemplateValue } | null {
-  if (expr === "true") return { value: true };
-  if (expr === "false") return { value: false };
-  if (expr === "null") return { value: null };
+export function parseLiteral(
+  expr: string
+): { value: TemplateValue; quoted: boolean; text?: string } | null {
+  if (expr === "true") return { value: true, quoted: false };
+  if (expr === "false") return { value: false, quoted: false };
+  if (expr === "null") return { value: null, quoted: false };
 
-  if (/^-?\d+(\.\d+)?$/.test(expr)) return { value: Number(expr) };
+  if (/^-?\d+(\.\d+)?$/.test(expr)) {
+    return { value: Number(expr), quoted: false, text: expr };
+  }
 
   const first = expr[0];
   const last = expr[expr.length - 1];
-  if ((first === `"` && last === `"`) || (first === `'` && last === `'`)) {
-    return { value: expr.substring(1, expr.length - 1) };
+  if (
+    expr.length >= 2 &&
+    ((first === `"` && last === `"`) || (first === `'` && last === `'`))
+  ) {
+    return { value: expr.substring(1, expr.length - 1), quoted: true };
   }
 
   return null;
@@ -518,6 +851,23 @@ export function conditionOperands(condition: string): string[] {
   const comparison = splitComparison(trimmed);
   if (comparison !== null) return [comparison.left, comparison.right];
 
+  const membership = splitMembership(trimmed);
+  if (membership !== null) {
+    if (!membership.right.startsWith("[")) {
+      return [membership.left, membership.right];
+    }
+    const items = parseListLiteral(membership.right);
+    return items === null ? [trimmed] : [membership.left, ...items];
+  }
+
+  const between = splitBetween(trimmed);
+  if (between !== null) {
+    const bounds = parseListLiteral(between.right);
+    return bounds === null || bounds.length !== 2
+      ? [trimmed]
+      : [between.left, ...bounds];
+  }
+
   const stringOp = splitStringOp(trimmed);
   if (stringOp !== null) return [stringOp.left, stringOp.right];
 
@@ -636,6 +986,14 @@ function resolveValue(expr: string, variables: VariableMap): TemplateValue {
   for (let i = 1; i < path.length; i++) {
     if (current == null) return null;
 
+    if (path[i] === "length") {
+      const built = builtInLength(current);
+      if (built) {
+        current = built.value;
+        continue;
+      }
+    }
+
     // Parse as JSON if the variable is a string
     if (typeof current === "string") {
       let parsed: TemplateValue = tryCoerceStringForPathSegment(
@@ -791,7 +1149,7 @@ function tokenizeMath(
     const num = tryCoerceToNumber(value);
     if (num === null) {
       throw new TypeError(
-        `Cannot use non-numeric value in math expression: ${varName} = ${JSON.stringify(value)}`,
+        `Cannot use non-numeric value in math expression: ${varName} = ${describeOperand(value)}`,
         1,
         1,
         "Ensure all variables in math expressions are numbers"
diff --git a/core/src/interpreter.ts b/core/src/interpreter.ts
index 5001048..f969922 100644
--- a/core/src/interpreter.ts
+++ b/core/src/interpreter.ts
@@ -31,6 +31,7 @@ import {
   tryCoerceStringForPathSegment,
 } from "./coercion";
 import {
+  builtInLength,
   DivisionByZeroError,
   evaluateCondition,
   evaluateMathExpression,
@@ -676,6 +677,14 @@ export class Interpreter {
     for (let i = 1; i < path.length; i++) {
       if (current == null) return null;
 
+      if (path[i] === "length") {
+        const built = builtInLength(current);
+        if (built) {
+          current = built.value;
+          continue;
+        }
+      }
+
       // Try JSON parsing if string
       if (typeof current === "string") {
         const parsed = tryCoerceStringForPathSegment(current, path[i]);
diff --git a/core/src/spec.ts b/core/src/spec.ts
index d060adb..40e214b 100644
--- a/core/src/spec.ts
+++ b/core/src/spec.ts
@@ -137,6 +137,10 @@ const OPERATORS = [
   "AND",
   "OR",
   "NOT",
+  "in",
+  "not in",
+  "between",
+  ".length",
 ];
 
 /**
diff --git a/docs/living/architecture/language-contract.md b/docs/living/architecture/language-contract.md
index dcd181f..64f1cd7 100644
--- a/docs/living/architecture/language-contract.md
+++ b/docs/living/architecture/language-contract.md
@@ -60,3 +60,15 @@ Nine filters in `filters-collection.ts` (`COLLECTION_FILTERS`), in this order: `
 - **Hyphens in names.** A hyphen with an ASCII letter on both sides is part of one name (`first-name`, `user.first-name`, `a-b + 1` reads the key `a-b`); `a - b`, `a -b`, `n-1`, `x1-y` and `1-a` are arithmetic. A missing hyphenated name in strict mode is a `missing-variable` error whose suggestion shows the spaced form. `analyze` lists a hyphenated name as one variable. Applies in `render` and `resolveTemplate`.
 - **Malformed math.** A malformed expression, whatever the data holds (so `total * ` errors whether or not `total` exists) (`(1 + 2`, `1 +`, `1 + * 2`, `2 $ 3`) is a located `type-error` in lenient mode too, instead of empty output. A well-formed expression that names a missing or non-numeric variable stays missing data: empty in lenient mode. The error never replaces an existing key, and a missing name with an odd character (`a:b`, `Order #`) is plain missing data, not math. Applies in both entry points.
 - **Unprintable output.** A value with no text form (a cyclic object or array, a BigInt) used as output, as a CASE subject or before a filter that turns its input into text (every filter except `default` and the collection filters that keep a value: `length first last sort unique slice json`, so `xs | length` still counts, while `lines` and `join` check) is a `type-error` located at the variable or CASE node, in every mode; `null` and missing still print as empty. Applies in both entry points.
+
+## Condition operators
+
+Conditions are the same in `render` and `resolveTemplate`. Strict mode governs missing data only, and a condition never raises a missing-variable error (a missing name reads as null). Every error is a `type-error` located at the IF, ELSEIF or LIST_ITEM; a cyclic value or a BigInt as an operand is a located error or a normal result, never a raw exception.
+
+- **in, not in.** `x in ["a", y, 3]`, `x in list_var`, `x in "text"`; the words are case-insensitive. A list literal holds operands (literals or variable paths) separated by commas outside quotes; `[]` is empty, while an empty item, a nested `[` or a missing `]` is an error. Against an array, true when an element equals x by the equality rule below (array, object and BigInt elements never match); against a text (quoted or from a variable), a case-sensitive substring test, so an empty x is contained and a text holding JSON is still only a text. A missing or null x, or a missing or null right side, gives false (`not in`: true). A right side that is a number, a boolean or an object, and a left side that is an array, an object or a BigInt, is a `type-error`. `not in` is exactly the negation of `in`.
+- **between.** `x between [lo, hi]`: exactly two operands, each read as a number the way `>` reads them; inclusive at both ends; `lo` above `hi` is false. A non-numeric or missing operand, a list that is not two items and a right side that is not a list literal are a `type-error`. There is no `not between`.
+- **Precedence.** `in`, `not in` and `between` split at the tier of `contains`: after AND, OR, NOT and the comparison operators, before type checks, outside quotes, brackets and parentheses, so `NOT x in [..]`, `a in [..] AND b` and `(a) OR (b between [1, 2])` need no extra rule. Chaining two operators (`a in b == c`) is an error. An operator word inside quotes never splits.
+- **.length.** A path segment `length` after any value: an array gives its element count; a text gives its UTF-16 code units (as the `length` filter does, so one emoji is 2) unless it is a JSON object text with its own key `length`; an object with its own key `length` returns that key's value, null included. Any other value, and any missing data, stays null (no zero). Works in conditions, output, math, CASE subjects and after other segments (`user.tags.length`, `items.0.length`); a root variable named `length` is an ordinary variable.
+- **Equality.** `==` and `!=`: when either side is a quoted literal both sides compare as text (`z == "01234"` is false for 1234, `"1.0" == 1` is false); otherwise numbers compare numerically and anything else as text, as before. `in` list items follow the same rule. For `contains`, `startsWith` and `endsWith` an unquoted number on the right keeps its written text (`x contains 1.50`, `007`).
+- **Unknown words.** An operand that is not a literal, not a variable key and holds whitespace outside quotes (`a == b c`, `a like b`, `a matches /x/`) is an "Unrecognized condition" error in every mode, also in a branch that AND or OR would skip; `matches` is not an operator and no pattern in a template is ever compiled.
+- **spec and analyze.** `spec().operators` lists `in`, `not in`, `between` and `.length` after the existing operators. `analyze` records the variables in the left side, the list items or right side, the bounds and the root of a `.length` path (path text as written); a malformed condition is an `unrecognized-condition` diagnostic.
diff --git a/docs/living/architecture/modules/template-resolver.md b/docs/living/architecture/modules/template-resolver.md
index 37eab81..7c2caae 100644
--- a/docs/living/architecture/modules/template-resolver.md
+++ b/docs/living/architecture/modules/template-resolver.md
@@ -137,6 +137,7 @@ Order tried by `evaluateCondition`: `NOT(...)` wrapper, outer parentheses, then
 - `AND`, `OR`, `NOT(` are uppercase, space-delimited and matched only outside parentheses (for `AND`/`OR`) [src: nodes/TemplateResolver/expressions.ts:138-156]
 - Comparison `== != >= <= > <` found left to right outside quotes; `==` and `!=` compare `String(left)` and `String(right)`; ordering operators coerce both sides to numbers and throw `TypeError` if either is not numeric [src: nodes/TemplateResolver/expressions.ts:182-238] [src: nodes/TemplateResolver/expressions.ts:243-272]
 - String operators `contains`, `startsWith`, `endsWith` (regex flag `i`); the right side is a literal with outer quotes stripped, not a variable; a left side that is `null` yields `false` [src: nodes/TemplateResolver/expressions.ts:277-306]
+- `in`, `not in` and `between [lo, hi]` split at the tier of the string operators, after comparison and before type checks, outside quotes, brackets and parentheses (`splitMembership`, `splitBetween`, shared by `evaluateCondition` and `conditionOperands`, so `analyze` reads the same operands); `.length` is one helper (`builtInLength`) used by both path walkers (`resolveValue` here and `resolveNestedPath` in `interpreter.ts`). A quoted literal side makes `==`, `!=` and `in` compare as text; an unquoted number right of `contains` keeps its written text; every operand with bare whitespace outside quotes is an "Unrecognized condition" `type-error` in every mode, checked before evaluation so a short-circuited branch cannot hide it. Rules: [language contract](../language-contract.md#condition-operators)
 - Type checks `isEmpty`, `isNotEmpty`, `isArray`, `isNumber`, `isObject`, `isBoolean` as a trailing word [src: nodes/TemplateResolver/expressions.ts:311-359]
 - Operand resolution: literals `true`, `false`, `null`, numbers and quoted strings; otherwise a dotted path over the variable map where string intermediates are `JSON.parse`d and a missing name yields `undefined` rather than an error [src: nodes/TemplateResolver/expressions.ts:364-416]. Conditions therefore never raise `MissingVariableError`. [src: nodes/TemplateResolver/expressions.ts:364-416]
 - `isTruthy`: `null`/`undefined` false; strings trimmed and lowercased, false for `""`, `false`, `0`, `no`, true otherwise; numbers non-zero; booleans as is; arrays non-empty; objects with keys [src: nodes/TemplateResolver/expressions.ts:26-53]. The doc comment above it also lists `null`, `undefined` and `none` as falsy strings, which the body does not implement [src: nodes/TemplateResolver/expressions.ts:17-18] [src: nodes/TemplateResolver/expressions.ts:33] [open: Q5]
```

## Gate run

Gate command green at commit 8259664d71be (2275 tests).

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
