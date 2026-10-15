---
summary: "limits.maxNodes (default 20000), the limit-nodes code, iterative ELSEIF chains and analyze limits"
op: modify
target: docs/living/architecture/modules/template-resolver.md
status: applied
---

# Proposed change

The template-resolver module now lists `limit-nodes` among the diagnostic codes and adds `maxNodes` (default 20000, counted at parse and located at the node that crosses it) to `Limits`, with `analyze` and `validate` applying the caller's `maxNodes` and `maxDepth` and ELSEIF chains handled in loops.
