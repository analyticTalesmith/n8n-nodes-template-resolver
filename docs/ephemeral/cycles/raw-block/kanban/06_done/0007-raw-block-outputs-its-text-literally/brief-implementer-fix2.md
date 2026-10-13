# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: add a RAW block that outputs its contents literally so templates can include braces and tag-like text.
Card goal: the lexer turns the text between RAW and END_RAW into one literal Text token, and the README and a living document describe it.
Your objective: answer review finding f5 with a test first, then the smallest fix.

## Decisions already made
Worktree: C:/n8n-smoke/.worktrees/raw-block (branch feature/raw-block-impl). Work only there. Files you may touch: nodes/TemplateResolver/utils.ts (edit) and test-node/raw-block-review.test.ts (edit: append tests; do not change the existing ones).
f5 (goal-risk): extractAllVariables in utils.ts drops RAW spans with a regex that only matches the unspaced `{{RAW}}` and `{{END_RAW}}`, but the lexer accepts `{{ RAW }}` (the tag content is trimmed, so spaces and a newline around RAW are fine) and a closing `{{ END_RAW }}` with spaces or tabs inside the braces (see scanRaw in lexer.ts). So `{{ RAW }}${{name}}{{ END_RAW }}` still reports `name` as a variable. Add tests first: extractAllVariables('{{ RAW }}${{name}}{{ END_RAW }}') returns [] and extractAllVariables('{{RAW}}${{a}}{{\tEND_RAW }} ${{b}}') returns ['b']; watch them fail; then change the regex to accept optional whitespace inside both tags (match the lexer: the opening tag is `{{`, any whitespace, RAW, any whitespace, `}}`; the closing tag is `{{`, spaces or tabs, END_RAW, spaces or tabs, `}}`). Test names start with rb-01. Run the full suite: node scripts/run-node-tests.mjs. Do not commit; the lead commits. Do not create files named nul.

## Owned files and scope
nodes/TemplateResolver/utils.ts, test-node/raw-block-review.test.ts.

## How the work is judged
Full suite passes; the new tests failed before the fix and pass after.

## Model and effort
sonnet, low: a one-line regex change with tests.

## Result and status
Final message report as in your charter, with a status.
