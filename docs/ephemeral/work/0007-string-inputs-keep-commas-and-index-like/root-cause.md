# Root cause: string inputs repaired or indexed wrongly

## Hypotheses tested

- the comma repair runs on raw text including string contents: held
- indexing uses a different coercion from FOR: held

## Evidence

o={"name":"a,, b"} renders `a, b`; {"name":"x,}"} renders `x}`; arrays ["a, b","c,]d"] lose commas; `${{tags.0}}` is empty for tags="a,b" while `{{FOR tags}}` works.

## Cause

coercion.ts lines 182-187 and 68-70 apply comma-collapsing replace calls to the whole text, including inside strings. interpreter.ts lines 487-494 use tryCoerceToObject for string inputs, which rejects arrays and CSV, while expressions.ts lines 393-399 use plain JSON.parse: two different paths, neither the one used by FOR.
