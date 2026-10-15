# Brief: implementer for the filter registry card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: every filter is dispatched from one registry that also feeds spec() and analyze, filters take and return values, and filter arguments are parsed once at parse time with quotes respected, with no change to any existing template output. Later cards only add rows to the registry, so no name may be listed twice and none cached at module load.
Your objective: make the frozen tests pass with the smallest correct change, inside the file scope.

## Decisions already made

- Spec and interface names: `docs/ephemeral/work/261015-language3911-a1-dispatch-filters-from-one-registry-with/spec.md`; contract text: `docs/living/architecture/language-contract.md` (Filters). ADR 0003: unknown names and bad parameters are errors in every mode.
- The test writer left signature-only stubs: `FilterDefinition` in `core/src/types.ts`, an empty `FILTER_REGISTRY` in `core/src/filters.ts`, empty `TEXT_FILTERS` and `COLLECTION_FILTERS` in the two new files. Fill them in; do not move their names.
- Four follow-up tickets are folded in: a `fence` language containing `=` or `:` is truncated (parseFilter splits on every `=`); `escape_md:mode=block` silently falls back to inline (now a type-error for any undeclared parameter); an unterminated quote in a `??` default swallows later filters (rescan from where the quote opened and treat it as plain text); spec's filter list must derive from the dispatch table.
- Human decisions 2026-10-14: render-only behavior changes, `resolveTemplate` outputs unchanged, no new runtime dependency, no eval.
- Existing exported names stay: `parseFilter`, `applyFilter`, `applyFilters`, `FILTERS`.

## Owned files and scope

Worktree: `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-dispatch-filters-from-one` (branch `feature/dispatch-filters-from-one`; node_modules is linked). Edit only: `core/src/filters.ts`, `parser.ts`, `interpreter.ts`, `analyze.ts`, `spec.ts`, `types.ts`, `errors.ts`, `filters-text.ts`, `filters-collection.ts` (all under `core/src/`). Do not edit any test, the `.process` folder, docs or card files; if a test seems wrong or you need another file, stop and ask in your report.

## How the work is judged

- Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/filter-registry.test.ts --json` passes, and the whole suite (`node node_modules/jest/bin/jest.js`) passes with the same counts as before plus the new tests.
- The repo's lint/type checks on the touched files (`npx tsc --noEmit -p .` if available) stay clean. Keep functions small; no dead code; no second filter list anywhere.
- Reviewers will ask: can a filter be added to the table and missing from render, spec or analyze; does any existing template render differently; does every bad filter call fail with a located error in every mode.

## Model and effort

sonnet, medium: a contained refactor with an exact oracle.

## Result and status

Commit once at the end, in the worktree, Conventional Commits, subject at most 72 characters, no ids or card codes, no attribution lines, e.g. `feat(filters): dispatch every filter from one registry`. Never push, touch main, move cards or write to `nul`. Then run `node .process/core/scripts/claim.mjs C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver done 261015-language3911-a1-dispatch-filters-from-one-registry-with --owner build:implementer` from the main repo and say "done". Save your report as `report-implementer.md` in the card folder of the main repo (`docs/ephemeral/cycles/language/kanban/03_in_progress/261015-language3911-a1-dispatch-filters-from-one-registry-with/`, not committed) and return it, starting with a status: done, done with concerns, needs context, or blocked.
