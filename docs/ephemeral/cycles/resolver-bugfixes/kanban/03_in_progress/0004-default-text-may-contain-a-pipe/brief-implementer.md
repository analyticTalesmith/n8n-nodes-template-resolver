# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a quoted default text after ?? may contain a pipe and renders whole, with later filters still applied.
Your objective: make the failing tests pass with the smallest change at the cause.

## Decisions already made
Worktree: C:/n8n-smoke/.worktrees/default-pipe (branch feature/default-pipe). Work only there.
Read first: .claude/skills/root-cause/SKILL.md, then docs/ephemeral/work/0004-default-text-may-contain-a-pipe/root-cause.md (the cause: parseVariableExpression in nodes/TemplateResolver/parser.ts splits the whole expression on every pipe, ignoring quotes) and spec.md in the same folder, then card.md and card.json under docs/ephemeral/cycles/resolver-bugfixes/kanban/ (the card folder, wherever it sits now).
The tests exist: test-node/default-pipe.test.ts. Do not edit them. Gate: node scripts/run-node-tests.mjs .test-build/test-node/default-pipe.test.js, and also the full suite `node scripts/run-node-tests.mjs`. The old jest suite in tests/ cannot run (jest is not installed); do not try to install it, but read tests/TemplateResolver.node.test.ts around the `??` and filter cases (grep for `??`) to be sure your split keeps their meaning, in particular `${{text ?? "default" | trim | head=5}}`.
Fix: split the expression into core and filters only at pipes outside single or double quotes (a small quote-aware split helper in parser.ts). Keep the rest of parseVariableExpression as is. Do not commit; the lead commits. Do not create files named nul.

## Owned files and scope
nodes/TemplateResolver/parser.ts only.

## How the work is judged
The gate and the full node:test suite pass; criteria dp-01 to dp-04 in card.json.

## Model and effort
sonnet, medium: a small, local change with a clear cause.

## Result and status
Final message report as in your charter, with a status.
