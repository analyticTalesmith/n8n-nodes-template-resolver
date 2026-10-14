## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: the SECTION block with title, level and skip_empty, in the lexer, parser, interpreter, analyze, render stats and spec.
Must not:
- change any existing test expectation
- change output for templates without SECTION
- add a runtime dependency

## Questions

goal-critical: does an empty section leave no stray blank lines, with standaloneLines on and off?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/prompt-aware-contract.md
