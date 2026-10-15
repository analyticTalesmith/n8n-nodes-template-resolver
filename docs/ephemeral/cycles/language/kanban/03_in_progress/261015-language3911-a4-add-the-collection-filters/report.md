# Report: collection filters card (build lead)

Status: done with concerns (review-ready; gate clean; card still in progress, not moved)

- Worktree `.worktrees/feature-add-the-collection-filters`, branch `feature/add-the-collection-filters`; head commits: feature, docs, scope amendments, bookkeeping. Not merged, not pushed.
- Gate (`filters-collection.test.ts`): 249 passed, 0 failed. `tsc --noEmit`: exit 0. `gate.mjs --to review`: clean (one warning manifest-add-at-base).
- Full suite in the worktree: 1788 passed, 393 failed in 5 suites, none ours: `tests/language/filters-text` (text filters card's red tests), `tests/language/limits-nodes`, `tests/headless/limits`, `api`, `spec` (node count limit card's tests, on the cycle branch before its code). Re-run after those cards merge.
- Paths: core/src/filters-collection.ts (about 205 lines), tests/language/filters-collection.test.ts, docs/living/architecture/language-contract.md, docs/living/architecture/modules/template-resolver.md, two deltas (collection-filters-contract, collection-filters-module-page), spec.md, red evidence.
- Members: test writer 1, implementer 2 (second run fixed one test row and committed), cleanup skipped (diff about 205 lines, no duplication reported).
- Amendments: manifest gained the two delta files (scope `docs/ephemeral/cycles/language/deltas`). Test amendment logged in card.json: one row of the new test file rendered a missing variable with strict mode on by default; now `strictMode: false`.
- Rounds: none open.

Questions
1. Please confirm the test amendment's `approved_by` (I wrote "build lead under the card brief; project lead to confirm"). Recommended: confirm.
2. Merge note: the language contract and module page also get text-filters sections from the other card; expect a trivial doc merge at one append point.
