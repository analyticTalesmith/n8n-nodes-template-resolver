# Spec: nested FOR keeps outer loop variables

## Goal

After an inner loop finishes, the enclosing loop's item and @index values are what they were, in FOR bodies and in TABLE row loops.

## Scope

In: nodes/TemplateResolver/interpreter.ts loop state handling. Out: lexer, parser, filters, expressions.

## Boundaries

- Always: restore the enclosing loop's entries when a loop ends, including when its body throws.
- Ask first: any change to the AST or the public resolveTemplate signature.
- Never: edit tests.

## Contract and constraints

- contract: a loop saves the loop-variable entries it will overwrite and restores them when it ends; a top-level loop ends with an empty context as before.
- constraint: single loops render exactly as before.

## Change manifest

Edit nodes/TemplateResolver/interpreter.ts only.

## Acceptance criteria

- nf-01 outer item and @index0/@first resolve after an inner loop in the same outer iteration.
- nf-02 sibling inner loops and a doubly nested loop render the expected text.
- nf-03 a TABLE row loop inside a FOR keeps the outer variable for later rows and text.
- nf-04 existing tests keep passing.
