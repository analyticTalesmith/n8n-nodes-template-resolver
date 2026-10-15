## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language so prompts can be built from data (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error and every loop, call and output bounded.
Card goal: `{{SET name = expression}}` binds a block-scoped local from the same value evaluator `${{ }}` uses; the value is kept (an array stays an array); a SET never leaks out of its block; the lexer keyword table is exported and read by own property only.
Must not:
- change any existing test expectation, except the logged amendment of `tests/language/surfaces.test.ts` (its block table derived from the lexer keyword table; no row removed)
- add a runtime dependency
- evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- let an unknown name or bad argument pass in lenient mode (ADR 0003)
- change the output or the error of any template that was valid before, except `{{constructor}}`-style tags (now an unknown tag), the tags `{{SET ...}}` (statement now) and a string filter result longer than `maxOutputChars` (now a located `limit-output`)

## Questions

- goal-critical: does every template the base commit accepted keep its output and error (`${{ }}` with defaults, filters, math with and without filters, missing names in strict and lenient mode, `__proto__` and `constructor` as names, cyclic and BigInt values, `resolveTemplate` and `render` apart)? Probe the base commit with such templates.
- goal-critical: does a SET stay inside its block (IF branch, CASE clause, FOR iteration, LIST item, SECTION, FENCE, ROW, top level) and never reach the caller's data or the next FOR iteration or an outer block after an inner rebinding?
- goal-critical: do `${{ }}` and SET share one evaluator, so `??`, math, filter and missing-variable errors have the same code and message, and SET errors are located at the SET tag (never 1:1)?
- goal-critical: in `render`, does `SET t = 0.1 + 0.2` bind the number that prints (0.3) and in `resolveTemplate` the plain number? Is `/0` an error in `render` only?
- goal-critical: a missing value: strict mode `missing-variable` at the SET, lenient mode binds `null` (a later read prints empty, no error)?
- goal-critical: are `{{SET}}`, `{{SET x}}`, `{{SET = 1}}`, a name with `@`, an invalid identifier and a live loop name each a located `syntax-error` in every mode and at parse time (also in a branch that never renders, also through `validate` and `analyze`)? Are `__proto__`, `constructor`, `toString` ordinary names and `{{constructor}}` an unknown tag? Is `{{END_SET}}` an unknown tag?
- goal-critical: is a string value or filter result longer than `maxOutputChars` a located `limit-output` (`SET a = a | json` repeated stops), for `${{ }}` as well?
- goal-critical: does `analyze` agree with render (the SET name a local from the tag to the end of its block, never an input; a read before it an input; variables read in the expression have kind `set`) and is `spec().blocks` derived so that a keyword with no `spec()` entry fails the surfaces test?
- polish: the standalone rule (a line of only SET tags vanishes) and trim markers; SET outputs nothing; a SECTION holding only a SET.
- polish: limits (`maxNodes` counts SET; iterations and depth unchanged), astral characters in values, the OpenAPI `usedIn` no longer a closed enum.

## Rubric

- The criteria in `card.json` hold, each with a test named by its id in `tests/language/set.test.ts`.
- One value evaluator serves `${{ }}` and SET; no second copy of the variable logic.
- Strict versus lenient differs only for missing data (ADR 0003); syntax errors are the same in every mode.
- `resolveTemplate` and `render` agree on the language; `render` differs only where the criteria say (math value, `/0`).
- The scope never writes the caller's data; scopes are Maps (no prototype names reach engine objects).
- No file outside the card's scope changed.

## Design context

- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
- core/src/interpreter.ts
- core/src/scope.ts
- core/src/parser.ts
- core/src/lexer.ts
- core/src/analyze.ts
- core/src/types.ts
- core/src/spec.ts
