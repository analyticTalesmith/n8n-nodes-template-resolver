---
summary: "A headless core with a structured render result, an HTTP API with an OpenAPI document, and a CLI, all over the same pure library"
name: headless
goal: "A headless core with a structured render result, an HTTP API with an OpenAPI document, and a CLI, all over the same pure library"
tier: product
stage: concept
approvals: front
status: open
verification_levels: []
review_sweeps: []
kind: feature
intent: [add]
purpose: ship
compatibility: additive
uncertainty: partly
reversibility: costly
size: several
oracle: [new-tests, person]
trigger: planned
legibility: documented
---

# headless

## Goal

A headless core with a structured render result, an HTTP API with an OpenAPI document, and a CLI, all over the same pure library

## Why this shape

Shape: kind feature; intent add; purpose ship; compatibility additive; uncertainty partly; reversibility costly; size several; oracle new-tests, person; trigger planned; legibility documented (inferred, unconfirmed). Overrides: none. Derived: risk low, blast module, rigor product, plan approval human.

## Stages

<!-- A stage is a question the cycle asks; record an answer only when it is surprising. Stages with an artifact are done when it exists. Record only: "- <stage> done: <evidence>" for a stage with no artifact, "- <stage> skipped (override): <reason>" for a skip where its own rule says run, and "- <stage> added: <reason>" for a stage chosen on purpose. A spine stage cannot be skipped. -->
- stg-goals-oracle done: goal: headless core, API, CLI; oracle: new tests per card plus the 563 existing
- stg-test-strategy done: unit, integration and one end-to-end over real HTTP; see test-plan.md
- stg-ready-check done: cards carry criteria, gate, manifest and red evidence before ready
- stg-plan-approval done: front approval recorded in design-approval.md

## Who and why

<!-- Who this cycle is for, and why the work matters now. -->

Audience: the repository owner and anyone who clones the public portfolio repo. Why now: slice B of the plan; the API and CLI prove the headless boundary and everything after (language growth, prompt-aware blocks) lands behind one contract. Detail: design.md in this folder.


## Stories

<!-- What people will be able to do when the cycle is done, one line each, linked to their story documents. -->

none: the plan names no personas or stories and none are invented; the spec's slice B is the source.


## Must-haves

<!-- What has to be true for the cycle to count as a success. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->

- `contract` `hl-result` `render` returns a structured result (ok, output, messages, stats, diagnostics) and never throws for template or data problems; validate and spec exist; `analyze` reports required and block counts.
- `contract` `hl-locations` Every diagnostic carries the line and column of the failing node, including runtime errors.
- `contract` `hl-limits` Iterations, output size and nesting depth are limits in render options with documented defaults, each reported as a diagnostic when exceeded.
- `contract` `hl-node` The n8n node renders through the structured result and writes `output` to the old field; failures keep their message and location.
- `contract` `hl-api` POST /v1/render, /v1/validate, /v1/analyze and GET /v1/spec behave as design.md says, including its error statuses.
- `contract` `hl-openapi` GET /v1/openapi.json serves the committed OpenAPI document and its paths equal the router's.
- `contract` `hl-cli` The CLI has render, validate, analyze, spec and serve, reading files or stdin, with the documented exit codes.
- `contract` `hl-e2e` An end-to-end test starts the server on an ephemeral port and exercises every route over real HTTP.
- `constraint` `hl-no-deps` must: add no runtime dependency; the API and CLI use only node's own modules.
- `constraint` `hl-docs` evidence-required: README documents the API, the CLI and the diagnostics shape, checked by the final review.


## Won't-haves

<!-- What this cycle leaves out on purpose, so nobody builds it by accident. -->

- New template syntax (cycle prompt-aware and later).
- Authentication, hosting, a playground page.
- Custom tokenizers over the wire (the estimator hook is a core and createServer option only).


## Expected streams

<!-- The streams this cycle's stage expects, one per line, filled from the stage defaults in the project lead brief. The close review reports each as reported or missing; nothing enforces them. -->

<!-- Choose system/acceptance levels and review sweeps for this cycle's risk and scope. Empty lists add no cycle evidence; hardened minimums still apply. A person approves later changes to these selections. -->

## Areas touched

<!-- List paths the stories reach, one area per line: documented with a link or recover. Each recover area gets one card, "Describe <area> as it is". -->

- `core/src/` (docs/living/architecture/modules/template-resolver.md)
- `n8n/TemplateResolver.node.ts`
- new `api/`, new `cli/`, `package.json`, `tsconfig.json`
- `README.md`, `changelog.md`


## Exit

<!-- How a person judges the cycle done. The close command does not check this text. -->

A person judges the cycle done when `npm ci && npm test && npm run build` is green in CI, the server answers curl on all routes, and the CLI renders a file.


<!-- Session instructions: the depth script adds a dated one-line list under a Session instructions heading here, created on first use. Do not write instructions by hand or leave them only in chat. -->

<!-- generated index: replace everything between this line and the end marker -->
- [test-plan.md](test-plan.md) — The tests this cycle plans at each level, and which requirement lines each one proves.
<!-- end generated index -->
