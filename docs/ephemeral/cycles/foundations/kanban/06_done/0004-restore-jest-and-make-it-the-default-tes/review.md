Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0004-restore-jest-and-make-it-the-default-tes

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T21:36:18.436Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2

Restatement: Make a clean clone pass `npm ci && npm test`. To do that, declare jest, ts-jest and @types/jest in package.json devDependencies at the ranges the lockfile root already records, and keep `jest` as the test script so the existing 446+ test suite runs green. Also add a small jest reporter that prints node:test-style TAP: a passing test is `ok`, and a failing assertion is `not ok` with a YAML block carrying `code: ERR_ASSERTION`. Later cards can then gate red-first evidence on jest tests. Do this without touching nodes/ sources or existing tests, without adding runtime dependencies, and without changing the jest roots or the n8n-workflow module mapper.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T21:38:57.034Z
- Stalled: no
- Brief mismatch: none
- Raised: none

Restatement: Make the existing 446-test jest suite the working default test command from a clean clone: declare jest, ts-jest and @types/jest in package.json devDependencies at the ranges the lockfile root already records, so that npm ci followed by npm test runs jest and passes. Also add a small jest reporter that prints node:test-style TAP, so later cards can gate red-first evidence on jest tests. In that TAP a passing test is ok, a failed assertion is not ok with code ERR_ASSERTION, a thrown non-assertion error is not ok without that code, and a test file that fails to load is a not ok entry. Do not touch nodes/ source or existing tests, do not add runtime dependencies, and do not change the jest roots or the n8n-workflow module mapper.

- Response to f1: withdraw (evidence: diff:tools/jest-tap-reporter.cjs, code:tools/jest-tap-reporter.cjs:40, code:tools/jest-tap-reporter.cjs:47, test:tr-04: a test file that fails to load is reported as a not ok entry, diff:tools/tests/test-runner-load-failure.test.mjs)

## Findings

### f1: The TAP reporter emits nothing for a test file that fails to run, so a suite that cannot load reads as '# fail 0'

- Class: goal-risk
- Status: withdrawn
- Serves: card-goal: A later card writes a red-first jest test that imports a not-yet-existing export. ts-jest reports a type error, so the file fails to run: jest sets result.testExecError and result.testResults is empty. onTestResult loops only over result.testResults and writes no line for that file. The TAP output then has no 'not ok' entry and ends '1..0 / # pass 0 / # fail 0'. Aperture, which reads this TAP, either sees no red failure or treats the run as clean. Gating cards on jest tests therefore breaks for the most common red-first shape in a TypeScript project.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1) Create a temp dir containing broken.fixture.js with the content `throw new Error('load failure'); test('x', () => {});`. 2) Run `node node_modules/jest/bin/jest.js --config '{"rootDir":"<dir>","testMatch":["**/*.fixture.js"],"testEnvironment":"node"}' --reporters tools/jest-tap-reporter.cjs`. 3) Observe that stdout is 'TAP version 13', '1..0', '# pass 0', '# fail 0', with no 'not ok' line, even though jest exits non-zero. Smallest fix: in onTestResult, when result.testExecError is set, emit a 'not ok N - <test file path>' entry with a YAML block carrying the error message (no ERR_ASSERTION code), and count it in this.fail.
- Evidence: diff:tools/jest-tap-reporter.cjs, code:tools/jest-tap-reporter.cjs:26-46, doc:docs/living/architecture/overview.md
- Review lead ruling after round 1: sustain: valid: a file that cannot load must read as a failure for red-first gating

### f2: A frozen test under tools/tests was edited (regex escape fix); the change is logged and approved but is outside files_scope

- Class: drift
- Status: filed (0014-follow-up-a-frozen-test-under-tools-test)
- Serves: m1: m1 forbids changing any existing test, and the frozen tools/tests/test-runner.test.mjs changed. The change replaces `\d` with `\\d` inside a template literal passed to new RegExp. The original pattern degraded to `^not ok d+ - `, which could never match, so tr-02 could not pass against any correct reporter. The fix is correct and minimal, and the scope exceptions log records the project lead's approval. It is noted for the lead because the path is not in the card's files_scope or manifest.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Compare the frozen test at base 2f6aef4 line 338 with the diff hunk at tools/tests/test-runner.test.mjs:51. The path appears only in the scope exceptions log, not in the manifest's files_scope.
- Evidence: diff:tools/tests/test-runner.test.mjs, test:tr-02
- Review lead ruling after round 1: drift: the test amendment is logged in card.json test_amendments and the scope exceptions; accepted
