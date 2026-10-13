# Root cause: text after an inner FOR loop cannot see the outer loop variable

## Hypotheses tested

- If the inner loop's end clears shared state, the outer item disappears right after the inner END_FOR. Held: rendering `{{FOR a AS x}}{{FOR b AS y}}${{y}}{{END_FOR}}[${{x}}]{{END_FOR}}` throws "Variable 'x' not found" at the `${{x}}` after the inner loop; `${{x}}` before or inside the inner loop works (output `A1b1 A1b2 A2b1 A2b2` for the inside-only case).
- If the inner loop only overwrote the outer item with its own values, the outer item would be wrong, not missing. Ruled out: the error is a missing variable.

## Evidence

nodes/TemplateResolver/interpreter.ts visitFor keeps loop variables in one shared Map (loopContext), sets the item and @index0/@index1/@first/@last/@notFirst/@notLast per iteration (lines 217-223) and calls this.loopContext.clear() after the loop (line 231). The TABLE row loop does the same (lines 315-341). Reproduction run against the compiled sources before any change.

## Cause

Loop state is one flat map with no scope: every loop ends with clear(), which also deletes the enclosing loop's entries, and every iteration overwrites the enclosing loop's @index values. The fix is a scope that restores the enclosing loop's entries when a loop ends.
