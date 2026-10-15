# Brief: test writer for the collection filters card

## Objective and why

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal (`docs/ephemeral/cycles/language/CYCLE.md`): authors can shape values, branch, loop, name, declare and reuse prompt fragments in the language itself without leaving the house style or the no-eval core.
Card goal (`card.md` and `card.json` next to this brief): authors can join, count, pick, order, de-duplicate, slice, split and serialize lists with the filters `join length first last sort unique slice lines json`, each a definition in `COLLECTION_FILTERS` of the one filter registry.

Your objective: write the failing tests that pin the three criteria (`fc-collection`, `fc-order`, `fc-json`) in `tests/language/filters-collection.test.ts`, before any implementation exists, and record red evidence. You are not blinded: read the card, the contract `docs/living/architecture/language-contract.md`, ADR 0003, the registry (`core/src/filters.ts`, `core/src/types.ts` FilterDefinition) and the existing registry tests `tests/language/filter-registry.test.ts` (copy its style: `RAW` options, the located-error row pattern with a variable on line 2 column 3). Read no implementation of the behavior under test (there is none).

Work in the worktree `C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-add-the-collection-filters` (branch `feature/add-the-collection-filters`; `node_modules` is a junction, never run npm install). Never redirect output to `nul`.

## Decisions already made

Settled by the project plan (`_aperture-runs/n8n/plans/slice-c-language.md` section C) and the brief: filter argument form is `join=", "`, `sort=key`, `slice:start=1,end=3`; the shorthand `name=value` is the parameter `value`; unknown names and bad or undeclared parameters are errors in every mode (ADR 0003); no new dependency; no template-supplied regular expression.

Settled by the build lead from the criteria (the exact behavior to pin; each row below becomes table rows):

1. Interface: `core/src/filters-collection.ts` exports `COLLECTION_FILTERS: FilterDefinition[]` with these rows in this order: `join` (params text `join=SEP`, paramNames `["value"]`), `length` (`[]`), `first` (`[]`), `last` (`[]`), `sort` (`sort[=key]`, paramNames `["value"]`), `unique` (`[]`), `slice` (`slice[:start=N,end=N]`, paramNames `["start","end"]`), `lines` (`[]`), `json` (`[]`). Every row has a non-empty description. No dispatch or parser change.
2. Array coercion: list filters (`join first last sort unique slice`) coerce their input exactly as FOR does (`tryCoerceToArray` from `core/src/coercion.ts`): an array passes through, a string such as `"a,b,c"` or `'["x","y"]'` becomes a list, a number or boolean becomes a one-item list. A null, undefined or missing value (lenient mode) is the empty list. An object input to `join first last sort unique slice` is a type-error (message says the filter needs a list). Do not mutate the input.
3. `join=SEP`: element text forms joined with SEP. Element text form is what the output step prints (`valueToText`): null element is `""`, number its plain form, object or array its JSON. SEP is required: `${{ xs | join }}` is a type-error; `join=""` is allowed. Empty list gives `""`. Returns a string.
4. `length`: array gives its item count; a string gives its character count (not coerced to a list: `"a,b,c"` is 5); an object gives its key count; a number or boolean its text form's character count; null or missing 0. Returns a number.
5. `first` / `last`: the first / last item of the coerced list; an empty list gives null (prints as empty). `"a,b,c" | first` is `a`.
6. `slice:start=S,end=E`: `Array.prototype.slice` semantics over the coerced list (negative counts from the end); `start` defaults to 0 and `end` to the length; each given value must be an integer text (`/^[+-]?\d+$/`), else a type-error naming the parameter. Returns a list (prints as JSON, e.g. `["b","c"]`). `slice` with no parameters returns a copy of the whole list.
7. `lines`: the text form of the value split on `\r\n`, `\r` or `\n`; one trailing line break does not add an empty last item (`"a\nb\n"` gives `["a","b"]`, `""` and null give `[]`, `"\n"` gives `[""]`, `"a\r\nb"` gives `["a","b"]`). Returns a list.
8. `unique`: the coerced list with the first occurrence of each value kept, order kept. Two values are equal when they have the same type and the same value; objects and arrays are equal when their stable JSON texts (the `json` form below) are equal. `1` and `"1"` are different. Returns a list.
9. `sort`: returns a new list, stable. Order: all numbers first (numeric ascending), then all strings (by UTF-16 code unit, so `"B" < "a"` and `"10" < "9"`), then every other value (booleans, null, objects, arrays) after them in their original relative order. `sort=key` orders object items by their own property `key` using the same comparison; items that are not objects or lack the key go after those that have it, in original order; equal keys keep original order (stability row required). Without a key, objects are in the "other" group. Deterministic: sorting the same input twice gives equal output, and the input is not mutated.
10. `json`: compact JSON text of the value (no spaces), object keys sorted by code unit at every depth, so `{b:1,a:{d:1,c:2}}` gives `{"a":{"c":2,"d":1},"b":1}`; arrays keep their order; a string gives its quoted JSON text; a number or boolean its plain text; null, undefined and missing give `null`. A cyclic value (an object or array that contains itself) is a type-error whose message says the value is cyclic, located at the variable. A repeated but non-cyclic reference (same object twice in one list) is not an error.
11. Parameter errors: every collection filter rejects an undeclared parameter as a located type-error (`length:x=1`, `join:sep=","`, `sort:by=k`, `slice:count=2`, `json:pretty=1`), in lenient and strict mode, in render, validate and analyze alike (this comes from the registry; pin it for each of the nine filters). `slice` rejects `slice:start=a` and `slice:end=1.5`.
12. Filters return values: a returned list or number prints as the output step prints it (a list as compact JSON, `["b","c"]`), and a chained filter receives the value (`${{ xs | sort | first }}` gives the smallest, `${{ xs | unique | length }}` gives a number).

## Owned files and scope

You may add `tests/language/filters-collection.test.ts` and edit `core/src/filters-collection.ts` only. In `core/src/filters-collection.ts` write signature-only stubs: the nine rows with the right `name`, `params`, `description` and `paramNames`, and an `apply` that throws `new Error("not implemented")`. Nothing else may change. Commit the test file and the stubs together (Conventional Commits, for example `test(language): pin the collection filters`; no plan codes, no attribution lines).

## How the work is judged

- Tests are table-driven `it.each` rows; each test name starts with its criterion id: `fc-collection`, `fc-order` or `fc-json` (the parameter-error rows belong to `fc-json`, as the criterion says). Exercise the filters both by `render("${{ v | join=\", \" }}", {v}, RAW)` (output and diagnostics) and, for exact return values, by `FILTER_REGISTRY`/`COLLECTION_FILTERS` `apply` called directly (`apply(input, params)`), including empty list, missing (null/undefined), string, number, object, nested array inputs.
- Cover for each criterion: every filter over array, comma string, JSON-array string, object, empty list, null and missing variable (lenient); sort rows for numbers, strings, mixed, `sort=key`, stability with equal keys, non-mutation; unique rows for first-occurrence order, `1` vs `"1"`, deep-equal objects; json rows for key order at depth, scalars, cyclic (built with `a.self = a`) giving type-error located at line 2 column 3, a shared non-cyclic reference; located type-error rows for every undeclared parameter and for `join` with no separator and `slice` with a bad integer.
- Tests fail now for the right reason: the stubs throw `not implemented` (a located type-error at the variable), so each behavior row fails on the wrong output, not on a missing export or a syntax error. Registry shape rows (names, order, paramNames, non-empty descriptions) may pass at once; that is fine, but at least the behavior rows must fail.
- Do not change any existing test. Do not add a test outside this file. While iterating run only your file: `node node_modules/jest/bin/jest.js --runTestsByPath tests/language/filters-collection.test.ts`.
- After committing, record red evidence from the worktree: `node .process/core/scripts/red-evidence.mjs C:\Users\jon03\Documents\Projects\Personal\n8n-nodes-template-resolver\.worktrees\feature-add-the-collection-filters 261015-language3911-a4-add-the-collection-filters` (if the script is not in the worktree path, run it from the main checkout with the worktree path as the project directory; report what happened exactly).

## Model and effort

Sonnet, medium effort: mechanical test writing from precise criteria and the behavior list above.

## Result and status

Final message: status (done, done with concerns, needs context, blocked), the files committed, the commit hash, the count of failing and passing tests, the red-evidence outcome, and any criterion or behavior in the list above that you found ambiguous or contradictory (do not guess: report it). No secrets in the report.
