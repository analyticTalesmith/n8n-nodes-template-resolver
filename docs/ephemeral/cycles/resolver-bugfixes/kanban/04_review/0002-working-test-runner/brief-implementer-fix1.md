# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a node:test runner that compiles the TypeScript and runs tests in test-node/, so the bug cards can show a failing test first.
Your objective: answer one review finding with the smallest fix.

## Decisions already made
Fix request (finding f1, goal-risk, serves cycle-goal): the runner never clears .test-build, so compiled tests from deleted or renamed sources keep running. Reproduction: add test-node/tmp.test.ts with a failing test, run the runner (fails), delete the source, run again: the stale .test-build/test-node/tmp.test.js still runs and the exit is nonzero.
Smallest change: in scripts/run-node-tests.mjs, remove the .test-build directory (fs.rmSync recursive force) before compiling. Nothing else.
Worktree: C:/n8n-smoke/.worktrees/test-runner, branch feature/test-runner. First run `git merge --ff-only feature/fix-resolver-bugs` there is NOT needed; just edit scripts/run-node-tests.mjs in that worktree.
Do not edit the frozen test scripts/run-node-tests.test.mjs. Do not commit; the lead commits.

## Owned files and scope
scripts/run-node-tests.mjs only.

## How the work is judged
`node --test --test-reporter=tap scripts/run-node-tests.test.mjs` passes, and you checked the reproduction (create the failing temp test, run, delete it, run again: exit 0). Remove the temp files after.

## Model and effort
sonnet, low: a one-line fix.

## Result and status
Final message report: files changed, gate result, one line verifying the finding, status.
