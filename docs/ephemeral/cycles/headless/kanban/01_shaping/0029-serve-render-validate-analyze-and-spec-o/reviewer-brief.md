## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: the four routes plus the OpenAPI route behave as design.md says, with JSON errors and request limits.
Must not:
- add a runtime dependency
- listen on any host but 127.0.0.1 unless asked
- leave a server or socket open after a test

## Questions

goal-critical: does a hostile body (huge, wrong type, wrong content type) get a JSON error and never crash the process?
goal-critical: does the OpenAPI document describe what the server actually returns?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/ephemeral/cycles/headless/design.md
