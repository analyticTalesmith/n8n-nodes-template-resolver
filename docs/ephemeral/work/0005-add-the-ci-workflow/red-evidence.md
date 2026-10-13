---
summary: Red evidence for 0005-add-the-ci-workflow: 4 failing tests across 4 criteria.
command: ["node","--test","--test-reporter=tap","tools/tests/ci.test.mjs"]
exit_status: 1
tests_sha256: ce72ce55cc19
---

# Red evidence for 0005-add-the-ci-workflow

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| ci-01: runs on push to main and pull_request, on ubuntu-latest and windows-latest with lts/* | ci-01 | assertion failed: .github/workflows/ci.yml must exist |
| ci-02: runs npm ci, npm run build and npm test in that order | ci-02 | assertion failed: .github/workflows/ci.yml must exist |
| ci-03: .gitignore does not ignore .github and git does not ignore the workflow | ci-03 | assertion failed: .gitignore must have no line ignoring .github |
| ci-04: npm run build exits 0 and writes every node entry listed in package.json n8n.nodes | ci-04 | assertion failed: node_modules/.bin must exist (run npm ci) |
