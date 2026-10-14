Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0040-remove-standalone-tag-lines-add-trim-mar

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T02:29:01.014Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2

Restatement: Add prompt-friendly whitespace and literal-brace handling to the headless core: by default render drops lines that hold only block tags (IF/ELSEIF/ELSE/END_IF, CASE family, FOR/END_FOR, comments) together with their line break, while LIST/TABLE family tags and lines with text or variables keep their old spacing; '-' markers after the opening or before the closing braces trim adjacent whitespace on every block tag and comment regardless of the option; {{RAW}}...{{END_RAW}} outputs its content literally (spaces kept, CRLF to LF, unclosed RAW is a located syntax-error); a single backslash before {{ outputs a literal {{; render defaults standaloneLines to true, resolveTemplate to false so existing output and tests are unchanged; spec() documents RAW/END_RAW and the option. No existing test expectation may change, no runtime dependency may be added.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T02:34:22.457Z
- Stalled: no
- Brief mismatch: The design context (prompt-aware-contract.md, Whitespace > Trim markers) says trim markers apply first and that a standalone tag line with a leading trim marker therefore loses the line break before it as well as its own. The frozen ws-trim row 'a comment marker before trims before only' (template 'a \n{{-# c #}}\nb') expects 'a\nb' with standaloneLines on, so the comment's own line break is kept. The implementation follows the frozen test: render('a\n{{- IF x}}\nb\n{{END_IF}}\n', {x:true}) gives 'a\nb\n', where the contract sentence implies 'ab\n'. The lead should decide which one is authoritative and update the other. This is not raised as a finding because the frozen test is the plan.
- Raised: f3

Restatement: Add prompt-shaped whitespace handling and literal braces to the core template language. With standaloneLines on, lines that hold only flow-control block tags (IF/ELSEIF/ELSE/END_IF, CASE family, FOR/END_FOR, comments, and RAW/END_RAW) vanish along with their line break. LIST/TABLE-family tags keep their old spacing. Minus markers trim adjacent whitespace on every block tag and comment, whether the option is on or off. RAW/END_RAW emit literal content and report an unclosed RAW as a located syntax error. A single backslash before the opening brace pair escapes it. spec() documents RAW and the option. render defaults the option to true and resolveTemplate defaults it to false, so the existing suite and resolveTemplate's default output stay unchanged. No new runtime dependency.

- Response to f1: withdraw (evidence: code:core/src/whitespace.ts:70, test:ws-standalone: whitespace-only RAW content alone on a line is kept (render, option on), test:rw-raw: whitespace-only content alone on a line is kept (render))

## Findings

### f1: Whitespace-only RAW content on a tag line is deleted under the standalone rule

- Class: defect
- Status: withdrawn
- Serves: c4: With render's default standaloneLines=true, a RAW block whose literal content is only spaces or tabs and that sits on its own line loses that content: the RAW content TEXT token is treated as blank padding between two standalone tags, so the line (content included) is cut. RAW must keep spaces.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render("x\n{{RAW}}\t{{END_RAW}}\ny", {}) returns "x\ny" (expected "x\n\t\ny"); render("x\n {{RAW}} {{END_RAW}} \ny", {}) returns "x\ny". With standaloneLines false the content is kept ("x\n\t\ny"). Smallest fix: in removeStandaloneLines, never treat the TEXT token emitted by scanRaw as blank (mark it, e.g. a raw flag on the token, and exclude it in isBlank / do not cut it).
- Evidence: code:core/src/whitespace.ts:22, code:core/src/whitespace.ts:60, code:core/src/lexer.ts:288, doc:docs/living/architecture/prompt-aware-contract.md
- Reply after round 1 (fixed): restate: whitespace-only RAW content was dropped by the standalone rule; verify: RAW content never joins a standalone run; rows added on and off; evidence: test:tests/promptaware/whitespace.test.ts
- Review lead ruling after round 1: sustain: RAW content is literal; whitespace-only RAW content must survive the standalone rule

### f2: A leading trim marker on a standalone tag line does not also remove the tag line's own line break, contrary to the contract

- Class: goal-risk
- Status: withdrawn
- Serves: card-goal: The card goal says the markers work 'all as the contract says', and the contract states that 'a standalone tag line with a leading trim marker removes the line break before it as well as its own'. The implementation trims the preceding whitespace and then finds the tag no longer at a line start, so the tag's own line break stays.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render("a\n{{- IF x}}\nb\n{{END_IF}}\n", {x:true}) returns "a\nb\n"; the contract's stated outcome is "ab\n". Same for comments: render("a\n\n{{-# c #}}\nb", {}) returns "a\nb" instead of "ab". Smallest fix: decide the standalone status of a line on the untrimmed text (before applyTrimMarkers) and then apply both cuts, or amend the contract sentence if the current behaviour is the intended one. No frozen test pins this case.
- Evidence: doc:docs/living/architecture/prompt-aware-contract.md, code:core/src/whitespace.ts:30, code:core/src/whitespace.ts:91
- Review lead ruling after round 1: withdraw: the frozen tests are the oracle: the contract sentence was wrong and is reworded in the docs card

### f3: An odd run of backslashes before the brace pair does not escape it

- Class: drift
- Status: filed (0043-follow-up-an-odd-run-of-backslashes-befo)
- Serves: c5: With three backslashes before {{x}}, the last backslash sits directly before the pair, yet the lexer reads the leading pair as 'one literal backslash and an active tag'. render then fails with 'Unknown template tag: {{x}}' instead of printing literal braces. With three backslashes before {{IF x}}y{{END_IF}}, the output is two backslashes followed by y. The contract only defines the one- and two-backslash cases, so this is noted for the lead, not a fix request.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: In JS: render(String.fromCharCode(92).repeat(3) + '{{x}}', {}) gives ok=false, 'Unknown template tag: {{x}}'; render(String.fromCharCode(92).repeat(3) + '{{IF x}}y{{END_IF}}', {x:true}) gives two backslashes and 'y'.
- Evidence: code:core/src/lexer.ts:413, doc:docs/living/architecture/prompt-aware-contract.md
- Review lead ruling after round 2: drift: odd backslash runs are an edge outside the criteria; ticketed
