# Brief: implementer, fix review finding f1

## Objective and why

Card goal: FOR and IF build LIST items and TABLE rows (see `brief-implementer.md` next to this file; spec in `docs/ephemeral/work/261015-language2c13-a2-build-list-items-and-table-rows-with-for/spec.md`).

Finding f1 (defect): a FOR with no ROW inside an IF that builds rows is not recognised by `holdsRow`, so it is rendered through `visitFor` and, in strict mode, throws for a non-iterable. The spec says a FOR in a TABLE row context never errors on a non-iterable. Reproduction: `{{TABLE}}{{IF t}}{{FOR obj AS x}}{{# row later #}}{{END_FOR}}{{END_IF}}{{END_TABLE}}` with data `{t:true, obj:{k:1}}` in strict mode must render the empty table output (like the same template with a direct FOR: no error), in `render` and `resolveTemplate`.

## Decisions already made

- Fix in `core/src/interpreter.ts` only. Give `rowsFromChild` and `tableRowsFrom` a `strict` flag (strict row context = an IF written directly in the TABLE, and the bodies, ELSE bodies and branches of every FOR and IF nested in it; the parser already guarantees these hold only ROW, FOR, IF).
  - In strict mode `tableRowsFrom` sends every `TableRow` to the row add, and every `For` and `If` node to `rowsFromChild(node, rows, true)`; no `holdsRow` test, no text handling.
  - In legacy mode (the body of a FOR written directly in the TABLE, where the body is parsed generically) keep today's code unchanged, including the `holdsRow` test; a node it sends to `rowsFromChild` stays legacy (`strict` false).
  - `visitTable`: a direct FOR child goes to `rowsFromChild(child, rows, false)`; a direct IF or ROW child goes with `strict` true.
- No parser change, no other file. Strict versus lenient differs only for missing data: a missing iterable name in such a FOR keeps its strict `missing-variable`.
- Tests: add a NEW block at the very end of `tests/language/list-table-children.test.ts` (do not change any existing row) named with criterion id `lc-table` (and `lc-errors` where about errors), `it.each` rows run in the four entries like the existing rows (reuse its helpers `expand`, `verify`, `OUT`, `ERR`, `SL`), at least: the reproduction above (strict and lenient, empty rows output: check what `render` gives for a TABLE with no rows and pin it), a FOR holding only a comment in an IF in a TABLE over a non-iterable object, over null, over an empty array with an ELSE body that holds a ROW, over an array (renders no rows), a FOR in a FOR in an IF with only comments, a missing iterable (strict `missing-variable` at the FOR, lenient silent), and the same template with the FOR directly in the TABLE as a control. Say in the block comment that it was added in review round one.
- Never redirect output to `nul`; `node_modules` in the worktree is a junction.

## Owned files and scope

`core/src/interpreter.ts` and `tests/language/list-table-children.test.ts` in the worktree `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-build-list-items-and`.

## How the work is judged

The new rows fail before the fix and pass after; the gate file, the whole suite (`node node_modules/jest/bin/jest.js`) and `npx tsc --noEmit -p .` all exit 0. Commit once, `fix(language): build rows from every for and if in a table if`; then say "done" and give the numbers.

## Model and effort

Sonnet at medium effort: a small mechanical fix.

## Result and status

Final message: status line and the numbers (gate file tests, full suite tests, tsc exit, count of new rows and that they failed before the fix).
