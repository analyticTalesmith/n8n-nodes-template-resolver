# Brief: implementer fix for the node count limit card (review round 1)

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: `limits.maxNodes` bounds the size of a template; no existing template may change what it outputs or which first error it reports.
Your objective: apply two small fixes, one at a time, each with its proof, inside the scope.

## Fix 1: the IF and ELSEIF condition must be read before the body (finding f1, goal-risk)

- Failing scenario: `render('{{IF }}{{FOR bad}}{{END_FOR}}{{END_IF}}', {})`. At the base commit the first diagnostic is the condition error located at the IF tag (1:1); today the FOR syntax error is reported first, at the FOR tag, because `parseIfBranch` in `core/src/parser.ts` calls `extractCondition(token.value)` inside the returned object literal, after the body loop.
- Smallest fix: in `parseIfBranch`, compute the condition from `token.value` right after `this.open(type)` and before the consequent loop, and use that value in the returned node. Nothing else changes.
- Proof: add table rows to `tests/language/limits-nodes.test.ts` (a new `describe` named with the criterion id prefix `ln-limit`, for example `ln-limit: a bad condition is reported before errors in its body`), `it.each` rows for IF and for ELSEIF (`{{IF t}}a{{ELSEIF }}{{FOR bad}}{{END_FOR}}{{END_IF}}`): the first diagnostic of `render` (lenient and strict) and the error thrown by `resolveTemplate` is the condition error at the IF or ELSEIF tag (give its line and column), not the FOR error; and a row where the bad condition and enough body nodes to cross `maxNodes` meet: the condition error wins when the tag itself is within the limit. First observe the expected diagnostic code and message by running the template at the base behavior reasoning above (the condition error must be what the pre-change parser gave: you may check it with `git stash`-free means such as `git show f4e552a:core/src/parser.ts` read for the order of calls). Run the new rows red first if you can (revert the fix mentally or run before editing), then green. Only append rows; change no existing test.

## Fix 2: fill the four delta documents (finding f3, drift)

- Files: `docs/ephemeral/cycles/language/deltas/node-limit-1.md` to `node-limit-4.md` (targets: modules/template-resolver.md, modules/api.md, modules/cli.md, headless-contract.md). Under `# Proposed change`, replace the template HTML comment with a one-line summary of what that document now says, matching the edits already made in the worktree to the target (`git diff f4e552a -- docs/living/architecture/<target>` shows them). Keep each to one or two sentences; keep the front matter unchanged; do not edit the living documents.

## Owned files and scope

Worktree: `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-bound-the-total-node` (branch `feature/bound-the-total-node`; node_modules is linked). Edit only `core/src/parser.ts`, `tests/language/limits-nodes.test.ts` (append only) and the four delta files. Do not touch `.process`, card files or other tests.

## How the work is judged

`node node_modules/jest/bin/jest.js --runTestsByPath tests/language/limits-nodes.test.ts --json` passes with the new rows; the full suite (`node node_modules/jest/bin/jest.js`) passes except the two other cards' files `tests/language/filters-text.test.ts` and `filters-collection.test.ts`; `npx tsc --noEmit -p .` is clean.

## Model and effort

sonnet, medium: two small mechanical fixes with exact oracles.

## Result and status

Commit once at the end, in the worktree, Conventional Commits, at most 72 characters, no ids or codes, no review-process words, for example `fix(parser): read an IF condition before its body`. Never push, touch main, move cards or write to `nul`. Do not run claim.mjs; say "done". Return your report starting with a status: done, done with concerns, needs context, or blocked.
