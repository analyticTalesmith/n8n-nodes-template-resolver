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
| t-fr-01 | lang-filters | one registry: a definition added to the table is seen by render, spec and analyze; spec exposes no function |
| t-fr-02 | lang-filters,lang-compat | filters take and return values and every existing output is unchanged |
| t-fr-03 | lang-filters | quote-aware arguments parsed at parse time; an undeclared parameter is a located type-error |
| t-fr-04 | lang-filters | an unterminated quote in a default never swallows later filters |
| t-fr-05 | lang-filters | the text and collection filter groups exist and are included in the registry |
| t-later-math | lang-math | tests of a later card of the cycle plan, not written in this trial; rows are placeholders so the plan covers every contract line |
| t-later-operators | lang-operators | tests of a later card of the cycle plan, not written in this trial; rows are placeholders so the plan covers every contract line |
| t-later-case | lang-case | tests of a later card of the cycle plan, not written in this trial; rows are placeholders so the plan covers every contract line |
| t-later-for | lang-for | tests of a later card of the cycle plan, not written in this trial; rows are placeholders so the plan covers every contract line |
| t-later-children | lang-children | tests of a later card of the cycle plan, not written in this trial; rows are placeholders so the plan covers every contract line |
| t-later-set | lang-set | tests of a later card of the cycle plan, not written in this trial; rows are placeholders so the plan covers every contract line |
| t-later-inputs | lang-inputs | tests of a later card of the cycle plan, not written in this trial; rows are placeholders so the plan covers every contract line |
| t-later-macros | lang-macros | tests of a later card of the cycle plan, not written in this trial; rows are placeholders so the plan covers every contract line |
| t-later-limits | lang-limits | tests of a later card of the cycle plan, not written in this trial; rows are placeholders so the plan covers every contract line |
| t-later-surfaces | lang-surfaces | tests of a later card of the cycle plan, not written in this trial; rows are placeholders so the plan covers every contract line |

## Integration

Pairs with: software design.
Depth: product default.
Approval: auto.
Status: waived.
Reason: the filter registry card changes one module (template-resolver) and no boundary; the API and CLI suites run unchanged as regression.

| Test | Covers | What it proves |
|---|---|---|

## System

Pairs with: system analysis and design.
Depth: product default.
Approval: human.
Status: waived.
Reason: this cycle does not select the system level.

| Test | Covers | What it proves |
|---|---|---|

## Acceptance

Pairs with: requirements.
Depth: selected by the cycle.
Approval: human.
Status: waived.
Reason: this cycle does not select the acceptance level.

| Test | Covers | What it proves |
|---|---|---|
