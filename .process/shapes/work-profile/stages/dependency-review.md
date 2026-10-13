---
id: stg-dependency-review
type: stage
summary: Dependency, reuse and licence review
state: built
code: D15
phase: down
form: specify
owner: architecture
who: agent, human approves a new runtime dependency
risk: Licence trouble and abandoned libraries.
skip: manual
today: thin
today-note: native-first standard only
links:
  - pairs-with: stg-mechanical-gate
---

# Dependency, reuse and licence review

Prefer what the platform and the project already give. A new runtime dependency needs its licence, upkeep and size checked and the human approves it.
