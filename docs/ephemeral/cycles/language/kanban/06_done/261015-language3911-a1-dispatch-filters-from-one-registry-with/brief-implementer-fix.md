# Brief: implementer, first review fix for the filter registry card

## Objective and why
Project goal: a deterministic, no-eval template language with a headless core. Cycle goal (language): grow the language without leaving the house style; ADR 0003 says a bad name or parameter is an error everywhere. Card goal: every filter dispatched from one registry feeding render, spec, analyze and validate. Your objective: fix one review finding, smallest change.

## Decisions already made
Finding f1 (goal-risk, sustained by the lead): `validate('${{ v | escape_md:mode=block }}')` and `analyze` on the same template give no diagnostic and ok true, while `render` returns a type-error at 1:1, because the undeclared-parameter check lives only in `applyFilter`. Fix: the analyze walker (core/src/analyze.ts, around the unknown-filter check) must, for a known filter, report each parameter name not in the definition's `paramNames` as an error diagnostic with code `type-error`, located at the variable's line and column, with the same wording render uses; `validate` must then report it as an error (ok false). Share the check with `applyFilter` (one helper in core/src/filters.ts), do not copy it. Finding f2 (FILTERS stale snapshot) is filed as a follow-up ticket, leave it alone.
Spec: `docs/ephemeral/work/261015-language3911-a1-dispatch-filters-from-one-registry-with/spec.md`.

## Owned files and scope
Worktree `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-dispatch-filters-from-one` (already merged with the cycle branch). Edit `core/src/analyze.ts`, `core/src/filters.ts`, and, only if the validate path needs it, `core/src/render.ts`? No: render.ts is out of scope; if validate cannot be fixed without it, stop and say so. Add table rows (an approved, logged amendment, reason: undeclared parameter reported by validate and analyze, found in review) to `tests/language/filter-registry.test.ts` for: validate and analyze on `escape_md:mode=block`, `head:count=2`, a probe with `paramNames:[]` called `probe:x=1`, each at a non-1:1 position; and that declared parameters give no diagnostic. Change no other existing test.

## How the work is judged
The whole suite passes (`node node_modules/jest/bin/jest.js`, 1405 before plus your rows), `npx tsc --noEmit` clean, no copy of the check.

## Model and effort
sonnet, medium.

## Result and status
Commit once (Conventional Commit, at most 72 characters, no ids, no attribution), e.g. `fix(filters): report undeclared filter parameters in validate and analyze`. Then answer the finding from the main repo path `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver`: `node .process/core/scripts/rounds.mjs reply . 261015-language3911-a1-dispatch-filters-from-one-registry-with --finding f1 --action fixed --restate '<under 200 chars>' --verify '<under 200 chars>' --evidence 'code:core/src/analyze.ts:<line>'` (single quotes, each text under 200 characters). Then run `node .process/core/scripts/claim.mjs . done 261015-language3911-a1-dispatch-filters-from-one-registry-with --owner build:implementer` from the same path (if it refuses because the card is in review, say so in your report). Never push or touch main or write to `nul`. Return a short report starting with a status.
