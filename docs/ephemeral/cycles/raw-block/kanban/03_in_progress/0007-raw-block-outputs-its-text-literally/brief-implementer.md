# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: add a RAW block that outputs its contents literally so templates can include braces and tag-like text.
Card goal: the lexer turns the text between RAW and END_RAW into one literal Text token, and the README and a living document describe it.
Your objective: make the failing tests pass with the smallest lexer change, then document what you built.

## Decisions already made
Worktree: C:/n8n-smoke/.worktrees/raw-block (branch feature/raw-block-impl). Work only there.
Read first: docs/ephemeral/work/0007-raw-block-outputs-its-text-literally/spec.md (the contract, the chosen option and the error text), then card.md and card.json under docs/ephemeral/cycles/raw-block/kanban/ (the card folder, wherever it sits now).
The tests exist: test-node/raw-block.test.ts. Do not edit them. Gate: node scripts/run-node-tests.mjs .test-build/test-node/raw-block.test.js, and also the full suite `node scripts/run-node-tests.mjs`. The old jest suite cannot run here (jest not installed); do not try to install it.
Code: in nodes/TemplateResolver/lexer.ts, where a tag's keyword is read (see scanTag and how scanComment consumes input and tracks line and column through advance()), handle the keyword RAW: consume characters to the next `{{END_RAW}}` (a closing tag may contain inner spaces; match `{{`, optional spaces, END_RAW, optional spaces, `}}`), emit one TEXT token with that content (CRLF to LF; no token when empty) at the line and column of the first raw character, and keep line, column and pos correct afterwards. If no END_RAW is found, throw the lexer's SyntaxError at the RAW tag's line and column: message `Unclosed {{RAW}} block`, hint `Add {{END_RAW}}`. Do not touch the parser or interpreter or other tags. Keep the change small.
README.md: add a short "Raw blocks" section next to the other syntax sections, in the README's existing style, with one example whose shown output you obtained by actually running it through the compiled resolver (lexer, parser, interpreter in .test-build/nodes/TemplateResolver after a run of the runner).
docs/living/product/raw-block.md: it is a planned stub; fill the Purpose and add Syntax, Rules (first END_RAW closes; no nesting; text not trimmed; unclosed is a syntax error) and Example sections describing the built behavior only. Keep the frontmatter exactly as it is (state: planned, user_facing: true, the summary line may be refined); the delta applies built later.
Do not commit; the lead commits. Do not create files named nul.

## Owned files and scope
nodes/TemplateResolver/lexer.ts, README.md, docs/living/product/raw-block.md.

## How the work is judged
The gate and the full node:test suite pass; criteria rb-01 to rb-06 in card.json (rb-06 is confirmed by a person).

## Model and effort
sonnet, medium: a small, local change with a clear contract.

## Result and status
Final message report as in your charter, with a status.
