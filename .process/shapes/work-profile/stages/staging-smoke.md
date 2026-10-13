---
id: stg-staging-smoke
type: stage
summary: Staging integration and pre-production smoke
state: built
code: R02
phase: release
form: judge
owner: verification
who: agent
risk: A deployed artifact that is not alive.
skip: intent = document or purpose = answer
today: absent
links:
  - pairs-with: stg-system-e2e
---

# Staging integration and pre-production smoke

Deploy to a staging place and check that it starts and answers.
