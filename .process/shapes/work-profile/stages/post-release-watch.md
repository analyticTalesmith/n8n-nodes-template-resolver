---
id: stg-post-release-watch
type: stage
summary: Post-release verification and watch window
state: built
code: R06
phase: release
form: learn
owner: release-ops:rollout-watcher
who: agent
risk: Silent production failure.
skip: audience = nobody
add-when: deployment in [served, store-gated]
today: absent
links:
  - pairs-with: stg-operability-design
---

# Post-release verification and watch window

Watch the agreed signals for the agreed window after release and report; the rollback trigger belongs to a person.
