---
summary: "Prompt-aware cycle: whitespace, RAW, SECTION, FENCE, heading offset, escape modes and their surfaces."
approved_by: "Jon (front approval)"
approved_on: 2026-10-14
approves:
- f621bfc1f3012f0a9f44d74307890fceb73b7c1e1b10923976ece8d0468aff17 docs/ephemeral/cycles/prompt-aware-1/CYCLE.md
- 8a189468d8abfb1e762eb627b121f88103d3efd1092f7b257b3466810c3445f8 docs/ephemeral/cycles/prompt-aware-1/test-plan.md
- ec6163f4fbb190fc58492d528e1e4eaa47057bc8660f7ebac451fb97dd2e8394 docs/living/architecture/prompt-aware-contract.md
- 080b64c4283789f9b5a156d0ca5c8a51e5a494ec8a73ecfa61e710bdab6a9b09 docs/ephemeral/work/0040-remove-standalone-tag-lines-add-trim-mar/spec.md
- 05aa55af10d15aaeedf75ee1365d3627895d200e65de9b90083757df4b7d4996 docs/ephemeral/work/0041-add-section-that-drops-its-heading-when/spec.md
- 493ba1813d739314afa8b84aa4db63c397d9c1a9376a4589f71608a6e1e7ab60 docs/ephemeral/work/0042-add-the-auto-sized-fence-heading-offset/spec.md
- 76fcb4aa4bc695d7172f884b46d30953fe70cf063c5e4e48b29dda85ec9d1d10 docs/ephemeral/work/0043-expose-the-prompt-aware-options-on-the-a/spec.md
cards:
  - 0040-remove-standalone-tag-lines-add-trim-mar
  - 0041-add-section-that-drops-its-heading-when
  - 0042-add-the-auto-sized-fence-heading-offset
  - 0043-expose-the-prompt-aware-options-on-the-a
modules:
  - template-resolver
  - api
  - cli
max_iterations: 60
max_spawns: 80
max_cost:
cost_unit:
sweep_rounds: 3
approval_hash: 9470339772abadcc1001d1d581ef920d22ed2b2a3388d34edbed1e1c1f2cb7c4
---

# Design approval

<!-- Only a human runs approve-design.mjs after reading the design and accepted risks. List CYCLE.md and every approved requirement, design and reviewer brief in approves. -->

## Design in brief

Prompt-aware cycle: whitespace, RAW, SECTION, FENCE, heading offset, escape modes and their surfaces.

## Red team

Self-check by the lead against the settled decisions: no conflicts.

## Analyze

cycle analyze reports clean.

## Risks accepted

none beyond those named in the cycle brief.
