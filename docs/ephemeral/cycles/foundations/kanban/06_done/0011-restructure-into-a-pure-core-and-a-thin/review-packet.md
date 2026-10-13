---
type: review-packet
card: 0011-restructure-into-a-pure-core-and-a-thin
tier: product
built_at: 2026-10-13T21:55:44.391Z
base: f77a73095b2b4d32779b509068ceb7671deaa086
head: 5c065691896f27e44f9a0f024bca04271024e5ad
frozen: true
brief_sha256: de9ff54bf6d733b8a5da5adf4e8abf8d170d0e6d0aad7f9cfe13222ec6d425f2
manifest_sha256: 803d68e22955f7984981508cf128b79f6247b2ae1f735fd97511ea9cbfb8b0fe
criteria_sha256: b47e9bc9e5ca534429aee3b6dcef0f168efbd501d0978561273cae1d66ce7f9d
scope_sha256: 4b234b9096390112a2a211bfd47d260ffef9471d4a8c3e5c54e35ab8d1c41432
diff_sha256: 82790d45117667f8400f1c2cb2dd167e7e9e56bbcd3fd8413d4e4567b33c9334
omitted_paths: 8
criteria_count: 5
must_not_count: 2
---

# Review packet: 0011-restructure-into-a-pure-core-and-a-thin

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: Move the resolver into core/src (lexer, parser, expressions, interpreter, filters, coercion, errors, types, utils and a resolve entry that exports resolveTemplate) and keep only the n8n node class, its json, icon and index in n8n/

### Criteria

- c1 (verify: test): rs-01: no file under core/ imports n8n-workflow, any n8n package, or a Node I/O module (fs, net, http, child_process)
- c2 (verify: test): rs-02: the n8n wrapper imports the core only through core/src/index.ts, and core/src/index.ts exports resolveTemplate
- c3 (verify: test): rs-03: the pre-existing test file differs from its base version only in import and mock specifier lines
- c4 (verify: test): rs-04: the pre-existing suite passes with at least 446 passing tests and none failing
- c5 (verify: test): rs-05: the build succeeds and every path in package.json n8n.nodes exists afterwards

### Must not

- m1: edit or delete any existing test body
- m2: add a runtime dependency

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: Move the resolver into core/src (lexer, parser, expressions, interpreter, filters, coercion, errors, types, utils and a resolve entry that exports resolveTemplate) and keep only the n8n node class, its json, icon and index in n8n/
Must not:
- edit or delete any existing test body
- add a runtime dependency

## Questions

goal-critical: does each frozen test fail before the change for the stated reason and pass after?
goal-critical: do all pre-existing tests still pass?

## Rubric

- files moved with history-preserving git mv where possible
- no behavior edits mixed into moves

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/decisions/adr/0006-n8n-node-imports-core-directly.md
```

### spec.md as of base f77a730

```
# Spec

## Acceptance criteria

- rs-01: no file under core/ imports n8n-workflow, any n8n package, or a Node I/O module (fs, net, http, child_process)
- rs-02: the n8n wrapper imports the core only through core/src/index.ts, and core/src/index.ts exports resolveTemplate
- rs-03: the pre-existing test file differs from its base version only in import and mock specifier lines
- rs-04: the pre-existing suite passes with at least 446 passing tests and none failing
- rs-05: the build succeeds and every path in package.json n8n.nodes exists afterwards
```

### card.md as of base f77a730

```
# Restructure into a pure core and a thin n8n wrapper

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Move the resolver into core/src (lexer, parser, expressions, interpreter, filters, coercion, errors, types, utils and a resolve entry that exports resolveTemplate) and keep only the n8n node class, its json, icon and index in n8n/. Core imports nothing from n8n and does no I/O; the node imports core only through its public entry (decision: the node imports core directly). No behavior change: every pre-existing test passes with only its import specifiers changed. package.json n8n.nodes, tsconfig and jest config follow the new layout, and the build still produces the node entry.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `rs-01` no file under core/ imports n8n-workflow, any n8n package, or a Node I/O module (fs, net, http, child_process)
- `contract` `rs-02` the n8n wrapper imports the core only through core/src/index.ts, and core/src/index.ts exports resolveTemplate
- `contract` `rs-03` the pre-existing test file differs from its base version only in import and mock specifier lines
- `contract` `rs-04` the pre-existing suite passes with at least 446 passing tests and none failing
- `contract` `rs-05` the build succeeds and every path in package.json n8n.nodes exists afterwards


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

Core public entry core/src/index.ts exports the resolver surface the node and tests use today; resolveTemplate keeps its signature.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/coercion.ts` | add | template-resolver |
| `core/src/errors.ts` | add | template-resolver |
| `core/src/expressions.ts` | add | template-resolver |
| `core/src/filters.ts` | add | template-resolver |
| `core/src/index.ts` | add | template-resolver |
| `core/src/interpreter.ts` | add | template-resolver |
| `core/src/lexer.ts` | add | template-resolver |
| `core/src/parser.ts` | add | template-resolver |
| `core/src/resolve.ts` | add | template-resolver |
| `core/src/types.ts` | add | template-resolver |
| `core/src/utils.ts` | add | template-resolver |
| `n8n/TemplateResolver.node.json` | add | template-resolver |
| `n8n/TemplateResolver.node.ts` | add | template-resolver |
| `n8n/icoTemplateResolver.svg` | add | template-resolver |
| `n8n/index.ts` | add | template-resolver |
| `jest.config.js` | edit | template-resolver |
| `package.json` | edit | template-resolver |
| `tests/TemplateResolver.node.test.ts` | edit | template-resolver |
| `tsconfig.json` | edit | template-resolver |
| `nodes/TemplateResolver/TemplateResolver.node.json` | remove | template-resolver |
| `nodes/TemplateResolver/TemplateResolver.node.ts` | remove | template-resolver |
| `nodes/TemplateResolver/coercion.ts` | remove | template-resolver |
| `nodes/TemplateResolver/errors.ts` | remove | template-resolver |
| `nodes/TemplateResolver/expressions.ts` | remove | template-resolver |
| `nodes/TemplateResolver/filters.ts` | remove | template-resolver |
| `nodes/TemplateResolver/icoTemplateResolver.svg` | remove | template-resolver |
| `nodes/TemplateResolver/index.ts` | remove | template-resolver |
| `nodes/TemplateResolver/interpreter.ts` | remove | template-resolver |
| `nodes/TemplateResolver/lexer.ts` | remove | template-resolver |
| `nodes/TemplateResolver/parser.ts` | remove | template-resolver |
| `nodes/TemplateResolver/types.ts` | remove | template-resolver |
| `nodes/TemplateResolver/utils.ts` | remove | template-resolver |

Files scope: `core/`, `jest.config.js`, `n8n/`, `nodes/`, `package.json`, `tests/TemplateResolver.node.test.ts`, `tsconfig.json`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

Each row is a change outside the card's scope that its lead approved. A builder who can edit the card folder can add a row, so the human gate is the backstop.

| Date | Path | Kind | Reason | Approved by |
| --- | --- | --- | --- | --- |
| 2026-10-13 | `tests/regressions/nested-for.test.ts` | edit | import specifiers (or the layout mention) follow the move; no assertion changes | project lead (front approval) |
| 2026-10-13 | `tests/regressions/parse-defaults-and-tag-arguments.test.ts` | edit | import specifiers (or the layout mention) follow the move; no assertion changes | project lead (front approval) |
| 2026-10-13 | `tests/regressions/parse-defaults-guards.test.ts` | edit | import specifiers (or the layout mention) follow the move; no assertion changes | project lead (front approval) |
| 2026-10-13 | `tests/regressions/condition-operators.test.ts` | edit | import specifiers (or the layout mention) follow the move; no assertion changes | project lead (front approval) |
| 2026-10-13 | `tests/regressions/string-input-coercion.test.ts` | edit | import specifiers (or the layout mention) follow the move; no assertion changes | project lead (front approval) |
| 2026-10-13 | `tests/regressions/table-cell-escaping.test.ts` | edit | import specifiers (or the layout mention) follow the move; no assertion changes | project lead (front approval) |
| 2026-10-13 | `tests/regressions/table-cell-escaping-filters.test.ts` | edit | import specifiers (or the layout mention) follow the move; no assertion changes | project lead (front approval) |
| 2026-10-13 | `README.md` | edit | import specifiers (or the layout mention) follow the move; no assertion changes | project lead (front approval) |

### Manifest and scope

- add: `core/src/lexer.ts`, `core/src/parser.ts`, `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/filters.ts`, `core/src/coercion.ts`, `core/src/errors.ts`, `core/src/types.ts`, `core/src/utils.ts`, `core/src/resolve.ts`, `core/src/index.ts`, `n8n/TemplateResolver.node.ts`, `n8n/TemplateResolver.node.json`, `n8n/icoTemplateResolver.svg`, `n8n/index.ts`
- remove: `nodes/TemplateResolver/lexer.ts`, `nodes/TemplateResolver/parser.ts`, `nodes/TemplateResolver/expressions.ts`, `nodes/TemplateResolver/interpreter.ts`, `nodes/TemplateResolver/filters.ts`, `nodes/TemplateResolver/coercion.ts`, `nodes/TemplateResolver/errors.ts`, `nodes/TemplateResolver/types.ts`, `nodes/TemplateResolver/utils.ts`, `nodes/TemplateResolver/index.ts`, `nodes/TemplateResolver/TemplateResolver.node.ts`, `nodes/TemplateResolver/TemplateResolver.node.json`, `nodes/TemplateResolver/icoTemplateResolver.svg`
- edit: `package.json`, `tsconfig.json`, `tests/TemplateResolver.node.test.ts`
- files_scope: `core/`, `n8n/`, `nodes/`, `package.json`, `tsconfig.json`, `tests/TemplateResolver.node.test.ts`

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

### docs/living/decisions/adr/0006-n8n-node-imports-core-directly.md

```
---
summary: The n8n node imports the core directly, with n8n libraries as peer dependencies; the API is an equally thin consumer.
type: adr
domain: architecture
status: accepted
date: 2026-10-13
state: planned
---

# The n8n node imports the core directly

**Context.** The node could call the headless API or import the core. A local install should need no running service.

**Decision.** The n8n wrapper imports core as a library. n8n packages are peer dependencies. The API and CLI are equally thin consumers of the same core contract.

**Alternatives.** The node calls a running HTTP API; rejected because it forces a service for a local install. An optional remote toggle can be added later.

**Consequences.** One fixture suite proves core, API, CLI and node. Core stays free of n8n imports.
```

## Frozen tests (read-only)

These test files were committed before the work began, at base f77a730. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tools/tests/restructure.test.mjs (frozen)

```
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = '712fcfd7f7af0b329e6506120a25f0db8e58de06';
const TEST_REL = 'tests/TemplateResolver.node.test.ts';
const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');

function tsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function specifiers(source) {
  const found = [];
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bjest\.mock\s*\(\s*['"]([^'"]+)['"]/g,
  ];
  for (const re of patterns) for (const m of source.matchAll(re)) found.push(m[1]);
  return found;
}

const forbiddenIo = ['fs', 'fs/promises', 'net', 'http', 'https', 'child_process'];
function isForbidden(spec) {
  const bare = spec.replace(/^node:/, '');
  if (forbiddenIo.includes(bare)) return true;
  return /^(n8n($|[-/])|@n8n\/)/.test(spec);
}

test('rs-01: no .ts file under core/ imports n8n-workflow, an n8n package, or fs, net, http, https, child_process', () => {
  const coreDir = path.join(root, 'core');
  assert.ok(fs.existsSync(coreDir), 'core/ must exist');
  const files = tsFiles(coreDir);
  assert.ok(files.length > 0, 'core/ must contain at least one .ts file');
  const offenders = [];
  for (const file of files) {
    for (const spec of specifiers(fs.readFileSync(file, 'utf8'))) {
      if (isForbidden(spec)) offenders.push(`${path.relative(root, file)} -> ${spec}`);
    }
  }
  assert.deepEqual(offenders, [], `core/ must not import n8n or Node I/O modules: ${offenders.join('; ')}`);
});

test('rs-02: n8n/ imports the core only through core/src or core/src/index, and core/src/index.ts exports resolveTemplate', () => {
  const indexFile = path.join(root, 'core', 'src', 'index.ts');
  assert.ok(fs.existsSync(indexFile), 'core/src/index.ts must exist');
  assert.match(fs.readFileSync(indexFile, 'utf8'), /resolveTemplate/, 'core/src/index.ts must export resolveTemplate');
  const n8nDir = path.join(root, 'n8n');
  assert.ok(fs.existsSync(n8nDir), 'n8n/ must exist');
  const files = tsFiles(n8nDir);
  assert.ok(files.length > 0, 'n8n/ must contain at least one .ts file');
  let reachesCore = 0;
  const offenders = [];
  for (const file of files) {
    for (const spec of specifiers(fs.readFileSync(file, 'utf8'))) {
      if (!/(^|\/)core(\/|$)/.test(spec)) continue;
      reachesCore++;
      if (!/core\/src(\/index)?$/.test(spec)) offenders.push(`${path.relative(root, file)} -> ${spec}`);
    }
  }
  assert.ok(reachesCore > 0, 'the n8n wrapper must import the core');
  assert.deepEqual(offenders, [], `n8n/ must import core only via core/src or core/src/index: ${offenders.join('; ')}`);
});

function dropImportLines(text) {
  const kept = [];
  let inBlock = false;
  for (const line of text.split(/\r?\n/)) {
    if (inBlock) {
      if (/^\s*\}\s*from\s/.test(line)) inBlock = false;
      continue;
    }
    if (/^import\s/.test(line)) {
      if (!/\bfrom\s*['"]|^import\s*['"]/.test(line)) inBlock = true;
      continue;
    }
    if (/^\} from /.test(line) || line.includes('jest.mock(')) continue;
    kept.push(line);
  }
  return kept;
}

test('rs-03: tests/TemplateResolver.node.test.ts differs from its base version only in import and mock specifier lines', () => {
  const baseText = execFileSync('git', ['show', `${BASE}:${TEST_REL}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const currentText = fs.readFileSync(path.join(root, TEST_REL), 'utf8');
  assert.match(
    currentText,
    /from\s*['"][^'"]*(core\/src|n8n\/)[^'"]*['"]/,
    'the test file must import from a path containing core/src or n8n/',
  );
  const base = dropImportLines(baseText);
  const current = dropImportLines(currentText);
  assert.equal(current.length, base.length, 'non-import line count must equal the base version');
  const firstDiff = base.findIndex((line, i) => line !== current[i]);
  assert.equal(firstDiff, -1, `non-import lines must equal the base version (first difference at kept line ${firstDiff + 1})`);
});

test('rs-04: the pre-existing suite passes with at least 446 passing tests and none failing', () => {
  assert.ok(fs.existsSync(path.join(root, 'core', 'src', 'index.ts')), 'core/src/index.ts must exist');
  assert.ok(fs.existsSync(jestBin), 'node_modules/jest/bin/jest.js must exist (run npm ci)');
  const run = spawnSync(process.execPath, [jestBin, '--json', '--silent', TEST_REL], {
    cwd: root, encoding: 'utf8', timeout: 5 * 60 * 1000, maxBuffer: 256 * 1024 * 1024,
  });
  const start = run.stdout.indexOf('{');
  assert.ok(start >= 0, `jest must print a JSON report; stderr: ${String(run.stderr).slice(0, 500)}`);
  const report = JSON.parse(run.stdout.slice(start));
  assert.equal(report.numFailedTests, 0, 'no test may fail');
  assert.ok(report.numPassedTests >= 446, `at least 446 tests must pass, got ${report.numPassedTests}`);
});

test('rs-05: the build succeeds and every package.json n8n.nodes path exists under dist/n8n/', () => {
  assert.ok(fs.existsSync(path.join(root, 'node_modules', '.bin')), 'node_modules/.bin must exist (run npm ci)');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const run = spawnSync(npm, ['run', 'build'], {
    cwd: root, encoding: 'utf8', timeout: 5 * 60 * 1000, shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(run.status, 0, `npm run build must exit 0; output: ${String(run.stdout).slice(-500)} ${String(run.stderr).slice(-500)}`);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const nodes = pkg.n8n?.nodes ?? [];
  assert.ok(nodes.length > 0, 'package.json n8n.nodes must list at least one path');
  for (const rel of nodes) {
    assert.ok(rel.startsWith('dist/n8n/'), `${rel} must start with dist/n8n/`);
    assert.ok(fs.existsSync(path.join(root, rel)), `${rel} must exist after the build`);
  }
});
```

## 4. Diff

8 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/nodes/TemplateResolver/coercion.ts b/core/src/coercion.ts
similarity index 100%
rename from nodes/TemplateResolver/coercion.ts
rename to core/src/coercion.ts
diff --git a/nodes/TemplateResolver/errors.ts b/core/src/errors.ts
similarity index 100%
rename from nodes/TemplateResolver/errors.ts
rename to core/src/errors.ts
diff --git a/nodes/TemplateResolver/expressions.ts b/core/src/expressions.ts
similarity index 100%
rename from nodes/TemplateResolver/expressions.ts
rename to core/src/expressions.ts
diff --git a/nodes/TemplateResolver/filters.ts b/core/src/filters.ts
similarity index 100%
rename from nodes/TemplateResolver/filters.ts
rename to core/src/filters.ts
diff --git a/nodes/TemplateResolver/index.ts b/core/src/index.ts
similarity index 85%
rename from nodes/TemplateResolver/index.ts
rename to core/src/index.ts
index 974d6fc..73f1ff3 100644
--- a/nodes/TemplateResolver/index.ts
+++ b/core/src/index.ts
@@ -25,5 +25,5 @@ export * from "./interpreter";
 // Utilities
 export * from "./utils";
 
-// Main node
-export * from "./TemplateResolver.node";
+// Template resolution
+export { resolveTemplate } from "./resolve";
diff --git a/nodes/TemplateResolver/interpreter.ts b/core/src/interpreter.ts
similarity index 100%
rename from nodes/TemplateResolver/interpreter.ts
rename to core/src/interpreter.ts
diff --git a/nodes/TemplateResolver/lexer.ts b/core/src/lexer.ts
similarity index 100%
rename from nodes/TemplateResolver/lexer.ts
rename to core/src/lexer.ts
diff --git a/nodes/TemplateResolver/parser.ts b/core/src/parser.ts
similarity index 100%
rename from nodes/TemplateResolver/parser.ts
rename to core/src/parser.ts
diff --git a/core/src/resolve.ts b/core/src/resolve.ts
new file mode 100644
index 0000000..922a598
--- /dev/null
+++ b/core/src/resolve.ts
@@ -0,0 +1,30 @@
+import { VariableMap } from "./types";
+import { Lexer } from "./lexer";
+import { Parser } from "./parser";
+import { Interpreter } from "./interpreter";
+
+/**
+ * Main template resolution entry point
+ *
+ * @param template - Template string with conditional markdown syntax
+ * @param variables - Variable mappings (name → value)
+ * @param options - Configuration options (strictMode)
+ * @returns Resolved markdown string
+ */
+export function resolveTemplate(
+  template: string,
+  variables: VariableMap,
+  options?: { strictMode?: boolean }
+): string {
+  // Tokenize
+  const lexer = new Lexer(template);
+  const tokens = lexer.tokenize();
+
+  // Parse to AST
+  const parser = new Parser(tokens);
+  const ast = parser.parse();
+
+  // Interpret
+  const interpreter = new Interpreter(variables, options);
+  return interpreter.interpret(ast);
+}
diff --git a/nodes/TemplateResolver/types.ts b/core/src/types.ts
similarity index 100%
rename from nodes/TemplateResolver/types.ts
rename to core/src/types.ts
diff --git a/nodes/TemplateResolver/utils.ts b/core/src/utils.ts
similarity index 100%
rename from nodes/TemplateResolver/utils.ts
rename to core/src/utils.ts
diff --git a/nodes/TemplateResolver/TemplateResolver.node.json b/n8n/TemplateResolver.node.json
similarity index 100%
rename from nodes/TemplateResolver/TemplateResolver.node.json
rename to n8n/TemplateResolver.node.json
diff --git a/nodes/TemplateResolver/TemplateResolver.node.ts b/n8n/TemplateResolver.node.ts
similarity index 89%
rename from nodes/TemplateResolver/TemplateResolver.node.ts
rename to n8n/TemplateResolver.node.ts
index 7841e56..057fd6c 100644
--- a/nodes/TemplateResolver/TemplateResolver.node.ts
+++ b/n8n/TemplateResolver.node.ts
@@ -1,8 +1,4 @@
-import { VariableMap } from "./types";
-import { Lexer } from "./lexer";
-import { Parser } from "./parser";
-import { Interpreter } from "./interpreter";
-import { extractAllVariables } from "./utils";
+import { VariableMap, extractAllVariables, resolveTemplate } from "../core/src";
 import {
   IExecuteFunctions,
   INodeExecutionData,
@@ -11,32 +7,6 @@ import {
   NodeOperationError,
 } from "n8n-workflow";
 
-/**
- * Main template resolution entry point
- *
- * @param template - Template string with conditional markdown syntax
- * @param variables - Variable mappings (name → value)
- * @param options - Configuration options (strictMode)
- * @returns Resolved markdown string
- */
-export function resolveTemplate(
-  template: string,
-  variables: VariableMap,
-  options?: { strictMode?: boolean }
-): string {
-  // Tokenize
-  const lexer = new Lexer(template);
-  const tokens = lexer.tokenize();
-
-  // Parse to AST
-  const parser = new Parser(tokens);
-  const ast = parser.parse();
-
-  // Interpret
-  const interpreter = new Interpreter(variables, options);
-  return interpreter.interpret(ast);
-}
-
 /**
  * Template metadata for debugging
  */
diff --git a/nodes/TemplateResolver/icoTemplateResolver.svg b/n8n/icoTemplateResolver.svg
similarity index 100%
rename from nodes/TemplateResolver/icoTemplateResolver.svg
rename to n8n/icoTemplateResolver.svg
diff --git a/n8n/index.ts b/n8n/index.ts
new file mode 100644
index 0000000..2803572
--- /dev/null
+++ b/n8n/index.ts
@@ -0,0 +1 @@
+export * from "./TemplateResolver.node";
diff --git a/package.json b/package.json
index 8b3237e..10e1b2d 100644
--- a/package.json
+++ b/package.json
@@ -34,7 +34,7 @@
     "n8nNodesApiVersion": 1,
     "strict": true,
     "nodes": [
-      "dist/nodes/TemplateResolver/TemplateResolver.node.js"
+      "dist/n8n/TemplateResolver.node.js"
     ]
   },
   "devDependencies": {
diff --git a/tests/TemplateResolver.node.test.ts b/tests/TemplateResolver.node.test.ts
index 33d364d..8c7b0ec 100644
--- a/tests/TemplateResolver.node.test.ts
+++ b/tests/TemplateResolver.node.test.ts
@@ -18,7 +18,7 @@ import {
   ListItemNode,
   TableNode,
   CommentNode,
-} from "../nodes/TemplateResolver/types";
+} from "../core/src/types";
 
 // Type coercion functions
 import {
@@ -27,29 +27,29 @@ import {
   tryCoerceToObject,
   tryCoerceToBoolean,
   tryCoerceToString,
-} from "../nodes/TemplateResolver/coercion";
+} from "../core/src/coercion";
 
 // Filter system
 import {
   parseFilter,
   applyFilter,
   applyFilters,
-} from "../nodes/TemplateResolver/filters";
+} from "../core/src/filters";
 
 // Lexer
-import { Lexer } from "../nodes/TemplateResolver/lexer";
+import { Lexer } from "../core/src/lexer";
 
 // Parser
-import { Parser } from "../nodes/TemplateResolver/parser";
+import { Parser } from "../core/src/parser";
 
 // Expression evaluation
 import {
   evaluateCondition,
   evaluateMathExpression,
-} from "../nodes/TemplateResolver/expressions";
+} from "../core/src/expressions";
 
 // Main entry point
-import { resolveTemplate } from "../nodes/TemplateResolver/TemplateResolver.node";
+import { resolveTemplate } from "../core/src/resolve";
 
 // ============================================================================
 // HELPER FUNCTIONS
diff --git a/tests/regressions/condition-operators.test.ts b/tests/regressions/condition-operators.test.ts
index eac45a7..2e2579e 100644
--- a/tests/regressions/condition-operators.test.ts
+++ b/tests/regressions/condition-operators.test.ts
@@ -1,5 +1,5 @@
-import { resolveTemplate } from "../../nodes/TemplateResolver/TemplateResolver.node";
-import { VariableMap, TemplateValue } from "../../nodes/TemplateResolver/types";
+import { resolveTemplate } from "../../core/src/resolve";
+import { VariableMap, TemplateValue } from "../../core/src/types";
 
 function vars(entries: [string, TemplateValue][]): VariableMap {
   return new Map(entries);
diff --git a/tests/regressions/nested-for.test.ts b/tests/regressions/nested-for.test.ts
index 11124d7..f9df732 100644
--- a/tests/regressions/nested-for.test.ts
+++ b/tests/regressions/nested-for.test.ts
@@ -1,5 +1,5 @@
-import { resolveTemplate } from "../../nodes/TemplateResolver/TemplateResolver.node";
-import { TemplateValue } from "../../nodes/TemplateResolver/types";
+import { resolveTemplate } from "../../core/src/resolve";
+import { TemplateValue } from "../../core/src/types";
 
 // Render, capturing a thrown error as text so a defect shows as a failed
 // expectation rather than an escaping exception.
diff --git a/tests/regressions/parse-defaults-and-tag-arguments.test.ts b/tests/regressions/parse-defaults-and-tag-arguments.test.ts
index 448dcc7..e6fb466 100644
--- a/tests/regressions/parse-defaults-and-tag-arguments.test.ts
+++ b/tests/regressions/parse-defaults-and-tag-arguments.test.ts
@@ -1,5 +1,5 @@
-import { resolveTemplate } from "../../nodes/TemplateResolver/TemplateResolver.node";
-import { VariableMap, TemplateValue } from "../../nodes/TemplateResolver/types";
+import { resolveTemplate } from "../../core/src/resolve";
+import { VariableMap, TemplateValue } from "../../core/src/types";
 
 function vars(entries: [string, TemplateValue][] = []): VariableMap {
   return new Map(entries);
diff --git a/tests/regressions/parse-defaults-guards.test.ts b/tests/regressions/parse-defaults-guards.test.ts
index f4b82a1..a563ca6 100644
--- a/tests/regressions/parse-defaults-guards.test.ts
+++ b/tests/regressions/parse-defaults-guards.test.ts
@@ -1,5 +1,5 @@
-import { resolveTemplate } from "../../nodes/TemplateResolver/TemplateResolver.node";
-import { VariableMap } from "../../nodes/TemplateResolver/types";
+import { resolveTemplate } from "../../core/src/resolve";
+import { VariableMap } from "../../core/src/types";
 
 function render(template: string): string {
   return resolveTemplate(template, new Map() as VariableMap, {
diff --git a/tests/regressions/string-input-coercion.test.ts b/tests/regressions/string-input-coercion.test.ts
index c7a4b47..d2b34c1 100644
--- a/tests/regressions/string-input-coercion.test.ts
+++ b/tests/regressions/string-input-coercion.test.ts
@@ -1,4 +1,4 @@
-import { resolveTemplate } from "../../nodes/TemplateResolver/TemplateResolver.node";
+import { resolveTemplate } from "../../core/src/resolve";
 
 type Vars = Map<string, any>;
 
diff --git a/tests/regressions/table-cell-escaping-filters.test.ts b/tests/regressions/table-cell-escaping-filters.test.ts
index 67edd36..d0b448d 100644
--- a/tests/regressions/table-cell-escaping-filters.test.ts
+++ b/tests/regressions/table-cell-escaping-filters.test.ts
@@ -1,5 +1,5 @@
-import { resolveTemplate } from "../../nodes/TemplateResolver/TemplateResolver.node";
-import { TemplateValue } from "../../nodes/TemplateResolver/types";
+import { resolveTemplate } from "../../core/src/resolve";
+import { TemplateValue } from "../../core/src/types";
 
 function render(
   template: string,
diff --git a/tests/regressions/table-cell-escaping.test.ts b/tests/regressions/table-cell-escaping.test.ts
index fcd3092..e54e183 100644
--- a/tests/regressions/table-cell-escaping.test.ts
+++ b/tests/regressions/table-cell-escaping.test.ts
@@ -1,5 +1,5 @@
-import { resolveTemplate } from "../../nodes/TemplateResolver/TemplateResolver.node";
-import { TemplateValue } from "../../nodes/TemplateResolver/types";
+import { resolveTemplate } from "../../core/src/resolve";
+import { TemplateValue } from "../../core/src/types";
 
 // Capture a thrown error as text so a failure is always a matcher failure.
 function render(
diff --git a/tsconfig.json b/tsconfig.json
index 914410a..4166bb0 100644
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -21,7 +21,7 @@
     "skipLibCheck": true,
     "outDir": "./dist/"
   },
-  "include": ["nodes/**/*", "nodes/**/*.json", "package.json"],
+  "include": ["core/**/*", "n8n/**/*", "n8n/**/*.json", "package.json"],
   "exclude": [
     "node_modules",
     "dist",
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
