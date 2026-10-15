---
summary: "Language cycle trial: the filter registry card only; design approved by the human in chat on 2026-10-14."
approved_by: "Jon (front approval)"
approved_on: 2026-10-15
approves:
- cf0a332c0fa6bc8ad80a9c9957fed148997161d0ec4812d991681ace047612a1 docs/ephemeral/cycles/language/CYCLE.md
- 2f3cabc2dbb255dd94dfff6deb22c0ae6bb88f436839105ae02c8db5839e9105 docs/ephemeral/cycles/language/test-plan.md
- aed77676f35e0eba8f446e17f2af5879d258fdd433d5028ab0cbdf03f46c8eba docs/living/architecture/language-contract.md
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
approval_hash: 1d702528f678db6856c5ebacaf2ef30afeafdfa72ef00824004090e8a9fd7b43
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
