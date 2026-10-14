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
| t-ws-01 | pa-whitespace | standalone block-tag lines vanish; lines with text or variables and LIST and TABLE tags keep their spacing |
| t-ws-02 | pa-whitespace | trim markers on every block tag and comment |
| t-ws-03 | pa-whitespace,pa-compat | render defaults on, resolveTemplate defaults off, explicit option wins |
| t-rw-01 | pa-raw | RAW literal content, CRLF, FOR and IF, unclosed RAW |
| t-rw-02 | pa-raw | backslash before the brace pair escapes it; two backslashes do not |
| t-sc-05 | pa-section | heading, body trimming, level, spacing between sections |
| t-sc-06 | pa-section | empty section omitted with its heading, counted in stats; skip_empty false keeps it |
| t-sc-07 | pa-section | errors, depth and analyze and spec for SECTION |
| t-fe-01 | pa-fence | fence longer than any backtick run, lang, trim of one line break, filter form |
| t-ho-01 | pa-offset | heading_offset shifts, clamps, spares fenced code, errors |
| t-em-01 | pa-escape | escape_md inline unchanged, block escapes line starts, bad mode errors |
| t-sf-01 | pa-surfaces | spec lists every new block, filter and option |
| t-sf-02 | pa-no-deps | package.json still has no runtime dependencies |

## Integration

Pairs with: software design.
Depth: product default.
Approval: auto.
Status: planned.

| Test | Covers | What it proves |
|---|---|---|
| t-sf-03 | pa-surfaces | API option accepted and validated, OpenAPI document describes it |
| t-sf-04 | pa-surfaces | CLI flags, node option reaches render |
| t-sf-05 | pa-surfaces | golden cases through render with the option on and off |
| t-sf-06 | pa-surfaces | README documents each construct and the option |

## System

Pairs with: system analysis and design.
Depth: product default.
Approval: human.
Status: waived.
Reason: the CI workflow on both operating systems and the golden cases are the system-level evidence; no separate system verification is selected.

| Test | Covers | What it proves |
|---|---|---|


## Acceptance

Pairs with: requirements.
Depth: selected by the cycle.
Approval: human.
Status: waived.
Reason: the cycle selects no acceptance verification level; the close review is the human acceptance.

| Test | Covers | What it proves |
|---|---|---|
