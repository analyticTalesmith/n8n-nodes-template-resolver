# Brief

## Objective and why
Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a node:test runner (`node scripts/run-node-tests.mjs`) that compiles TypeScript with tsc and runs tests from test-node/, so the bug cards can show a failing test first.
Your objective: make the card's failing tests pass, building exactly what the criteria and manifest ask for.

## Decisions already made
Worktree: C:/n8n-smoke/.worktrees/test-runner (branch feature/test-runner). Work only there; run npm and node commands from that directory.
Read: docs/ephemeral/work/0002-working-test-runner/spec.md (runner interface and manifest), card.md and card.json in docs/ephemeral/cycles/resolver-bugfixes/kanban/03_in_progress/0002-working-test-runner/.
The tests are already written: scripts/run-node-tests.test.mjs. Do not edit it. scripts/run-node-tests.mjs is a stub you replace.
Commands you may run beyond the package scripts: `npm install --save-dev @types/node` (network, named here), `node scripts/run-node-tests.mjs`, the card gate command.
Do not commit: the lead commits from your report. Do not run git add or git commit.
Style hints: ESM .mjs for the runner, no dependencies beyond node and the repo's own typescript (use node_modules/typescript/bin/tsc via process.execPath, no shell, so it works on Windows). tsconfig.test.json extends nothing; commonjs, target es2019, strict, esModuleInterop, skipLibCheck, outDir .test-build, rootDir ., include nodes/**/* and test-node/**/*, types ["node"]. The smoke test test-node/smoke.test.ts must import Lexer, Parser, Interpreter from ../nodes/TemplateResolver/lexer, parser and interpreter (not the n8n node file) and assert that the template `Hi ${{name}}` with name=Ada renders `Hi Ada`. Add script "test:node": "node scripts/run-node-tests.mjs" to package.json and `.test-build/` to .gitignore.

## Owned files and scope
Add scripts/run-node-tests.mjs (replace stub), tsconfig.test.json, test-node/smoke.test.ts. Edit package.json, package-lock.json, .gitignore. Nothing else.

## How the work is judged
Gate: node --test --test-reporter=tap scripts/run-node-tests.test.mjs must pass. Criteria tr-01 to tr-03 in card.json.

## Model and effort
sonnet, medium: small mechanical build to a clear spec.

## Result and status
Final message report as in your charter, ending with a status.
