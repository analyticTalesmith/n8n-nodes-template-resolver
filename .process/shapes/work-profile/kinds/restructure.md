---
id: kind-restructure
type: kind
summary: Change the structure, dependencies or platform without changing what users see: refactor, tech debt, dependency upgrade, migration.
state: built
intent: [restructure, adapt]
purpose: ship
compatibility: preserved
uncertainty: partly
reversibility: costly
size: several
oracle: [existing-tests, new-tests]
trigger: planned
teams: [architecture, build, review, verification]
links:
  - runs: stg-impact-map
  - runs: stg-characterization
  - runs: stg-test-strategy
  - runs: stg-workspace
  - runs: stg-mechanical-gate
  - runs: stg-cleanup
  - runs: stg-local-integration
  - runs: stg-design-drift
  - runs: stg-independent-review
  - runs: stg-integration-contract
  - runs: stg-integrity-audit
  - runs: stg-final-review
  - runs: stg-hygiene-cleanup
  - runs: stg-dependency-review when intent has adapt
  - runs: stg-compat-upgrade when intent has adapt
  - runs: stg-security-validation when intent has adapt
  - runs: stg-branch-merge when intent has adapt
  - runs: stg-staging-smoke when intent has adapt
  - runs: stg-research-archaeology when reversibility = one-way
  - runs: stg-data-migration-design when reversibility = one-way
  - runs: stg-design-challenge when reversibility = one-way
  - runs: stg-operability-design when reversibility = one-way
  - runs: stg-slicing-plan when reversibility = one-way
  - runs: stg-ready-check when reversibility = one-way
  - runs: stg-plan-approval when reversibility = one-way
  - runs: stg-work-order when reversibility = one-way
  - runs: stg-migration-authoring when reversibility = one-way
  - runs: stg-telemetry-rollback when reversibility = one-way
  - runs: stg-candidate-build when reversibility = one-way
  - runs: stg-rollback-rehearsal when reversibility = one-way
  - runs: stg-evidence-packet when reversibility = one-way
  - runs: stg-go-no-go when reversibility = one-way
  - runs: stg-deployment-strategy when reversibility = one-way
  - runs: stg-rollout when reversibility = one-way
  - runs: stg-post-release-watch when reversibility = one-way
  - runs: stg-retrospective when reversibility = one-way
---

# Restructure

## How this goes

The oracle is that behavior is preserved, so pin the current behavior with characterization tests first and keep them as regression tests afterwards. Change structure in small steps that each keep the tests green. A refactor and a tech-debt cycle are the same work chosen for different reasons; record the reason as a tag on the backlog item, not as a different kind. A dependency upgrade (intent adapt) adds the dependency review, upgrade checks and a security pass; a data or platform migration (reversibility one-way) adds the migration design, an undo rehearsal, staged rollout and a watch window.
