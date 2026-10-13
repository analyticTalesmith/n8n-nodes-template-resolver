Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0002-working-test-runner

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T17:54:25.046Z
- Stalled: no
- Brief mismatch: The card's scope table lists scripts/run-node-tests.test.mjs as 'edit', but the packet treats that file as a frozen test and files_scope omits it. The card also lists scripts/run-node-tests.mjs as 'add' while the manifest says 'edit' (a stub existed at base). Neither affects the verdict, since the frozen test is unchanged in the diff. Separately, the goal-critical question about tsc failure has no frozen test behind it, so it can only be answered by reading the code.
- Raised: f1, f2

Restatement: Give the repository a minimal, dependency-free node:test runner so the later bug cards can prove a regression test fails first. `npm run test:node` must compile nodes/ and test-node/ with the repo's own tsc into a git-ignored build directory, then run the compiled tests with node:test and print TAP on stdout. It must exit 0 on pass, nonzero on a test failure or a tsc error, and work on a clean clone after `npm ci`. The jest suite, nodes/, jest.config.js and __mocks__/ stay untouched, and @types/node is the only new dependency.

## Findings

### f1: The runner never clears .test-build, so compiled tests from deleted, renamed or other-branch sources keep running

- Class: goal-risk
- Status: fixed
- Serves: cycle-goal: The two bug cards each need a 'fails first, then passes' reading from this runner. A compiled test left in .test-build/test-node/ by one card's branch still runs after the .ts source is renamed, deleted or absent on another branch, because findTests walks whatever .test.js is on disk and tsc never removes orphaned output. The gate then reads a 'not ok' and a nonzero exit (or an extra 'ok') for a test that does not exist in the tree under test.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. Add test-node/tmp.test.ts containing a failing test. 2. Run npm run test:node; it exits nonzero as expected. 3. Delete test-node/tmp.test.ts. 4. Run npm run test:node again. tsc succeeds, but .test-build/test-node/tmp.test.js is still found and run, so stdout has 'not ok' and the exit is nonzero although every test in the source tree passes.
- Evidence: code:scripts/run-node-tests.mjs:10, code:scripts/run-node-tests.mjs:20, code:scripts/run-node-tests.mjs:29, diff:scripts/run-node-tests.mjs, doc:spec.md
- Reply after round 1 (fixed): restate: The runner kept stale compiled tests in .test-build after sources were deleted.; verify: Added rmSync of .test-build before the tsc compile; reran the repro and only the live smoke test runs.; evidence: code:scripts/run-node-tests.mjs:11

### f2: package-lock.json looks hand-edited: one root line added, no resolved @types/node entry in the diff, so npm ci on a clean clone is unproven

- Class: goal-risk
- Status: withdrawn
- Serves: card-goal: The spec goal is a developer running npm run test:node on a clean clone after npm ci. The lock diff adds only the root devDependencies line for @types/node@^24.10.2 and no packages entry; the card expected about 20 lines. The root lock entry also still lists @types/jest and jest, which the package.json hunk does not show, and an npm-regenerated lock would have dropped them. If the lock has no node_modules/@types/node entry satisfying ^24.10.2, npm ci fails as out of sync; if @types/node is not installed at the root, tsc fails on types:["node"] and no test can run. I cannot see the rest of the lock, so this is a risk to confirm, not a proven failure.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. Fresh clone at head 51e95a8. 2. Run npm ci. The finding holds if npm ci reports a missing or invalid @types/node from the lock file. 3. If it passes, run npm run test:node and check that node_modules/@types/node exists at 24.x and tsc reports no TS2688. The finding is refuted if both succeed.
- Evidence: diff:package-lock.json, diff:package.json, diff:tsconfig.test.json, doc:spec.md, doc:card.md
- Reply after round 1 (rebut, evidence): restate: package-lock.json may be hand-edited so npm ci on a clean clone is unproven.; verify: A fresh clone at head ran npm ci, then the runner exited 0; the lock already pinned @types/node 24.10.2 so only the root devDependencies line was needed.; evidence: code:package-lock.json:14
- Review lead ruling after round 1: withdraw: Lock already has a resolved @types/node 24.10.2 entry (line 2540) matching package.json; fresh-clone npm ci then runner exit 0 meets the finding's refutation condition.
