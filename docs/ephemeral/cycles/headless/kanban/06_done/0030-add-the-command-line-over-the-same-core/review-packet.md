---
type: review-packet
card: 0030-add-the-command-line-over-the-same-core
tier: product
built_at: 2026-10-14T01:48:03.175Z
base: 1d8de70765118ad49822252052ff7edafe1476a7
head: 26bb036f5d48acbb5961d8bd940ff46837421dc1
frozen: true
brief_sha256: ea06bf4d0d7d3566e21c7c3d88779c228fe7fb467f684bf0dfe6839a2f5d2dd5
manifest_sha256: 196f829ae21092a9f4f4f854918f7237e244d53951c7540595246974e120b85c
criteria_sha256: c26a79011b211e39bea70225f01d7cd3b240735fde7213bbeffd9cef44d63616
scope_sha256: d6506ef1fd33beffb71eca80e037463758f5619ddc40399787b36f0936e0784e
diff_sha256: d7eaba5c818974d16caaa68d73ca56051e9bc7cf80d77194be94574683041983
omitted_paths: 5
criteria_count: 5
must_not_count: 3
---

# Review packet: 0030-add-the-command-line-over-the-same-core

Manifest amended after the freeze at 2026-10-14T01:42:57.796Z by lead: stubs from the test writer exist so these are edits; stray entry (add -cli/index.ts, add -cli/main.ts, edit -x)

Manifest amended after the freeze at 2026-10-14T01:42:57.903Z by lead: stubs exist so edits (edit +cli/index.ts, edit +cli/main.ts)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: template-resolver works from the terminal exactly as design.md says.

### Criteria

- c1 (verify: test): cl-render: render reads a template file or stdin and a data file or stdin, prints the output on stdout, prints diagnostics as file:line:col severity code message on stderr, exits 0 on ok and 1 on template errors, and --json prints the full result
- c2 (verify: test): cl-others: validate and analyze print JSON and validate exits 1 when not ok; spec prints the spec JSON
- c3 (verify: test): cl-usage: no arguments, an unknown subcommand or option, a missing file, bad data JSON and both inputs on stdin exit 2 with a message on stderr; --help prints usage and exits 0
- c4 (verify: test): cl-limits: --strict, --no-strict, --max-iterations, --max-output-chars and --max-depth reach the render options
- c5 (verify: test): cl-serve: serve starts the API on the given host and port and answers a request

### Must not

- m1: add a runtime dependency
- m2: write to stdout anything but the result
- m3: leave a child process running after a test

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: template-resolver works from the terminal exactly as design.md says.
Must not:
- add a runtime dependency
- write to stdout anything but the result
- leave a child process running after a test

## Questions

goal-critical: are stdout and stderr and the exit codes exactly as specified for success, template error and usage error?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/headless-contract.md
```

### spec.md as of base 1d8de70

```
# Spec

## Acceptance criteria

- cl-render: render reads a template file or stdin and a data file or stdin, prints the output on stdout, prints diagnostics as file:line:col severity code message on stderr, exits 0 on ok and 1 on template errors, and --json prints the full result
- cl-others: validate and analyze print JSON and validate exits 1 when not ok; spec prints the spec JSON
- cl-usage: no arguments, an unknown subcommand or option, a missing file, bad data JSON and both inputs on stdin exit 2 with a message on stderr; --help prints usage and exits 0
- cl-limits: --strict, --no-strict, --max-iterations, --max-output-chars and --max-depth reach the render options
- cl-serve: serve starts the API on the given host and port and answers a request
```

### card.md as of base 1d8de70

```
# Add the command line over the same core

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

A CLI with render, validate, analyze, spec and serve subcommands over core and the API, reading files or stdin, with documented exit codes and no new dependency.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `cl-render` render reads a template file or stdin and a data file or stdin, prints the output on stdout, prints diagnostics as file:line:col severity code message on stderr, exits 0 on ok and 1 on template errors, and --json prints the full result
- `contract` `cl-others` validate and analyze print JSON and validate exits 1 when not ok; spec prints the spec JSON
- `contract` `cl-usage` no arguments, an unknown subcommand or option, a missing file, bad data JSON and both inputs on stdin exit 2 with a message on stderr; --help prints usage and exits 0
- `contract` `cl-limits` --strict, --no-strict, --max-iterations, --max-output-chars and --max-depth reach the render options
- `contract` `cl-serve` serve starts the API on the given host and port and answers a request


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- add a runtime dependency
- write to stdout anything but the result
- leave a child process running after a test


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the README card documents the surface.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

the template-resolver command and its exit codes (design.md); main(argv, io) exported from cli/main.ts for tests.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `cli/index.ts` | add | none |
| `cli/main.ts` | add | none |
| `x` | edit | none |

Files scope: `cli/`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: none
- remove: none
- edit: `cli/index.ts`, `cli/main.ts`
- files_scope: `cli/`

## 2. Your verification plan

Before you read section 3, write `verification_plan`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.

## 3. Design context

### docs/living/architecture/headless-contract.md

````
---
summary: Contract for the headless cycle: the structured render result, diagnostics, limits, the HTTP API, the OpenAPI document and the CLI.
state: planned
---

# Headless contract

Decisions already settled in the ADRs apply (0003 unknown names always error, 0004 structured result, 0005 dependency-free estimator, 0006 node imports core). No new runtime dependency: node's `http`, `util.parseArgs`, `fs` only.

## Core

```ts
interface Limits { maxIterations: number; maxOutputChars: number; maxDepth: number }
// defaults: maxIterations 10000 (total FOR iterations across the render), maxOutputChars 1000000, maxDepth 32 (nesting of blocks)
interface RenderOptions { strictMode?: boolean; limits?: Partial<Limits>; tokenEstimator?: (text: string) => number }
interface Diagnostic { severity: "error" | "warning"; code: string; message: string; line: number; column: number; suggestion?: string }
interface RenderResult { ok: boolean; output: string; messages: Message[]; stats: { chars: number; estTokens: number; sectionsOmitted: number; iterations: number }; diagnostics: Diagnostic[] }
render(template: string, data: Record<string, unknown>, options?: RenderOptions): RenderResult   // never throws for template or data problems
validate(template: string): { ok: boolean; diagnostics: Diagnostic[] }
analyze(template): existing result plus `required` on each variable (= !optional) and `blocks: Record<string, number>` (count per block kind)
spec(): { version: string; blocks: {name, closes?, args, description}[]; filters: {name, params, description}[]; operators: string[]; limits: Limits; syntax: {variable, comment} }
```

- `messages` is an empty array until MESSAGE blocks exist; `sectionsOmitted` is 0 until SECTION exists.
- Diagnostic codes: `syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`, `invalid-input`, `analysis-warning`. Every diagnostic has the 1-based line and column of the offending template node or tag; runtime errors (missing variable, bad filter parameters, math, type) carry the location of the node that failed, never a placeholder 1:1.
- On failure `ok` is false, `output` is `""`, and the first diagnostic is the error that stopped rendering.
- Estimator default: `Math.ceil(chars / 4)`, documented as an estimate with roughly +/-30 percent error for English prose.
- `resolveTemplate` (throwing string API) keeps its behavior and is implemented over the same engine.
- The n8n node calls `render` and writes `result.output` to the configured output field; a failed render becomes a NodeOperationError (or continue-on-fail item) with the first diagnostic's message and location.

## HTTP API (`api/`)

`createServer(options?: { limits?, tokenEstimator?, maxBodyBytes? }): http.Server` and `listen` helper; default host 127.0.0.1, `maxBodyBytes` 1 MiB.

| Route | Request body | Response (200) |
|---|---|---|
| POST /v1/render | `{template, data?, options?: {strictMode?, limits?}}` | RenderResult |
| POST /v1/validate | `{template}` | `{ok, diagnostics}` |
| POST /v1/analyze | `{template}` | analysis |
| GET /v1/spec | | spec() |
| GET /v1/openapi.json | | the committed `api/openapi.json` |

- Template problems are results, not HTTP errors: 200 with `ok: false` and diagnostics.
- Malformed requests: 400 `{error: {code: "invalid-request", message}}` (bad JSON, missing or non-string `template`, non-object `data`, unknown option types); 404 `not-found`; 405 `method-not-allowed` with `Allow`; 413 `payload-too-large`; 415 `unsupported-media-type` when POST content-type is not JSON. All responses are JSON.
- Server option limits are the ceiling: a request may only lower a limit, never raise it above the server's.
- `api/openapi.json` is committed, OpenAPI 3.1, describes every route, request and response schema; a test proves its paths and methods equal the router's table.

## CLI (`cli/`, bin `template-resolver`)

`template-resolver <render|validate|analyze|spec|serve> [options]`

- `render <template-file|-> [--data <file|->] [--strict | --no-strict] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]`: prints output to stdout; diagnostics as `file:line:col: severity code: message` on stderr; exit 0 on ok, 1 on template errors, 2 on usage or I/O errors. With `--json` prints the full RenderResult to stdout (exit codes unchanged).
- `validate <template-file|->`, `analyze <template-file|->`: print JSON; `validate` exits 1 when not ok.
- `spec`: prints the spec JSON. `serve [--port n] [--host h]`: starts the API (default 127.0.0.1:3000).
- `-` reads stdin; only one input may be stdin. `--help` and no arguments print usage (exit 0 / 2).

## Engine surface added before render (card 1)

- `TemplateError` (and its subclasses) gain a string `code` from the diagnostic codes above; `line` and `column` are always the failing node's position (1-based). Plain `Error`s thrown by filters or math are converted to `TemplateError` at the node that evaluates them (unknown filter: `unknown-filter`; bad parameters: `type-error`).
- `resolveTemplate(template, variables, { strictMode?, limits? })` accepts `limits`; exceeding one throws a `TemplateError` with code `limit-iterations`, `limit-output` or `limit-depth` located at the node that crossed it.
- `DEFAULT_LIMITS` is exported from core.
````

## Frozen tests (read-only)

These test files were committed before the work began, at base 1d8de70. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/headless/cli.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { main } from "../../cli/main";

interface Run {
  code: number;
  out: string;
  err: string;
  stdinReads: number;
}

let dir: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "tr-cli-"));
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function file(name: string, content: string): string {
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

async function run(argv: string[], stdin = "", signal?: AbortSignal): Promise<Run> {
  const r: Run = { code: -1, out: "", err: "", stdinReads: 0 };
  r.code = await main(argv, {
    readStdin: async () => {
      r.stdinReads += 1;
      return stdin;
    },
    stdout: (t) => {
      r.out += t;
    },
    stderr: (t) => {
      r.err += t;
    },
    signal,
  });
  return r;
}

// Assumption: render prints result.output exactly, with no newline or other text added.
const renderCases: { name: string; template: string; data: object; expected: string }[] = [
  { name: "plain", template: "Hello world", data: {}, expected: "Hello world" },
  { name: "variable", template: "Hi ${{name}}!", data: { name: "Ada" }, expected: "Hi Ada!" },
  {
    name: "IF",
    template: "{{IF on}}yes{{ELSE}}no{{END_IF}}",
    data: { on: true },
    expected: "yes",
  },
  {
    name: "FOR",
    template: "{{FOR xs AS x}}[${{x}}]{{END_FOR}}",
    data: { xs: ["a", "b", "c"] },
    expected: "[a][b][c]",
  },
  { name: "trailing newline kept as is", template: "line\n", data: {}, expected: "line\n" },
];

describe("cl-render", () => {
  it.each(renderCases)(
    "cl-render: $name template file plus data file prints exactly the output and exits 0",
    async ({ template, data, expected }) => {
      const t = file("t.txt", template);
      const d = file("d.json", JSON.stringify(data));
      const r = await run(["render", t, "--data", d]);
      expect({ code: r.code, out: r.out, err: r.err }).toEqual({
        code: 0,
        out: expected,
        err: "",
      });
    },
  );

  it("cl-render: data from stdin ('-') with a template file", async () => {
    const t = file("t2.txt", "Hi ${{name}}!");
    const r = await run(["render", t, "--data", "-"], JSON.stringify({ name: "Bo" }));
    expect({ code: r.code, out: r.out }).toEqual({ code: 0, out: "Hi Bo!" });
  });

  it("cl-render: template from stdin ('-') with a data file", async () => {
    const d = file("d2.json", JSON.stringify({ name: "Cy" }));
    const r = await run(["render", "-", "--data", d], "Hi ${{name}}!");
    expect({ code: r.code, out: r.out }).toEqual({ code: 0, out: "Hi Cy!" });
  });

  it("cl-render: no --data renders with empty data", async () => {
    const t = file("t3.txt", "static");
    const r = await run(["render", t]);
    expect({ code: r.code, out: r.out }).toEqual({ code: 0, out: "static" });
  });

  it("cl-render: --json prints the full RenderResult and keeps the exit code", async () => {
    const t = file("t4.txt", "Hi ${{name}}!");
    const d = file("d4.json", JSON.stringify({ name: "Di" }));
    const r = await run(["render", t, "--data", d, "--json"]);
    expect(r.code).toBe(0);
    const result = JSON.parse(r.out);
    expect(result).toMatchObject({ ok: true, output: "Hi Di!", diagnostics: [], messages: [] });
    expect(result.stats).toEqual(
      expect.objectContaining({ chars: 6, iterations: 0, sectionsOmitted: 0 }),
    );
    expect(typeof result.stats.estTokens).toBe("number");
  });

  it("cl-render: a template error exits 1, prints file:line:col: error code: message on stderr, stdout empty", async () => {
    const t = file("bad.txt", "line one\n  ${{missing}}\n");
    const r = await run(["render", t, "--strict"]);
    expect(r.code).toBe(1);
    expect(r.out).toBe("");
    const lines = r.err.split("\n").filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const m = /^(.+):(\d+):(\d+): error ([a-z-]+): (.+)$/.exec(lines[0] ?? "");
    expect(m).not.toBeNull();
    expect(m![1]).toBe(t);
    expect(Number(m![2])).toBe(2);
    expect(m![4]).toBe("missing-variable");
  });

  it("cl-render: a syntax error exits 1 with a located error line on stderr", async () => {
    const t = file("syn.txt", "{{IF a}}never closed");
    const r = await run(["render", t]);
    expect(r.code).toBe(1);
    expect(r.out).toBe("");
    expect(r.err).toMatch(/:\d+:\d+: error [a-z-]+: /);
  });

  it("cl-render: --json with a template error prints the failed result and still exits 1", async () => {
    const t = file("bad2.txt", "${{missing}}");
    const r = await run(["render", t, "--strict", "--json"]);
    expect(r.code).toBe(1);
    const result = r.out ? JSON.parse(r.out) : { diagnostics: [{}] };
    expect(result.ok).toBe(false);
    expect(result.output).toBe("");
    expect(result.diagnostics[0].code).toBe("missing-variable");
  });
});

describe("cl-others", () => {
  it("cl-others: validate prints JSON {ok:true} and exits 0 for a good template", async () => {
    const t = file("v1.txt", "Hi ${{name}}");
    const r = await run(["validate", t]);
    expect(r.code).toBe(0);
    expect(r.out ? JSON.parse(r.out) : null).toEqual({ ok: true, diagnostics: [] });
  });

  it("cl-others: validate exits 1 and prints the diagnostics when not ok", async () => {
    const t = file("v2.txt", "{{IF a}}open");
    const r = await run(["validate", t]);
    expect(r.code).toBe(1);
    const result = r.out ? JSON.parse(r.out) : { ok: true, diagnostics: [] };
    expect(result.ok).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("cl-others: validate reads the template from stdin", async () => {
    const r = await run(["validate", "-"], "plain");
    expect(r.code).toBe(0);
    expect(r.out ? JSON.parse(r.out).ok : undefined).toBe(true);
  });

  it("cl-others: analyze prints the analysis JSON with required and blocks", async () => {
    const t = file("a1.txt", '${{a}} ${{b ?? "x"}}{{IF c}}y{{END_IF}}');
    const r = await run(["analyze", t]);
    expect(r.code).toBe(0);
    const result = r.out ? JSON.parse(r.out) : {};
    expect(result.blocks).toEqual(expect.objectContaining({ IF: 1 }));
    expect(JSON.stringify(result)).toContain('"required"');
  });

  it("cl-others: spec prints the spec JSON", async () => {
    const r = await run(["spec"]);
    expect(r.code).toBe(0);
    const spec = r.out ? JSON.parse(r.out) : {};
    expect(Object.keys(spec)).toEqual(
      expect.arrayContaining(["version", "blocks", "filters", "operators", "limits", "syntax"]),
    );
  });
});

describe("cl-usage", () => {
  const usageErrors: { name: string; argv: string[]; stdin?: string }[] = [
    { name: "no arguments", argv: [] },
    { name: "unknown subcommand", argv: ["frobnicate"] },
    { name: "unknown option", argv: ["render", "x.txt", "--bogus"] },
    { name: "missing template file", argv: ["render", "does-not-exist-12345.txt"] },
    {
      name: "missing data file",
      argv: ["render", "-", "--data", "does-not-exist-12345.json"],
      stdin: "x",
    },
    { name: "render without a template argument", argv: ["render"] },
    { name: "both template and data from stdin", argv: ["render", "-", "--data", "-"], stdin: "x" },
    { name: "non-numeric limit", argv: ["render", "-", "--max-depth", "abc"], stdin: "x" },
  ];

  it.each(usageErrors)(
    "cl-usage: $name exits 2 with a message on stderr and nothing on stdout",
    async ({ argv, stdin }) => {
      const r = await run(argv, stdin ?? "");
      expect({ code: r.code, out: r.out }).toEqual({ code: 2, out: "" });
      expect(r.err.trim().length).toBeGreaterThan(0);
    },
  );

  it("cl-usage: invalid data JSON exits 2 with a message on stderr", async () => {
    const t = file("u1.txt", "x");
    const d = file("u1.json", "{not json");
    const r = await run(["render", t, "--data", d]);
    expect({ code: r.code, out: r.out }).toEqual({ code: 2, out: "" });
    expect(r.err.trim().length).toBeGreaterThan(0);
  });

  it("cl-usage: data that is not a JSON object exits 2", async () => {
    const t = file("u2.txt", "x");
    const d = file("u2.json", "[1,2]");
    const r = await run(["render", t, "--data", d]);
    expect(r.code).toBe(2);
    expect(r.err.trim().length).toBeGreaterThan(0);
  });

  it("cl-usage: no arguments prints usage naming the subcommands on stderr", async () => {
    const r = await run([]);
    for (const w of ["render", "validate", "analyze", "spec", "serve"]) {
      expect(r.err).toContain(w);
    }
  });

  it("cl-usage: --help exits 0 and prints usage on stdout", async () => {
    const r = await run(["--help"]);
    expect({ code: r.code, err: r.err }).toEqual({ code: 0, err: "" });
    for (const w of ["render", "validate", "analyze", "spec", "serve"]) {
      expect(r.out).toContain(w);
    }
  });
});

describe("cl-limits", () => {
  it("cl-limits: --no-strict renders a missing variable as empty", async () => {
    const t = file("l1.txt", "a${{missing}}b");
    const r = await run(["render", t, "--no-strict"]);
    expect({ code: r.code, out: r.out }).toEqual({ code: 0, out: "ab" });
  });

  it("cl-limits: --strict reports a missing variable as an error", async () => {
    const t = file("l2.txt", "a${{missing}}b");
    const r = await run(["render", t, "--strict"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("missing-variable");
  });

  const limitCases: {
    name: string;
    template: string;
    data: object;
    flags: string[];
    code: string;
  }[] = [
    {
      name: "--max-iterations 2 fails a 3-item FOR",
      template: "{{FOR xs AS x}}${{x}}{{END_FOR}}",
      data: { xs: [1, 2, 3] },
      flags: ["--max-iterations", "2"],
      code: "limit-iterations",
    },
    {
      name: "--max-output-chars 5 fails a longer output",
      template: "abcdefghij",
      data: {},
      flags: ["--max-output-chars", "5"],
      code: "limit-output",
    },
    {
      name: "--max-depth 1 fails nested blocks",
      template: "{{IF a}}{{IF b}}x{{END_IF}}{{END_IF}}",
      data: { a: true, b: true },
      flags: ["--max-depth", "1"],
      code: "limit-depth",
    },
  ];

  it.each(limitCases)("cl-limits: $name", async ({ template, data, flags, code }) => {
    const t = file("lim.txt", template);
    const d = file("lim.json", JSON.stringify(data));
    const r = await run(["render", t, "--data", d, ...flags]);
    expect(r.code).toBe(1);
    expect(r.out).toBe("");
    expect(r.err).toContain(`error ${code}:`);
  });

  it("cl-limits: the same FOR passes within the limit", async () => {
    const t = file("lim2.txt", "{{FOR xs AS x}}${{x}}{{END_FOR}}");
    const d = file("lim2.json", JSON.stringify({ xs: [1, 2, 3] }));
    const r = await run(["render", t, "--data", d, "--max-iterations", "3"]);
    expect({ code: r.code, out: r.out }).toEqual({ code: 0, out: "123" });
  });
});

function request(port: number, body: object): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/v1/render",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode ?? 0, json: JSON.parse(text) });
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.end(payload);
  });
}

describe("cl-serve", () => {
  it("cl-serve: serve prints its address, answers POST /v1/render and resolves 0 after abort", async () => {
    const ac = new AbortController();
    const r: Run = { code: -1, out: "", err: "", stdinReads: 0 };
    const done = main(["serve", "--port", "0", "--host", "127.0.0.1"], {
      readStdin: async () => "",
      stdout: (t) => {
        r.out += t;
      },
      stderr: (t) => {
        r.err += t;
      },
      signal: ac.signal,
    });
    let exit: number | "pending" = "pending";
    void done.then((c) => {
      exit = c;
    });
    let port = 0;
    let served: { status: number; json: any } | undefined;
    let code: number | undefined;
    try {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline && exit === "pending") {
        const m = /http:\/\/127\.0\.0\.1:(\d+)/.exec(r.out);
        if (m) {
          port = Number(m[1]);
          break;
        }
        await new Promise((res) => setTimeout(res, 25));
      }
      if (port > 0) {
        served = await request(port, { template: "Hi ${{n}}", data: { n: "Zed" } });
      }
    } finally {
      ac.abort();
      code = await Promise.race([
        done,
        new Promise<number>((res) => setTimeout(() => res(-2), 3000)),
      ]);
    }
    expect(port).toBeGreaterThan(0);
    expect(served?.status).toBe(200);
    expect(served?.json).toMatchObject({ ok: true, output: "Hi Zed" });
    expect(code).toBe(0);
  }, 15000);
});
```

## 4. Diff

5 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/cli/index.ts b/cli/index.ts
index 407e145..6b40867 100644
--- a/cli/index.ts
+++ b/cli/index.ts
@@ -1,6 +1,11 @@
 #!/usr/bin/env node
 import { main } from "./main";
 
+const shutdown = new AbortController();
+const stop = () => shutdown.abort();
+process.once("SIGINT", stop);
+process.once("SIGTERM", stop);
+
 void main(process.argv.slice(2), {
   readStdin: async () => {
     const chunks: Buffer[] = [];
@@ -9,6 +14,9 @@ void main(process.argv.slice(2), {
   },
   stdout: (text) => void process.stdout.write(text),
   stderr: (text) => void process.stderr.write(text),
+  signal: shutdown.signal,
 }).then((code) => {
+  process.off("SIGINT", stop);
+  process.off("SIGTERM", stop);
   process.exitCode = code;
 });
diff --git a/cli/main.ts b/cli/main.ts
index 126f7bf..304c956 100644
--- a/cli/main.ts
+++ b/cli/main.ts
@@ -1,3 +1,8 @@
+import { promises as fs } from "fs";
+import { parseArgs } from "util";
+import { analyze, Diagnostic, Limits, render, spec, TemplateError, validate } from "../core/src";
+import { createServer, listen } from "../api";
+
 export interface CliIo {
   readStdin(): Promise<string>;
   stdout(text: string): void;
@@ -5,7 +10,222 @@ export interface CliIo {
   signal?: AbortSignal;
 }
 
-/** Signature-only stub: the real command line replaces it. */
-export async function main(_argv: string[], _io: CliIo): Promise<number> {
-  return 99;
+const USAGE = `Usage: template-resolver <command> [options]
+
+Commands:
+  render <template-file|-> [--data <file|->] [--strict | --no-strict]
+         [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]
+      Render a template and print the output.
+  validate <template-file|->   Check a template; prints {ok, diagnostics} as JSON.
+  analyze <template-file|->    Print the variables, filters and blocks a template uses.
+  spec                         Print the template language spec as JSON.
+  serve [--port n] [--host h]  Start the HTTP API (default 127.0.0.1:3000).
+
+"-" reads stdin; only one input may come from stdin.
+Exit codes: 0 ok, 1 template errors, 2 usage or I/O errors.
+`;
+
+const STDIN = "-";
+const STDIN_NAME = "<stdin>";
+
+class UsageError extends Error {}
+class InputError extends Error {}
+
+type Options = NonNullable<Parameters<typeof parseArgs>[0]>["options"];
+type Values = Record<string, string | boolean | undefined>;
+
+const COMMAND_OPTIONS: Record<string, Options> = {
+  render: {
+    data: { type: "string" },
+    strict: { type: "boolean" },
+    "no-strict": { type: "boolean" },
+    "max-iterations": { type: "string" },
+    "max-output-chars": { type: "string" },
+    "max-depth": { type: "string" },
+    json: { type: "boolean" },
+  },
+  validate: {},
+  analyze: {},
+  spec: {},
+  serve: { port: { type: "string" }, host: { type: "string" } },
+};
+
+/** Run the command line and resolve the exit code; never exits the process. */
+export async function main(argv: string[], io: CliIo): Promise<number> {
+  const [command, ...rest] = argv;
+  if (command === "--help" || command === "-h" || rest.includes("--help")) {
+    io.stdout(USAGE);
+    return 0;
+  }
+  try {
+    if (command === undefined) throw new UsageError("missing command");
+    const options = COMMAND_OPTIONS[command];
+    if (options === undefined) throw new UsageError(`unknown command '${command}'`);
+    const { values, positionals } = parseCommand(rest, options);
+    switch (command) {
+      case "render":
+        return await runRender(values, oneInput(positionals), io);
+      case "validate":
+        return await runValidate(oneInput(positionals), io);
+      case "analyze":
+        return await runAnalyze(oneInput(positionals), io);
+      case "spec":
+        noInput(positionals);
+        printJson(io, spec());
+        return 0;
+      default:
+        noInput(positionals);
+        return await runServe(values, io);
+    }
+  } catch (error) {
+    if (error instanceof UsageError) {
+      io.stderr(`template-resolver: ${error.message}\n\n${USAGE}`);
+      return 2;
+    }
+    if (error instanceof InputError) {
+      io.stderr(`template-resolver: ${error.message}\n`);
+      return 2;
+    }
+    throw error;
+  }
+}
+
+function parseCommand(args: string[], options: Options): { values: Values; positionals: string[] } {
+  try {
+    const { values, positionals } = parseArgs({ args, options, allowPositionals: true, strict: true });
+    return { values: values as Values, positionals };
+  } catch (error) {
+    throw new UsageError(error.message);
+  }
+}
+
+function oneInput(positionals: string[]): string {
+  if (positionals.length !== 1) throw new UsageError("expected one template file or '-'");
+  return positionals[0];
+}
+
+function noInput(positionals: string[]): void {
+  if (positionals.length > 0) throw new UsageError(`unexpected argument '${positionals[0]}'`);
+}
+
+async function runRender(values: Values, templatePath: string, io: CliIo): Promise<number> {
+  const dataPath = values.data as string | undefined;
+  if (templatePath === STDIN && dataPath === STDIN) {
+    throw new UsageError("only one input may be read from stdin");
+  }
+  if (values.strict && values["no-strict"]) {
+    throw new UsageError("--strict and --no-strict cannot be combined");
+  }
+  const limits = parseLimits(values);
+  const template = await readInput(templatePath, io);
+  const data = dataPath === undefined ? {} : parseData(await readInput(dataPath, io), dataPath);
+
+  const result = render(template, data, { strictMode: !values["no-strict"], limits });
+  if (values.json) {
+    printJson(io, result);
+  } else {
+    io.stdout(result.output);
+    printDiagnostics(io, displayName(templatePath), result.diagnostics);
+  }
+  return result.ok ? 0 : 1;
+}
+
+async function runValidate(templatePath: string, io: CliIo): Promise<number> {
+  const result = validate(await readInput(templatePath, io));
+  printJson(io, result);
+  return result.ok ? 0 : 1;
+}
+
+async function runAnalyze(templatePath: string, io: CliIo): Promise<number> {
+  const template = await readInput(templatePath, io);
+  try {
+    printJson(io, analyze(template));
+    return 0;
+  } catch (error) {
+    if (!(error instanceof TemplateError)) throw error;
+    const { code, detail, line, column } = error;
+    printDiagnostics(io, displayName(templatePath), [
+      { severity: "error", code, message: detail, line, column },
+    ]);
+    return 1;
+  }
+}
+
+async function runServe(values: Values, io: CliIo): Promise<number> {
+  const port = values.port === undefined ? 3000 : parseCount(values.port as string, "--port");
+  const host = (values.host as string | undefined) ?? "127.0.0.1";
+  const server = createServer();
+  const address = await listen(server, port, host).catch((error: Error) => {
+    throw new InputError(`cannot listen on ${host}:${port}: ${error.message}`);
+  });
+  io.stdout(`listening on http://${address.host}:${address.port}\n`);
+  await aborted(io.signal);
+  await new Promise<void>((resolve) => {
+    server.close(() => resolve());
+    server.closeAllConnections();
+  });
+  return 0;
+}
+
+function aborted(signal: AbortSignal | undefined): Promise<void> {
+  return new Promise((resolve) => {
+    if (signal === undefined) return;
+    if (signal.aborted) return resolve();
+    signal.addEventListener("abort", () => resolve(), { once: true });
+  });
+}
+
+function parseLimits(values: Values): Partial<Limits> {
+  const flags: [string, keyof Limits][] = [
+    ["max-iterations", "maxIterations"],
+    ["max-output-chars", "maxOutputChars"],
+    ["max-depth", "maxDepth"],
+  ];
+  const limits: Partial<Limits> = {};
+  for (const [flag, key] of flags) {
+    const value = values[flag];
+    if (value !== undefined) limits[key] = parseCount(value as string, `--${flag}`);
+  }
+  return limits;
+}
+
+function parseCount(value: string, flag: string): number {
+  if (!/^\d+$/.test(value)) throw new UsageError(`${flag} must be a non-negative integer`);
+  return Number(value);
+}
+
+async function readInput(path: string, io: CliIo): Promise<string> {
+  if (path === STDIN) return io.readStdin();
+  try {
+    return await fs.readFile(path, "utf8");
+  } catch (error) {
+    throw new InputError(`cannot read '${path}': ${error.message}`);
+  }
+}
+
+function parseData(text: string, path: string): Record<string, unknown> {
+  let data: unknown;
+  try {
+    data = JSON.parse(text);
+  } catch (error) {
+    throw new InputError(`invalid JSON in ${displayName(path)}: ${error.message}`);
+  }
+  if (data === null || typeof data !== "object" || Array.isArray(data)) {
+    throw new InputError(`data in ${displayName(path)} must be a JSON object`);
+  }
+  return data as Record<string, unknown>;
+}
+
+function displayName(path: string): string {
+  return path === STDIN ? STDIN_NAME : path;
+}
+
+function printDiagnostics(io: CliIo, name: string, diagnostics: Diagnostic[]): void {
+  for (const d of diagnostics) {
+    io.stderr(`${name}:${d.line}:${d.column}: ${d.severity} ${d.code}: ${d.message}\n`);
+  }
+}
+
+function printJson(io: CliIo, value: unknown): void {
+  io.stdout(`${JSON.stringify(value, null, 2)}\n`);
 }
```

## Gate run
The card's gate command as it last ran, before this packet was built. Output only: run the command yourself to check it.
- Command: `node node_modules/jest/bin/jest.js --runTestsByPath tests/headless/cli.test.ts --json`
- Exit status: 0
- Tests: 36 passed, 0 failed
- Failing tests: none

## Output

Answer with one JSON object and nothing else, in this shape:

```json
{
  "restatement": "the objective in your own words, one short paragraph",
  "brief_mismatch": null,
  "verification_plan": ["each check you will make, written from section 1 alone"],
  "findings": [{
    "title": "one line",
    "class": "defect | goal-risk | drift | simplification",
    "serves": { "target": "c1 | m1 | card-goal | cycle-goal | project-goal", "scenario": "the concrete failure against that target" },
    "rubric": "the rubric item or criterion cited",
    "reproduction": "falsifiable steps that show the failure",
    "evidence": ["doc:<path>", "code:<path>:<line>", "test:<name>", "diff:<path>"],
    "location": "path:line or null"
  }],
  "responses": [{ "finding": "f1", "verdict": "sustain | withdraw", "evidence": ["code:src/a.mjs:12"] }]
}
```

Rules:

- Judge the diff against section 1 and the goals it names, never against how the work was done. Write `restatement` before you read section 3.
- Product tier and up: write `verification_plan` from section 1 alone, before you read section 3.
- `brief_mismatch`: a string when the brief, the criteria and the goals contradict each other; otherwise null.
- Every finding names what it serves in `serves.target`: a criterion (c1, c2, ...), a must-not (m1, m2, ...) or a goal (card-goal, cycle-goal, project-goal). A finding that serves nothing in the objective chain is dropped.
- `defect` and `goal-risk` need a rubric item and falsifiable reproduction steps; `goal-risk` also needs evidence. Every evidence entry is `<kind>:<ref>` with a kind of doc, code, test or diff.
- Answer each question in the reviewer brief. A weak answer to a goal-critical question is a `goal-risk` finding serving that question's goal (a fix request: revise and resubmit). A weak answer to a polish question is a `drift` finding (noted for the lead, never a fix request). Strong and adequate answers need no finding.
- `responses` answers earlier findings by label when you are asked to; otherwise leave it empty.
