## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: authors can join, count, pick, order, de-duplicate, slice, split and serialize lists with join, length, first, last, sort, unique, slice, lines and json, each a definition in the collection group of the one filter registry.
Must not:
- change any existing test expectation
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode

## Questions

goal-critical: does any collection filter give a different result for the same input on two runs, or depend on object insertion order, locale or platform (sort, unique, json)?
goal-critical: does a cyclic value make json, unique or sort overflow the stack or hang instead of giving a located type-error?
goal-critical: does a bad parameter (undeclared name, missing join separator, non-integer slice bound) or an object given to a list filter fail with a located type-error in every mode, never silently?
goal-critical: do string inputs coerce exactly as FOR coerces them, and does a missing value in lenient mode behave as an empty list?
goal-critical: does any filter mutate its input value?
polish: is stability of sort proved by a test with equal keys, and is unique's first-occurrence order proved?
polish: is the new code small, free of a second filter list, and free of duplicated comparison or stable-JSON logic?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope (filters-collection.ts and its test file)
- the registry is the only place a filter name is listed

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
