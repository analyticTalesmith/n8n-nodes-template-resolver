---
id: stg-threat-model
type: stage
summary: Threat model and security design
state: built
code: D16
phase: down
form: specify
owner: planning
who: agent, human accepts residual risk
risk: Vulnerabilities designed in.
skip: lens lacks security and size in [trivial, card]
add-when: lens has security
today: thin
today-note: red-team STRIDE on request
links:
  - pairs-with: stg-security-validation
---

# Threat model and security design

Draw the trust boundaries and list threats against each, with a mitigation or an accepted risk. Skip it when there is no boundary, no sensitive data and no security lens.
