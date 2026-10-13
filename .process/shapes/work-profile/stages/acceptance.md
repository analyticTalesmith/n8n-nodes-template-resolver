---
id: stg-acceptance
type: stage
summary: Acceptance test
state: built
code: U05
phase: up
form: judge
owner: verification
who: agent runs, human owns the scenarios
risk: Meets no scenario.
skip: oracle lacks person and oracle lacks rubric
today: thin
today-note: the acceptance scenarios are not linked to levels
links:
  - pairs-with: stg-requirements
---

# Acceptance test

Run each acceptance scenario the product owner approved. Skip it when a failing test alone is the oracle.
