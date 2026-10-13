## Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: keep the enclosing loop's variables and @index values after an inner loop ends.
Must not:
- change what a single, non-nested loop renders
- change variable lookup order outside loops

## Questions

- goal-critical: after an inner loop ends, does text in the outer body still resolve the outer item and @index values?
- goal-critical: is the enclosing loop's state restored even when the inner loop body throws?
- polish: is the change small and local to the loop handling?

## Rubric

- Loop variables are restored by value, not by re-evaluating the iterable.
- Both the FOR visitor and the TABLE row loop are fixed.
- No unrelated edits in interpreter.ts.

## Design context

- README.md
