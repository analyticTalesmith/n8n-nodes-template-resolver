---
id: stg-deployment-strategy
type: stage
summary: Deployment strategy selection
state: built
code: R04
phase: release
form: specify
owner: release-ops:release-lead
who: agent, human for critical work
risk: Exposure out of proportion to the blast radius.
skip: deployment != served
add-when: deployment = served
today: absent
links:
  - pairs-with: stg-operability-design
---

# Deployment strategy selection

Choose how it goes out (all at once, staged, behind a flag) to match what it could break.
