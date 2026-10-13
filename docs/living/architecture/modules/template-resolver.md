---
summary: The nodes/TemplateResolver module - a lexer, recursive-descent parser and tree-walking interpreter that resolves a conditional-markdown template string against a variable map, wrapped in an n8n node with template, mapping, strict-mode and output-field parameters.
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
- `interpreter.ts`: walks the AST and builds the output string, owning variable lookup, loop context, list and table rendering [src: nodes/TemplateResolver/interpreter.ts:45-96]
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
- A top-level `HEADER` or `ROW` token (outside `TABLE`) parses into a node type the interpreter's `visit` switch does not list, so it renders as an empty string; other stray tags (for example `ELSE`, `END_FOR`) raise "Unexpected token" [src: nodes/TemplateResolver/parser.ts:75-90] [src: nodes/TemplateResolver/interpreter.ts:73-95]

### Interpreting

- Text passes through; comments render as `""` [src: nodes/TemplateResolver/interpreter.ts:75-92]
- Variable: if the joined path text contains any of `+ - * / %` or parentheses it is first tried as a math expression, and any error in that attempt is logged with `console.log` and swallowed before normal lookup [src: nodes/TemplateResolver/interpreter.ts:110-119] [src: nodes/TemplateResolver/interpreter.ts:142-147]. Then lookup, then the `??` default replaces a value that fails `isTruthy`, then filters run on the string form [src: nodes/TemplateResolver/interpreter.ts:121-136] [open: Q9]
- Lookup (`resolveNestedPath`): loop variables win over variables; a missing root throws `MissingVariableError` when strict and no `??` is present, else yields `null`; later path segments walk objects, array indexes (`parseInt`) and JSON-object strings (via `tryCoerceToObject`), returning `null` on a dead end [src: nodes/TemplateResolver/interpreter.ts:451-508]
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
- Math (`+ - * / %`, parentheses; `*` `/` `%` before `+` `-`): identifiers resolve through `resolveValue` and must coerce to a number or a `TypeError` is thrown; unmatched parentheses or a leftover token shape throw `TypeError` [src: nodes/TemplateResolver/expressions.ts:445-569]. The `-` character is pushed as an operator before the signed-number branch is tested [src: nodes/TemplateResolver/expressions.ts:462-470] [open: Q6]

### Filters

Applied left to right to the string form of the value, after `??`. Syntax per filter: bare name, `name=value`, or `name:key="v",key2="v2"` [src: nodes/TemplateResolver/filters.ts:11-65]. Implemented names: `head=N` (first N characters; negative N drops the last N), `tail=N` (last N; `0` gives `""`; negative N drops the first N), `trim`, `escape_md` (backslash-escapes `\ * _ [ ] ( ) # ` > ~ |`) [src: nodes/TemplateResolver/filters.ts:89-186]. Any other name throws a plain `Error` "Unknown filter" [src: nodes/TemplateResolver/filters.ts:99-100]

### Coercion and repair of string input

- Number: numbers (not `NaN`), booleans (1/0), non-empty trimmed numeric strings; else `null` [src: nodes/TemplateResolver/coercion.ts:15-35]
- Array: arrays pass; strings starting with `[` have trailing and leading commas removed and are `JSON.parse`d, falling back to comma splitting when unclosed or invalid; strings starting with `{` give `null`; any other string is split on commas (double quotes group, empty pieces dropped, outer brackets or braces stripped); other primitives become one-item arrays; objects give `null` [src: nodes/TemplateResolver/coercion.ts:48-153]
- Object: objects pass; strings that start with `{` and end with `}` are repaired (stray commas collapsed, trailing and leading commas removed) then parsed; anything else `null` [src: nodes/TemplateResolver/coercion.ts:165-201]
- Boolean: booleans; `1`/`0`; case-insensitive `true`/`yes`/`1` and `false`/`no`/`0`; else `null` [src: nodes/TemplateResolver/coercion.ts:214-243]

## Failure handling

- Error classes: `TemplateError(message, line, column, suggestion?)` formats its message as a line starting with a glyph prefix, then `Template Error (line L, col C):`, the message on an indented line, and an optional `Suggestion:` line; subclasses set `name` to `SyntaxError`, `TypeError`, `MissingVariableError` and shadow the global names [src: nodes/TemplateResolver/errors.ts:4-60]. `MissingVariableError` text is `Variable 'x' not found` with the list of defined variables and a hint that names "Lenient Mode" [src: nodes/TemplateResolver/errors.ts:65-81] [open: Q7]
- The prefix glyph in the source file is stored as mojibake (bytes `c3 a2 c2 9d c5 92`), not a clean emoji [src: nodes/TemplateResolver/errors.ts:22] [open: Q8]
- Position info: lexer and parser errors carry real token line and column; runtime errors from the interpreter and expressions use fixed `1, 1` (`MissingVariableError`, math and comparison `TypeError`) or the node's own position (`FOR` `TypeError`) [src: nodes/TemplateResolver/interpreter.ts:470-475] [src: nodes/TemplateResolver/expressions.ts:252-257] [src: nodes/TemplateResolver/interpreter.ts:203-208]
- Filter errors (`Unknown filter`, `head`/`tail` parameter problems) are plain `Error`, not `TemplateError`, and carry no position [src: nodes/TemplateResolver/filters.ts:100-117]
- Structural errors raised: unknown tag, unclosed variable, tag or comment, unmatched or unclosed block, missing `END_*`, bad `FOR` syntax, unexpected text or token inside `CASE`, `LIST`, `TABLE`, `consume` mismatch [src: nodes/TemplateResolver/lexer.ts:203-208] [src: nodes/TemplateResolver/parser.ts:914-924]
- Strict mode: affects missing root variables (not in conditions) and non-iterable `FOR` values; with `??` present a missing root does not throw [src: nodes/TemplateResolver/interpreter.ts:121-122] [src: nodes/TemplateResolver/interpreter.ts:468-477]
- Node level: any error inside the item loop is caught; with `continueOnFail()` the item becomes `{ error: message, error_type: name }`; otherwise a `NodeOperationError` is rethrown as is, or any other error is wrapped in a new `NodeOperationError` with the same message and `itemIndex` [src: nodes/TemplateResolver/TemplateResolver.node.ts:259-280]. Wrapping drops the original class name from the thrown error. [src: nodes/TemplateResolver/TemplateResolver.node.ts:273-279]

## Dependencies

- Runtime import: `n8n-workflow` (`IExecuteFunctions`, `INodeExecutionData`, `INodeType`, `INodeTypeDescription`, `NodeOperationError`), used only by `TemplateResolver.node.ts`; declared as a peer dependency [src: nodes/TemplateResolver/TemplateResolver.node.ts:6-12] [src: package.json:47-49]
- All other files import only from sibling files; there are no third-party packages in the resolver core [src: nodes/TemplateResolver/interpreter.ts:1-28]
- Internal order: `types` and `errors` are leaves; `coercion` uses `types`; `filters` uses `types`; `expressions` uses `types`, `errors`, `coercion`; `lexer` and `parser` use `types` and `errors`; `interpreter` uses `types`, `errors`, `coercion`, `expressions`, `filters`; the node file uses `types`, `lexer`, `parser`, `interpreter`, `utils` [src: nodes/TemplateResolver/expressions.ts:1-9] [src: nodes/TemplateResolver/TemplateResolver.node.ts:1-5]
- `TemplateMetadata` and `VariableMappingsCollection` are declared both in `types.ts` and (unexported) in the node file [src: nodes/TemplateResolver/types.ts:217-232] [src: nodes/TemplateResolver/TemplateResolver.node.ts:43-58]
- Tests mock `n8n-workflow` through `__mocks__/n8n-workflow.ts` [src: jest.config.js:6-8]

## Open questions

- Q1. Whether n8n expressions typed in a mapping `value` (for example `={{ $json.title }}`) are evaluated before `execute()` sees them is n8n runtime behavior outside this repository; the code only calls `getNodeParameter`. Looked at: `TemplateResolver.node.ts:136-143,181-200`.
- Q2. In strict mode, `${{item}}` for a `FOR ... AS item` name appears to be counted as an unmapped variable by `extractAllVariables` and the node's precheck, which would raise the "unmapped variables" error before the loop runs. Whether tests or users exercise this, and what is intended, was not checked (tests not read). Looked at: `utils.ts:16-24`, `TemplateResolver.node.ts:216-229`.
- Q3. The lexer comment documents a `{{cond ? "a" : "b"}}` ternary and `utils.ts` detects its condition name, but no lexer or parser path produces it; a tag of that shape reaches the unknown-tag error. Whether the ternary is intended to work is not stated in the code.
- Q4. The `FOR` loop clears the entire loop context at its end (`interpreter.ts:231`), so a nested inner loop would remove the outer item and index values for the rest of the outer iteration. Not run; effect on real templates unconfirmed.
- Q5. `isTruthy` comment lists `null`, `undefined` and `none` strings as falsy but the code treats them as truthy. Which is intended is unknown.
- Q6. Because `-` is consumed as an operator first, how a leading negative number (for example `-3 + 1`) evaluates was traced but not run; it appears to fail as "Invalid math expression" and then fall back to normal variable lookup. Unconfirmed.
- Q7. `MissingVariableError` suggests enabling "Lenient Mode", while the node parameter is named "Strict Mode". Whether another name for the setting exists is unknown.
- Q8. The error-message prefix is double-encoded text in the source; whether tests or consumers depend on the exact bytes is unknown (tests not read). Several comments in `lexer.ts`, `parser.ts`, `filters.ts` and `coercion.ts` show the same encoding damage for arrows.
- Q9. The interpreter prints swallowed math errors with `console.log`; whether that output is intended for n8n execution logs is unknown. Looked at: `interpreter.ts:111-118`.

## Answered
