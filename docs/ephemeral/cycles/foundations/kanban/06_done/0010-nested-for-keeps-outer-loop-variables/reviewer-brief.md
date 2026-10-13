## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: An inner FOR loop must not clear or overwrite the enclosing loop variables
Must not:
- change behavior outside the named defects
- edit or delete any existing test
- add a runtime dependency

## Questions

goal-critical: does each frozen regression test fail before the fix for the stated reason and pass after?
goal-critical: do all pre-existing tests still pass?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/modules/template-resolver.md
