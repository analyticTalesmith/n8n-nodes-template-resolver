## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: authors can reshape text with upper, lower, title, replace, indent, quote, round and default, each a row in the text filter group of the registry, with wrong or missing parameters reported as located type-errors.
Must not:
- change any existing test expectation
- change what any existing filter outputs, or what `??` does
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Questions

goal-critical: does every bad parameter (missing find, non-integer or out-of-range indent or round, an undeclared parameter, default without a value) end in a located type-error in every mode, never a silent fallback?
goal-critical: does replace match literal text only, with every occurrence replaced and no pattern ever compiled from template text?
goal-critical: does default replace exactly the values that are not truthy, and does `??` keep its current behaviour?
goal-critical: does any existing template render a different output than before?
polish: does round avoid binary float noise (1.005 with round=2) and indent leave empty lines and line breaks alone?
polish: are the eight rows small, in the text group only, with no second filter list and no dispatch or parser change?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope
- the registry is the only place a filter name is listed

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
