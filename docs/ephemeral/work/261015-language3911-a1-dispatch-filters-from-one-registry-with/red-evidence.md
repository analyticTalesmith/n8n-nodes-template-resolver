---
summary: Red evidence for 261015-language3911-a1-dispatch-filters-from-one-registry-with: 54 failing tests across 5 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/language/filter-registry.test.ts","tests/headless/spec.test.ts","--json"]
exit_status: 1
tests_sha256: 5130726d0741
---

# Red evidence for 261015-language3911-a1-dispatch-filters-from-one-registry-with

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| fr-registry: one table feeds render, spec and analyze fr-registry: a pushed definition is rendered with no other change | fr-registry | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-registry: one table feeds render, spec and analyze fr-registry: a pushed definition is listed by spec with exactly name, params and description | fr-registry | assertion failed: Error: expect(received).toBeDefined() |
| fr-registry: one table feeds render, spec and analyze fr-registry: a pushed definition is accepted and counted by analyze and validate | fr-registry | assertion failed: Error: expect(received).not.toContain(expected) // indexOf |
| fr-registry: one table feeds render, spec and analyze fr-registry: after removal the filter is unknown again, nothing is cached at load | fr-registry | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-registry: one table feeds render, spec and analyze fr-registry: spec filter names equal the registry names in order | fr-registry | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| fr-registry: one table feeds render, spec and analyze fr-registry: FILTERS names equal the registry names in order | fr-registry | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| fr-values: filters receive and return values fr-values: probe input, array keeps identity | fr-values | assertion failed: Error: expect(received).toHaveLength(expected) |
| fr-values: filters receive and return values fr-values: probe input, object keeps identity | fr-values | assertion failed: Error: expect(received).toHaveLength(expected) |
| fr-values: filters receive and return values fr-values: probe input, number stays a number | fr-values | assertion failed: Error: expect(received).toHaveLength(expected) |
| fr-values: filters receive and return values fr-values: probe input, string stays a string | fr-values | assertion failed: Error: expect(received).toHaveLength(expected) |
| fr-values: filters receive and return values fr-values: probe input, boolean stays a boolean | fr-values | assertion failed: Error: expect(received).toHaveLength(expected) |
| fr-values: filters receive and return values fr-values: a returned value prints as it would unfiltered, array keeps identity | fr-values | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-values: filters receive and return values fr-values: a returned value prints as it would unfiltered, object keeps identity | fr-values | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-values: filters receive and return values fr-values: a returned value prints as it would unfiltered, number stays a number | fr-values | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-values: filters receive and return values fr-values: a returned value prints as it would unfiltered, string stays a string | fr-values | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-values: filters receive and return values fr-values: a returned value prints as it would unfiltered, boolean stays a boolean | fr-values | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-values: filters receive and return values fr-values: a returned array is printed without being flattened to a string first | fr-values | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-values: filters receive and return values fr-values: a returned object is printed without being flattened to a string first | fr-values | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-values: filters receive and return values fr-values: a returned number is printed without being flattened to a string first | fr-values | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: parsed once, fence="a=b" | fr-args | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: parsed once, fence="a:b" | fr-args | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: parsed once, fence='c++' | fr-args | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: parsed once, fence=js | fr-args | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: parsed once, head=3 | fr-args | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: parsed once, head="3" | fr-args | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: parsed once, fence="a\|b" | fr-args | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: parsed once, a pipe inside quotes then more filters | fr-args | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: parsed once, named params with a comma and an equals sign inside quotes | fr-args | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: rendered fence language, fence="a=b" | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: rendered fence language, fence="a:b" | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware fr-args: a probe with declared names receives exactly its parsed parameters | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware lenient mode fr-args: an undeclared parameter is a type-error at the variable, escape_md:mode=block | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware lenient mode fr-args: an undeclared parameter is a type-error at the variable, escape_md:mode=block on line 2 | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware lenient mode fr-args: an undeclared parameter is a type-error at the variable, head with value plus an undeclared name | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware lenient mode fr-args: an undeclared parameter is a type-error at the variable, fence:lang=js | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware lenient mode fr-args: an undeclared parameter is a type-error at the variable, trim:x=1 | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware lenient mode fr-args: an undeclared parameter is a type-error at the variable, probe with no declared names, probe:x=1 | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware strict mode fr-args: an undeclared parameter is a type-error at the variable, escape_md:mode=block | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware strict mode fr-args: an undeclared parameter is a type-error at the variable, escape_md:mode=block on line 2 | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware strict mode fr-args: an undeclared parameter is a type-error at the variable, head with value plus an undeclared name | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware strict mode fr-args: an undeclared parameter is a type-error at the variable, fence:lang=js | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware strict mode fr-args: an undeclared parameter is a type-error at the variable, trim:x=1 | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-args: filter calls are parsed once, quote-aware strict mode fr-args: an undeclared parameter is a type-error at the variable, probe with no declared names, probe:x=1 | fr-args | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-default-quote: an unterminated quote in a default does not swallow the filters fr-default-quote: render, an apostrophe that never closes | fr-default | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-default-quote: an unterminated quote in a default does not swallow the filters fr-default-quote: render, a double quote that never closes | fr-default | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-default-quote: an unterminated quote in a default does not swallow the filters fr-default-quote: resolveTemplate lenient, an apostrophe that never closes | fr-default | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-default-quote: an unterminated quote in a default does not swallow the filters fr-default-quote: resolveTemplate lenient, a double quote that never closes | fr-default | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-groups: filter groups feed the registry fr-groups: the first six registry entries are the existing filters in order | fr-groups | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| fr-groups: filter groups feed the registry fr-groups: the registry is the six plus both groups | fr-groups | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| fr-groups: filter groups feed the registry fr-groups: every definition has name, params, description, paramNames and apply | fr-groups | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| fr-groups: filter groups feed the registry fr-groups: names are unique | fr-groups | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| fr-groups: filter groups feed the registry fr-groups: declared parameter names of the six existing filters | fr-groups | assertion failed: Error: expect(received).toMatchObject(expected) |
| rr-spec: the language spec rr-spec: filter  is listed with a description | none | assertion failed: Error: expect(received).toBeDefined() |
| rr-spec: the language spec rr-spec: lists exactly the engine's filters | none | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
