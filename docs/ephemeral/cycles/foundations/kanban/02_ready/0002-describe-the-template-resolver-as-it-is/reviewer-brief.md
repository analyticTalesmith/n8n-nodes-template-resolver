## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: Two recovered documents exist and every claim in them is cited and checked.
Must not:
- propose changes in a recovered document
- state an inference as a fact

## Questions

goal-critical: does each criterion hold when its frozen test is run?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/overview.md
- docs/living/architecture/modules/template-resolver.md
