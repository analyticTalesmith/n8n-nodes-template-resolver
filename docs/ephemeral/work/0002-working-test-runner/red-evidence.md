---
summary: Red evidence for 0002-working-test-runner: 3 failing tests across 2 criteria.
command: ["node","--test","--test-reporter=tap","scripts/run-node-tests.test.mjs"]
exit_status: 1
---

# Red evidence for 0002-working-test-runner

Written by `node core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| tr-01 exits 0 and reports the smoke test passing when run with no arguments | tr-01 | assertion failed: runner should run at least one compiled test and report it as passing |
| tr-01 exits nonzero when given a failing test file | tr-01 | assertion failed: runner should exit nonzero when a given test file fails |
| tr-02 stdout starts with TAP version | tr-02 | assertion failed: stdout should begin with "TAP version"; got: "" |
