---
summary: "A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the known Tier 0 bugs are fixed; analyze derive…"
name: foundations
goal: "A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the known Tier 0 bugs are fixed; analyze derives variables and filters from the AST; golden-file tests exist"
tier: product
stage: concept
approvals: front
status: open
verification_levels: []
review_sweeps: []
kind: restructure
intent: [restructure, adapt]
purpose: ship
compatibility: preserved
uncertainty: partly
reversibility: costly
size: several
oracle: [existing-tests, new-tests]
trigger: planned
legibility: unknown
---

# foundations

## Goal

A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the known Tier 0 bugs are fixed; analyze derives variables and filters from the AST; golden-file tests exist

## Why this shape

Chosen with propose between restructure and feature. The largest piece of the cycle is a restructure that must not change behavior (the existing 446 tests are the oracle), and the other pieces (test runner, CI, golden harness, AST analyze) are enabling work that adds no user-facing syntax, so restructure fits and its spine (6 stages) is proportionate. The Tier 0 bug fixes do change behavior deliberately; each is a bug card with a failing test and root cause, so compatibility is preserved except for those named fixes.

Shape: kind restructure; intent restructure, adapt; purpose ship; compatibility preserved; uncertainty partly; reversibility costly; size several; oracle existing-tests, new-tests; trigger planned; legibility unknown (inferred, unconfirmed). Overrides: none. Derived: risk low, blast module, rigor product, plan approval human.

## Stages

<!-- A stage is a question the cycle asks; record an answer only when it is surprising. Stages with an artifact are done when it exists. Record only: "- <stage> done: <evidence>" for a stage with no artifact, "- <stage> skipped (override): <reason>" for a skip where its own rule says run, and "- <stage> added: <reason>" for a stage chosen on purpose. A spine stage cannot be skipped. -->
- stg-goals-oracle done: goal: clean clone green, core/n8n split, Tier 0 fixed; oracle: the existing 446 tests plus new regression tests
- stg-build-slices done: 11 cards built in their own worktrees and merged into the cycle branch: jest runner, CI, five bug fix cards, restructure, analyze, golden harness
- stg-unit-regression done: full suite 563 tests in 12 suites pass on the merged branch; the 446 pre-existing tests unchanged apart from import specifiers
- stg-record done: cards done, deltas recorded; recovered documents apply after merge

## Who and why

<!-- Who this cycle is for, and why the work matters now. -->

Audience: the repository owner and anyone who clones the public portfolio repo (source: the one-pager, local install only). Why now: slice A of the plan; nothing later (headless API, prompt-aware constructs) is safe to build until a clean clone tests green, CI exists and the code is split into a pure core and a thin n8n wrapper.


## Stories

<!-- What people will be able to do when the cycle is done, one line each, linked to their story documents. -->

none: the plan names no personas or stories and none are invented; the spec's slice A is the source.


## Must-haves

<!-- What has to be true for the cycle to count as a success. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->

- `contract` `fd-clean-install` A clean clone passes `npm ci` and `npm test`, and the default test command is the existing 446-test jest suite.
- `contract` `fd-ci` A GitHub Actions workflow installs, builds and tests on Node LTS, on ubuntu and windows.
- `contract` `fd-tier0` Every Tier 0 bug that reproduces is fixed, each with a failing regression test written first and a root-cause record; claims that do not reproduce are recorded as not bugs.
- `contract` `fd-no-behavior-change` After the restructure into core/ and n8n/ every pre-existing test still passes with only import paths changed.
- `contract` `fd-analyze` `analyze` reports variables and filters from the parsed AST, with no regex detection left.
- `contract` `fd-golden` A golden-file harness runs input template plus data against expected output files.
- `constraint` `fd-decisions` evidence-required: the six settled design decisions are recorded as living decision documents (checked by validate and the final review).
- `constraint` `fd-core-pure` must: core/ imports nothing from n8n and performs no I/O.


## Won't-haves

<!-- What this cycle leaves out on purpose, so nobody builds it by accident. -->

- The API, CLI, structured render result and limits (cycle headless).
- Any new syntax (cycles prompt-aware and later).
- npm publishing, n8n verification, hosting.


## Expected streams

<!-- The streams this cycle's stage expects, one per line, filled from the stage defaults in the project lead brief. The close review reports each as reported or missing; nothing enforces them. -->

<!-- Choose system/acceptance levels and review sweeps for this cycle's risk and scope. Empty lists add no cycle evidence; hardened minimums still apply. A person approves later changes to these selections. -->

## Areas touched

<!-- List paths the stories reach, one area per line: documented with a link or recover. Each recover area gets one card, "Describe <area> as it is". -->

- recover: the template resolver source (`nodes/TemplateResolver/`) and the repository surface map, described by the archaeology card before the restructure.
- `docs/living/decisions/adr/`: the six settled decisions (planned documents, applied after merge).


## Exit

<!-- How a person judges the cycle done. The close command does not check this text. -->

A person judges the cycle done when a clean clone is green locally and in CI, the tree is core/ plus n8n/, and the decision records are readable.


<!-- Session instructions: the depth script adds a dated one-line list under a Session instructions heading here, created on first use. Do not write instructions by hand or leave them only in chat. -->

<!-- generated index: replace everything between this line and the end marker -->
- [deltas/](deltas/INDEX.md) — Index of docs/ephemeral/cycles/foundations/deltas.
- [design-approval.md](design-approval.md) — Foundations cycle design: restore tests, CI, Tier 0 fixes, restructure into core and n8n, AST analyze, golden harness.
- [test-plan.md](test-plan.md) — The tests this cycle plans at each level, and which requirement lines each one proves.
<!-- end generated index -->
