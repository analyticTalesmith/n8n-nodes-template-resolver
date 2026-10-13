## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: A workflow file runs npm ci, npm run build and npm test on ubuntu-latest and windows-latest with Node LTS, and git no longer ignores it.
Must not:
- publish anything or add a release job
- add secrets or tokens
- change source under nodes/

## Questions

goal-critical: would the workflow run on a fresh pull request without extra setup?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/overview.md
