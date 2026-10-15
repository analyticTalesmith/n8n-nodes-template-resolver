---
summary: "New language contract: filter registry and argument syntax first; later cards append their constructs"
state: built
---

# Language contract

<!-- Fill the summary with one sentence a reader can use to decide whether to open this document. State starts as planned; it becomes built when the work ships and validated only after a close review. -->

## Purpose

<!-- What this document is for and who reads it. Link to related documents, never copy them. Add the sections this kind of document needs below. -->

The contract for the template language beyond the prompt-aware constructs: filters, operators, CASE and FOR upgrades, SET, INPUT, macros and partials. It is written one card at a time; the first section is the filter registry. Settled decisions apply: [ADR 0001](../decisions/adr/0001-house-style-for-every-block.md) (paired blocks), [ADR 0003](../decisions/adr/0003-unknown-names-are-always-errors.md) (unknown names are errors in every mode). Companion: [prompt-aware-contract.md](prompt-aware-contract.md).

## Filters

- **One registry.** Every filter is one definition in one table: `name`, `params` (the signature text spec() shows), `description`, `paramNames` (the named parameters it accepts; the shorthand `name=value` is the parameter `value`) and `apply(input, params)`. render, `spec()`, `analyze` and `validate` read this table and nothing else; a filter added to it is accepted by all four. `spec()` shows only `name`, `params` and `description`.
- **Groups.** Core filters live in `filters.ts`; text filters and collection filters are added by later cards to `filters-text.ts` and `filters-collection.ts`, which the registry includes.
- **Values.** A filter receives the resolved value and returns a value; the text printed is the output step's text form of the final value. The existing filters coerce their input to text exactly as the output step does, so no existing output changes.
- **Arguments.** A filter call is written `name`, `name=value` or `name:key=value,key=value`. It is parsed once at parse time, respecting quotes: `fence="a=b"` and `fence="a:b"` keep the whole value. A parameter name the filter does not declare (`escape_md:mode=block`) is a `type-error` located at the variable (ADR 0003), in every mode.
- **Defaults.** A quote in a `??` default opens only when a value starts with it and closes; an unterminated quote is plain text and never hides the filters after it.
- **Static checks.** `validate` and `analyze` report an undeclared parameter as a `type-error` at the variable, the same code, position and wording as `render`.
- **Known gap.** `FILTERS` (exported for compatibility) is a snapshot of the registry names taken at load; code that needs the live list reads `FILTER_REGISTRY` or `spec()`.

### Text filters

Group in `filters-text.ts`. Each coerces its input to text as the output step prints it, except `default`. A missing or invalid parameter value is a `type-error` at the variable in every mode; `validate` and `analyze` run without data, so they check names and undeclared parameters, and a bad value shows at render. The shorthand `name=value` is the parameter `value`.

| Filter | Result |
|---|---|
| `upper`, `lower` | the text in upper or lower case; no parameter |
| `title` | the first letter of each whitespace-separated word in upper case, the rest in lower case; no parameter |
| `replace:find="a",with="b"` | every non-overlapping occurrence of the literal `find` (required, non-empty) replaced by `with` (default empty text); never read as a pattern |
| `indent[=N]` | N spaces (whole number 0 to 100, default 2) before every line that has characters; line breaks are kept |
| `quote` | the text as a JSON double-quoted string; no parameter |
| `round[=N]` | a number rounded half away from zero to exactly N decimals (whole number 0 to 20, default 0), computed on its digits so `1.005` with `round=2` gives `1.01`; text that is not a finite number, or has an exponent beyond 400 (`1e400`), is left as it is |
| `default="x"` | `x` (required) when the raw value is not truthy by the language rule: missing, null, empty or whitespace-only text, the texts `0`, `false` and `no` in any letter case, the number 0, false, an empty list or an empty object; else the value. `??` keeps its own rule |

In strict mode a missing variable is reported before `default` runs, so `default` replaces missing data in lenient mode only.
### Collection filters

Nine filters in `filters-collection.ts` (`COLLECTION_FILTERS`), in this order: `join=SEP`, `length`, `first`, `last`, `sort[=key]`, `unique`, `slice[:start=N,end=N]`, `lines`, `json`.

- **Input.** `join first last sort unique slice` coerce their input as FOR does: an array passes through, a text such as `"a,b,c"` or `'["x","y"]'` becomes a list, a number or boolean a one-item list, null or a missing value the empty list. An object given to one of them is a `type-error`. No filter changes its input.
- **Output.** A filter returns a value: `join`, `json` a text; `length` a number; `first`, `last` an item (null when the list is empty); `sort`, `unique`, `slice`, `lines` a list, which the output step prints as compact JSON and the next filter receives as a list.
- **join.** `join=SEP` needs its separator (`join=""` is allowed); items print as the output step prints them.
- **length.** Items of a list, UTF-16 code units of a text (not split into items, so one emoji counts 2), keys of an object, characters of a number or boolean's text form; 0 for null or missing.
- **slice.** `Array.prototype.slice` semantics (negative counts from the end); each given bound is an integer, else a `type-error`.
- **lines.** The text form split on `\r\n`, `\r` or `\n`; one trailing line break adds no empty item.
- **sort.** Stable and deterministic: numbers numeric, then strings by code unit (so `"10"` before `"9"`), then every other value in its original order. `sort=key` orders object items by that property with the same rule; items without it come last.
- **unique.** Keeps the first occurrence; two values are equal when they have the same type and value (`1` and `"1"` differ), objects and arrays by their `json` text.
- **json.** Compact JSON with object keys sorted by code unit at every depth; null and missing give `null`; a cyclic value is a `type-error`, a shared non-cyclic reference is not.
- **Errors.** A parameter a collection filter does not declare is a located `type-error` in every mode, as for every filter.

## Math and output errors

- **Zero.** In `render`, `/` or `%` with a zero divisor (also `0 / 0` and a divisor computed to zero) is a `type-error` located at the variable, in every mode. `resolveTemplate` keeps its old output (`Infinity`, `NaN`): this is a render-only divergence, as `standaloneLines` is.
- **Float printing.** In `render`, an arithmetic result prints with at most 15 significant digits (`0.1 + 0.2` prints `0.3`; `1 / 3` prints `0.333333333333333`; integers of any size and negative numbers print unchanged). `resolveTemplate` prints the plain number, so `0.1 + 0.2` stays `0.30000000000000004` there.
- **Hyphens in names.** A hyphen with an ASCII letter on both sides is part of one name (`first-name`, `user.first-name`, `a-b + 1` reads the key `a-b`); `a - b`, `a -b`, `n-1`, `x1-y` and `1-a` are arithmetic. A missing hyphenated name in strict mode is a `missing-variable` error whose suggestion shows the spaced form. `analyze` lists a hyphenated name as one variable. Applies in `render` and `resolveTemplate`.
- **Malformed math.** A malformed expression, whatever the data holds (so `total * ` errors whether or not `total` exists) (`(1 + 2`, `1 +`, `1 + * 2`, `2 $ 3`) is a located `type-error` in lenient mode too, instead of empty output. A well-formed expression that names a missing or non-numeric variable stays missing data: empty in lenient mode. The error never replaces an existing key, and a missing name with an odd character (`a:b`, `Order #`) is plain missing data, not math. Applies in both entry points.
- **Unprintable output.** A value with no text form (a cyclic object or array, a BigInt) used as output, as a CASE subject or before a filter that turns its input into text (every filter except `default` and the collection filters that keep a value: `length first last sort unique slice json`, so `xs | length` still counts, while `lines` and `join` check) is a `type-error` located at the variable or CASE node, in every mode; `null` and missing still print as empty. Applies in both entry points.

## Condition operators

Conditions are the same in `render` and `resolveTemplate`. Strict mode governs missing data only, and a condition never raises a missing-variable error (a missing name reads as null). Every error is a `type-error` located at the IF, ELSEIF or LIST_ITEM; a cyclic value or a BigInt as an operand is a located error or a normal result, never a raw exception.

- **in, not in.** `x in ["a", y, 3]`, `x in list_var`, `x in "text"`; the words are case-insensitive. A list literal holds operands (literals or variable paths) separated by commas outside quotes; `[]` is empty, while an empty item, a nested `[` or a missing `]` is an error. Against an array, true when an element equals x by the equality rule below (array, object and BigInt elements never match); against a text (quoted or from a variable), a case-sensitive substring test, so an empty x is contained and a text holding JSON is still only a text. A missing or null x, or a missing or null right side, gives false (`not in`: true). A right side that is a number, a boolean or an object, and a left side that is an array, an object or a BigInt, is a `type-error`. `not in` is exactly the negation of `in`.
- **between.** `x between [lo, hi]`: exactly two operands, each read as a number the way `>` reads them; inclusive at both ends; `lo` above `hi` is false. A non-numeric or missing operand, a list that is not two items and a right side that is not a list literal are a `type-error`. There is no `not between`.
- **Precedence.** `in`, `not in` and `between` split at the tier of `contains`: after AND, OR, NOT and the comparison operators, before type checks, outside quotes, brackets and parentheses, so `NOT x in [..]`, `a in [..] AND b` and `(a) OR (b between [1, 2])` need no extra rule. Chaining two operators (`a in b == c`) is an error. An operator word inside quotes never splits.
- **.length.** A path segment `length` after any value: an array gives its element count; a text gives its UTF-16 code units (as the `length` filter does, so one emoji is 2) unless it is a JSON object text with its own key `length`; an object with its own key `length` returns that key's value, null included. Any other value, and any missing data, stays null (no zero). Works in conditions, output, math, CASE subjects and after other segments (`user.tags.length`, `items.0.length`); a root variable named `length` is an ordinary variable.
- **Equality.** `==` and `!=`: when either side is a quoted literal both sides compare as text (`z == "01234"` is false for 1234, `"1.0" == 1` is false); otherwise numbers compare numerically and anything else as text, as before. `in` list items follow the same rule. For `contains`, `startsWith` and `endsWith` an unquoted number on the right keeps its written text (`x contains 1.50`, `007`).
- **Unknown words.** An operand that is not a literal, not a variable key and holds whitespace outside quotes (`a == b c`, `a like b`, `a matches /x/`) is an "Unrecognized condition" error in every mode, also in a branch that AND or OR would skip; `matches` is not an operator and no pattern in a template is ever compiled.
- **spec and analyze.** `spec().operators` lists `in`, `not in`, `between` and `.length` after the existing operators. `analyze` records the variables in the left side, the list items or right side, the bounds and the root of a `.length` path (path text as written); a malformed condition is an `unrecognized-condition` diagnostic.
