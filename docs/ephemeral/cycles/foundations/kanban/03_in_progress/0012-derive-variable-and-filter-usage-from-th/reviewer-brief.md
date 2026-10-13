## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: Add analyze(template) to core, returning the variables a template reads (root name, full paths, where used: output, IF, ELSEIF, CASE, FOR source, LIST_ITEM, TABLE cells, filter arguments, comparison operands including the right side of contains) and the filters it applies, all derived from the parsed AST and expression tokens, not from regexes on the source
Must not:
- edit or delete any existing test body
- add a runtime dependency

## Questions

goal-critical: does each frozen test fail before the change for the stated reason and pass after?
goal-critical: do all pre-existing tests still pass?

## Rubric

- no regular expression is run over raw template source to find variables

## Design context

- docs/living/architecture/modules/template-resolver.md
