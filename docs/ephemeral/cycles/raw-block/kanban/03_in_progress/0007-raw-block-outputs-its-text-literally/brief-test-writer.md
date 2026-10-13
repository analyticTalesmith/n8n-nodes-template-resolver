# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: add a RAW block that outputs its contents literally so templates can include braces and tag-like text.
Card goal: the lexer turns the text between RAW and END_RAW into one literal Text token, and the README documents it.
Your objective: write failing tests for criteria rb-01 to rb-04, in the worktree C:/n8n-smoke/.worktrees/raw-block (branch feature/raw-block-impl). Work only there.

## Decisions already made
Read: docs/ephemeral/work/0007-raw-block-outputs-its-text-literally/spec.md, card.md and card.json in docs/ephemeral/cycles/raw-block/kanban/01_shaping/0007-raw-block-outputs-its-text-literally/, docs/ephemeral/cycles/raw-block/test-plan.md (rows t-raw-literal, t-raw-whitespace, t-raw-unclosed at unit level and t-raw-render-loop at integration level), and the pattern in test-node/default-pipe.test.ts (a helper over Lexer, Parser, Interpreter; node:test; node:assert/strict; assertion messages). The test plan pairs: unit rows are about the Lexer (tokenize and inspect the tokens); the integration row is about rendering a whole template through Lexer, Parser and Interpreter.
Write test-node/raw-block.test.ts. Test names start with the criterion id (rb-01, rb-02, rb-03, rb-04). Cases:
- rb-01 (unit, Lexer): tokenizing `{{RAW}}{{IF x}} ${{name}} {{# c #}} { }{{END_RAW}}` gives exactly one token of type TokenType.TEXT (import TokenType from ../nodes/TemplateResolver/types) whose value is `{{IF x}} ${{name}} {{# c #}} { }`. Also render the same template with an empty variables Map through the full pipeline and expect that same text.
- rb-02 (integration): `{{FOR a AS x}}[{{RAW}}${{x}}{{END_RAW}}${{x}}]{{END_FOR}}` with a=[1,2] renders `[${{x}}1][${{x}}2]`; and `{{IF f}}{{RAW}}{{IF}}{{END_RAW}}{{END_IF}}z` with f=false renders `z`.
- rb-03 (unit): `{{RAW}}  a\r\n b  {{END_RAW}}` yields a TEXT token with value `  a\n b  `.
- rb-04 (unit): tokenizing `a{{RAW}}b` throws a SyntaxError (import SyntaxError from ../nodes/TemplateResolver/errors) whose message mentions `Unclosed` and `RAW`, and whose line is 1 and column is 2 (check how SyntaxError exposes line and column in errors.ts; assert on those properties).
Also add one guard that passes today: a template without RAW such as `a ${{n}} b` renders unchanged (name it `guard rb-05 ...`).
Today the lexer throws "Unknown template tag: {{RAW}}" for RAW, so the red tests must fail by assertion: wrap each lexer or render call that may throw in assert.doesNotThrow with a message, except the rb-04 test, which asserts the throw with assert.throws and checks the properties; make that one fail by assertion (the thrown error today is an unknown-tag SyntaxError, so its message check fails by assertion).
Run the gate, then red-evidence from the worktree: node .process/core/scripts/red-evidence.mjs . 0007-raw-block-outputs-its-text-literally (it must report ok). Do not touch nodes/. Do not write the fix. Do not commit; the lead commits. Do not create files named nul.

## Owned files and scope
test-node/raw-block.test.ts (new). The red-evidence script writes docs/ephemeral/work/0007-raw-block-outputs-its-text-literally/red-evidence.md.

## How the work is judged
red-evidence reports ok; each red test fails by assertion; the guard passes.

## Model and effort
sonnet, medium.

## Result and status
Report as in your charter with a status.
