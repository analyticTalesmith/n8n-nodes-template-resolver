---
id: kind-release-candidate
type: kind
summary: Bundle fixes, and for a minor release additions, into one candidate and prove it before it ships.
state: built
intent: [correct, add]
purpose: ship
compatibility: additive
uncertainty: none
reversibility: costly
size: batch
oracle: [new-tests]
trigger: planned
teams: [build, review, verification, records]
links:
  - runs: stg-test-strategy
  - runs: stg-slicing-plan
  - runs: stg-workspace
  - runs: stg-mechanical-gate
  - runs: stg-local-integration
  - runs: stg-independent-review
  - runs: stg-integration-contract
  - runs: stg-candidate-build
  - runs: stg-system-e2e
  - runs: stg-acceptance
  - runs: stg-integrity-audit
  - runs: stg-final-review
  - runs: stg-evidence-packet
  - runs: stg-go-no-go
  - runs: stg-branch-merge
  - runs: stg-staging-smoke
  - runs: stg-deployment-strategy
  - runs: stg-rollout
  - runs: stg-post-release-watch
  - runs: stg-publish-notes
  - runs: stg-requirements when compatibility = additive
  - runs: stg-module-design when compatibility = additive
  - runs: stg-docs-plan when compatibility = additive
  - runs: stg-flags-abstraction when compatibility = additive
  - runs: stg-compat-upgrade when compatibility = additive
  - runs: stg-accessibility when compatibility = additive
  - runs: stg-exploratory when compatibility = additive
  - runs: stg-docs-verification when compatibility = additive
  - runs: stg-deprecation-eol when compatibility = additive
---

# Release candidate (patch or minor)

## How this goes

A patch release is the fixes of one period built, tested and shipped together; a minor release adds new behavior that must not change what existing users rely on. Each fix or addition goes through its own kind first. This cycle then builds one candidate, tests that exact build at the integration, system and acceptance levels, assembles an evidence packet (what was required against what was run, verdicts, known issues, documents touched) and asks a person for the go or no-go. Setting the compatibility effect to additive adds the stages a minor release needs (requirements, interface design, a documentation plan, upgrade and compatibility checks, an exploratory session and a user-document check); a patch with no compatibility effect leaves them out.
