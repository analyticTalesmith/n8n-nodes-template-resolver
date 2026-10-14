Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0042-add-the-auto-sized-fence-heading-offset

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T02:55:55.571Z
- Stalled: no
- Brief mismatch: The frozen test 'standalone on: a FENCE tag sharing its line with text is not removed' expected "a ```\nx\n``` b\n". That contradicts c1 and the contract, which put a line break after the closing fence. The builder's corrected expectation is right on the merits, but it collides with m1 and with the rule that changing a frozen test is a deviation. The lead amended the manifest for it, so it is recorded here and as a drift finding, not as a fix request.
- Raised: f1, f2, f3, f4, f5, f6

Restatement: Add a FENCE block and a fence filter that wrap content in a backtick code fence. The fence is sized to be longer than any backtick run inside the content, takes an optional lang from a quoted string or a variable path, drops one leading and one trailing line break, and ends with a line break after the closing fence. Add a heading_offset=N filter that shifts ATX headings outside fenced code, clamped to levels 1-6. Give escape_md an inline mode and a block mode, where block also neutralises line-start structure. Wire all of this through the lexer, parser, interpreter, analyze, spec and the standalone-line rule. An unclosed FENCE is a located syntax-error and FENCE counts toward maxDepth. Plain escape_md output and every existing test expectation stay unchanged, and no runtime dependency is added. The point is prompt-shaped output from a deterministic, no-eval core in which data cannot break the markdown structure the template author intended.

## Findings

### f1: A large value makes render throw a RangeError, because fence sizing spreads every backtick run into Math.max

- Class: defect
- Status: fixed
- Serves: c1: A FENCE body with about 130k backtick runs (a 260 KB value, well under maxOutputChars of 1,000,000) overflows the call stack in Math.max(...runs). The FENCE block lets a raw RangeError escape render(), which promises that template and data problems never throw. The fence filter returns a misleading type-error, 'Maximum call stack size exceeded', instead of the fenced value. Either way, valid input within the limits gets no c1 output.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('{{FENCE}}${{b}}{{END_FENCE}}', {b: '`a'.repeat(130000)}, {standaloneLines:false}) throws RangeError: Maximum call stack size exceeded. render('${{ b | fence }}', same data) returns ok:false with type-error 'Maximum call stack size exceeded'. With 100000 repeats both still succeed. Smallest fix: find the longest run with a loop or reduce over body.match(/`+/g) instead of spreading into Math.max.
- Evidence: diff:core/src/filters.ts, code:core/src/filters.ts:242, code:core/src/render.ts:39
- Reply after round 1 (fixed): restate: defect in the fence or heading offset for odd values; verify: new table rows fail before and pass after; 146 gate tests, 1230 suite; evidence: test:tests/promptaware/fence.test.ts
- Review lead ruling after round 1: sustain: real defect in a new surface; fix with a test row

### f2: A lang value from data can contain a line break or a backtick and break the fence or close it early

- Class: goal-risk
- Status: fixed
- Serves: card-goal: Goal-critical question 'can any body make the fence close early?': the body cannot, but lang is written raw onto the opening fence line. With {{FENCE lang=l}} and l = "md\n```\n# injected", the output is "```md\n```\n# injected\nx\n```\n". The fence closes on line 2, '# injected' renders as a real heading, and the body escapes the code block. A lang containing a backtick ("a`b") makes the opening line an invalid backtick fence in CommonMark, so the body is not fenced at all. Data controls whether the fence holds, which defeats the purpose of an auto-sized fence.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('{{FENCE lang=l}}x{{END_FENCE}}', {l: 'md\n```\n# injected'}, {standaloneLines:false}) returns ok:true with output "```md\n```\n# injected\nx\n```\n". render('{{FENCE lang=l}}# x{{END_FENCE}}', {l: 'a`b'}) returns "```a`b\n# x\n```\n", which is not a valid fence. Smallest fix: in fenceLang, and in the fence filter, make a lang that contains a line break or a backtick a type-error at the FENCE tag or the variable.
- Evidence: code:core/src/interpreter.ts:383, code:core/src/filters.ts:246, doc:docs/living/architecture/prompt-aware-contract.md
- Reply after round 1 (fixed): restate: defect in the fence or heading offset for odd values; verify: new table rows fail before and pass after; 146 gate tests, 1230 suite; evidence: test:tests/promptaware/fence.test.ts
- Review lead ruling after round 1: sustain: real defect in a new surface; fix with a test row

### f3: heading_offset takes a line that starts with a three-backtick code span for an opening fence and stops shifting the headings after it

- Class: defect
- Status: fixed
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
