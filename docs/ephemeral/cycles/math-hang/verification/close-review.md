---
summary: Close review of the math hang bug fix: unknown characters in math end with a located error.
approved_by: Jon (front approval)
validates: []
---
# Close review: math-hang

## What shipped

- The math tokenizer throws a located math syntax error for a character it cannot place instead of looping on it; strict render now reports a type-error diagnostic for `${{ 1 + "x" }}`.

## Evidence

- Regression test with a three second kill per case (a hang becomes a failed assertion): 14 tests; full suite 773 tests pass. Found by the independent verification of the headless cycle.

## Loop summary

No goal loop ran.

## Known issues

- Lenient mode still treats unparseable math as a plain variable path and renders empty without a diagnostic (ticketed). One frozen test case meant to cover a backslash holds no backslash (ticketed).

## Expected streams

None declared in the cycle brief.

## Untriaged feedback

none

## Decision

Accept.
