---
id: stg-design-drift
type: stage
summary: Design-drift check
state: built
code: I12
phase: implement
form: judge
owner: planning
who: agent, human approves an amendment
risk: Living documents that lie and requirements that quietly drop.
skip: purpose = answer
today: absent
links:
  - pairs-with: stg-requirements
  - pairs-with: stg-module-design
---

# Design-drift check

Compare what was built with the plan and the living documents. A drift goes up as an amendment the owner approves; a living document changes only by a delta.
