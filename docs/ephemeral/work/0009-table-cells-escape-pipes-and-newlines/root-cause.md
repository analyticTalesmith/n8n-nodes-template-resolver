# Root cause: table cells with pipes or newlines break the table

## Hypotheses tested

- cell text is joined without escaping: held

## Evidence

A cell value `a|b` renders as an extra column; a value with a newline leaves a raw line break inside the row.

## Cause

interpreter.ts processCellsArray (lines 401-405) only trims cell text, and the joins at lines 364, 385 and 390 add no escaping.
