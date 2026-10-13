Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0013-add-the-golden-file-test-harness

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T22:01:05.170Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2

Restatement: Add a reusable golden-file harness, tests/golden/harness.ts exporting runGoldenCases(casesDir, render, options), that walks every case folder under tests/golden/cases/ in sorted order, feeds template.md, data.json and optional options.json to an injected render function, and compares the output byte for byte with expected.md, or checks that the thrown message contains the trimmed expected-error.txt. A failure names the case and shows the first differing line. UPDATE_GOLDEN=1 or options.update rewrites the expected files instead of failing. Ship at least eight plain-file cases that pass against the real resolver, covering IF/ELSEIF, CASE, nested FOR, LIST, TABLE, filters, ?? defaults and an error. Do not edit existing test bodies or add runtime dependencies. This serves the cycle goal that golden-file tests exist and that a clean clone tests green in CI.

## Findings

### f1: Byte-exact expected.md fixtures have no line-ending pin, so they fail on the windows-latest CI runner

- Class: goal-risk
- Status: sustained
- Serves: cycle-goal: CI runs the matrix on ubuntu-latest and windows-latest. The repo has no .gitattributes, and GitHub's Windows runners check out with core.autocrlf=true. So expected.md files arrive with CRLF. The lexer normalizes \r\n to \n in the template, so the rendered output has LF, and the byte-exact compare in harness.ts fails every multi-line case. The result is that tests/golden/golden.test.ts and the gf-05 frozen test go red on Windows, which breaks 'a clean clone ... tests green in CI' and c5.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. On a Windows machine with git config core.autocrlf=true, which is the default on GitHub windows-latest, clone the repo at head 2f88efb. 2. Run npm ci, npm run build, npm test. 3. Expect cases such as if-elseif-else and list-nested-conditional to fail with 'output differs from expected.md at line 1' and an expected line ending in \r. Smallest fix: add tests/golden/.gitattributes with '* -text' or 'cases/** text eol=lf', which is inside the card's tests/golden/ files scope (log the scope addition).
- Evidence: code:.github/workflows/ci.yml:13, code:tests/golden/harness.ts:983, doc:docs/living/architecture/modules/template-resolver.md, diff:tests/golden/cases/list-nested-conditional/expected.md
- Review lead ruling after round 1: sustain: valid: fix it

### f2: UPDATE_GOLDEN=1 fails, or leaves two expected files, when a case flips between output and error

- Class: goal-risk
- Status: sustained
- Serves: c4: A case that has only expected.md and now throws: in update mode wantsError is false and thrown is not null, so the harness returns 'render threw' as a failure instead of writing expected-error.txt. A case that has only expected-error.txt and now renders: update writes expected.md but keeps the stale expected-error.txt. The folder then holds two expected files, which the gf-05 shape check rejects, and the next run without update fails because wantsError is true and the render succeeds.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: 1. Create case x with template.md 'T' and expected.md 'old'. Call runGoldenCases(dir, () => { throw new Error('boom') }, { update: true }). The result is passed=false with 'render threw', and no expected-error.txt is written. 2. Create case y with only expected-error.txt 'e'. Call runGoldenCases(dir, t => t, { update: true }). It passes, but y now has both expected.md and expected-error.txt. Running again without update fails with 'but render succeeded'. Smallest fix: in update mode, write the file that matches the outcome (expected-error.txt on throw, expected.md otherwise) and remove the other one.
- Evidence: code:tests/golden/harness.ts:930, code:tests/golden/harness.ts:964, code:tests/golden/harness.ts:971, test:gf-05: the shipped suite holds at least eight cases covering the required topics
- Review lead ruling after round 1: sustain: valid: fix it
