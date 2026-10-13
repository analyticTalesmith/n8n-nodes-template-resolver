---
id: kind-hotfix
type: kind
summary: Stop harm in a released product first, then find the cause and make sure it cannot quietly return.
state: built
intent: [correct]
purpose: ship
compatibility: preserved
uncertainty: none
reversibility: costly
size: trivial
oracle: [new-tests]
trigger: reactive
teams: [build, review, verification]
links:
  - runs: stg-operability-design
  - runs: stg-red-first-tests
  - runs: stg-workspace
  - runs: stg-mechanical-gate
  - runs: stg-independent-review
  - runs: stg-candidate-build
  - runs: stg-integrity-audit
  - runs: stg-rollback-rehearsal
  - runs: stg-go-no-go
  - runs: stg-branch-merge
  - runs: stg-rollout
  - runs: stg-post-release-watch
  - runs: stg-hotfix-backport
  - runs: stg-retrospective
  - runs: stg-threat-model when lens has security
  - runs: stg-design-challenge when lens has security
  - runs: stg-quality-lens-checks when lens has security
  - runs: stg-security-validation when lens has security
  - runs: stg-publish-notes when lens has security
---

# Hotfix

## How this goes

Mitigate or roll back first: either a fix at the incident's tier, or a revert prepared on a branch for a person to merge; agents never touch main. Then write the root-cause note, add the regression test that failed first, and verify the system healthy by the check the note names. Write a blameless learning note and put follow-up work in the backlog as tickets; cleanup is ticketed, not done in the hotfix. A security fix is this kind with the security lens set, which adds the threat model, an independent challenge, abuse-path validation and a notice to users. If data may have been exposed, open a security card too.
