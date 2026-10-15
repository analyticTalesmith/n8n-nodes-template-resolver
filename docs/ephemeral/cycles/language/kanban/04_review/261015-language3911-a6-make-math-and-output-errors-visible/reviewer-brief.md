## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: math and output mistakes stop being silent: division or modulo by zero, a malformed math expression and a cyclic value end render with a located error in every mode, results print without binary float noise and a hyphen between two letters is part of a name. Division by zero and float printing apply in render only; resolveTemplate keeps its outputs for them.
Must not:
- change any existing test expectation
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Questions

goal-critical: does any path still turn a malformed math expression, a division or modulo by zero (in render) or an unprintable value into ok true with empty text, in strict or lenient mode?
goal-critical: do resolveTemplate outputs for `/0` (Infinity) and float printing stay exactly as before, and does render alone apply them?
goal-critical: is the hyphen rule exactly letter-hyphen-letter (a - b, n-1, x1-y stay arithmetic) in the tokenizer, mathVariableNames and isMathExpression, with analyze agreeing with render?
goal-critical: is each error located at the variable (or the CASE or ternary node) rather than 1:1?
polish: is the render-only flag a single option, and is the added code small without duplicated math checks?

## Rubric

- each criterion is met by the diff and its test
- the card scope is respected (expressions, interpreter, render, errors and the math test file)
- unknown names, operators and filters are still errors in every mode

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
