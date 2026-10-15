---
summary: Card 261015-language2c13 (FOR limit, offset, ELSE, @total on one loop runner and a scope stack) conforms to all ten criteria; gate, whole suite and tsc are green at 30703e4.
stream: acceptance-test
result: pass
verdict: accept
verification_verdict: accept
validation_verdict: not-assessed
ran_against: 30703e4ad1692d11b9efb739ccc305d48af91398
tier: product
scope: card 261015-language2c13-a1-add-limit-offset-an-empty-branch-and-tot
level:
lens:
sweep_round:
signed_off_by:
local_docs: []
local_docs_sha256: []
---
# Verification: add limit, offset, an empty branch and @total to FOR

## Scope

Card `261015-language2c13-a1-add-limit-offset-an-empty-branch-and-tot` of cycle `language-2`, criteria `fw-window`, `fw-meta`, `fw-else`, `fw-args`, `fw-table`, `fw-limits`, `fw-scope`, `fw-no-copy`, `fw-own` and `fw-compat`, plus the card's must-nots (no runtime dependency, no existing test changed). The cycle's must-haves `lang-for`, `lang-compat`, `lang-no-deps` and `lang-errors` are the parents of these criteria; the rest of the cycle's must-haves belong to other cards.

Run at a clean tree: `git status --porcelain` printed nothing at commit `30703e4ad1692d11b9efb739ccc305d48af91398`. Not checked: the cycle-level surfaces (spec() list, README, OpenAPI, changelog), which later cards own; the review-sweep `malicious-path`, which the cycle runs at the merge request.

## Levels

Required by the cycle: none (`verification_levels: []`, no browser scenarios, so no exploratory tester, test author or test reviewer was spawned). Required by the card: `unit` (card `test_levels`). Run: unit (the card's gate), the whole suite (the integration level of `docs/living/testing.md`), and the type check `npx tsc --noEmit -p .`.

## Evidence

All commands ran from the project directory at `30703e4`, by the verifier member; every result is deterministic.

- Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/for-window.test.ts --json` exited 0: 1 suite passed, 1854 tests passed, 0 failed.
- Whole suite: `node node_modules/jest/bin/jest.js` exited 0: 41 suites passed of 41, 9226 tests passed of 9226.
- Type check: `npx tsc --noEmit -p .` exited 0 with no output.
- Compat: `node node_modules/jest/bin/jest.js --runTestsByPath tests/regressions/nested-for.test.ts tests/TemplateResolver.node.test.ts` exited 0: 2 suites, 458 tests passed.
- Test diff: `git diff --name-status 292601da41a656de89e170feed03457d5e955f90 HEAD -- tests` printed only `M tests/language/for-window.test.ts`.
- Dependencies: `git diff --name-status 292601da41a656de89e170feed03457d5e955f90 HEAD -- package.json package-lock.json` is empty.
- No failures, so no files under `verification/evidence/`.

## Conformance

| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| fw-window | proven | deterministic | `tests/language/for-window.test.ts`, 434 tests titled `fw-window` (groups "limit and offset" and "analyze and spec") passed in the gate run. |
| fw-meta | proven | deterministic | `tests/language/for-window.test.ts`, 60 tests titled `fw-meta` passed in the gate run. |
| fw-else | proven | deterministic | `tests/language/for-window.test.ts`, 171 tests titled `fw-else` passed in the gate run. |
| fw-args | proven | deterministic | `tests/language/for-window.test.ts`, 779 tests titled `fw-args` passed in the gate run. |
| fw-table | proven | deterministic | `tests/language/for-window.test.ts`, 91 tests titled `fw-table` passed in the gate run. |
| fw-limits | proven | deterministic | `tests/language/for-window.test.ts`, 87 tests titled `fw-limits` passed in the gate run. |
| fw-scope | proven | deterministic | `tests/language/for-window.test.ts`, 68 tests titled `fw-scope` passed in the gate run. |
| fw-no-copy | proven | deterministic | `tests/language/for-window.test.ts`, 10 tests titled `fw-no-copy` (the Map subclass that counts `Symbol.iterator`, `entries`, `keys` and `forEach` through `resolveTemplate`) passed in the gate run. |
| fw-own | proven | deterministic | `tests/language/for-window.test.ts`, 154 tests titled `fw-own` passed in the gate run. |
| fw-compat | proven | deterministic | Whole suite 41 of 41 suites and 9226 of 9226 tests pass, `tests/regressions/nested-for.test.ts` and `tests/TemplateResolver.node.test.ts` pass (458 tests), and the diff against base `292601d` touches no existing test file. |
| must-not: no runtime dependency | proven | deterministic | `package.json` and `package-lock.json` have no diff against base. |
| must-not: no eval, template regex or file read | not-checked | deterministic | No test targets this on the card; the cycle's `malicious-path` sweep covers it at the merge request. |
| `tsc` type check | proven | deterministic | `npx tsc --noEmit -p .` exited 0. |

## Validation

| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| need: authors can window, empty-branch and count a loop | not-checked | human-confirmed | No person has judged this; the cycle's exit check (the SEO-brief showcase template rendered through render, the CLI and the API) is a human step at close. |

## Revise

None.

## Known issues

- The frozen test file `tests/language/for-window.test.ts` was amended twice after freeze, both logged in `card.json` `test_amendments` and approved by the project lead: 56 strict-mode entries corrected to the lenient outcome, and 15 rows added after review round 1. The file is the card's own, so `fw-compat` (no existing test file changes) holds, but the first amendment changed expectations the test writer froze.
- Per-id test counts add up to more than the per-group counts because the 14 "analyze and spec" and some "review round 1 regressions" tests carry `fw-*` title prefixes; no test has an unmatched id.
- The golden case `tests/golden/render-cases/lang-for-window/` was committed before the base commit, so it shows no diff; it passes inside the whole suite.

## Manual

None.
