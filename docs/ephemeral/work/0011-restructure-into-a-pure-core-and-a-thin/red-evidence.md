---
summary: Red evidence for 0011-restructure-into-a-pure-core-and-a-thin: 5 failing tests across 5 criteria.
command: ["node","--test","--test-reporter=tap","tools/tests/restructure.test.mjs"]
exit_status: 1
tests_sha256: f930a75225fa
---

# Red evidence for 0011-restructure-into-a-pure-core-and-a-thin

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| rs-01: no .ts file under core/ imports n8n-workflow, an n8n package, or fs, net, http, https, child_process | rs-01 | assertion failed: core/ must exist |
| rs-02: n8n/ imports the core only through core/src or core/src/index, and core/src/index.ts exports resolveTemplate | rs-02 | assertion failed: core/src/index.ts must exist |
| rs-03: tests/TemplateResolver.node.test.ts differs from its base version only in import and mock specifier lines | rs-03 | assertion failed: the test file must import from a path containing core/src or n8n/ |
| rs-04: the pre-existing suite passes with at least 446 passing tests and none failing | rs-04 | assertion failed: core/src/index.ts must exist |
| rs-05: the build succeeds and every package.json n8n.nodes path exists under dist/n8n/ | rs-05 | assertion failed: dist/nodes/TemplateResolver/TemplateResolver.node.js must start with dist/n8n/ |
