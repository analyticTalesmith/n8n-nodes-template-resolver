---
id: kind-spike
type: kind
summary: Answer one feasibility question cheaply before anyone commits to building.
state: built
intent: [learn]
purpose: answer
compatibility: none
uncertainty: unknown
reversibility: trivial
size: card
oracle: [finding]
trigger: planned
teams: [architecture, research]
links:
  - runs: stg-appetite-stop
  - runs: stg-workspace
  - runs: stg-midflight-triage
---

# Spike

## How this goes

One question, in one sentence, with a time box; if it is not one sentence, split it first. Run a throwaway probe in scratch space that is never merged, then write the findings: the question, the sources, what was found and how confident you are. A spike never ships code and never writes a recovered document; its findings go in a research note. A person promotes the finding into cards or a decision record, or discards it, and the probe is deleted either way.
