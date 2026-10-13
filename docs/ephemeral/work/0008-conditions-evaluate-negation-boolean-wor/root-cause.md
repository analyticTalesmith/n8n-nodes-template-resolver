# Root cause: conditions that silently evaluate false

## Hypotheses tested

- the whole condition string is looked up as one variable: held
- the comparison coerces types: not held, == compares String(left) with String(right)

## Evidence

With a=false: `{{IF NOT a}}`, `!a`, `a && b`, `a and b` all render the else branch; `{{IF s contains t}}` with s="hello world", t="world" renders N; `{{IF n == 5}}` with n="5.0" renders N; `{{IF a == "x AND y"}}` with a="x AND y" renders N.

## Cause

expressions.ts lines 72-78 accept only the NOT( form; tryEvaluateLogical (138-157) splits only on exact " AND " and " OR " without regard to quotes, so other forms reach resolveValue (386) which looks up a variable with the whole text and returns undefined. Line 289 never resolves the contains right-hand side. Lines 206 and 209 compare String(left) to String(right) without numeric coercion.
