Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0007-raw-block-outputs-its-text-literally

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T18:21:46.019Z
- Stalled: no
- Brief mismatch: c5 is marked verify: review and requires that the jest suite and the node:test suite pass, but the packet carries no test-run output and the reviewer may not run anything, so the 'suites pass' half of c5 cannot be judged here. Only 'jest suite files are untouched' is checkable: the visible diff touches no test file, and the 6 omitted paths are stated to be under docs/ephemeral/. Likewise c6 needs a person's confirmation of the README output, and no such record is in the packet. Separately, the project goal says 'correct for the n8n node', while the spec puts the n8n node file out of scope; if the node inspects the template text outside the lexer, the card cannot meet the cycle goal inside its own scope (see f1).
- Raised: f1, f2, f3, f4

Restatement: Add a {{RAW}}...{{END_RAW}} block to the template resolver, done only in the lexer: after a tag whose trimmed content is exactly RAW, everything up to the first END_RAW tag becomes one ordinary Text token (not trimmed, CRLF turned into LF, no token when empty). The parser and interpreter stay untouched, so the block repeats in loops and vanishes in untaken branches like any other text. An unclosed RAW must throw the lexer's SyntaxError at the RAW tag's line and column, templates without RAW must behave exactly as before, and the README must gain one RAW section with an accurate example. No nesting, escapes or options.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T18:24:11.431Z
- Stalled: no
- Brief mismatch: c5 is marked verify: review and asks that the jest suite and the node:test suite pass, but the packet holds no test-run output and the reviewer may run nothing. I can confirm from the diff only that no jest file is touched and the frozen test file is unchanged; suite passes (including the builder's 'failed before, pass after' claims for f1 to f3) rest on the builder's word. The lead should attach run output or change how c5 is verified.
- Raised: f5

Restatement: Add a {{RAW}}...{{END_RAW}} block to the template resolver, implemented only in the lexer: everything between the two tags becomes one ordinary Text token (untrimmed, CRLF turned into LF), so the parser and interpreter need no change and the text renders literally wherever the block sits. An unclosed RAW must fail with a SyntaxError at the RAW tag's line and column. Templates without RAW must behave exactly as before. The README must document the tag with one accurate example. The feature has to work both in the n8n node and as a headless library, with no nesting, escapes or options.

- Response to f1: withdraw (evidence: code:nodes/TemplateResolver/utils.ts:18, test:rb-01 variable detection ignores everything inside a RAW block, test:rb-01 variable detection still finds variables outside a RAW block)
- Response to f2: withdraw (evidence: test:rb-04 a tag after a multi-line RAW block reports the right position, test:rb-04 an unknown tag right after a RAW block reports the right position, diff:test-node/raw-block-review.test.ts)
- Response to f3: withdraw (evidence: test:rb-03 a RAW block keeps blank lines and spaces when rendered inside an IF, test:rb-03 RAW keeps leading and trailing spaces and turns CRLF into LF, diff:test-node/raw-block-review.test.ts)

## Findings

### f1: Strict Mode / variable detection in the n8n node may still treat ${{name}} inside RAW as a required variable

- Class: goal-risk
- Status: withdrawn
- Serves: cycle-goal: A prompt template holding a literal code sample such as {{RAW}}${{name}}{{END_RAW}} is run in the n8n node with Strict Mode on (the documented default) and no mapping for 'name'. If the node detects variables by scanning the template text rather than the lexer's tokens, it reports 'name' as missing and errors, so the template still cannot include tag-like text in the node. The detection code is not in the packet, so this is unverified.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: In the n8n node, set Template to '{{RAW}}${{name}}{{END_RAW}}', leave Variable Mappings empty, keep Strict Mode on and enable Show Detected Variables. Expected: output '${{name}}', no error, and 'name' absent from detected_variables and missing_variables. Failure: a missing-variable error, or 'name' listed. If it fails, the smallest fix is to make detection ignore RAW spans, which needs a scope exception because the node file is out of scope.
- Evidence: doc:README.md (Node Configuration: 'Strict Mode — Error on missing variables (default: on)'; Output: detected_variables / missing_variables), diff:nodes/TemplateResolver/lexer.ts (the change is lexer-only; no detection path is touched), test:rb-01 a RAW block renders its content literally with no variables (goes through Lexer/Parser/Interpreter directly, bypassing the node's strict-mode path)
- Reply after round 1 (fixed): restate: The node scans template text for variables, so a variable tag inside RAW would be reported missing in strict mode.; verify: extractAllVariables now drops RAW spans before scanning; two new tests failed before and pass after.; evidence: code:nodes/TemplateResolver/utils.ts:17, test:rb-01

### f2: Line and column tracking across multi-line raw content is not demonstrated

- Class: goal-risk
- Status: withdrawn
- Serves: c4: scanRaw skips the content and closing tag with this.advance(closing.index) and this.advance(closing[0].length). The definition of advance is not in the packet. If advance(n) does not count newlines inside the skipped span, every token and error after a multi-line RAW block reports the wrong line and column, including a later unclosed RAW.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Lex '{{RAW}}\nx\r\ny\n{{END_RAW}}\n{{RAW}}z'. Expected: SyntaxError 'Unclosed {{RAW}} block' with line 5, column 1. Also lex '{{RAW}}\n\n{{END_RAW}}{{BOGUS}}' and expect the unknown-tag error at line 3, column 12. Any other position is the failure. Smallest fix if it fails: advance character by character with the lexer's existing newline handling, or add these two cases as tests if it already passes.
- Evidence: diff:nodes/TemplateResolver/lexer.ts (this.advance(closing.index); this.advance(closing[0].length)), test:rb-04 an unclosed RAW block throws a SyntaxError at the RAW tag position (single line only, no preceding RAW block), test:rb-03 RAW keeps leading and trailing spaces and turns CRLF into LF (checks value only, never line or column)
- Reply after round 1 (rebut, evidence): restate: Line and column tracking after a multi-line raw block was not shown.; verify: Added tests for both reproductions: unclosed RAW after the block reports line 5 column 1 and an unknown tag after an empty block reports line 3 column 12; both passed with no lexer change.; evidence: test:rb-04

### f3: Render-level preservation of leading/trailing whitespace and blank lines in raw text is untested

- Class: goal-risk
- Status: withdrawn
- Serves: c3: c3 says the raw text is not trimmed, but the only rb-03 test stops at the lexer. The raw content is emitted as an ordinary Text token, so any whitespace handling the unchanged parser or interpreter applies to text (trimming block bodies, dropping newlines next to block tags, collapsing blank lines) would also apply to raw content. A multi-line code sample inside an IF or FOR body could then lose its leading newline or indentation. The parser and interpreter are not in the packet, so this is unverified.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Render '{{IF t}}{{RAW}}\n\n a\r\n\n\n b \n{{END_RAW}}{{END_IF}}|' with t = true. Expected output exactly '\n\n a\n\n\n b \n|'. Any difference is the failure. Because m1 forbids interpreter changes, a failure needs a lead decision; a pass needs only this case added as a test.
- Evidence: test:rb-03 RAW keeps leading and trailing spaces and turns CRLF into LF (uses lex(), not render()), doc:README.md (LIST and conditional examples put block tags on their own lines without extra blank lines in the output, which implies whitespace handling downstream of the lexer), diff:nodes/TemplateResolver/lexer.ts (content pushed as plain TokenType.TEXT)
- Reply after round 1 (rebut, evidence): restate: Render-level whitespace in raw text was untested.; verify: Added a render test inside an IF body with leading newlines, indentation and blank lines; output matches exactly with no parser or interpreter change.; evidence: test:rb-03

### f4: Closing-tag match allows only spaces and tabs inside the braces

- Class: drift
- Status: filed (0008-follow-up-closing-tag-match-allows-only)
- Serves: card-goal: The spec says the closing tag may have inner spaces 'as other tags do'. Other tags are matched on their trimmed content, which presumably also tolerates a newline inside the braces. The regex /\{\{[ \t]*END_RAW[ \t]*\}\}/ does not, so '{{RAW}}x{{END_RAW\n}}' is reported as an unclosed RAW block. This is a polish-level inconsistency and no criterion fails on it.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Lex '{{RAW}}x{{END_RAW\n}}' and compare with how '{{END_IF\n}}' is accepted elsewhere.
- Evidence: diff:nodes/TemplateResolver/lexer.ts

### f5: Variable detection strips only the unspaced {{RAW}}/{{END_RAW}} spelling, so the f1 fix misses tag forms the lexer accepts and the living doc documents

- Class: goal-risk
- Status: fixed
- Serves: cycle-goal: The lexer opens a block on any tag whose trimmed content is RAW and closes it on /\{\{[ \t]*END_RAW[ \t]*\}\}/, and the living doc tells users the closing tag may be written {{ END_RAW }}. extractAllVariables removes only the exact text {{RAW}}...{{END_RAW}}. A node template such as '{{RAW}}${{name}}{{ END_RAW }}' or '{{ RAW }}${{name}}{{END_RAW}}' renders literally in the lexer, but detection still reports 'name'; with Strict Mode on (the default) and no mapping the node raises a missing-variable error, so the template still cannot carry tag-like text in the node. A lesser side effect of the same text-level regex: a literal {{RAW}} inside a comment, followed later by a real block, makes detection drop every variable in between, so Strict Mode would stop flagging them.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: Call extractAllVariables('{{RAW}}${{name}}{{ END_RAW }}') and extractAllVariables('{{ RAW }}${{name}}{{END_RAW}}'). Expected [] for both; the regex at utils.ts:18 does not match either, so the result is ['name']. In the node: Template '{{RAW}}${{name}}{{ END_RAW }}', no mappings, Strict Mode on; expected output '${{name}}', failure is a missing-variable error. Smallest fix: use the lexer's tag shapes in the strip regex, for example /\{\{\s*RAW\s*\}\}[\s\S]*?\{\{[ \t]*END_RAW[ \t]*\}\}/g, and add these two cases to test-node/raw-block-review.test.ts.
- Evidence: diff:nodes/TemplateResolver/utils.ts, code:nodes/TemplateResolver/utils.ts:18, code:nodes/TemplateResolver/lexer.ts:237, code:nodes/TemplateResolver/lexer.ts:296, doc:docs/living/product/raw-block.md, test:rb-01 variable detection ignores everything inside a RAW block
- Reply after round 2 (fixed): restate: Variable detection only dropped the unspaced RAW tag spelling the lexer also accepts with spaces.; verify: The regex now accepts whitespace inside both tags like the lexer; two new tests failed before and pass after, suite 28 of 28.; evidence: code:nodes/TemplateResolver/utils.ts:18, test:rb-01
