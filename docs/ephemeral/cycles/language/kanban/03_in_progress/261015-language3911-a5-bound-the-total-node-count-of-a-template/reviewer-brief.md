## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: a template can no longer be made arbitrarily large: limits.maxNodes (default 20000) is counted at parse, and an oversize template or a very long ELSEIF chain fails with a located limit-nodes diagnostic in render, validate and analyze, on the API and the CLI too; analyze applies the caller's limits.
Must not:
- change any existing test expectation other than the named amendments (the default-limits fixtures in tests/headless/spec.test.ts, limits.test.ts and api.test.ts gain maxNodes: 20000)
- change what any existing template outputs
- add a runtime dependency
- evaluate template text as code

## Questions

goal-critical: can a template still make the parser, the interpreter or the analyzer overflow the stack (a long ELSEIF chain under 20000 nodes, deep nesting) instead of ending in a result or a coded, located diagnostic?
goal-critical: is limit-nodes located at the node that crossed the limit, with the same code and position in render, validate, analyze and resolveTemplate?
goal-critical: does analyze() of ordinary deep nesting (40 and 200 blocks) succeed with no limits given, while a caller maxDepth is still obeyed exactly?
goal-critical: does the API lower options.limits.maxNodes (never raise it), and do validate and analyze on the server use the server's maxNodes?
polish: does the CLI --max-nodes parse like --max-depth, and do the usage text and the OpenAPI Limits and RequestLimits schemas list it?
polish: is the added code small, and are the ELSEIF loops free of duplicated logic?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope (the card amends its scope to the interpreter, the API routes and two default-limits fixtures)
- the node count lives in one place in the parser

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/architecture/headless-contract.md
- docs/living/architecture/language-contract.md
