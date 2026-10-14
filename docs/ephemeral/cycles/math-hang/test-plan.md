---
summary: The tests this cycle plans at each level, and which requirement lines each one proves.
state: planned
---

# Test plan

<!-- One section per level. The lead fills Pairs with, Depth and Approval while planning down; the test writer fills the table before building starts. Each row names a test id (t- then letters, digits and hyphens), the requirement or story ids it covers, and what it proves. Covers accepts a comma list, "and", or a range such as `x-01` to `x-07`. -->
<!-- Status moves planned, red, green, or waived with a Reason line. Approval is human or auto. -->

## Unit

Pairs with: module design.
Depth: product default.
Approval: auto.
Status: planned.

| Test | Covers | What it proves |
|---|---|---|
| t-mh-01 | mh-no-hang | a quote or other unknown character in math ends tokenizing with a located diagnostic |

## Integration

Pairs with: software design.
Depth: product default.
Approval: auto.
Status: waived.
Reason: a one-line defect fix; the unit test and the close review are the evidence.

| Test | Covers | What it proves |
|---|---|---|

## System

Pairs with: system analysis and design.
Depth: product default.
Approval: human.
Status: waived.
Reason: a one-line defect fix; the unit test and the close review are the evidence.

| Test | Covers | What it proves |
|---|---|---|

## Acceptance

Pairs with: requirements.
Depth: selected by the cycle.
Approval: human.
Status: waived.
Reason: a one-line defect fix; the unit test and the close review are the evidence.

| Test | Covers | What it proves |
|---|---|---|
