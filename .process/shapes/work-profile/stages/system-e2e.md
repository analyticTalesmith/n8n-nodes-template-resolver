---
id: stg-system-e2e
type: stage
summary: System and end-to-end test
state: built
code: U04
phase: up
form: judge
owner: verification
who: agent
risk: Works from source and fails installed.
skip: purpose in [answer, demonstrate]
today: exists
today-note: verification levels
links:
  - pairs-with: stg-system-analysis
---

# System and end-to-end test

Run the assembled system the way a user does. Skip the browser run for an API-only change.
