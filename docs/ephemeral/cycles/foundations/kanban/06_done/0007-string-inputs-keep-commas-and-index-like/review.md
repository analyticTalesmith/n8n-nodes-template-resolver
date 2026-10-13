Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 0007-string-inputs-keep-commas-and-index-like

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T21:44:41.652Z
- Stalled: no
- Brief mismatch: none
- Raised: f1, f2

Restatement: Values reach the template resolver from n8n as strings. The card fixes two defects in how those strings are coerced. First, repairing a JSON object or array string must remove only structural commas (leading, trailing, doubled) and must never rewrite commas inside string literals. Second, a numeric path segment on a string input (tags.0) must index through the same array coercion FOR uses, so that both 'a,b' and '["a","b"]' index like arrays, in ${{...}} output and in IF conditions. The change must not alter any other behavior, edit existing tests or add a runtime dependency. It serves a cycle goal of fixing the Tier 0 bugs while keeping the core pure and CI green.

## Round 2

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-13T21:51:09.955Z
- Stalled: no
- Brief mismatch: none
- Raised: f3

Restatement: Values reach the template resolver from n8n as strings. Two things must hold. First, when the resolver repairs a JSON object or array string, it removes only structural stray commas (leading, trailing, doubled) and never changes a comma inside a string value. Second, a path such as tags.0 on a string input uses the same coercion FOR uses, so 'a,b' and '["a","b"]' index like arrays in both ${{...}} output and IF conditions. Nothing else may change behavior, no existing test may be edited or deleted, and no runtime dependency may be added. The work has to stay inside coercion.ts, expressions.ts and interpreter.ts.

## Findings

### f1: Conditions lose non-numeric property access on JSON-array strings (for example tags.length), a behavior change outside the named defects

- Class: drift
- Status: sustained
- Serves: m1: Before the change, expressions.resolveValue ran JSON.parse on any string intermediate, so with tags='["a","b"]' a condition such as {{IF tags.length > 1}} reached the parsed array and could read its 'length' property. After the change, tryCoerceStringForPathSegment returns null for a non-numeric segment on a string that is not an object, so resolveValue returns null. The ordering comparison then throws TypeError, or == yields a different result. No defect named in the card asks for this change.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: With base e7069db and head 2a63dc1, run resolveTemplate('{{IF tags.length > 1}}Y{{ELSE}}N{{END_IF}}', new Map([['tags','["a","b"]']]), {strictMode:false}). This holds if the lookup code after the string branch in resolveValue resolves own or array properties such as 'length', which is plausible because it previously received the JSON.parse result unchanged. Expect 'Y' at base and a thrown TypeError, or 'N', at head. The smallest fix: in resolveValue, keep the old JSON.parse result as a fallback when tryCoerceStringForPathSegment returns null, or apply the array coercion only for numeric segments and otherwise keep the JSON.parse behavior.
- Evidence: diff:nodes/TemplateResolver/expressions.ts, diff:nodes/TemplateResolver/coercion.ts, doc:docs/living/architecture/modules/template-resolver.md
- Review lead ruling after round 1: sustain: valid: non-numeric property access such as length on a JSON array string in conditions must keep working
- Review lead ruling after round 1: drift: doubled commas between array elements now repair; intended by the one repair path; recorded
- Review lead ruling after round 1: sustain: restored: the first-round finding was sustained and fixed

### f2: Conditions now repair malformed object strings, and array repair now also collapses comma runs in the middle of an array and commas after '{'

- Class: drift
- Status: filed (0015-follow-up-conditions-now-repair-malforme)
- Serves: m1: In IF conditions, '{"a":1,}' used to fail JSON.parse and give null; it now repairs and resolves. In tryCoerceToArray, '["a",,"b"]' used to fail JSON.parse and fall back to comma splitting; it now parses as ["a","b"]. Both changes follow the card's goal that one coercion serves everywhere and that only structural commas are repaired, so neither needs a fix. They are behavior changes the lead may want recorded.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Run {{IF o.a == 1}}Y{{ELSE}}N{{END_IF}} with o='{"a":1,}' (base: N, head: Y). Run {{FOR a AS x}}[${{x}}]{{END_FOR}} with a='["a",,"b"]' and compare base with head.
- Evidence: diff:nodes/TemplateResolver/coercion.ts, diff:nodes/TemplateResolver/expressions.ts
- Review lead ruling after round 1: drift: intended consequence of one structural-comma repair everywhere; recorded

### f3: Array-string repair now also collapses doubled commas between elements, which changes FOR/index results for inputs like '[1,,2]'

- Class: drift
- Status: filed (0015-follow-up-array-string-repair-now-also-c)
- Serves: m1: At base, tryCoerceToArray stripped only ',]' and '[,' from a '['-prefixed string. '[1,,2]' therefore failed JSON.parse and fell back to comma splitting, which gives string pieces. At head, repairStructuralCommas also collapses the doubled comma, so JSON.parse succeeds and gives the numbers [1,2]. Rendered FOR output is the same. Type-sensitive checks on items, or JSON output of an indexed sub-array, could differ. This is a small widening beyond the named defects. It is not a criterion failure.
- Raised in round 2; sustained 0, failed fixes 0
- Reproduction: Run resolveTemplate('{{FOR a AS x}}{{IF x isNumber}}N{{ELSE}}S{{END_IF}}{{END_FOR}}', new Map([['a','[1,,2]']]), {strictMode:false}) at base and at head, and compare. The results differ only if isNumber distinguishes a numeric string from a number.
- Evidence: diff:nodes/TemplateResolver/coercion.ts, doc:docs/living/architecture/modules/template-resolver.md
- Review lead ruling after round 2: drift: doubled commas between array elements now repair; intended by the single repair path
