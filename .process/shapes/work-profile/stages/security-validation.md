---
id: stg-security-validation
type: stage
summary: Security and abuse-path validation
state: built
code: U11
phase: up
form: judge
owner: verification
who: agent, human for critical work
risk: Hostile input and untested unhappy paths.
skip: risk = low and lens lacks security
add-when: lens has security
today: thin
today-note: sweeps over the merged diff
links:
  - pairs-with: stg-threat-model
---

# Security and abuse-path validation

Try the unhappy and malicious paths against the threat model.
