---
id: stg-operability-design
type: stage
summary: Operability and readiness design
state: built
code: D19
phase: down
form: specify
owner: architecture
who: agent, human approves
risk: An outage nobody can see or undo.
skip: deployment = none or purpose != ship
add-when: deployment in [served, store-gated, customer-run] and purpose = ship
today: absent
links:
  - pairs-with: stg-rollback-rehearsal
  - pairs-with: stg-post-release-watch
---

# Operability and readiness design

Decide what is logged, measured and alerted, and how the change is turned off or rolled back, before it ships.
