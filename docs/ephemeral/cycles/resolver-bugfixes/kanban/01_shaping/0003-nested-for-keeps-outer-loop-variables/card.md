# Nested FOR keeps outer loop variables

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

A FOR loop inside another FOR loop wipes the outer loop's variables when the inner loop ends, so text after the inner loop that names the outer item fails with "Variable not found" (or renders empty in lenient mode). The resolver must keep the outer loop's item and @index values after an inner loop finishes, because templates for lists of lists are a core use.

## Must-haves

- `contract` `nf-01` After an inner FOR loop ends, the outer loop variable and its @index0 and @first values still resolve in the rest of the outer body.
- `contract` `nf-02` Two sibling inner loops and a doubly nested loop render every iteration with the right outer item.
- `contract` `nf-03` A TABLE row loop inside an outer FOR keeps the outer loop variable for later rows and text.
- `constraint` `nf-04` must: leave the existing jest suite files untouched and keep the whole node:test suite passing.

## Must-nots

- Do not change what a single, non-nested loop renders.
- Do not change variable lookup order outside loops.

## Context links

- none

## User documentation

none

## Interface contract

none: internal interpreter behavior; the public resolveTemplate signature is unchanged.

## Scope

| Path | Permission (add, edit, remove) | Approx lines | Blast radius |
| --- | --- | --- | --- |
| nodes/TemplateResolver/interpreter.ts | edit | 25 | resolver-core |
