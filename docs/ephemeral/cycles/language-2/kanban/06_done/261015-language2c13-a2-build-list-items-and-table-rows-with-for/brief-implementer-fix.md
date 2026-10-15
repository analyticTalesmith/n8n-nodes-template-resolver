# Brief: implementer, fix two defects in the new test file

## Objective and why

Card goal: FOR and IF build LIST items and TABLE rows (see `brief-implementer.md` next to this file). Your earlier report found 14 failing tests in `tests/language/list-table-children.test.ts` that are test defects, not code defects. The build lead confirmed both and authorizes exactly these two edits to that file (recorded as test amendments); change nothing else.

## Decisions already made

1. `goldenCase()` (around line 568) returns `results[0]?.message ?? "no result"`; a passing case has no `message`. Change it so a passed result gives message `""` (for example `results[0]?.passed ? "" : (results[0]?.message ?? "no result")`). Keep `count`.
2. The three rows "two backslashes before a pipe in a header cell", "three backslashes before a pipe in a header cell" and "a pipe after two backslashes in a header cell of a table with generated rows" expect a 5-hyphen separator for a 6-character header cell; the unchanged header rule (`Math.max(5, cell length)`) gives 6 hyphens (`|:------|:-----|`). Fix the expected strings in those three rows only: the first separator segment gets 6 hyphens. Do not change `core/`.

## Owned files and scope

Only `tests/language/list-table-children.test.ts`, in the worktree `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-build-list-items-and`.

## How the work is judged

`node node_modules/jest/bin/jest.js --runTestsByPath tests/language/list-table-children.test.ts` passes entirely (1736), then the whole suite `node node_modules/jest/bin/jest.js` and `npx tsc --noEmit -p .` exit 0. Commit once with `test(language): fix the golden helper and header separator rows`; then say "done". Never redirect output to nul.

## Model and effort

Sonnet at medium effort: a two-spot mechanical edit.

## Result and status

Final message: status line (done, done with concerns, needs context or blocked) and the three numbers.
