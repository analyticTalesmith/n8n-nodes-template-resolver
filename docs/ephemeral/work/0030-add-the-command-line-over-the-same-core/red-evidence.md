---
summary: Red evidence for 0030-add-the-command-line-over-the-same-core: 36 failing tests across 5 criteria.
command: ["node","node_modules/jest/bin/jest.js","--runTestsByPath","tests/headless/cli.test.ts","--json"]
exit_status: 1
tests_sha256: 7839d635ffe3
---

# Red evidence for 0030-add-the-command-line-over-the-same-core

Written by `node .process/core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.

| Test | Criterion | Reason |
| --- | --- | --- |
| cl-render cl-render: plain template file plus data file prints exactly the output and exits 0 | cl-render | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-render cl-render: variable template file plus data file prints exactly the output and exits 0 | cl-render | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-render cl-render: IF template file plus data file prints exactly the output and exits 0 | cl-render | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-render cl-render: FOR template file plus data file prints exactly the output and exits 0 | cl-render | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-render cl-render: trailing newline kept as is template file plus data file prints exactly the output and exits 0 | cl-render | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-render cl-render: data from stdin ('-') with a template file | cl-render | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-render cl-render: template from stdin ('-') with a data file | cl-render | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-render cl-render: no --data renders with empty data | cl-render | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-render cl-render: --json prints the full RenderResult and keeps the exit code | cl-render | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-render cl-render: a template error exits 1, prints file:line:col: error code: message on stderr, stdout empty | cl-render | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-render cl-render: a syntax error exits 1 with a located error line on stderr | cl-render | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-render cl-render: --json with a template error prints the failed result and still exits 1 | cl-render | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-others cl-others: validate prints JSON {ok:true} and exits 0 for a good template | cl-others | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-others cl-others: validate exits 1 and prints the diagnostics when not ok | cl-others | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-others cl-others: validate reads the template from stdin | cl-others | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-others cl-others: analyze prints the analysis JSON with required and blocks | cl-others | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-others cl-others: spec prints the spec JSON | cl-others | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-usage cl-usage: no arguments exits 2 with a message on stderr and nothing on stdout | cl-usage | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-usage cl-usage: unknown subcommand exits 2 with a message on stderr and nothing on stdout | cl-usage | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-usage cl-usage: unknown option exits 2 with a message on stderr and nothing on stdout | cl-usage | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-usage cl-usage: missing template file exits 2 with a message on stderr and nothing on stdout | cl-usage | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-usage cl-usage: missing data file exits 2 with a message on stderr and nothing on stdout | cl-usage | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-usage cl-usage: render without a template argument exits 2 with a message on stderr and nothing on stdout | cl-usage | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-usage cl-usage: both template and data from stdin exits 2 with a message on stderr and nothing on stdout | cl-usage | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-usage cl-usage: non-numeric limit exits 2 with a message on stderr and nothing on stdout | cl-usage | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-usage cl-usage: invalid data JSON exits 2 with a message on stderr | cl-usage | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-usage cl-usage: data that is not a JSON object exits 2 | cl-usage | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-usage cl-usage: no arguments prints usage naming the subcommands on stderr | cl-usage | assertion failed: Error: expect(received).toContain(expected) // indexOf |
| cl-usage cl-usage: --help exits 0 and prints usage on stdout | cl-usage | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-limits cl-limits: --no-strict renders a missing variable as empty | cl-limits | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-limits cl-limits: --strict reports a missing variable as an error | cl-limits | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-limits cl-limits: --max-iterations 2 fails a 3-item FOR | cl-limits | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-limits cl-limits: --max-output-chars 5 fails a longer output | cl-limits | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-limits cl-limits: --max-depth 1 fails nested blocks | cl-limits | assertion failed: Error: expect(received).toBe(expected) // Object.is equality |
| cl-limits cl-limits: the same FOR passes within the limit | cl-limits | assertion failed: Error: expect(received).toEqual(expected) // deep equality |
| cl-serve cl-serve: serve prints its address, answers POST /v1/render and resolves 0 after abort | cl-serve | assertion failed: Error: expect(received).toBeGreaterThan(expected) |
