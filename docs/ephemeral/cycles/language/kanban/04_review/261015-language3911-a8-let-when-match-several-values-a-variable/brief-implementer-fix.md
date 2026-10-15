# Brief: implementer, three approved test corrections and the commit

## Objective and why

Card goal: a CASE branch can match several values, a variable or a comparison. Your code is right in the 25 failing rows you reported; the project lead approved correcting the tests (recorded in `test_amendments` in `card.json`, approver "project lead"). This is the only time you may edit `tests/language/case.test.ts`, and only these three things.

## Decisions already made

1. In `tests/language/case.test.ts` delete the spacing row `["lowercase tag word", '{{when "a", "b"}}', "b"]` (cs-values). In the cs-compare test "the comparison tag word is case-insensitive and takes trim markers", keep the trim-marker coverage but use the upper case `WHEN` (template `{{CASE n}}{{- WHEN >= 10 -}}Y{{DEFAULT}}N{{END_CASE}}`) and rename the test "a comparison tag takes trim markers" (drop "case-insensitive").
2. In the cs-analyze test, change the final "exactly the expected variables" assertion to compare the analyzed variable names after removing the CASE subject and the FOR iterable the analyzer always records (the names `x` and `items`) with the row's expected names (also with those two removed). Do not weaken the per-variable checks above it.
3. In the cs-var table, the row `C("x", ['"a"', "other"], { x: "b" }, S(E("missing-variable", 2), O("2")))` changes its lenient expectation to `O("D")` (a missing variable is empty text, `"b"` does not equal it): `S(E("missing-variable", 2), O("D"))`.
Nothing else in the test file changes.

## Owned files and scope

Worktree: the path in the message that launched you. First run `git merge --ff-only feature/language` there so `card.json` and the spec are current (your uncommitted changes in `core/src` stay). Edit only the six `core/src` files you already changed and the three test spots above.

## How the work is judged

`node node_modules/jest/bin/jest.js --runTestsByPath tests/language/case.test.ts --json` passes, then the whole suite `node node_modules/jest/bin/jest.js` and `npx tsc --noEmit -p .` are green. Commit once at the end with `feat(language): let WHEN match several values, a variable or a comparison` (the tests and `core/src` together), no ids, no attribution lines. Never push; never redirect output to `nul`. Run in the foreground.

## Model and effort

sonnet, medium.

## Result and status

Say "done" and report files changed, gate, full suite and tsc numbers, then end with a status.
