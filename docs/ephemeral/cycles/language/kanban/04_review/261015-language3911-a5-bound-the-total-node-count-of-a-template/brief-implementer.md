# Brief: implementer for the node count limit card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: a template can no longer be made arbitrarily large. `limits.maxNodes` (default 20000) is counted at parse; an oversize template or a very long ELSEIF chain fails with a located `limit-nodes` diagnostic in render, validate and analyze, on the API and the CLI too; analyze applies the caller's limits.
Your objective: make the frozen tests pass with the smallest correct change, inside the file scope.

## Decisions already made

- Spec: `docs/ephemeral/work/261015-language3911-a5-bound-the-total-node-count-of-a-template/spec.md` (read it first); the tests are `tests/language/limits-nodes.test.ts` (frozen; read them, they are the oracle).
- Node counting: every AST node except the Program root, counted in document order, parent before children, at the moment the parser starts the node, located at its opening token line and column; count > maxNodes raises `LimitError("limit-nodes", ...)` with a suggestion naming `limits.maxNodes`. Keep the counting in one place in the parser (the single node-start funnel, such as `parseNode` and the ELSEIF branch start). Each `{{ELSEIF}}` is one node, ELSE none. Parser option `maxNodes` defaults to `DEFAULT_LIMITS.maxNodes`.
- The stub `DEFAULT_LIMITS.maxNodes = 0` in `core/src/types.ts` becomes 20000; `withDefaultLimits` already passes it.
- ELSEIF chains: parse (`parseIf`/`parseElseIf`), interpret (`visitIf`) and analyze (`Walker.visitIf`) iteratively instead of recursively, keeping the AST shape (nested IfNode in `alternate`). A chain of up to 19999 empty-body branches must not overflow the stack.
- `analyze()`: with no caller `maxDepth`, bound nesting at an internal ceiling of 256 (coded `limit-depth` beyond it); a caller `maxDepth` is obeyed exactly; `maxNodes` from the caller else the default. render and resolveTemplate keep the default depth 32. `validate` passes its options through to analyze.
- Surfaces: `render` and `resolveTemplate` pass `limits.maxNodes` to the Parser; the API `lowerLimits` already iterates the server limit keys, so it accepts and lowers `maxNodes` once `Limits` has it; `api/routes.ts` validate and analyze must pass the server's `context.limits` (not only maxDepth); CLI `render --max-nodes <n>` parsed with `parseLimits`/`parseCount` like `--max-depth`, usage text names it; `api/openapi.json` adds `maxNodes` (integer, minimum 0, description) to `Limits` (also in `required`) and to `RequestLimits`, keeping the file's serialization (2-space JSON plus a final newline).
- The default-limits fixtures in `tests/headless/limits.test.ts` ("lm-defaults") and `tests/headless/api.test.ts` ("ap-routes" GET /v1/spec) gain `maxNodes: 20000`: change only that one line in each; no other test edit.
- Human decisions 2026-10-14: render-only behavior changes, `resolveTemplate` outputs unchanged, no new runtime dependency, no eval, no template-supplied regular expression compiled. ADR 0003 stays.

## Owned files and scope

Worktree: `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-bound-the-total-node` (branch `feature/bound-the-total-node`; node_modules is linked; never run npm install). Edit only: `core/src/types.ts`, `parser.ts`, `errors.ts`, `render.ts`, `resolve.ts`, `analyze.ts`, `interpreter.ts` (all under `core/src/`), `cli/main.ts`, `api/openapi.json`, `api/routes.ts`, and the two one-line fixtures above. Do not edit `tests/language/limits-nodes.test.ts`, the `.process` folder, docs or card files; if a test seems wrong or you need another file, stop and say so in your report. Other cards edit other files in parallel (filters, math): touch no line outside what this card needs in the shared files.

## How the work is judged

- Gate: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/limits-nodes.test.ts --json` passes; then the whole suite `node node_modules/jest/bin/jest.js` passes (failures in `tests/language/filters-text.test.ts` or `filters-collection.test.ts` belong to other cards still in progress; ignore those two files only) with the same counts as before plus the new tests; `npx tsc --noEmit -p .` stays clean.
- Reviewers will ask: can any template still overflow the stack in any mode; is `limit-nodes` located at the crossing node identically in render, validate, analyze and resolveTemplate; does analyze succeed on 40 and 200 nested blocks; does the API only lower maxNodes; does every existing template render the same. Keep functions small; no dead code; the count lives in one place.

## Model and effort

sonnet, medium: a contained change with an exact oracle.

## Result and status

Commit once at the end, in the worktree, Conventional Commits, subject at most 72 characters, no ids or card codes, no attribution lines, for example `feat(limits): bound the total node count of a template`. Never push, touch main, move cards or write to `nul`. Do not run claim.mjs; just say "done". Save your report as `report-implementer.md` in `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/docs/ephemeral/cycles/language/kanban/03_in_progress/261015-language3911-a5-bound-the-total-node-count-of-a-template/` (not committed) and return it, starting with a status: done, done with concerns, needs context, or blocked.
