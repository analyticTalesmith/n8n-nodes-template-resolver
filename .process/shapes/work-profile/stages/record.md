---
id: stg-record
type: stage
summary: Record: apply deltas, index, archive
state: built
code: R12
phase: release
form: commit
owner: records
who: agent
risk: Knowledge lost when the session ends.
skip: never
minimal: yes
today: exists
today-note: records team
spine: yes
evidence-from: close-review
links:
  - pairs-with: stg-intent-profile
---

# Record: apply deltas, index, archive

Apply the cycle's deltas to the living documents, regenerate the indexes and archive the cycle. A living document is built when the delta applies and validated only when a person approves it. Nothing to add is a silent outcome.
