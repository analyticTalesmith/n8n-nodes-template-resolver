---
summary: Verification of the default pipe bug card against its four criteria.
stream: ai-qa
result: pass
verdict: accept
verification_verdict: accept
validation_verdict: not-assessed
ran_against: 82c4cd4a8988b3ea184b7cd784b7015cdfffd212
tier: product
scope: card 0004-default-text-may-contain-a-pipe
level:
lens:
sweep_round:
signed_off_by:
local_docs: []
local_docs_sha256: []
---
# Verification: default text with a pipe
## Scope
Criteria dp-01 to dp-04 of card 0004, run by a fresh verifier at the card's branch head, plus two ad-hoc probes. The old jest suite could not run in the verifier's session; the project lead ran it from a copy with jest installed.
## Levels
Unit.
## Evidence
Full suite: 14 tests, 14 pass, 0 fail (node scripts/run-node-tests.mjs). Old jest suite from a copy with the current nodes/ folder: 446 of 446 pass.
## Conformance
| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| dp-01 | proven | deterministic | frozen test dp-01 passes. |
| dp-02 | proven | deterministic | frozen test dp-02 passes; probe of a single-quoted default with head=2 rendered k|. |
| dp-03 | proven | deterministic | single-quoted and guard tests pass; jest suite 446 of 446 (run by the project lead). |
| dp-04 | proven | deterministic | git diff --stat over tests, jest.config.js and __mocks__ between the base and HEAD is empty; full suite passes. |
## Validation
| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
## Revise
none
## Known issues
A quoted default holding both an escaped quote and a pipe still splits at the pipe (as before the change); filed as a backlog ticket.
## Manual
none
