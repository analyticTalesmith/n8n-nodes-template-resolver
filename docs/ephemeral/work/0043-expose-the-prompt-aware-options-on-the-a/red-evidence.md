---
summary: Red evidence for 0043-expose-the-prompt-aware-options-on-the-a: 54 failing tests across 5 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/promptaware/surfaces.test.ts","tests/promptaware/golden-render.test.ts","tests/promptaware/docs.test.ts","--json"]
exit_status: 1
tests_sha256: 2ba2409a0510
---

# Red evidence for 0043-expose-the-prompt-aware-options-on-the-a

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| sf-api: options.standaloneLines on POST /v1/render sf-api: IF lines, option omitted (default on) | sf-api | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-api: options.standaloneLines on POST /v1/render sf-api: IF lines, true | sf-api | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-api: options.standaloneLines on POST /v1/render sf-api: IF lines, false | sf-api | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-api: options.standaloneLines on POST /v1/render sf-api: FOR lines, true | sf-api | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-api: options.standaloneLines on POST /v1/render sf-api: FOR lines, false | sf-api | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-api: options.standaloneLines on POST /v1/render sf-api: a non-boolean standaloneLines (string false) is 400 invalid-request | sf-api | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-api: options.standaloneLines on POST /v1/render sf-api: a non-boolean standaloneLines (number 0) is 400 invalid-request | sf-api | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-api: options.standaloneLines on POST /v1/render sf-api: a non-boolean standaloneLines (number 1) is 400 invalid-request | sf-api | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-api: options.standaloneLines on POST /v1/render sf-api: a non-boolean standaloneLines (string yes) is 400 invalid-request | sf-api | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-api: options.standaloneLines on POST /v1/render sf-api: a non-boolean standaloneLines (array) is 400 invalid-request | sf-api | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-api: options.standaloneLines on POST /v1/render sf-api: a non-boolean standaloneLines (object) is 400 invalid-request | sf-api | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-api: options.standaloneLines on POST /v1/render sf-api: the OpenAPI document describes options.standaloneLines as a boolean and is still served byte for byte | sf-api | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
| sf-cli: --standalone-lines and --no-standalone-lines sf-cli: no flag (default on) | sf-cli | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sf-cli: --standalone-lines and --no-standalone-lines sf-cli: --standalone-lines | sf-cli | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sf-cli: --standalone-lines and --no-standalone-lines sf-cli: --no-standalone-lines | sf-cli | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sf-cli: --standalone-lines and --no-standalone-lines sf-cli: both flags together (on then off) is a usage error, exit 2 | sf-cli | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sf-cli: --standalone-lines and --no-standalone-lines sf-cli: both flags together (off then on) is a usage error, exit 2 | sf-cli | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| sf-cli: --standalone-lines and --no-standalone-lines sf-cli: the usage text lists both flags | sf-cli | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-node: the standalone lines option sf-node: the node lists a boolean standaloneLines option that defaults to true | sf-node | assertion failed: Error: expect(received).toBeDefined() |
| sf-node: the standalone lines option sf-node: true removes the tag lines | sf-node | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-node: the standalone lines option sf-node: parameter absent defaults to removing them | sf-node | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-node: the standalone lines option sf-node: false keeps the blank lines | sf-node | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-escape-block-standalone-off renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-escape-block-standalone-on renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-fence-standalone-off renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-fence-standalone-on renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-heading-offset-standalone-off renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-heading-offset-standalone-on renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-raw-braces-standalone-off renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-raw-braces-standalone-on renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-sections-standalone-off renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-sections-standalone-on renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-trim-markers-standalone-off renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-golden: prompt-aware golden cases rendered through render sf-golden: case prompt-trim-markers-standalone-on renders to its expected file | sf-golden | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents a SECTION example | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the SECTION end tag | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents a FENCE example | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the FENCE end tag | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents RAW | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the RAW end tag | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents heading_offset | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the block escape mode | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the inline escape mode | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the whitespace rule | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the trim marker before a tag | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the trim marker after a tag | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the API option | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the CLI flag | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the CLI opt-in flag | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents the node option label | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: README documents skip_empty | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| sf-docs: README documents the prompt-aware constructs sf-docs: the README describes the standalone option on the API, the CLI and the node | sf-docs | assertion failed: Error: expect(received).toMatch(expected) |
| sf-docs: README documents the prompt-aware constructs sf-docs: the README explains that a backslash before the brace pair outputs it literally | sf-docs | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| sf-docs: README documents the prompt-aware constructs sf-docs: the changelog mentions SECTION and FENCE | sf-docs | assertion failed: Error: expect(received).toContain(expected) // indexOf |
