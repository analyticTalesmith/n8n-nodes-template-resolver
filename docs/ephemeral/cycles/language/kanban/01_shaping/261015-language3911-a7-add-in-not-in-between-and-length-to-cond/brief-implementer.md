# Brief: implementer for the in, not in, between and length card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: conditions test membership, ranges and sizes with `in`, `not in`, `between [a, b]` and `.length`; a quoted literal compares as text; an unrecognized word next to an operator is an error in every mode (ADR 0003). Conditions are identical in `render` and `resolveTemplate`.
Your objective: make `tests/language/operators.test.ts` pass without editing it, inside the scope below, with every existing test still passing.

## Decisions already made

- The spec `docs/ephemeral/work/261015-language3911-a7-add-in-not-in-between-and-length-to-cond/spec.md` holds every rule (operand, in / not in, between, precedence, .length, equality, spec and analyze, interface). Read it first, then `card.md`, `card.json`, and the tests. The tests are the contract: if one seems wrong, stop and tell me; never edit it.
- Not specified in the spec, settled now: a missing or null right side of `in` is false (`not in` true), no error.
- Keep helper logic single-owner. Reuse `joinsName`, `parseLiteral`, `hasBareWhitespace`, `tryCoerceToNumber` and the existing quote tracking in `expressions.ts`; add `splitMembership` and `splitBetween` once and use them in both `evaluateCondition` and `conditionOperands`; add one length helper used by both `resolveValue` (expressions.ts) and `resolveNestedPath` (interpreter.ts); one equality helper used by `==`, `!=` and `in`. No copies.
- The split helpers are quote-aware and bracket-aware (a comma, an operator word, `and` or a `]` inside quotes never splits), and the new operator words are matched case-insensitively with whitespace on both sides. Put them before the string-operator split so `x in ["a contains b"]` and `title contains "in the end"` both work.
- Never throw a raw JavaScript error: do not `JSON.stringify` an operand in a message (cyclic objects and BigInt throw); use a safe description. No `eval`, no `new Function`, no regular expression built from template text. No new dependency.
- Update the "Unrecognized condition" suggestion text to list the new operators. If an existing test pins the old text or the old lenient behavior for a bare-whitespace operand and breaks, stop and tell me instead of changing the test.
- Errors are `TypeError` (from `errors.ts`) with line 1 and column 1; the interpreter's existing `at` wrapper locates them. Check the ternary, ELSEIF and LIST_ITEM paths are wrapped too (the tests locate each).

## Owned files and scope

Worktree: the path in the message that launched you (node_modules is linked; never run npm install). Edit only `core/src/expressions.ts`, `core/src/interpreter.ts`, `core/src/analyze.ts`, `core/src/spec.ts`. `tests/language/operators.test.ts` is read-only (it exists). If a fix needs another file (lexer, parser, errors, filters), stop and ask.

## How the work is judged

Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/operators.test.ts --json` passes, then the whole suite `node node_modules/jest/bin/jest.js` and `npx tsc --noEmit -p .` are green (exit 0) before you say done. Then commit once, at the end, Conventional Commits, for example `feat(language): add in, between and length to conditions`, subject at most 72 characters, no ids or card codes, no attribution lines. Never push or touch main; never move or claim cards; never redirect output to `nul`. Do not touch living documents (the lead writes them). Run in the foreground.

## Model and effort

sonnet, medium.

## Result and status

Say "done" and report: files changed, gate, full suite and tsc results with numbers, any duplication you noticed, and any test you think is wrong (do not edit it). End with a status: done, done with concerns, needs context, or blocked.
