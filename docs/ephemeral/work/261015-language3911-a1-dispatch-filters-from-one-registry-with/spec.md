# Spec

## Acceptance criteria

- fr-registry: render, spec() and analyze use one table of filter definitions {name, params, description, paramNames, apply}: a definition added to the table is accepted by render, listed by spec() and accepted by analyze and validate with no other change, and spec() exposes only name, params and description (no function)
- fr-values: filters receive and return values; the six existing filters coerce their input to text first exactly as the output step does, so every existing template renders the same output as before
- fr-args: filter calls are parsed once at parse time, quote-aware: fence="a=b" and fence="a:b" keep the whole language text; a named parameter the filter does not declare (escape_md:mode=block) is a type-error located at the variable instead of a silent fallback; parseFilter and the strings it parsed before still give the same results
- fr-default-quote: an unterminated quote in a ?? default (an apostrophe or a double quote that never closes) no longer swallows the filters after it, and a closed quoted default still keeps a pipe inside it
- fr-groups: core/src/filters-text.ts and core/src/filters-collection.ts exist, each exporting an empty list of filter definitions that the registry includes, so later cards add rows there without touching the dispatch
- fr-compat: the full existing suite passes; the only existing test file changed is tests/headless/spec.test.ts, whose fixed six-name list becomes a check that spec lists exactly the registry

## Interface (names the tests may import)

- `core/src/types.ts`: `FilterDefinition { name: string; params: string; description: string; paramNames: string[]; apply(input: unknown, params: Record<string, string>): unknown }`.
- `core/src/filters.ts`: `FILTER_REGISTRY: FilterDefinition[]`, a plain mutable array (tests push a definition into it and remove it again); it holds the six existing filters followed by the entries of `TEXT_FILTERS` and `COLLECTION_FILTERS`. `FILTERS` stays exported (the same names). `parseFilter(string)`, `applyFilter(value, call)` and `applyFilters(value, calls)` stay exported under the same names; for every current filter, a string in gives a string out.
- `core/src/filters-text.ts` exports `TEXT_FILTERS: FilterDefinition[]` (empty); `core/src/filters-collection.ts` exports `COLLECTION_FILTERS: FilterDefinition[]` (empty).
- No name is looked up once at module load: a definition pushed into the registry later must be seen by render, spec() and analyze.
- `paramNames` of the six existing filters: `head`, `tail`, `escape_md`, `fence`, `heading_offset` take `["value"]`; `trim` takes `[]`. A call whose params hold a name outside `paramNames` throws a `type-error` located at the variable; spec() stays `{name, params, description}` per filter.

## Examples

- `render('${{ v | fence="a=b" }}', {v:'x'}, {standaloneLines:false}).output` is a fence whose language is `a=b`.
- `render('${{ v | escape_md:mode=block }}', {v:'- x'})` fails with a `type-error` at 1:1.
- `${{x ?? '90s hits | head=3}}` renders the default `'90s hits` cut to `'90`, the same as before the quoting fix of an earlier card; `${{x ?? "abc | trim}}` keeps `trim` applying.
