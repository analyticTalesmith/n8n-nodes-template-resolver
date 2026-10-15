# Brief: cleanup for the filter registry card

## Objective and why
Project goal: a deterministic, no-eval template language with a headless core. Cycle goal (language): grow the language without leaving the house style. Card goal: every filter dispatched from one registry feeding render, spec and analyze, no change to existing outputs. Your objective: leave the implementer's diff simpler with the same behavior (dead code, duplication, needless complexity, stale comments).

## Decisions already made
Do not change behavior, public signatures or any test. `FILTERS` stays exported (a load-time snapshot of the registry names).

## Owned files and scope
Worktree `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-dispatch-filters-from-one`: edit only files the implementer's last commit changed under `core/src/` (see `git show --stat HEAD`). No new files.

## How the work is judged
`node node_modules/jest/bin/jest.js` passes with the same counts before and after (1405), `npx tsc --noEmit` clean.

## Model and effort
sonnet, low: small mechanical tidy.

## Result and status
Commit once with a Conventional Commit subject (at most 72 characters, no ids, no attribution), e.g. `refactor(filters): tidy the registry dispatch`; if nothing is worth changing, commit nothing and say so. Never push or touch main. Return a short report starting with a status.
