---
summary: Design approval for the second language cycle: loops, children, SET, INPUT, macros and partials
approved_by: Jon
approved_on: 2026-10-15
approves:
- e05d13f30e8c9cfb1f60c5f361bc47af2c0ee5e5b95b790df4713648e89d0b2c docs/ephemeral/cycles/language-2/CYCLE.md
- 98a8788ee008983271f5d919caa7f6a8cd4a0985dac3cf2db26edc0ed5bed480 docs/ephemeral/cycles/language-2/test-plan.md
- 639cb205a733f9ac929abdce6d0856b87c553de78a152cbfeb7952a0ce7d1e92 docs/living/architecture/language-contract.md
cards:
  - 261015-language2c13-a1-add-limit-offset-an-empty-branch-and-tot
  - 261015-language2c13-a2-build-list-items-and-table-rows-with-for
  - 261015-language2c13-a3-bind-block-scoped-locals-with-set
  - 261015-language2c13-a4-define-and-call-macros
  - 261015-language2c13-a5-pass-partials-in-the-render-options-and
  - 261015-language2c13-a6-iterate-keys-and-values-and-read-the-enc
  - 261015-language2c13-a7-declare-typed-and-required-inputs
  - 261015-language2c13-a8-document-the-language-and-prove-the-show
modules:
  - template-resolver
  - api
  - cli
max_iterations: 200
max_spawns: 100
max_cost:
cost_unit:
sweep_rounds: 3
approval_hash: fc6fd9ff0f8b1dec1d4337fbac3195293d68e957d92084da39dc60605e55e706
---

# Design approval

## Design in brief

The second half of the language slice: one loop runner on a scope stack with window, empty branch, pairs and parent metadata; LIST and TABLE children built by FOR and IF; SET; INPUT; DEFINE and CALL macros and partials in the render options, the API and the CLI. The plan and its settled spellings are in docs/ephemeral/research/language-2-plan.md. The human approved the design and every recommended answer in chat on 2026-10-15, with checkpoints and a hard stop at 90 percent weekly usage.

## Red team

A same-family red team and a gap audit ran on the plan (twelve and seven findings, all answered in the plan).

## Analyze

cycle analyze run before approval: clean.

## Risks accepted

Three behaviour changes to previously valid templates (words after a FOR item name, a table-cell pipe after an even backslash run, inherited path members); the legacy table rules stay; living documents are written once in the last card.
