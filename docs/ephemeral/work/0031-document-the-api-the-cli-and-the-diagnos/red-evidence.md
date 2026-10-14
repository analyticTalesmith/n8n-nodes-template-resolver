---
summary: Red evidence for 0031-document-the-api-the-cli-and-the-diagnos: 6 failing tests across 1 criterion.
command: ["node","--test","--test-reporter=tap","tools/tests/headless-docs.test.mjs"]
exit_status: 1
tests_sha256: b57d063660a0
---

# Red evidence for 0031-document-the-api-the-cli-and-the-diagnos

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| dc-coverage: the README names every API route | dc-coverage | assertion failed: the README must mention every API route as "METHOD /path"; missing |
| dc-coverage: the README names every CLI subcommand | dc-coverage | assertion failed: the README must mention every CLI subcommand as "template-resolver <sub>"; missing |
| dc-coverage: the README names every diagnostic and HTTP error code | dc-coverage | assertion failed: the README must mention every diagnostic and HTTP error code; missing |
| dc-coverage: the README names each limit with its default | dc-coverage | assertion failed: the README must mention every limit name; missing |
| dc-coverage: the README documents the CLI exit codes 0, 1 and 2 | dc-coverage | assertion failed: the README must have an exit codes explanation |
| dc-coverage: the README mentions every path in api/openapi.json | dc-coverage | assertion failed: api/openapi.json must exist (delivered by the API card) |
