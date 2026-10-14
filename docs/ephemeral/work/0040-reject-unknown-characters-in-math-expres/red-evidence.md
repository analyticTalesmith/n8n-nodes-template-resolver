---
summary: Red evidence for 0040-reject-unknown-characters-in-math-expres: 8 failing tests across 1 criterion.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/regressions/math-unknown-character.test.ts","--json"]
exit_status: 1
tests_sha256: 5f5abe1075c8
---

# Red evidence for 0040-reject-unknown-characters-in-math-expres

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| mh-no-hang: unknown characters in math expressions mh-no-hang: resolveTemplate terminates and reports an error for quote after plus | mh-no | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| mh-no-hang: unknown characters in math expressions mh-no-hang: resolveTemplate terminates and reports an error for single-quoted string | mh-no | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| mh-no-hang: unknown characters in math expressions mh-no-hang: resolveTemplate terminates and reports an error for non-ascii letter | mh-no | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| mh-no-hang: unknown characters in math expressions mh-no-hang: resolveTemplate terminates and reports an error for after literal text and newline | mh-no | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| mh-no-hang: unknown characters in math expressions mh-no-hang: render returns ok false with a diagnostic for quote after plus | mh-no | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| mh-no-hang: unknown characters in math expressions mh-no-hang: render returns ok false with a diagnostic for single-quoted string | mh-no | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| mh-no-hang: unknown characters in math expressions mh-no-hang: render returns ok false with a diagnostic for non-ascii letter | mh-no | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| mh-no-hang: unknown characters in math expressions mh-no-hang: render returns ok false with a diagnostic for after literal text and newline | mh-no | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
