---
id: kind-recover
type: kind
summary: Understand and document existing code, or audit an area against explicit standards; no product code changes.
state: built
intent: [learn, document]
purpose: answer
compatibility: none
uncertainty: unknown
reversibility: trivial
size: batch
oracle: [finding]
trigger: planned
teams: [research, architecture, product, records]
links:
  - runs: stg-appetite-stop
  - runs: stg-research-archaeology
  - runs: stg-impact-map
  - runs: stg-characterization
  - runs: stg-system-analysis
  - runs: stg-mechanical-gate
  - runs: stg-midflight-triage
  - runs: stg-docs-verification
  - runs: stg-final-review
  - runs: stg-hygiene-cleanup
---

# Recover

## How this goes

State the area and the explicit standards it is checked against. Describe what the code does as it is, with claims checked against the code, and pin behavior with characterization tests where it matters; the pinning tests are the build. Record each finding so that it can be checked: a file and line, or a command and its output, ranked. Write a fix card in the backlog for each finding worth keeping, and let the human triage every finding as kept or dropped with a reason. A vision, persona or priority found in an existing document is proposed as an ordinary planned document for the human, never recovered. No product code changes.
