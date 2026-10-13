Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0006-parse-pipe-defaults-else-if-and-tag-argu

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T21:44:25.667Z
- Stalled: no
- Brief mismatch: none
- Raised: f1

Restatement: Fix three parsing defects in the template resolver without changing anything else. (1) A ${{x ?? "..."}} default whose quoted text contains a pipe must be kept whole as the default instead of being split into a bogus filter. (2) Real filters written after such a default must still apply to the result. (3) The two-word {{ELSE IF cond}} must be a SyntaxError whose message points the user to ELSEIF, instead of quietly acting as a plain ELSE. (4) ELSE and END_* tags that carry trailing arguments must be SyntaxErrors. The edits must stay inside lexer.ts and parser.ts, must not touch existing tests, must not add dependencies, and must not change behavior outside these defects. This serves the cycle goal of fixing the Tier 0 bugs in a deterministic, no-eval template core.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T21:51:09.244Z
- Stalled: no
- Brief mismatch: none
- Raised: f2, f3

Restatement: Fix three parsing defects in the template resolver's lexer and parser, and change nothing else. (1) A ?? default whose quoted text contains a pipe must render literally, and any real filters after it must still apply. (2) {{ELSE IF cond}} must be a SyntaxError whose message points to ELSEIF, instead of being read as a plain ELSE. (3) END_* and ELSE tags with trailing arguments must be SyntaxErrors. The work must not change other behavior, must not edit or delete existing tests, and must not add a runtime dependency. All of this serves a deterministic, no-eval template core that passes CI.

## Findings

### f1: Quote-aware pipe split treats an apostrophe in an unquoted default as an opening quote and swallows the following filters

- Class: drift
- Status: sustained
- Serves: m1: A template with an unquoted default that contains an apostrophe, followed by a filter, e.g. ${{name ?? it's | head=2}}, used to render 'it' (default it's, then head=2). Now splitOutsideQuotes opens a quote at the apostrophe and never closes it, so the whole tail becomes the default and the output is the literal text "it's | head=2". The filter is silently dropped and filter text leaks into the prompt. That is a behavior change outside the named defects.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: resolveTemplate("${{x ?? it's | head=2}}", new Map(), { strictMode: false }). At base e7069db, expr.split('|') gives ['x ?? it\'s', 'head=2'], so the default is it's and the output is 'it'. At head 3bceae8, splitOutsideQuotes sets quote="'" at the apostrophe and never resets it, so parts = ["x ?? it's | head=2"], the default is "it's | head=2" (no outer quotes to strip), and the output is "it's | head=2". The same happens with ${{x ?? don't know | trim}}.
- Evidence: diff:nodes/TemplateResolver/parser.ts, code:nodes/TemplateResolver/parser.ts:174, doc:docs/living/architecture/modules/template-resolver.md
- Review lead ruling after round 1: sustain: valid: an apostrophe in an unquoted default must not swallow later filters
- Review lead ruling after round 1: drift: an unclosed leading quote in an unquoted default is an edge case; follow-up ticket
- Review lead ruling after round 1: sustain: restored: the first-round finding was sustained and fixed

### f2: An unquoted default that starts with an apostrophe still opens a quote that never closes, so the filters after it are swallowed

- Class: drift
- Status: filed (0015-follow-up-an-unquoted-default-that-start)
- Serves: m1: This is the same class of failure as sustained f1. The revision opens a quote only when the quote character directly follows ^, ?? or =. An unquoted default whose first character is an apostrophe ('90s hits, 'tis, 'em) still opens a quote and never closes it. At base, '${{x ?? '90s hits | head=3}}' rendered "'90": the default is "'90s hits" and then head=3 applies. At head, the whole tail "'90s hits | head=3" becomes the default (only one outer quote, so nothing is stripped), the filter is dropped, and the filter text leaks into the prompt. The lead ruled that an apostrophe in an unquoted default must not swallow later filters.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: resolveTemplate("${{x ?? '90s hits | head=3}}", new Map(), { strictMode: false }). At base e7069db: expr.split('|') gives ["x ?? '90s hits", 'head=3'], and the output is "'90". At head 1c62228: in splitOutsideQuotes, text.slice(0, i) is 'x ?? ', which matches /(^|\?\?|=)\s*$/, so quote is set to "'". No closing "'" follows, so parts = ["x ?? '90s hits | head=3"] and the output is "'90s hits | head=3". An unclosed double quote does the same: '${{x ?? "abc | trim}}'. Smallest fix: if splitOutsideQuotes reaches the end of the string with a quote still open, rescan from the position where that quote opened and treat the quote character as plain text there, so an unterminated quote never hides a separator.
- Evidence: diff:nodes/TemplateResolver/parser.ts, code:nodes/TemplateResolver/parser.ts:580-601, doc:docs/living/architecture/modules/template-resolver.md
- Review lead ruling after round 2: drift: an unclosed leading quote in an unquoted default is an edge case; follow-up ticket

### f3: Pre-existing tests passing cannot be confirmed from the packet; END_* tags beyond the frozen examples now reject arguments

- Class: drift
- Status: filed (0016-follow-up-pre-existing-tests-passing-can)
- Serves: cycle-goal: The packet includes no pre-existing test files and no CI result. The new lexer check rejects arguments on every END_* tag (END_WHEN, END_DEFAULT, END_LIST_ITEM, END_HEADER, END_ROW, END_TABLE, END_LIST, END_CASE), not only END_IF and END_FOR. That matches the card's wording ('closing and ELSE tags'), so it is in scope. But if any existing test or golden file writes a closing tag with a trailing word, that test would now fail. This is noted for the lead to confirm with a green test run; it is not a fix request.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: Run the full jest suite at head 1c62228 and search the existing tests and fixtures for /\{\{END_[A-Z_]+\s+\S/ or /\{\{ELSE\s+\S/.
- Evidence: diff:nodes/TemplateResolver/lexer.ts, code:nodes/TemplateResolver/lexer.ts:246-262
- Review lead ruling after round 2: drift: rejecting arguments on every END tag is intended; full suite passes
