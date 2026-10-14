# Root cause: unknown character in a math expression loops forever

## Hypotheses tested

- the tokenizer never advances on a character that is not whitespace, an operator, a digit or an identifier character: held, reading core/src/expressions.ts tokenizeMath: the variable branch reads zero characters for a quote and the loop index is not moved.

## Evidence

The verification report reproduces a hang for a template containing a plus sign next to a quoted string literal; the CPU stays at full load and nothing prints.

## Cause

core/src/expressions.ts, the end of tokenizeMath: when the variable branch collects an empty name, no character was consumed and the while loop repeats on the same index.
