Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0040-remove-standalone-tag-lines-add-trim-mar

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T02:29:01.014Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2

Restatement: Add prompt-friendly whitespace and literal-brace handling to the headless core: by default render drops lines that hold only block tags (IF/ELSEIF/ELSE/END_IF, CASE family, FOR/END_FOR, comments) together with their line break, while LIST/TABLE family tags and lines with text or variables keep their old spacing; '-' markers after the opening or before the closing braces trim adjacent whitespace on every block tag and comment regardless of the option; {{RAW}}...{{END_RAW}} outputs its content literally (spaces kept, CRLF to LF, unclosed RAW is a located syntax-error); a single backslash before {{ outputs a literal {{; render defaults standaloneLines to true, resolveTemplate to false so existing output and tests are unchanged; spec() documents RAW/END_RAW and the option. No existing test expectation may change, no runtime dependency may be added.

## Findings

### f1: Whitespace-only RAW content on a tag line is deleted under the standalone rule

- Class: defect
- Status: sustained
- Serves: c4: With render's default standaloneLines=true, a RAW block whose literal content is only spaces or tabs and that sits on its own line loses that content: the RAW content TEXT token is treated as blank padding between two standalone tags, so the line (content included) is cut. RAW must keep spaces.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render("x\n{{RAW}}\t{{END_RAW}}\ny", {}) returns "x\ny" (expected "x\n\t\ny"); render("x\n {{RAW}} {{END_RAW}} \ny", {}) returns "x\ny". With standaloneLines false the content is kept ("x\n\t\ny"). Smallest fix: in removeStandaloneLines, never treat the TEXT token emitted by scanRaw as blank (mark it, e.g. a raw flag on the token, and exclude it in isBlank / do not cut it).
- Evidence: code:core/src/whitespace.ts:22, code:core/src/whitespace.ts:60, code:core/src/lexer.ts:288, doc:docs/living/architecture/prompt-aware-contract.md
- Review lead ruling after round 1: sustain: RAW content is literal; whitespace-only RAW content must survive the standalone rule

### f2: A leading trim marker on a standalone tag line does not also remove the tag line's own line break, contrary to the contract

- Class: goal-risk
- Status: withdrawn
- Serves: card-goal: The card goal says the markers work 'all as the contract says', and the contract states that 'a standalone tag line with a leading trim marker removes the line break before it as well as its own'. The implementation trims the preceding whitespace and then finds the tag no longer at a line start, so the tag's own line break stays.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render("a\n{{- IF x}}\nb\n{{END_IF}}\n", {x:true}) returns "a\nb\n"; the contract's stated outcome is "ab\n". Same for comments: render("a\n\n{{-# c #}}\nb", {}) returns "a\nb" instead of "ab". Smallest fix: decide the standalone status of a line on the untrimmed text (before applyTrimMarkers) and then apply both cuts, or amend the contract sentence if the current behaviour is the intended one. No frozen test pins this case.
- Evidence: doc:docs/living/architecture/prompt-aware-contract.md, code:core/src/whitespace.ts:30, code:core/src/whitespace.ts:91
- Review lead ruling after round 1: withdraw: the frozen tests are the oracle: the contract sentence was wrong and is reworded in the docs card
