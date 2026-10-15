---
summary: How this project tests: the stack, the command for each level, where results appear, who revises what and what green means.
scope: project
---

# How we test here

## Stack

TypeScript, jest with ts-jest (`jest.config.js`, tests under `tests/`, one file per concern). No other test runner.

## Commands

- unit: `node node_modules/jest/bin/jest.js --runTestsByPath <test files> --json` for a card's own files; the whole suite is `node node_modules/jest/bin/jest.js` (about 10 seconds).
- integration: the same runner; the API and CLI tests in `tests/headless/` and the golden cases in `tests/golden/` and `tests/promptaware/golden-render.test.ts` are the integration level.

## Where results appear

The terminal; `--json` prints the report the red-evidence and gate checks read.

## Who revises what

Code failures go to the build implementer with the root-cause skill. A failing command never goes to a reviewer.

## What green means

Every command for the card's selected levels exits 0 and the whole suite passes at the card branch tip.
