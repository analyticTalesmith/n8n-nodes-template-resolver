## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: the new language features are reachable and documented from every surface.
Must not:
- change any existing test expectation
- document what the code does not do
- add a runtime dependency

## Questions

goal-critical: does every README example reproduce when run?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/prompt-aware-contract.md
