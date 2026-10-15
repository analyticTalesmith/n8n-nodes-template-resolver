## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language so prompts can be built from data (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error and every loop, call and output bounded.
Card goal: one loop runner on a scope stack serves FOR and TABLE-FOR; FOR gains `limit=`, `offset=`, an `{{ELSE}}` empty branch and `@total`; variable reads no longer copy the data per condition and path segments read own properties only.
Must not:
- change any existing test expectation or existing test file
- add a runtime dependency
- evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- let an unknown FOR argument or a bad window value pass in lenient mode (ADR 0003)
- change `resolveTemplate` output for a template that was valid before, except trailing words after the FOR item name (now a syntax error) and inherited path segments (now missing)

## Questions

- goal-critical: is any loop name or `@` name still readable after END_FOR, or inside the ELSE body, or is an outer loop's name lost after an inner loop ends (also after an error)?
- goal-critical: does every error for a bad FOR argument or window value carry the FOR tag's line and column, in strict and lenient mode, including a branch that never renders for syntax errors?
- goal-critical: does anything still copy the data map during a run (conditions, math, filters, ternary, CASE, LIST_ITEM conditions)?
- goal-critical: do offset-skipped items stay out of `maxIterations` and `stats.iterations`, and is the output limit enforced inside the loop, the ELSE body and TABLE rows?
- goal-critical: can `x.constructor`, `x.__proto__`, `x.toString` or other inherited members be reached by a path in output, conditions or math?
- goal-critical: do analyze, render and spec agree (loop name not an input; limit and offset paths are usage `for`; ELSE body without the loop name)?
- polish: are the TABLE legacy rules (non-iterable silent even in strict, non-ROW body split on `|`) unchanged, with ELSE rows rendered for a non-iterable?
- polish: cyclic values, BigInt, astral characters and prototype names (`__proto__`, `constructor`) as loop item names or data keys.

## Rubric

- The criteria in `card.json` hold, each with a test named by its id in `tests/language/for-window.test.ts`.
- One loop runner serves both FOR and TABLE-FOR; no copy of the iteration code remains.
- The scope frames carry a parent link; the loop frame is restored on every exit path.
- Strict versus lenient differs only for missing data (ADR 0003); bad arguments fail in both.
- `resolveTemplate` and `render` agree on the language; render-only fixes stay in render.
- No file outside the card's scope changed.

## Design context

- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
- core/src/interpreter.ts
- core/src/parser.ts
- core/src/expressions.ts
- core/src/analyze.ts
- core/src/types.ts
