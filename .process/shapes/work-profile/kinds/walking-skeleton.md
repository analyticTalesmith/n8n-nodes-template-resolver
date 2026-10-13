---
id: kind-walking-skeleton
type: kind
summary: Build the thinnest end-to-end path through every layer to prove the structure before adding depth.
state: built
intent: [add]
purpose: prove-structure
compatibility: none
uncertainty: partly
reversibility: costly
size: card
oracle: [new-tests]
trigger: planned
teams: [architecture, planning, build, verification]
links:
  - runs: stg-options-architecture
  - runs: stg-module-design
  - runs: stg-operability-design
  - runs: stg-test-strategy
  - runs: stg-slicing-plan
  - runs: stg-plan-approval
  - runs: stg-work-order
  - runs: stg-workspace
  - runs: stg-walking-skeleton
  - runs: stg-flags-abstraction
  - runs: stg-mechanical-gate
  - runs: stg-local-integration
  - runs: stg-design-drift
  - runs: stg-integration-contract
  - runs: stg-candidate-build
  - runs: stg-system-e2e
  - runs: stg-final-review
  - runs: stg-evidence-packet
  - runs: stg-branch-merge
  - runs: stg-staging-smoke
---

# Walking skeleton

## How this goes

A walking skeleton differs from a prototype and from a feature in purpose and in its stages: its purpose is to prove the structure, and the thing kept is the structure itself. Choose the architecture, build the smallest path that touches every layer and integration surface (a request in, stored, and out), deploy it somewhere real and test it end to end. Everything after is added to that skeleton in vertical slices. Any value can be overridden, so a skeleton that also has to ship is the same kind with the purpose changed.
