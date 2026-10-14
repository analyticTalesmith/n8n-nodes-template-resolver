# Spec

## Acceptance criteria

- dg-syntax: syntax, missing-variable and unknown-filter errors carry the codes syntax-error, missing-variable and unknown-filter with the line and column of the failing tag or variable
- dg-runtime: math, filter-parameter and type errors carry the line and column of the node that evaluates them, not a placeholder 1:1, and the code type-error
- lm-iterations: more total FOR iterations than limits.maxIterations throws limit-iterations located at the loop
- lm-output: output longer than limits.maxOutputChars throws limit-output
- lm-depth: block nesting deeper than limits.maxDepth throws limit-depth located at the offending block
- lm-defaults: DEFAULT_LIMITS is exported with maxIterations 10000, maxOutputChars 1000000 and maxDepth 32, a partial limits option keeps the other defaults, and a template under every limit renders as before
