# Brief: implementer, review round 1 fixes (collection filters)

## Objective and why

Project goal: a deterministic, no-eval template language. Cycle goal: authors shape values in the language itself. Card goal: nine collection filters in `COLLECTION_FILTERS` (see `brief-implementer.md` and `docs/ephemeral/work/261015-language3911-a4-add-the-collection-filters/spec.md`). The blind review sustained two goal-risk findings; fix exactly these, each with its own test row. Worktree: `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-add-the-collection-filters`. Never redirect to `nul`, never push, do not touch any other worktree.

## Fix requests (smallest change each)

1. Finding f3 (goal-risk, serves "string inputs coerce exactly as FOR coerces; an object given to a list filter fails with a located type-error"): `render('${{ v | join="," }}', { v: '{"a":1}' }, { standaloneLines: false, strictMode: true })` returns ok with output `''`. Cause: `toList` in `core/src/filters-collection.ts` throws "needs a list" only when `typeof input === "object"`, but `tryCoerceToArray` also rejects a JSON-object text (a string starting with `{`), which then falls through to `[]`. Change `toList` so that the only inputs that give the empty list are null, undefined and a blank (empty or whitespace-only) string; any other input that `tryCoerceToArray` rejects throws the same "needs a list, got ..." error (it is a located type-error in every mode, a filter cannot see strict mode, and ADR 0003 says a bad input is not silent). Add `it.each` rows to `tests/language/filters-collection.test.ts` named `fc-collection: ...`: a JSON-object string `'{"a":1}'` and `'  {"a":1}  '` is a type-error located at the variable for `join="," first last sort unique slice` in lenient and strict mode; `""`, `"   "`, null and a missing variable still give the empty list.
2. Finding f4 (goal-risk, serves "sort is stable and deterministic"): `sort` over `[3, NaN, 1, 2]` is engine-defined because `compare` returns `a - b` (NaN, and Infinity minus Infinity is NaN). In `compare` / `rank`: rank NaN with the "other" values (rank 2, so it keeps its original relative order after the strings); compare numbers with `<` and `>` (never subtraction), so equal infinities compare equal. Add `fc-order: ...` rows: `[3, NaN, 1, 2]` gives `[1, 2, 3, NaN]`; `[Infinity, 1, -Infinity, Infinity]` gives `[-Infinity, 1, Infinity, Infinity]`; `["b", NaN, "a", 2]` gives `[2, "a", "b", NaN]`; two NaNs and an object keep their original order; the same input sorted twice is equal; `sort=key` over objects whose key values include NaN follows the same order.
3. Drift f6 (do it, trivial): change the `length` description in `core/src/filters-collection.ts` to say "Items of a list, UTF-16 code units of a text, keys of an object", and edit the `**length.**` bullet of the "Collection filters" section in `docs/living/architecture/language-contract.md` the same way (characters of a text become UTF-16 code units, so one emoji counts 2). Add one `fc-collection` row proving `length` of `"\uD83D\uDE00"` is 2.
4. Drift f5: leave as is (importing `valueToText` from `filters.ts` makes a circular import that fails when `filters-collection.ts` loads first). Do not change `textOf`.

## Owned files and scope

`core/src/filters-collection.ts`, `tests/language/filters-collection.test.ts` (new rows only; do not change any existing row) and the one bullet of `docs/living/architecture/language-contract.md` named above. Nothing else.

## How the work is judged

Gate `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/filters-collection.test.ts --json` passes; `npx tsc --noEmit -p .` exits 0; the full suite shows only the failures that belong to other cards (filters-text, limits-nodes, headless limits/api/spec). Commit once at the end (`fix(language): reject object text and order NaN in collection filters`, no codes, no attribution), then say "done" with the commit hash, gate numbers and full-suite numbers.

## Model and effort

Sonnet, medium: precise mechanical fixes with test rows.

## Result and status

Final message: status, commit hash, numbers, anything you could not do.
