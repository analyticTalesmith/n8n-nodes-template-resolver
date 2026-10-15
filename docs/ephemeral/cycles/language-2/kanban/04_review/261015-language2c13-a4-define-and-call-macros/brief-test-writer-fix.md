# Brief: test writer, rows for the review findings of the macros card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly. Cycle goal (`docs/ephemeral/cycles/language-2/CYCLE.md`): grow the language with every loop, call and output bounded and every old template unchanged. Card goal: macros (`DEFINE`, `CALL`) whose recursion, fan-out and output growth are bounded and whose errors are located.
The blind review of the macros card found three problems. Your objective: add the failing (and guard) rows that pin them, so the implementer can fix the code. You write tests only; never under `core/`.

Read first:
- `docs/ephemeral/cycles/language-2/kanban/04_review/261015-language2c13-a4-define-and-call-macros/fix-requests.md` in the main checkout `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver` (absolute path; the worktree copy may be stale): the three findings with scenarios, causes, the decided design and the rows wanted. It is the contract of this brief;
- `docs/ephemeral/work/261015-language2c13-a4-define-and-call-macros/spec.md` (the card spec), the existing `tests/language/macros.test.ts` in your worktree (copy its helpers and style; its mc-output and mc-compat blocks), `core/src/interpreter.ts` (`renderChildren`, `collectListItems`, `processCellsArray`, `visitSection`, `visitListItem`) and `core/src/parser.ts` (`parse`, `parseNode`, `parseDefine`) to know what exists.

## Rules

- Your worktree is `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-define-and-call-macros` (the cycle branch tip). Work and commit there. Never redirect output to `nul`. Never run `npm install`.
- You may edit only `tests/language/macros.test.ts`, and only by APPENDING one new block of rows at its end (plus a comment above the existing 25000-deep nested-condition rows, as the fix requests say). Change no existing row. No other file, no stub.
- Guard rows (old templates that must keep their output) must be probed against the base: export the commit `5ddf88c` with `git archive 5ddf88c | tar -x -C <a fresh scratch directory>` outside the repo, link `node_modules` into it (a junction to the main checkout's `node_modules`), and run each template through `render` and `resolveTemplate` there (a throwaway script or test outside `tests/`, deleted after); write the base output as the literal. Guards must pass on the worktree's current code too when they are about templates the current code handles, but the finding scenarios of f2 fail now: that is the point (they pass at base, fail now, pass after the fix).
- Every new test name starts with its criterion id (`mc-define`, `mc-output`, `mc-compat`). Table-driven `it.each`, all four entries (`render-strict`, `render-lenient`, `resolve-strict`, `resolve-lenient`) unless the point is `render` only (stats, diagnostics). No codes (card, ticket, finding labels such as f1) in test names or the commit message.
- Boundary numbers must be worked out by hand; where unsure use clearly-over and clearly-under pairs. Keep the added runtime to a few seconds.
- Commit once at the end: `test(language): pin define placement, trimmed output and list and table limits`.

## Result

Final message: status line, rows added per finding, how many fail on the current code and why, the base probes you took (template, base output) for the guards, and anything you were unsure of. Run only your file while iterating: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/macros.test.ts`; before the commit run the whole suite once and report numbers (your new rows are the only failures).
