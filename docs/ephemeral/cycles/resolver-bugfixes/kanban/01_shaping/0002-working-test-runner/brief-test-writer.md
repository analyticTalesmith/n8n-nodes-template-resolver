# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a node:test runner (`node scripts/run-node-tests.mjs`) that compiles TypeScript with tsc and runs tests from test-node/, so the bug cards can show a failing test first.
Your objective: write the failing test for this card, in the worktree C:/n8n-smoke/.worktrees/test-runner (branch feature/test-runner). Work only there.

## Decisions already made
Planning context: read docs/ephemeral/work/0002-working-test-runner/spec.md, docs/ephemeral/cycles/resolver-bugfixes/kanban/01_shaping/0002-working-test-runner/card.md and card.json (criteria tr-01 to tr-03), and docs/ephemeral/cycles/resolver-bugfixes/test-plan.md.
The card gate is: node --test --test-reporter=tap scripts/run-node-tests.test.mjs
Runner interface (from the spec): `node scripts/run-node-tests.mjs [testFile...]`; compiles first; with no arguments runs every .test-build/test-node/**/*.test.js; with arguments runs exactly those files; exit status is the test run's.
The test must be plain ESM at scripts/run-node-tests.test.mjs (it spawns the runner with child_process.spawnSync, no shell). It must cover: tr-01 (exit 0 when the smoke test passes; nonzero when given a failing .js test file written to a temp directory), tr-02 (stdout begins with "TAP version"). Include the criterion id in each test name and a message on every assertion. Criterion tr-03 is judged by review, not by a test.
The runner script does not exist yet and must not be written by you. Per your charter a missing module is never a valid red: commit a signature-only stub scripts/run-node-tests.mjs that exits 0 and prints nothing, so the tests fail by assertion. The test-node/smoke.test.ts and tsconfig.test.json files are NOT yours; do not create them.
The project's existing jest tests in tests/ are not a runner you can use (jest is not installed). Do not touch them.

## Owned files and scope
scripts/run-node-tests.test.mjs (new test) and the stub scripts/run-node-tests.mjs. Nothing else, except docs/ephemeral/work/0002-working-test-runner/red-evidence.md which the red-evidence script writes.

## How the work is judged
Run from the worktree: node .process/core/scripts/red-evidence.mjs . 0002-working-test-runner. It must report ok (every failing test fails by assertion). Then commit the test, the stub and red-evidence.md in one commit with the subject `test(scripts): add failing tests for the node test runner`. Use `git add <paths>` for those exact paths.

## Model and effort
sonnet, medium: mechanical test writing from a clear spec.

## Result and status
Return your report as your final message, ending with a status: done, done with concerns, needs context, or blocked.
