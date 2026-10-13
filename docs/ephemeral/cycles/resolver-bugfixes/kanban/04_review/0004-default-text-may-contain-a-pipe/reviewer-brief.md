## Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a quoted default text after ?? may contain a pipe and renders whole, with later filters still applied.
Must not:
- change how a pipe outside quotes separates filters
- change the ?? rule for which values count as empty

## Questions

- goal-critical: does a pipe inside a quoted default render as part of the default?
- goal-critical: does a pipe outside quotes still separate filters, including after a quoted default?
- polish: is the change small and local to the expression split?

## Rubric

- The split honors both single and double quotes.
- A default with an escaped or unbalanced quote does not hang or throw a new error type.
- No unrelated edits in parser.ts.

## Design context

- README.md
