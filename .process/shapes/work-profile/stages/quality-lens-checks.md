---
id: stg-quality-lens-checks
type: stage
summary: Build-time quality checks
state: built
code: I08
phase: implement
form: judge
owner: build
who: agent
risk: Late discovery of security, performance or accessibility problems.
skip: lens lacks security and lens lacks performance and lens lacks accessibility
add-when: lens has security or lens has performance or lens has accessibility
today: thin
today-note: front-end checks
links:
  - pairs-with: stg-threat-model
  - pairs-with: stg-requirements
---

# Build-time quality checks

Run the checks for the quality lenses the cycle sets while building, not only at the end.
