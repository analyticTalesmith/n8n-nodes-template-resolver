---
summary: Card 261015-language2c13-a4 (define and call macros) conforms to all thirteen criteria; gate, whole suite and tsc are green at 7359778.
stream: acceptance-test
result: pass
verdict: accept
verification_verdict: accept
validation_verdict: not-assessed
ran_against: 73597789321f81e49eeb1cd37add6596e2939fe1
tier: product
scope: card 261015-language2c13-a4-define-and-call-macros
level:
lens:
sweep_round:
signed_off_by:
local_docs: []
local_docs_sha256: []
---
# Verification: define and call macros

## Scope

Card `261015-language2c13-a4-define-and-call-macros` of cycle `language-2`, criteria `mc-define`, `mc-call`, `mc-link`, `mc-scope`, `mc-depth`, `mc-iterations`, `mc-output`, `mc-locate`, `mc-names`, `mc-ws`, `mc-analyze`, `mc-spec` and `mc-compat`, plus the card's must-nots (no existing test expectation changed beyond the named amendment, no runtime dependency). The rest of the cycle's must-haves belong to other cards.

Run at a clean tree: `git status --porcelain` printed nothing at commit `73597789321f81e49eeb1cd37add6596e2939fe1` (after `git checkout -- .claude/telemetry/events.jsonl`). Not checked: the cycle-level surfaces (README, changelog), which later cards own; the review-sweep `malicious-path`, which the cycle runs at the merge request.

## Levels

Required by the cycle: none (`verification_levels: []`, no browser scenarios, so no exploratory tester, test author or test reviewer was spawned). Required by the card: `unit` (card `test_levels`). Run: unit (the card's gate), the whole suite (which holds the golden cases, the integration level in `docs/living/testing.md`), and the type check `npx tsc --noEmit -p .`.

## Evidence

All commands ran from the project directory at `7359778`, by the verifier member; every result is deterministic.

- Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/macros.test.ts --json` exited 0: 1 suite passed, 3896 tests passed, 0 failed.
- Whole suite: `node node_modules/jest/bin/jest.js` exited 0: 44 suites passed of 44, 16636 tests passed of 16636.
- Type check: `npx tsc --noEmit -p .` exited 0, no errors.
- Golden: `tests/promptaware/golden-render.test.ts` and `tests/golden/golden.test.ts` passed in the whole run; the `lang-macro` golden case ran alone (`-t lang-macro`) and passed.
- Derived surfaces: `tests/language/surfaces.test.ts` passed in the whole run with no diff against base.
- Test diff: `git diff --name-status c96d1a74c954729614be4395dc582c4deecf58ea HEAD -- tests` printed `M tests/language/macros.test.ts` and `M tests/language/set.test.ts`.
- `tests/language/set.test.ts` diff against base is one line: in the `st-keywords` row "the derived block table keeps today's rows and adds SET with no closer", the expected map gains `["DEFINE", "END_DEFINE"]` and `["CALL", undefined]`. This is the logged, approved amendment; no row removed, no assertion weakened.
- `tests/language/macros.test.ts`: two commits after the freeze (`80d8669`, `86d19de`) removed 0 lines (`^-[^-]` count 0 across their patches); they are the two logged review amendments that only append rows.
- Dependencies: `git diff` of `package.json` and `package-lock.json` against base is empty.
- `api/openapi.json` and `tests/promptaware/section.test.ts`: no diff against base; nothing under `api/` changed.
- Source diff against base touches `core/src/analyze.ts`, `errors.ts`, `interpreter.ts`, `lexer.ts`, `parser.ts`, `render.ts`, `spec.ts`, `types.ts`, `whitespace.ts` and adds `core/src/macros.ts`, all in the card's manifest.
- No failures, so no files under `verification/evidence/`.

## Conformance

| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| mc-define | proven | deterministic | `tests/language/macros.test.ts`, 569 tests titled `mc-define` passed in the gate run. |
| mc-call | proven | deterministic | `tests/language/macros.test.ts`, 447 tests titled `mc-call` passed in the gate run. |
| mc-link | proven | deterministic | `tests/language/macros.test.ts`, 335 tests titled `mc-link` passed in the gate run. |
| mc-scope | proven | deterministic | `tests/language/macros.test.ts`, 228 tests titled `mc-scope` passed in the gate run. |
| mc-depth | proven | deterministic | `tests/language/macros.test.ts`, 558 tests titled `mc-depth` passed in the gate run. |
| mc-iterations | proven | deterministic | `tests/language/macros.test.ts`, 99 tests titled `mc-iterations` passed in the gate run. |
| mc-output | proven | deterministic | `tests/language/macros.test.ts`, 326 tests titled `mc-output` passed in the gate run. |
| mc-locate | proven | deterministic | `tests/language/macros.test.ts`, 110 tests titled `mc-locate` passed in the gate run. |
| mc-names | proven | deterministic | `tests/language/macros.test.ts`, 280 tests titled `mc-names` passed in the gate run. |
| mc-ws | proven | deterministic | `tests/language/macros.test.ts`, 200 tests titled `mc-ws` passed in the gate run. |
| mc-analyze | proven | deterministic | `tests/language/macros.test.ts`, 77 tests titled `mc-analyze` passed in the gate run; `tests/promptaware/section.test.ts` (hand-built analysis literals) passes unedited in the whole suite. |
| mc-spec | proven | deterministic | `tests/language/macros.test.ts`, 13 tests titled `mc-spec` passed; `tests/language/surfaces.test.ts` passes without edits in the whole suite. |
| mc-compat | proven | deterministic | Whole suite 44 of 44 suites and 16636 of 16636 tests pass; the test diff against base lists only the card's own `macros.test.ts` and the one-line logged amendment in `set.test.ts`. |
| must-not: no runtime dependency | proven | deterministic | `package.json` and `package-lock.json` have no diff against base. |
| must-not: no existing test expectation changed | proven | deterministic | Only the logged `st-keywords` row differs in `set.test.ts`; no other existing test file changed. |
| must-not: no eval, template regex or file read | not-checked | deterministic | No test targets this on the card; the cycle's `malicious-path` sweep covers it at the merge request. |
| must-not: no lenient pass for unknown name or bad argument | proven | deterministic | Covered by the `mc-link` (every mode) and `mc-call` (missing path argument is `null` only as the criterion states) tests, which passed. |
| `tsc` type check | proven | deterministic | `npx tsc --noEmit -p .` exited 0. |

## Validation

| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| need: authors can define a reusable block once and call it with arguments | not-checked | human-confirmed | No person has judged this; the cycle's exit check (the SEO-brief showcase template rendered through render, the CLI and the API) is a human step at close. |

## Revise

None.

## Known issues

- The frozen test file `tests/language/macros.test.ts` was amended twice after freeze, logged in `card.json` `test_amendments` and approved by the project lead (review round 1: rows for a DEFINE inside a ROW or HEADER, trimming bodies under the output check, LIST and TABLE output under it; review round 2: rows for the legacy TABLE-FOR text-row output check). The verifier confirmed the two commits only added lines; it did not re-judge the rows.
- `tests/language/set.test.ts` carries one logged amendment (the `st-keywords` keyword-table row lists DEFINE and CALL).
- The per-id counts add up to 3242 of the 3896 gate tests; the other 654 tests carry no `mc-*` id in their title, and the verifier did not classify them. Every criterion id has at least one passing test.
- The golden case `tests/golden/render-cases/lang-macro/` was committed before the base commit, so it shows no diff; it passes inside the whole suite and alone.

## Manual

None.
