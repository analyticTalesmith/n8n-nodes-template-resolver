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
| t-raw-literal | rb-01 | lexer output for RAW text with tags, variables, comment markers and braces is one Text token with the text unchanged |
| t-raw-whitespace | rb-03 | spaces and newlines inside RAW stay and CRLF becomes LF |
| t-raw-unclosed | rb-04 | an unclosed RAW throws a SyntaxError at line 1 column 2 |

## Integration

Pairs with: software design.
Depth: product default.
Approval: auto.
Status: planned.

| Test | Covers | What it proves |
|---|---|---|
| t-raw-render-loop | rb-02 | resolveTemplate repeats a RAW block per FOR iteration and skips it in an untaken IF branch |

## System

Pairs with: system analysis and design.
Depth: product default.
Approval: human.
Status: waived.
Reason: no new external interface; resolveTemplate keeps its signature and the node file is untouched.

| Test | Covers | What it proves |
|---|---|---|

## Acceptance

Pairs with: requirements.
Depth: selected by the cycle.
Approval: human.
Status: waived.
Reason: the acceptance check is a person reading the README example, recorded in the close review.

| Test | Covers | What it proves |
|---|---|---|
