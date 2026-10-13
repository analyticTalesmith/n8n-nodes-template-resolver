---
id: stg-go-no-go
type: stage
summary: Go or no-go, sign-off, push-ready
state: built
code: U22
phase: up
form: commit
owner: verification
who: human
risk: A decision to ship that nobody owns.
skip: never
today: thin
today-note: a verdict of accept, revise or blocked
spine: yes
links:
  - pairs-with: stg-plan-approval
---

# Go or no-go, sign-off, push-ready

A person decides the work may be pushed. Required for the kinds that run it (feature, breaking change, first version, release candidate, hotfix, and a one-way restructure); for the other kinds a person reviews the diff or the pull request instead. A formal board only for critical or breaking work.
