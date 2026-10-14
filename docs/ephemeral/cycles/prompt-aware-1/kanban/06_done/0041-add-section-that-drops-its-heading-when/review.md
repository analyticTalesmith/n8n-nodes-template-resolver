Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0041-add-section-that-drops-its-heading-when

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T02:40:51.301Z
- Stalled: no
- Brief mismatch: c1 says consecutive sections are separated by one blank line, but the design contract says they are separated by exactly the blank lines the template holds, with nothing added. The frozen test 'adjacent sections get no blank line added' expects '## A

a
## B

b
', with no blank line between the sections. The implementation follows the contract and the test, so c1's wording is wrong as written.
- Raised: f1, f2, f3

Restatement: Add a SECTION block ({{SECTION title level=N skip_empty=B}}...{{END_SECTION}}) to the headless core: lexer, parser, interpreter, analyze, render stats and spec. It writes a markdown heading (level clamped 1-6, default 2), a blank line and its body with leading and trailing blank lines trimmed, followed by one line break. When the body renders as whitespace only, the whole section disappears (heading and spacing included) and is counted in stats.sectionsOmitted, unless skip_empty=false keeps the heading. Bad titles and levels are type-errors at the tag, an unclosed SECTION is a syntax-error at its tag, and SECTION counts toward maxDepth. Templates without SECTION must render exactly as before, no existing test expectation may change, and no runtime dependency may be added.

## Findings

### f1: An omitted section leaves the template's blank lines from both sides, so its neighbours end up separated by two blank lines

- Class: drift
- Status: filed (0044-follow-up-an-omitted-section-leaves-the)
- Serves: card-goal: The goal-critical question asks whether an empty section leaves no stray blank lines. Take the usual prompt layout of sections separated by one blank line: when the middle section is empty, its own tag lines vanish but the blank line before it and the blank line after it both remain. The surviving sections are then separated by two blank lines, not one, so the omission leaves visible spacing behind. The same happens between paragraphs and in a FOR loop whose iterations are separated by a blank line.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('{{SECTION "A"}} a {{END_SECTION}} {{SECTION "B"}} {{END_SECTION}} {{SECTION "C"}} c {{END_SECTION}} ', {}, {standaloneLines:true}).output is '## A a ## C c ' (two blank lines between A and C). The same template with standaloneLines:false gives '## A a ## C c '. render('p1 {{SECTION "B"}} ${{x}} {{END_SECTION}} p2 ', {x:''}, {standaloneLines:true}).output is 'p1 p2 '. The frozen tests only cover omitted sections with no surrounding blank lines, so they do not catch this. Smallest fix: when skip_empty drops a section, also drop one blank line that the template holds right after it, by collapsing the line break that follows the omitted section's standalone END_SECTION line, so that two neighbours never get more blank lines between them than the template held between any one pair. Alternatively, have the lead record in the contract that the doubled blank line is accepted.
- Evidence: code:core/src/interpreter.ts:340, doc:docs/living/architecture/prompt-aware-contract.md, test:sc-empty: own-line tags around an empty body, standaloneLines true
- Review lead ruling after round 1: drift: the contract adds no spacing around sections by design; collapsing blank lines around an omitted section needs a spacing model decision; authors use trim markers meanwhile; ticketed

### f2: An unclosed SECTION is reported at the latest SECTION tag, even when that section is a closed sibling

- Class: drift
- Status: filed (0045-follow-up-an-unclosed-section-is-reporte)
- Serves: c5: In '{{SECTION "O"}} {{SECTION "I"}}x{{END_SECTION}} more {{SECTION "J"}}y{{END_SECTION}}' only O is unclosed, yet the syntax-error points at line 4 (J), a section that is properly closed. The latestSection heuristic in validateBlocks is what the frozen test 'unclosed inner SECTION is located at the inner tag' needs, and the token structure alone cannot tell that case apart from this one. A fix would therefore conflict with the frozen test; this is for the lead to settle.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('{{SECTION "O"}} {{SECTION "I"}}x{{END_SECTION}} more {{SECTION "J"}}y{{END_SECTION}}') returns the diagnostic [syntax-error, line 4, column 1, 'Unclosed {{SECTION}} block starting at line 4'].
- Evidence: code:core/src/lexer.ts:1127, diff:core/src/lexer.ts, test:sc-errors: unclosed inner SECTION is located at the inner tag
- Review lead ruling after round 1: drift: error location for an unclosed section beside closed siblings; ticketed

### f3: A variable title containing a line break injects extra markdown structure into the heading

- Class: drift
- Status: filed (0046-follow-up-a-variable-title-containing-a)
- Serves: project-goal: With a title taken from data, a value such as 'T # Injected' produces a second top-level heading inside the prompt. The contract rejects only empty or non-string titles, so this is outside the card's criteria; it is noted as a hardening point for prompt assembly.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('{{SECTION t}}x{{END_SECTION}}', {t:'T # Injected'}).output is '## T # Injected x ', with ok true.
- Evidence: code:core/src/interpreter.ts:958, doc:docs/living/architecture/prompt-aware-contract.md
- Review lead ruling after round 1: drift: titles from data with line breaks; ticketed
