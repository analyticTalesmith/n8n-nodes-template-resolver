---
summary: Verification of the raw block card against its six criteria.
stream: ai-qa
result: mixed
verdict: accept
verification_verdict: accept
validation_verdict: not-assessed
ran_against: 2ff020665b635a13afbcea77e7e471556e5d5ebb
tier: product
scope: card 0007-raw-block-outputs-its-text-literally
level:
lens:
sweep_round:
signed_off_by:
local_docs: []
local_docs_sha256: []
---
# Verification: raw block
## Scope
Criteria rb-01 to rb-06 of the raw block card, run by a fresh verifier at the card's branch head; the old jest suite and two git reads were run by the project lead because the verifier's session refused them.
## Levels
Unit and integration.
## Evidence
Full node:test suite: 28 of 28 pass (node scripts/run-node-tests.mjs). Old jest suite from a copy with the current nodes/ folder: 446 of 446 pass. Verifier report is kept outside the repository.
## Conformance
| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
| rb-01 | proven | deterministic | unit and render tests pass; the variable detection tests pass; the probe printed the README example output. |
| rb-02 | proven | deterministic | FOR body and untaken IF branch tests pass, plus a multi-line block inside IF. |
| rb-03 | proven | deterministic | whitespace and CRLF tests pass at lexer and render level. |
| rb-04 | proven | deterministic | the unclosed RAW test passes; position tests after a multi-line block pass. |
| rb-05 | proven | deterministic | jest suite 446 of 446 and node:test suite 28 of 28; the diff over tests, jest.config.js and __mocks__ from the base to HEAD is empty (run by the project lead). |
| rb-06 | not-checked | agent-observed | the README example's printed output equals the compiled resolver output; a person has not confirmed the example, so this row stays open for the human. |
## Validation
| Id | State | Tier | Evidence or reason |
| --- | --- | --- | --- |
## Revise
none
## Known issues
Two follow-up tickets: the closing tag does not accept a newline inside the braces, and variable detection strips RAW text at text level so a RAW spelling inside a comment could hide a real variable from strict mode.
## Manual
Person to confirm the README RAW example (rb-06).
