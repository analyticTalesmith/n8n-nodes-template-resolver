## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: conditions test membership, ranges and sizes with `in`, `not in`, `between [a, b]` and `.length`; equality no longer coerces a quoted literal to a number; an unrecognized word next to an operator is an error in every mode. Conditions behave the same in render and resolveTemplate.
Must not:
- change any existing test expectation
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Questions

goal-critical: do `x in [..]`, `x in list_var`, `x in "text"` and their `not in` forms give the specified result for numbers vs text, missing and null left sides, empty lists and strings, and a type-error (located at the condition, never a raw exception) for an operand that cannot be tested, including cyclic objects and BigInt?
goal-critical: is `between` inclusive at both ends and a type-error for any non-numeric operand or a list that is not exactly two items?
goal-critical: does `.length` give the element count of an array and the UTF-16 length of a string in conditions, output, math and CASE, let an own key named `length` (even null) win, and leave missing data null?
goal-critical: does a quoted literal side compare as text in `==`, `!=` and `in`, while unquoted comparisons and the unquoted number right of `contains` keep their written text?
goal-critical: is every unrecognized word or extra word next to an operator an error in strict and lenient mode, in render and resolveTemplate, and does analyze agree?
goal-critical: do the new operators combine with AND, OR, NOT and parentheses without a precedence surprise, and do operator words inside quotes or list literals never split?
polish: do evaluateCondition and conditionOperands share the same split helpers, and do both path walkers share one length helper rather than copies?

## Rubric

- each criterion is met by the diff and its test
- the card scope is respected (expressions, interpreter, analyze, spec and the operators test file)
- unknown names, operators and filters are still errors in every mode

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
