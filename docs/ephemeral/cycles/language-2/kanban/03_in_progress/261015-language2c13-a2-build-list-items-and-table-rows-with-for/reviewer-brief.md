## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: grow the language so prompts can be built from data (windowed loops with an empty branch, locals, macros, partials) with every unknown name or bad argument an error and every loop, call and output bounded.
Card goal: FOR and IF (with ELSEIF and ELSE) inside LIST build numbered items and inside TABLE build rows, on the same loop runner as any FOR, with every old template keeping its output; a table-cell pipe after an even run of backslashes is now escaped.
Must not:
- change any existing test expectation or existing test file
- add a runtime dependency
- evaluate template text as code, compile a template-supplied regular expression or read a file named by a template
- change the output or the error of any template that was valid before, except the approved pipe escaping (a cell holding two backslashes and a pipe) and the loosened parse (comment, FOR and IF directly in a LIST or TABLE, an IF holding a ROW inside a TABLE FOR now builds rows)

## Questions

- goal-critical: does every template the base commit accepted (TABLE FOR with ROW or text bodies and several nodes, IF blocks inside bodies, iterables or headers with spaces, a non-iterable in a TABLE, unclosed ROW and LIST_ITEM, nested LIST, FOR and IF inside item content) render the same output? Probe the base commit with such templates.
- goal-critical: does numbering stay gap-free across static, FOR-made and IF-made items, with condition-skipped items numbered by today's rule?
- goal-critical: is any other tag or text inside a FOR or IF that builds items or rows a located `syntax-error` in every mode, at parse time (also in a branch that never renders)?
- goal-critical: does an unclosed LIST_ITEM or ROW end at END_FOR, ELSE, ELSEIF and END_IF, and is a LIST_ITEM inside an unclosed item's FOR or IF a `syntax-error` that says to close with END_LIST_ITEM?
- goal-critical: do FOR and IF in LIST and TABLE count toward maxNodes, maxDepth (parse) and maxIterations and the output limit (run), including ELSE bodies and nested depth?
- goal-critical: does analyze agree with render (loop names scoped, kinds list_item, table, if, elseif, for) and spec stay derived from the lexer table?
- polish: the standalone rule and trim markers around FOR, IF, ELSE and END tags in LIST and TABLE; LIST, TABLE and their parts keep their own spacing; CRLF.
- polish: strict versus lenient, render versus resolveTemplate, missing, null and present values, cyclic and BigInt item values, astral characters, prototype names (`__proto__`, `constructor`) as loop names and data keys.
- polish: pipes in cells: even, odd and zero backslash runs, values with newlines.

## Rubric

- The criteria in `card.json` hold, each with a test named by its id in `tests/language/list-table-children.test.ts`.
- One loop runner serves FOR in LIST, in TABLE and elsewhere; no copy of the iteration code.
- LIST and TABLE parse their children through one rule each, shared by the FOR and IF inside them.
- Strict versus lenient differs only for missing data (ADR 0003); syntax errors are the same in every mode.
- `resolveTemplate` and `render` agree on the language.
- No file outside the card's scope changed.

## Design context

- docs/living/architecture/language-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
- core/src/interpreter.ts
- core/src/parser.ts
- core/src/analyze.ts
- core/src/types.ts
- core/src/spec.ts
