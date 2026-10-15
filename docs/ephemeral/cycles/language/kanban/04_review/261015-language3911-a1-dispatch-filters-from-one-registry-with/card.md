# Dispatch filters from one registry with quote-aware arguments

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

Every filter is dispatched from one registry table that also feeds spec() and analyze, filters take and return values, and filter arguments are parsed once at parse time with quotes respected, so the later filter cards only add rows to the table and no output of an existing template changes.

## Must-haves

- `contract` `fr-registry` render, spec() and analyze use one table of filter definitions {name, params, description, paramNames, apply}: a definition added to the table is accepted by render, listed by spec() and accepted by analyze and validate with no other change, and spec() exposes only name, params and description (no function)
- `contract` `fr-values` filters receive and return values; the six existing filters coerce their input to text first exactly as the output step does, so every existing template renders the same output as before
- `contract` `fr-args` filter calls are parsed once at parse time, quote-aware: fence="a=b" and fence="a:b" keep the whole language text; a named parameter the filter does not declare (escape_md:mode=block) is a type-error located at the variable instead of a silent fallback; parseFilter and the strings it parsed before still give the same results
- `contract` `fr-default-quote` an unterminated quote in a ?? default (an apostrophe or a double quote that never closes) no longer swallows the filters after it, and a closed quoted default still keeps a pipe inside it
- `contract` `fr-groups` core/src/filters-text.ts and core/src/filters-collection.ts exist, each exporting an empty list of filter definitions that the registry includes, so later cards add rows there without touching the dispatch
- `contract` `fr-compat` the full existing suite passes; the only existing test file changed is tests/headless/spec.test.ts, whose fixed six-name list becomes a check that spec lists exactly the registry

## Acceptance criteria

- fr-registry: render, spec() and analyze use one table of filter definitions {name, params, description, paramNames, apply}: a definition added to the table is accepted by render, listed by spec() and accepted by analyze and validate with no other change, and spec() exposes only name, params and description (no function)
- fr-values: filters receive and return values; the six existing filters coerce their input to text first exactly as the output step does, so every existing template renders the same output as before
- fr-args: filter calls are parsed once at parse time, quote-aware: fence="a=b" and fence="a:b" keep the whole language text; a named parameter the filter does not declare (escape_md:mode=block) is a type-error located at the variable instead of a silent fallback; parseFilter and the strings it parsed before still give the same results
- fr-default-quote: an unterminated quote in a ?? default (an apostrophe or a double quote that never closes) no longer swallows the filters after it, and a closed quoted default still keeps a pipe inside it
- fr-groups: core/src/filters-text.ts and core/src/filters-collection.ts exist, each exporting an empty list of filter definitions that the registry includes, so later cards add rows there without touching the dispatch
- fr-compat: the full existing suite passes; the only existing test file changed is tests/headless/spec.test.ts, whose fixed six-name list becomes a check that spec lists exactly the registry

## Must-nots

- change any existing test expectation other than the one named amendment
- change what any existing filter outputs
- add a runtime dependency
- evaluate template text as code

## Context links

- [Template resolver module](../../../../../../living/architecture/modules/template-resolver.md)
- [Unknown names are errors (ADR 0003)](../../../../../../living/decisions/adr/0003-unknown-names-are-always-errors.md)

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter, or the root README.md), or give user_docs_waiver, one line with the reason none changes. A card that changes only documents needs nothing, and the root README.md counts as user facing without a tag. If no user can see it, write `none`. -->

## Interface contract

core/src/types.ts gains FilterDefinition {name, params (the signature text spec shows), description, paramNames (the named parameters it accepts; a shorthand name=value is the parameter value), apply(input: unknown, params: Record<string,string>): unknown}. core/src/filters.ts exports FILTER_REGISTRY, a mutable array of FilterDefinition that includes the entries of TEXT_FILTERS (filters-text.ts) and COLLECTION_FILTERS (filters-collection.ts); FILTERS stays exported and equals the registry names. parseFilter(string) keeps its signature; applyFilter and applyFilters accept and return values (strings in, strings out for every current filter). FilterCall nodes in the AST carry the parsed name and params. spec().filters stays a list of {name, params, description}.

## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/analyze.ts` | edit | template-resolver |
| `core/src/filters.ts` | edit | template-resolver |
| `core/src/interpreter.ts` | edit | template-resolver |
| `core/src/parser.ts` | edit | template-resolver |
| `core/src/render.ts` | edit | template-resolver |
| `core/src/spec.ts` | edit | template-resolver |
| `tests/language/filter-registry.test.ts` | edit | template-resolver |

Files scope: `core/src/analyze.ts`, `core/src/errors.ts`, `core/src/filters-collection.ts`, `core/src/filters-text.ts`, `core/src/filters.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/spec.ts`, `core/src/types.ts`, `tests/headless/spec.test.ts`, `tests/language/filter-registry.test.ts`
<!-- end generated scope -->
