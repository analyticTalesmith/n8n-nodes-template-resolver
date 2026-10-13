Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0008-conditions-evaluate-negation-boolean-wor

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T21:50:54.718Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2, f3

Restatement: Fix the template resolver's condition evaluator, editing only nodes/TemplateResolver/expressions.ts, so conditions mean what they say. NOT a, !a and NOT (a) must negate. &&, ||, and case-insensitive and/or must work as AND/OR, with AND binding tighter. AND/OR inside quoted literals must not split a condition. An unquoted right-hand side of contains/startsWith/endsWith must be read as a variable. == and != must compare numerically when both sides are numeric, and a missing variable must equal null. An unknown word next to an operator must raise an error instead of quietly evaluating to false. The change must not alter other behavior, must not edit or delete existing tests, and must not add a runtime dependency. It serves the cycle goal of fixing the Tier 0 bugs in a deterministic, no-eval template language.

## Findings

### f1: No evidence that the pre-existing test suite still passes; the new error path and lowercase and/or splitting could change previously valid conditions

- Class: goal-risk
- Status: withdrawn
- Serves: m1: The goal-critical question 'do all pre-existing tests still pass?' cannot be answered from the packet. The diff makes three changes that can break earlier behavior. (1) Any condition with bare whitespace that matches no operator now throws, even in lenient mode. Before, a condition such as `a + b` or two words evaluated to false. (2) Lowercase `and`/`or` between words now split conditions. (3) The string-operator RHS now goes through resolveValue. If resolveValue does not strip single quotes the way the removed regex did (/^["']|["']$/), then `s startsWith 'hello'` would become a variable lookup and return false. If any existing test relies on one of these behaviors, it now fails.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Run the full jest suite at head 413e6517 and compare it with base e7069db. Separately, at head, resolve `{{IF a + b}}Y{{ELSE}}N{{END_IF}}` with a=1, b=2 in lenient mode. It throws 'Unrecognized condition' where base rendered N. Also confirm that resolveValue("'hello'") returns the literal hello.
- Evidence: diff:nodes/TemplateResolver/expressions.ts, code:nodes/TemplateResolver/expressions.ts:101, code:nodes/TemplateResolver/expressions.ts:346, doc:docs/living/architecture/modules/template-resolver.md, test:guard-existing-forms: NOT(a), AND, OR and quoted contains keep working
- Review lead ruling after round 1: withdraw: the 446 pre-existing tests pass on this branch in the gate run; the new error is intended

### f2: Numeric equality now also applies to quoted string literals and non-decimal numeric strings

- Class: drift
- Status: filed (0015-follow-up-numeric-equality-now-also-appl)
- Serves: m1: valuesEqual coerces any string that tryCoerceToNumber accepts. So `zip == "01234"` with zip = "1234" is now true. If tryCoerceToNumber is Number-based, '0x10' == '16' and '1e3' == '1000' are also true. These still meet the letter of c5 ('both sides numeric'), but a quoted literal written as a string now compares as a number. The lead may want that scope stated explicitly.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: At head, render `{{IF z == "01234"}}Y{{ELSE}}N{{END_IF}}` with z = "1234". It gives Y, where base gave N.
- Evidence: code:nodes/TemplateResolver/expressions.ts:705, code:nodes/TemplateResolver/expressions.ts:711
- Review lead ruling after round 1: drift: numeric equality on numeric strings is intended; recorded

### f3: The unknown-word error fires on any unmatched multi-word condition, not only on a word next to an operator

- Class: drift
- Status: filed (0016-follow-up-the-unknown-word-error-fires-o)
- Serves: c6: hasBareWhitespace throws for any condition that contains bare whitespace and matched no operator, for example `a b` or `a + b`. That is broader than 'an unknown word next to an operator'. It is probably the intended direction, but it widens the error surface beyond what the criterion says.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: At head, evaluate `{{IF a b}}` with a=true, b=true. It throws TypeError 'Unrecognized condition: a b'.
- Evidence: code:nodes/TemplateResolver/expressions.ts:101, code:nodes/TemplateResolver/expressions.ts:687
- Review lead ruling after round 1: drift: error on unrecognised multi-word conditions is intended; recorded
