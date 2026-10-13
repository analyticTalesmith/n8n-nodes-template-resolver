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
links:
  - pairs-with: stg-plan-approval
---

# Go or no-go, sign-off, push-ready

A person decides the work may be pushed. Never skipped for a push, because a person reviews every diff; a formal board only for critical or breaking work.
