---
type: review-packet
card: 261015-language3911-a6-make-math-and-output-errors-visible
tier: product
built_at: 2026-10-15T04:08:24.375Z
base: 0cf253d3f419553c6c3b4828937721ba31cf133d
head: a7012a33345689a698a71cb167d9e388948d19c2
read_at: a7012a33345689a698a71cb167d9e388948d19c2
frozen: true
brief_sha256: d1de6242181c459b970e316d87c8ec2b9a4c1cd60e23f4fbb40c1623e015d8e4
manifest_sha256: 39bc8291e25a98e75f4f924cdf5180ae613c86c468e522a8a810c926edbb9c7b
criteria_sha256: cf6f98e6af8250be4ba880fcfd67ac8a9c52d511b55b69bc84c17c3deb4a8277
scope_sha256: bbbe422c10a11c3bd386070fbb956b3283dc067cf93956af8b16b2bedaa0c902
diff_sha256: 8140be8e90d5f089ef221e6c39556acafc550f91cd70328bc42d892edbce5fde
omitted_paths: 7
criteria_count: 5
must_not_count: 4
---

# Review packet: 261015-language3911-a6-make-math-and-output-errors-visible

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: math and output mistakes stop being silent: division or modulo by zero, a malformed math expression and a cyclic value end render with a located error in every mode, results print without binary float noise and a hyphen between two letters is part of a name. Division by zero and float printing apply in render only; resolveTemplate keeps its outputs for them.

### Criteria

- c1 (verify: test): mt-zero: /0 and %0 are a type-error located at the variable in render (resolveTemplate keeps printing Infinity as before)
- c2 (verify: test): mt-float: arithmetic results print with at most 15 significant digits (0.1+0.2 prints 0.3; 1/3 keeps its digits; integers and negative numbers print unchanged)
- c3 (verify: test): mt-hyphen: a hyphen with a letter on both sides is part of one name, a - b and n-1 stay arithmetic, and a missing hyphenated name suggests the spaced form
- c4 (verify: test): mt-lenient: a malformed math expression fails render in lenient mode too, with a located diagnostic instead of empty output
- c5 (verify: test): mt-cyclic: a cyclic or unprintable value used as output is a type-error located at the variable instead of ok true with empty text

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
Card goal: math and output mistakes stop being silent: division or modulo by zero, a malformed math expression and a cyclic value end render with a located error in every mode, results print without binary float noise and a hyphen between two letters is part of a name. Division by zero and float printing apply in render only; resolveTemplate keeps its outputs for them.
Must not:
- change any existing test expectation
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Questions

goal-critical: does any path still turn a malformed math expression, a division or modulo by zero (in render) or an unprintable value into ok true with empty text, in strict or lenient mode?
goal-critical: do resolveTemplate outputs for `/0` (Infinity) and float printing stay exactly as before, and does render alone apply them?
goal-critical: is the hyphen rule exactly letter-hyphen-letter (a - b, n-1, x1-y stay arithmetic) in the tokenizer, mathVariableNames and isMathExpression, with analyze agreeing with render?
goal-critical: is each error located at the variable (or the CASE or ternary node) rather than 1:1?
polish: is the render-only flag a single option, and is the added code small without duplicated math checks?

## Rubric

- each criterion is met by the diff and its test
- the card scope is respected (expressions, interpreter, render, errors and the math test file)
- unknown names, operators and filters are still errors in every mode

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
```

### spec.md as of base 0cf253d3f419, read at a7012a333456

```
# Spec

## Acceptance criteria

- mt-zero: in `render`, a math expression that divides (`/`) or takes a remainder (`%`) by zero is a `type-error` located at the variable, in strict and lenient mode alike (`${{x / 0}}`, `${{x % zero}}`, `${{0 / 0}}`, a zero from a sub-expression such as `${{x / (a - a)}}`); `resolveTemplate` keeps printing `Infinity` / `NaN` as before
- mt-float: in `render`, an arithmetic result prints with at most 15 significant digits (`${{0.1 + 0.2}}` prints `0.3`, `${{x * 3}}` with 1.1 prints `3.3`; `1/3` prints `0.333333333333333`; integers, negative numbers and large integers print unchanged); `resolveTemplate` keeps its old `String(result)`
- mt-hyphen: in math and plain paths, a hyphen with an ASCII letter on both sides is part of one name (`${{first-name}}`, `${{user.first-name + 1}}`, `${{a-b}}` read the key `a-b`); `a - b`, `a -b`, `n-1`, `x1-y`, `1-a` stay arithmetic; a missing hyphenated name in strict mode is a `missing-variable` error whose suggestion names the spaced form (`a - b`); `analyze` reports the hyphenated name as one variable
- mt-lenient: a malformed math expression (`${{(1 + 2}}`, `${{1 + }}`, `${{1 + * 2}}`, `${{2 $ 3}}`) is a located `type-error` in lenient mode too, in `render` and in `resolveTemplate`; a missing variable in a well-formed math expression stays lenient (empty output); unknown names/filters stay errors in every mode
- mt-cyclic: a value that has no printable form (a cyclic object or array, a BigInt) used as output (`${{x}}`, a CASE subject, after filters that keep it) is a `type-error` located at the variable (or the CASE node), in render and in resolveTemplate, instead of ok true with empty text; null and undefined still print as empty

## Interface

- No new public names. `evaluateMathExpression(expression, variables, options?)` gains an optional third argument `{ zeroIsError?: boolean }` (default false: today's behavior). `Interpreter` options gain `render?: boolean` (default false); `render()` passes `render: true`, `resolveTemplate` does not. With `render` true the interpreter calls math with `zeroIsError` and prints math results with 15 significant digits.
- `core/src/expressions.ts` exports `formatNumber(n: number): string` (`Number(n.toPrecision(15))` printed with `String`; non-finite numbers via `String`), a `DivisionByZeroError` (a `TypeError` subclass defined there, so the interpreter can let it through the math try/catch), and the hyphen rule helper used by the tokenizer, `mathVariableNames` and `isMathExpression` (a hyphen is part of a name when the characters on both sides are ASCII letters).
- `core/src/errors.ts`: `MissingVariableError` takes an optional fifth constructor argument `hint` appended to its suggestion on its own line; the interpreter passes the spaced-form hint when the root key holds a letter-hyphen-letter and no whitespace.
- The interpreter's private `isMathExpression` is replaced by the exported one; `valueToString` throws `TypeError` (located by the existing `at` wrappers) when a non-null value has no text form.

## Decisions

- Only mt-zero and mt-float are render-only (settled with the human: resolveTemplate outputs for `/0` and float printing stay). mt-hyphen, mt-lenient and mt-cyclic turn silent outputs into errors and apply in both entry points; if an existing test pins the old output, gate that change behind `render` and report it.
- A malformed math error is not swallowed in lenient mode: after the math attempt fails with a `MathSyntaxError`, the lenient fallback path lookup must not turn it into empty text. Non-numeric or missing variables inside math are missing data and keep the current behavior.
- The existing console logging of swallowed math errors, if any, is not part of this card.
```

### card.md as of base 0cf253d3f419, read at a7012a333456

```
# Make math and output errors visible

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Math and output mistakes stop being silent: division or modulo by zero, a malformed math expression and a cyclic value end render with a located error in every mode, results print without binary float noise and a hyphen between two letters is part of a name. All in render only: resolveTemplate keeps its outputs.

## Must-haves

- `contract` `mt-zero` /0 and %0 are a type-error located at the variable in render (resolveTemplate keeps printing Infinity as before)
- `contract` `mt-float` arithmetic results print with at most 15 significant digits (0.1+0.2 prints 0.3; 1/3 keeps its digits; integers and negative numbers print unchanged)
- `contract` `mt-hyphen` a hyphen with a letter on both sides is part of one name, a - b and n-1 stay arithmetic, and a missing hyphenated name suggests the spaced form
- `contract` `mt-lenient` a malformed math expression fails render in lenient mode too, with a located diagnostic instead of empty output
- `contract` `mt-cyclic` a cyclic or unprintable value used as output is a type-error located at the variable instead of ok true with empty text

## Acceptance criteria

- mt-zero: /0 and %0 are a type-error located at the variable in render (resolveTemplate keeps printing Infinity as before)
- mt-float: arithmetic results print with at most 15 significant digits (0.1+0.2 prints 0.3; 1/3 keeps its digits; integers and negative numbers print unchanged)
- mt-hyphen: a hyphen with a letter on both sides is part of one name, a - b and n-1 stay arithmetic, and a missing hyphenated name suggests the spaced form
- mt-lenient: a malformed math expression fails render in lenient mode too, with a located diagnostic instead of empty output
- mt-cyclic: a cyclic or unprintable value used as output is a type-error located at the variable instead of ok true with empty text

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

No new public names. Render-only behaviour changes; resolveTemplate outputs stay (the existing tests that pin Infinity and the old ?? keep passing). Document the render-only divergence in the module page and the language contract.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `tests/language/math.test.ts` | add | template-resolver |
| `core/src/errors.ts` | edit | template-resolver |
| `core/src/expressions.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/render.ts` | edit | template-resolver |

Files scope: `core/src/errors.ts`, `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/render.ts`, `tests/language/math.test.ts`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: `tests/language/math.test.ts`
- remove: none
- edit: `core/src/errors.ts`, `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/render.ts`
- files_scope: `core/src/errors.ts`, `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/render.ts`, `tests/language/math.test.ts`

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

These test files are shown as committed at a7012a333456, the commit the contract is read at; the diff starts at base 0cf253d3f419, so a file added or changed since then is in the diff too. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/language/math.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TemplateError } from "../../core/src";
import { analyze } from "../../core/src/analyze";
import { render } from "../../core/src/render";
import { resolveTemplate } from "../../core/src/resolve";
import { check } from "../headless/http-helpers";

type Entry = "render-strict" | "render-lenient" | "resolve-strict" | "resolve-lenient";
const ENTRIES: Entry[] = ["render-strict", "render-lenient", "resolve-strict", "resolve-lenient"];
const RENDERS: Entry[] = ["render-strict", "render-lenient"];
const RESOLVES: Entry[] = ["resolve-strict", "resolve-lenient"];

interface Outcome {
  /** "ok" or the diagnostic code; "threw:<name>" for an exception that is not a TemplateError */
  code: string;
  line?: number;
  column?: number;
  severity?: string;
  suggestion?: string;
  output?: string;
}

function run(entry: Entry, template: string, data: Record<string, any>): Outcome {
  const strictMode = entry.endsWith("strict");
  try {
    if (entry.startsWith("render")) {
      const r = render(template, data, { strictMode });
      if (r.ok) return { code: "ok", output: r.output };
      const d = r.diagnostics[0];
      return { code: d.code, line: d.line, column: d.column, severity: d.severity, suggestion: d.suggestion, output: r.output };
    }
    const out = resolveTemplate(template, new Map(Object.entries(data)), { strictMode });
    return { code: "ok", output: out };
  } catch (e) {
    if (e instanceof TemplateError) {
      return { code: e.code, line: e.line, column: e.column, severity: "error", suggestion: e.suggestion };
    }
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}` };
  }
}

/** The variable sits on line 2, column 3, so a default location of 1:1 fails the row. */
const at = (tag: string) => `first line\n  ${tag}`;
const LOCATION = { line: 2, column: 3 };

function expectLocatedTypeError(entry: Entry, o: Outcome, what: string): void {
  check(o.code, `${entry}: ${what} is a type-error`).toBe("type-error");
  check(o.severity, `${entry}: ${what} has severity error`).toBe("error");
  check({ line: o.line, column: o.column }, `${entry}: ${what} is located at the variable`).toEqual(LOCATION);
}

describe("mt-zero: division and modulo by zero are located errors in render only", () => {
  const data = { x: 5, a: 2, zero: 0 };
  const errorRows = [
    { expr: "x / 0", old: "Infinity" },
    { expr: "x % 0", old: "NaN" },
    { expr: "x / zero", old: "Infinity" },
    { expr: "0 / 0", old: "NaN" },
    { expr: "x / (a - a)", old: "Infinity" },
    { expr: "10 % 0", old: "NaN" },
  ];
  it.each(RENDERS.flatMap((entry) => errorRows.map((r) => ({ entry, ...r }))))("mt-zero: [$entry] ${{$expr}} is a type-error at the variable", (c) => {
    expectLocatedTypeError(c.entry, run(c.entry, at("${{" + c.expr + "}}"), data), c.expr);
  });

  it.each(RESOLVES.flatMap((entry) => errorRows.map((r) => ({ entry, ...r }))))("mt-zero: [$entry] resolveTemplate keeps printing $old for ${{$expr}}", (c) => {
    const o = run(c.entry, at("${{" + c.expr + "}}"), data);
    check(o.code, `${c.entry}: resolveTemplate does not fail`).toBe("ok");
    check(o.output, `${c.entry}: the old output ${c.old} is kept`).toContain(c.old);
  });

  const okRows = [
    { expr: "x / 4", out: "1.25" },
    { expr: "x % 3", out: "2" },
    { expr: "x / a", out: "2.5" },
  ];
  it.each(RENDERS.flatMap((entry) => okRows.map((r) => ({ entry, ...r }))))("mt-zero: [$entry] a nonzero divisor still computes ${{$expr}}", (c) => {
    const o = run(c.entry, "${{" + c.expr + "}}", data);
    check(o.code, `${c.entry}: ok`).toBe("ok");
    check(o.output, `${c.entry}: the computed value`).toBe(c.out);
  });

  it("mt-zero: a zero error stops the render with ok false and a diagnostic, never an exception", () => {
    const r = render(at("${{x / 0}}"), data, { strictMode: false });
    check(r.ok, "render is not ok").toBe(false);
    check(r.diagnostics.length > 0, "a diagnostic is reported").toBe(true);
  });
});

describe("mt-float: arithmetic prints with at most 15 significant digits in render only", () => {
  const rows = [
    { expr: "0.1 + 0.2", data: {}, out: "0.3" },
    { expr: "x * 3", data: { x: 1.1 }, out: "3.3" },
    { expr: "1 / 3", data: {}, out: "0.333333333333333" },
    { expr: "2 / 3", data: {}, out: "0.666666666666667" },
    { expr: "10 / 4", data: {}, out: "2.5" },
    { expr: "7 - 10", data: {}, out: "-3" },
    { expr: "0.1 * 3", data: {}, out: "0.3" },
    { expr: "1000000 * 1000000", data: {}, out: "1000000000000" },
    { expr: "-0.5 * 2", data: {}, out: "-1" },
    { expr: "x + y", data: { x: 0.7, y: 0.1 }, out: "0.8" },
  ];
  it.each(RENDERS.flatMap((entry) => rows.map((r) => ({ entry, ...r }))))("mt-float: [$entry] ${{$expr}} prints $out", (c) => {
    const o = run(c.entry, "${{" + c.expr + "}}", c.data);
    check(o.code, `${c.entry}: ok`).toBe("ok");
    check(o.output, `${c.entry}: no binary float noise`).toBe(c.out);
  });

  const keep = [
    { expr: "0.1 + 0.2", data: {}, out: String(0.1 + 0.2) },
    { expr: "x * 3", data: { x: 1.1 }, out: String(1.1 * 3) },
    { expr: "1 / 3", data: {}, out: String(1 / 3) },
  ];
  it.each(RESOLVES.flatMap((entry) => keep.map((r) => ({ entry, ...r }))))("mt-float: [$entry] resolveTemplate keeps the unrounded $out for ${{$expr}}", (c) => {
    const o = run(c.entry, "${{" + c.expr + "}}", c.data);
    check(o.output, `${c.entry}: resolveTemplate keeps String(result)`).toBe(c.out);
  });
});

describe("mt-hyphen: a hyphen between two ASCII letters is part of the name", () => {
  const data = { "first-name": "Ada", user: { "first-name": "Bo" }, "a-b": 3, a: 10, b: 4, n: 7, x1: 9, y: 1 };
  const rows = [
    { tpl: "${{first-name}}", out: "Ada", why: "a plain hyphenated key" },
    { tpl: "${{user.first-name}}", out: "Bo", why: "a nested hyphenated key" },
    { tpl: "${{a-b + 1}}", out: "4", why: "the hyphenated key a-b in math, not a minus b" },
    { tpl: "${{a - b}}", out: "6", why: "spaces keep a minus" },
    { tpl: "${{a -b}}", out: "6", why: "a hyphen with a space before stays a minus" },
    { tpl: "${{n-1}}", out: "6", why: "a digit after stays a minus" },
    { tpl: "${{x1-y}}", out: "8", why: "a digit before stays a minus" },
    { tpl: "${{a-1}}", out: "9", why: "a letter then a digit stays a minus" },
    { tpl: "${{1-a}}", out: "-9", why: "a digit then a letter stays a minus" },
  ];
  it.each(ENTRIES.flatMap((entry) => rows.map((r) => ({ entry, ...r }))))("mt-hyphen: [$entry] $tpl gives $out ($why)", (c) => {
    const o = run(c.entry, c.tpl, data);
    check(o.code, `${c.entry}: ok`).toBe("ok");
    check(o.output, `${c.entry}: ${c.why}`).toBe(c.out);
  });

  it.each(["render-strict", "resolve-strict"] as Entry[])("mt-hyphen: [%s] a missing hyphenated name is missing-variable with the spaced form in the suggestion", (entry) => {
    const o = run(entry, "${{first-name}}", {});
    check(o.code, `${entry}: missing-variable`).toBe("missing-variable");
    check(o.suggestion ?? "", `${entry}: the suggestion names the spaced form`).toContain("first - name");
  });

  it.each(["render-lenient", "resolve-lenient"] as Entry[])("mt-hyphen: [%s] a missing hyphenated name prints empty in lenient mode", (entry) => {
    const o = run(entry, "${{first-name}}", {});
    check(o.code, `${entry}: ok`).toBe("ok");
    check(o.output, `${entry}: empty text`).toBe("");
  });

  it("mt-hyphen: analyze lists ${{a-b}} as one variable a-b", () => {
    check(analyze("${{a-b}}").variables.map((v) => v.name), "one variable named a-b").toEqual(["a-b"]);
  });

  it("mt-hyphen: analyze lists ${{a - b}} as the two variables a and b", () => {
    check(analyze("${{a - b}}").variables.map((v) => v.name).sort(), "variables a and b").toEqual(["a", "b"]);
  });

  it("mt-hyphen: analyze lists ${{n-1}} as the one variable n", () => {
    check(analyze("${{n-1}}").variables.map((v) => v.name), "variable n").toEqual(["n"]);
  });
});

describe("mt-lenient: a malformed math expression is a located error in lenient mode too", () => {
  const bad = ["(1 + 2", "1 + ", "1 + * 2", "2 $ 3", "(1 + 2))"];
  it.each(ENTRIES.flatMap((entry) => bad.map((expr) => ({ entry, expr }))))("mt-lenient: [$entry] ${{$expr}} is a type-error at the variable", (c) => {
    expectLocatedTypeError(c.entry, run(c.entry, at("${{" + c.expr + "}}"), { x: 1 }), c.expr);
  });

  it.each(["render-lenient", "resolve-lenient"] as Entry[])("mt-lenient: [%s] a well-formed math with a missing variable stays empty", (entry) => {
    const o = run(entry, at("${{missing + 1}}"), {});
    check(o.code, `${entry}: ok, still lenient`).toBe("ok");
    check((o.output ?? "").trim(), `${entry}: only the text before it`).toBe("first line");
  });

  it.each(ENTRIES)("mt-lenient: [%s] an unknown filter stays an error", (entry) => {
    const o = run(entry, "${{x | nosuchfilter}}", { x: 1 });
    check(o.code !== "ok", `${entry}: an error code, not ok`).toBe(true);
    check(o.code.startsWith("threw:"), `${entry}: a coded error, not an exception`).toBe(false);
  });
});

describe("mt-cyclic: a value with no text form is a located error as output", () => {
  const cyclicObject: any = {};
  cyclicObject.self = cyclicObject;
  const cyclicArray: any[] = [];
  cyclicArray.push(cyclicArray);
  const values: Array<{ name: string; value: any }> = [
    { name: "a cyclic object", value: cyclicObject },
    { name: "a cyclic array", value: cyclicArray },
    { name: "a BigInt", value: BigInt(10) },
  ];
  const usages: Array<{ use: string; tpl: string; column?: number }> = [
    { use: "plain output", tpl: "${{c}}", column: 3 },
    { use: "output after a filter that keeps the value (trim)", tpl: "${{c | trim}}", column: 3 },
    { use: "output after the default filter", tpl: '${{c | default="z"}}', column: 3 },
    { use: "a CASE subject", tpl: '{{CASE c}}{{WHEN "x"}}X{{END_WHEN}}{{DEFAULT}}D{{END_DEFAULT}}{{END_CASE}}' },
  ];
  const cases = ENTRIES.flatMap((entry) => values.flatMap((v) => usages.map((u) => ({ entry, ...v, ...u }))));
  it.each(cases)("mt-cyclic: [$entry] $name as $use is a type-error", (c) => {
    const o = run(c.entry, at(c.tpl), { c: c.value });
    check(o.code, `${c.entry}: ${c.name} as ${c.use} is a type-error`).toBe("type-error");
    check(o.severity, `${c.entry}: severity error`).toBe("error");
    check(o.line, `${c.entry}: located on line 2`).toBe(2);
    if (c.column !== undefined) check(o.column, `${c.entry}: located at the variable`).toBe(c.column);
  });

  it.each(ENTRIES)("mt-cyclic: [%s] a cyclic value read inside a FOR body is a type-error", (entry) => {
    const o = run(entry, at("{{FOR xs AS i}}${{i}}{{END_FOR}}"), { xs: [cyclicObject] });
    check(o.code, `${entry}: type-error`).toBe("type-error");
    check(o.line, `${entry}: located on line 2`).toBe(2);
  });

  const printable: Array<{ name: string; value: any; out?: string }> = [
    { name: "null", value: null, out: "" },
    { name: "undefined", value: undefined, out: "" },
    { name: "an empty string", value: "", out: "" },
    { name: "zero", value: 0, out: "0" },
    { name: "false", value: false, out: "false" },
    { name: "a plain object", value: { k: 1 } },
  ];
  it.each(ENTRIES.flatMap((entry) => printable.map((p) => ({ entry, ...p }))))("mt-cyclic: [$entry] $name still prints as before", (c) => {
    const o = run(c.entry, "${{c}}", { c: c.value });
    check(o.code, `${c.entry}: ${c.name} is ok`).toBe("ok");
    if (c.out !== undefined) check(o.output, `${c.entry}: ${c.name} prints ${JSON.stringify(c.out)}`).toBe(c.out);
  });

  it("mt-cyclic: a cyclic value in render returns ok false and a diagnostic, not an exception", () => {
    const r = render(at("${{c}}"), { c: cyclicObject }, { strictMode: false });
    check(r.ok, "render is not ok").toBe(false);
    check(r.diagnostics[0]?.code, "the first diagnostic is a type-error").toBe("type-error");
  });
});
```

## 4. Diff

7 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/core/src/errors.ts b/core/src/errors.ts
index c52f702..e050391 100644
--- a/core/src/errors.ts
+++ b/core/src/errors.ts
@@ -107,13 +107,15 @@ export class MissingVariableError extends TemplateError {
     variableName: string,
     line: number,
     column: number,
-    availableVariables: string[]
+    availableVariables: string[],
+    hint?: string
   ) {
     const message = `Variable '${variableName}' not found`;
-    const suggestion =
+    const base =
       availableVariables.length > 0
         ? `Available variables: ${availableVariables.join(", ")}\nCheck variable name or enable Lenient Mode`
         : "No variables defined. Check variable mappings.";
+    const suggestion = hint === undefined ? base : `${base}\n${hint}`;
     super(message, line, column, suggestion, "missing-variable");
     this.name = "MissingVariableError";
     Object.setPrototypeOf(this, MissingVariableError.prototype);
diff --git a/core/src/expressions.ts b/core/src/expressions.ts
index bc5afc3..04eab31 100644
--- a/core/src/expressions.ts
+++ b/core/src/expressions.ts
@@ -531,7 +531,37 @@ export function conditionOperands(condition: string): string[] {
  * True when the text is an arithmetic expression rather than a plain path
  */
 export function isMathExpression(expr: string): boolean {
-  return /[+\-*/%()]/.test(expr);
+  return (
+    /[+*/%()]/.test(expr) ||
+    [...expr].some((char, i) => char === "-" && !joinsName(expr, i))
+  );
+}
+
+const ASCII_LETTER = /[a-zA-Z]/;
+const NAME_CHAR = /[a-zA-Z0-9_@.]/;
+
+/**
+ * True when the hyphen at index i is part of a name: an ASCII letter sits on
+ * both sides of it (first-name), so a-b is one name while a - b, n-1 and
+ * x1-y are subtractions
+ */
+function joinsName(expr: string, i: number): boolean {
+  return (
+    expr[i] === "-" &&
+    ASCII_LETTER.test(expr[i - 1] ?? "") &&
+    ASCII_LETTER.test(expr[i + 1] ?? "")
+  );
+}
+
+/**
+ * The index just past the name that starts at index start
+ */
+function nameEnd(expr: string, start: number): number {
+  let i = start;
+  while (i < expr.length && (NAME_CHAR.test(expr[i]) || joinsName(expr, i))) {
+    i++;
+  }
+  return i;
 }
 
 /**
@@ -550,14 +580,10 @@ export function mathVariableNames(expr: string): string[] {
       continue;
     }
 
-    let name = "";
-    while (i < expr.length && /[a-zA-Z0-9_@.]/.test(expr[i])) {
-      name += expr[i];
-      i++;
-    }
-    if (name === "") {
-      i++;
-    } else if (!/^[\d.]+$/.test(name)) {
+    const end = nameEnd(expr, i);
+    const name = expr.slice(i, end);
+    i = Math.max(end, i + 1);
+    if (name !== "" && !/^[\d.]+$/.test(name)) {
       names.push(name);
     }
   }
@@ -635,10 +661,43 @@ export function evaluateExpression(
  */
 export function evaluateMathExpression(
   expression: string,
-  variables: VariableMap
+  variables: VariableMap,
+  options?: { zeroIsError?: boolean }
 ): number {
   const tokens = tokenizeMath(expression, variables);
-  return evaluateMathTokens(tokens);
+  return evaluateMathTokens(tokens, options?.zeroIsError ?? false);
+}
+
+/**
+ * Division or modulo by zero where zero is an error (render)
+ */
+export class DivisionByZeroError extends TypeError {
+  constructor(operator: string) {
+    super(
+      `Cannot ${operator === "/" ? "divide" : "take a remainder"} by zero in math expression`,
+      1,
+      1,
+      "Check the divisor is not zero before the math runs"
+    );
+    this.name = "DivisionByZeroError";
+    Object.setPrototypeOf(this, DivisionByZeroError.prototype);
+  }
+}
+
+/**
+ * A math result as text with at most 15 significant digits, so binary float
+ * noise (0.1 + 0.2) does not print
+ */
+export function formatNumber(n: number): string {
+  return Number.isFinite(n) ? String(Number(n.toPrecision(15))) : String(n);
+}
+
+/**
+ * True when the last token ends an operand (a number or a closing parenthesis)
+ */
+function endsOperand(tokens: (number | string)[]): boolean {
+  const last = tokens[tokens.length - 1];
+  return typeof last === "number" || last === ")";
 }
 
 /**
@@ -660,16 +719,12 @@ function tokenizeMath(
       continue;
     }
 
-    // Operators and parentheses
-    if (["+", "-", "*", "/", "%", "(", ")"].includes(char)) {
-      tokens.push(char);
-      i++;
-      continue;
-    }
-
-    // Numbers
-    if (/\d/.test(char) || (char === "-" && /\d/.test(expr[i + 1]))) {
-      let num = "";
+    // Numbers; a minus right before a digit is a sign when no operand precedes it
+    const signed =
+      char === "-" && /\d/.test(expr[i + 1] ?? "") && !endsOperand(tokens);
+    if (/\d/.test(char) || signed) {
+      let num = signed ? "-" : "";
+      i += num.length;
       while (i < expr.length && /[\d.]/.test(expr[i])) {
         num += expr[i];
         i++;
@@ -678,13 +733,18 @@ function tokenizeMath(
       continue;
     }
 
-    // Variables
-    let varName = "";
-    while (i < expr.length && /[a-zA-Z0-9_@.]/.test(expr[i])) {
-      varName += expr[i];
+    // Operators and parentheses
+    if (["+", "-", "*", "/", "%", "(", ")"].includes(char)) {
+      tokens.push(char);
       i++;
+      continue;
     }
 
+    // Variables
+    const end = nameEnd(expr, i);
+    const varName = expr.slice(i, end);
+    i = end;
+
     if (!varName) {
       throw new MathSyntaxError(
         `Unexpected character ${JSON.stringify(char)} in math expression`,
@@ -712,7 +772,10 @@ function tokenizeMath(
 /**
  * Evaluate math tokens with proper operator precedence
  */
-function evaluateMathTokens(tokens: (number | string)[]): number {
+function evaluateMathTokens(
+  tokens: (number | string)[],
+  zeroIsError: boolean
+): number {
   // Handle parentheses first
   while (tokens.includes("(")) {
     const openIdx = tokens.lastIndexOf("(");
@@ -723,7 +786,7 @@ function evaluateMathTokens(tokens: (number | string)[]): number {
     }
 
     const subTokens = tokens.slice(openIdx + 1, closeIdx);
-    const result = evaluateMathTokens(subTokens);
+    const result = evaluateMathTokens(subTokens, zeroIsError);
 
     tokens.splice(openIdx, closeIdx - openIdx + 1, result);
   }
@@ -735,6 +798,10 @@ function evaluateMathTokens(tokens: (number | string)[]): number {
       const left = tokens[i - 1] as number;
       const right = tokens[i + 1] as number;
 
+      if (zeroIsError && op !== "*" && right === 0) {
+        throw new DivisionByZeroError(op);
+      }
+
       let result: number;
       switch (op) {
         case "*":
diff --git a/core/src/interpreter.ts b/core/src/interpreter.ts
index 623e7b9..945bc4c 100644
--- a/core/src/interpreter.ts
+++ b/core/src/interpreter.ts
@@ -27,14 +27,18 @@ import {
 } from "./errors";
 import {
   tryCoerceToArray,
+  tryCoerceToString,
   tryCoerceStringForPathSegment,
 } from "./coercion";
 import {
+  DivisionByZeroError,
   evaluateCondition,
   evaluateMathExpression,
+  formatNumber,
+  isMathExpression,
   isTruthy,
 } from "./expressions";
-import { applyFilters, fenced, checkFenceLang, valueToText } from "./filters";
+import { applyFilters, fenced, checkFenceLang } from "./filters";
 
 /**
  * Interpreter: Walks AST and produces output string
@@ -55,15 +59,17 @@ import { applyFilters, fenced, checkFenceLang, valueToText } from "./filters";
 export class Interpreter {
   private strictMode: boolean;
   private limits: Limits;
+  private render: boolean;
   private iterations = 0;
   private omittedSections = 0;
   private loopContext: Map<string, TemplateValue> = new Map();
 
   constructor(
     private variables: VariableMap,
-    options?: { strictMode?: boolean; limits?: Partial<Limits> }
+    options?: { strictMode?: boolean; limits?: Partial<Limits>; render?: boolean }
   ) {
     this.strictMode = options?.strictMode ?? true;
+    this.render = options?.render ?? false;
     this.limits = withDefaultLimits(options?.limits);
   }
 
@@ -187,26 +193,29 @@ export class Interpreter {
     // Check if this is a math expression (contains operators)
     const pathStr = node.path.join(".");
     let mathError: unknown = null;
-    if (this.isMathExpression(pathStr)) {
+    if (isMathExpression(pathStr) || hasStrayCharacter(pathStr)) {
       try {
-        const result = evaluateMathExpression(pathStr, this.getAllVariables());
-        return String(result);
+        const result = evaluateMathExpression(pathStr, this.getAllVariables(), {
+          zeroIsError: this.render,
+        });
+        return this.render ? formatNumber(result) : String(result);
       } catch (error) {
+        if (error instanceof DivisionByZeroError) throw error;
         // Not a valid math expression, continue with normal resolution
         mathError = error;
       }
     }
 
     const allowUndefined = node.defaultValue !== undefined;
-    let value: TemplateValue;
+    let value: TemplateValue = null;
+    let lookupError: unknown = null;
     try {
       value = this.resolveNestedPath(node.path, allowUndefined);
     } catch (error) {
-      const unparseableMath =
-        error instanceof MissingVariableError &&
-        mathError instanceof MathSyntaxError;
-      throw unparseableMath ? mathError : error;
+      lookupError = error;
     }
+    if (isUnparseableMath(mathError, value, lookupError)) throw mathError;
+    if (lookupError !== null) throw lookupError;
 
     // Apply default operator if value is falsy
     if (node.defaultValue !== undefined && !isTruthy(value)) {
@@ -215,22 +224,13 @@ export class Interpreter {
 
     // Apply filters
     if (node.filters && node.filters.length > 0) {
+      this.valueToString(value); // text filters would turn an unprintable value into ""
       value = applyFilters(value, node.filters) as TemplateValue;
     }
 
     return this.valueToString(value);
   }
 
-  /**
-   * Check if expression is a math expression
-   */
-  private isMathExpression(expr: string): boolean {
-    // Contains math operators but isn't just a path
-    const hasMathOp = /[+\-*/%]/.test(expr);
-    const hasParens = /[()]/.test(expr);
-    return hasMathOp || hasParens;
-  }
-
   /**
    * Visit IF node
    */
@@ -258,10 +258,9 @@ export class Interpreter {
    * Visit CASE node
    */
   private visitCase(node: CaseNode): string {
-    const value = this.at(node, () =>
-      this.resolveNestedPath(node.expression.split("."))
+    const valueStr = this.at(node, () =>
+      this.valueToString(this.resolveNestedPath(node.expression.split(".")))
     );
-    const valueStr = this.valueToString(value);
 
     // Check WHEN clauses
     for (const whenNode of node.cases) {
@@ -647,7 +646,8 @@ export class Interpreter {
           rootKey,
           1,
           1,
-          Array.from(this.variables.keys())
+          Array.from(this.variables.keys()),
+          subtractionHint(rootKey)
         );
       }
       return null;
@@ -687,7 +687,17 @@ export class Interpreter {
    * Convert value to string for output
    */
   private valueToString(value: TemplateValue): string {
-    return valueToText(value);
+    if (value == null) return "";
+    const text = tryCoerceToString(value);
+    if (text === null) {
+      throw new TypeError(
+        "Cannot print a value with no text form (a cyclic structure or a BigInt)",
+        1,
+        1,
+        "Map the variable to text, a number or plain data without cycles"
+      );
+    }
+    return text;
   }
 
   /**
@@ -702,6 +712,40 @@ export class Interpreter {
   }
 }
 
+/**
+ * True when a variable's text failed as math with a syntax error and nothing
+ * else reads it: the lookup found no value or a missing variable
+ */
+function isUnparseableMath(
+  mathError: unknown,
+  value: TemplateValue,
+  lookupError: unknown
+): boolean {
+  return (
+    mathError instanceof MathSyntaxError &&
+    value == null &&
+    (lookupError === null || lookupError instanceof MissingVariableError)
+  );
+}
+
+/**
+ * True when the text holds a character no name or operator uses ("2 $ 3"),
+ * so it can only be a malformed math expression
+ */
+function hasStrayCharacter(text: string): boolean {
+  return /[^\p{L}\p{N}_@.\s-]/u.test(text);
+}
+
+/**
+ * How to write a missing hyphenated name as subtraction, when the name reads
+ * like one (letter-hyphen-letter, no whitespace)
+ */
+function subtractionHint(name: string): string | undefined {
+  if (/\s/.test(name) || !/[a-zA-Z]-[a-zA-Z]/.test(name)) return undefined;
+  const spaced = name.replace(/([a-zA-Z])-(?=[a-zA-Z])/g, "$1 - ");
+  return `If you meant subtraction, write '${spaced}'`;
+}
+
 /**
  * The value as JSON, or its plain string form when JSON cannot hold it
  * (a cycle, a BigInt)
diff --git a/core/src/render.ts b/core/src/render.ts
index 9c6c184..7d55556 100644
--- a/core/src/render.ts
+++ b/core/src/render.ts
@@ -65,7 +65,7 @@ export function render(
   const limits = withDefaultLimits(options?.limits);
   const interpreter = new Interpreter(
     new Map(Object.entries(data)) as Map<string, TemplateValue>,
-    { strictMode: options?.strictMode, limits }
+    { strictMode: options?.strictMode, limits, render: true }
   );
 
   let output: string;
diff --git a/docs/living/architecture/language-contract.md b/docs/living/architecture/language-contract.md
index dc21a16..3e1b066 100644
--- a/docs/living/architecture/language-contract.md
+++ b/docs/living/architecture/language-contract.md
@@ -52,3 +52,11 @@ Nine filters in `filters-collection.ts` (`COLLECTION_FILTERS`), in this order: `
 - **unique.** Keeps the first occurrence; two values are equal when they have the same type and value (`1` and `"1"` differ), objects and arrays by their `json` text.
 - **json.** Compact JSON with object keys sorted by code unit at every depth; null and missing give `null`; a cyclic value is a `type-error`, a shared non-cyclic reference is not.
 - **Errors.** A parameter a collection filter does not declare is a located `type-error` in every mode, as for every filter.
+
+## Math and output errors
+
+- **Zero.** In `render`, `/` or `%` with a zero divisor (also `0 / 0` and a divisor computed to zero) is a `type-error` located at the variable, in every mode. `resolveTemplate` keeps its old output (`Infinity`, `NaN`): this is a render-only divergence, as `standaloneLines` is.
+- **Float printing.** In `render`, an arithmetic result prints with at most 15 significant digits (`0.1 + 0.2` prints `0.3`; `1 / 3` prints `0.333333333333333`; integers and negative numbers print unchanged). `resolveTemplate` prints the plain number, so `0.1 + 0.2` stays `0.30000000000000004` there.
+- **Hyphens in names.** A hyphen with an ASCII letter on both sides is part of one name (`first-name`, `user.first-name`, `a-b + 1` reads the key `a-b`); `a - b`, `a -b`, `n-1`, `x1-y` and `1-a` are arithmetic. A missing hyphenated name in strict mode is a `missing-variable` error whose suggestion shows the spaced form. `analyze` lists a hyphenated name as one variable. Applies in `render` and `resolveTemplate`.
+- **Malformed math.** A malformed expression (`(1 + 2`, `1 +`, `1 + * 2`, `2 $ 3`) is a located `type-error` in lenient mode too, instead of empty output. A well-formed expression that names a missing or non-numeric variable stays missing data: empty in lenient mode. Applies in both entry points.
+- **Unprintable output.** A value with no text form (a cyclic object or array, a BigInt) used as output, as a CASE subject or before a filter is a `type-error` located at the variable or CASE node, in every mode; `null` and missing still print as empty. Applies in both entry points.
diff --git a/docs/living/architecture/modules/template-resolver.md b/docs/living/architecture/modules/template-resolver.md
index 48958b2..49cd622 100644
--- a/docs/living/architecture/modules/template-resolver.md
+++ b/docs/living/architecture/modules/template-resolver.md
@@ -120,9 +120,9 @@ Added in the current tree (`core/src/whitespace.ts`, the lexer, parser and inter
 ### Interpreting
 
 - Text passes through; comments render as `""` [src: nodes/TemplateResolver/interpreter.ts:75-92]
-- Variable: if the joined path text contains any of `+ - * / %` or parentheses it is first tried as a math expression, and any error in that attempt is logged with `console.log` and swallowed before normal lookup [src: nodes/TemplateResolver/interpreter.ts:110-119] [src: nodes/TemplateResolver/interpreter.ts:142-147]. Then lookup, then the `??` default replaces a value that fails `isTruthy`, then filters run on the string form [src: nodes/TemplateResolver/interpreter.ts:121-136] [open: Q9]
+- Variable: if the joined path text contains any of `+ - * / %` or parentheses it (or text holding a character no name or operator uses, such as `2 $ 3`) is first tried as a math expression; a hyphen between two ASCII letters joins a name (`first-name`) and does not count as an operator. A failed attempt falls through to normal lookup, except that a malformed expression (`MathSyntaxError`) stays an error when the lookup finds nothing, in strict and lenient mode alike, and in `render` a division or modulo by zero (`DivisionByZeroError`) is a `type-error` at the variable that is never swallowed. In `render` the result prints with at most 15 significant digits (`formatNumber`); `resolveTemplate` prints `String(result)` and keeps `Infinity`, `NaN` and float noise [src: core/src/interpreter.ts visitVariable] [src: core/src/expressions.ts]. Then lookup, then the `??` default replaces a value that fails `isTruthy`, then filters run on the string form [src: nodes/TemplateResolver/interpreter.ts:121-136] [open: Q9]
 - Lookup (`resolveNestedPath`): loop variables win over variables; a missing root throws `MissingVariableError` when strict and no `??` is present, else yields `null` [src: nodes/TemplateResolver/interpreter.ts:455-477]. Later path segments walk objects, array indexes (`parseInt`) and JSON-object strings (via `tryCoerceToObject`); a null intermediate, a string that is not a JSON object, or a primitive gives `null`, while a missing property on an object or index in an array gives `undefined` [src: nodes/TemplateResolver/interpreter.ts:483-507]
-- Output formatting: `null`/`undefined` render as `""`; other values via `tryCoerceToString` (JSON for arrays and objects) [src: nodes/TemplateResolver/interpreter.ts:513-518] [src: nodes/TemplateResolver/coercion.ts:255-275]
+- Output formatting: `null`/`undefined` render as `""`; other values via `tryCoerceToString` (JSON for arrays and objects); a value with no text form (a cyclic object or array, a BigInt) is a `type-error` located at the variable (or the CASE node) in every mode, also when a filter would follow [src: nodes/TemplateResolver/interpreter.ts:513-518] [src: nodes/TemplateResolver/coercion.ts:255-275]
 - `IF`: `evaluateCondition` on the condition with variables plus loop context; `ELSE` array or nested `If` for `ELSEIF` [src: nodes/TemplateResolver/interpreter.ts:152-170]
 - `CASE`: the expression is looked up with strict lookup, compared as a string with `===` to each `WHEN` value (case-sensitive); no match falls to `DEFAULT`, else `""` [src: nodes/TemplateResolver/interpreter.ts:175-192]
 - `FOR`: iterable coerced with `tryCoerceToArray`; a non-coercible value throws `TypeError` in strict mode and renders `""` otherwise [src: nodes/TemplateResolver/interpreter.ts:197-211]. Per iteration it sets the item name and the loop variables `@index0`, `@index1`, `@first`, `@last`, `@notFirst`, `@notLast`; bodies are concatenated with no separator [src: nodes/TemplateResolver/interpreter.ts:215-233]. After the loop the whole loop context is cleared, including outer-loop entries [src: nodes/TemplateResolver/interpreter.ts:231] [open: Q4]
@@ -140,7 +140,7 @@ Order tried by `evaluateCondition`: `NOT(...)` wrapper, outer parentheses, then
 - Type checks `isEmpty`, `isNotEmpty`, `isArray`, `isNumber`, `isObject`, `isBoolean` as a trailing word [src: nodes/TemplateResolver/expressions.ts:311-359]
 - Operand resolution: literals `true`, `false`, `null`, numbers and quoted strings; otherwise a dotted path over the variable map where string intermediates are `JSON.parse`d and a missing name yields `undefined` rather than an error [src: nodes/TemplateResolver/expressions.ts:364-416]. Conditions therefore never raise `MissingVariableError`. [src: nodes/TemplateResolver/expressions.ts:364-416]
 - `isTruthy`: `null`/`undefined` false; strings trimmed and lowercased, false for `""`, `false`, `0`, `no`, true otherwise; numbers non-zero; booleans as is; arrays non-empty; objects with keys [src: nodes/TemplateResolver/expressions.ts:26-53]. The doc comment above it also lists `null`, `undefined` and `none` as falsy strings, which the body does not implement [src: nodes/TemplateResolver/expressions.ts:17-18] [src: nodes/TemplateResolver/expressions.ts:33] [open: Q5]
-- Math (`+ - * / %`, parentheses; `*` `/` `%` before `+` `-`): identifiers resolve through `resolveValue` and must coerce to a number or a `TypeError` is thrown; unmatched parentheses or a leftover token shape throw `TypeError` [src: nodes/TemplateResolver/expressions.ts:445-569]. The `-` character is pushed as an operator before the signed-number branch is tested [src: nodes/TemplateResolver/expressions.ts:462-470] [answer: Q6]
+- Math (`+ - * / %`, parentheses; `*` `/` `%` before `+` `-`): identifiers resolve through `resolveValue` and must coerce to a number or a `TypeError` is thrown; unmatched parentheses or a leftover token shape throw `TypeError` [src: nodes/TemplateResolver/expressions.ts:445-569]. A `-` directly before a digit is a sign when no number or `)` comes before it (`-3 + 1` is -2); a `-` with ASCII letters on both sides belongs to a name, so `a - b`, `a -b`, `n-1` and `x1-y` stay subtraction. `render` passes `render: true` to the `Interpreter` for the zero error and the 15-digit printing; `resolveTemplate` does not [answer: Q6]
 
 ### Filters
 
```

## Gate run

Gate command green at commit a7012a333456 (203 tests).

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
