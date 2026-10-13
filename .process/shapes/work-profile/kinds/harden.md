---
id: kind-harden
type: kind
summary: Improve one quality (security, performance, accessibility) of existing behavior, against a number or a rubric.
state: built
intent: [harden]
purpose: ship
compatibility: preserved
uncertainty: partly
reversibility: trivial
size: several
oracle: [metric, rubric]
trigger: planned
teams: [architecture, ux, build, verification]
links:
  - runs: stg-characterization
  - runs: stg-requirements
  - runs: stg-test-strategy
  - runs: stg-workspace
  - runs: stg-quality-lens-checks
  - runs: stg-mechanical-gate
  - runs: stg-cleanup
  - runs: stg-local-integration
  - runs: stg-exploratory
  - runs: stg-docs-verification
  - runs: stg-integrity-audit
  - runs: stg-final-review
  - runs: stg-ux-content-design when lens has accessibility
  - runs: stg-docs-plan when lens has accessibility
  - runs: stg-performance when lens has performance
  - runs: stg-accessibility when lens has accessibility
  - runs: stg-visual-regression when lens has accessibility
  - runs: stg-threat-model when lens has security
  - runs: stg-design-challenge when lens has security
  - runs: stg-security-validation when lens has security
---

# Harden

## How this goes

Pick the lens (security, performance, accessibility; set it with --set lens=...) and write the measure before any change: a number for performance, a rubric for accessibility, the threat model for security. Pin the current behavior, change toward the measure in small steps, and prove it against the same measure in an environment that can tell the difference. Performance and accessibility are one kind with different lenses, not two kinds.
