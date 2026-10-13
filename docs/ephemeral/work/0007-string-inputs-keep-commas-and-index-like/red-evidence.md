---
summary: Red evidence for 0007-string-inputs-keep-commas-and-index-like: 9 failing tests across 4 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/regressions/string-input-coercion.test.ts","--reporters=<rootDir>/tools/jest-tap-reporter.cjs"]
exit_status: 1
tests_sha256: 9adfed2831ce
---

# Red evidence for 0007-string-inputs-keep-commas-and-index-like

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| string input coercion sc-01: object string values keep doubled commas inside strings | sc-01 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| string input coercion sc-01: object string values keep a comma before a closing brace inside a string | sc-01 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| string input coercion sc-01: object string values keep commas after an opening brace or bracket inside strings | sc-01 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| string input coercion sc-01: structural trailing commas are still repaired while string commas are kept | sc-01 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| string input coercion sc-02: array string elements keep commas inside strings | sc-02 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| string input coercion sc-02: array string element with a leading comma after a bracket is preserved | sc-02 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| string input coercion sc-03: tags.0 and tags.1 index into a comma-separated string | sc-03 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| string input coercion sc-03: indexing a comma-separated string works in IF conditions | sc-03 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| string input coercion sc-04: tags.0 and tags.1 index into a JSON array string in output | sc-04 | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
