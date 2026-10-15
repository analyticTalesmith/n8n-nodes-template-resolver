# Brief: implementer, fixes for the review findings of the macros card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly. Cycle goal (`docs/ephemeral/cycles/language-2/CYCLE.md`): every loop, call and output bounded, every old template unchanged. Card goal: macros (`DEFINE`, `CALL`) with bounded recursion, located errors, isolation.
The blind review found three problems; the failing rows for them are committed at the end of `tests/language/macros.test.ts` (commit "pin define placement, trimmed output and list and table limits"). Your objective: make them pass with the smallest change inside the scope, break nothing.

Read first (main checkout `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver`, absolute paths; your worktree copy of the card folder may be stale):
- `docs/ephemeral/cycles/language-2/kanban/04_review/261015-language2c13-a4-define-and-call-macros/fix-requests.md`: the three findings f1, f2, f3 with scenario, cause, decided design. It is the contract;
- the card spec `docs/ephemeral/work/261015-language2c13-a4-define-and-call-macros/spec.md`;
- the code: `core/src/parser.ts` (`parse`, `parseNode`, `parseDefine`), `core/src/interpreter.ts` (`renderChildren`, `held`, `visitSection`, `runSection`, `visitListItem`, `visitList`, `collectListItems`, `runTable`, `processCellsArray`, `collectRows`, `rowsFromChild`, `runLoop`), `core/src/render.ts` (the RangeError net), `core/src/analyze.ts`.

## Decisions already made

- Tests are the contract; do not edit any test. If a test seems wrong, stop and report it as a numbered question.
- Scope (edit only): `core/src/parser.ts`, `core/src/interpreter.ts`, `core/src/render.ts`, `core/src/macros.ts`, `core/src/analyze.ts`, `core/src/errors.ts` (only if needed). No other file.
- A template with no CALL must behave exactly as at the base commit `5ddf88c` for everything f2 and f3 touch, except that, as before this fix, an overflow inside an IF/CASE/SECTION/FENCE body may be located at the deeper child that tipped it. Loops keep their own check at the FOR node (`runLoop`), unchanged. The running check counts only text that cannot be dropped by a trimming body (SECTION body, LIST_ITEM content, table cell): the sum of what it counts for non-CALL children may never exceed the length of the final trimmed text. CALL output counts in full (a macro body starts a fresh, non-trimming context).
- f3: count each finished LIST line and each finished table cell into `held` as it finishes (after the cell's trim and pipe escape), check the limit there (located at the item, ROW or cell node that tipped it), and restore `held` to its value at the start of the LIST or TABLE in a `finally`. A cell's nodes run through the same child loop as other bodies, in a trimming context, so many CALLs in one cell are counted as they finish.
- RangeError net: only a stack overflow (message contains "Maximum call stack size exceeded") is `limit-depth`; a `RangeError` "Invalid string length" is a `limit-output` diagnostic in `render` (code `limit-output`, message "Output is longer than the engine can hold", 1:1 when no node is known). `analyze` keeps its stack-overflow rule.
- No runtime dependency; no `eval`; no template-supplied regular expression compiled. Keep functions small, comments say why, one accounting mechanism (no second counter beyond what f2 needs for call whitespace).

## Working rules

- Work in the worktree `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-define-and-call-macros` only; never push; never touch `main`. Never redirect output to `nul`. `node_modules` is a junction; never run `npm install`.
- Run `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/macros.test.ts` while iterating (`-t "mc-define"` etc.). Before saying done run the whole suite `node node_modules/jest/bin/jest.js` (all green) and `npx tsc --noEmit -p .` (exit 0).
- Commit once at the end: `fix(language): place define at the top level and count trimmed output and list and table cells`. No codes, no review words in the message. Then say "done".

## Result

Final message: status line, files changed, gate run, whole suite and tsc numbers, how each finding was fixed in one line each, any question.
