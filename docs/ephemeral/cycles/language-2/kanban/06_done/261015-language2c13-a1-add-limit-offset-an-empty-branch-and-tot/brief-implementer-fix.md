# Fix request: two review findings (smallest change)

Objective chain: a deterministic no-eval template language; this card added the FOR window, ELSE and a scope stack; the card must not change the output of previously valid templates beyond the two approved exceptions (trailing words after the FOR item name; inherited path segments). Two places broke that. Fix only these; no other change. Files you may change: `core/src/parser.ts` and `core/src/interpreter.ts`. Do not edit tests. Never redirect output to nul. Worktree: C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-add-limit-offset-an

Failing tests: the 7 red rows in the block "review round 1 regressions" at the end of `tests/language/for-window.test.ts` (names end with `(review round 1)`). Every other row must stay green.

## f2: TABLE FOR body that is not a ROW (`tableRowsFrom` in `core/src/interpreter.ts`)

Base behaviour (before this card): each non-ROW body node was rendered alone; when its text was not blank it became one row (`split("|")`, trimmed cells). So two IF blocks in one FOR body gave one row each, and one IF whose text holds a line break gave one row with the break inside. This card now joins every consecutive non-ROW node into one text and splits once, which merges two IF blocks into one row.
Restore it without breaking the frozen row where inline nodes `${{x}}|${{x}}` (a Variable, a Text `|`, a Variable) form ONE row:
- inline nodes (types `Text`, `Variable`, `Ternary`, `Comment`) that are neighbours form a run; the run is rendered together. A run of exactly one node: as before (one row if its text is not blank, split on `|`). A run of several nodes: split its text into lines (on `\r?\n`), and every non-blank line is one row split on `|`, trimmed cells.
- any other node type (IF, CASE, FOR, LIST, ...) is a unit of its own: flush the run before it, render it alone, one row if not blank, split on `|` (exactly the base behaviour, including a line break inside staying in one row).
- a TableRow node still flushes the run and adds its cells; the returned length stays the sum of the cell lengths added.

## f3: FOR header whose iterable holds a space (`parseForHeader` in `core/src/parser.ts`)

Base behaviour: the iterable is everything between `FOR` and the first standalone `AS` word (case-insensitive), so `{{FOR my items AS x}}` reads the data key `my items`. The header now requires the third word to be AS and rejects that. Restore: match the trimmed tag text with `/^FOR\s+(.+?)\s+AS(?:\s+(.*))?$/is` (first standalone AS wins), take group 1 as the iterable text (split on `.`, each part trimmed, as before), split group 2 on whitespace and read the item name (`/^\w+$/`, else the existing syntax error) and the remaining words as the `limit=`/`offset=` arguments exactly as today. No match, or an empty rest, stays the existing `Invalid FOR syntax` syntax error located at the FOR tag; extra words after the item name that are not `limit=`/`offset=` stay a syntax error.

## Done means

- `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/for-window.test.ts` all green; full suite `node node_modules/jest/bin/jest.js` green; `npx tsc --noEmit -p .` exit 0.
- Commit once with `fix(language): keep table rows per block and spaced for iterables` (no codes, no review words), then say "done". Report the numbers in your message (the Write tool may refuse a report file).
