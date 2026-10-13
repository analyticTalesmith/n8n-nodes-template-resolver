# Spec

## Acceptance criteria

- co-01: NOT a, !a, and NOT (a) negate the variable
- co-02: a && b, a || b, a and b, a or b evaluate as AND and OR
- co-03: AND or OR inside a quoted string literal does not split the condition
- co-04: an unquoted contains, startsWith or endsWith right-hand side is read as a variable
- co-05: == and != compare numerically when both sides are numeric
- co-06: an unknown word next to an operator is an error, not false
