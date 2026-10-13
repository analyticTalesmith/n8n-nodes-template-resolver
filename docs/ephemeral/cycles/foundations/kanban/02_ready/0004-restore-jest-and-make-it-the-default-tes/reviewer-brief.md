## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: npm ci then npm test runs the existing jest suite and passes from a clean clone, and a TAP reporter lets cards gate on jest tests.
Must not:
- change any source under nodes/ or any existing test
- add a runtime dependency
- change the jest roots or the module mapper for n8n-workflow

## Questions

goal-critical: does npm ci succeed from a clean clone with the committed lockfile?
polish: are the devDependency ranges the ones the lock resolves?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/overview.md
