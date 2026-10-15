---
summary: "limits.maxNodes (default 20000), the limit-nodes code, iterative ELSEIF chains and analyze limits"
op: modify
target: docs/living/architecture/modules/api.md
status: open
---

# Proposed change

The api module now names `maxNodes` (default 20000) among the core defaults, and says `validate` and `analyze` run with the server's `maxDepth` and `maxNodes`, so an `analyze` parse failure can be `limit-nodes`.
