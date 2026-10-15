---
id: kind-feature
type: kind
summary: Add new behavior to existing code, planned and built as a full V.
state: built
intent: [add]
purpose: ship
compatibility: additive
uncertainty: partly
reversibility: costly
size: several
oracle: [new-tests, person]
trigger: planned
teams: [product, ux, architecture, planning, build, review, verification]
links:
  - runs: stg-outcome-input
  - runs: stg-impact-map
  - runs: stg-requirements
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
  - runs: stg-design-drift
  - runs: stg-independent-review
  - runs: stg-human-spot-check
  - runs: stg-integration-contract
  - runs: stg-system-e2e
  - runs: stg-acceptance
  - runs: stg-accessibility
  - runs: stg-exploratory
  - runs: stg-docs-verification
  - runs: stg-integrity-audit
  - runs: stg-blind-evaluation
  - runs: stg-final-review
  - runs: stg-evidence-packet
  - runs: stg-go-no-go
  - runs: stg-branch-merge
  - runs: stg-publish-notes
  - runs: stg-feedback-intake
  - runs: stg-system-analysis
  - runs: stg-options-architecture
  - runs: stg-data-migration-design when compatibility = breaking
  - runs: stg-threat-model
---

# Feature

## How this goes

A one-card feature, with size card and reversibility trivial, takes a lighter path: the cycle lists the spine, a red-first test and a blind review, and `cycle.mjs shape` says why each other stage of the full feature is dropped. Its test plan starts with the levels the cycle does not select waived, its card is made from one short form (`card-new.mjs --from-form`) that folds the spec into `card.md`, the reviewer brief is generated from the card, and the per-card verification record is optional. The red-first test, the blind review and the human gate stay.

Shaping first: the planner writes the spec with criteria and how each is verified, the test levels, the verification plan and the reviewer brief, then freezes them; the work is audited at the depth the tier sets. Each new living document the card adds is created at state `planned` (from `.process/core/templates/document.md`) and recorded by a delta of op `add`; a document the card changes keeps its state and is recorded by a delta of op `modify`, and one it removes by a delta of op `remove` (`delta.mjs add`). Then ready and in progress, a blind review with rounds, verification of the reviewed card, and the human gate. The deltas wait for the rest of the cycle: when the cycle's work merges, the docs steward applies them together, which makes each added or modified document `built`; a document becomes `validated` only through `delta.mjs validate`, after a human fills `approved_by` in the cycle's close review.
