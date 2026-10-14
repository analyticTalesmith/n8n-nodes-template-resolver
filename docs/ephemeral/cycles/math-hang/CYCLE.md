---
summary: "A character the math tokenizer does not know ends the render with a located error instead of hanging"
name: math-hang
goal: "A character the math tokenizer does not know ends the render with a located error instead of hanging"
tier: product
stage: concept
approvals: front
status: open
verification_levels: []
review_sweeps: []
kind: bug-fix
intent: [correct]
purpose: ship
compatibility: preserved
uncertainty: none
reversibility: trivial
size: card
oracle: [new-tests]
trigger: reactive
legibility: documented
---

# math-hang

## Goal

A character the math tokenizer does not know ends the render with a located error instead of hanging

## Why this shape

Shape: kind bug-fix; intent correct; purpose ship; compatibility preserved; uncertainty none; reversibility trivial; size card; oracle new-tests; trigger reactive; legibility documented (inferred, unconfirmed). Overrides: none. Derived: risk low, blast local, rigor product, plan approval auto.

## Stages

<!-- A stage is a question the cycle asks; record an answer only when it is surprising. Stages with an artifact are done when it exists. Record only: "- <stage> done: <evidence>" for a stage with no artifact, "- <stage> skipped (override): <reason>" for a skip where its own rule says run, and "- <stage> added: <reason>" for a stage chosen on purpose. A spine stage cannot be skipped. -->
- stg-goals-oracle done: goal: no hang on unknown math characters; oracle: one regression test
- stg-ready-check done: n/a

## Who and why

<!-- Who this cycle is for, and why the work matters now. -->

Audience: anyone running render through the API, CLI or n8n node. Found by the independent verification of the headless cycle: a quoted string inside a math expression hangs the process at full CPU, which freezes the single-threaded API server.


## Stories

<!-- What people will be able to do when the cycle is done, one line each, linked to their story documents. -->

none: a defect fix; no stories are invented.


## Must-haves

<!-- What has to be true for the cycle to count as a success. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->

- `contract` `mh-no-hang` A character the math tokenizer does not recognize (such as a quote) ends tokenizing with a located error and never loops, so render returns a diagnostic for `${{ 1 + "x" }}`.


## Won't-haves

<!-- What this cycle leaves out on purpose, so nobody builds it by accident. -->

- Any change to which math expressions are valid.


## Expected streams

<!-- The streams this cycle's stage expects, one per line, filled from the stage defaults in the project lead brief. The close review reports each as reported or missing; nothing enforces them. -->

<!-- Choose system/acceptance levels and review sweeps for this cycle's risk and scope. Empty lists add no cycle evidence; hardened minimums still apply. A person approves later changes to these selections. -->

## Areas touched

<!-- List paths the stories reach, one area per line: documented with a link or recover. Each recover area gets one card, "Describe <area> as it is". -->

- `core/src/expressions.ts`


## Exit

<!-- How a person judges the cycle done. The close command does not check this text. -->

A person judges the cycle done when the template from the verification report returns promptly with a diagnostic.


<!-- Session instructions: the depth script adds a dated one-line list under a Session instructions heading here, created on first use. Do not write instructions by hand or leave them only in chat. -->

<!-- generated index: replace everything between this line and the end marker -->
- [test-plan.md](test-plan.md) — The tests this cycle plans at each level, and which requirement lines each one proves.
<!-- end generated index -->
