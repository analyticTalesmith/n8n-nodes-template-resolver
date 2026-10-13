Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0006-parse-pipe-defaults-else-if-and-tag-argu

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T21:44:25.667Z
- Stalled: no
- Brief mismatch: none
- Raised: f1

Restatement: Fix three parsing defects in the template resolver without changing anything else. (1) A ${{x ?? "..."}} default whose quoted text contains a pipe must be kept whole as the default instead of being split into a bogus filter. (2) Real filters written after such a default must still apply to the result. (3) The two-word {{ELSE IF cond}} must be a SyntaxError whose message points the user to ELSEIF, instead of quietly acting as a plain ELSE. (4) ELSE and END_* tags that carry trailing arguments must be SyntaxErrors. The edits must stay inside lexer.ts and parser.ts, must not touch existing tests, must not add dependencies, and must not change behavior outside these defects. This serves the cycle goal of fixing the Tier 0 bugs in a deterministic, no-eval template core.

## Findings

### f1: Quote-aware pipe split treats an apostrophe in an unquoted default as an opening quote and swallows the following filters

- Class: defect
- Status: sustained
- Serves: m1: A template with an unquoted default that contains an apostrophe, followed by a filter, e.g. ${{name ?? it's | head=2}}, used to render 'it' (default it's, then head=2). Now splitOutsideQuotes opens a quote at the apostrophe and never closes it, so the whole tail becomes the default and the output is the literal text "it's | head=2". The filter is silently dropped and filter text leaks into the prompt. That is a behavior change outside the named defects.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: resolveTemplate("${{x ?? it's | head=2}}", new Map(), { strictMode: false }). At base e7069db, expr.split('|') gives ['x ?? it\'s', 'head=2'], so the default is it's and the output is 'it'. At head 3bceae8, splitOutsideQuotes sets quote="'" at the apostrophe and never resets it, so parts = ["x ?? it's | head=2"], the default is "it's | head=2" (no outer quotes to strip), and the output is "it's | head=2". The same happens with ${{x ?? don't know | trim}}.
- Evidence: diff:nodes/TemplateResolver/parser.ts, code:nodes/TemplateResolver/parser.ts:174, doc:docs/living/architecture/modules/template-resolver.md
- Review lead ruling after round 1: sustain: valid: an apostrophe in an unquoted default must not swallow later filters
