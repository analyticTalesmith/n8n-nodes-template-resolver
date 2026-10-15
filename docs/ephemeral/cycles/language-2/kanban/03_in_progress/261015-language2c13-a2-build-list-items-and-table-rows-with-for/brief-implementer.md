# Brief: implementer for the LIST and TABLE children card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language with every unknown name or bad argument an error in every mode, and every loop, call and output bounded.
Card goal: FOR and IF (with ELSEIF and ELSE) inside LIST build numbered items and inside TABLE build rows, on the one loop runner (`runLoop`, `core/src/interpreter.ts`) and the scope stack (`core/src/scope.ts`); every old template keeps its output; a table-cell pipe after an even run of backslashes is now escaped.
Your objective: make the committed failing tests in `tests/language/list-table-children.test.ts` (and the two golden cases `tests/golden/render-cases/lang-list-for/` and `lang-table-if/`) pass, with every existing test still passing.

Read first: the spec `docs/ephemeral/work/261015-language2c13-a2-build-list-items-and-table-rows-with-for/spec.md` (it settles the behaviour; the criteria are verbatim in it), `compat-probe-base.json` next to it (what the unmodified code outputs for templates that must not change), then `core/src/parser.ts` (parseNode, parseIf, parseFor, parseList, parseListItem, parseTable, parseTableRow), `core/src/interpreter.ts` (visitList, visitListItem, visitTable, tableRowsFrom, processCellsArray, runLoop), `core/src/analyze.ts`, `core/src/types.ts`, `core/src/spec.ts`, `core/src/scope.ts`, then the tests.

## Decisions already made

- The tests are the contract. If a test seems wrong, stop and say so in your report; never edit a test. ONE exception, approved by the lead: the row named "TABLE FOR with an unclosed ROW is still a syntax error at END_FOR" in the compat table contradicts the criterion `lc-close` (a ROW without END_ROW ends at END_FOR inside a FOR that builds rows). Change that single row to expect the new result (an `OUT` of the rows `| a | 1 |`, `| b | 1 |`, `| c | 1 |`) and rename it to say a ROW ends at END_FOR; change nothing else in the test file. Name this edit in your report.
- Parse design (spec "Interface"): `ListNode.items` becomes `ListChild[]` and `TableNode.rows` becomes `TableChild[]` (types exported from `types.ts`); the `TableRow{cells:[[ForNode]]}` wrapper for a FOR directly in a TABLE goes away; a FOR directly in a TABLE is parsed exactly as today (generic body, legacy), the double node count it has today stays. `parseIf` and `parseFor` take an optional child parser for their bodies; a list child parser and a row child parser implement the child rules (strict: item/row, FOR, IF, comments, whitespace; any other tag or text is a `SyntaxError` at its own token, keeping the existing message starts). FOR and IF in these contexts go through `nested(...)` and `open(...)`. HEADER only directly in a TABLE.
- Closing: `parseListItem` and `parseTableRow` also stop at END_FOR, ELSE, ELSEIF and END_IF (not consumed). A `LIST_ITEM` token met in `parseNode` while inside item content (track it with a counter set in `parseListItem`, the LIST parser handles its own items before `parseNode`) throws a `SyntaxError` at that token whose suggestion contains `END_LIST_ITEM`.
- Run design: one recursive collector for LIST children (shared counter, joins by `\n`, nested LISTs keep their own counter via the existing `visitList(depth)`), and the existing `tableRowsFrom` extended for TABLE rows: an IF or FOR node that holds a ROW directly in any of its branches or bodies (through nested IF and FOR; include ELSE bodies) is run in row mode (FOR through `runLoop(node, true, ...)` so a non-iterable renders no rows without error; IF picks its branch with the same condition evaluation as `visitIf`, errors located at the IF); every other node keeps today's text handling. No second copy of the loop code.
- `processCellsArray`: the pipe escape rule is now "a pipe preceded by an even run of backslashes is written `\|`, odd run left alone" (spec "Numbering and rendering").
- analyze: handle `ListItem` (condition kind `list_item`) as a visited node, For and If children of LIST and TABLE; loop name scoped over the body only, not the ELSE body.
- `spec()`: update the descriptions of LIST, LIST_ITEM, TABLE, ROW (tests check that LIST and TABLE descriptions name FOR and IF and that LIST_ITEM/ROW descriptions say how an unclosed one ends; read the tests for the exact words they look for); no keyword added.
- `resolveTemplate` and `render` agree on the language; strict versus lenient differs only for missing data.
- No new runtime dependency; no `eval`; do not edit `docs/living/`.
- Never redirect output to `nul`. `node_modules` in the worktree is a junction; never run `npm install`.

## Owned files and scope

You may change only (from `card.json`): `core/src/types.ts`, `core/src/parser.ts`, `core/src/interpreter.ts`, `core/src/analyze.ts`, `core/src/spec.ts`, plus the single test row above. Work only in the worktree `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-build-list-items-and`. Do not change other files; if you need one more, stop and ask.

## How the work is judged

- Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/list-table-children.test.ts --json` passes entirely.
- Before saying done, run the whole suite `node node_modules/jest/bin/jest.js` (all green, including `tests/regressions`, the LIST and TABLE tests of `tests/TemplateResolver.node.test.ts`, `tests/promptaware/golden-render.test.ts`, `tests/language/*`, `tests/headless/*`) and `npx tsc --noEmit -p .`; both must exit 0.
- Report duplication you could not remove and any place where a test forced a design choice.
- Commit once at the end inside the worktree with a Conventional Commit (for example `feat(language): build list items and table rows with for and if`), no codes, no attribution lines, no review-process words. Then say "done".

## Model and effort

Sonnet at medium effort: mechanical code from precise criteria and tests.

## Result and status

Return your report as your final message (and save `report-implementer.md` in the card folder if you can) and end with a status line: done, done with concerns, needs context or blocked; list changed files, the gate, full-suite and tsc results with numbers. Never write secrets. No card, ticket or plan codes in names or commit messages.
