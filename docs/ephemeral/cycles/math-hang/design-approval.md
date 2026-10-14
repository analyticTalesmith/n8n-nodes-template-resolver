---
summary: "Fix the math tokenizer hang on unknown characters."
approved_by: "Jon (front approval)"
approved_on: 2026-10-14
approves:
- 91d446f0e2444bc18f5f58bd8438b4ac2b7739ec05ae2bb81346b50989fdc7d2 docs/ephemeral/cycles/math-hang/CYCLE.md
- 6f2a478ca7aa6b8ad28ac0a53c66b2dd756ab5e5b4075664c683010424a99ce0 docs/ephemeral/cycles/math-hang/test-plan.md
- 4334d9a2feca3c4ad78263a420288c367f2c5c0b2fc8cb20d80b79230e5a1a16 docs/ephemeral/work/0040-reject-unknown-characters-in-math-expres/spec.md
cards:
  - 0040-reject-unknown-characters-in-math-expres
modules:
  - template-resolver
max_iterations: 60
max_spawns: 80
max_cost:
cost_unit:
sweep_rounds: 3
approval_hash: ccd80a402cc7ffa54752de8c858083dfb01b95fdef882cad1f141b5448ddd0cd
---

# Design approval

<!-- Only a human runs approve-design.mjs after reading the design and accepted risks. List CYCLE.md and every approved requirement, design and reviewer brief in approves. -->

## Design in brief

Fix the math tokenizer hang on unknown characters.

## Red team

Self-check by the lead against the settled decisions: no conflicts.

## Analyze

cycle analyze reports clean.

## Risks accepted

none beyond those named in the cycle brief.
