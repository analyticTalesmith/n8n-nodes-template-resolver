# Root cause: a pipe inside a ?? default text is read as a filter separator

## Hypotheses tested

- If the expression is split on `|` before the default is read, a default holding a pipe is cut in two and the tail becomes a filter name. Held: rendering `${{x ?? "a|b"}}` with x missing throws "Unknown filter: b\"", and the unterminated quote in the message shows the cut fell inside the default.
- If the lexer cut the token at the pipe, the tag would not lex as one variable. Ruled out: the lexer token for `${{name ?? "Anonymous"}}` carries the whole expression (existing lexer test asserts it contains `??`), and the error comes from filter lookup.

## Evidence

nodes/TemplateResolver/parser.ts parseVariableExpression: step 1 does `expr.split("|")`, then step 2 looks for `??` only in the first part. The existing test `${{text ?? "default" | trim | head=5}}` shows filters after a default are meant to work.

## Cause

The filter split in parseVariableExpression ignores quotes, so it splits inside a quoted default. The split must skip pipes inside a quoted string.
