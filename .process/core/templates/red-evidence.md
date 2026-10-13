---
summary: One line saying which card these failing tests belong to.
command: ["node", "--test", "--test-reporter=tap", "test/example.test.mjs"]
exit_status: 1
---

# Red evidence

<!-- Write this with `node core/scripts/red-evidence.mjs <projectDir> <cardId>`, not by hand. It runs the card's gate command and records one row per failing test. -->
<!-- Test is the test name from the run. Criterion is the id a criterion text starts with, and it must appear in the test name. Reason is the kind label, a colon and the first line of the failure message. Only `assertion failed` is a valid red; `timeout`, `file failed to load`, `error thrown` and `cancelled` mean the test never reached its assertion. -->

| Test | Criterion | Reason |
| --- | --- | --- |
| x-01a: the behavior the criterion promises | x-01a | assertion failed: the message the assertion carries |
