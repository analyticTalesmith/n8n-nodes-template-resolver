---
summary: Red evidence for 0007-raw-block-outputs-its-text-literally: 6 failing tests across 4 criteria.
command: ["node","scripts/run-node-tests.mjs",".test-build/test-node/raw-block.test.js"]
exit_status: 1
---

# Red evidence for 0007-raw-block-outputs-its-text-literally

Written by `node core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| rb-01 a RAW block lexes to one literal Text token | rb-01 | assertion failed: âŒ Template Error (line 1, col 1): |
| rb-01 a RAW block renders its content literally with no variables | rb-01 | assertion failed: âŒ Template Error (line 1, col 1): |
| rb-02 a RAW block in a FOR body appears once per iteration | rb-02 | assertion failed: âŒ Template Error (line 1, col 16): |
| rb-02 a RAW block in an untaken IF branch does not appear | rb-02 | assertion failed: âŒ Template Error (line 1, col 9): |
| rb-03 RAW keeps leading and trailing spaces and turns CRLF into LF | rb-03 | assertion failed: âŒ Template Error (line 1, col 1): |
| rb-04 an unclosed RAW block throws a SyntaxError at the RAW tag position | rb-04 | assertion failed: the message says the block is Unclosed |
