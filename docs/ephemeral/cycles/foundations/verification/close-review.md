---
summary: Close review of the foundations cycle: tests, CI, Tier 0 fixes, core and n8n split, AST analyze and golden harness.
approved_by: Jon (front approval)
validates: []
---
# Close review: foundations

## What shipped

- The jest suite is the default test command again: jest, ts-jest and @types/jest are declared, and a small TAP reporter lets cards gate on jest tests.
- A GitHub Actions workflow runs install, build and test on ubuntu and windows with Node LTS; `.github/` is no longer ignored.
- Five bug cards, each with failing tests first and a root-cause record: nested FOR keeps outer variables, quote-aware pipes in `??` defaults plus rejection of `ELSE IF` and tag arguments, negation and boolean words plus numeric equality and variable right-hand sides in conditions, string inputs that keep commas and index like arrays, table cells that escape pipes and flatten newlines. Not bugs: `??` on 0 and false (documented behavior). Deferred: runtime error locations (diagnostics work in the headless cycle).
- The code moved into `core/src` (pure, no n8n or I/O imports) and `n8n/` (thin node); the 446 pre-existing tests changed only in import lines.
- `analyze()` derives variables and filters from the parsed template and replaced the regex detection; strict mode now accepts loop item names and variables that carry a default.
- A golden-file harness with eight cases, update mode and pinned line endings.
- Six decision records under `docs/living/decisions/adr/` and two recovered documents (surface map, resolver module).

## Evidence

- Full suite on the merged branch: 563 tests in 12 suites pass; `npm run build` succeeds.
- Every card passed blind review (several needed two or three rounds); drift findings are filed as backlog tickets 0014 to 0025 and later.
- Independent verification of a fresh clone: see `verification.md` in this folder.

## Loop summary

No goal loop ran.

## Known issues

- Verification defects D1 to D6 (see verification.md) are not yet ticketed. Open follow-ups are the backlog tickets filed from review (edge cases of the new quote-aware pipe split and the table pipe escaping, intended widenings of numeric equality and array repair, wiring the node:test tooling tests into CI).
- The recovered module document describes the base commit and still needs its modify delta applied after merge; two of its absolute claims are inexact for edge inputs.
- The CI workflow has not run on GitHub yet.

## Expected streams

None declared in the cycle brief.

## Untriaged feedback

none

## Decision

Accept with follow-ups (front approval given by the project owner up front).
