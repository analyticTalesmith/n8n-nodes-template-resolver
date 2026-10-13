---
id: stg-data-migration-design
type: stage
summary: Data, migration and coexistence design
state: built
code: D14
phase: down
form: specify
owner: architecture
who: agent, human approves
risk: Irreversible loss and big-bang cutover.
skip: manual
add-when: compatibility = breaking
today: thin
today-note: no expand-and-contract guidance
links:
  - pairs-with: stg-compat-upgrade
---

# Data, migration and coexistence design

Plan how stored data and old users move to the new shape, with a period where both work, and how it is undone. Skip it when nothing is stored and nothing depends on it.
