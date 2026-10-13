---
summary: "Fix nested FOR loops losing the outer loop variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner"
name: resolver-bugfixes
goal: "Fix nested FOR loops losing the outer loop variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner"
tier: product
stage: concept
approvals: card
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
legibility: unknown
---

# resolver-bugfixes

## Goal

Fix nested FOR loops losing the outer loop variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner

## Why this shape

Shape: kind bug-fix; intent correct; purpose ship; compatibility preserved; uncertainty none; reversibility trivial; size card; oracle new-tests; trigger reactive; legibility unknown (inferred, unconfirmed). Overrides: none. Derived: risk low, blast local, rigor product, plan approval auto; not set: criticality.

## Stages

<!-- One line per stage: "- <stage> done: <evidence>" or "- <stage> skipped: <reason>". The reason "rule" means the stage's own skip rule holds for this profile. A stage nobody has handled stays todo. -->

- stg-intent-profile done: this shape line, confirmed when the cycle was opened
- stg-goals-oracle done: criteria typed on each card; oracle is new failing-then-passing tests
- stg-research-archaeology skipped: bug locations reproduced by hand in interpreter.ts and parser.ts; no recovery needed
- stg-test-strategy done: unit tests per card in test-node via node:test; plan in test-plan.md
- stg-red-first-tests done: red evidence written per card; nested loop card red recorded with 4 assertion failures
- stg-workspace todo
- stg-build-slices todo
- stg-mechanical-gate todo
- stg-cleanup todo
- stg-midflight-triage todo
- stg-independent-review todo
- stg-unit-regression todo
- stg-integrity-audit todo
- stg-final-review todo
- stg-branch-merge todo
- stg-record todo

## Who and why

<!-- Who this cycle is for, and why the work matters now. -->

## Stories

<!-- What people will be able to do when the cycle is done, one line each, linked to their story documents. -->

## Must-haves

<!-- What has to be true for the cycle to count as a success. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->

- `contract` `tr-01` The node:test runner compiles the sources and runs tests from test-node, exiting nonzero when a test fails.
- `contract` `tr-02` The runner prints node:test TAP on stdout.
- `constraint` `tr-03` must: leave the existing jest suite files and the node sources untouched.
- `contract` `nf-01` After an inner FOR loop ends, the outer loop variable and its @index values still resolve.
- `contract` `nf-02` Sibling and doubly nested loops render every iteration with the right outer item.
- `contract` `dp-01` A default text after ?? may contain a pipe character and still render whole, with later filters applied.

## Won't-haves

<!-- What this cycle leaves out on purpose, so nobody builds it by accident. -->

## Expected streams

<!-- The streams this cycle's stage expects, one per line, filled from the stage defaults in the project lead brief. The close review reports each as reported or missing; nothing enforces them. -->

<!-- Choose system/acceptance levels and review sweeps for this cycle's risk and scope. Empty lists add no cycle evidence; hardened minimums still apply. A person approves later changes to these selections. -->

## Areas touched

<!-- List paths the stories reach, one area per line: documented with a link or recover. Each recover area gets one card, "Describe <area> as it is". -->

## Exit

<!-- How a person judges the cycle done. The close command does not check this text. -->

<!-- Session instructions: the depth script adds a dated one-line list under a Session instructions heading here, created on first use. Do not write instructions by hand or leave them only in chat. -->

<!-- generated index: replace everything between this line and the end marker -->
- [test-plan.md](test-plan.md) — The tests this cycle plans at each level, and which requirement lines each one proves.
<!-- end generated index -->
