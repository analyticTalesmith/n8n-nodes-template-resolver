# Handoff: smoke-run-end, 2026-10-13

## Goal
Fix two resolver bugs and add a RAW block, with PRs for human review

## Plan
docs/ephemeral/cycles/raw-block/CYCLE.md

## Branch and commit
Branch: feature/raw-block
Commit: 35ec7b3 (read git log from here; later changes are authoritative)
Uncommitted changes: 2 files

## State
- cycle resolver-bugfixes: 3 cards done, PR 1 open
- cycle raw-block: 1 card done, PR 2 open (stacked on PR 1)

## Next actions
- Human reviews the two PRs and the two draft close reviews, then fills approved_by and closes the cycles
- After merge run delta.mjs apply raw-block to set the RAW doc to built

## Blockers
- close reviews need a human approved_by
- session-cycle-brief-empty: Cycle raw-block has cards but its brief has an empty Stories section. Write it in docs/ephemeral/cycles/raw-block/CYCLE.md.
- session-cycle-brief-empty: Cycle resolver-bugfixes has cards but its brief has an empty Stories section. Write it in docs/ephemeral/cycles/resolver-bugfixes/CYCLE.md.

## Decisions
- plan approval for raw-block is auto per the shape (docs/ephemeral/cycles/raw-block/CYCLE.md)

## Verify
Command: node scripts/run-node-tests.mjs
Last result: 28 of 28 pass

## Read first
- docs/ephemeral/cycles/raw-block/close-review.md

## Do not redo
- none

## Board
- none
