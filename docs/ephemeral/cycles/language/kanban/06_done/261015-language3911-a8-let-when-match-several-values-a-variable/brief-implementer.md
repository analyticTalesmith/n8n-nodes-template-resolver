# Brief: implementer for the case matchers card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: a CASE branch can match several values, a variable or a comparison (`{{WHEN "a", "b"}}`, `{{WHEN other}}`, `{{WHEN >= 10}}`), so authors stop chaining IF for every choice. Same in `render` and `resolveTemplate`; ADR 0003: unknown names and bad operands are errors in every mode.
Your objective: make `tests/language/case.test.ts` and the golden case `tests/golden/render-cases/lang-case/` pass without editing them, inside the scope below, with every existing test still passing.

## Decisions already made

- The spec `docs/ephemeral/work/261015-language3911-a8-let-when-match-several-values-a-variable/spec.md` holds every rule (forms, syntax errors, matching, AST, analyze, spec, interface). Read it first, then `card.md`, `card.json` and the tests. The tests are the contract: if one seems wrong, stop and tell me; never edit one.
- Reuse, do not copy. In `core/src/expressions.ts` export `valuesEqual`, `evaluateNumericComparison` and the `Operand` type (they are the equality and numeric rules of the operators card) and reuse `parseLiteral`. Factor the quote-aware scanning of `parseListLiteral` into one exported comma splitter and use it both there and for the WHEN parse; behavior of conditions must not change at all. Put the matcher parse and evaluation helpers where they can be unit-called without private access (for example `parseWhenMatch` and `evaluateWhen` exported from `expressions.ts`; the parser throws the located `SyntaxError`, the interpreter passes a text-lookup callback that applies `valueToString(resolveNestedPath(path))` so strict-mode and unprintable-value behavior is the CASE subject's own).
- `WhenNode.value` keeps today's meaning for the single quoted form; add `match` (see spec "AST"). Replace the old `extractQuotedValue` regex.
- Parse-time errors are `SyntaxError` at the WHEN token's line and column (see how `parseCase` raises them). Runtime errors from a matcher are located at the WHEN node with the interpreter's `at` wrapper; the CASE subject's own lookup stays located at the CASE.
- A bad matcher is an error even when the CASE is never rendered (parse-time), in every mode.
- Never throw a raw JavaScript error: no `JSON.stringify` of an operand in a message (cyclic objects and BigInt throw). No `eval`, no `new Function`, no regular expression built from template text. No new dependency.
- `analyze` records every WHEN path item (list or comparison) with `this.record(path, "case", false)`; literals are not recorded. `spec.ts`: update the WHEN args and the CASE and WHEN descriptions per the spec.
- If an existing test pins old behavior and breaks, stop and tell me instead of changing it.

## Owned files and scope

Worktree: the path in the message that launched you (node_modules is linked; never run npm install). Edit only `core/src/types.ts`, `core/src/parser.ts`, `core/src/interpreter.ts`, `core/src/analyze.ts`, `core/src/spec.ts`, `core/src/expressions.ts`. `tests/language/case.test.ts` and `tests/golden/render-cases/lang-case/` are read-only. If a fix needs another file, stop and ask.

## How the work is judged

Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/case.test.ts --json` passes, then the whole suite `node node_modules/jest/bin/jest.js` and `npx tsc --noEmit -p .` are green (exit 0) before you say done. Then commit once, at the end, Conventional Commits, for example `feat(language): let WHEN match several values, a variable or a comparison`, subject at most 72 characters, no ids or card codes, no attribution lines. Never push or touch main; never move or claim cards; never redirect output to `nul`. Do not touch living documents (the lead writes them). Run in the foreground.

## Model and effort

sonnet, medium.

## Result and status

Say "done" and report: files changed, gate, full suite and tsc results with numbers, any duplication you noticed, and any test you think is wrong (do not edit it). End with a status: done, done with concerns, needs context, or blocked.
