## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: Prompt-shaped output: standalone-line whitespace, trim markers, RAW and escaping, SECTION, heading offset, FENCE and escape modes.
Card goal: the FENCE block, the fence and heading_offset filters, and escape_md modes in filters, lexer, parser, interpreter, analyze and spec.
Must not:
- change any existing test expectation
- change what plain escape_md outputs
- add a runtime dependency

## Questions

goal-critical: can any body make the fence close early?
goal-critical: do the escape modes and offsets leave existing templates unchanged?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/prompt-aware-contract.md
