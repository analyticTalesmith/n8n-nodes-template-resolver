Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0011-restructure-into-a-pure-core-and-a-thin

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T21:56:37.252Z
- Stalled: no
- Brief mismatch: none
- Raised: none

Restatement: Split the template resolver into a headless core and a thin n8n wrapper without changing behavior. The lexer, parser, expressions, interpreter, filters, coercion, errors, types and utils move to core/src. A new resolve.ts holds resolveTemplate, and core/src/index.ts exports the public surface. n8n/ keeps only the node class, its json, its icon and an index. Core must not import n8n or Node I/O modules, and the node must reach core only through its public entry. Pre-existing tests may change only their import specifiers and must still pass (446 or more). package.json n8n.nodes, tsconfig and jest must follow the new layout so that the build still emits the node entry. No test body may be edited and no runtime dependency may be added.

## Findings

None.
