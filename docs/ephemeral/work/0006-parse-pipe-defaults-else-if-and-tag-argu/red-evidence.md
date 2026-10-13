---
summary: Red evidence for 0006-parse-pipe-defaults-else-if-and-tag-argu: 15 failing tests across 4 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/regressions/parse-defaults-and-tag-arguments.test.ts","--reporters=<rootDir>/tools/jest-tap-reporter.cjs"]
exit_status: 1
tests_sha256: 6eb0526ed16e
---

# Red evidence for 0006-parse-pipe-defaults-else-if-and-tag-argu

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| parse pipe defaults, ELSE IF and tag arguments pd-01: a ?? default holding a pipe in double quotes renders literally when the value is missing | pd-01 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| parse pipe defaults, ELSE IF and tag arguments pd-01: the pipe-bearing default also renders when the variable is present but empty | pd-01 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| parse pipe defaults, ELSE IF and tag arguments pd-01: a pipe-bearing default is used in strict mode for a missing variable | pd-01 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| parse pipe defaults, ELSE IF and tag arguments pd-01: a pipe in a single-quoted default renders literally | pd-01 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| parse pipe defaults, ELSE IF and tag arguments pd-01: a present value wins over a pipe-bearing default | pd-01 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| parse pipe defaults, ELSE IF and tag arguments pd-02: a real filter after a pipe-bearing default applies to the default | pd-02 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| parse pipe defaults, ELSE IF and tag arguments pd-02: trim after a pipe-bearing default trims the default and keeps its pipe | pd-02 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| parse pipe defaults, ELSE IF and tag arguments pd-02: a filter chain after a pipe-bearing default applies in order | pd-02 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| parse pipe defaults, ELSE IF and tag arguments pd-03: ELSE IF with a condition is a syntax error that names ELSEIF | pd-03 | assertion failed: Error: expect(received).toBeNull() |
| parse pipe defaults, ELSE IF and tag arguments pd-03: ELSE IF is rejected whatever the condition values are | pd-03 | assertion failed: Error: expect(received).toBeNull() |
| parse pipe defaults, ELSE IF and tag arguments pd-03: ELSE IF in a template with a final ELSE is rejected | pd-03 | assertion failed: Error: expect(received).toMatch(expected) |
| parse pipe defaults, ELSE IF and tag arguments pd-04: END_IF with a trailing argument is a syntax error | pd-04 | assertion failed: Error: expect(received).toBeNull() |
| parse pipe defaults, ELSE IF and tag arguments pd-04: ELSE with a trailing argument is a syntax error | pd-04 | assertion failed: Error: expect(received).toBeNull() |
| parse pipe defaults, ELSE IF and tag arguments pd-04: END_FOR with a trailing argument is a syntax error | pd-04 | assertion failed: Error: expect(received).toBeNull() |
| parse pipe defaults, ELSE IF and tag arguments pd-04: END_IF with a trailing argument is rejected when the condition is false | pd-04 | assertion failed: Error: expect(received).toBeNull() |
