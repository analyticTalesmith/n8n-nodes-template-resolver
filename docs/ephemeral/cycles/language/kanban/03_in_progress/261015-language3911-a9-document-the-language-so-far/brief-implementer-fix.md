# Brief: implementer, two README corrections

## Objective and why

Project goal: a deterministic, no-eval template language with a headless core. Cycle goal: the language grows without leaving the house style. Card goal: the README describes the code exactly. Two statements of the README you wrote do not match the code or the page; fix only these (same scope as before: `README.md`, nothing else).

1. In the `limit-nodes` row of the diagnostics table and in the `maxNodes` row of the Limits table, the node count is described as "a text run, a placeholder or a block". The parser (`core/src/parser.ts`, `open()` and `count()`) also counts every comment, and counts a FOR that generates TABLE rows once more through its own node. Reword both to say: each run of text, each placeholder, each comment and each block counts one (drop any claim you cannot check in `parser.ts`).
2. In the showcase section "All the filters at once", the data block (the ```json fence) ends with an empty line before the closing fence. Remove the empty line so the block ends with the closing brace. Check the other fenced blocks you added for the same stray blank line.

## Decisions already made

Nothing else changes. Do not touch other text, the test or the golden case.

## Owned files and scope

`README.md` only, in the worktree named in the message that launched you.

## How the work is judged

`node node_modules/jest/bin/jest.js --runTestsByPath tests/language/surfaces.test.ts` stays green. `git diff` shows only these edits.

## Model and effort

sonnet, medium: two small edits.

## Result and status

Commit once: `docs(readme): correct the node count wording and a stray blank line`. Say "done". Never redirect output to nul.
