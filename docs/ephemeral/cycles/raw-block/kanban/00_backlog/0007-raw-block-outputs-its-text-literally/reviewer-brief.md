## Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: add a RAW block that outputs its contents literally so templates can include braces and tag-like text.
Card goal: the lexer turns the text between RAW and END_RAW into one literal Text token, and the README documents it.
Must not:
- change the parser, the interpreter or the behavior of any other tag
- add nesting, escapes or options to RAW

## Questions

- goal-critical: does everything between RAW and END_RAW come out exactly as written, including double braces and tag-like text?
- goal-critical: does an unclosed RAW fail with a syntax error at the RAW tag instead of silently consuming the rest?
- polish: is the README example accurate, and is the lexer change small and local?

## Rubric

- The raw scan does not alter templates without RAW.
- Line and column tracking stays correct for tokens after a RAW block.
- The README example's shown output matches what the resolver prints.

## Design context

- README.md
