# Spec

## Acceptance criteria

- fc-collection: a table per filter over arrays, string inputs coerced exactly as FOR coerces them, objects and empty or missing input: join (join=", "), length (items of a list, characters of a text, keys of an object), first, last, slice (slice:start=1,end=3), lines (split text on line breaks, CRLF included) and unique
- fc-order: sort is stable and deterministic: numbers numeric, strings by code unit, sort=key orders objects by that key, a mixed list sorts numbers before strings; unique keeps the first occurrence of each value
- fc-json: json prints a compact JSON text of the value with stable key order; a cyclic value is a type-error located at the variable; a wrong or undeclared parameter on any collection filter is a type-error located at the variable

## Interface (names the tests may import)

- `core/src/filters-collection.ts` exports `COLLECTION_FILTERS: FilterDefinition[]` (type in `core/src/types.ts`) with the rows `join` (shorthand = separator, paramNames `["value"]`), `length`, `first`, `last`, `sort` (shorthand = key, paramNames `["value"]`), `unique`, `slice` (paramNames `["start","end"]`), `lines` and `json`, in this order. The registry in `core/src/filters.ts` already includes the group; no dispatch or parser change.

## Behavior settled for this card

- List filters (`join first last sort unique slice`) coerce their input as FOR does (`tryCoerceToArray`); null or missing is the empty list; an object given to them is a type-error; the input is never mutated.
- `join=SEP` needs the separator (`join=""` is allowed); items print as the output step prints them. `length` of a string counts characters (not coerced), of an object its keys, of null 0. `first` and `last` of an empty list are null.
- `slice:start=S,end=E` has `Array.prototype.slice` semantics; each given bound is an integer text, else a type-error. `lines` splits the text form on `\r\n`, `\r` or `\n`; one trailing break adds no empty item.
- `sort`: numbers (numeric), then strings (code unit), then all other values in original order; `sort=key` orders object items by that property, items without it last; stable. `unique`: same type and same value (objects by stable JSON text), first occurrence kept.
- `json`: compact, object keys sorted by code unit at every depth; null and missing give `null`; a cyclic value is a type-error, a shared non-cyclic reference is not.
- A returned list or number prints as the output step prints it (a list as compact JSON) and passes to the next filter as a value.

## Examples

- `${{ xs | join=", " }}` over `["a","b"]` is `a, b`; `${{ xs | sort | first }}` over `[3,1,2]` is `1`.
- `${{ o | json }}` over `{b:1,a:{d:1,c:2}}` is `{"a":{"c":2,"d":1},"b":1}`.
- `${{ xs | slice:start=1,end=3 }}` over `["a","b","c","d"]` is `["b","c"]`.
- `${{ v | json:pretty=1 }}` fails with a type-error located at the variable.
