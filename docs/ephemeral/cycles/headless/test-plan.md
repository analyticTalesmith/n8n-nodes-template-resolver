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
| t-rr-01 | hl-result | render returns ok, output, messages, stats and diagnostics and never throws |
| t-rr-02 | hl-result | validate, spec and analyze (required, blocks) shapes |
| t-rr-03 | hl-result | the estimator default and the tokenEstimator hook |
| t-dg-01 | hl-locations | syntax, type, missing-variable and unknown-filter diagnostics carry the node line and column |
| t-dg-02 | hl-locations | math and filter-parameter errors carry the node location, not 1:1 |
| t-lm-01 | hl-limits | iterations, output size and depth limits each produce their diagnostic |
| t-lm-02 | hl-limits | defaults apply and a lower limit is honoured |
| t-nd-01 | hl-node | the node writes output to the configured field and reports a failure with its location |
| t-cl-01 | hl-cli | render, validate, analyze and spec read files and stdin and exit 0, 1 or 2 as documented |
| t-cl-02 | hl-cli | usage errors and conflicting stdin inputs |
| t-nd-02 | hl-no-deps | package.json dependencies stay empty and api and cli import only node modules |

## Integration

Pairs with: software design.
Depth: product default.
Approval: auto.
Status: planned.

| Test | Covers | What it proves |
|---|---|---|
| t-ap-01 | hl-api | each route returns its documented body for a valid request |
| t-ap-02 | hl-api | 400, 404, 405, 413 and 415 errors are JSON with the documented codes |
| t-ap-03 | hl-api | request limits only lower the server limits |
| t-oa-01 | hl-openapi | served document equals the committed file and its paths equal the router table |

## System

Pairs with: system analysis and design.
Depth: product default.
Approval: human.
Status: planned.

| Test | Covers | What it proves |
|---|---|---|
| t-e2-01 | hl-e2e | the server on an ephemeral port answers every route over real HTTP |

## Acceptance

Pairs with: requirements.
Depth: selected by the cycle.
Approval: human.
Status: waived.
Reason: the cycle selects no acceptance verification level; the close review is the human acceptance.

