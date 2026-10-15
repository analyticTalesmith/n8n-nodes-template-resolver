Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language2c13-a1-add-limit-offset-an-empty-branch-and-tot

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T13:45:06.997Z
- Stalled: no
- Brief mismatch: Four inconsistencies in the brief. (1) Must-not m1 and criterion c10 forbid changing any existing test file or expectation, with no carve-out. card.md's must-not allows 'the one named amendment (if any)', and spec.md Notes say 56 rows of the card's own test file were corrected under card.json test_amendments. The packet does not show those amendments or who approved them, and the scope-exceptions log covers only spec.md. (2) The manifest lists tests/language/for-window.test.ts as an add, but the diff shows it as an edit of a file that existed at base (index fbc5b52..8bd5691). The lead's post-freeze amendment corrected this only for the four golden-case files. (3) c9 in the criteria and card.md names `@parent.constructor`, but spec.md's fw-own drops it and lists @parent as a non-goal, so that part of c9 cannot be tested on this card. (4) The packet marks the TABLE non-ROW rule as a polish question, but spec.md Notes ask the reviewer to confirm that no previously valid template changes meaning. That is m5, a must-not, so I file the hit as goal-risk and not drift.
- Raised: f1, f2, f3, f4

Restatement: The card replaces the two copies of FOR iteration (plain FOR and TABLE-FOR) with one loop runner on a chained scope stack. A frame holds the item name and the @ metadata and has a parent link. FOR gains limit= and offset= (a literal or a path read outside the loop, validated as a non-negative safe integer in every mode, with missing data governed by strict mode), an {{ELSE}} empty branch rendered in the outer scope, and @total. Conditions, math, filters, ternary, CASE and LIST_ITEM must read through the scope chain without copying the caller's data map. Non-root path segments read own properties only. Iterations, stats and output stay bounded. analyze, render and spec must agree. No runtime dependency, no eval, and no change to previously valid output beyond the two approved exceptions (trailing words after the item name, inherited segments).

## Findings

### f1: The frozen card test file was edited to weaken 56 strict-mode expectations

- Class: goal-risk
- Status: withdrawn
- Serves: m1: tests/language/for-window.test.ts existed at base and is presented as frozen. The diff turns its strict-mode missing-variable expectations into plain output for inherited segments (output, condition, loop item, math with x.constructor + 1 now expecting empty) and for @total in an IF condition outside a loop. A builder who changes the frozen test to fit the code removes the check the plan relied on, against m1 ('change any existing test expectation or existing test file') and c10 ('no existing test file changes'). The new expectations agree with language-contract.md ('a condition never raises a missing-variable error') and with the old silent behaviour for missing non-root segments. Whether the change is legitimate therefore depends on an approval this packet does not show.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Compare base and head of tests/language/for-window.test.ts. The fw-meta row '@total in an IF condition outside a loop' changes from SL(ERR('missing-variable',1,1), OUT('N')) to OUT('N'). The fw-own rows for constructor, __proto__, toString, hasOwnProperty and valueOf change from SL(ERR(...), OUT(...)) to OUT(...), and the math row changes from strict ERR to OUT(''). The rows for xs.constructor and s.toString change the same way. The scope-exceptions log has no row for this file. The smallest restoring change: get the lead's recorded approval of exactly these 56 rows in card.json test_amendments, or revert the edits and make strict mode raise missing-variable for those reads.
- Evidence: diff:tests/language/for-window.test.ts, doc:docs/living/architecture/language-contract.md, test:fw-own: [render-strict] output: x.constructor is missing, test:fw-meta: [render-strict] @total in an IF condition outside a loop
- Review lead ruling after round 1: withdraw: the 56 rows are a named amendment in test_amendments approved by the project lead; strict mode does not raise for missing non-root segments or conditions today (language contract)

### f2: The TABLE-FOR fallback now merges separate non-ROW body nodes into one row, changing previously valid tables

- Class: goal-risk
- Status: open
- Serves: m5: Before, each non-ROW node in a TABLE FOR body was rendered and split on '|' alone, so a body of two IF blocks that each render one row gave two rows per item. tableRowsFrom now joins every consecutive non-ROW node into one string and splits it on '|' once. The same template gives one row per item, its cells join text across the line break (for example '1', a newline, then 'B'), and the markdown table breaks. m5 allows only two output changes (trailing FOR words and inherited segments), and this is neither.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: resolveTemplate on '{{TABLE}}{{HEADER}}K|V{{END_HEADER}}{{FOR xs AS x}}' + newline + '{{IF x.a}}A|1{{END_IF}}' + newline + '{{IF x.b}}B|2{{END_IF}}' + newline + '{{END_FOR}}{{END_TABLE}}' with xs = [{a:true,b:true}]. At base the output has rows '| A | 1 |' and '| B | 2 |'. At head it has one row whose middle cell holds '1', a line break and 'B'. The smallest restoring change: split the merged run into lines before splitting each non-blank line on '|'. That keeps the frozen case '${{x}}|${{@index0}}' as one row and keeps one row per line.
- Evidence: code:core/src/interpreter.ts:628, diff:core/src/interpreter.ts, doc:docs/ephemeral/work/261015-language2c13-a1-add-limit-offset-an-empty-branch-and-tot/spec.md

### f3: A FOR iterable that contains whitespace, which rendered before, is now a syntax error

- Class: goal-risk
- Status: open
- Serves: m5: The old header regex /FOR\s+(.+?)\s+AS\s+(\w+)/i took everything up to the first ' AS ' as the iterable, so '{{FOR my items AS x}}' read the data key 'my items'. Data keys with spaces are plausible: the language contract treats names such as 'Order #' as plain data. parseForHeader now requires words[2] to be AS, so the same template is 'Invalid FOR syntax'. The words involved come before the item name, so this is not the approved 'trailing words after the FOR item name' exception.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: resolveTemplate('{{FOR my items AS x}}${{x}}{{END_FOR}}', new Map([['my items', ['a']]])) returns 'a' at base. At head it throws syntax-error 'Invalid FOR syntax'. The smallest restoring change: find the first standalone AS word (case-insensitive) after FOR and take words[1..asIndex-1] joined by a space as the iterable, then parse the item name and arguments after it.
- Evidence: code:core/src/parser.ts:550, diff:core/src/parser.ts, doc:docs/living/architecture/language-contract.md

### f4: The error path still lists every data key, and does it through Map.prototype.keys, which the fw-no-copy test does not count

- Class: drift
- Status: filed (261015-language2c13-a9-follow-up-the-error-path-still-lists-eve)
- Serves: c8: RootScope.names() calls Map.prototype.keys.call(this.data) and Array.from on the result, so a strict missing-variable error still lists every key of the data map. It does this on purpose through the built-in method, which bypasses the CountingMap overrides. The test 'a loop that errors out still makes no copy' therefore passes without observing the enumeration it was written to forbid. The cost is one read on an error, not one per condition, so the c8 goal (no copy per condition) still holds, but the test no longer proves what its name says.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Run the fw-no-copy error-path case with a Map subclass that counts calls to Map.prototype.keys (or wrap the MapIterator). The data map's key list is enumerated once when MissingVariableError is built. Note for the lead: either accept the one-time read on errors and record it in the spec, or document that the suggestion list bypasses overrides.
- Evidence: code:core/src/scope.ts:30, test:fw-no-copy: a loop that errors out still makes no copy
