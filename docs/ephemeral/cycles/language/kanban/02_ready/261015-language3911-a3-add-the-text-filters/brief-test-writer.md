# Brief: test writer for the text filters card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`language`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal: authors can reshape text with `upper`, `lower`, `title`, `replace`, `indent`, `quote`, `round` and `default`, each a row in `TEXT_FILTERS` in the registry, with wrong or missing parameters reported as located type-errors.
Your objective: turn each criterion into failing table-driven jest tests that fail for the right reason (an assertion, never a missing import), then record red evidence. The tests are the oracle the implementer is held to, so each must break on a plausible wrong implementation.

## Decisions already made

Read first (paths relative to the worktree below): `docs/ephemeral/cycles/language/kanban/01_shaping/261015-language3911-a3-add-the-text-filters/card.md` and `card.json`, `docs/living/architecture/language-contract.md` (Filters), ADR 0003 (`docs/living/decisions/adr/0003-unknown-names-are-always-errors.md`), and `tests/language/filter-registry.test.ts` (the registry card's tests: learn call shapes and diagnostic shapes there and from `tests/headless/*.test.ts`). Reading implementation files in `core/src` is not allowed; you may observe today's behavior by running `render` on small templates.

Human-approved spellings (plan section C): arguments are `name`, `name=value` (the shorthand parameter is named `value`), or `name:key="v",key="v"`. Settled semantics for this card (the project lead's reading of the card; the rows you write are the oracle):

- Every filter first coerces its input to text exactly as the output step prints it (null and missing give the empty text; numbers, booleans, arrays and objects give their printed form), except `default`, which looks at the raw value.
- `upper`, `lower`: no parameter (`upper=1` and `upper:x=1` are type-errors).
- `title`: first letter of each whitespace-separated word upper-cased, the rest of each word lower-cased (`hello WORLD` gives `Hello World`); no parameter.
- `replace:find="a",with="b"`: every non-overlapping occurrence of the literal text `find` replaced by `with`; `find` is required and must be non-empty; `with` is optional and defaults to the empty text (so it deletes). Matching is literal text, never a pattern (`find="."` replaces only dots).
- `indent=N` (or no parameter: default 2): N spaces added at the start of every non-empty line; a line is empty only when it has zero characters (line breaks, including CRLF, are kept as they are; a final line break does not gain spaces). N is an integer from 0 to 100; anything else (`indent=x`, `indent=1.5`, `indent=-1`, `indent=101`, an empty value) is a type-error.
- `quote`: the text as a JSON double-quoted string (quotes, backslashes, line breaks and control characters escaped as JSON does); no parameter.
- `round=N` (or no parameter: default 0): the input text read as a number and rounded half away from zero to N decimal places in decimal arithmetic (`1.005` with `round=2` gives `1.01`, `2.5` gives `3`, `-2.5` gives `-3`), printed with exactly N decimals (`3.1` with `round=2` gives `3.10`; a negative zero prints `0`). N is an integer from 0 to 20; anything else is a type-error. Input that is not a finite number (including empty text) passes through unchanged as text.
- `default="x"` (shorthand parameter `value`, required; `default` with no parameter is a type-error): returns `x` when the raw input is not truthy (missing, null, empty text, 0, false, empty list, empty object), else the input unchanged. A missing variable only reaches the filter in lenient mode (strict mode reports the missing variable first; that is outside this card), so test missing data in lenient mode. `??` keeps its current behaviour: add rows that observe today's `??` on the same inputs and pin it, so the two are shown to differ where they do.
- No existing filter output changes; the registry's first six names and order are unchanged and the eight new names follow in the order upper, lower, title, replace, indent, quote, round, default.

## Owned files and scope

Worktree (work only here, branch `feature/add-the-text-filters`): `C:/Users/jon03/Documents/Projects/Personal/n8n-nodes-template-resolver/.worktrees/feature-add-the-text-filters`. `node_modules` is linked; run jest as `node node_modules/jest/bin/jest.js --runTestsByPath <file> --json`; never redirect output to `nul`. You may add or change only:

- `tests/language/filters-text.test.ts` (new): table-driven `it.each` rows; every test name starts with its criterion id (`ft-text`, `ft-params`, `ft-default`); a message on each assertion.
- The card's `card.json` in the worktree (`docs/ephemeral/cycles/language/kanban/01_shaping/261015-language3911-a3-add-the-text-filters/card.json`): only the `traces` list of each criterion (`tests/language/filters-text.test.ts#<criterion id>`).
- `docs/ephemeral/work/261015-language3911-a3-add-the-text-filters/red-evidence.md` (written by the red-evidence script).

`core/src/filters-text.ts` already exports the empty `TEXT_FILTERS`; no stub is needed, so the tests fail by assertion today (unknown-filter diagnostics or wrong output). Do not edit core.

## How the work is judged

- `ft-text`: a table per filter of input (given as data) to output, rendered with `render` in lenient mode, covering empty text, a missing variable, a number (`3.14159`, `0`, `1000000`), booleans, null, an array and an object (printed forms), multi-line and CRLF text, unicode, and the parameters above including defaults; rows showing the six existing filters' output is unchanged; chaining (`| upper | replace:find="A",with="b"`, `| round=1 | quote`); and the registry holding the eight new names after the six.
- `ft-params`: for each of `replace` (no `find`; empty `find`; undeclared `x=1`), `indent` and `round` (non-integer, negative, out of range, empty), `default` (no value), and each no-parameter filter given a parameter: `render` returns ok:false with a diagnostic of code `type-error` located at the variable's line and column (put the variable on line 2 at a column other than 1), in lenient mode and in strict mode (give the variable data in strict mode so the error is the parameter, not a missing variable); `validate` agrees.
- `ft-default`: the not-truthy table above (missing in lenient mode, null, empty text, 0, false, empty list, empty object give the replacement; non-empty text, 1, true, a non-empty list and object are unchanged; observe today's truthiness for the strings `0` and `false`); the `??` rows.
- Wrong implementations that must fail: replace using a regular expression or replacing only the first match; `find="."` matching any character; `indent` indenting empty lines or after the final line break; `quote` not escaping; `round` using binary `toFixed` (1.005); `title` leaving the rest of a word as is; `default` treating `0` or `false` as present; `default` implemented as `??`.

## Model and effort

sonnet, medium: mechanical table writing against precise rules.

## Result and status

Commit in the worktree with Conventional Commits, subject at most 72 characters, no ids or card codes, no attribution lines, for example `test(filters): pin the text filters`. Then run `node .process/core/scripts/red-evidence.mjs <worktree path> 261015-language3911-a3-add-the-text-filters` (the worktree path as the project directory, run from the worktree) and commit the `red-evidence.md` it writes; it must exit 0. Never push, touch main, or move or claim cards. Save your report as `report-test-writer.md` in the worktree's card folder named above (not committed) and return the same text, saying which wrong implementation each table catches, ending with a status: done, done with concerns, needs context, or blocked.
