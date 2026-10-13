---
summary: Red evidence for 0004-default-text-may-contain-a-pipe: 4 failing tests across 3 criteria.
command: ["node","scripts/run-node-tests.mjs",".test-build/test-node/default-pipe.test.js"]
exit_status: 1
---

# Red evidence for 0004-default-text-may-contain-a-pipe

Written by `node core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| dp-01 a double-quoted default holding a pipe renders whole when the variable is missing | dp-01 | assertion failed: Unknown filter: b" |
| dp-02 a filter after a default holding a pipe still applies to the whole default | dp-02 | assertion failed: Unknown filter: b" |
| dp-03 a single-quoted default holding a pipe renders whole | dp-03 | assertion failed: Unknown filter: b' |
| dp-03 an existing value is not replaced by a default holding a pipe | dp-03 | assertion failed: Unknown filter: b" |
