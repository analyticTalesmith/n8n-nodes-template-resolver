---
summary: "Headless cycle design: structured result, located diagnostics, limits, HTTP API, OpenAPI document, CLI."
approved_by: "Jon (front approval)"
approved_on: 2026-10-14
approves:
- 0f968b1921f843573d9f1173b93246e3df537ce7aa814db1ff434f8931efb359 docs/ephemeral/cycles/headless/CYCLE.md
- 5f75d6050ca95decd280b25b1aa7dd35e53fd50380798147d8cf03e438806ecb docs/living/architecture/headless-contract.md
- 1ea6968f0b26b387eb6e85641f953c5ece56e0018362e33e6d94bdaf71b9d610 docs/ephemeral/cycles/headless/test-plan.md
- 1143fc529a5b2c2b58490de144ce32462a867f77fe1785a74a00969b9bf4b815 docs/ephemeral/work/0027-locate-every-diagnostic-and-bound-the-wo/spec.md
- 5bf100c016e0bfb7fbb63198681697e423fa65fdc60f26d642f4a52440afe4f6 docs/ephemeral/work/0028-return-a-structured-render-result-from-c/spec.md
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
approval_hash: 351aaa009f0a16e59c07a68820133fa826d5844c28e44a6ffa4ecbd912215b44
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
