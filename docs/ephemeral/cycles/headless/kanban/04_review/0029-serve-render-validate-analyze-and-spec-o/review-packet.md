---
type: review-packet
card: 0029-serve-render-validate-analyze-and-spec-o
tier: product
built_at: 2026-10-14T01:36:57.915Z
base: fa65aa2f0b504ab9f9827c090d1cf01cbb550e0d
head: 7e298a1a418ac21a9902a4f3eb30ad0898639eac
frozen: true
brief_sha256: 1f310d0c269ddc91f944ef1702a31b5fdf9d9e4247f7f679375b3141cfcaecdf
manifest_sha256: 920b6a380abe6441cbf858af90181eb275d386141640d5c9414500769c4e1b78
criteria_sha256: 00e14b675d25fbb91ffe114f55c22b35c7e508e749d4a2c8ded36988c7bb9888
scope_sha256: 7f469748c8517efad4a538b4f2434f60dd06feeb9dc5927097ead67d2434b788
diff_sha256: 38972a85938e81a09abbbd4b6a89d6c6f8ae25126a534322c29c5ea7a22e40b9
omitted_paths: 5
criteria_count: 5
must_not_count: 3
---

# Review packet: 0029-serve-render-validate-analyze-and-spec-o

Manifest amended after the freeze at 2026-10-14T01:36:49.978Z by lead: stubs existed so these files are edits; stray entry removed (add -api/index.ts, add -api/openapi.json, add -api/routes.ts, edit -x)

Manifest amended after the freeze at 2026-10-14T01:36:50.081Z by lead: stubs from the test writer already existed so these files are edits (edit +api/index.ts, edit +api/openapi.json, edit +api/routes.ts)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: the four routes plus the OpenAPI route behave as design.md says, with JSON errors and request limits.

### Criteria

- c1 (verify: test): ap-routes: POST /v1/render, /v1/validate, /v1/analyze and GET /v1/spec return the documented 200 bodies, and a template error is a 200 with ok false and located diagnostics
- c2 (verify: test): ap-errors: bad JSON, a missing or non-string template, a non-object data and bad option types return 400 invalid-request; unknown paths 404 not-found; wrong methods 405 method-not-allowed with Allow; bodies over maxBodyBytes 413 payload-too-large; a non-JSON POST content type 415 unsupported-media-type; every response is JSON
- c3 (verify: test): ap-limits: request limits can only lower the server limits and a request cannot raise them
- c4 (verify: test): oa-doc: GET /v1/openapi.json serves api/openapi.json byte for byte, it is OpenAPI 3.1, and its paths and methods equal the router table
- c5 (verify: test): e2-server: the end-to-end test listens on port 0 on 127.0.0.1, exercises every route over real HTTP with node's http client, and closes the server

### Must not

- m1: add a runtime dependency
- m2: listen on any host but 127.0.0.1 unless asked
- m3: leave a server or socket open after a test

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: the four routes plus the OpenAPI route behave as design.md says, with JSON errors and request limits.
Must not:
- add a runtime dependency
- listen on any host but 127.0.0.1 unless asked
- leave a server or socket open after a test

## Questions

goal-critical: does a hostile body (huge, wrong type, wrong content type) get a JSON error and never crash the process?
goal-critical: does the OpenAPI document describe what the server actually returns?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/headless-contract.md
```

### spec.md as of base fa65aa2

```
# Spec

## Acceptance criteria

- ap-routes: POST /v1/render, /v1/validate, /v1/analyze and GET /v1/spec return the documented 200 bodies, and a template error is a 200 with ok false and located diagnostics
- ap-errors: bad JSON, a missing or non-string template, a non-object data and bad option types return 400 invalid-request; unknown paths 404 not-found; wrong methods 405 method-not-allowed with Allow; bodies over maxBodyBytes 413 payload-too-large; a non-JSON POST content type 415 unsupported-media-type; every response is JSON
- ap-limits: request limits can only lower the server limits and a request cannot raise them
- oa-doc: GET /v1/openapi.json serves api/openapi.json byte for byte, it is OpenAPI 3.1, and its paths and methods equal the router table
- e2-server: the end-to-end test listens on port 0 on 127.0.0.1, exercises every route over real HTTP with node's http client, and closes the server
```

### card.md as of base fa65aa2

```
# Serve render, validate, analyze and spec over HTTP

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

A stateless HTTP API over core using only node's http module, an OpenAPI document served and committed, and an end-to-end test that starts the server on an ephemeral port.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `ap-routes` POST /v1/render, /v1/validate, /v1/analyze and GET /v1/spec return the documented 200 bodies, and a template error is a 200 with ok false and located diagnostics
- `contract` `ap-errors` bad JSON, a missing or non-string template, a non-object data and bad option types return 400 invalid-request; unknown paths 404 not-found; wrong methods 405 method-not-allowed with Allow; bodies over maxBodyBytes 413 payload-too-large; a non-JSON POST content type 415 unsupported-media-type; every response is JSON
- `contract` `ap-limits` request limits can only lower the server limits and a request cannot raise them
- `contract` `oa-doc` GET /v1/openapi.json serves api/openapi.json byte for byte, it is OpenAPI 3.1, and its paths and methods equal the router table
- `contract` `e2-server` the end-to-end test listens on port 0 on 127.0.0.1, exercises every route over real HTTP with node's http client, and closes the server


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- add a runtime dependency
- listen on any host but 127.0.0.1 unless asked
- leave a server or socket open after a test


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the README card documents the surface.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

createServer(options) and listen helper from api/index.ts; the HTTP surface in design.md.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `api/index.ts` | add | none |
| `api/openapi.json` | add | none |
| `api/routes.ts` | add | none |
| `api/server.ts` | add | none |
| `x` | edit | none |

Files scope: `api/`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: `api/server.ts`
- remove: none
- edit: `api/index.ts`, `api/openapi.json`, `api/routes.ts`
- files_scope: `api/`

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

These test files were committed before the work began, at base fa65aa2. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/headless/api.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as path from "path";
import { check, start, stop, call, postJson, Running, Reply } from "./http-helpers";
import { routes } from "../../api/routes";

let running: Running | undefined;
afterEach(async () => {
  await stop(running);
  running = undefined;
});

async function up(options?: Parameters<typeof start>[0]): Promise<Running> {
  running = await start(options);
  return running;
}

function expectJson(r: Reply, label: string): void {
  check(String(r.headers["content-type"] ?? ""), `${label}: content-type is application/json`).toMatch(
    /^application\/json/
  );
  check(r.json, `${label}: body parses as JSON`).toBeDefined();
}

function expectError(r: Reply, status: number, code: string, label: string): void {
  check(r.status, `${label}: status ${status}`).toBe(status);
  expectJson(r, label);
  check(Object.keys(r.json ?? {}), `${label}: body has only an error key`).toEqual(["error"]);
  check(r.json.error.code, `${label}: error code ${code}`).toBe(code);
  check(typeof r.json.error.message, `${label}: error message is a string`).toBe("string");
  check(r.json.error.message.length, `${label}: error message is not empty`).toBeGreaterThan(0);
}

function expectLocated(diagnostics: any[], label: string): void {
  check(Array.isArray(diagnostics), `${label}: diagnostics is an array`).toBe(true);
  check(diagnostics.length, `${label}: at least one diagnostic`).toBeGreaterThan(0);
  for (const d of diagnostics) {
    check(typeof d.code, `${label}: diagnostic code is a string`).toBe("string");
    check(d.line, `${label}: diagnostic line is 1-based`).toBeGreaterThan(0);
    check(d.column, `${label}: diagnostic column is 1-based`).toBeGreaterThan(0);
  }
}

describe("ap-routes: documented 200 bodies", () => {
  it("ap-routes: POST /v1/render returns the full render result", async () => {
    const r = await postJson(await up(), "/v1/render", {
      template: "Hello ${{name}}!",
      data: { name: "World" },
    });
    check(r.status, "render: 200").toBe(200);
    expectJson(r, "render");
    check(r.json.ok, "render: ok true").toBe(true);
    check(r.json.output, "render: output").toBe("Hello World!");
    check(r.json.messages, "render: messages is an empty array").toEqual([]);
    check(r.json.diagnostics, "render: no diagnostics").toEqual([]);
    check(r.json.stats, "render: stats shape").toEqual({
      chars: 12,
      estTokens: 3,
      sectionsOmitted: 0,
      iterations: 0,
    });
  });

  it("ap-routes: POST /v1/render accepts a missing data and a charset in the content type", async () => {
    const r = await call(await up(), "POST", "/v1/render", JSON.stringify({ template: "plain" }), {
      "content-type": "application/json; charset=utf-8",
    });
    check(r.status, "render without data: 200").toBe(200);
    check(r.json?.ok, "render without data: ok").toBe(true);
    check(r.json?.output, "render without data: output").toBe("plain");
  });

  it("ap-routes: POST /v1/render honours options.strictMode and options.limits", async () => {
    const r = await postJson(await up(), "/v1/render", {
      template: "x",
      data: {},
      options: { strictMode: false, limits: { maxOutputChars: 1000 } },
    });
    check(r.status, "render options: 200").toBe(200);
    check(r.json?.ok, "render options: ok").toBe(true);
  });

  it("ap-routes: a template error is a 200 with ok false and located diagnostics", async () => {
    const r = await postJson(await up(), "/v1/render", {
      template: "line one\n${{nope}}",
      data: {},
    });
    check(r.status, "template error: 200 not an HTTP error").toBe(200);
    expectJson(r, "template error");
    check(r.json.ok, "template error: ok false").toBe(false);
    check(r.json.output, "template error: output is empty").toBe("");
    expectLocated(r.json.diagnostics, "template error");
    check(r.json.diagnostics[0].code, "template error: first diagnostic is the stopping error").toBe(
      "missing-variable"
    );
    check(r.json.diagnostics[0].severity, "template error: severity").toBe("error");
    check(r.json.diagnostics[0].line, "template error: points at the second line").toBe(2);
  });

  it("ap-routes: POST /v1/validate returns ok and diagnostics", async () => {
    const s = await up();
    const good = await postJson(s, "/v1/validate", { template: "Hi ${{name}}" });
    check(good.status, "validate valid: 200").toBe(200);
    expectJson(good, "validate valid");
    check(good.json.ok, "validate valid: ok true").toBe(true);
    check(good.json.diagnostics, "validate valid: no diagnostics").toEqual([]);

    const bad = await postJson(s, "/v1/validate", { template: "{{FOR items AS i}}never closed" });
    check(bad.status, "validate invalid: 200").toBe(200);
    check(bad.json?.ok, "validate invalid: ok false").toBe(false);
    expectLocated(bad.json?.diagnostics, "validate invalid");
  });

  it("ap-routes: POST /v1/analyze returns variables with required, blocks and filters", async () => {
    const r = await postJson(await up(), "/v1/analyze", {
      template: '{{FOR items AS i}}${{i | trim}}{{END_FOR}} ${{title ?? "none"}}',
    });
    check(r.status, "analyze: 200").toBe(200);
    expectJson(r, "analyze");
    const byName = (n: string) => r.json.variables.find((v: any) => v.name === n);
    check(byName("items"), "analyze: items detected").toBeDefined();
    check(byName("items").required, "analyze: a plain variable is required").toBe(true);
    check(byName("title"), "analyze: title detected").toBeDefined();
    check(byName("title").required, "analyze: a variable with a default is not required").toBe(false);
    check(r.json.blocks.FOR, "analyze: one FOR block counted").toBe(1);
    check(
      r.json.filters.map((f: any) => f.name),
      "analyze: trim filter listed"
    ).toContain("trim");
  });

  it("ap-routes: GET /v1/spec returns version, blocks, filters, operators and limits", async () => {
    const r = await call(await up(), "GET", "/v1/spec");
    check(r.status, "spec: 200").toBe(200);
    expectJson(r, "spec");
    check(typeof r.json.version, "spec: version is a string").toBe("string");
    check(
      r.json.blocks.map((b: any) => b.name),
      "spec: FOR block listed"
    ).toContain("FOR");
    check(
      r.json.filters.map((f: any) => f.name),
      "spec: trim filter listed"
    ).toContain("trim");
    check(Array.isArray(r.json.operators), "spec: operators is an array").toBe(true);
    check(r.json.operators.length, "spec: operators not empty").toBeGreaterThan(0);
    check(r.json.limits, "spec: default limits").toEqual({
      maxIterations: 10000,
      maxOutputChars: 1000000,
      maxDepth: 32,
    });
  });
});

describe("ap-errors: malformed requests", () => {
  const badBodies: [string, string, unknown][] = [
    ["missing template", "/v1/render", { data: {} }],
    ["non-string template", "/v1/render", { template: 5 }],
    ["array data", "/v1/render", { template: "x", data: [] }],
    ["string data", "/v1/render", { template: "x", data: "text" }],
    ["strictMode as a string", "/v1/render", { template: "x", options: { strictMode: "yes" } }],
    ["limits as a string", "/v1/render", { template: "x", options: { limits: "many" } }],
    ["validate without template", "/v1/validate", {}],
    ["validate with non-string template", "/v1/validate", { template: ["x"] }],
    ["analyze without template", "/v1/analyze", { data: {} }],
    ["analyze with non-string template", "/v1/analyze", { template: null }],
  ];

  it.each(badBodies)("ap-errors: 400 invalid-request for %s", async (label, route, payload) => {
    expectError(await postJson(await up(), route, payload), 400, "invalid-request", label);
  });

  it.each([["/v1/render"], ["/v1/validate"], ["/v1/analyze"]])(
    "ap-errors: 400 invalid-request for bad JSON on %s",
    async (route) => {
      const r = await call(await up(), "POST", route, "{not json", {
        "content-type": "application/json",
      });
      expectError(r, 400, "invalid-request", `bad JSON ${route}`);
    }
  );

  it.each([
    ["GET", "/nope"],
    ["POST", "/v1/unknown"],
    ["GET", "/v1"],
    ["GET", "/"],
  ])("ap-errors: 404 not-found for %s %s", async (method, route) => {
    const r = await call(await up(), method, route);
    expectError(r, 404, "not-found", `${method} ${route}`);
  });

  it.each([
    ["GET", "/v1/render", "POST"],
    ["GET", "/v1/validate", "POST"],
    ["GET", "/v1/analyze", "POST"],
    ["POST", "/v1/spec", "GET"],
    ["POST", "/v1/openapi.json", "GET"],
    ["DELETE", "/v1/render", "POST"],
  ])("ap-errors: 405 method-not-allowed for %s %s with Allow", async (method, route, allow) => {
    const r = await call(await up(), method, route, method === "POST" ? "{}" : undefined, {
      "content-type": "application/json",
    });
    expectError(r, 405, "method-not-allowed", `${method} ${route}`);
    check(String(r.headers["allow"] ?? ""), `${method} ${route}: Allow header names ${allow}`).toContain(allow);
  });

  it("ap-errors: 413 payload-too-large when the body exceeds maxBodyBytes", async () => {
    const r = await postJson(await up({ maxBodyBytes: 64 }), "/v1/render", {
      template: "x".repeat(500),
    });
    expectError(r, 413, "payload-too-large", "oversized body");
  });

  it("ap-errors: a body within maxBodyBytes is accepted", async () => {
    const r = await postJson(await up({ maxBodyBytes: 4096 }), "/v1/render", { template: "ok" });
    check(r.status, "small body: 200").toBe(200);
  });

  it.each([["/v1/render"], ["/v1/validate"], ["/v1/analyze"]])(
    "ap-errors: 415 unsupported-media-type for a text/plain POST to %s",
    async (route) => {
      const r = await call(await up(), "POST", route, JSON.stringify({ template: "x" }), {
        "content-type": "text/plain",
      });
      expectError(r, 415, "unsupported-media-type", `text/plain ${route}`);
    }
  );
});

describe("ap-limits: request limits can only lower the server limits", () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => `v${i}`);
  const template = "{{FOR items AS i}}${{i}}{{END_FOR}}";
  const codes = (r: Reply): string[] => (r.json?.diagnostics ?? []).map((d: any) => d.code);

  it("ap-limits: the server limit applies when the request sets none", async () => {
    const s = await up({ limits: { maxIterations: 5 } });
    const over = await postJson(s, "/v1/render", { template, data: { items: items(6) } });
    check(over.status, "no request limit: 200").toBe(200);
    check(over.json?.ok, "no request limit: 6 items exceed 5").toBe(false);
    check(codes(over), "no request limit: limit-iterations reported").toContain("limit-iterations");
    const under = await postJson(s, "/v1/render", { template, data: { items: items(3) } });
    check(under.json?.ok, "no request limit: 3 items fit in 5").toBe(true);
  });

  it("ap-limits: a request asking for more cannot raise the server limit", async () => {
    const r = await postJson(await up({ limits: { maxIterations: 5 } }), "/v1/render", {
      template,
      data: { items: items(6) },
      options: { limits: { maxIterations: 100 } },
    });
    check(r.status, "raise attempt: 200").toBe(200);
    check(r.json?.ok, "raise attempt: still capped at 5").toBe(false);
    check(codes(r), "raise attempt: limit-iterations reported").toContain("limit-iterations");
  });

  it("ap-limits: a request asking for less lowers the server limit", async () => {
    const r = await postJson(await up({ limits: { maxIterations: 5 } }), "/v1/render", {
      template,
      data: { items: items(3) },
      options: { limits: { maxIterations: 2 } },
    });
    check(r.status, "lower: 200").toBe(200);
    check(r.json?.ok, "lower: 3 items exceed the requested 2").toBe(false);
    check(codes(r), "lower: limit-iterations reported").toContain("limit-iterations");
  });
});

describe("oa-doc: the OpenAPI document", () => {
  const file = path.join(__dirname, "..", "..", "api", "openapi.json");
  const expectedRoutes = [
    "GET /v1/openapi.json",
    "GET /v1/spec",
    "POST /v1/analyze",
    "POST /v1/render",
    "POST /v1/validate",
  ];
  const httpMethods = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

  it("oa-doc: GET /v1/openapi.json serves api/openapi.json byte for byte", async () => {
    const r = await call(await up(), "GET", "/v1/openapi.json");
    check(r.status, "openapi: 200").toBe(200);
    expectJson(r, "openapi");
    check(r.raw.equals(fs.readFileSync(file)), "openapi: body bytes equal the committed file").toBe(true);
  });

  it("oa-doc: the document is OpenAPI 3.1", () => {
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    check(String(doc.openapi ?? ""), "openapi version starts with 3.1").toMatch(/^3\.1/);
  });

  it("oa-doc: the router table holds exactly the five documented routes", () => {
    check(routes.map((r) => `${r.method} ${r.path}`).sort(), "routes table").toEqual(expectedRoutes);
  });

  it("oa-doc: document paths and methods equal the router table", () => {
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    const documented: string[] = [];
    for (const [p, item] of Object.entries<any>(doc.paths ?? {})) {
      for (const m of Object.keys(item)) {
        if (httpMethods.includes(m)) documented.push(`${m} ${p}`);
      }
    }
    const table = routes.map((r) => `${r.method.toLowerCase()} ${r.path}`);
    check(documented.length, "document describes at least one route").toBeGreaterThan(0);
    check(documented.sort(), "documented methods and paths equal the router table").toEqual(table.sort());
  });
});
```

### tests/headless/e2e-api.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as net from "net";
import * as path from "path";
import { check, start, stop, call, postJson, Running } from "./http-helpers";

function refused(port: number, host: string): Promise<string> {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host });
    sock.once("connect", () => {
      sock.destroy();
      resolve("connected");
    });
    sock.once("error", (e: NodeJS.ErrnoException) => resolve(e.code ?? "error"));
  });
}

describe("e2-server: every route over real HTTP", () => {
  let running: Running | undefined;
  afterEach(async () => {
    await stop(running);
    running = undefined;
  });

  it("e2-server: one flow on an ephemeral 127.0.0.1 port exercises all five routes, then the port is closed", async () => {
    running = await start();
    check(running.host, "e2-server: bound to loopback").toBe("127.0.0.1");
    check(running.port, "e2-server: an ephemeral port was assigned").toBeGreaterThan(0);

    const template = "{{FOR items AS i}}${{i}};{{END_FOR}}";
    const validate = await postJson(running, "/v1/validate", { template });
    check(validate.status, "e2-server: validate 200").toBe(200);
    check(validate.json?.ok, "e2-server: validate ok").toBe(true);

    const analyze = await postJson(running, "/v1/analyze", { template });
    check(analyze.status, "e2-server: analyze 200").toBe(200);
    check(
      analyze.json?.variables?.map((v: any) => v.name),
      "e2-server: analyze finds items"
    ).toContain("items");

    const render = await postJson(running, "/v1/render", { template, data: { items: ["a", "b"] } });
    check(render.status, "e2-server: render 200").toBe(200);
    check(render.json?.ok, "e2-server: render ok").toBe(true);
    check(render.json?.output, "e2-server: render output").toBe("a;b;");
    check(render.json?.stats?.iterations, "e2-server: two iterations counted").toBe(2);

    const broken = await postJson(running, "/v1/render", { template: "${{missing}}", data: {} });
    check(broken.status, "e2-server: template error is 200").toBe(200);
    check(broken.json?.ok, "e2-server: template error ok false").toBe(false);

    const spec = await call(running, "GET", "/v1/spec");
    check(spec.status, "e2-server: spec 200").toBe(200);
    check(typeof spec.json?.version, "e2-server: spec version").toBe("string");

    const openapi = await call(running, "GET", "/v1/openapi.json");
    check(openapi.status, "e2-server: openapi 200").toBe(200);
    check(
      openapi.raw.equals(fs.readFileSync(path.join(__dirname, "..", "..", "api", "openapi.json"))),
      "e2-server: openapi bytes equal the committed file"
    ).toBe(true);

    const { port, host } = running;
    await stop(running);
    running = undefined;
    check(await refused(port, host), "e2-server: the closed port refuses connections").toBe("ECONNREFUSED");
  });
});
```

## 4. Diff

5 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/api/index.ts b/api/index.ts
index d5e00e7..86d80a2 100644
--- a/api/index.ts
+++ b/api/index.ts
@@ -1,18 +1,8 @@
 import * as http from "http";
 
-export interface ServerOptions {
-  limits?: Partial<{ maxIterations: number; maxOutputChars: number; maxDepth: number }>;
-  tokenEstimator?: (text: string) => number;
-  maxBodyBytes?: number;
-}
-
-/** Signature-only stub: answers every request 501 with an empty body. */
-export function createServer(_options?: ServerOptions): http.Server {
-  return http.createServer((_req, res) => {
-    res.statusCode = 501;
-    res.end();
-  });
-}
+export { createServer } from "./server";
+export type { ServerOptions } from "./server";
+export { routes } from "./routes";
 
 export function listen(
   server: http.Server,
diff --git a/api/openapi.json b/api/openapi.json
index 0967ef4..6e5013f 100644
--- a/api/openapi.json
+++ b/api/openapi.json
@@ -1 +1,719 @@
-{}
+{
+  "openapi": "3.1.0",
+  "info": {
+    "title": "Template Resolver API",
+    "version": "1.0.0",
+    "description": "A stateless JSON API over the template engine. Template problems are results (200 with ok false and diagnostics), not HTTP errors. Server limits are a ceiling: a request may only lower a limit."
+  },
+  "servers": [
+    {
+      "url": "http://127.0.0.1:3000"
+    }
+  ],
+  "paths": {
+    "/v1/render": {
+      "post": {
+        "operationId": "render",
+        "summary": "Render a template against data",
+        "requestBody": {
+          "required": true,
+          "content": {
+            "application/json": {
+              "schema": {
+                "$ref": "#/components/schemas/RenderRequest"
+              }
+            }
+          }
+        },
+        "responses": {
+          "200": {
+            "description": "The render result; ok is false when the template or data has a problem",
+            "content": {
+              "application/json": {
+                "schema": {
+                  "$ref": "#/components/schemas/RenderResult"
+                }
+              }
+            }
+          },
+          "400": {
+            "$ref": "#/components/responses/InvalidRequest"
+          },
+          "405": {
+            "$ref": "#/components/responses/MethodNotAllowed"
+          },
+          "413": {
+            "$ref": "#/components/responses/PayloadTooLarge"
+          },
+          "415": {
+            "$ref": "#/components/responses/UnsupportedMediaType"
+          },
+          "500": {
+            "$ref": "#/components/responses/InternalError"
+          }
+        }
+      }
+    },
+    "/v1/validate": {
+      "post": {
+        "operationId": "validate",
+        "summary": "Check a template without data",
+        "requestBody": {
+          "required": true,
+          "content": {
+            "application/json": {
+              "schema": {
+                "$ref": "#/components/schemas/TemplateRequest"
+              }
+            }
+          }
+        },
+        "responses": {
+          "200": {
+            "description": "Whether the template is valid, with its diagnostics",
+            "content": {
+              "application/json": {
+                "schema": {
+                  "$ref": "#/components/schemas/ValidateResult"
+                }
+              }
+            }
+          },
+          "400": {
+            "$ref": "#/components/responses/InvalidRequest"
+          },
+          "405": {
+            "$ref": "#/components/responses/MethodNotAllowed"
+          },
+          "413": {
+            "$ref": "#/components/responses/PayloadTooLarge"
+          },
+          "415": {
+            "$ref": "#/components/responses/UnsupportedMediaType"
+          },
+          "500": {
+            "$ref": "#/components/responses/InternalError"
+          }
+        }
+      }
+    },
+    "/v1/analyze": {
+      "post": {
+        "operationId": "analyze",
+        "summary": "List the variables, filters and blocks a template uses",
+        "requestBody": {
+          "required": true,
+          "content": {
+            "application/json": {
+              "schema": {
+                "$ref": "#/components/schemas/TemplateRequest"
+              }
+            }
+          }
+        },
+        "responses": {
+          "200": {
+            "description": "The analysis; a template that does not parse has empty lists and its error in diagnostics",
+            "content": {
+              "application/json": {
+                "schema": {
+                  "$ref": "#/components/schemas/Analysis"
+                }
+              }
+            }
+          },
+          "400": {
+            "$ref": "#/components/responses/InvalidRequest"
+          },
+          "405": {
+            "$ref": "#/components/responses/MethodNotAllowed"
+          },
+          "413": {
+            "$ref": "#/components/responses/PayloadTooLarge"
+          },
+          "415": {
+            "$ref": "#/components/responses/UnsupportedMediaType"
+          },
+          "500": {
+            "$ref": "#/components/responses/InternalError"
+          }
+        }
+      }
+    },
+    "/v1/spec": {
+      "get": {
+        "operationId": "spec",
+        "summary": "Describe the template language",
+        "responses": {
+          "200": {
+            "description": "Blocks, filters, condition operators, default limits and syntax",
+            "content": {
+              "application/json": {
+                "schema": {
+                  "$ref": "#/components/schemas/Spec"
+                }
+              }
+            }
+          },
+          "405": {
+            "$ref": "#/components/responses/MethodNotAllowed"
+          }
+        }
+      }
+    },
+    "/v1/openapi.json": {
+      "get": {
+        "operationId": "openapi",
+        "summary": "This document",
+        "responses": {
+          "200": {
+            "description": "The OpenAPI document",
+            "content": {
+              "application/json": {
+                "schema": {
+                  "type": "object"
+                }
+              }
+            }
+          },
+          "405": {
+            "$ref": "#/components/responses/MethodNotAllowed"
+          }
+        }
+      }
+    }
+  },
+  "components": {
+    "schemas": {
+      "Limits": {
+        "type": "object",
+        "required": [
+          "maxIterations",
+          "maxOutputChars",
+          "maxDepth"
+        ],
+        "properties": {
+          "maxIterations": {
+            "type": "integer",
+            "minimum": 0,
+            "description": "Total FOR iterations across one render"
+          },
+          "maxOutputChars": {
+            "type": "integer",
+            "minimum": 0,
+            "description": "Length of the output"
+          },
+          "maxDepth": {
+            "type": "integer",
+            "minimum": 0,
+            "description": "Nesting of blocks"
+          }
+        }
+      },
+      "RequestLimits": {
+        "type": "object",
+        "description": "Each given limit lowers the server's limit; a value above it is capped at it",
+        "properties": {
+          "maxIterations": {
+            "type": "integer",
+            "minimum": 0
+          },
+          "maxOutputChars": {
+            "type": "integer",
+            "minimum": 0
+          },
+          "maxDepth": {
+            "type": "integer",
+            "minimum": 0
+          }
+        }
+      },
+      "RenderRequest": {
+        "type": "object",
+        "required": [
+          "template"
+        ],
+        "properties": {
+          "template": {
+            "type": "string"
+          },
+          "data": {
+            "type": "object",
+            "additionalProperties": true,
+            "default": {}
+          },
+          "options": {
+            "type": "object",
+            "properties": {
+              "strictMode": {
+                "type": "boolean"
+              },
+              "limits": {
+                "$ref": "#/components/schemas/RequestLimits"
+              }
+            }
+          }
+        }
+      },
+      "TemplateRequest": {
+        "type": "object",
+        "required": [
+          "template"
+        ],
+        "properties": {
+          "template": {
+            "type": "string"
+          }
+        }
+      },
+      "Diagnostic": {
+        "type": "object",
+        "required": [
+          "severity",
+          "code",
+          "message",
+          "line",
+          "column"
+        ],
+        "properties": {
+          "severity": {
+            "type": "string",
+            "enum": [
+              "error",
+              "warning"
+            ]
+          },
+          "code": {
+            "type": "string",
+            "enum": [
+              "syntax-error",
+              "type-error",
+              "missing-variable",
+              "unknown-filter",
+              "limit-iterations",
+              "limit-output",
+              "limit-depth",
+              "invalid-input",
+              "analysis-warning"
+            ]
+          },
+          "message": {
+            "type": "string"
+          },
+          "line": {
+            "type": "integer",
+            "minimum": 1
+          },
+          "column": {
+            "type": "integer",
+            "minimum": 1
+          },
+          "suggestion": {
+            "type": "string"
+          }
+        }
+      },
+      "RenderResult": {
+        "type": "object",
+        "required": [
+          "ok",
+          "output",
+          "messages",
+          "stats",
+          "diagnostics"
+        ],
+        "properties": {
+          "ok": {
+            "type": "boolean"
+          },
+          "output": {
+            "type": "string",
+            "description": "Empty when ok is false"
+          },
+          "messages": {
+            "type": "array",
+            "items": {}
+          },
+          "stats": {
+            "type": "object",
+            "required": [
+              "chars",
+              "estTokens",
+              "sectionsOmitted",
+              "iterations"
+            ],
+            "properties": {
+              "chars": {
+                "type": "integer",
+                "minimum": 0
+              },
+              "estTokens": {
+                "type": "integer",
+                "minimum": 0
+              },
+              "sectionsOmitted": {
+                "type": "integer",
+                "minimum": 0
+              },
+              "iterations": {
+                "type": "integer",
+                "minimum": 0
+              }
+            }
+          },
+          "diagnostics": {
+            "type": "array",
+            "description": "When ok is false, the error that stopped the render comes first",
+            "items": {
+              "$ref": "#/components/schemas/Diagnostic"
+            }
+          }
+        }
+      },
+      "ValidateResult": {
+        "type": "object",
+        "required": [
+          "ok",
+          "diagnostics"
+        ],
+        "properties": {
+          "ok": {
+            "type": "boolean"
+          },
+          "diagnostics": {
+            "type": "array",
+            "items": {
+              "$ref": "#/components/schemas/Diagnostic"
+            }
+          }
+        }
+      },
+      "AnalysisDiagnostic": {
+        "type": "object",
+        "required": [
+          "code",
+          "message",
+          "line",
+          "column"
+        ],
+        "properties": {
+          "code": {
+            "type": "string"
+          },
+          "message": {
+            "type": "string"
+          },
+          "line": {
+            "type": "integer",
+            "minimum": 1
+          },
+          "column": {
+            "type": "integer",
+            "minimum": 1
+          }
+        }
+      },
+      "Analysis": {
+        "type": "object",
+        "required": [
+          "variables",
+          "filters",
+          "blocks",
+          "diagnostics"
+        ],
+        "properties": {
+          "variables": {
+            "type": "array",
+            "items": {
+              "type": "object",
+              "required": [
+                "name",
+                "paths",
+                "usedIn",
+                "optional",
+                "required"
+              ],
+              "properties": {
+                "name": {
+                  "type": "string",
+                  "description": "Root name, the part before the first dot"
+                },
+                "paths": {
+                  "type": "array",
+                  "items": {
+                    "type": "string"
+                  }
+                },
+                "usedIn": {
+                  "type": "array",
+                  "items": {
+                    "type": "string",
+                    "enum": [
+                      "output",
+                      "if",
+                      "elseif",
+                      "case",
+                      "for",
+                      "list_item",
+                      "table"
+                    ]
+                  }
+                },
+                "optional": {
+                  "type": "boolean",
+                  "description": "Every read supplies a ?? default"
+                },
+                "required": {
+                  "type": "boolean",
+                  "description": "Some read has no ?? default"
+                }
+              }
+            }
+          },
+          "filters": {
+            "type": "array",
+            "items": {
+              "type": "object",
+              "required": [
+                "name",
+                "count"
+              ],
+              "properties": {
+                "name": {
+                  "type": "string"
+                },
+                "count": {
+                  "type": "integer",
+                  "minimum": 1
+                }
+              }
+            }
+          },
+          "blocks": {
+            "type": "object",
+            "description": "Count per block kind present in the template",
+            "properties": {
+              "IF": {
+                "type": "integer",
+                "minimum": 1
+              },
+              "CASE": {
+                "type": "integer",
+                "minimum": 1
+              },
+              "FOR": {
+                "type": "integer",
+                "minimum": 1
+              },
+              "LIST": {
+                "type": "integer",
+                "minimum": 1
+              },
+              "TABLE": {
+                "type": "integer",
+                "minimum": 1
+              }
+            },
+            "additionalProperties": false
+          },
+          "diagnostics": {
+            "type": "array",
+            "items": {
+              "$ref": "#/components/schemas/AnalysisDiagnostic"
+            }
+          }
+        }
+      },
+      "Spec": {
+        "type": "object",
+        "required": [
+          "version",
+          "blocks",
+          "filters",
+          "operators",
+          "limits",
+          "syntax"
+        ],
+        "properties": {
+          "version": {
+            "type": "string"
+          },
+          "blocks": {
+            "type": "array",
+            "items": {
+              "type": "object",
+              "required": [
+                "name",
+                "args",
+                "description"
+              ],
+              "properties": {
+                "name": {
+                  "type": "string"
+                },
+                "closes": {
+                  "type": "string"
+                },
+                "args": {
+                  "type": "string"
+                },
+                "description": {
+                  "type": "string"
+                }
+              }
+            }
+          },
+          "filters": {
+            "type": "array",
+            "items": {
+              "type": "object",
+              "required": [
+                "name",
+                "params",
+                "description"
+              ],
+              "properties": {
+                "name": {
+                  "type": "string"
+                },
+                "params": {
+                  "type": "string"
+                },
+                "description": {
+                  "type": "string"
+                }
+              }
+            }
+          },
+          "operators": {
+            "type": "array",
+            "items": {
+              "type": "string"
+            }
+          },
+          "limits": {
+            "$ref": "#/components/schemas/Limits"
+          },
+          "syntax": {
+            "type": "object",
+            "required": [
+              "variable",
+              "comment"
+            ],
+            "properties": {
+              "variable": {
+                "type": "string"
+              },
+              "comment": {
+                "type": "string"
+              }
+            }
+          }
+        }
+      },
+      "Error": {
+        "type": "object",
+        "required": [
+          "error"
+        ],
+        "additionalProperties": false,
+        "properties": {
+          "error": {
+            "type": "object",
+            "required": [
+              "code",
+              "message"
+            ],
+            "properties": {
+              "code": {
+                "type": "string",
+                "enum": [
+                  "invalid-request",
+                  "not-found",
+                  "method-not-allowed",
+                  "payload-too-large",
+                  "unsupported-media-type",
+                  "internal-error"
+                ]
+              },
+              "message": {
+                "type": "string",
+                "minLength": 1
+              }
+            }
+          }
+        }
+      }
+    },
+    "responses": {
+      "InvalidRequest": {
+        "description": "Bad JSON, a body that is not an object, a missing or non-string template, a non-object data, or an option of the wrong type (invalid-request)",
+        "content": {
+          "application/json": {
+            "schema": {
+              "$ref": "#/components/schemas/Error"
+            }
+          }
+        }
+      },
+      "NotFound": {
+        "description": "No route has this path (not-found)",
+        "content": {
+          "application/json": {
+            "schema": {
+              "$ref": "#/components/schemas/Error"
+            }
+          }
+        }
+      },
+      "MethodNotAllowed": {
+        "description": "The path exists but not for this method (method-not-allowed)",
+        "headers": {
+          "Allow": {
+            "description": "The methods the path accepts",
+            "schema": {
+              "type": "string"
+            }
+          }
+        },
+        "content": {
+          "application/json": {
+            "schema": {
+              "$ref": "#/components/schemas/Error"
+            }
+          }
+        }
+      },
+      "PayloadTooLarge": {
+        "description": "The body exceeds the server's maxBodyBytes (payload-too-large)",
+        "content": {
+          "application/json": {
+            "schema": {
+              "$ref": "#/components/schemas/Error"
+            }
+          }
+        }
+      },
+      "UnsupportedMediaType": {
+        "description": "The Content-Type is not application/json (unsupported-media-type)",
+        "content": {
+          "application/json": {
+            "schema": {
+              "$ref": "#/components/schemas/Error"
+            }
+          }
+        }
+      },
+      "InternalError": {
+        "description": "An unexpected failure inside the engine (internal-error)",
+        "content": {
+          "application/json": {
+            "schema": {
+              "$ref": "#/components/schemas/Error"
+            }
+          }
+        }
+      }
+    }
+  }
+}
diff --git a/api/routes.ts b/api/routes.ts
index 806ed70..7c6f32f 100644
--- a/api/routes.ts
+++ b/api/routes.ts
@@ -1,2 +1,110 @@
-/** Signature-only stub: the real table lists every route. */
-export const routes: ReadonlyArray<{ method: "GET" | "POST"; path: string }> = [];
+import {
+  analyze,
+  Limits,
+  render,
+  spec,
+  TemplateAnalysis,
+  TemplateError,
+  validate,
+} from "../core/src";
+import openapi from "./openapi.json";
+
+export class RequestError extends Error {
+  constructor(
+    public readonly status: number,
+    public readonly code: string,
+    message: string
+  ) {
+    super(message);
+  }
+}
+
+export interface RouteContext {
+  limits: Limits;
+  tokenEstimator?: (text: string) => number;
+}
+
+export interface Route {
+  method: "GET" | "POST";
+  path: string;
+  /** A Buffer is sent as is; anything else is sent as JSON. */
+  handle(body: Record<string, unknown>, context: RouteContext): unknown;
+}
+
+// The committed file is kept in this exact serialization, so the bytes served
+// match it whether the document is loaded from source or from the build.
+const openapiDocument = Buffer.from(JSON.stringify(openapi, null, 2) + "\n", "utf8");
+
+export const routes: ReadonlyArray<Route> = [
+  { method: "POST", path: "/v1/render", handle: renderRoute },
+  { method: "POST", path: "/v1/validate", handle: validateRoute },
+  { method: "POST", path: "/v1/analyze", handle: analyzeRoute },
+  { method: "GET", path: "/v1/spec", handle: () => spec() },
+  { method: "GET", path: "/v1/openapi.json", handle: () => openapiDocument },
+];
+
+function renderRoute(body: Record<string, unknown>, context: RouteContext): unknown {
+  const template = requireTemplate(body);
+  const data = body.data ?? {};
+  if (!isObject(data)) invalid("data must be an object");
+  const options = body.options ?? {};
+  if (!isObject(options)) invalid("options must be an object");
+  if (options.strictMode !== undefined && typeof options.strictMode !== "boolean") {
+    invalid("options.strictMode must be a boolean");
+  }
+  return render(template, data, {
+    strictMode: options.strictMode,
+    limits: lowerLimits(context.limits, options.limits),
+    tokenEstimator: context.tokenEstimator,
+  });
+}
+
+function validateRoute(body: Record<string, unknown>, context: RouteContext): unknown {
+  return validate(requireTemplate(body), { limits: { maxDepth: context.limits.maxDepth } });
+}
+
+function analyzeRoute(body: Record<string, unknown>, context: RouteContext): TemplateAnalysis {
+  const template = requireTemplate(body);
+  try {
+    return analyze(template, { limits: { maxDepth: context.limits.maxDepth } });
+  } catch (error) {
+    if (!(error instanceof TemplateError)) throw error;
+    return {
+      variables: [],
+      filters: [],
+      blocks: {},
+      diagnostics: [
+        { code: error.code, message: error.detail, line: error.line, column: error.column },
+      ],
+    };
+  }
+}
+
+function lowerLimits(server: Limits, requested: unknown): Limits {
+  if (requested === undefined) return server;
+  if (!isObject(requested)) invalid("options.limits must be an object");
+  const limits = { ...server };
+  for (const key of Object.keys(server) as (keyof Limits)[]) {
+    const value = requested[key];
+    if (value === undefined) continue;
+    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
+      invalid(`options.limits.${key} must be a non-negative integer`);
+    }
+    limits[key] = Math.min(value, server[key]);
+  }
+  return limits;
+}
+
+function requireTemplate(body: Record<string, unknown>): string {
+  const template = body.template;
+  if (typeof template !== "string") invalid("template must be a string");
+  return template;
+}
+
+export function isObject(value: unknown): value is Record<string, unknown> {
+  return typeof value === "object" && value !== null && !Array.isArray(value);
+}
+
+function invalid(message: string): never {
+  throw new RequestError(400, "invalid-request", message);
+}
diff --git a/api/server.ts b/api/server.ts
new file mode 100644
index 0000000..beb14d7
--- /dev/null
+++ b/api/server.ts
@@ -0,0 +1,124 @@
+import * as http from "http";
+import { Limits, withDefaultLimits } from "../core/src";
+import { isObject, RequestError, Route, RouteContext, routes } from "./routes";
+
+export interface ServerOptions {
+  limits?: Partial<Limits>;
+  tokenEstimator?: (text: string) => number;
+  maxBodyBytes?: number;
+}
+
+const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
+
+/**
+ * A stateless JSON API over the template engine. The server's limits are a
+ * ceiling that a request can only lower.
+ */
+export function createServer(options: ServerOptions = {}): http.Server {
+  const context: RouteContext = {
+    limits: withDefaultLimits(options.limits),
+    tokenEstimator: options.tokenEstimator,
+  };
+  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
+
+  return http.createServer((req, res) => {
+    handle(req, context, maxBodyBytes).then(
+      (body) => send(res, 200, body),
+      (error) => sendError(req, res, error)
+    );
+  });
+}
+
+async function handle(
+  req: http.IncomingMessage,
+  context: RouteContext,
+  maxBodyBytes: number
+): Promise<unknown> {
+  const route = findRoute(req);
+  if (route.method === "GET") return route.handle({}, context);
+
+  if (!isJson(req.headers["content-type"])) {
+    throw new RequestError(415, "unsupported-media-type", "Content-Type must be application/json");
+  }
+  const text = await readBody(req, maxBodyBytes);
+  let body: unknown;
+  try {
+    body = JSON.parse(text);
+  } catch {
+    throw new RequestError(400, "invalid-request", "Body is not valid JSON");
+  }
+  if (!isObject(body)) {
+    throw new RequestError(400, "invalid-request", "Body must be a JSON object");
+  }
+  return route.handle(body, context);
+}
+
+function findRoute(req: http.IncomingMessage): Route {
+  const path = (req.url ?? "/").split("?")[0];
+  const matching = routes.filter((r) => r.path === path);
+  if (matching.length === 0) {
+    throw new RequestError(404, "not-found", `No route for ${path}`);
+  }
+  const route = matching.find((r) => r.method === req.method);
+  if (!route) {
+    throw new MethodNotAllowed(matching.map((r) => r.method));
+  }
+  return route;
+}
+
+class MethodNotAllowed extends RequestError {
+  constructor(public readonly allow: string[]) {
+    super(405, "method-not-allowed", `Allowed methods: ${allow.join(", ")}`);
+  }
+}
+
+function isJson(contentType: string | undefined): boolean {
+  return (contentType ?? "").split(";")[0].trim().toLowerCase() === "application/json";
+}
+
+function readBody(req: http.IncomingMessage, maxBodyBytes: number): Promise<string> {
+  return new Promise((resolve, reject) => {
+    const tooLarge = () =>
+      new RequestError(413, "payload-too-large", `Body exceeds ${maxBodyBytes} bytes`);
+    if (Number(req.headers["content-length"]) > maxBodyBytes) {
+      reject(tooLarge());
+      return;
+    }
+    const chunks: Buffer[] = [];
+    let size = 0;
+    const onData = (chunk: Buffer) => {
+      size += chunk.length;
+      if (size > maxBodyBytes) {
+        req.off("data", onData);
+        reject(tooLarge());
+        return;
+      }
+      chunks.push(chunk);
+    };
+    req.on("data", onData);
+    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
+    req.on("error", reject);
+  });
+}
+
+function sendError(req: http.IncomingMessage, res: http.ServerResponse, error: unknown): void {
+  if (!(error instanceof RequestError)) {
+    send(res, 500, { error: { code: "internal-error", message: "Internal server error" } });
+    return;
+  }
+  if (error instanceof MethodNotAllowed) res.setHeader("Allow", error.allow.join(", "));
+  if (!req.complete) {
+    // The unread body is discarded and the connection closed once the reply is out.
+    res.setHeader("Connection", "close");
+    req.resume();
+  }
+  send(res, error.status, { error: { code: error.code, message: error.message } });
+}
+
+function send(res: http.ServerResponse, status: number, body: unknown): void {
+  const payload = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body), "utf8");
+  res.statusCode = status;
+  res.setHeader("Content-Type", "application/json; charset=utf-8");
+  res.setHeader("Content-Length", payload.length);
+  res.end(payload);
+}
```

## Gate run
The card's gate command as it last ran, before this packet was built. Output only: run the command yourself to check it.
- Command: `node node_modules/jest/bin/jest.js --runTestsByPath tests/headless/api.test.ts tests/headless/e2e-api.test.ts --json`
- Exit status: 0
- Tests: 43 passed, 0 failed
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
