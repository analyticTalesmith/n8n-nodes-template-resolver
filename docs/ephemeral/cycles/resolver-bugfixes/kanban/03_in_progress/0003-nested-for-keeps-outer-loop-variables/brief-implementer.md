# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: keep the enclosing loop's variables and @index values after an inner loop ends.
Your objective: make the failing tests pass with the smallest change at the cause.

## Decisions already made
Worktree: C:/n8n-smoke/.worktrees/nested-for (branch feature/nested-for). Work only there.
Read first: .claude/skills/root-cause/SKILL.md, then docs/ephemeral/work/0003-nested-for-keeps-outer-loop-variables/root-cause.md (the cause: loop state is one flat Map, every loop ends with loopContext.clear(), and every iteration overwrites the enclosing loop's @index entries), spec.md in the same folder, and the card's card.md and card.json under docs/ephemeral/cycles/resolver-bugfixes/kanban/03_in_progress/0003-nested-for-keeps-outer-loop-variables/.
The tests exist: test-node/nested-for.test.ts. Do not edit them. Gate: node scripts/run-node-tests.mjs .test-build/test-node/nested-for.test.js, and also run the full suite `node scripts/run-node-tests.mjs`. The old jest suite in tests/ cannot run (jest is not installed); do not try to install it.
Fix both places that clear the shared loop state in nodes/TemplateResolver/interpreter.ts: the FOR visitor and the TABLE row loop. Save the entries a loop will overwrite and restore them when it ends (use try/finally so a throwing body also restores). Keep the change small. Do not refactor anything else. Do not commit; the lead commits. Do not create files named nul.

## Owned files and scope
nodes/TemplateResolver/interpreter.ts only.

## How the work is judged
The gate and the full node:test suite pass; criteria nf-01 to nf-04 in card.json.

## Model and effort
sonnet, medium: a small, local change with a clear cause.

## Result and status
Final message report as in your charter, with a status.
