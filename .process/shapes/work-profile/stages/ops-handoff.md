---
id: stg-ops-handoff
type: stage
summary: Operational hand-off
state: built
code: R08
phase: release
form: commit
owner: release-ops:release-lead
who: agent drafts, on-call is human only
risk: An outage with no owner.
skip: audience in [nobody, team]
add-when: deployment = served
today: thin
today-note: no owner until release-ops is installed
links:
  - pairs-with: stg-operability-design
---

# Operational hand-off

Hand the runbook and what to watch to whoever is on call.
