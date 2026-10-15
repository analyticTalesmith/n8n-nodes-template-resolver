# Test writer report: node count limit

Status: done with concerns

Commits in the worktree (branch feature/bound-the-total-node): `test(limits): pin the node count limit and long chains`, `test(limits): record the red run for the node count limit`.

## Files
- `tests/language/limits-nodes.test.ts` (new, 193 tests; 103 fail by assertion today, red-evidence script counted 104 failing across the run, exit 0)
- `tests/headless/spec.test.ts` (approved amendment: fixture gains `maxNodes: 20000`)
- Stubs: `core/src/types.ts` (`maxNodes` on `Limits`, `DEFAULT_LIMITS.maxNodes = 0`, passed through by `withDefaultLimits`), `core/src/errors.ts` (`limit-nodes` in `LimitCode`)
- `card.json` traces set per criterion; `docs/ephemeral/work/.../red-evidence.md` written and committed.

## Criteria
- ln-limit (unit): 5 modes x 21 rows (exact fit / crossing located by line and column for N=1,5,20, second line, IF, ELSEIF, ELSE, FOR, TABLE, maxNodes 0, parse-before-missing-variable), default 20000/20001 at column 120001, diagnostic shape, no-throw render, validate ok false, cross-mode equality, neighbouring limits. Red: crossing rows get "ok" instead of limit-nodes because the stub limit is not enforced.
- ln-elseif (unit): 20000-branch chain, 30000 variables, 19000 empty-body chain (all five modes), 5000 and 8000 chains with one true branch, 3000 chain with ELSE, 40 and 5000 nested IF. Red: limit-nodes rows and the empty-body chain fail by assertion (the chain/nesting rows that already behave correctly pass today and guard against regressions).
- ln-analyze (unit): 40 and 200 nested give an analysis, 1000 gives limit-depth, caller maxDepth 5/6, caller maxNodes, validate, render depth 32. Red: 40 and 200 nested return limit-depth instead of ok; maxNodes row returns ok.
- ln-surfaces (integration): API lowering, capping, server default, 400s, validate and analyze routes; CLI flag, exit codes, usage, --json, deep analyze; OpenAPI, spec, defaults. Red: limit-nodes not reported, flag unknown (message lacks "--max-nodes must be a non-negative integer"), schema and spec lack maxNodes, DEFAULT_LIMITS is 0.

## Wrong implementations caught
- Counting nodes after parse or in the interpreter: location and parse-before-strict-error rows.
- Off by one (> vs >=) or counting ELSE / Program: the exact-fit rows and the IF/ELSEIF/ELSE rows.
- Not counting FOR/TABLE children: the FOR and TABLE rows.
- Fixing only the parser for chains: the 19000 empty-body chain in render, validate and analyze.
- Keeping analyze depth 32 or removing it altogether: 40/200 pass, 1000 fails, caller maxDepth obeyed.
- API raising instead of lowering, ignoring server maxNodes in validate/analyze, accepting bad values: the surface rows.

## Existing tests failing only because of the stubs
Full suite: 4 failing files. Besides my file and `spec.test.ts` (its fixture is the approved amendment, red by design):
1. `tests/headless/limits.test.ts` "lm-defaults: DEFAULT_LIMITS is 10000 iterations, ..." uses `toEqual` without maxNodes.
2. `tests/headless/api.test.ts` "ap-routes: GET /v1/spec returns ..." uses `toEqual` without maxNodes.
Both will fail once `maxNodes` is in the defaults and need the same one-line fixture amendment; I did not touch them (the brief says limits.test.ts must stay unchanged and gives no approval for api.test.ts).

## Concerns and questions
1. Approve a one-line amendment to those two fixtures (add `maxNodes: 20000`)? Recommended: yes, same as the spec fixture; otherwise the implementer cannot get a green suite.
2. The TABLE row assumes a one-variable cell is a single node under the row (Table, Row, Variable = 3). Recommended: keep.
3. Mutation proof against a real implementation was not possible (no implementation by design); the cases were checked by reasoning against the stated counting rule.
