## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: template-resolver works from the terminal exactly as design.md says.
Must not:
- add a runtime dependency
- write to stdout anything but the result
- leave a child process running after a test

## Questions

goal-critical: are stdout and stderr and the exit codes exactly as specified for success, template error and usage error?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/headless-contract.md
