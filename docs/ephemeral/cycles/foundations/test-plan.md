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
| t-tr-01 | fd-clean-install | the manifest and lockfile agree on the jest devDependencies and the test script runs jest |
| t-tr-02 | fd-clean-install | the jest TAP reporter prints node:test-shaped TAP so a jest failure is readable as red evidence |
| t-tr-03 | fd-clean-install | the existing jest suite runs through the jest binary with no failures and at least 446 passing tests |
| t-ci-01 | fd-ci | the workflow triggers and runs on a ubuntu and windows matrix with Node LTS |
| t-ci-02 | fd-ci | the workflow installs, builds and tests in that order |
| t-ci-03 | fd-ci | git does not ignore the workflow file |
| t-ci-04 | fd-ci | the build script succeeds and writes the node entry |
| t-nf-01 | fd-tier0 | nested FOR keeps the outer item variable |
| t-nf-02 | fd-tier0 | nested FOR keeps outer index metadata |
| t-nf-03 | fd-tier0 | inner loop metadata is its own and the outer is restored |
| t-nf-04 | fd-tier0 | FOR inside TABLE keeps the outer loop |
| t-pd-01 | fd-tier0 | a pipe in a ?? default is literal |
| t-pd-02 | fd-tier0 | a pipe default then a filter still filters |
| t-pd-03 | fd-tier0 | ELSE IF is rejected naming ELSEIF |
| t-pd-04 | fd-tier0 | END and ELSE tags with arguments are rejected |
| t-co-01 | fd-tier0 | NOT a, !a and NOT (a) negate |
| t-co-02 | fd-tier0 | &&, ||, and, or work as AND and OR |
| t-co-03 | fd-tier0 | AND inside a quoted string does not split |
| t-co-04 | fd-tier0 | contains right side unquoted is a variable |
| t-co-05 | fd-tier0 | == and != compare numerically |
| t-co-06 | fd-tier0 | an unknown word next to an operator errors |
| t-sc-01 | fd-tier0 | JSON object repair keeps commas inside strings |
| t-sc-02 | fd-tier0 | JSON array repair keeps commas inside strings |
| t-sc-03 | fd-tier0 | index into comma-separated string input |
| t-sc-04 | fd-tier0 | index into JSON array string input |
| t-tc-01 | fd-tier0 | pipe in a table cell is escaped |
| t-tc-02 | fd-tier0 | newline in a table cell is flattened |
| t-tc-03 | fd-tier0 | FOR rows and header cells are escaped too |
| t-rs-01 | fd-core-pure | core imports nothing from n8n and no I/O module |
| t-rs-02 | fd-no-behavior-change | n8n imports core only through its entry |
| t-rs-03 | fd-no-behavior-change | existing tests changed only in import lines |
| t-rs-04 | fd-no-behavior-change | existing suite passes with at least 446 tests |
| t-rs-05 | fd-no-behavior-change | build succeeds after the move |
| t-an-01 | fd-analyze | variables found in every tag kind |
| t-an-02 | fd-analyze | operands on both sides of operators found |
| t-an-03 | fd-analyze | loop variables and operator words are not inputs |
| t-an-04 | fd-analyze | ?? default makes a variable optional |
| t-an-05 | fd-analyze | filters listed and unknown ones diagnosed |
| t-an-06 | fd-analyze | strict mode accepts FOR item names |
| t-an-07 | fd-analyze | regex detection removed |
| t-gf-01 | fd-golden | harness discovers and matches cases |
| t-gf-02 | fd-golden | mismatch names the case and line |
| t-gf-03 | fd-golden | expected-error cases |
| t-gf-04 | fd-golden | UPDATE_GOLDEN rewrites |
| t-gf-05 | fd-golden | at least eight shipped cases pass |

## Integration

Pairs with: software design.
Depth: product default.
Approval: auto.
Status: waived.
Reason: the restructure changes no module behavior; the pre-existing 446-test suite is the oracle and runs unchanged apart from import paths (see the restructure card's criteria).

## System

Pairs with: system analysis and design.
Depth: product default.
Approval: human.
Status: waived.
Reason: the system-level check is the CI workflow itself running on both operating systems; the cycle selects no separate system verification.

## Acceptance

Pairs with: requirements.
Depth: selected by the cycle.
Approval: human.
Status: waived.
Reason: the cycle selects no acceptance verification level; the close review is the human acceptance.
