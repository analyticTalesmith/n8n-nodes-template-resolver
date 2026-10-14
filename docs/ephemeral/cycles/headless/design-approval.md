---
summary: "Headless cycle design: structured result, located diagnostics, limits, HTTP API, OpenAPI document, CLI."
approved_by: "Jon (front approval)"
approved_on: 2026-10-14
approves:
- 0f968b1921f843573d9f1173b93246e3df537ce7aa814db1ff434f8931efb359 docs/ephemeral/cycles/headless/CYCLE.md
- 9f77104c64d012ddab3e44f0a521aa9daff561323f231eedeeb5dd2452c6b8c4 docs/living/architecture/headless-contract.md
- c74a6586ff9a124b584db881bbd0a3a3085bedffcd94338b5f2f236c1f111869 docs/ephemeral/cycles/headless/test-plan.md
- 1143fc529a5b2c2b58490de144ce32462a867f77fe1785a74a00969b9bf4b815 docs/ephemeral/work/0027-locate-every-diagnostic-and-bound-the-wo/spec.md
- 9b72a582e7ea8a6247f86b6fbac3c564be39838c356432c5b0e3d9a97b40e6e3 docs/ephemeral/work/0028-return-a-structured-render-result-from-c/spec.md
- 92e5e7321895306d77aa870e08b2e472442d33fb9ca958f1b6ca14b6f3c52547 docs/ephemeral/work/0029-serve-render-validate-analyze-and-spec-o/spec.md
- fb00d414d571584ec421491dfbff295cae7de2323a5b0445ed515e53d9810d5a docs/ephemeral/work/0030-add-the-command-line-over-the-same-core/spec.md
- 52216e8a61e9c9918f02f5fb29b66c479bb5c6655a7d966ccaec553bb0b64b65 docs/ephemeral/work/0031-document-the-api-the-cli-and-the-diagnos/spec.md
cards:
  - 0027-locate-every-diagnostic-and-bound-the-wo
  - 0028-return-a-structured-render-result-from-c
  - 0029-serve-render-validate-analyze-and-spec-o
  - 0030-add-the-command-line-over-the-same-core
  - 0031-document-the-api-the-cli-and-the-diagnos
modules:
  - template-resolver
  - api
  - cli
max_iterations: 60
max_spawns: 80
max_cost:
cost_unit:
sweep_rounds: 3
approval_hash: 27a823161eaf48150ea213b4f575a0fe5abba12417cf9a5e8addbaed52232302
---

# Design approval

<!-- Only a human runs approve-design.mjs after reading the design and accepted risks. List CYCLE.md and every approved requirement, design and reviewer brief in approves. -->

## Design in brief

Five cards: located diagnostics and limits, the structured result with the node mapping, the HTTP API with OpenAPI, the CLI, documentation. Contract in design.md.

## Red team

Self-check by the lead against decisions 1 to 6: no conflicts; the API cannot be pointed at a file system; request limits can only lower server limits.

## Analyze

cycle analyze reports clean.

## Risks accepted

Loopback binding is the only exposure control; no authentication by design (local install only).
