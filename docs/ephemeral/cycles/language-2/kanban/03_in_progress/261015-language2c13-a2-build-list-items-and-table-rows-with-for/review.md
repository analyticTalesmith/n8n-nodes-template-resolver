Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language2c13-a2-build-list-items-and-table-rows-with-for

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T14:31:52.419Z
- Stalled: no
- Brief mismatch: 1) m4 exempts only 'an IF holding a ROW inside a TABLE FOR', but the spec (section 'Two kinds of FOR in a TABLE') also runs a FOR holding a ROW (in its body or ELSE body) in row mode when it sits in the body of a direct TABLE FOR. This changes base-valid templates beyond m4's wording. Example: {{TABLE}}{{FOR ps AS p}}{{FOR ys AS y}}{{ROW}}${{y}}|1{{END_ROW}}{{END_FOR}}{{END_FOR}}{{END_TABLE}} rendered nothing at base and now renders rows. In strict mode a non-iterable inner iterable was a type-error at base and is now silent. A nested FOR with a text body and a ROW only in its ELSE used to join all iterations into one row and now gives one row per iteration. The diff follows the spec. The lead should align m4 with the spec. 2) The frozen test row 'TABLE FOR with an unclosed ROW is still a syntax error at END_FOR' contradicted the spec, which adds END_FOR, ELSE, ELSEIF and END_IF as ROW closers with no condition. c3 says 'inside an IF or FOR that builds rows', so it is ambiguous whether a direct TABLE FOR counts. The builder flipped the test to match the spec under a recorded amendment. c9 and m1 ('no existing test file changes') do not say whether a card's own pre-base test file counts as existing.
- Raised: f1, f2, f3

Restatement: Inside a LIST, FOR blocks and IF/ELSEIF/ELSE blocks (nested to any depth) must produce LIST_ITEMs that share one gap-free counter with static items. Inside a TABLE, IF blocks and FOR or IF blocks nested in them must produce ROWs, padded and headed as before. Both kinds of generated child run on the existing loop runner. Unclosed items and rows also end at END_FOR, ELSE, ELSEIF and END_IF. Any other content in these child blocks is a located syntax-error found at parse time. Every node, depth, iteration and output limit applies to them. analyze must see the generated children. Every template that was valid before must keep its output, with two exceptions: the approved change that escapes a table-cell pipe after an even run of backslashes, and the listed loosened parses.

## Findings

### f1: A FOR with no ROW inside an IF that builds rows is rendered through visitFor, so a non-iterable iterable is a strict-mode type-error instead of silent

- Class: defect
- Status: open
- Serves: c2: In a strict-mode render, a TABLE whose IF holds a FOR without any ROW in its body (for example, while the author has the ROW commented out) fails with a type-error when the iterable is an object or null. The spec says a FOR inside an IF that builds rows 'renders no rows without error, in strict mode too (a TABLE never errors on a FOR's iterable)'.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('{{TABLE}}{{IF t}}{{FOR obj AS x}}{{# row later #}}{{END_FOR}}{{END_IF}}{{END_TABLE}}', {t:true, obj:{k:1}}, {strictMode:true}). parseRowChild drops the comment, so the FOR body is []. rowsFromChild(If) calls tableRowsFrom([For]). holdsRow(For) is false, so the else branch calls addText(this.visit(For)), which calls visitFor and then runLoop(node, false, ...). That throws 'Cannot iterate over non-array value' at the FOR, while the spec expects empty output. Smallest fix: in the strict row context (an IF directly in a TABLE and its nested FOR/IF bodies), send every FOR and IF child to rowsFromChild whatever holdsRow returns. Keep the holdsRow test only for bodies of a direct (legacy) TABLE FOR.
- Evidence: diff:core/src/interpreter.ts, code:core/src/interpreter.ts:697, code:core/src/interpreter.ts:4001, doc:docs/ephemeral/cycles/language-2/kanban/04_review/261015-language2c13-a2-build-list-items-and-table-rows-with-for/spec.md

### f2: The frozen test file is edited in the diff: one compat expectation flipped from syntax-error to output, three header separators changed, and the golden helper's pass logic changed

- Class: drift
- Status: withdrawn
- Serves: m1: m1 and c9 forbid changing an existing test file or expectation. The prompt says any change to a frozen test is a deviation from the plan. The edits are recorded as an approved amendment, but they include a behaviour expectation, not only expected text. The unclosed ROW at END_FOR in a direct TABLE FOR changed from syntax-error to rendering rows. goldenCase() also now returns '' when results[0].passed, which changes how the golden check decides pass or fail.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Compare tests/language/list-table-children.test.ts at fa60d52 with b2e3fb4. COMPAT_ROWS 'TABLE FOR with an unclosed ROW is still a syntax error at END_FOR' (ERR syntax-error 1:40) is replaced by 'TABLE FOR with an unclosed ROW ends the ROW at END_FOR' (OUT rows). Three PIPE_ROWS header separators change from ':-----' to ':------'. goldenCase now returns results[0]?.passed ? '' : message. The lead should confirm that the amendment covers all three edits, the golden helper's pass logic included.
- Evidence: diff:tests/language/list-table-children.test.ts
- Review lead ruling after round 1: withdraw: all three test edits are test defects or direct consequences of criterion lc-close, logged in test_amendments and approved by the project lead

### f3: holdsRow walks every FOR or IF subtree again on every iteration and at every nesting level of the row collector

- Class: simplification
- Status: open
- Serves: cycle-goal: The cycle goal bounds every loop. Rendering is already nodes times iterations, but holdsRow adds another walk of each FOR or IF subtree for each body node in each iteration, and repeats it at every row-mode nesting level. The cost grows by up to maxDepth times without adding meaning, because whether a node holds a ROW is fixed at parse time.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: A direct TABLE FOR over 10000 items whose body holds a deep IF/FOR tree containing a ROW calls holdsRow on that tree 10000 times. Each recursive rowsFromChild then calls tableRowsFrom, which calls holdsRow again on the children. Computing the fact once per node (memoized, or as a parse-time flag) removes the repeated walks.
- Evidence: code:core/src/interpreter.ts:4058, code:core/src/interpreter.ts:697
