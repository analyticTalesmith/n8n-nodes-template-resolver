# Spec: working test runner

## Goal

A developer runs `npm run test:node` on a clean clone after `npm ci` and gets node:test TAP output for tests in `test-node/`.

## Scope

In: a runner script, a test tsconfig, one smoke test, a package.json script, an @types/node devDependency, an ignore line. Out: converting or deleting the jest suite, CI, lint.

## Boundaries

- Always: compile with the repo's own typescript; keep the runner dependency-free apart from node and typescript.
- Ask first: adding any other dependency.
- Never: touch tests/, nodes/, jest.config.js.

## Contract and constraints

- contract: `node scripts/run-node-tests.mjs` runs `tsc -p tsconfig.test.json` into `.test-build/`, then `node --test --test-reporter=tap` over the compiled `test-node/**/*.test.js`, and exits with the test run's status. A tsc failure exits nonzero before any test runs.
- constraint: the runner works without a shell (spawn with argv) and on Windows and POSIX.

## Change manifest

Add scripts/run-node-tests.mjs, tsconfig.test.json (commonjs, includes nodes/ and test-node/, outDir .test-build), test-node/smoke.test.ts (renders one template through the lexer, parser and interpreter). Edit package.json (script test:node, devDependency @types/node), package-lock.json, .gitignore (.test-build/).

## Acceptance criteria

- tr-01 `node scripts/run-node-tests.mjs` exits 0 with the smoke test passing, and exits nonzero when given a failing compiled test file as an argument.
- tr-02 stdout starts with `TAP version`.
- tr-03 `git status` shows no `.test-build` after a run; `git diff --stat` shows no change under tests/ or nodes/.

## Runner interface

`node scripts/run-node-tests.mjs [testFile...]`: compiles with tsc first; with no arguments it runs every `.test-build/test-node/**/*.test.js`; with arguments it runs exactly those files. Exit status is the test run's, or nonzero when tsc fails.
