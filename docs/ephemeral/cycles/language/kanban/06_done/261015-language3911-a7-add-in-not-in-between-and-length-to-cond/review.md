Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.

# Review log: 261015-language3911-a7-add-in-not-in-between-and-length-to-cond

## Round 1

- Reviewer: opus fallback (same model family as the builder; has repository access)
- At: 2026-10-15T04:45:17.956Z
- Stalled: no
- Brief mismatch: The spec says the substring test of `in` against text is case-sensitive and is 'the same result as "text" contains x'. The module document (template-resolver.md, Conditions and operators) describes contains as case-insensitive (regex flag i). The frozen test `x in "hello world"` with x="LO" expects false, so both statements cannot hold unless contains is case-sensitive today. The diff does not show the contains switch, so I could not settle which one is true. The lead should correct whichever document is wrong.
- Raised: f1, f2, f3, f4

Restatement: The card adds `in`, `not in`, `between [lo, hi]` and a `.length` path segment to the condition language of a deterministic template engine that never evaluates template text as code. A quoted literal on either side of `==`, `!=` or an `in` list item now compares as text. An unquoted number to the right of contains, startsWith or endsWith keeps the digits as written. Any unrecognized word next to an operator is a located type-error in strict and lenient mode alike. render and resolveTemplate must behave the same, analyze and spec() must list the new operators and the variables they read, and the work must not change existing tests, add a runtime dependency, compile a template-supplied regex, or let an unknown name through in lenient mode.

## Gate-verified closures

- f2: verified by project lead at 2026-10-15T04:49:31.957Z; gate run at commit 928ba1d5bed8; test tests/language/operators.test.ts; files core/src/expressions.ts, docs/living/architecture/language-contract.md, docs/living/architecture/modules/template-resolver.md
- f3: verified by project lead at 2026-10-15T04:49:31.957Z; gate run at commit 928ba1d5bed8; test tests/language/operators.test.ts; files core/src/expressions.ts, docs/living/architecture/language-contract.md, docs/living/architecture/modules/template-resolver.md

## Findings

### f1: Two living architecture documents edited outside the card's files scope, with no scope exception logged

- Class: drift
- Status: withdrawn
- Serves: card-goal: The card allows writes only to analyze.ts, expressions.ts, interpreter.ts, spec.ts and operators.test.ts. The diff also rewrites docs/living/architecture/language-contract.md (new 'Condition operators' section) and docs/living/architecture/modules/template-resolver.md. Both documents already say state: built, so they describe unmerged behavior as built, bypassing the delta and apply flow that records durable facts. The new contract text also adds rules the spec does not settle, such as a missing right side of in giving false, and drops the ternary node from the list of error locations.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Compare the Manifest and scope section (files_scope) with the diff headers. diff --git a/docs/living/architecture/language-contract.md and diff --git a/docs/living/architecture/modules/template-resolver.md are present, and the scope exceptions log says none were logged.
- Evidence: diff:docs/living/architecture/language-contract.md, diff:docs/living/architecture/modules/template-resolver.md, doc:card.md Scope
- Review lead ruling after round 1: withdraw: living documents are changed on purpose: docs_impact lists them and docs_deferred is true

### f2: in / not in skips the left-side type check when the right side is missing or null

- Class: goal-risk
- Status: verified
- Serves: c1: isMember returns false (so not in returns true) when items and text are both null, before it checks the left side. With `a in list`, an object, array, cyclic or BigInt `a` and no `list` in the data, the result is a silent false or true instead of the type-error the spec gives for such a left side. The same template errors or passes depending on whether unrelated data is present.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('{{IF a in list}}Y{{ELSE}}N{{END_IF}}', { a: { k: 1 } }) renders 'N' instead of a type-error, because isMember returns at `if (items === null && text === null) return false;` before the !isScalar(left.value) check. No frozen test row covers an untestable left side with a missing right side.
- Evidence: diff:core/src/expressions.ts, code:core/src/expressions.ts:625, doc:spec.md in / not in: 'type-error: ... the left side is an array, an object (cyclic or not) or a BigInt'
- Reply after round 1 (fixed): restate: isMember accepted a missing right side before checking the left operand type; verify: isMember now throws a located type-error for array, object or BigInt on the left first; 26 new rows pass; evidence: code:core/src/expressions.ts

### f3: between coerces booleans to numbers, so a boolean operand passes instead of being a type-error

- Class: goal-risk
- Status: verified
- Serves: c2: tryEvaluateBetween runs each operand through tryCoerceToNumber, which per the module document converts booleans to 1 or 0. `flag between [0, 1]` with flag=true returns true, and `x between [true, 5]` reads the bound as 1. The spec limits coercion to 'numbers and numeric text' and says any non-numeric operand is a type-error. If > also coerces booleans, the spec's parenthetical is wrong and needs settling instead.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: render('{{IF x between [0, 1]}}Y{{ELSE}}N{{END_IF}}', { x: true }) is expected to give a type-error. By the coercion documented for tryCoerceToNumber ('booleans (1/0)') it renders 'Y'. No frozen test row covers a boolean operand.
- Evidence: code:core/src/expressions.ts:657, doc:docs/living/architecture/modules/template-resolver.md Coercion: 'Number: numbers (not NaN), booleans (1/0), non-empty trimmed numeric strings', doc:spec.md between: 'the same number coercion as > (numbers and numeric text)'
- Reply after round 1 (fixed): restate: between coerced booleans to numbers; verify: between rejects boolean values and literals as a type-error; 12 new rows pass; evidence: code:core/src/expressions.ts

### f4: describeOperand calls JSON.stringify on operands in error messages, which the spec rules out

- Class: drift
- Status: withdrawn
- Serves: card-goal: The spec says 'do not call JSON.stringify on an operand in a message'. describeOperand does exactly that, inside a try/catch. Raw exceptions are still avoided, so the criterion holds, but a large operand is fully serialized into the error text, and the code departs from the contract's stated rule.
- Raised in round 1; sustained 0, failed fixes 0
- Reproduction: Read describeOperand in the diff: `const json = JSON.stringify(value);` is used by the between, in and > error messages.
- Evidence: diff:core/src/expressions.ts, code:core/src/expressions.ts:149
- Review lead ruling after round 1: sustain: the spec forbids JSON.stringify of operands in messages; use describeOperand without it
- Review lead ruling after round 1: withdraw: fixed: describeOperand no longer stringifies operands; never-throws rows pass
