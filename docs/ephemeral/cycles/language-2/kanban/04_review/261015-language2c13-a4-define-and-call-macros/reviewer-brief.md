## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language so prompts can be built from data (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error and every loop, call and output bounded.
Card goal: `{{DEFINE name(params)}}...{{END_DEFINE}}` (top level, hoisted) and `{{CALL name(args)}}` (single tag) give reusable text blocks; a body sees its parameters and the data only; recursion, fan-out and output growth across calls are bounded by the depth, iteration and output limits; an error inside a body is located at the failing body node and names the macro.
Must not:
- change any existing test file, except the logged amendment of the `st-keywords` keyword-table row in `tests/language/set.test.ts` (it lists DEFINE and CALL)
- add a runtime dependency
- evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- let an unknown macro, a wrong argument count or a bad argument pass in lenient mode (ADR 0003)
- change the output or the error of any template that was valid before, except a template with no CALL that nests more than 256 blocks under a raised `maxDepth` (now `limit-depth`) and the position of a `limit-output` that now trips at the deeper child that crossed the limit

## Questions

- goal-critical: do three independent bounds hold across a CALL? Depth: an infinite recursion, a mutual recursion, 32 chained calls each 31 blocks deep, and recursion through nested blocks at `maxDepth` 1000 all end in a located `limit-depth` (never a RangeError, never a `type-error`, never a hang); iterations: every CALL counts one, a fan-out of two per level over 14 levels ends in `limit-iterations` with `stats.iterations` bounded; output: a macro called many times from an IF body, a CASE clause or another macro stops once the held output passes the limit, not after all the calls. Probe with raised `maxDepth`, raised `maxIterations`, small `maxOutputChars`, and templates that multiply (macros calling macros twice or ten times).
- goal-critical: do `render`, `validate` and `analyze` stay fast and finite on a fan-out or mutually recursive set of macros (they never follow a CALL), and does a stray RangeError (very deep nesting under a huge `maxDepth`) become a `limit-depth` diagnostic in `render`, `validate` and `analyze` instead of a thrown RangeError or a `type-error`?
- goal-critical: is the body isolated? It cannot read the caller's SET locals, FOR item, `@index0` or `@total`; parameters shadow data; a name that is not a parameter reads the data; a SET inside a body never leaks to the caller, to a second call or to the data; a SET of a parameter name is a `syntax-error`; the caller's scope is intact after a call, also after an error caught by nothing; two calls (also recursive ones) never share bindings.
- goal-critical: is every new diagnostic located at the failing node (never 1:1, never moved to the CALL), does an error inside a body keep its own line and column and name the innermost macro with the CALL's line and column, and do link errors (unknown macro, wrong count, duplicate DEFINE, DEFINE inside a block, bad parameter or argument syntax) appear before any output, in every mode, even in a branch or a DEFINE that never runs?
- goal-critical: are macro names prototype safe (`__proto__`, `constructor`, `toString`, `hasOwnProperty` as macro names, parameter names and path names; an unknown one is "Unknown macro")?
- goal-critical: does every template the base commit accepted keep its output and error (nesting at exactly `maxDepth`, LIST and TABLE with FOR and IF children, loops pinned at the FOR on output overflow, `analyze` and `validate` of old templates, `{{constructor}}`-style tags, cyclic and BigInt values, `resolveTemplate` and `render` apart)? Probe the base commit with such templates.
- goal-critical: does `analyze` agree with render (parameters are locals only inside the body; a top-level SET before a DEFINE is not a local inside the body; CALL path arguments are usage kind `call`; `blocks` counts DEFINE; `macros` present only when DEFINEs exist; unknown macro a diagnostic `validate` reports as `analysis-warning`, wrong count and duplicate thrown) and is `spec().blocks` derived so the surfaces test passes without edits?
- polish: the standalone rule (DEFINE and END_DEFINE lines vanish, a CALL line leaves its line break) and trim markers on all three; a CALL inside a LIST_ITEM, a ROW cell, a legacy TABLE-FOR body and a SECTION; CRLF; astral characters in arguments and bodies; `maxNodes` counts DEFINE and CALL.

## Rubric

- The criteria in `card.json` hold, each with a test named by its id in `tests/language/macros.test.ts`.
- One runtime depth counter covers blocks and calls; one place counts iterations; one running output check covers bodies.
- Strict versus lenient differs only for missing data (ADR 0003); syntax and link errors are the same in every mode.
- `resolveTemplate` and `render` agree on the language.
- The macro table is a Map; the body scope never reads the caller's locals; the caller's data is never written.
- `core/src/macros.ts` takes already parsed DEFINE nodes (a second source, partials, only adds nodes).
- No file outside the card's scope changed.

## Design context

- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
- core/src/interpreter.ts
- core/src/scope.ts
- core/src/parser.ts
- core/src/lexer.ts
- core/src/analyze.ts
- core/src/errors.ts
- core/src/render.ts
- core/src/types.ts
- core/src/spec.ts
