## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: Move the resolver into core/src (lexer, parser, expressions, interpreter, filters, coercion, errors, types, utils and a resolve entry that exports resolveTemplate) and keep only the n8n node class, its json, icon and index in n8n/
Must not:
- edit or delete any existing test body
- add a runtime dependency

## Questions

goal-critical: does each frozen test fail before the change for the stated reason and pass after?
goal-critical: do all pre-existing tests still pass?

## Rubric

- files moved with history-preserving git mv where possible
- no behavior edits mixed into moves

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/decisions/adr/0006-n8n-node-imports-core-directly.md
