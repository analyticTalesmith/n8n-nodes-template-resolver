## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: one structured contract in core that API, CLI and node all consume.
Must not:
- change what resolveTemplate returns for any passing template
- add a runtime dependency
- import n8n or do I/O in core

## Questions

goal-critical: can render throw for any template or data input?
goal-critical: does the node still pass its existing tests and keep the old output field?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/headless-contract.md
- docs/living/decisions/adr/0004-render-returns-a-structured-result.md
- docs/living/decisions/adr/0005-dependency-free-token-estimator.md
- docs/living/decisions/adr/0006-n8n-node-imports-core-directly.md
