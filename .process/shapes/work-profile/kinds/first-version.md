---
id: kind-first-version
type: kind
summary: The first cycle of a product: an MVP to validate with users, or a greenfield first release.
state: built
intent: [add]
purpose: validate
compatibility: none
uncertainty: partly
reversibility: costly
size: program
oracle: [new-tests, person]
trigger: planned
teams: [product, ux, architecture, planning, build, review, verification, feedback]
links:
  - runs: stg-outcome-input
  - runs: stg-appetite-stop
  - runs: stg-requirements
  - runs: stg-system-analysis
  - runs: stg-options-architecture
  - runs: stg-module-design
  - runs: stg-ux-content-design
  - runs: stg-design-challenge
  - runs: stg-test-strategy
  - runs: stg-red-first-tests
  - runs: stg-docs-plan
  - runs: stg-slicing-plan
  - runs: stg-ready-check
  - runs: stg-plan-approval
  - runs: stg-work-order
  - runs: stg-workspace
  - runs: stg-flags-abstraction
  - runs: stg-mechanical-gate
  - runs: stg-cleanup
  - runs: stg-local-integration
  - runs: stg-independent-review
  - runs: stg-human-spot-check
  - runs: stg-integration-contract
  - runs: stg-system-e2e
  - runs: stg-acceptance
  - runs: stg-accessibility
  - runs: stg-exploratory
  - runs: stg-docs-verification
  - runs: stg-blind-evaluation
  - runs: stg-uat-demo
  - runs: stg-final-review
  - runs: stg-evidence-packet
  - runs: stg-go-no-go
  - runs: stg-deployment-strategy
  - runs: stg-rollout
  - runs: stg-post-release-watch
  - runs: stg-publish-notes
  - runs: stg-feedback-intake
  - runs: stg-probe when uncertainty = unknown
  - runs: stg-dependency-review when purpose = ship
  - runs: stg-privacy-legal when purpose = ship
  - runs: stg-operability-design when purpose = ship
  - runs: stg-walking-skeleton when purpose = ship
  - runs: stg-telemetry-rollback when purpose = ship
  - runs: stg-candidate-build when purpose = ship
  - runs: stg-compat-upgrade when purpose = ship
  - runs: stg-ops-handoff when purpose = ship
---

# First version

## How this goes

Start with the documents, in this order, each approved by the human before the next: goals and the people it is for (never invented; ask, cite a source or write assumption), then the stack, module architecture and core data, then features, views and interaction research, then plan and audit the work into a cycle of cards. In an area with code and no living document, research describes existing behavior from `.process/core/templates/recovered.md`; a vision, persona or priority found in an existing PRD is proposed as an ordinary planned document for the human, never recovered. A cycle that only produces the approved documents and its first cards in ready ends at plan approval; building follows in the next cycle. For an MVP the purpose is to validate with real users, and the oracle includes a person; for a greenfield first release set the purpose to ship, which adds the dependency and legal review, operability, the walking skeleton, a candidate build and the operational hand-off.
