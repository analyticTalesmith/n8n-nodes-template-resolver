Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0027-locate-every-diagnostic-and-bound-the-wo

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T00:55:56.021Z
- Stalled: no
- Brief mismatch: m1 (do not change what any currently passing template renders) cannot fully hold alongside c6's mandated defaults. A template that renders today with more than 10000 total FOR iterations, more than 1000000 output characters or nesting deeper than 32 will throw once this change lands, including through the n8n node, which uses the default limits. The criteria only promise 'a template under every limit renders as before', so m1 should be read as limited to templates under every default limit. The lead should confirm that reading.
- Raised: f1, f2, f3

Restatement: The headless core must report every template error, at parse time or at runtime, as a TemplateError with a diagnostic code (syntax-error, missing-variable, unknown-filter, type-error, limit-*) and the 1-based line and column of the node that failed, never a 1:1 placeholder. It must also bound the work with configurable limits: total FOR iterations, output length and block nesting depth. The defaults are 10000 / 1000000 / 32 and are exported as DEFAULT_LIMITS, and a partial limits option keeps the remaining defaults. The work must not change what a passing template renders, must not add runtime dependencies, and must not bring n8n or I/O into core. This is the engine surface that the structured render result, the API and the CLI will report from.

## Findings

### f1: Frozen test diagnostics.test.ts was edited (column 8 -> 10); the edit is a correct recount, not a weakening

- Class: drift
- Status: withdrawn
- Serves: c1: A frozen test changed after the freeze could hide an unmet criterion. Here line 3 ' ${{i}} ${{nope}}' puts '${{nope}}' at column 10, so the original 8 was wrong and the amended expectation is the stricter, correct one.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Count the columns of line 3 in 'a\n{{FOR xs AS i}}\n ${{i}} ${{nope}}\n{{END_FOR}}': two spaces, '${{i}}' at 3-8, a space at 9, '${{nope}}' starting at 10.
- Evidence: diff:tests/headless/diagnostics.test.ts, test:dg-syntax: missing variable inside a FOR body is located at the variable
- Review lead ruling after round 1: withdraw: the recount is a correct fix, logged as a test amendment and manifest amendment

### f2: The parser's default maxDepth now also makes analyze() throw limit-depth for nesting deeper than 32, and analyze has no way to pass limits

- Class: drift
- Status: filed (0033-follow-up-the-parser-s-default-maxdepth)
- Serves: cycle-goal: analyze() of a template nested 40 deep succeeded at base and now throws LimitError limit-depth at line 33. analyze.ts is outside the card's scope and was not updated to pass limits, so analyze/validate behaviour changed silently through the Parser constructor default.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Run analyze('{{IF t}}\n'.repeat(40) + 'x' + '{{END_IF}}'.repeat(40)) at head: it throws code limit-depth, line 33. At base fa7fa47 it returns an analysis.
- Evidence: code:core/src/analyze.ts:70, code:core/src/parser.ts:34, diff:core/src/parser.ts
- Review lead ruling after round 1: drift: analyze outside this card scope; the next card handles analyze options

### f3: A very long ELSEIF chain still overflows the stack with an uncoded RangeError instead of a located diagnostic

- Class: drift
- Status: filed (0032-follow-up-a-very-long-elseif-chain-still)
- Serves: card-goal: 'errors carry code, line and column everywhere': ELSEIF is parsed and interpreted as recursive nested IfNodes that the depth counter does not count. A chain of about 20000 ELSEIFs (a template of about 260 KB) throws 'RangeError: Maximum call stack size exceeded' with no code, line or column. This was already true at base and is not a block-nesting case under c5, so it is noted rather than raised as a fix request.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Call resolveTemplate('{{IF t}}a' + '{{ELSEIF t}}b'.repeat(20000) + '{{END_IF}}', new Map([['t','x']]), {strictMode:true}): it throws RangeError with undefined code, line and column. With 5000 it renders.
- Evidence: code:core/src/parser.ts:300, code:core/src/interpreter.ts:232
- Review lead ruling after round 1: drift: pre-existing stack overflow on very long ELSEIF chains, not part of the criteria
