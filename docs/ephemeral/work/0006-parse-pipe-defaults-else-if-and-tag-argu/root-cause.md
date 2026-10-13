# Root cause: a pipe in a ?? default, ELSE IF and tag junk

## Hypotheses tested

- the default is split on pipes before ?? is read: held, `${{x ?? "a|b"}}` throws Unknown filter
- the lexer keeps the whole tag text: partly, it keeps only the keyword prefix and the parser ignores the rest

## Evidence

`${{x ?? "a|b"}}` throws `Unknown filter: b"`; `{{IF a}}A{{ELSE IF b}}B{{END_IF}}` with a and b false renders B; `{{IF a}}A{{END_IF garbage}}` renders A.

## Cause

parser.ts line 136 runs expr.split("|") before the ?? extraction at line 145, ignoring quotes. lexer.ts lines 359-361 extractKeyword takes only the leading [A-Z_]+ so ELSE IF reads as ELSE and END_IF garbage as END_IF, and the parser never inspects the rest of the token value.
