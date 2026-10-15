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
| t-ft-text | lang-filters | each text filter gives the expected output over a table of inputs |
| t-ft-params | lang-filters | a missing or undeclared parameter of a text filter is a located type-error |
| t-ft-default | lang-filters | default replaces any value that is not truthy |
| t-fc-collection | lang-filters | join, length, first, last, slice, lines and unique over lists, texts, objects and empty input |
| t-fc-order | lang-filters | sort is stable and deterministic; unique keeps first occurrences |
| t-fc-json | lang-filters | json is stable and a cyclic value is a located type-error |
| t-ln-limit | lang-limits | maxNodes is counted at parse and reported as a located limit-nodes diagnostic |
| t-ln-elseif | lang-limits | a very long ELSEIF chain gives limit-nodes, not a RangeError |
| t-ln-analyze | lang-limits | analyze applies the caller limits or the defaults |
| t-mt-zero | lang-math | division or modulo by zero is a located type-error in render |
| t-mt-float | lang-math | arithmetic results print without binary float noise |
| t-mt-hyphen | lang-math | a hyphen between two letters is part of a name; spaced or numeric hyphens stay arithmetic |
| t-mt-lenient | lang-math | a malformed math expression fails in lenient mode too |
| t-mt-cyclic | lang-math | a cyclic value in output is a located type-error |
| t-op-in | lang-operators | in and not in over lists, variables and text |
| t-op-between | lang-operators | between is inclusive and rejects non-numeric operands |
| t-op-length | lang-operators | .length on arrays and strings, an object key named length wins |
| t-op-equality | lang-operators | a quoted literal side compares as text; a number after contains keeps its written text |
| t-op-unknown | lang-operators | an unrecognized word next to an operator is an error in every mode |
| t-op-spec | lang-operators | spec and analyze list the new operators |
| t-cs-values | lang-case | WHEN matches several values |
| t-cs-var | lang-case | WHEN compares with a variable under strict-mode rules |
| t-cs-compare | lang-case | WHEN accepts a comparison operator with a number |
| t-cs-errors | lang-case | an empty WHEN or a mixed list and comparison is a located syntax-error |
| t-cs-analyze | lang-case | analyze records WHEN variables as case usage |
| t-ld-spec | lang-surfaces | every lexer keyword, registry filter and operator is in spec() |

## Integration

Pairs with: software design.
Depth: product default.
Approval: auto.
Status: planned.

| Test | Covers | What it proves |
|---|---|---|
| t-ln-surfaces | lang-limits | the API lowers options.limits.maxNodes, the CLI takes --max-nodes and the OpenAPI Limits schema lists it |

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
