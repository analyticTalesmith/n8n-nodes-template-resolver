Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0002-working-test-runner

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T17:54:25.046Z
- Stalled: no
- Brief mismatch: The card's scope table lists scripts/run-node-tests.test.mjs as 'edit', but the packet treats that file as a frozen test and files_scope omits it. The card also lists scripts/run-node-tests.mjs as 'add' while the manifest says 'edit' (a stub existed at base). Neither affects the verdict, since the frozen test is unchanged in the diff. Separately, the goal-critical question about tsc failure has no frozen test behind it, so it can only be answered by reading the code.
- Raised: f1, f2

Restatement: Give the repository a minimal, dependency-free node:test runner so the later bug cards can prove a regression test fails first. `npm run test:node` must compile nodes/ and test-node/ with the repo's own tsc into a git-ignored build directory, then run the compiled tests with node:test and print TAP on stdout. It must exit 0 on pass, nonzero on a test failure or a tsc error, and work on a clean clone after `npm ci`. The jest suite, nodes/, jest.config.js and __mocks__/ stay untouched, and @types/node is the only new dependency.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T17:58:23.924Z
- Stalled: no
- Brief mismatch: Three minor inconsistencies, none of which blocks the review. (1) The card's Scope table lists scripts/run-node-tests.test.mjs as an edit, but the packet treats it as frozen and the manifest omits it. (2) The card lists scripts/run-node-tests.mjs as an add, while the manifest and diff show an edit of a stub. (3) c1 is worded around `npm run test:node`, but the frozen tests invoke the script directly, so the npm script wiring and the clean-clone `npm ci` path in spec.md's Goal are covered by no test and can only be judged from the diff.
- Raised: f3, f4

Restatement: Give the repository a small, dependency-free node:test runner so the two later bug cards (nested FOR losing outer variables, ?? defaults containing a pipe) can each show a regression test failing first. `npm run test:node` must compile nodes/ and test-node/ with the repo's own tsc into a git-ignored build directory, run the compiled tests with node:test, print TAP on stdout, and exit 0 on pass and nonzero on a test failure or a tsc error. It must not touch tests/, nodes/, jest.config.js or __mocks__/, and may add no dependency other than @types/node.

- Response to f1: withdraw (evidence: code:scripts/run-node-tests.mjs:20, diff:scripts/run-node-tests.mjs)

## Findings

### f1: The runner never clears .test-build, so compiled tests from deleted, renamed or other-branch sources keep running

- Class: goal-risk
- Status: withdrawn
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

### f3: package-lock.json change is one root line and looks hand-edited, so the diff does not show that `npm ci` on a clean clone installs @types/node

- Class: goal-risk
- Status: withdrawn
- Serves: card-goal: tsconfig.test.json sets "types": ["node"], so the runner depends on node_modules/@types/node being installed. The lock diff adds only the root devDependencies line: no node_modules/@types/node package entry is added or changed, against the card's estimate of about 20 lines. The lock's root block still lists @types/jest and jest, which package.json's devDependencies do not, and a real `npm install` would have rewritten that block. If the lock has no hoisted @types/node entry satisfying ^24.10.2, `npm ci` either refuses the out-of-sync lock or leaves the types missing; tsc then fails with TS2688 and every later bug card gets a nonzero exit with no TAP, so none can show a test failing first. I cannot see the rest of the lock, so this is unconfirmed; the reproduction settles it either way.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: 1. Clone head 0e1a6b4 into an empty directory with no node_modules. 2. Run `npm ci`. 3. Run `npm run test:node`. Expected: exit 0 and stdout starting 'TAP version'. The finding holds if step 2 errors on a package.json/lock mismatch, or step 3 fails with 'Cannot find type definition file for node'. It is refuted if both succeed. Smallest fix if it holds: regenerate the lock with `npm install --package-lock-only` and commit the result.
- Evidence: diff:package-lock.json, diff:package.json, diff:tsconfig.test.json, doc:spec.md
- Reply after round 2 (rebut, evidence): restate: Same lock concern as f2: the lock edit is one root line so npm ci is unproven.; verify: Round 1 ruling withdrew this; a fresh clone at head ran npm ci and the runner exited 0, and the lock has a resolved @types/node 24.10.2 entry.; evidence: code:package-lock.json:2540, doc:package.json
- Review lead ruling after round 2: withdraw: Same concern as f2, withdrawn in round 1. Lock line 2540 has resolved @types/node 24.10.2 matching ^24.10.2; fresh-clone npm ci then runner exit 0 meets the refutation condition.

### f4: With no compiled tests and no arguments, the runner calls `node --test` with no files, which falls back to default discovery and re-enters the runner

- Class: drift
- Status: filed (0005-follow-up-with-no-compiled-tests-and-no)
- Serves: card-goal: If test-node/ compiles to zero *.test.js files, `files` is empty and `node --test --test-reporter=tap` runs its default discovery from the repo root. That matches scripts/run-node-tests.test.mjs, which spawns the runner three times, recursively. It cannot happen while smoke.test.ts exists, so it is noted for the lead only; a guard exiting nonzero on an empty list would close it.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: Remove every *.test.ts under test-node/ but keep a non-test .ts file there so the directory still compiles, then run `node scripts/run-node-tests.mjs`. The runner executes scripts/run-node-tests.test.mjs instead of reporting zero tests.
- Evidence: code:scripts/run-node-tests.mjs:31, code:scripts/run-node-tests.mjs:35, test:scripts/run-node-tests.test.mjs
- Review lead ruling after round 2: drift: Finding says it cannot occur while smoke.test.ts exists; serves no criterion of the card. Noted for the lead: optional empty-list guard.
