# Brief: implementer for the collection filters card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: authors can join, count, pick, order, de-duplicate, slice, split and serialize lists with `join length first last sort unique slice lines json`, each a definition in `COLLECTION_FILTERS` of the one filter registry.
Your objective: replace the neutral stubs in `core/src/filters-collection.ts` with the real filters so the committed failing tests pass. Every instruction traces to that.

Work only in the worktree `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-add-the-collection-filters` (branch `feature/add-the-collection-filters`; `node_modules` is a junction, never run npm install). Never redirect output to `nul`. Never push.

## Decisions already made

- The exact behavior of every filter is in `docs/ephemeral/work/261015-language3911-a4-add-the-collection-filters/spec.md` (in the worktree) and, in more detail, in the "Decisions" list 1 to 12 of `docs/ephemeral/cycles/language/kanban/03_in_progress/261015-language3911-a4-add-the-collection-filters/brief-test-writer.md`. The tests in `tests/language/filters-collection.test.ts` are the oracle; do not change them. If a test and the list contradict, stop and report.
- A filter's `apply(input, params)` throws a plain `Error` for a bad parameter or a cyclic value; the interpreter already turns it into a type-error located at the variable. Do not touch the interpreter, parser or registry.
- List filters coerce with `tryCoerceToArray` (`core/src/coercion.ts`), as FOR does; item text form is `valueToText` from `core/src/filters.ts` (mind the import cycle: `filters.ts` imports this file; import `tryCoerceToString` from `./coercion` and write the small text-form helper locally if `valueToText` creates a load-order problem).
- No new dependency; no regular expression compiled from template text (fixed internal regexes are fine); no eval. Never mutate the input. Deterministic: no locale compare (`localeCompare` is forbidden), compare strings by code unit with `<`.
- Cyclic detection must not overflow the stack on a long non-cyclic nest and must treat a repeated non-cyclic reference as fine (track the current path, not every visited object).

## Owned files and scope

You may change only `core/src/filters-collection.ts` (manifest edit). Everything else is read-only, including the tests.

## How the work is judged

- The gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/filters-collection.test.ts --json` passes, every test.
- Before saying done run the full suite `node node_modules/jest/bin/jest.js` and the type check `npx tsc --noEmit -p .`, both exit 0. (Other cards run in parallel on this machine; if a failure is clearly in a file you do not own and not caused by your change, say so and do not fix it.)
- Small, plain code: one stable-JSON helper shared by `json` and `unique`; one comparison helper shared by `sort` and `sort=key`; no second filter list.
- Commit once, at the end, with the card's files only: Conventional Commits, lowercase imperative, at most 72 characters, no plan codes, no attribution lines, for example `feat(language): add the collection filters`. Then say "done".

## Model and effort

Sonnet, medium effort: mechanical implementation from precise criteria and an existing test oracle.

## Result and status

Final message: status (done, done with concerns, needs context, blocked), the commit hash, the gate numbers (tests passed/failed), the full-suite and tsc results with numbers, changed line count, and any duplication you could not remove. No secrets.
