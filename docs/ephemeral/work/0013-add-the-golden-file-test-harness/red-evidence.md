---
summary: Red evidence for 0013-add-the-golden-file-test-harness: 14 failing tests across 5 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/golden-harness.test.ts","--reporters=<rootDir>/tools/jest-tap-reporter.cjs"]
exit_status: 1
tests_sha256: c7f26165dd85
---

# Red evidence for 0013-add-the-golden-file-test-harness

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| golden-file harness gf-01: discovers every case folder in sorted order and passes on an exact match | gf-01 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-01: passes data and options from the case files to render | gf-01 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-01: the comparison is byte exact, so a missing trailing newline fails | gf-01 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-02: a mismatch fails with the case name, the 1-based line number and both lines | gf-02 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-02: the reported line is the first difference, not a later one | gf-02 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-03: expected-error.txt passes when render throws a message containing the trimmed text | gf-03 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-03: an error case fails when render does not throw | gf-03 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-03: an error case fails when the thrown message differs | gf-03 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-04: options.update rewrites expected.md with the render output and passes | gf-04 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-04: UPDATE_GOLDEN=1 updates when options.update is undefined | gf-04 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-04: without update a stale expected file is left untouched and fails | gf-04 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-04: update mode rewrites expected-error.txt with the thrown message | gf-04 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-05: the shipped suite holds at least eight cases covering the required topics | gf-05 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| golden-file harness gf-05: every shipped case passes against the real resolver | gf-05 | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
