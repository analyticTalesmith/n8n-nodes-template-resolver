# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: keep the enclosing loop's variables and @index values after an inner loop ends.
Your objective: write failing tests for criteria nf-01, nf-02 and nf-03, in the worktree C:/n8n-smoke/.worktrees/nested-for (branch feature/nested-for). Work only there.

## Decisions already made
Planning context to read: docs/ephemeral/work/0003-nested-for-keeps-outer-loop-variables/spec.md and root-cause.md, and card.md and card.json in docs/ephemeral/cycles/resolver-bugfixes/kanban/01_shaping/0003-nested-for-keeps-outer-loop-variables/, and docs/ephemeral/cycles/resolver-bugfixes/test-plan.md.
Runner and layout: tests are TypeScript files in test-node/ using node:test and node:assert/strict (see test-node/smoke.test.ts for the exact pattern: Lexer, Parser, Interpreter imported from ../nodes/TemplateResolver/..., variables are a Map). Write test-node/nested-for.test.ts. Put a helper `render(template, vars)` in the file that runs lexer, parser and interpreter. Use `{ strictMode: true }` default behavior of the Interpreter (the default) so a missing variable throws.
The card gate command is: node scripts/run-node-tests.mjs test-node/nested-for.test.js (note: the runner compiles first, and the compiled test file path is .test-build/test-node/nested-for.test.js; the gate command in card.json passes a relative path; if that path does not resolve, report it as a question instead of changing the runner). Run the gate once to see it fail.
Cases (name each test with its criterion id and write a message on every assertion):
- nf-01: `{{FOR a AS x}}{{FOR b AS y}}${{y}}{{END_FOR}}[${{x}}|${{@index0}}|${{@first}}]{{END_FOR}}` with a=[A1,A2], b=[b1,b2] renders `b1b2[A1|0|true]b1b2[A2|1|false]` (verify the expected text by reading the README syntax for @first rendering before you commit to it; if @first prints differently, drop it and keep @index0).
- nf-02: two sibling inner loops in one outer loop; and a doubly nested loop (three levels) where the outermost item is used after both inner loops.
- nf-03: a TABLE whose rows come from a FOR (see README tables with variables), inside an outer FOR, then `${{x}}` after the table in the outer body: the outer variable must still resolve.
Do not touch nodes/. Do not write the fix. The failing tests must fail by assertion or by the thrown "Variable not found" error from the interpreter surfacing as a failed test (the runner reports it as a test failure); if red-evidence rejects an error thrown as not an assertion failure, wrap the render in assert.doesNotThrow(...) with a message so it fails by assertion.
Do not commit; the lead commits from your report.

## Owned files and scope
test-node/nested-for.test.ts (new). The red-evidence script writes docs/ephemeral/work/0003-nested-for-keeps-outer-loop-variables/red-evidence.md.

## How the work is judged
Run from the worktree: node .process/core/scripts/red-evidence.mjs . 0003-nested-for-keeps-outer-loop-variables must report ok (every failing test fails by assertion).

## Model and effort
sonnet, medium.

## Result and status
Report as in your charter with a status.
