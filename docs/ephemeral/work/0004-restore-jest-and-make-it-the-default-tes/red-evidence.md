---
summary: Red evidence for 0004-restore-jest-and-make-it-the-default-tes: 3 failing tests across 3 criteria.
command: ["node","--test","--test-reporter=tap","tools/tests/test-runner.test.mjs"]
exit_status: 1
tests_sha256: 477b3b48d4a4
---

# Red evidence for 0004-restore-jest-and-make-it-the-default-tes

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| tr-01: package.json and the lockfile root declare jest, ts-jest and @types/jest, and test runs jest | tr-01 | assertion failed: package.json devDependencies must list jest |
| tr-02: the jest TAP reporter prints ok, not ok with code ERR_ASSERTION, and no assertion code for thrown errors | tr-02 | assertion failed: tools/jest-tap-reporter.cjs must exist |
| tr-03: the existing suite passes through the jest binary with at least 446 passing tests | tr-03 | assertion failed: node_modules/jest/bin/jest.js must exist (run npm ci) |
