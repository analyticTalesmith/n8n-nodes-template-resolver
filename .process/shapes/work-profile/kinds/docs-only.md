---
id: kind-docs-only
type: kind
summary: Write or correct documents with no product code change.
state: built
intent: [document]
purpose: ship
compatibility: none
uncertainty: none
reversibility: trivial
size: card
oracle: [person, rubric]
trigger: planned
teams: [records, product, review]
links:
  - runs: stg-docs-plan
  - runs: stg-mechanical-gate
  - runs: stg-cleanup
  - runs: stg-docs-verification
  - runs: stg-final-review
  - runs: stg-publish-notes
---

# Docs only

## How this goes

Check each claim against the code or the running product before it is written, follow the steps a reader would, and have a person approve public text. A living document changes only by a delta and becomes built when the delta applies; a person validates it. No product code changes.
