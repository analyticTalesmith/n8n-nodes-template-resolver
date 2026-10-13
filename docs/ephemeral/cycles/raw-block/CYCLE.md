---
summary: "Add a RAW block that outputs its contents literally so templates can include braces and tag-like text"
name: raw-block
goal: "Add a RAW block that outputs its contents literally so templates can include braces and tag-like text"
tier: product
stage: concept
approvals: card
status: open
verification_levels: []
review_sweeps: []
kind: feature
intent: [add]
purpose: ship
compatibility: additive
uncertainty: none
reversibility: trivial
size: card
oracle: [new-tests, person]
trigger: planned
legibility: unknown
---

# raw-block

## Goal

Add a RAW block that outputs its contents literally so templates can include braces and tag-like text

## Why this shape

Shape: kind feature; intent add; purpose ship; compatibility additive; uncertainty none; reversibility trivial; size card; oracle new-tests, person; trigger planned; legibility unknown (inferred, unconfirmed). Overrides: size, reversibility, uncertainty. Derived: risk low, blast local, rigor product, plan approval auto; not set: criticality.

## Stages

<!-- One line per stage: "- <stage> done: <evidence>" or "- <stage> skipped: <reason>". The reason "rule" means the stage's own skip rule holds for this profile. A stage nobody has handled stays todo. -->

- stg-intent-profile done: shape line: kind feature with size card, reversibility trivial and uncertainty none overridden because it is one additive lexer change
- stg-outcome-input done: the owner's feature spec, Tier 1 literal escaping, cited under Who and why; no persona or priority invented
- stg-goals-oracle done: must-haves rb-01 to rb-06 typed in the cycle brief; oracle is new tests plus a person reading the README example
- stg-impact-map done: lexer.ts only (scan of tag keywords); parser and interpreter already accept a Text token; README gets one section
- stg-requirements done: requirements are the typed must-haves rb-01 to rb-06 in CYCLE.md
- stg-system-analysis skipped: no new external interface: the node still calls resolveTemplate with the same arguments
- stg-options-architecture done: options in the card spec: lexer-level raw scan (chosen) versus a parser block node; the lexer scan needs no AST or interpreter change
- stg-module-design done: lexer scanTag reads the RAW keyword and emits one Text token; contract in the card spec
- stg-ux-content-design skipped: no screen; the only user-facing surface is the template syntax documented in the README
- stg-threat-model skipped: RAW only emits template text unchanged and adds no input, file, network or eval path; a template author already controls the template
- stg-design-challenge skipped: rule
- stg-test-strategy done: test plan: unit (lexer) and integration (resolveTemplate) rows pair with module design; system waived; acceptance is a person
- stg-red-first-tests done: red evidence for rb-01 to rb-04: 6 failing tests, all assertion failures, guard passes
- stg-docs-plan done: delta raw-block-syntax adds docs/living/product/raw-block.md (planned stub) and the card edits README
- stg-slicing-plan done: one slice, one card: the lexer scan, README and living doc together
- stg-ready-check done: card has typed criteria, frozen manifest, reviewer brief and red evidence; gate moves to ready checks it
- stg-plan-approval done: plan approval is auto per the shape (small additive card), no human approval requested
- stg-work-order skipped: rule
- stg-workspace done: worktree .worktrees/raw-block on branch feature/raw-block-impl
- stg-build-slices done: one slice: lexer scan, README section and living doc, built by a fresh implementer to the frozen manifest
- stg-flags-abstraction skipped: additive syntax: a template without RAW cannot reach the new code, so no flag is needed
- stg-mechanical-gate done: gate ran on each move; card reached done
- stg-cleanup skipped: the diff is one 40-line method and docs; no cleanup spawn
- stg-local-integration skipped: rule
- stg-design-drift done: review found the n8n node scans text for variables, outside the planned scope; fixed by a logged scope exception and filed two follow-ups
- stg-independent-review done: blind fallback review, three rounds; findings f1 f2 f3 f5 answered, f4 f6 filed as follow-ups
- stg-human-spot-check skipped: rule
- stg-unit-regression done: node:test 28 of 28; old jest suite 446 of 446 from a copy with jest installed
- stg-integration-contract skipped: rule
- stg-system-e2e skipped: waived in the cycle test plan: no new external interface
- stg-acceptance todo
- stg-accessibility skipped: no UI surface
- stg-exploratory skipped: rule
- stg-docs-verification done: README example output equals the compiled resolver output; a person has not confirmed it
- stg-integrity-audit skipped: single card; no cross-card interaction
- stg-blind-evaluation skipped: not selected for this cycle (verification levels none)
- stg-final-review todo
- stg-evidence-packet skipped: rule
- stg-go-no-go todo
- stg-branch-merge todo
- stg-publish-notes skipped: deployment none; nothing is released
- stg-record todo
- stg-feedback-intake skipped: no feedback captured in this cycle

## Who and why

<!-- Who this cycle is for, and why the work matters now. -->

Source: the project owner's feature spec (Tier 1, literal escaping): a template that contains `{{` as literal text, such as a code sample, a JSON example or Jinja, currently throws a syntax error, so such text cannot be put in a prompt template at all. Assumption: the owner is the only user in this cycle; no other audience is named in the spec.

## Stories

<!-- What people will be able to do when the cycle is done, one line each, linked to their story documents. -->

## Must-haves

<!-- What has to be true for the cycle to count as a success. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->

- `contract` `rb-01` The text between `{{RAW}}` and `{{END_RAW}}` renders exactly as written, including `{{IF x}}`, `${{name}}`, `{{# ... #}}` and lone braces.
- `contract` `rb-02` A RAW block works inside IF and FOR bodies, and surrounding tags and variables render as before; in a loop it repeats per iteration and in an untaken branch it does not render.
- `contract` `rb-03` The raw text is not trimmed, and CRLF in it becomes LF like other text.
- `constraint` `rb-04` must-not: an unclosed `{{RAW}}` is a syntax error that names its line and column and never swallows the rest silently.
- `constraint` `rb-05` must: templates without RAW render exactly as before (jest suite and node:test suite pass).
- `contract` `rb-06` The README documents RAW with one example.

## Won't-haves

<!-- What this cycle leaves out on purpose, so nobody builds it by accident. -->

- A backslash escape for braces; whitespace control; nested RAW blocks (the first `{{END_RAW}}` closes the block); a RAW filter or options.

## Expected streams

<!-- The streams this cycle's stage expects, one per line, filled from the stage defaults in the project lead brief. The close review reports each as reported or missing; nothing enforces them. -->

developer

<!-- Choose system/acceptance levels and review sweeps for this cycle's risk and scope. Empty lists add no cycle evidence; hardened minimums still apply. A person approves later changes to these selections. -->

## Areas touched

<!-- List paths the stories reach, one area per line: documented with a link or recover. Each recover area gets one card, "Describe <area> as it is". -->

- nodes/TemplateResolver/lexer.ts (no living document; not recovered, see the stage record)
- README.md

## Exit

<!-- How a person judges the cycle done. The close command does not check this text. -->

A person confirms the README example renders as shown when run through the resolver.

<!-- Session instructions: the depth script adds a dated one-line list under a Session instructions heading here, created on first use. Do not write instructions by hand or leave them only in chat. -->

<!-- generated index: replace everything between this line and the end marker -->
- [deltas/](deltas/INDEX.md) — Index of docs/ephemeral/cycles/raw-block/deltas.
- [test-plan.md](test-plan.md) — The tests this cycle plans at each level, and which requirement lines each one proves.
- [verification/](verification/INDEX.md) — Index of docs/ephemeral/cycles/raw-block/verification.
<!-- end generated index -->
