# Brief: implementer fix for the text filters card (review round 1)

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors shape values in the language itself without leaving the house style or the no-eval core.
Card goal: eight text filters in `TEXT_FILTERS`, bad parameters as located type-errors. Spec: `docs/ephemeral/work/261015-language3911-a3-add-the-text-filters/spec.md`.
Your objective: apply two review fixes, one at a time, each with the test that proves it, inside the scope.

## Decisions already made

- Spec rule for `round`: "input that is not a finite number passes through unchanged". Bounded rendering is a project goal: no input value may make a filter allocate without limit.
- Do the findings in this order and run the card's test file after each.

Fix 1 (defect, round): `render('${{ v | round }}', { v: '1e400' }, { strictMode: false })` gives a 401-character integer; the spec says it outputs `1e400`. `render('${{ v | round }}', { v: '1e-999999999' }, ...)` makes `roundDecimal` (core/src/filters-text.ts, the `padStart`/`repeat`/`padEnd` calls) allocate hundreds of megabytes or throw a RangeError (which becomes a type-error). Smallest change: `roundDecimal` returns null (so the text passes through unchanged) when `Number(text)` is not finite, and, for the finite rest, the exponent no longer drives an unbounded allocation (for example also return null when the absolute value of the exponent exceeds a small bound such as 400, since such text is not a number the filter can print compactly; or equivalently when `Number(text)` is 0 or not finite while the digits are not all zero is wrong, so prefer the exponent bound). Keep every existing round row passing (`1e3`, small exponents, `1.005` with 2 places). Add rows to `tests/language/filters-text.test.ts` in the existing `ft-text` round table (test names start with `ft-text`): `1e400`, `-1e400`, `1e300000000`, `1e-999999999` each pass through unchanged, and one finite exponent row such as `1.5e2` still rounds to `150`.

Fix 2 (wording, default): the `default` row's `description` in `core/src/filters-text.ts` must say exactly which values are replaced: missing, null, empty or whitespace-only text, the texts `0`, `false` and `no` (any letter case), the number 0, false, an empty list and an empty object (the rule is `isTruthy` in `core/src/expressions.ts`). Change only the description string (one line is fine). If a test pins the old description text, stop and say so instead of editing it.

## Owned files and scope

Worktree: `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-add-the-text-filters` (node_modules linked; never npm install). Edit only `core/src/filters-text.ts` and `tests/language/filters-text.test.ts`. Do not touch docs, `.process`, card files or other tests.

## How the work is judged

`node node_modules/jest/bin/jest.js --runTestsByPath tests/language/filters-text.test.ts --json` passes with the new rows; `npx tsc --noEmit -p .` clean. Never redirect output to `nul`. No dead code.

## Model and effort

sonnet, medium: two contained edits with exact repro.

## Result and status

Commit once at the end in the worktree, Conventional Commits, at most 72 characters, no ids, no attribution lines, e.g. `fix(filters): pass huge round exponents through unchanged`. Never push or move cards. Say "done". Save your report as `report-implementer-fix.md` in the card folder `docs/ephemeral/cycles/language/kanban/03_in_progress/261015-language3911-a3-add-the-text-filters/` (not committed) and return it, starting with a status.
