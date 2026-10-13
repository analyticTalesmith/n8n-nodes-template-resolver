# Working test runner

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

The repository declares jest and ts-jest in jest.config.js but installs neither, so no test can run on a clean clone, and the Aperture card gate reads node:test TAP output. Add a minimal node:test runner that compiles the TypeScript sources and runs tests from test-node/, so later bug cards can prove a regression test fails first. The existing jest suite in tests/ is left alone.

## Must-haves

- `contract` `tr-01` `npm run test:node` compiles the sources and test-node tests with tsc and runs them with node:test, exiting 0 when they pass and nonzero when one fails.
- `contract` `tr-02` The runner prints node:test TAP on stdout so the card gate can read failing tests.
- `contract` `tr-03` The build output directory is ignored by git and the jest suite files are untouched.

## Must-nots

- Do not edit anything under tests/, nodes/, jest.config.js or __mocks__/.
- Do not add a dependency other than @types/node as a devDependency.

## Context links

- [Resolver cycle brief](../../CYCLE.md)

## User documentation

none

## Interface contract

none: adds a developer-facing npm script `test:node`; no public API of the node package changes.

## Scope

| Path | Permission (add, edit, remove) | Approx lines | Blast radius |
| --- | --- | --- | --- |
| scripts/run-node-tests.mjs | add | 40 | none |
| tsconfig.test.json | add | 15 | none |
| test-node/smoke.test.ts | add | 12 | none |
| scripts/run-node-tests.test.mjs | edit | 40 | none |
| package.json | edit | 3 | none |
| package-lock.json | edit | 20 | none |
| .gitignore | edit | 1 | none |
