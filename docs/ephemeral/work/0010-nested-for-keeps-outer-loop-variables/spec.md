# Spec

## Acceptance criteria

- nf-01: after an inner FOR ends, the outer loop item variable still resolves
- nf-02: after an inner FOR ends, the outer loop @index0, @index1, @first and @last are still the outer values
- nf-03: inside the inner FOR the loop metadata describes the inner loop and the outer metadata is restored when it ends
- nf-04: a FOR inside a TABLE does not clear the enclosing loop variables
