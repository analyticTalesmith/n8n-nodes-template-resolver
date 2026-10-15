# Report: collection filters card (build lead)

Status: blocked (card not yet approved; ready move refused)

- Done: card in shaping, worktree `.worktrees/feature-add-the-collection-filters` (branch `feature/add-the-collection-filters`, rebased on the cycle branch and synced into `feature/language`), test writer run once (1 member run), red evidence recorded (177 failing, 72 passing shape rows), reviewer-brief and spec.md written, card frozen.
- Blocked: `card-move ... 02_ready` fails with `card-not-approved` (design-approval.md lists only the registry card) and, until I wrote it, `spec-missing`. The brief forbids touching design-approval.md.
- Paths: tests/language/filters-collection.test.ts, core/src/filters-collection.ts (neutral stubs), docs/ephemeral/work/<card>/{spec.md,red-evidence.md}, card folder briefs and reviewer-brief.md.
- Gate, full suite, tsc: not run yet (no implementation).
- Rounds: none.

Questions
1. Please re-run `node .process/core/scripts/approve-design.mjs . language --by <name> --accept-changes` so the card is listed (spec.md now exists). Recommended: yes, once for all cards of the cycle.
2. card.json has no `traces` for the criteria (the test writer could not add them). Recommended: leave unless the gate asks.
