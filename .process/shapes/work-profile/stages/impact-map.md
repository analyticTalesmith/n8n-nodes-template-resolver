---
id: stg-impact-map
type: stage
summary: Impact and dependency map
state: built
code: D07
phase: down
form: frame
owner: architecture
who: agent
risk: Surprise breakage.
skip: blast = local and legibility = documented or size in [trivial, card] and uncertainty = none
today: absent
today-note: only the module graph is planned
links:
  - pairs-with: stg-integration-contract
---

# Impact and dependency map

List what the change reaches: modules, callers, data and documents, from the module graph and the code.
