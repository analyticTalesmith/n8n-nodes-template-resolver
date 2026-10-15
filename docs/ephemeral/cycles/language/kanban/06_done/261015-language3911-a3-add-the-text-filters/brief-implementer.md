# Brief: implementer for the text filters card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: authors can reshape text with upper, lower, title, replace, indent, quote, round and default, each a row in `TEXT_FILTERS`, with wrong or missing parameters reported as located type-errors.
Your objective: make the frozen tests pass with the smallest correct change, inside the file scope.

## Decisions already made

- Behavior is settled in `docs/ephemeral/work/261015-language3911-a3-add-the-text-filters/spec.md` (read it first; "Behavior settled for this card" is binding) and pinned by `tests/language/filters-text.test.ts`. Contract: `docs/living/architecture/language-contract.md` (Filters); ADR 0003: unknown names and bad parameters are errors in every mode.
- Rows are `FilterDefinition` objects (`core/src/types.ts`): `{name, params, description, paramNames, apply(input, params)}`. The registry in `core/src/filters.ts` already spreads `TEXT_FILTERS`; do not touch it. `valueToText` (from `./filters`) is how the output step prints a value; `isTruthy` is exported from `./expressions`. Import them; do not copy them. Watch for a circular import: `filters.ts` imports `filters-text.ts`, so use the functions only inside `apply`, never at module load.
- A bad parameter value is reported by throwing an `Error` from `apply`; the interpreter turns it into a located type-error. Shorthand `name=value` arrives as `params.value`.
- No template-supplied regular expression is ever compiled (replace is literal: split and join, or `replaceAll` with a string and a replacer function); no runtime dependency; no eval. The `round` rule must be decimal-exact (1.005 with 2 places gives 1.01), not binary `toFixed`.

## Owned files and scope

Worktree: `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-add-the-text-filters` (branch `feature/add-the-text-filters`; node_modules is linked; never run npm install). Edit only `core/src/filters-text.ts`. Do not edit any test, `.process`, docs or card files; if a test seems wrong or you need another file, stop and say so in your report.

## How the work is judged

- Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/filters-text.test.ts --json` passes; the whole suite (`node node_modules/jest/bin/jest.js`) passes; `npx tsc --noEmit -p .` is clean (the tsconfig has noUnusedLocals). Never redirect output to `nul`.
- Small functions, no dead code, one description per row that tells an author what the filter does, `params` text showing the signature (for example `indent[=N]`, `replace:find="a",with="b"`).

## Model and effort

sonnet, medium: a contained change with an exact oracle.

## Result and status

Commit once at the end, in the worktree, Conventional Commits, subject at most 72 characters, no ids, no attribution lines, e.g. `feat(filters): add the text filters`. Never push, touch main, move cards or write to `nul`. Then say "done" (I record it with claim.mjs). Save your report as `report-implementer.md` in the card folder `docs/ephemeral/cycles/language/kanban/03_in_progress/261015-language3911-a3-add-the-text-filters/` of the worktree (not committed) and return it, starting with a status: done, done with concerns, needs context, or blocked.
