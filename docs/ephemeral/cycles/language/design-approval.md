---
summary: "Language cycle trial: the filter registry card only; design approved by the human in chat on 2026-10-14."
approved_by: Jon
approved_on: 2026-10-15
approves:
- 660b44052e3ebfdccbf903df21d46f87a6d4bb4150a426327e93b8eacc8c873e docs/ephemeral/cycles/language/CYCLE.md
- 5d394f813efc221f5edc23c08fd34fc96272a477610621b13cf783f612a135d2 docs/ephemeral/cycles/language/test-plan.md
- 47d70022d972e848549d1d34683641ec2c480d4c9859bbd17a41e57d27ebbc4c docs/living/architecture/language-contract.md
- ccba70e4286db8981e15dd8453f0a3f637f307cffa4c22d46b3d2d1c8318695b docs/ephemeral/work/261015-language3911-a1-dispatch-filters-from-one-registry-with/spec.md
cards:
  - 261015-language3911-a1-dispatch-filters-from-one-registry-with
  - 261015-language3911-a3-add-the-text-filters
  - 261015-language3911-a4-add-the-collection-filters
  - 261015-language3911-a5-bound-the-total-node-count-of-a-template
  - 261015-language3911-a6-make-math-and-output-errors-visible
  - 261015-language3911-a7-add-in-not-in-between-and-length-to-cond
  - 261015-language3911-a8-let-when-match-several-values-a-variable
  - 261015-language3911-a9-document-the-language-so-far
modules:
  - template-resolver
  - api
  - cli
max_iterations: 40
max_spawns: 20
max_cost:
cost_unit:
sweep_rounds: 3
approval_hash: 41bc145f4def102e0e855ba137dc28bb3dd6e9818ccd43925de4e88f60a42be4
---

# Design approval

## Design in brief

Trial of the language cycle: only the first card is built, one registry of filter definitions feeding render, spec and analyze, with quote-aware arguments parsed at parse time. The wider cycle plan (fifteen cards) lives in the planning folder and is not approved here.

## Red team

Self-check by the lead against the settled decisions (ADR 0001, 0003) and the human's chat answers of 2026-10-14: no conflicts.

## Analyze

cycle analyze run before approval.

## Risks accepted

Render-only fixes (resolveTemplate outputs stay); the four selected follow-up tickets are folded into the one card.
