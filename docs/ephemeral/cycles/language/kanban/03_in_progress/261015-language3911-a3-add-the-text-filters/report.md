# Report: text filters card (build lead)

Status: blocked (needs context). The card is in shaping, frozen, with red tests; `card-move ... 02_ready` is refused with `card-not-approved`.

## Done
- Card moved to shaping and committed; worktree `.worktrees/feature-add-the-text-filters` (branch `feature/add-the-text-filters`), node_modules junction linked.
- Test writer (1 run) committed `tests/language/filters-text.test.ts` (310 tests) and `red-evidence.md` (287 failing, exit 0). Mutation check by the writer: 14 wrong implementations all caught. Synced to `feature/language`.
- I wrote `reviewer-brief.md` and `docs/ephemeral/work/<card>/spec.md` (the card had neither), then froze (`074119b`).
- Member runs so far: 1. No scope amendments.

## Blocker
`design-approval.md` lists only the registry card, so ready is refused. The brief forbids me to edit it, and re-approval (`approve-design.mjs <projectDir> language --by <name> --accept-changes`) is a human act. Already in friction3.md (a4 lead's line).

## Questions
1. Please run the re-approval (adding this card and its spec to the approved set), then respawn me or tell me to continue from ready: claim, in progress, implementer, gate, docs. Recommended: approve all planned cards at once.
2. `validate`/`analyze` run without data, so bad parameter VALUES (replace without find, indent=x, round=1.5, default without value) surface at render only; only undeclared names are static. Recommended: accept (dispatch change is out of card scope); recorded in the spec.
3. Strict mode reports a missing variable before `default=` runs, so `default` absorbs missing data in lenient mode only. Making it absorb missing in strict mode needs an interpreter change (outside scope). Recommended: accept for this card; consider a later card.
4. Semantics I settled (spec.md): title lowercases the rest of each word; replace `with` optional, `find` non-empty; indent 0 to 100, round 0 to 20; round passes non-numeric input through unchanged; `default` value required. Recommended: accept.
5. Test writer found `??` already treats "0", "false" as absent, so `default=` differs from `??` only in strict mode for missing data.
