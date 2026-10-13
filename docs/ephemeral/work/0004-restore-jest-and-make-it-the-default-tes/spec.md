# Spec

Background: jest.config.js, the 446-test suite and package-lock.json entries exist; package.json devDependencies lack them (see the recovered surface map). The gate uses node:test for these tooling checks because the jest runner does not exist on the base commit; the reporter lets later cards gate on jest tests.

## Acceptance criteria

- tr-01: package.json lists jest, ts-jest and @types/jest in devDependencies, the lockfile root agrees, and the test script runs jest
- tr-02: the jest TAP reporter prints TAP where a failing assertion is a not ok test carrying code ERR_ASSERTION and a passing test is ok
- tr-03: with dependencies installed the existing suite runs through the jest binary with no failures and at least 446 passing tests
- tr-04: a test file that fails to load is reported as a not ok entry
