---
id: stg-compat-upgrade
type: stage
summary: Compatibility, upgrade, migration and data validation
state: built
code: U06
phase: up
form: judge
owner: verification
who: agent
risk: Old state that breaks under new code.
skip: manual
today: absent
links:
  - pairs-with: stg-data-migration-design
---

# Compatibility, upgrade, migration and data validation

Start from the previous version and its data, upgrade, and check it still works. Skip it when nothing is stored and the support matrix is unchanged.
