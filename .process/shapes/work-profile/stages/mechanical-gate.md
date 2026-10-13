---
id: stg-mechanical-gate
type: stage
summary: Mechanical gate: format, lint, types, secrets, dependencies
state: built
code: I09
phase: implement
form: judge
owner: build
who: agent
risk: Style debates and latent defects.
skip: audience = nobody and purpose = answer
today: exists
today-note: gate checks
links:
  - pairs-with: stg-dependency-review
---

# Mechanical gate: format, lint, types, secrets, dependencies

Let tools decide what tools can: formatting, lint, types, secrets and dependency scans, and the gate command. A person should not review what a tool can check.
