## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: a reader can use the CLI and the API from the documentation alone and every documented route, subcommand and code exists.
Must not:
- document anything the code does not do
- change source code

## Questions

goal-critical: run each example; does it match the README text?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/ephemeral/cycles/headless/design.md
