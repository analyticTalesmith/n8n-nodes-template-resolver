---
summary: Verification of the nested loop bug card against its four criteria.
stream: ai-qa
result: pass
verdict: accept
verification_verdict: accept
validation_verdict: not-assessed
ran_against: ba400e0dd56a783f07deafada4c062983de95dde
tier: product
scope: card 0003-nested-for-keeps-outer-loop-variables
level:
lens:
sweep_round:
signed_off_by:
local_docs: []
local_docs_sha256: []
---
# Verification: nested loop variables
## Scope
Criteria nf-01 to nf-04 of card 0003, run by a fresh verifier against the card's branch head, plus one ad-hoc probe that a single loop renders as before.
## Levels
Unit.
## Evidence
Full suite: 5 tests, 5 pass, 0 fail (node scripts/run-node-tests.mjs). Verifier report is kept outside the repository.
## Conformance
| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| nf-01 | proven | deterministic | frozen test nf-01 passes in the full run. |
| nf-02 | proven | deterministic | the sibling-loop and three-level tests pass in the full run. |
| nf-03 | proven | deterministic | the table row loop test passes in the full run. |
| nf-04 | proven | deterministic | git diff --stat over tests, jest.config.js and __mocks__ between the base and HEAD is empty; the suite passes 5 of 5. |
## Validation
| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
## Revise
none
## Known issues
The throwing-body restore path is claimed by the code but has no test.
## Manual
none
