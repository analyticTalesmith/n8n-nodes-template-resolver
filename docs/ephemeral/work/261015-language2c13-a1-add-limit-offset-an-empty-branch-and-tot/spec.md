# Spec: FOR window, empty branch, @total, one loop runner, scope stack

Source: `docs/ephemeral/research/language-2-plan.md` section L1 (criteria are frozen in `card.json`). Behaviour changes to old templates are approved (plan question 5): trailing words after the FOR item name become a syntax error; a path segment reads own properties only.

## Acceptance criteria

- fw-window: a literal or a path gives the window; a negative, non-integer, non-numeric or unsafe-integer value is a `type-error` located at the FOR in every mode; a missing path is `missing-variable` in strict mode and an ignored argument in lenient mode; the paths are read in the scope outside the loop.
- fw-meta: `@index0 @index1 @first @last @notFirst @notLast` describe the position in the rendered window; `@total` is the number of items the loop renders after offset and limit, the same on every iteration; outside a loop `@total` is a missing variable.
- fw-else: the empty branch renders exactly when zero items render (empty array, offset past the end, `limit=0`, a missing or non-iterable value in lenient mode); not when one item renders; a strict non-iterable keeps today's located `type-error`; the loop name and the `@` names are not bound inside the ELSE body; a second ELSE in one FOR is a `syntax-error` at it; an IF's own ELSE and a FOR inside an IF branch are not confused; ELSE after ELSEIF or outside IF and FOR keeps today's "Unexpected token".
- fw-args: an unknown argument (`max=3`), a repeated argument, trailing words and a missing item name are a `syntax-error` at the FOR tag in every mode, even in a branch that never renders.
- fw-table: TABLE rows built by FOR use the same runner and get window, ELSE (its body holds ROWs) and `@total`; the legacy rule "a non-iterable renders no rows, even in strict mode" is kept and the ELSE rows render, without an error.
- fw-limits: each rendered item counts toward `maxIterations` (skipped offset items do not); the running output check applies inside the loop and the ELSE body; `stats.iterations` counts rendered items.
- fw-scope: loop names and metadata live on a stack frame that is gone after END_FOR; an outer loop's name and metadata are visible again after an inner loop; an inner name shadows an outer or data name only inside; frames carry a parent link so a later card adds `@parent` without reworking the stack.
- fw-no-copy: conditions, math and filters read variables through the scope chain; `resolveTemplate` over a loop with an IF, with the data given as a Map subclass that counts `Symbol.iterator`, `entries`, `keys` and `forEach` calls, makes zero copies of the data map during the run. The test calls `resolveTemplate` because `render` builds its own Map.
- fw-own: a non-root path segment reads own properties only, in output, conditions and math (`x.constructor`, `x.__proto__`, `x.toString` are missing, not inherited engine objects); an own key with those names still works.
- fw-compat (tool): the full suite passes, including `tests/regressions/nested-for.test.ts` and the TABLE tests of `tests/TemplateResolver.node.test.ts`; no existing test file changes.

## Syntax settled

`{{FOR <path> AS <name> [limit=<arg>] [offset=<arg>]}}`. `FOR` and `AS` keep their current case rules (`as` case-insensitive); `limit` and `offset` are lower case only; in any order, at most once each; no spaces around `=`. `<arg>` is either a plain decimal literal (`3`, `0`; a literal such as `-1` or `1.5` is accepted by the parser and fails at run time as a `type-error`) or a variable path (`n`, `cfg.page.size`; the same path characters a FOR iterable takes). A quoted value, an empty value, `limit` with no `=`, an unknown key (`max=3`, `LIMIT=3`), a repeated key, any other trailing word and a missing item name are a `syntax-error` located at the FOR tag.

`{{ELSE}}` directly inside a FOR body (not inside a nested block) is its empty branch: it ends the main body and runs to END_FOR. A second `{{ELSE}}` in the same FOR is a `syntax-error` at it. `{{ELSEIF}}` directly inside a FOR stays "Unexpected token".

Items are `array.slice(offset, offset + limit)` after coercion (no limit: to the end; no offset: 0).

## Window value rules

A window value is valid when it is a number or a string holding a plain decimal number (digits, optional sign and fraction, surrounding spaces allowed), and the number is a non-negative safe integer. Anything else (a boolean, an array, an object, a non-numeric string, NaN, Infinity, a negative number, a fraction, a value above `Number.MAX_SAFE_INTEGER`) is a `type-error` at the FOR in every mode, whether or not the loop would have items. A path whose value is missing, `null` or `undefined` counts as missing: strict mode throws `missing-variable` at the FOR (the path text as the name), lenient mode ignores the argument (no offset / no limit). Paths are read in the scope outside the loop, so the loop's own item name and `@` names are not visible to them (an outer loop's are).

## Order of work in one FOR

1. Resolve the iterable (a missing root in strict mode throws as today, located at the FOR).
2. Coerce it. A non-iterable in strict mode throws today's `type-error` at the FOR, except in TABLE (legacy rule: silent, treated as zero items). In lenient mode it is zero items.
3. Read and validate `limit` and `offset` (errors above; also when the value is non-iterable in lenient mode or TABLE legacy, so a bad window is never hidden).
4. Window the items; `@total` is the window length.
5. For each item: count one iteration (`limit-iterations` located at the FOR), bind a frame, render the body, check the running output length.
6. If zero items rendered, render the ELSE body in the outer scope (no loop name, no `@` names bound; an outer loop's names stay visible), with the same running output check.

## Interface

- `core/src/scope.ts` (new): a read-only lookup type (`has(name)`, `get(name)`), a root scope that wraps the caller's data map without copying it (it only calls the map's `has` and `get`), and a child frame with a `parent` link and its own names (loop name, `@index0 @index1 @first @last @notFirst @notLast @total`). The interpreter holds the current frame and restores the parent after END_FOR (also when an error unwinds; `interpret` starts from the root). One shared helper reads a path segment from an object by own property only; interpreter and expressions both use it.
- `core/src/types.ts`: the parameter type of condition, math and path functions becomes the read-only lookup (a `Map` still satisfies it, so public signatures accept Maps). `VariableMap` stays exported. `ForNode` keeps `iterable`, `itemName`, `body` with their meaning and gains optional fields alongside (limit and offset argument, ELSE body); set them only when written, so the existing AST-shape tests in `tests/TemplateResolver.node.test.ts` still pass.
- `core/src/parser.ts`: FOR header parsed token by token (no lazy regex); ELSE handled in `parseFor`.
- `core/src/interpreter.ts`: one private loop runner used by `visitFor` and by the TABLE FOR rows; `getAllVariables` is deleted.
- `core/src/expressions.ts`: `resolveValue` and the helpers read through the lookup type; non-root segments own-only.
- `core/src/analyze.ts`: the loop name is scoped over the body only (not the ELSE body); `limit`/`offset` paths are recorded as usage kind `for` (a path starting with `@` or a scoped loop name is not an input); `@` names never inputs; the ELSE body is walked once, without the loop name.
- `core/src/spec.ts`: FOR args `array AS item [limit=N] [offset=N]` with a description naming the window, ELSE and `@total`; the `ELSE` row's description says it also ends a FOR body (its args stay empty; no new keyword).

## Limits and errors

- `stats.iterations` = items rendered (offset-skipped and limit-cut items are not counted).
- Output check after each item and after the ELSE body (and per TABLE row built by FOR).
- Every new diagnostic carries the FOR tag's line and column, never 1:1.

## Non-goals

SET, LIST/TABLE IF children, `@parent`, `AS k, v` (later cards). No living document edits; no deltas (docs_impact none).
