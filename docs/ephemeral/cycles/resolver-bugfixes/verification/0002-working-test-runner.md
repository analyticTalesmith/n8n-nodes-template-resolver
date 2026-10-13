---
summary: Verification of the working test runner card against its three criteria.
stream: ai-qa
result: pass
verdict: accept
verification_verdict: accept
validation_verdict: not-assessed
ran_against: a05355437e8c46229556c8a23fee1d1067f517c2
tier: product
scope: card 0002-working-test-runner
level:
lens:
sweep_round:
signed_off_by:
local_docs: []
local_docs_sha256: []
---
# Verification: working test runner
## Scope
Criteria tr-01 to tr-03 of card 0002. A fresh verifier ran the runner and the card gate; two read-only git checks the verifier could not run were run by the project lead.
## Levels
Unit.
## Evidence
Verifier report saved outside the repository; commands and results are in the table.
## Conformance
| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| tr-01 | proven | deterministic | node scripts/run-node-tests.mjs exited 0 with 1 passing smoke test; with a failing compiled test file passed as an argument it exited 1 with "not ok". |
| tr-01 (tsc failure path) | proven | llm-judged | code read of scripts/run-node-tests.mjs: exits with the tsc status before any test runs; not run. |
| tr-02 | proven | deterministic | output starts with TAP version 13. |
| tr-03 | proven | deterministic | git check-ignore reports .test-build/ ignored; git diff --stat a84943d HEAD over tests, nodes, jest.config.js and __mocks__ is empty (run by the project lead). |
## Validation
| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
## Revise
none
## Known issues
The tsc-failure path has no automated test.
## Manual
none
