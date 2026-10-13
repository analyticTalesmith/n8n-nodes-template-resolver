---
id: stg-red-first-tests
type: stage
summary: Red-first tests
state: built
code: D21
phase: down
form: specify
owner: build
who: agent, a separate writer
risk: Tests shaped around the code.
skip: oracle lacks new-tests or purpose = answer
today: exists
today-note: a failing test passes the check; the reason is a convention
links:
  - pairs-with: stg-unit-regression
  - pairs-with: stg-acceptance
---

# Red-first tests

Write the failing test before the fix and run it once to record the failure. A bug is fixed at its cause, never at its symptom: reproduce, write the failing regression test, test hypotheses until the cause is found, and write the root-cause record (hypotheses, evidence, cause). Skip it when the oracle is a person, a rubric or a finding.
