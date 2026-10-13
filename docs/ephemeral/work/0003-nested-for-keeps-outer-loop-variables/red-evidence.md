---
summary: Red evidence for 0003-nested-for-keeps-outer-loop-variables: 4 failing tests across 3 criteria.
command: ["node","scripts/run-node-tests.mjs",".test-build/test-node/nested-for.test.js"]
exit_status: 1
---

# Red evidence for 0003-nested-for-keeps-outer-loop-variables

Written by `node core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| nf-01 outer item, @index0 and @first resolve after an inner loop | nf-01 | assertion failed: âŒ Template Error (line 1, col 1): |
| nf-02 sibling inner loops keep the outer item between and after them | nf-02 | assertion failed: âŒ Template Error (line 1, col 1): |
| nf-02 a three-level nested loop keeps every enclosing item after the inner loops | nf-02 | assertion failed: âŒ Template Error (line 1, col 1): |
| nf-03 a TABLE row loop inside a FOR keeps the outer variable in rows and after the table | nf-03 | assertion failed: âŒ Template Error (line 1, col 1): |
