# Root cause: nested FOR clears outer loop variables

## Hypotheses tested

- the inner loop clears shared state: held, loopContext.clear() runs when any loop ends
- the parser drops outer variables: not held, the AST keeps both loops

## Evidence

Template `{{FOR outer AS o}}${{o}}:{{FOR inner AS i}}${{i}}{{END_FOR}}:${{o}}|{{END_FOR}}` with outer=[1,2], inner=[a,b] renders `1:ab:|2:ab:|` instead of `1:ab:1|2:ab:2|`; `{{IF @last}}` after an inner loop takes the ELSE branch.

## Cause

interpreter.ts line 231 calls loopContext.clear() and line 341 does the same for a FOR in a table; loopContext is one flat Map with no save and restore per loop, so the inner loop destroys the outer loop entries.
