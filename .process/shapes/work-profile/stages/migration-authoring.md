---
id: stg-migration-authoring
type: stage
summary: Migration authoring
state: built
code: I06
phase: implement
form: make
owner: build
who: agent, human approves
risk: One-way data loss.
skip: manual
today: absent
links:
  - pairs-with: stg-data-migration-design
---

# Migration authoring

Write the migration and its undo, and try both on a copy. Skip it unless the work touches stored data.
