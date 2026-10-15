---
summary: Card 261015-language2c13-a2 (FOR and IF building LIST items and TABLE rows) conforms to all nine criteria; gate, whole suite and tsc are green at c7118a0.
stream: acceptance-test
result: pass
verdict: accept
verification_verdict: accept
validation_verdict: not-assessed
ran_against: c7118a07ccd87d20ad4f8bf41f94d66908773d31
tier: product
scope: card 261015-language2c13-a2-build-list-items-and-table-rows-with-for
level:
lens:
sweep_round:
signed_off_by:
local_docs: []
local_docs_sha256: []
---
# Verification: build LIST items and TABLE rows with FOR and IF

## Scope

Card `261015-language2c13-a2-build-list-items-and-table-rows-with-for` of cycle `language-2`, criteria `lc-list`, `lc-table`, `lc-close`, `lc-errors`, `lc-limits`, `lc-ws`, `lc-analyze`, `lc-pipes` and `lc-compat`, plus the card's must-nots (no existing test expectation changed, no runtime dependency). The cycle's must-haves are the parents of these criteria; the rest belong to other cards.

Run at a clean tree: `git status --porcelain` printed nothing, before and after the runs, at commit `c7118a07ccd87d20ad4f8bf41f94d66908773d31`. Not checked: the cycle-level surfaces (spec() list, README, OpenAPI, changelog entry for `lc-pipes`), which later cards own; the review-sweep `malicious-path`, which the cycle runs at the merge request.

## Levels

Required by the cycle: none (`verification_levels: []`, no browser scenarios, so no exploratory tester, test author or test reviewer was spawned). Required by the card: `unit` (card `test_levels`). Run: unit (the card's gate), the whole suite (the integration level of `docs/living/testing.md`), and the type check `npx tsc --noEmit -p .`.

## Evidence

All commands ran from the project directory at `c7118a0`, by the verifier member; every result is deterministic.

- Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/list-table-children.test.ts --json` exited 0: 1 suite passed, 1780 tests passed, 0 failed, 0 pending, todo or skipped.
- Whole suite: `node node_modules/jest/bin/jest.js` exited 0: 42 suites passed of 42, 11008 tests passed of 11008.
- Type check: `npx tsc --noEmit -p .` exited 0 with no output.
- Test diff: `git diff --name-status fa60d52418cc6f548d16224e48977851f998a1b6 HEAD -- tests` printed only `M tests/language/list-table-children.test.ts`; no pre-existing test file is modified or deleted.
- Dependencies: `git diff --name-status fa60d52 HEAD -- package.json package-lock.json` is empty.
- Product change: `git diff --stat fa60d52 HEAD -- core/src` shows five files (analyze, interpreter, parser, spec, types), all inside the card's `files_scope`.
- No failures, so no files under `verification/evidence/`.

## Conformance

| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| lc-list | proven | deterministic | `tests/language/list-table-children.test.ts`, 258 tests whose names carry `lc-list` passed in the gate run. |
| lc-table | proven | deterministic | Same file, 257 tests carrying `lc-table` passed in the gate run. |
| lc-close | proven | deterministic | Same file, 144 tests carrying `lc-close` passed in the gate run. |
| lc-errors | proven | deterministic | Same file, 486 tests carrying `lc-errors` passed in the gate run. |
| lc-limits | proven | deterministic | Same file, 258 tests carrying `lc-limits` passed in the gate run. |
| lc-ws | proven | deterministic | Same file, 128 tests carrying `lc-ws` passed in the gate run. |
| lc-analyze | proven | deterministic | Same file, 24 tests carrying `lc-analyze` passed in the gate run. |
| lc-pipes | proven | deterministic | Same file, 109 tests carrying `lc-pipes` passed in the gate run. |
| lc-compat | proven | deterministic | Whole suite 42 of 42 suites and 11008 of 11008 tests pass; the diff against base `fa60d52` touches no pre-existing test file other than the card's own `tests/language/list-table-children.test.ts`. |
| must-not: no runtime dependency | proven | deterministic | `package.json` and `package-lock.json` have no diff against base. |
| must-not: no existing test expectation changed | proven | deterministic | Only the card's own test file differs from base; see Known issues for its three logged amendments. |
| must-not: no eval, template regex or file read; no lenient pass for unknown names | not-checked | deterministic | No test targets this on the card by id; the cycle's `malicious-path` sweep covers it at the merge request. |
| `tsc` type check | proven | deterministic | `npx tsc --noEmit -p .` exited 0. |

## Validation

| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| need: authors can build list items and table rows with loops and conditions | not-checked | human-confirmed | No person has judged this; the cycle's exit check (the SEO-brief showcase template rendered through render, the CLI and the API) is a human step at close. |

## Revise

None.

## Known issues

- The frozen test file `tests/language/list-table-children.test.ts` was amended three times after freeze, all logged in `card.json` `test_amendments`: one compat row (an unclosed ROW before END_FOR in a FOR directly in a TABLE) changed from a syntax error to three rows because `lc-close` makes the ROW end there, approved by the build lead and flagged to the project lead; two test defects corrected (the golden helper and three header-separator lengths), approved by the project lead; and 44 tests added after review round one finding f1, approved by the project lead. The file is the card's own, so `lc-compat` holds, but the first amendment changed a row the test writer froze.
- Per-id test counts add up to more than the gate's 1780 tests (the ids sum to 1664 and 160 passed tests carry none of them, 1824 in all) because some tests carry more than one id; none of the 160 id-less tests fails.
- The golden cases `tests/golden/render-cases/lang-list-for/` and `lang-table-if/` were committed before the base commit, so they show no diff; they pass inside the whole suite.
- The card folder was still in `03_in_progress` when this record was written, although the last commit says it moved to review.

## Manual

None.
