---
id: kind-bug-fix
type: kind
summary: Repair a known, reproducible defect at its cause, with a failing test first.
state: built
intent: [correct]
purpose: ship
compatibility: preserved
uncertainty: none
reversibility: trivial
size: card
oracle: [new-tests]
trigger: reactive
teams: [build, review]
links:
  - runs: stg-research-archaeology
  - runs: stg-test-strategy
  - runs: stg-red-first-tests
  - runs: stg-workspace
  - runs: stg-mechanical-gate
  - runs: stg-cleanup
  - runs: stg-midflight-triage
  - runs: stg-independent-review
  - runs: stg-integrity-audit
  - runs: stg-final-review
  - runs: stg-branch-merge
---

# Bug fix

## How this goes

A bug is fixed at its cause, never at its symptom, and the method is the `root-cause` skill (`.claude/skills/root-cause/SKILL.md`). The investigation comes before the card is ready. Reproduce the failure, write the failing regression test and run it once to record the failure, test hypotheses until the cause is found, and write the short root-cause record from `.process/core/templates/root-cause.md` (hypotheses tried, evidence, cause); `red-evidence.mjs` runs the gate command of the card once and writes the log, which is generated and never written by hand. Then make the smallest change that fixes that cause and nothing else, and have it reviewed against one question: does the change fix the cause the record names, or does it hide the symptom? A bug fix needs no document beyond the failing test and the root-cause record. If the defect turns out to be a wrong specification, it becomes a feature or a change.
