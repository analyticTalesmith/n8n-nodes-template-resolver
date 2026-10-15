---
summary: "Language cycle trial: the filter registry card only; design approved by the human in chat on 2026-10-14."
approved_by: "Jon (task brief of 2026-10-14)"
approved_on: 2026-10-15
approves:
- 660b44052e3ebfdccbf903df21d46f87a6d4bb4150a426327e93b8eacc8c873e docs/ephemeral/cycles/language/CYCLE.md
- 5d394f813efc221f5edc23c08fd34fc96272a477610621b13cf783f612a135d2 docs/ephemeral/cycles/language/test-plan.md
- 172ac3bf5c3816c30997f79c5e42ea51b2cbf26f75c3abfb93f19b692fc5c693 docs/living/architecture/language-contract.md
- ccba70e4286db8981e15dd8453f0a3f637f307cffa4c22d46b3d2d1c8318695b docs/ephemeral/work/261015-language3911-a1-dispatch-filters-from-one-registry-with/spec.md
cards:
  - 261015-language3911-a1-dispatch-filters-from-one-registry-with
modules:
  - template-resolver
max_iterations: 40
max_spawns: 20
max_cost:
cost_unit:
sweep_rounds: 3
approval_hash: af810111393a57e897bba045ec21201335fd81a0108f0d66c5fb363913cb621b
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
