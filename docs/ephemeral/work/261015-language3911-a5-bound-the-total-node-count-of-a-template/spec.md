# Spec

## Acceptance criteria

- ln-limit: limits.maxNodes (default 20000) is counted at parse; every AST node except the Program root counts, in document order and parent before children, at the opening token; the node numbered maxNodes + 1 raises a limit-nodes diagnostic located at that node, in render, validate and analyze (and as a thrown TemplateError from resolveTemplate and analyze)
- ln-elseif: an ELSEIF chain of 20000 branches gives limit-nodes, not a RangeError; a long chain under the limit (including empty-body branches) parses, renders and analyzes without overflowing the stack; deep nesting ends in a coded limit-depth in every mode
- ln-surfaces: the API accepts and lowers options.limits.maxNodes (a bad value is 400 invalid-request), validate and analyze on the server apply the server's maxNodes, the CLI render takes --max-nodes like --max-depth, and the OpenAPI Limits and RequestLimits schemas list it; spec().limits and DEFAULT_LIMITS carry maxNodes 20000
- ln-analyze: analyze applies the caller's limits (maxDepth, maxNodes), else the defaults; with no caller maxDepth it no longer fails for nesting beyond 32 and bounds only absurd nesting with a coded limit-depth

## Interface

- `core/src/types.ts`: `Limits.maxNodes: number`, `DEFAULT_LIMITS.maxNodes = 20000`, `withDefaultLimits` fills it.
- `core/src/errors.ts`: `LimitCode` gains `"limit-nodes"`.
- `Parser` options gain `maxNodes`; render, validate, analyze and resolveTemplate pass `limits.maxNodes`.
- CLI: `render --max-nodes <n>`. API: `options.limits.maxNodes`.

## Decisions

- Analyze with no caller maxDepth uses an internal ceiling of 256 nested blocks; a caller maxDepth is obeyed exactly. render and resolveTemplate keep the default of 32.
- ELSEIF chains are parsed, interpreted and analyzed iteratively; the AST shape (nested IfNode in `alternate`) does not change.
- Scope amendments: `core/src/interpreter.ts` (iterative ELSEIF), `api/routes.ts` (validate and analyze pass the server's limits), and the one-line default-limits fixtures in `tests/headless/limits.test.ts` and `tests/headless/api.test.ts`.
