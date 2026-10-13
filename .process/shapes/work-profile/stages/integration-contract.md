---
id: stg-integration-contract
type: stage
summary: Integration and contract tests
state: built
code: U02
phase: up
form: judge
owner: verification
who: agent
risk: A broken boundary or public interface.
skip: blast = local
today: thin
today-note: a card level only
links:
  - pairs-with: stg-options-architecture
  - pairs-with: stg-module-design
---

# Integration and contract tests

Test the seams between modules and the public interfaces other code relies on.
