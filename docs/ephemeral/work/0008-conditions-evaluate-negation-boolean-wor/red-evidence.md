---
summary: Red evidence for 0008-conditions-evaluate-negation-boolean-wor: 17 failing tests across 6 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/regressions/condition-operators.test.ts","--reporters=<rootDir>/tools/jest-tap-reporter.cjs"]
exit_status: 1
tests_sha256: 921105330f99
---

# Red evidence for 0008-conditions-evaluate-negation-boolean-wor

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| condition operators co-01: NOT a negates the variable | co-01 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-01: !a negates the variable | co-01 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-01: NOT (a) negates the variable | co-01 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-02: && and 'and' (any case) evaluate as AND | co-02 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-02: \|\| and 'or' (any case) evaluate as OR | co-02 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-02: lowercase not, and, or combine with AND binding tighter than OR | co-02 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-03: AND inside a quoted string does not split the condition | co-03 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-03: OR inside a quoted string does not split the condition | co-03 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-03: a real AND outside the quotes still splits | co-03 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-04: unquoted contains right-hand side is a variable | co-04 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-04: unquoted startsWith right-hand side is a variable | co-04 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-04: unquoted endsWith right-hand side is a variable | co-04 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-05: == compares numerically when both sides are numeric | co-05 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-05: != compares numerically when both sides are numeric | co-05 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-05: a missing variable equals null | co-05 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| condition operators co-06: an unknown word between operands is an error, not false | co-06 | assertion failed: Error: expect(received).toBeNull() |
| condition operators co-06: a misspelled operator is an error, not false | co-06 | assertion failed: Error: expect(received).toBeNull() |
