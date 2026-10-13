---
id: stg-test-quality-review
type: stage
summary: Test quality review
state: built
code: U13
phase: up
form: judge
owner: verification
who: agent
risk: Tautological and over-mocked tests.
skip: manual
today: absent
today-note: the test reviewer is planned
links:
  - pairs-with: stg-red-first-tests
---

# Test quality review

A reader who sees only the plan and the tests asks what check broken code would still pass. Always run it when an agent wrote both the tests and the code.
