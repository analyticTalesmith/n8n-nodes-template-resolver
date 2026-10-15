## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: every filter is dispatched from one registry that also feeds spec() and analyze, filters take and return values, and filter arguments are parsed once at parse time with quotes respected; no existing template output changes.
Must not:
- change any existing test expectation other than the one named amendment (tests/headless/spec.test.ts)
- change what any existing filter outputs
- add a runtime dependency
- evaluate template text as code

## Questions

goal-critical: can a filter be added to the table and be missing from render, spec() or analyze?
goal-critical: does any existing template render a different output than before?
goal-critical: does every bad filter call (unknown filter, undeclared parameter, bad value) fail with a located error in every mode, and never silently fall back?
goal-critical: can a quote inside a filter argument or a ?? default hide a pipe or truncate a value?
polish: does spec() leak a function or a field beyond name, params and description?
polish: is the new code small and does it avoid a second filter list?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope
- the registry is the only place a filter name is listed

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
- docs/living/architecture/prompt-aware-contract.md
