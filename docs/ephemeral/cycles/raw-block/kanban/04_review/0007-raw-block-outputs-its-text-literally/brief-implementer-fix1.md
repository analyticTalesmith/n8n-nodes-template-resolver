# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: add a RAW block that outputs its contents literally so templates can include braces and tag-like text.
Card goal: the lexer turns the text between RAW and END_RAW into one literal Text token, and the README and a living document describe it.
Your objective: answer review findings f1, f2 and f3 with tests first, then the smallest fix for any that fail.

## Decisions already made
Worktree: C:/n8n-smoke/.worktrees/raw-block (branch feature/raw-block-impl). Work only there. The lead approved two extra files (scope exceptions): nodes/TemplateResolver/utils.ts (edit) and test-node/raw-block-review.test.ts (add, new). Do not edit test-node/raw-block.test.ts.
f1 (goal-risk): the n8n node (nodes/TemplateResolver/TemplateResolver.node.ts, around line 203) finds variables with extractAllVariables in utils.ts, which regex-scans the raw template text. So `{{RAW}}${{name}}{{END_RAW}}` reports `name` as a detected variable and, in strict mode with no mapping, as missing, so the node errors even though RAW should print it literally. Test first: extractAllVariables('{{RAW}}${{name}} {{IF zz}}{{END_RAW}}') returns [] (no names), while extractAllVariables('{{RAW}}${{a}}{{END_RAW}} ${{b}}') returns ['b']. Watch it fail, then fix extractAllVariables by ignoring RAW spans (remove `{{RAW}}...{{END_RAW}}` spans with a regex before scanning; an unclosed RAW is left as is). Do not edit TemplateResolver.node.ts.
f2 (goal-risk): position tracking after a multi-line raw block. Add tests: lexing '{{RAW}}\nx\r\ny\n{{END_RAW}}\n{{RAW}}z' must throw a SyntaxError with line 5 and column 1 (note: lexer normalizes CRLF only for emitted text; check what line the existing lexer assigns, and if your first run shows the line is different because \r\n counts differently, report it as a question instead of bending the test), and lexing '{{RAW}}\n\n{{END_RAW}}{{BOGUS}}' must throw an unknown-tag error at line 3 and column 12. Fix the lexer only if they fail.
f3 (goal-risk): render-level whitespace. Add a test: rendering '{{IF t}}{{RAW}}\n\n  a\n\n\n  b  \n{{END_RAW}}{{END_IF}}|' with t = true gives exactly '\n\n  a\n\n\n  b  \n|'. If the unchanged parser or interpreter alters it, report it as a question; do not change them.
Test file pattern: copy the helpers from test-node/raw-block.test.ts. Name tests starting with rb-01 (f1), rb-04 (f2 unknown-tag position) and rb-03 (f3). Run the gate: node scripts/run-node-tests.mjs and report which new tests failed before the fix. Do not commit; the lead commits. Do not create files named nul.

## Owned files and scope
test-node/raw-block-review.test.ts (add), nodes/TemplateResolver/utils.ts (edit), nodes/TemplateResolver/lexer.ts only if f2 fails.

## How the work is judged
Full suite passes; each new test that failed before the fix passes after.

## Model and effort
sonnet, medium.

## Result and status
Final message report as in your charter, with a status and one line per finding: fixed, already holds (test added) or question.
