# Report: text filters card (build lead)

Status: done. Gate clean (`gate --to review`: "gate clean: in progress -> review"); the card is still in progress, not moved.

- Branch `feature/add-the-text-filters`, worktree `.worktrees/feature-add-the-text-filters`, tip carries the card's commits (not synced to feature/language since the tests; the project lead merges).
- Code: `core/src/filters-text.ts` (148 added lines; commit "feat(filters): add the text filters"). Tests: `tests/language/filters-text.test.ts`, 310 of 310 pass (gate command). `tsc --noEmit -p .` clean.
- Full suite in the worktree: 5 suites fail, all other cards' red tests (limits-nodes, filters-collection) and the maxNodes default-limits rows in tests/headless (spec, api, limits). Excluding those, everything passes (this card's change does not touch them). Re-check after merging the cards in order.
- Documents edited: `docs/living/architecture/language-contract.md` (Text filters section), `docs/living/architecture/modules/template-resolver.md` (filters paragraph). Deltas: `text-filters-contract`, `text-filters-module-page` (modify, open; none validated).
- Member runs: 3 (test writer, implementer, none else; cleanup skipped: diff under 300 lines, no duplication reported).
- Scope exceptions: the two delta files, logged in `context.md` (the gate warns scope-exception, needs human review). No manifest amendments.
- Settled semantics accepted by the project lead: title lowercases the rest; replace `find` non-empty, `with` optional; indent 0 to 100; round 0 to 20 decimal-exact, non-numbers unchanged; `default` value required. Static `validate` checks only names and undeclared parameters; strict mode reports a missing variable before `default` (ticket filed by the project lead).
- Rounds: none yet; no review findings, no rebuttals.

Questions: none.
