## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: errors carry code, line and column everywhere; limits bound iterations, output and nesting.
Must not:
- change what any currently passing template renders
- add a runtime dependency
- import n8n or do I/O in core

## Questions

goal-critical: do runtime errors deep in a template (inside FOR or IF, on line 5 or later) report their own line and column?
goal-critical: do the limits stop a runaway template, including nested loops, before the process hangs?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/headless-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
