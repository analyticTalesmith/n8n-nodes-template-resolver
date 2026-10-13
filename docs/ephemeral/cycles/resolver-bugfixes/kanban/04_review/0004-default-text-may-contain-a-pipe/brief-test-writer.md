# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a quoted default text after ?? may contain a pipe and renders whole, with later filters still applied.
Your objective: write failing tests for criteria dp-01, dp-02 and dp-03 in the worktree C:/n8n-smoke/.worktrees/default-pipe (branch feature/default-pipe). Work only there.

## Decisions already made
Read: docs/ephemeral/work/0004-default-text-may-contain-a-pipe/spec.md and root-cause.md, card.md and card.json in docs/ephemeral/cycles/resolver-bugfixes/kanban/01_shaping/0004-default-text-may-contain-a-pipe/, and the pattern in test-node/nested-for.test.ts (a `render(template, vars)` helper over Lexer, Parser, Interpreter; node:test and node:assert/strict; each render in assert.doesNotThrow with a message so a thrown error fails by assertion).
Write test-node/default-pipe.test.ts. Name each test with its criterion id. Cases: dp-01 `${{x ?? "a|b"}}` with x absent from the variables renders `a|b` (use `{ y: 1 }` as the variables map so x is missing, and the default Interpreter strict mode; the `??` operator is meant to make a missing variable fine). dp-02 `${{x ?? "a|b" | head=2}}` renders `a|`. dp-03: `${{x ?? 'a|b'}}` renders `a|b`; plus regression guards that already pass today: `${{x ?? "d" | trim}}` renders `d`, `${{text | trim | head=3}}` with text "  hello " renders `hel`, and a value that exists is not replaced by the default (`${{x ?? "a|b"}}` with x="v" renders `v`). Put the guards in the same test as dp-03 only if the first assertion in it fails today; otherwise put guards in their own test named `guard ...` so the red evidence lists only the new behavior as red.
Do not touch nodes/. Do not write the fix. Run the gate: node scripts/run-node-tests.mjs .test-build/test-node/default-pipe.test.js, then red-evidence from the worktree: node .process/core/scripts/red-evidence.mjs . 0004-default-text-may-contain-a-pipe (it must report ok). Do not commit; the lead commits. Do not create files named nul.

## Owned files and scope
test-node/default-pipe.test.ts (new). The red-evidence script writes docs/ephemeral/work/0004-default-text-may-contain-a-pipe/red-evidence.md.

## How the work is judged
red-evidence reports ok; each red test fails by assertion; guards pass.

## Model and effort
sonnet, medium.

## Result and status
Report as in your charter with a status.
