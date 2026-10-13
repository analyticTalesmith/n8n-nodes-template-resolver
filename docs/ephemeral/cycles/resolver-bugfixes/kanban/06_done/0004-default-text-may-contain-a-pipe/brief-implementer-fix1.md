# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a quoted default text after ?? may contain a pipe and renders whole, with later filters still applied.
Your objective: answer review finding f1 with the smallest fix and a regression test.

## Decisions already made
Fix request (f1, goal-risk, serves must-not m1: do not change how a pipe outside quotes separates filters). The new quote-aware split in nodes/TemplateResolver/parser.ts (splitOutsideQuotes) opens a quote at any ' or " and has no recovery: for `x ?? it's | trim` (a lone apostrophe in an unquoted default) the pipe after it is treated as quoted, so the filter is no longer split off. At the base commit that expression gave default `it's` with the trim filter applied; now it renders `it's | trim`. The same happens for `x ?? "abc | trim` (unterminated). Fix: only open a quote when a matching closing quote of the same kind exists later in the text; otherwise treat the character as ordinary text. Also skip a backslash-escaped quote inside a quote only if that is needed to keep this finding fixed; otherwise leave escapes alone (do not widen scope).
Worktree: C:/n8n-smoke/.worktrees/default-pipe (branch feature/default-pipe). Edit nodes/TemplateResolver/parser.ts and ADD one new test file test-node/default-pipe-unbalanced.test.ts (same pattern as test-node/default-pipe.test.ts; node:test, a render helper; test name starts with `dp-03`; cases: `${{x ?? it's | trim}}` with x missing renders `it's`; `${{x ?? "abc | trim}}` with x missing renders `"abc` (the leading quote stays, the old behavior at base); the original dp-01 case still renders `a|b`). Confirm by running the new test BEFORE the fix that its first case fails, then fix, then run the gate and the full suite: node scripts/run-node-tests.mjs. Do not edit test-node/default-pipe.test.ts. Do not commit; the lead commits. Do not create files named nul.

## Owned files and scope
nodes/TemplateResolver/parser.ts (edit), test-node/default-pipe-unbalanced.test.ts (add).

## How the work is judged
Full suite passes; the new test failed before the fix and passes after.

## Model and effort
sonnet, medium.

## Result and status
Final message report as in your charter, with a status.
