---
summary: Card 261015-language2c13-a3 (SET, block-scoped locals through the one shared value evaluator) conforms to all twelve criteria; gate, whole suite and tsc are green at f4c58c6.
stream: acceptance-test
result: pass
verdict: accept
verification_verdict: accept
validation_verdict: not-assessed
ran_against: f4c58c65dd73b86875d4bcaeecae293f05c957a5
tier: product
scope: card 261015-language2c13-a3-bind-block-scoped-locals-with-set
level:
lens:
sweep_round:
signed_off_by:
local_docs: []
local_docs_sha256: []
---
# Verification: bind block-scoped locals with SET

## Scope

Card `261015-language2c13-a3-bind-block-scoped-locals-with-set` of cycle `language-2`, criteria `st-set`, `st-math`, `st-scope`, `st-null`, `st-names`, `st-single`, `st-ws`, `st-analyze`, `st-keywords`, `st-size`, `st-openapi` and `st-compat`, plus the card's must-nots (no existing test expectation changed beyond the named amendment, no runtime dependency). The rest of the cycle's must-haves belong to other cards.

Run at a clean tree: `git status --porcelain` printed nothing at commit `f4c58c65dd73b86875d4bcaeecae293f05c957a5`. Not checked: the cycle-level surfaces (README, changelog), which later cards own; the review-sweep `malicious-path`, which the cycle runs at the merge request.

## Levels

Required by the cycle: none (`verification_levels: []`, no browser scenarios, so no exploratory tester, test author or test reviewer was spawned). Required by the card: `unit` and `integration` (card `test_levels`). Run: unit (the card's gate), integration (the whole suite, which holds the golden cases and the `st-openapi` tests, per `docs/living/testing.md`), and the type check `npx tsc --noEmit -p .`.

## Evidence

All commands ran from the project directory at `f4c58c6`, by the verifier member; every result is deterministic.

- Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/set.test.ts --json` exited 0: 1 suite passed, 1727 tests passed, 0 failed.
- Whole suite: `node node_modules/jest/bin/jest.js` exited 0: 43 suites passed of 43, 12737 tests passed of 12737.
- Type check: `npx tsc --noEmit -p .` exited 0 with no output.
- Integration criterion `st-openapi`: its 3 tests ran and passed, in the group "st-openapi: the usedIn list names its kinds in a description" of `tests/language/set.test.ts` (the document has the `usedIn` schema of an analysis variable; `usedIn` is an array of strings with no enum; `usedIn` describes the kinds, `set` among them).
- Golden: `tests/promptaware/golden-render.test.ts` passed in the whole run, including "case lang-set renders to its expected file"; `tests/golden/golden.test.ts` passed.
- Test diff: `git diff --name-status 02e8dc84b5035b8a398b63d593f3ef66a3405768 HEAD -- tests` printed only `M tests/language/set.test.ts`.
- `tests/language/surfaces.test.ts`: no diff against the base; the logged amendment (BLOCK_PAIRS derived from the lexer table) was committed before the base, so no row was removed and no assertion weakened in this card's range.
- Dependencies: `git diff --name-status 02e8dc84b5035b8a398b63d593f3ef66a3405768 HEAD -- package.json package-lock.json` is empty.
- OpenAPI: `api/openapi.json` `usedIn` is `{"type": "array", "description": "The constructs that read the name: output, if, elseif, case, for, list_item, table, set (later call and input)", "items": {"type": "string"}}`; the enum is gone.
- No failures, so no files under `verification/evidence/`.

## Conformance

| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| st-set | proven | deterministic | `tests/language/set.test.ts`, 411 tests titled `st-set` passed in the gate run. |
| st-math | proven | deterministic | `tests/language/set.test.ts`, 60 tests titled `st-math` passed in the gate run. |
| st-scope | proven | deterministic | `tests/language/set.test.ts`, 258 tests titled `st-scope` passed in the gate run. |
| st-null | proven | deterministic | `tests/language/set.test.ts`, 60 tests titled `st-null` passed in the gate run. |
| st-names | proven | deterministic | `tests/language/set.test.ts`, 150 tests titled `st-names` passed in the gate run. |
| st-single | proven | deterministic | `tests/language/set.test.ts`, 73 tests titled `st-single` passed in the gate run. |
| st-ws | proven | deterministic | `tests/language/set.test.ts`, 96 tests titled `st-ws` passed in the gate run. |
| st-analyze | proven | deterministic | `tests/language/set.test.ts`, 44 tests titled `st-analyze` passed in the gate run. |
| st-keywords | proven | deterministic | `tests/language/set.test.ts`, 52 tests titled `st-keywords` passed in the gate run; `tests/language/surfaces.test.ts` (which derives its block list and `closes` entries from the lexer table) passes in the whole suite. |
| st-size | proven | deterministic | `tests/language/set.test.ts`, 128 tests titled `st-size` passed in the gate run. |
| st-openapi | proven | deterministic | `tests/language/set.test.ts`, 3 tests titled `st-openapi` (integration level) passed; the `usedIn` schema has no enum in `api/openapi.json`. |
| st-compat | proven | deterministic | Whole suite 43 of 43 suites and 12737 of 12737 tests pass; the diff against base `02e8dc8` touches only `tests/language/set.test.ts` (the card's own file), and `surfaces.test.ts` has no diff against base. |
| must-not: no runtime dependency | proven | deterministic | `package.json` and `package-lock.json` have no diff against base. |
| must-not: no existing test expectation changed | proven | deterministic | Test diff against base lists only `set.test.ts`. |
| must-not: no eval, template regex or file read | not-checked | deterministic | No test targets this on the card; the cycle's `malicious-path` sweep covers it at the merge request. |
| `tsc` type check | proven | deterministic | `npx tsc --noEmit -p .` exited 0. |

## Validation

| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| need: authors can bind and reuse block-scoped values in a template | not-checked | human-confirmed | No person has judged this; the cycle's exit check (the SEO-brief showcase template rendered through render, the CLI and the API) is a human step at close. |

## Revise

None.

## Known issues

- The frozen test file `tests/language/set.test.ts` was amended once after freeze, logged in `card.json` `test_amendments` and approved by the project lead: two astral size rows had a text before the SET that was already over their limit, so the limit and value were raised so the SET is the first thing over. The verifier did not re-derive that no assertion was weakened; the logged reason says none was.
- The per-id counts add up to 1335 of the 1727 gate tests; the other 392 tests carry no `st-*` id in their title, and the verifier did not classify them. Every criterion id has at least one passing test.
- The golden case `tests/golden/render-cases/lang-set/` was committed before the base commit, so it shows no diff; it passes inside the whole suite.

## Manual

None.
