---
id: stg-performance
type: stage
summary: Performance, load and soak
state: built
code: U07
phase: up
form: judge
owner: verification
who: agent runs, human reads
risk: Regression and failure under volume.
skip: lens lacks performance
add-when: lens has performance
today: absent
links:
  - pairs-with: stg-requirements
---

# Performance, load and soak

Measure against the numeric scenarios in a separate environment. Skip it unless a performance lens is set or a hot path is touched.
