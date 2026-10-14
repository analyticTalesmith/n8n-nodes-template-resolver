---
summary: "Prompt-shaped output: standalone-line whitespace with trim markers, RAW and brace escaping, SECTION that drops its heading when empty, heading offset, auto-siz…"
name: prompt-aware-1
goal: "Prompt-shaped output: standalone-line whitespace with trim markers, RAW and brace escaping, SECTION that drops its heading when empty, heading offset, auto-sized FENCE and escape modes"
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

# prompt-aware-1

## Goal

Prompt-shaped output: standalone-line whitespace with trim markers, RAW and brace escaping, SECTION that drops its heading when empty, heading offset, auto-sized FENCE and escape modes

## Why this shape

Shape: kind feature; intent add; purpose ship; compatibility additive; uncertainty partly; reversibility costly; size several; oracle new-tests, person; trigger planned; legibility documented (inferred, unconfirmed). Overrides: none. Derived: risk low, blast module, rigor product, plan approval human.

## Stages

<!-- A stage is a question the cycle asks; record an answer only when it is surprising. Stages with an artifact are done when it exists. Record only: "- <stage> done: <evidence>" for a stage with no artifact, "- <stage> skipped (override): <reason>" for a skip where its own rule says run, and "- <stage> added: <reason>" for a stage chosen on purpose. A spine stage cannot be skipped. -->
- stg-goals-oracle done: goal: prompt-shaped output features; oracle: new tests per card plus every existing test
- stg-ready-check done: cards carry criteria, gate, manifest and red evidence before ready
- stg-plan-approval done: front approval recorded in design-approval.md

## Who and why

<!-- Who this cycle is for, and why the work matters now. -->

Audience: the repository owner and anyone who clones the public portfolio repo, and the authors of LLM prompts. Why now: the first half of slice D; these are the prompt-shaped features general template engines leave to the author. Contract: docs/living/architecture/prompt-aware-contract.md.


## Stories

<!-- What people will be able to do when the cycle is done, one line each, linked to their story documents. -->

none: the plan names no personas or stories and none are invented; the spec's slice D is the source.


## Must-haves

<!-- What has to be true for the cycle to count as a success. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->

- `contract` `pa-whitespace` Lines holding only a block tag vanish with their line break by default in render, `-` markers trim adjacent whitespace, and an option restores the old output.
- `contract` `pa-raw` RAW blocks and an escaped opening brace pair output braces literally.
- `contract` `pa-section` SECTION emits a heading and body and drops itself, heading included, when its body is empty, counting omissions in stats.
- `contract` `pa-offset` The heading_offset filter shifts markdown headings, clamped to 1 to 6, leaving fenced code alone.
- `contract` `pa-fence` FENCE and the fence filter size the fence beyond any backtick run in the body.
- `contract` `pa-escape` escape_md has inline and block modes; block mode stops a value from faking structure at a line start.
- `contract` `pa-surfaces` spec, the API, the CLI, the n8n node, the OpenAPI document and the README expose and describe the new options and constructs.
- `constraint` `pa-compat` must: every existing test passes unchanged and the legacy resolveTemplate keeps its old default spacing.
- `constraint` `pa-no-deps` must: add no runtime dependency.


## Won't-haves

<!-- What this cycle leaves out on purpose, so nobody builds it by accident. -->

- TREE, TAG, UNTRUSTED, table upgrades, the as filter, BLOCK budgets, MESSAGE and CACHE_BREAK (later cycles).
- Any attribute-style tag; every block keeps the paired house style.


## Expected streams

<!-- The streams this cycle's stage expects, one per line, filled from the stage defaults in the project lead brief. The close review reports each as reported or missing; nothing enforces them. -->

<!-- Choose system/acceptance levels and review sweeps for this cycle's risk and scope. Empty lists add no cycle evidence; hardened minimums still apply. A person approves later changes to these selections. -->

## Areas touched

<!-- List paths the stories reach, one area per line: documented with a link or recover. Each recover area gets one card, "Describe <area> as it is". -->

- `core/src/` lexer, parser, interpreter, filters, render, spec (docs/living/architecture/modules/template-resolver.md)
- `api/`, `cli/`, `n8n/`, `README.md`, `changelog.md`
- `tests/golden/cases/`


## Exit

<!-- How a person judges the cycle done. The close command does not check this text. -->

A person judges the cycle done when a prompt template with sections, fences and offset headings renders cleanly through the CLI and the API with no stray blank lines, and CI is green.


<!-- Session instructions: the depth script adds a dated one-line list under a Session instructions heading here, created on first use. Do not write instructions by hand or leave them only in chat. -->

<!-- generated index: replace everything between this line and the end marker -->
- [deltas/](deltas/INDEX.md) — Index of docs/ephemeral/cycles/prompt-aware-1/deltas.
- [design-approval.md](design-approval.md) — Prompt-aware cycle: whitespace, RAW, SECTION, FENCE, heading offset, escape modes and their surfaces.
- [test-plan.md](test-plan.md) — The tests this cycle plans at each level, and which requirement lines each one proves.
<!-- end generated index -->
