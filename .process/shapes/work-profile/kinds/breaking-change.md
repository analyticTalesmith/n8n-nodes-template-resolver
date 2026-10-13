---
id: kind-breaking-change
type: kind
summary: A major version, a removal or a deprecation: existing users are affected and must be told and helped.
state: built
intent: [change, remove]
purpose: ship
compatibility: breaking
uncertainty: partly
reversibility: one-way
size: program
oracle: [new-tests, person]
trigger: planned
teams: [product, ux, architecture, research, planning, build, review, verification, feedback, records]
links:
  - runs: stg-outcome-input
  - runs: stg-appetite-stop
  - runs: stg-impact-map
  - runs: stg-requirements
  - runs: stg-system-analysis
  - runs: stg-options-architecture
  - runs: stg-module-design
  - runs: stg-data-migration-design
  - runs: stg-dependency-review
  - runs: stg-design-challenge
  - runs: stg-operability-design
  - runs: stg-test-strategy
  - runs: stg-red-first-tests
  - runs: stg-docs-plan
  - runs: stg-slicing-plan
  - runs: stg-ready-check
  - runs: stg-plan-approval
  - runs: stg-work-order
  - runs: stg-flags-abstraction
  - runs: stg-migration-authoring
  - runs: stg-telemetry-rollback
  - runs: stg-cleanup
  - runs: stg-local-integration
  - runs: stg-design-drift
  - runs: stg-independent-review
  - runs: stg-human-spot-check
  - runs: stg-integration-contract
  - runs: stg-candidate-build
  - runs: stg-system-e2e
  - runs: stg-acceptance
  - runs: stg-compat-upgrade
  - runs: stg-accessibility
  - runs: stg-exploratory
  - runs: stg-docs-verification
  - runs: stg-blind-evaluation
  - runs: stg-rollback-rehearsal
  - runs: stg-uat-demo
  - runs: stg-final-review
  - runs: stg-evidence-packet
  - runs: stg-go-no-go
  - runs: stg-branch-merge
  - runs: stg-staging-smoke
  - runs: stg-deployment-strategy
  - runs: stg-rollout
  - runs: stg-post-release-watch
  - runs: stg-publish-notes
  - runs: stg-deprecation-eol
  - runs: stg-retrospective
---

# Breaking change

## How this goes

The heavy end of the V, because the change cannot be quietly undone. Find everyone who depends on what changes (the impact map), decide the migration and the period where old and new both work, and have the plan challenged independently before approval. A removal gives notice first and removes a cycle later. The work ends with an upgrade check from the previous version and its data, a rehearsal of the undo, a go or no-go from a person and release notes that say what to do instead. A single deprecation is this kind with a smaller size, and the rest of the stages follow the skip rules.
