---
id: stg-branch-merge
type: stage
summary: Branch model, merge strategy, queue, stacked changes
state: built
code: R01
phase: release
form: commit
owner: review
who: agent
risk: Stale branches and untested combined results.
skip: manual
today: thin
today-note: a worktree per card; no queue
links: []
---

# Branch model, merge strategy, queue, stacked changes

Merge in an order that keeps the combined result tested. With one writer, just merge.
