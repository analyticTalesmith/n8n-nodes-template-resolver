---
summary: Red evidence for 0010-nested-for-keeps-outer-loop-variables: 10 failing tests across 4 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/regressions/nested-for.test.ts","--reporters=<rootDir>/tools/jest-tap-reporter.cjs"]
exit_status: 1
tests_sha256: 47d13a982c8f
---

# Red evidence for 0010-nested-for-keeps-outer-loop-variables

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| nested FOR keeps outer loop variables nf-01: the outer item variable still resolves after an inner FOR ends | nf-01 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| nested FOR keeps outer loop variables nf-01: the outer item still resolves after two sequential inner FORs | nf-01 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| nested FOR keeps outer loop variables nf-01: three levels deep, every enclosing item still resolves | nf-01 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| nested FOR keeps outer loop variables nf-02: outer @index0, @index1, @first and @last are the outer values after an inner FOR | nf-02 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| nested FOR keeps outer loop variables nf-02: IF @last takes the outer branch after an inner FOR | nf-02 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| nested FOR keeps outer loop variables nf-02: @notFirst and @notLast are also the outer values after an inner FOR | nf-02 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| nested FOR keeps outer loop variables nf-03: inside the inner FOR the metadata describes the inner loop and the outer index follows it | nf-03 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| nested FOR keeps outer loop variables nf-03: the outer metadata is restored when the inner FOR ends | nf-03 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| nested FOR keeps outer loop variables nf-03: an inner loop of a different length does not leak its @last or @notLast | nf-03 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| nested FOR keeps outer loop variables nf-04: a FOR inside a TABLE does not clear the enclosing loop variables | nf-04 | assertion failed: Error: expect(received).toMatch(expected) |
