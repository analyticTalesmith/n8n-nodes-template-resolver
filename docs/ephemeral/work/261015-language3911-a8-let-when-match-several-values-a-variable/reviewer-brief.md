## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: a CASE branch can match several values, a variable or a comparison (`{{WHEN "a", "b"}}`, `{{WHEN other}}`, `{{WHEN >= 10}}`), so authors stop chaining IF for every choice. Same behavior in render and resolveTemplate; analyze agrees with render.
Must not:
- change any existing test expectation
- add a runtime dependency
- evaluate template text as code or compile a template-supplied regular expression
- let an unknown name or bad parameter pass in lenient mode (ADR 0003)

## Questions

goal-critical: does `{{WHEN "a", "b"}}` match either value, with commas inside quotes kept, any spacing around commas, single or double quotes, and the first matching WHEN winning?
goal-critical: does `{{WHEN other}}` compare the CASE value with the variable's value as text under the equality rule of the operators card (quoted text compares as text, unquoted numbers numerically), and does a missing variable error in strict mode and read as empty text in lenient mode, located at the WHEN?
goal-critical: do `== != > < >= <=` work, `!=` being the negation of `==`, the ordered operators numeric with a located `type-error` for a non-numeric side (a missing or null value included), never a raw exception for a cyclic value or BigInt?
goal-critical: is every malformed WHEN (empty, empty list item, unterminated quote, an item that is neither literal nor path, a comparison with no or several operands, a comparison mixed with a list) a `syntax-error` located at the WHEN tag in render, validate and analyze?
goal-critical: does `analyze` record every WHEN variable (list or comparison) as `case` usage, exclude literals, loop names and `@` names, and agree with what render reads?
goal-critical: do existing CASE behaviors stay (`WHEN ""` matching a missing or null subject, text match of arrays and numbers, DEFAULT, the existing `value` field) and do equality and numeric helpers come from `expressions.ts` rather than copies?
polish: is there one quote-aware comma scanner shared by the WHEN parse and the list-literal parse?

## Rubric

- each criterion is met by the diff and its test
- the card scope is respected (types, parser, interpreter, analyze, spec, expressions, the case test and the lang-case golden case)
- unknown names, operators and filters are still errors in every mode

## Design context

- docs/living/architecture/modules/template-resolver.md
- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
