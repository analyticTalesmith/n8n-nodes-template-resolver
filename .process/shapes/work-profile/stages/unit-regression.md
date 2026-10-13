---
id: stg-unit-regression
type: stage
summary: Unit run, regression selection, flake triage
state: built
code: U01
phase: up
form: judge
owner: verification
who: agent
risk: A piece that breaks its contract, and unrelated breakage.
skip: never
minimal: yes
today: thin
today-note: the card gate exits 0; no suite owner
spine: yes
links:
  - pairs-with: stg-module-design
  - pairs-with: stg-characterization
---

# Unit run, regression selection, flake triage

Run the unit tests and the regression set the module graph selects; triage any flaky test rather than rerunning until green. For a spike this is run it and write the finding.
