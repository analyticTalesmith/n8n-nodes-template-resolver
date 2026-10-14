---
summary: The build, test and CI tooling of the repository - the jest runner, the TAP reporter that lets cards gate on jest, and the GitHub Actions workflow.
state: built
---

# Build tooling

## Purpose

The tooling that proves a clean clone installs, builds and tests, locally and in CI. Planned by the foundations cycle; not built yet.

## Responsibility

- Run the existing jest suite through `npm test`, with jest, ts-jest and @types/jest declared in `devDependencies`.
- Provide `tools/jest-tap-reporter.cjs`, a jest reporter that prints node:test-shaped TAP so a failing jest assertion can be recorded as red evidence.
- Provide `.github/workflows/ci.yml`, which runs `npm ci`, `npm run build` and `npm test` on ubuntu and windows with the current Node LTS.

## Interface

- `npm test`, `npm run build`: the commands CI and contributors run.
- The reporter is passed to jest with `--reporters`.

## Failure handling

A failing step fails the workflow; the reporter exits with jest's own exit status.

## Dependencies

jest, ts-jest, `@n8n/node-cli` for the build.
