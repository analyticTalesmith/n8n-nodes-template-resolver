## Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a node:test runner that compiles the TypeScript and runs tests in test-node/, so the bug cards can show a failing test first.
Must not:
- change tests/, nodes/, jest.config.js or __mocks__/
- add a dependency other than @types/node

## Questions

- goal-critical: does a failing test in test-node/ produce a nonzero exit and a TAP "not ok" line?
- goal-critical: does the runner stop with a nonzero exit when tsc reports an error?
- polish: is the runner free of shell use and platform-specific paths?

## Rubric

- The runner is under 60 lines and has no dependency beyond node and typescript.
- The build output directory is git-ignored.
- The smoke test asserts a rendered string, not just that code runs.

## Design context

- README.md
