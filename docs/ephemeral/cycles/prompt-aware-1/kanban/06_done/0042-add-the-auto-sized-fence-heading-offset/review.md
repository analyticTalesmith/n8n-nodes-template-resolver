Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0042-add-the-auto-sized-fence-heading-offset

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T02:55:55.571Z
- Stalled: no
- Brief mismatch: The frozen test 'standalone on: a FENCE tag sharing its line with text is not removed' expected "a ```\nx\n``` b\n". That contradicts c1 and the contract, which put a line break after the closing fence. The builder's corrected expectation is right on the merits, but it collides with m1 and with the rule that changing a frozen test is a deviation. The lead amended the manifest for it, so it is recorded here and as a drift finding, not as a fix request.
- Raised: f1, f2, f3, f4, f5, f6

Restatement: Add a FENCE block and a fence filter that wrap content in a backtick code fence. The fence is sized to be longer than any backtick run inside the content, takes an optional lang from a quoted string or a variable path, drops one leading and one trailing line break, and ends with a line break after the closing fence. Add a heading_offset=N filter that shifts ATX headings outside fenced code, clamped to levels 1-6. Give escape_md an inline mode and a block mode, where block also neutralises line-start structure. Wire all of this through the lexer, parser, interpreter, analyze, spec and the standalone-line rule. An unclosed FENCE is a located syntax-error and FENCE counts toward maxDepth. Plain escape_md output and every existing test expectation stay unchanged, and no runtime dependency is added. The point is prompt-shaped output from a deterministic, no-eval core in which data cannot break the markdown structure the template author intended.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T03:00:10.919Z
- Stalled: no
- Brief mismatch: none
- Raised: f7, f8, f9

Restatement: Add prompt-shaped markdown tools to the headless template core: a FENCE...END_FENCE block and a fence filter that wrap content in a backtick code fence always longer than any backtick run inside it (with an optional lang from a quoted string or variable path, one leading and one trailing line break trimmed, closing fence plus line break), a heading_offset=N filter that shifts ATX headings outside fenced code with clamping to 1-6, and escape_md inline/block modes where block also neutralises line-start structure. FENCE must behave like any block (unclosed is a located syntax-error, counts toward maxDepth, standalone-line rule), spec and analyze must know the new block and filters, and none of this may change existing test expectations, plain escape_md output, or add runtime dependencies.

- Response to f1: withdraw (evidence: code:core/src/filters.ts:244, test:fe-autosize: a large body with 300000 backtick runs is sized without failing, test:fe-autosize: the fence filter sizes a large value with 300000 backtick runs)
- Response to f2: withdraw (evidence: code:core/src/filters.ts:241, code:core/src/interpreter.ts:380, test:fe-errors: a lang variable holding a line break is a type-error at the FENCE tag, test:fe-errors: a fence filter lang holding a backtick is a type-error at the variable)
- Response to f3: withdraw (evidence: code:core/src/filters.ts:293, test:ho-offset: a backtick line whose info text holds a backtick is not a fence opener)

## Findings

### f1: A large value makes render throw a RangeError, because fence sizing spreads every backtick run into Math.max

- Class: defect
- Status: withdrawn
- Serves: c1: A FENCE body with about 130k backtick runs (a 260 KB value, well under maxOutputChars of 1,000,000) overflows the call stack in Math.max(...runs). The FENCE block lets a raw RangeError escape render(), which promises that template and data problems never throw. The fence filter returns a misleading type-error, 'Maximum call stack size exceeded', instead of the fenced value. Either way, valid input within the limits gets no c1 output.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('{{FENCE}}${{b}}{{END_FENCE}}', {b: '`a'.repeat(130000)}, {standaloneLines:false}) throws RangeError: Maximum call stack size exceeded. render('${{ b | fence }}', same data) returns ok:false with type-error 'Maximum call stack size exceeded'. With 100000 repeats both still succeed. Smallest fix: find the longest run with a loop or reduce over body.match(/`+/g) instead of spreading into Math.max.
- Evidence: diff:core/src/filters.ts, code:core/src/filters.ts:242, code:core/src/render.ts:39
- Reply after round 1 (fixed): restate: defect in the fence or heading offset for odd values; verify: new table rows fail before and pass after; 146 gate tests, 1230 suite; evidence: test:tests/promptaware/fence.test.ts
- Review lead ruling after round 1: sustain: real defect in a new surface; fix with a test row

### f2: A lang value from data can contain a line break or a backtick and break the fence or close it early

- Class: goal-risk
- Status: withdrawn
- Serves: card-goal: Goal-critical question 'can any body make the fence close early?': the body cannot, but lang is written raw onto the opening fence line. With {{FENCE lang=l}} and l = "md\n```\n# injected", the output is "```md\n```\n# injected\nx\n```\n". The fence closes on line 2, '# injected' renders as a real heading, and the body escapes the code block. A lang containing a backtick ("a`b") makes the opening line an invalid backtick fence in CommonMark, so the body is not fenced at all. Data controls whether the fence holds, which defeats the purpose of an auto-sized fence.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('{{FENCE lang=l}}x{{END_FENCE}}', {l: 'md\n```\n# injected'}, {standaloneLines:false}) returns ok:true with output "```md\n```\n# injected\nx\n```\n". render('{{FENCE lang=l}}# x{{END_FENCE}}', {l: 'a`b'}) returns "```a`b\n# x\n```\n", which is not a valid fence. Smallest fix: in fenceLang, and in the fence filter, make a lang that contains a line break or a backtick a type-error at the FENCE tag or the variable.
- Evidence: code:core/src/interpreter.ts:383, code:core/src/filters.ts:246, doc:docs/living/architecture/prompt-aware-contract.md
- Reply after round 1 (fixed): restate: defect in the fence or heading offset for odd values; verify: new table rows fail before and pass after; 146 gate tests, 1230 suite; evidence: test:tests/promptaware/fence.test.ts
- Review lead ruling after round 1: sustain: real defect in a new surface; fix with a test row

### f3: heading_offset takes a line that starts with a three-backtick code span for an opening fence and stops shifting the headings after it

- Class: defect
- Status: withdrawn
- Serves: c4: The value line '```js``` text' is inline code: a backtick fence's info string may not contain backticks. heading_offset treats it as an unclosed fence opener, so every later heading in the value is left unshifted. That violates 'shifts every ATX heading line'.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('${{ v | heading_offset=1 }}', {v: '```js``` text\n# h'}, {standaloneLines:false}).output is '```js``` text\n# h'; the expected output is '```js``` text\n## h'. Smallest fix: count a backtick fence opener only when the rest of its line contains no backtick.
- Evidence: code:core/src/filters.ts:270, diff:core/src/filters.ts
- Reply after round 1 (fixed): restate: defect in the fence or heading offset for odd values; verify: new table rows fail before and pass after; 146 gate tests, 1230 suite; evidence: test:tests/promptaware/fence.test.ts
- Review lead ruling after round 1: sustain: real defect in a new surface; fix with a test row

### f4: A frozen fence test expectation was changed

- Class: drift
- Status: filed (0047-follow-up-a-frozen-fence-test-expectatio)
- Serves: m1: In tests/promptaware/fence.test.ts, the expectation of 'a FENCE tag sharing its line with text is not removed' changed from "a ```\nx\n``` b\n" to "a ```\nx\n```\n b\n". The new expectation matches c1 and the contract (a line break after the closing fence), and the lead amended the manifest. It is still a change to a frozen test and, read literally, to an existing expectation.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: git diff b12a2ac..ff6d7ff -- tests/promptaware/fence.test.ts shows the one-line change to the expectation.
- Evidence: diff:tests/promptaware/fence.test.ts
- Review lead ruling after round 1: drift: the correction is logged as a test amendment and manifest amendment

### f5: escape_md in the named-parameter form silently falls back to inline

- Class: drift
- Status: filed (0048-follow-up-escape-md-in-the-named-paramet)
- Serves: c5: '${{ v | escape_md:mode=block }}', and any 'escape_md:x=y', sets no params.value, so the filter runs as plain inline instead of raising a type-error. '- x' comes out unescaped although the author asked for block. c5 speaks only of the 'escape_md=mode' form, so this is noted, not a fix request.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('${{ v | escape_md:mode=block }}', {v:'- x'}) returns ok:true with output '- x'.
- Evidence: code:core/src/filters.ts:215
- Review lead ruling after round 1: drift: named-parameter form; ticketed

### f6: Indented ATX headings (one to three leading spaces) are not shifted, although indented fences are recognised

- Class: drift
- Status: filed (0049-follow-up-indented-atx-headings-one-to-t)
- Serves: c4: ' # h' is an ATX heading in CommonMark, but heading_offset leaves it alone, while the fence detector accepts up to three spaces of indent. The contract defines a heading as '#' followed by a space, so this meets the letter of c4; it is noted for the lead.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('${{ v | heading_offset=1 }}', {v:' # h'}).output is ' # h'.
- Evidence: code:core/src/filters.ts:284
- Review lead ruling after round 1: drift: indented headings; ticketed

### f7: heading_offset skips ATX headings indented by one to three spaces, though its own fence detection honours that indent

- Class: drift
- Status: filed (0050-follow-up-heading-offset-skips-atx-headi)
- Serves: c4: c4 says heading_offset shifts every ATX heading line. In CommonMark an ATX heading may be indented by up to three spaces, and the filter's own fence detection accepts that indent (/^ {0,3}(`{3,}|~{3,})/). The heading rewrite only matches /^(#{1,6}) /, so a drafted value with ' # Notes' or ' ## Detail' keeps its level while the headings around it shift. The resulting document hierarchy is wrong (a sub-heading can end up above its parent). A tab after the hashes ('# Title') is skipped the same way.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: render('${{ v | heading_offset=1 }}', { v: ' # indented ## three # top' }, { standaloneLines: false }).output is ' # indented ## three ## top'. The expected output is ' ## indented ### three ## top'. Smallest fix: match /^( {0,3})(#{1,6})(?=[ ])/ in the rewrite and keep the captured indent.
- Evidence: code:core/src/filters.ts:283, code:core/src/filters.ts:297, doc:docs/living/architecture/prompt-aware-contract.md
- Review lead ruling after round 2: drift: same as the ticketed indented-heading limitation (f6): only headings starting at column one are shifted and the README says so; ruled by the project lead for time, ticketed

### f8: A frozen test expectation was changed (FENCE sharing its line with text)

- Class: drift
- Status: withdrawn
- Serves: m1: tests/promptaware/fence.test.ts was frozen at base. The case 'standalone on: a FENCE tag sharing its line with text is not removed' changed its expected output from 'a ``` x ``` b ' to 'a ``` x ``` b '. The new value matches the contract (the closing fence always carries a trailing line break), so the old expectation contradicted c1, and the lead amended the manifest for it. It is still a deviation from the frozen plan, so it is reported for the lead and needs no fix.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: git diff b12a2ace 14d4432 -- tests/promptaware/fence.test.ts shows the edited expectation at the 'sharing its line with text' row.
- Evidence: diff:tests/promptaware/fence.test.ts, doc:docs/living/architecture/prompt-aware-contract.md
- Review lead ruling after round 2: withdraw: duplicate of the logged test amendment

### f9: A fence filter lang that contains '=' or ':' is truncated or misparsed by the existing parseFilter

- Class: drift
- Status: filed (0051-follow-up-a-fence-filter-lang-that-conta)
- Serves: c2: parseFilter splits the shorthand on every '=', so '${{ v | fence="a=b" }}' silently writes a fence with lang 'a'. A lang that contains ':' switches to named-params parsing. This comes from the pre-existing filter parser, not from the new code, and realistic language tags such as c++ and 'my lang' work. Noted for the lead only.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: render('${{ v | fence="a=b" }}', { v: 'x' }, { standaloneLines: false }).output is '```a x ``` '.
- Evidence: code:core/src/filters.ts:22
- Review lead ruling after round 2: drift: parseFilter limitation predates the card; ticketed
