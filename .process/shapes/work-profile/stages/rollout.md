---
id: stg-rollout
type: stage
summary: Rollout or distribution, store submission
state: built
code: R05
phase: release
form: commit
owner: release-ops:release-lead
who: agent runs, human can halt
risk: Failing for the whole population, or a store rejection.
skip: audience in [nobody, team] or deployment in [none, library]
add-when: deployment in [served, store-gated]
today: absent
links:
  - pairs-with: stg-deployment-strategy
---

# Rollout or distribution, store submission

Run the rollout plan in steps and let a person halt it. Store-gated work carries a kill switch.
