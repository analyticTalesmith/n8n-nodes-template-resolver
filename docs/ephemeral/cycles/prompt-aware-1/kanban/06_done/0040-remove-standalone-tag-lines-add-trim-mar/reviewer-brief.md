## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: whitespace rules and literal braces in the lexer, parser and interpreter, plus the standaloneLines option in render.
Must not:
- change any existing test expectation
- change what resolveTemplate renders by default
- add a runtime dependency

## Questions

goal-critical: does a template with IF/FOR tags on their own lines render with no stray blank lines by default in render, and unchanged through resolveTemplate?
goal-critical: do analyze and validate understand RAW and the trim markers without errors?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/prompt-aware-contract.md
- docs/living/decisions/adr/0002-standalone-block-tag-lines-vanish.md
