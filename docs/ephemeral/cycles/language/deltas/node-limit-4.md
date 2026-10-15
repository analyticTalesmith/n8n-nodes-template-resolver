---
summary: "limits.maxNodes (default 20000), the limit-nodes code, iterative ELSEIF chains and analyze limits"
op: modify
target: docs/living/architecture/headless-contract.md
status: applied
---

# Proposed change

The headless contract now includes `maxNodes` in `Limits` and its defaults, `limit-nodes` in the diagnostic codes, `--max-nodes` on `render`, and the server `maxNodes` ceiling for `validate` and `analyze`.
