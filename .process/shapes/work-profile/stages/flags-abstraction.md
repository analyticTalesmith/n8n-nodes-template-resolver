---
id: stg-flags-abstraction
type: stage
summary: Flags and branch by abstraction
state: built
code: I05
phase: implement
form: make
owner: build
who: agent
risk: Long branches and flags that never die.
skip: audience in [nobody, team] and reversibility != one-way and blast = local
today: absent
links:
  - pairs-with: stg-data-migration-design
---

# Flags and branch by abstraction

Ship in small steps behind a flag or an abstraction so unfinished work can merge safely, and remove the flag afterwards.
