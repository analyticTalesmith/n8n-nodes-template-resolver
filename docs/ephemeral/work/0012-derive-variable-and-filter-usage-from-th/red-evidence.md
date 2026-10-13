---
summary: Red evidence for 0012-derive-variable-and-filter-usage-from-th: 26 failing tests across 7 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/analyze.test.ts","--reporters=<rootDir>/tools/jest-tap-reporter.cjs"]
exit_status: 1
tests_sha256: a2bc9e4500de
---

# Red evidence for 0012-derive-variable-and-filter-usage-from-th

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| analyze: variable and filter usage an-01: output tags report the root name, full path and the output construct | an-01 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-01: IF, ELSEIF and CASE subjects are reported with their construct | an-01 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-01: a FOR source is reported as for | an-01 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-01: a LIST_ITEM condition is reported as list_item | an-01 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-01: table cells are reported as table | an-01 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-01: the same variable used in two constructs lists both, distinct | an-01 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-02: both operands of AND and OR are reported | an-02 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-02: both sides of a comparison are reported | an-02 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-02: the right side of contains is reported | an-02 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-02: a literal right-hand side is not a variable | an-02 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-03: FOR item variables are not inputs, in the body or with a path | an-03 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-03: @-metadata is not an input | an-03 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-03: the word NOT is never a variable | an-03 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-03: a FOR item name used only outside its loop is still an input | an-03 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-04: a variable with a ?? default is optional | an-04 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-04: a variable with one guarded and one unguarded use is not optional | an-04 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-04: a variable without a default is not optional | an-04 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-04: strict mode accepts an unmapped variable that has a ?? default | an-04 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-04: strict mode still rejects an unmapped variable without a default | an-04 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-05: every filter used is listed with its name | an-05 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-05: a filter used twice has count 2 | an-05 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-05: an unknown filter is reported as a diagnostic naming it | an-05 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-06: strict mode does not reject a template whose only unmapped name is a FOR item | an-06 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-06: strict mode still names a genuinely unmapped loop source | an-06 | assertion failed: Error: expect(received).not.toBeNull() |
| analyze: variable and filter usage an-07: core/src contains no extractAllVariables | an-07 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| analyze: variable and filter usage an-07: core does not export extractAllVariables | an-07 | assertion failed: Error: expect(received).not.toBeNull() |
