---
id: stg-midflight-triage
type: stage
summary: Mid-flight triage and stop conditions
state: built
code: I13
phase: implement
form: frame
owner: build
who: agent detects, human decides
risk: Scope creep and runaway loops.
skip: manual
today: thin
today-note: the ticket route and the review cap
links:
  - pairs-with: stg-appetite-stop
---

# Mid-flight triage and stop conditions

When something outside the task turns up, file it as a ticket instead of fixing it. When a stop rule trips, stop and ask. An empty result is valid; it is never a form.
