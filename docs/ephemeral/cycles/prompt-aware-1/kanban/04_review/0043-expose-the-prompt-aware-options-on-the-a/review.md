Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0043-expose-the-prompt-aware-options-on-the-a

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-14T03:14:34.667Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2

Restatement: Make the prompt-aware language features from this cycle (standalone-line whitespace, trim markers, RAW and brace escaping, SECTION, FENCE, heading_offset, escape modes) reachable and documented on every surface. The HTTP API takes a boolean options.standaloneLines and rejects anything else with 400 invalid-request. The OpenAPI document describes the option and is still served byte for byte. The CLI takes mutually exclusive --standalone-lines and --no-standalone-lines flags (both together exit 2) and lists them in the usage text. The n8n node gets a boolean option that defaults to true and reaches render. Golden cases prove realistic prompts with standalone lines on and off. The README and changelog document every construct with examples that work. The living contract and module documents are ready to become built when the cycle merges. No existing test expectation may change, nothing may be documented that the code does not do, and no runtime dependency may be added.

## Findings

### f1: A frozen surfaces test expectation (FOR_OFF) was changed. The new value is the correct one.

- Class: drift
- Status: withdrawn
- Serves: m1: tests/promptaware/surfaces.test.ts was frozen at base and must not change. The diff edits FOR_OFF from a string with three line breaks before 'end' to one with two. That is a change to a plan test expectation.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Run git diff b3333a6 d7b337d -- tests and see one line changed in surfaces.test.ts. The new value is right: with standalone lines off, the FOR template renders the body twice ('\n- 1\n' and '\n- 2\n') followed by '\nend\n', which is '\n- 1\n\n- 2\n\nend\n'. Core produces exactly that, so the frozen string was a test-authoring error. The lead amended the manifest to allow this edit. No fix is needed; this note is for the record.
- Evidence: diff:tests/promptaware/surfaces.test.ts, test:sf-api: FOR lines, false, doc:docs/living/architecture/prompt-aware-contract.md
- Review lead ruling after round 1: withdraw: logged test amendment; the new value is correct

### f2: A documentation card rewrote a settled trim-marker rule in the contract to match the code, with no decision record

- Class: drift
- Status: withdrawn
- Serves: cycle-goal: Before this card, the contract said a standalone tag line with a leading trim marker removes the line break before it as well as its own (so 'a\n{{- IF x}}\nb\n{{END_IF}}\n' would give 'ab\n'). The code gives 'a\nb\n', and this card rewrote the contract sentence to describe the code. The README now matches the code, so m2 holds. But a design rule under ADR 0002 was reversed inside a docs card and the cycle's design record does not show it.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Run core render('a\n{{- IF x}}\nb\n{{END_IF}}\n', {x: true}); it returns 'a\nb\n'. Then compare the Trim markers bullet in prompt-aware-contract.md at base and at head. The lead should decide whether the code's behavior is the intended rule and, if so, note the change in the cycle's design record or ADR 0002.
- Evidence: diff:docs/living/architecture/prompt-aware-contract.md, doc:docs/living/architecture/prompt-aware-contract.md
- Review lead ruling after round 1: withdraw: the contract is a planned living document; the rule it states follows the frozen tests, recorded in the close review
