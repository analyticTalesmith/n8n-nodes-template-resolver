Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0010-nested-for-keeps-outer-loop-variables

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T21:50:52.354Z
- Stalled: no
- Brief mismatch: none
- Raised: none

Restatement: When a FOR loop runs inside another FOR loop, or inside a TABLE that is inside a FOR loop, the inner loop must not wipe or permanently overwrite the outer loop's state. After the inner loop ends, the outer item variable and the outer metadata (@index0, @index1, @first, @last, @notFirst, @notLast) must resolve to the outer values again. Inside the inner loop, the metadata must describe the inner loop. The fix has to stay inside interpreter.ts, change no behavior beyond this defect, leave existing tests alone and add no runtime dependency. This serves the cycle goal of fixing the Tier 0 bugs in a deterministic, pure-library template core.

## Findings

None.
