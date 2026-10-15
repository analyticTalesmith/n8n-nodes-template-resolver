# Spec: bind block-scoped locals with SET

Source: `docs/ephemeral/research/language-2-plan.md` section L3 (criteria are frozen in `card.json` and are the contract; `st-compat` is a tool criterion, the full suite). Decisions of the project lead are marked "decided".

## Acceptance criteria

Verbatim from `card.json`: st-set, st-math, st-scope, st-null, st-names, st-single, st-ws, st-analyze, st-keywords, st-size, st-openapi, st-compat. Read them there.

## Syntax settled

- `{{SET name = expression}}`: a single tag, no closer (ADR 0007). Keyword `SET` is upper case only, like every tag word (`{{set x = 1}}` stays an unknown tag). `END_SET` is not a keyword: `{{END_SET}}` is `Unknown template tag` (lexer).
- `name` is `[A-Za-z_][A-Za-z0-9_]*`. After the name comes one `=` (not `==`), then the expression, up to the closing braces (a trim marker `-` before them is a trim marker, as for every tag).
- `{{SET}}`, `{{SET x}}`, `{{SET x =}}`, `{{SET = 1}}`, `{{SET x == 1}}`, `{{SET 1x = 2}}` and `{{SET a.b = 1}}` are a `syntax-error` located at the tag (parse time, so `render`, `resolveTemplate`, `validate` and `analyze` report it even in a branch that never renders; the same in every mode). A name that starts with `@`, or that is the item name of a FOR whose BODY encloses the tag (a "live loop name"; the ELSE body of that FOR is outside it), is a `syntax-error` at the tag. `__proto__`, `constructor`, `toString`, `length` are ordinary names (scopes are Maps).
- `expression` is what may stand inside `${{ }}` (a path, arithmetic, `?? default`, `| filters`) with one addition valid only in SET: the first term may be a literal: quoted text (`"..."` or `'...'`), a number, `true`, `false` or `null`. A literal may be followed by `| filters` and by `?? default`; a number may start an arithmetic expression (`SET n = 2 * 3`, `SET t = 0.1 + 0.2`). Text inside the quotes is never reinterpreted (a `??`, `|`, `.`, `+` or `}` inside is plain text). `${{ }}` itself does not change: `${{"abc"}}` stays what it is today.
- The SET tag counts as one node toward `maxNodes` (located at the tag when crossed); it is not a block (no `maxDepth` effect, no `analyze().blocks` entry).
- SET is a child of any generic body: top level, IF/ELSEIF/ELSE branch, CASE clause (WHEN, DEFAULT), FOR body and ELSE body, LIST_ITEM content, SECTION and FENCE body, ROW and HEADER cells. It is NOT a child of the strict LIST and TABLE child lists (directly among LIST children or TABLE children, or among the children of a FOR or IF that builds items or rows): there it is the same located `syntax-error` as any other tag (`Unexpected token in LIST: SET` and its TABLE counterpart). Write SET before the LIST or TABLE, or inside an item or row.

## Value and scope

- One value evaluator: `${{ }}` and SET both call it (extract it from `visitVariable`; `visitVariable` keeps printing exactly what it prints today). It returns the value (`TemplateValue`), not its text. Math: in `render` the bound number is the number the output prints (`Number(formatNumber(result))`, so `SET t = 0.1 + 0.2` binds `0.3`, `${{t}}` prints `0.3` and `{{IF t == 0.3}}` is true); in `resolveTemplate` it is the plain result (`0.30000000000000004`), as `${{0.1 + 0.2}}` prints there today. A math expression keeps today's rules (no default or filter applied after math, `/0` and `%0` an error in `render` only, a malformed text is an error only when no variable has that name). The unprintable check that runs before a text filter stays in the evaluator, so `SET c = cyc | upper` (a cyclic value or BigInt) is the same `type-error` as `${{cyc | upper}}`, located at the SET. Binding a cyclic or BigInt value with no filter is fine; printing it later is the `type-error` it is today. An array, object, number or boolean is bound as it is (an array stays an array; `{{FOR list AS i}}` over it works).
- Missing data: strict mode, a missing variable in the expression is a `missing-variable` located at the SET (line and column of the tag, never 1:1). Lenient mode, a missing value binds `null`; reading the name later finds a bound name (no missing-variable) and prints empty; `SET x = missing ?? "d"` binds `"d"`.
- Errors of the expression (`type-error`, `missing-variable`, unknown filter, bad parameter, math errors) are the same code and message as in `${{ }}`, located at the SET tag.
- Scope: a SET binds in the innermost block's own frame; the root scope (the caller's data) is never written. Blocks (each its own frame, created when entered): the top level, an IF/ELSEIF/ELSE branch, a CASE clause (WHEN and DEFAULT), one FOR iteration (fresh each iteration; the ELSE body is its own block), a LIST_ITEM content, a SECTION body, a FENCE body, a ROW or HEADER (one frame per row). A name is visible from the tag to the end of its block, including blocks nested in it (a nested block can rebind; the rebinding ends with the nested block and the outer value is back). Before the tag the name reads whatever it read before (data, or missing). Rebinding in the same block overwrites. A SET value shadows a data name of the same name. `SET x = x + 1` reads the old `x` (data or an outer SET), then binds.
- A frame may be created only for a block whose direct children include a SET (cheap path for every other block): the observable rules above are the contract.
- SET outputs nothing (`""`); a SECTION whose body holds only SET renders as an empty body (omitted with skip_empty).
- Size (`st-size`): in the evaluator, after each filter (and, for a SET, on the final value), a string result longer than `limits.maxOutputChars` is a `LimitError` `limit-output`, located at the variable or the SET tag (`at(node, ...)`). Non-strings (arrays, objects, numbers) are not measured: no filter grows an array beyond its input. For `${{ }}` the check runs after each filter only (an unfiltered data string keeps the existing output check). DECIDED, accepted behavior change: a chain whose intermediate string is longer than the limit but shrinks later (`${{ long | upper | head=4 }}` with a data string longer than `maxOutputChars`) is now a `limit-output`; `compat-probe-base.json` records today's outputs (`longThenShrink`, `longFilterTail`).

## Lexer, whitespace, spec

- `core/src/lexer.ts`: the keyword table moves out of `getTokenType` into `export const KEYWORDS: Readonly<Record<string, TokenType>>` (every current entry plus `SET: TokenType.SET`; no `END_SET`), and the lookup is by own property only (`Object.prototype.hasOwnProperty.call`), so `{{constructor}}`, `{{toString}}`, `{{hasOwnProperty}}` are `Unknown template tag: {{constructor}}` etc. (at base they give `Unexpected token: function Object() ...`). `{{__proto__}}` keeps today's message (`Unknown template tag: {{__}}`; the keyword rule takes the upper-case-and-underscore prefix).
- `core/src/whitespace.ts`: `TokenType.SET` joins `STANDALONE_TAGS`; trim markers work as for every tag. A line holding only SET tags (and spaces) vanishes with its line break when `standaloneLines` is on; a SET with text on its line leaves that line (minus the tag), as for the other tags.
- `core/src/spec.ts`: `BLOCKS` gains `{ name: "SET", args: "name = expression", description: ... }` with no `closes`; the description says it binds a local for the rest of its block.
- `tests/language/surfaces.test.ts` (the one allowed amendment of an existing test, logged in `test_amendments` with approver "project lead"): `BLOCK_PAIRS` is derived from the exported `KEYWORDS`: for every keyword `K` that does not start with `END_`, the pair `[K, "END_K"]` when `END_K` is a keyword, else `[K, undefined]`. No row of today's table is removed (SET is added: `[SET, undefined]`), no assertion is weakened or removed, test names keep their form. The derived table makes a keyword added later without a `spec()` entry fail.

## Analyze

- `UsageKind` gains `"set"`. Variables read in the SET expression (the path, the root names of a math expression; a `??` default text is not a read) are recorded with kind `set`, optional when the expression has a `??` default (as `${{ }}` records them); filters in the expression count in `filters` and unknown or mis-parameterised ones give the same diagnostics as a variable. A literal-only expression reads nothing.
- The SET name is a local from the tag to the end of its block (same blocks as the interpreter); reads of that name after the tag (any kind) are not inputs; a read of the same name before the tag, or after its block, is an input. A FOR item name still scopes as today. The name set by SET is never itself recorded as read.
- `analyze().blocks` does not count SET; `spec().blocks` lists it (no `closes`).
- `api/openapi.json`: the `usedIn` array's items stay `type: string`, lose their `enum`, and gain a description naming the kinds (`output`, `if`, `elseif`, `case`, `for`, `list_item`, `table`, `set`, later `call` and `input`).

## Interface (files)

- `core/src/types.ts`: `TokenType.SET`; `SetNode { type: "Set"; name: string; ...the parsed expression }` (a literal-or-variable expression shape the evaluator takes: a `VariableNode`-like part plus an optional literal first term); add to the node unions the interpreter and analyzer switch on.
- `core/src/lexer.ts`, `core/src/whitespace.ts`, `core/src/spec.ts`, `core/src/analyze.ts`, `api/openapi.json` as above.
- `core/src/parser.ts`: `parseSet` through `open(TokenType.SET)` (counts a node), tracks the item names of the FOR bodies that enclose the tag.
- `core/src/interpreter.ts`: `evaluateValue` (the shared evaluator), `visitSet`, a block-scope helper; FOR creates a fresh frame per iteration for the body (the loop frame keeps item and `@` names).
- `core/src/scope.ts`: whatever the frames need (for example a way to open a child frame); scopes stay Maps.
- `core/src/expressions.ts` is not in scope (math and condition code are used as they are).

## Compatibility (probe the base before changing anything)

The previous cards' reviewers found breaks by running templates the old code accepted. `compat-probe-base.json` next to this file has today's `render` and `resolveTemplate` outputs for about 60 `${{ }}` and tag templates (strict and lenient, default limits and `maxOutputChars: 20`; keys `<name>[/lim20]/<strict|lenient>`) and their `analyze` result under `__analyze`, plus the block names of `spec()`. These must not change except as named: `{{constructor}}`, `{{toString}}`, `{{hasOwnProperty}}` (message), `{{SET ...}}` and `{{SET}}` (now a statement), and the intermediate-size case above. Examples to pin: `${{price + q | round=1}}` ignores the filter (today `0.3` render, `0.30000000000000004` resolve); `${{missing + 1}}` and `${{a + 1}}` are `missing-variable` in strict, empty in lenient; `${{cyc}}` is `type-error`; `${{o.constructor}}` is empty; `${{__proto__}}` and `${{constructor}}` are `missing-variable` strict, empty lenient; the text `SET x = 1` outside a tag is plain text.

## Non-goals

INPUT, DEFINE, CALL, partials, `@parent`, `AS k, v`; no accumulation (a SET never carries across FOR iterations); no `SET` of a path (`SET a.b = 1` is a `syntax-error`); no living document edits and no deltas (`docs_impact` none).
