---
id: stg-module-design
type: stage
summary: Module and interface design
state: built
code: D12
phase: down
form: specify
owner: architecture
who: agent
risk: Mismatched seams between modules.
skip: intent in [document, learn] or size in [trivial, card] and uncertainty = none
today: exists
today-note: contract-writer
links:
  - pairs-with: stg-unit-regression
  - pairs-with: stg-integration-contract
---

# Module and interface design

State the public surface each module adds or changes, as signatures, shapes or boundaries, with a contract test in mind. Light for a fix.
