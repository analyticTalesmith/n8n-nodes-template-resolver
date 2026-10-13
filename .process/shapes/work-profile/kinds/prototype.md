---
id: kind-prototype
type: kind
summary: Build something people can try, to learn whether it is right before building it properly.
state: built
intent: [add]
purpose: demonstrate
compatibility: none
uncertainty: partly
reversibility: trivial
size: several
oracle: [person]
trigger: planned
teams: [ux, build, feedback]
links:
  - runs: stg-outcome-input
  - runs: stg-appetite-stop
  - runs: stg-ux-content-design
  - runs: stg-workspace
  - runs: stg-mechanical-gate
  - runs: stg-midflight-triage
  - runs: stg-human-spot-check
  - runs: stg-exploratory
  - runs: stg-uat-demo
---

# Prototype

## How this goes

Build only what must exist for someone to try the idea, with a thin set of documents, and put it in front of the people it is for early. The oracle is a person: record what they said, not a pass rate. A prototype is thrown away or rebuilt, not promoted; if it becomes the product, re-open the cycle with the purpose changed to ship, treat the existing code as known but undocumented, and run the stages that purpose now requires.
