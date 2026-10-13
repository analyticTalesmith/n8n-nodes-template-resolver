## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: A harness that runs every case folder under tests/golden/cases/<name>/ (template.md, data.json, optional options.json, and expected.md or expected-error.txt), compares the rendered output byte for byte, names the failing case and shows a first-difference excerpt, and rewrites the expected files when UPDATE_GOLDEN=1
Must not:
- edit or delete any existing test body
- add a runtime dependency

## Questions

goal-critical: does each frozen test fail before the change for the stated reason and pass after?
goal-critical: do all pre-existing tests still pass?

## Rubric

- cases are plain files readable without running code

## Design context

- docs/living/architecture/modules/template-resolver.md
