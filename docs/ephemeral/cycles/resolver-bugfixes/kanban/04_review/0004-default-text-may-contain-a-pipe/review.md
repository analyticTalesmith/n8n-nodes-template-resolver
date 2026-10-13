Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0004-default-text-may-contain-a-pipe

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T18:10:40.479Z
- Stalled: no
- Brief mismatch: c4 is marked verify: review, but its second half ("the whole node:test suite still passes") cannot be reviewed from this packet: it carries no test-run output and the reviewer is forbidden to run anything. From the diff I can confirm only that no jest or test file is touched (the sole code path is nodes/TemplateResolver/parser.ts; the 6 omitted paths are stated to be docs/ephemeral). Likewise the body of parseVariableExpression between the split and the return (roughly lines 141-170) is not shown, so the dp-01..dp-03 outcomes and the 'no new error type' rubric item are inferred from the split alone, not confirmed. The lead should attach the node:test result and that function body, or reclassify c4's pass half as verify: test.
- Raised: f1

Restatement: Make the variable-expression parser treat a pipe inside a single- or double-quoted ?? default as part of the default text, so the default renders whole when the value is missing and any filters written after the closing quote still apply to it. Pipes outside quotes must keep separating filters exactly as before, the rule for which values count as empty must not move, the change must stay inside parseVariableExpression in parser.ts, and the existing jest files and the node:test suite must be unaffected.

## Findings

### f1: Escaped or unbalanced quote swallows every later pipe, so trailing filters silently stop being split off

- Class: goal-risk
- Status: fixed
- Serves: m1: The scanner has no escape handling and no recovery for an unterminated quote. In `x ?? "a\"b" | trim` the backslash-escaped quote closes the quote, the real closing quote reopens it, and the ` | trim` pipe, which is outside the quoted default, is treated as quoted text. The same happens with a stray apostrophe before a pipe (`x ?? "abc | trim`, or any lone ' or " earlier in the expression). At base these pipes separated filters; at head they do not, so the filter is dropped and the core handed to the ?? parsing becomes the whole string. Whether that surfaces as wrong output or a different error depends on the unshown remainder of parseVariableExpression, which is why this is a risk and not a confirmed defect.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Call splitOutsideQuotes on `x ?? "a\"b" | trim` with separator `|`: head returns 1 part (the whole string); base expr.split('|') returned 2 parts (`x ?? "a\"b" `, ` trim`). Then render `${{x ?? "a\"b" | trim}}` and `${{x ?? "abc | trim}}` with x missing at base and at head and compare output and error class; any difference confirms the regression. Smallest fix: inside a quote, skip the character after a backslash; and if the scan ends with a quote still open, fall back to the previous split for the unterminated tail (or only open a quote when a matching closer exists later in the text). The loop is a single linear pass, so there is no hang in either case.
- Evidence: diff:nodes/TemplateResolver/parser.ts, code:nodes/TemplateResolver/parser.ts:183, doc:spec.md, test:dp-02 a filter after a default holding a pipe still applies to the whole default
- Reply after round 1 (fixed): restate: A lone or unterminated quote before a pipe stopped the filter split.; verify: A quote now opens only when a matching closer exists later; new unit tests fail before and pass after, full suite passes.; evidence: code:nodes/TemplateResolver/parser.ts:185, test:dp-03
