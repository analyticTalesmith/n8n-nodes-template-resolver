# Spec

## Acceptance criteria

- rs-01: no file under core/ imports n8n-workflow, any n8n package, or a Node I/O module (fs, net, http, child_process)
- rs-02: the n8n wrapper imports the core only through core/src/index.ts, and core/src/index.ts exports resolveTemplate
- rs-03: the pre-existing test file differs from its base version only in import and mock specifier lines
- rs-04: the pre-existing suite passes with at least 446 passing tests and none failing
- rs-05: the build succeeds and every path in package.json n8n.nodes exists afterwards
