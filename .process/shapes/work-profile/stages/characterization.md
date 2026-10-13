---
id: stg-characterization
type: stage
summary: Characterization and baseline
state: built
code: D08
phase: down
form: specify
owner: build
who: agent
risk: No oracle for behavior preserved.
skip: manual
today: absent
links:
  - pairs-with: stg-unit-regression
---

# Characterization and baseline

Pin what the code does today with tests before changing it, so the existing behavior is the oracle. Skip it for a new product or where strong tests already cover the area.
