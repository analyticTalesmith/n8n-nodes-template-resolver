---
type: review-packet
card: 0028-return-a-structured-render-result-from-c
tier: product
built_at: 2026-10-14T01:07:23.005Z
base: 02dd2d32a9f7f781f327ee35005413fbb04eccd9
head: 87cf84a215f57565e10ad0865c91d9f8fef5ee4a
frozen: true
brief_sha256: cdb7e38fcd2a306d8703ec1343835b9a32914650638d4105f29e6f16254d8117
manifest_sha256: f23362f4c7f1b95929ba9d1174d0ce1f5d53ba121c624428f480c84bf1ad6a3b
criteria_sha256: 8c6b3d937679f6f5df7dceac474e7b9f18e11c05b293d5c7ddfd95bcc6ad4343
scope_sha256: fba9b75c29ad033871fcc0f67bd500f3bbde0447a7955d561d239f03f4d76613
diff_sha256: 180874d225494c77118bc3341d2e92db214522abfbf12bc4ac1dd0f1cdb9a5af
omitted_paths: 5
criteria_count: 8
must_not_count: 3
---

# Review packet: 0028-return-a-structured-render-result-from-c

Manifest amended after the freeze at 2026-10-14T01:07:05.433Z by lead: the test writer's stubs already existed so the new modules are edits; the shared filter list and an iteration count needed filters and interpreter; resolve and a stray entry were not changed (add -core/src/estimate.ts, add -core/src/render.ts, add -core/src/spec.ts, edit +core/src/filters.ts, edit +core/src/interpreter.ts, edit -core/src/resolve.ts, edit -x)

Manifest amended after the freeze at 2026-10-14T01:07:12.739Z by lead: stubs from the test writer already existed so these modules are edits (edit +core/src/estimate.ts, edit +core/src/render.ts, edit +core/src/spec.ts)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: one structured contract in core that API, CLI and node all consume.

### Criteria

- c1 (verify: test): rr-result: render returns ok, output, messages, stats (chars, estTokens, sectionsOmitted, iterations) and diagnostics; on a template or data error it does not throw, returns ok false, an empty output and the located error first in diagnostics
- c2 (verify: test): rr-validate: validate returns ok and diagnostics for syntax errors and unknown filters without needing data
- c3 (verify: test): rr-analyze: analyze variables carry required (the opposite of optional) and the result carries blocks, a count per block kind
- c4 (verify: test): rr-spec: spec lists blocks, filters, operators, limits and a version, and every filter the engine accepts appears in it
- c5 (verify: test): rr-estimator: estTokens is ceil(chars/4) by default and a tokenEstimator option replaces it
- c6 (verify: test): rr-compat: resolveTemplate still returns a string and throws, and limits in render options bound the render with their diagnostics
- c7 (verify: test): nd-output: the n8n node writes the render output to the configured field, and a failed render throws a node error whose message carries the first diagnostic with line and column
- c8 (verify: test): nd-nodeps: package.json declares no runtime dependencies, tsconfig builds api and cli folders, and package.json exposes the template-resolver bin

### Must not

- m1: change what resolveTemplate returns for any passing template
- m2: add a runtime dependency
- m3: import n8n or do I/O in core

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: one structured contract in core that API, CLI and node all consume.
Must not:
- change what resolveTemplate returns for any passing template
- add a runtime dependency
- import n8n or do I/O in core

## Questions

goal-critical: can render throw for any template or data input?
goal-critical: does the node still pass its existing tests and keep the old output field?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/headless-contract.md
- docs/living/decisions/adr/0004-render-returns-a-structured-result.md
- docs/living/decisions/adr/0005-dependency-free-token-estimator.md
- docs/living/decisions/adr/0006-n8n-node-imports-core-directly.md
```

### spec.md as of base 02dd2d3

```
# Spec

## Acceptance criteria

- rr-result: render returns ok, output, messages, stats (chars, estTokens, sectionsOmitted, iterations) and diagnostics; on a template or data error it does not throw, returns ok false, an empty output and the located error first in diagnostics
- rr-validate: validate returns ok and diagnostics for syntax errors and unknown filters without needing data
- rr-analyze: analyze variables carry required (the opposite of optional) and the result carries blocks, a count per block kind
- rr-spec: spec lists blocks, filters, operators, limits and a version, and every filter the engine accepts appears in it
- rr-estimator: estTokens is ceil(chars/4) by default and a tokenEstimator option replaces it
- rr-compat: resolveTemplate still returns a string and throws, and limits in render options bound the render with their diagnostics
- nd-output: the n8n node writes the render output to the configured field, and a failed render throws a node error whose message carries the first diagnostic with line and column
- nd-nodeps: package.json declares no runtime dependencies, tsconfig builds api and cli folders, and package.json exposes the template-resolver bin
```

### card.md as of base 02dd2d3

```
# Return a structured render result from core and the n8n node

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

render() returns {ok, output, messages, stats, diagnostics} and never throws for template or data problems; validate, spec and the estimator exist; analyze reports required and block counts; the n8n node renders through the structured result.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `rr-result` render returns ok, output, messages, stats (chars, estTokens, sectionsOmitted, iterations) and diagnostics; on a template or data error it does not throw, returns ok false, an empty output and the located error first in diagnostics
- `contract` `rr-validate` validate returns ok and diagnostics for syntax errors and unknown filters without needing data
- `contract` `rr-analyze` analyze variables carry required (the opposite of optional) and the result carries blocks, a count per block kind
- `contract` `rr-spec` spec lists blocks, filters, operators, limits and a version, and every filter the engine accepts appears in it
- `contract` `rr-estimator` estTokens is ceil(chars/4) by default and a tokenEstimator option replaces it
- `contract` `rr-compat` resolveTemplate still returns a string and throws, and limits in render options bound the render with their diagnostics
- `contract` `nd-output` the n8n node writes the render output to the configured field, and a failed render throws a node error whose message carries the first diagnostic with line and column
- `contract` `nd-nodeps` package.json declares no runtime dependencies, tsconfig builds api and cli folders, and package.json exposes the template-resolver bin


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change what resolveTemplate returns for any passing template
- add a runtime dependency
- import n8n or do I/O in core


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: the README card documents the surface.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

render, validate, spec, estimateTokens, RenderOptions, RenderResult, Diagnostic exported from core (see design.md).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/estimate.ts` | add | none |
| `core/src/render.ts` | add | none |
| `core/src/spec.ts` | add | none |
| `core/src/analyze.ts` | edit | none |
| `core/src/index.ts` | edit | none |
| `core/src/resolve.ts` | edit | none |
| `n8n/TemplateResolver.node.ts` | edit | none |
| `package.json` | edit | none |
| `tsconfig.json` | edit | none |
| `x` | edit | none |

Files scope: `core/src/`, `n8n/`, `package.json`, `tsconfig.json`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: none
- remove: none
- edit: `core/src/analyze.ts`, `core/src/estimate.ts`, `core/src/filters.ts`, `core/src/index.ts`, `core/src/interpreter.ts`, `core/src/render.ts`, `core/src/spec.ts`, `n8n/TemplateResolver.node.ts`, `package.json`, `tsconfig.json`
- files_scope: `core/src/`, `n8n/`, `package.json`, `tsconfig.json`

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

### docs/living/decisions/adr/0004-render-returns-a-structured-result.md

```
---
summary: Render returns a structured result (output, messages, stats, diagnostics) everywhere; the n8n node maps output to its old field.
type: adr
domain: api
status: accepted
date: 2026-10-13
state: built
---

# Render returns a structured result

**Context.** Callers need diagnostics, stats and, later, chat messages alongside the rendered text, and the API, CLI and node should share one contract.

**Decision.** The core render function returns an object with output, messages, stats and diagnostics. The API, CLI and library all expose it. The n8n node maps output to the field it already writes.

**Alternatives.** Return a string and expose diagnostics through a second call; rejected because it renders twice and splits the contract.

**Consequences.** A breaking change to the library surface, absorbed by the node wrapper. One fixture suite proves every surface.
```

### docs/living/decisions/adr/0005-dependency-free-token-estimator.md

```
---
summary: Core ships a dependency-free token estimator (chars/4, wider error bar for code and JSON) with a hook for a real tokenizer.
type: adr
domain: architecture
status: accepted
date: 2026-10-13
state: built
---

# Dependency-free token estimator with a tokenizer hook

**Context.** Budget-aware rendering needs token counts, but a real tokenizer is a dependency and model specific.

**Decision.** Core estimates tokens as characters divided by four, documents the error bar (wider for code and JSON), labels every count as an estimate, and accepts a tokenizer function in the render options to replace it.

**Alternatives.** Bundle a tokenizer library; rejected because it adds a runtime dependency and ties the core to one model family.

**Consequences.** Counts are approximate and say so. Exact counts are possible for callers who supply a tokenizer.
```

### docs/living/decisions/adr/0006-n8n-node-imports-core-directly.md

```
---
summary: The n8n node imports the core directly, with n8n libraries as peer dependencies; the API is an equally thin consumer.
type: adr
domain: architecture
status: accepted
date: 2026-10-13
state: built
---

# The n8n node imports the core directly

**Context.** The node could call the headless API or import the core. A local install should need no running service.

**Decision.** The n8n wrapper imports core as a library. n8n packages are peer dependencies. The API and CLI are equally thin consumers of the same core contract.

**Alternatives.** The node calls a running HTTP API; rejected because it forces a service for a local install. An optional remote toggle can be added later.

**Consequences.** One fixture suite proves core, API, CLI and node. Core stays free of n8n imports.
```

## Frozen tests (read-only)

These test files were committed before the work began, at base 02dd2d3. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/headless/render.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  render,
  validate,
  analyze,
  resolveTemplate,
  VariableMap,
} from "../../core/src";

type Case = {
  name: string;
  template: string;
  data: Record<string, unknown>;
  options?: Parameters<typeof render>[2];
  code: string;
  line: number;
};

const FAILING: Case[] = [
  {
    name: "syntax error (unclosed IF on line 2)",
    template: "intro\n{{IF a}}x",
    data: { a: true },
    code: "syntax-error",
    line: 2,
  },
  {
    name: "missing variable on line 3 in strict mode",
    template: "a\nb\n${{missing}}",
    data: {},
    code: "missing-variable",
    line: 3,
  },
  {
    name: "unknown filter on line 2",
    template: "a\n${{x | nosuchfilter}}",
    data: { x: "v" },
    code: "unknown-filter",
    line: 2,
  },
  {
    name: "iteration limit",
    template: "{{FOR xs AS x}}${{x}}{{END_FOR}}",
    data: { xs: [1, 2, 3, 4] },
    options: { limits: { maxIterations: 2 } },
    code: "limit-iterations",
    line: 1,
  },
  {
    name: "output size limit",
    template: "${{x}}",
    data: { x: "0123456789" },
    options: { limits: { maxOutputChars: 5 } },
    code: "limit-output",
    line: 1,
  },
  {
    name: "depth limit",
    template: "{{IF a}}{{IF a}}x{{END_IF}}{{END_IF}}",
    data: { a: true },
    options: { limits: { maxDepth: 1 } },
    code: "limit-depth",
    line: 1,
  },
];

describe("rr-result: render result shape", () => {
  it("rr-result: a passing render returns ok, output, empty messages and full stats", () => {
    const r = render("# ${{title}}\n{{FOR xs AS x}}-${{x}}{{END_FOR}}", {
      title: "Hi",
      xs: ["a", "b", "c"],
    });
    expect(r.ok).toBe(true);
    expect(r.output).toBe("# Hi\n-a-b-c");
    expect(r.messages).toEqual([]);
    expect(r.diagnostics).toEqual([]);
    expect(r.stats).toEqual({
      chars: r.output.length,
      estTokens: Math.ceil(r.output.length / 4),
      sectionsOmitted: 0,
      iterations: 3,
    });
  });

  it("rr-result: iterations counts FOR iterations across the whole render", () => {
    const r = render("{{FOR a AS i}}{{FOR b AS j}}x{{END_FOR}}{{END_FOR}}", {
      a: [1, 2],
      b: [1, 2, 3],
    });
    expect(r.ok).toBe(true);
    expect(r.stats.iterations).toBe(2 + 2 * 3);
  });

  it.each(FAILING)(
    "rr-result: $name does not throw and returns ok false with the located error first",
    ({ template, data, options, code, line }) => {
      let r: ReturnType<typeof render> | undefined;
      expect(() => {
        r = render(template, data, options);
      }).not.toThrow();
      expect(r!.ok).toBe(false);
      expect(r!.output).toBe("");
      expect(r!.diagnostics.length).toBeGreaterThan(0);
      const d = r!.diagnostics[0];
      expect(d.severity).toBe("error");
      expect(d.code).toBe(code);
      expect(d.line).toBe(line);
      expect(d.column).toBeGreaterThanOrEqual(1);
      expect(typeof d.message).toBe("string");
      expect(d.message.length).toBeGreaterThan(0);
    }
  );

  it("rr-result: lenient mode turns a missing variable into an ok render", () => {
    const r = render("a${{missing}}b", {}, { strictMode: false });
    expect(r.ok).toBe(true);
    expect(r.output).toBe("ab");
  });
});

describe("rr-validate: validate without data", () => {
  it("rr-validate: a valid template is ok with no diagnostics", () => {
    const v = validate("${{a}} {{IF b}}x{{END_IF}}");
    expect(v.ok).toBe(true);
    expect(v.diagnostics).toEqual([]);
  });

  it.each([
    ["syntax error", "x\n{{IF a}}y", "syntax-error", 2],
    ["unknown filter", "x\n${{a | nosuchfilter}}", "unknown-filter", 2],
  ] as [string, string, string, number][])(
    "rr-validate: %s yields ok false and a located diagnostic",
    (_n, template, code, line) => {
      const v = validate(template);
      expect(v.ok).toBe(false);
      expect(v.diagnostics.length).toBeGreaterThan(0);
      expect(v.diagnostics[0].code).toBe(code);
      expect(v.diagnostics[0].line).toBe(line);
      expect(v.diagnostics[0].column).toBeGreaterThanOrEqual(1);
    }
  );

  it("rr-validate: a missing variable is not an error because no data is supplied", () => {
    expect(validate("${{never_supplied}}").ok).toBe(true);
  });
});

describe("rr-analyze: required and block counts", () => {
  it("rr-analyze: required is the opposite of optional on every variable", () => {
    const a = analyze("${{a}} ${{b ?? 'x'}}") as any;
    expect(a.variables.length).toBe(2);
    for (const v of a.variables) {
      expect(typeof v.required).toBe("boolean");
      expect(v.required).toBe(!v.optional);
    }
    expect(a.variables.find((v: any) => v.name === "a").required).toBe(true);
    expect(a.variables.find((v: any) => v.name === "b").required).toBe(false);
  });

  it.each([
    ["no blocks", "plain ${{a}}", {}],
    [
      "two IF and one FOR",
      "{{IF a}}x{{END_IF}}{{IF b}}{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_IF}}",
      { IF: 2, FOR: 1 },
    ],
    [
      "one CASE",
      '{{CASE s}}{{WHEN "a"}}x{{END_WHEN}}{{END_CASE}}',
      { CASE: 1 },
    ],
  ] as [string, string, Record<string, number>][])(
    "rr-analyze: blocks counts per block kind for %s",
    (_n, template, expected) => {
      const a = analyze(template) as any;
      expect(a.blocks).toEqual(expected);
    }
  );
});

describe("rr-estimator: token estimate", () => {
  it.each([
    ["", 0],
    ["abcd", 1],
    ["abcde", 2],
    ["x".repeat(401), 101],
  ] as [string, number][])(
    "rr-estimator: default estTokens is ceil(chars/4) for %j",
    (text, tokens) => {
      const r = render("${{t}}", { t: text });
      expect(r.ok).toBe(true);
      expect(r.stats.chars).toBe(text.length);
      expect(r.stats.estTokens).toBe(tokens);
    }
  );

  it("rr-estimator: a tokenEstimator option replaces the default and receives the output", () => {
    const seen: string[] = [];
    const r = render(
      "hello ${{n}}",
      { n: "world" },
      {
        tokenEstimator: (t) => {
          seen.push(t);
          return 42;
        },
      }
    );
    expect(r.ok).toBe(true);
    expect(r.stats.estTokens).toBe(42);
    expect(seen).toContain("hello world");
  });
});

describe("rr-compat: resolveTemplate and limits", () => {
  it("rr-compat: resolveTemplate still returns a string for a passing template", () => {
    const vars: VariableMap = new Map([["a", "v"]]);
    expect(resolveTemplate("x ${{a}}", vars)).toBe("x v");
  });

  it("rr-compat: resolveTemplate still throws for a missing variable", () => {
    expect(() => resolveTemplate("${{nope}}", new Map())).toThrow(/not found/);
    let name = "";
    try {
      resolveTemplate("${{nope}}", new Map());
    } catch (e) {
      name = (e as Error).name;
    }
    expect(name).toBe("MissingVariableError");
  });

  it("rr-compat: render and resolveTemplate agree on the output of a passing template", () => {
    const t = "{{IF a}}yes{{END_IF}} ${{b | trim}}";
    const viaRender = render(t, { a: true, b: "  z " });
    const viaResolve = resolveTemplate(
      t,
      new Map<string, any>([
        ["a", true],
        ["b", "  z "],
      ])
    );
    expect(viaRender.ok).toBe(true);
    expect(viaRender.output).toBe(viaResolve);
  });

  it("rr-compat: limits at the boundary still render ok", () => {
    const r = render(
      "{{FOR xs AS x}}${{x}}{{END_FOR}}",
      { xs: [1, 2] },
      { limits: { maxIterations: 2 } }
    );
    expect(r.ok).toBe(true);
    expect(r.output).toBe("12");
  });

  it("rr-compat: default limits stop a render past 10000 iterations", () => {
    const r = render("{{FOR xs AS x}}{{END_FOR}}", {
      xs: new Array(10001).fill(1),
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe("limit-iterations");
  });

  it.each(FAILING.filter((c) => c.code.startsWith("limit-")))(
    "rr-compat: limit options bound the render and report $code",
    ({ template, data, options, code }) => {
      const r = render(template, data, options);
      expect(r.ok).toBe(false);
      expect(r.diagnostics[0]?.code).toBe(code);
    }
  );
});
```

### tests/headless/spec.test.ts (frozen)

```
import { spec } from "../../core/src";

// Fixture list read from the applyFilter switch in core/src/filters.ts.
const ENGINE_FILTERS = ["head", "tail", "trim", "escape_md"];
const BLOCKS = ["IF", "FOR", "CASE", "LIST", "TABLE"];
const OPERATORS = [
  "==",
  "!=",
  "contains",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
  "AND",
  "OR",
  "NOT",
];

describe("rr-spec: the language spec", () => {
  const s = spec();

  it("rr-spec: has a non-empty version string", () => {
    expect(typeof s.version).toBe("string");
    expect(s.version.length).toBeGreaterThan(0);
  });

  it.each(ENGINE_FILTERS)(
    "rr-spec: filter %s is listed with a description",
    (name) => {
      const f = s.filters.find((x) => x.name === name);
      expect(f).toBeDefined();
      expect(f!.description.length).toBeGreaterThan(0);
    }
  );

  it("rr-spec: lists exactly the engine's filters", () => {
    expect(s.filters.map((f) => f.name).sort()).toEqual(
      [...ENGINE_FILTERS].sort()
    );
  });

  it.each(BLOCKS)(
    "rr-spec: block %s is listed with args and description",
    (name) => {
      const b = s.blocks.find((x) => x.name === name);
      expect(b).toBeDefined();
      expect(typeof b!.args).toBe("string");
      expect(b!.description.length).toBeGreaterThan(0);
    }
  );

  it.each(OPERATORS)("rr-spec: operator %s is listed", (op) => {
    expect(s.operators).toContain(op);
  });

  it("rr-spec: limits equal the default limits", () => {
    expect(s.limits).toEqual({
      maxIterations: 10000,
      maxOutputChars: 1000000,
      maxDepth: 32,
    });
  });

  it("rr-spec: describes variable and comment syntax", () => {
    expect(s.syntax.variable.length).toBeGreaterThan(0);
    expect(s.syntax.comment.length).toBeGreaterThan(0);
  });
});
```

### tests/headless/node.test.ts (frozen)

```
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TemplateResolver } from "../../n8n/TemplateResolver.node";

async function run(
  params: Record<string, any>
): Promise<{ json?: any; error?: Error }> {
  const node = new TemplateResolver();
  const ctx: any = {
    getInputData: () => [{ json: {} }],
    getNodeParameter: (name: string, _i: number, dflt?: any) =>
      name in params ? params[name] : dflt,
    continueOnFail: () => false,
    getNode: () => ({ name: "TemplateResolver" }),
  };
  try {
    const result = await node.execute.call(ctx);
    return { json: result[0][0].json };
  } catch (e) {
    return { error: e as Error };
  }
}

const base = {
  variableMappings: { mappings: [{ variableName: "who", value: "world" }] },
  strictMode: true,
  showDetectedVariables: false,
};

describe("nd-output: node writes the render output", () => {
  it("nd-output: writes to the default resolved_prompt field", async () => {
    const r = await run({
      ...base,
      template: "hello ${{who}}",
      outputField: "resolved_prompt",
    });
    expect(r.error).toBeUndefined();
    expect(r.json.resolved_prompt).toBe("hello world");
  });

  it("nd-output: writes to the configured output field", async () => {
    const r = await run({
      ...base,
      template: "hello ${{who}}",
      outputField: "custom",
    });
    expect(r.error).toBeUndefined();
    expect(r.json.custom).toBe("hello world");
    expect(r.json.resolved_prompt).toBeUndefined();
  });

  it.each([
    ["missing variable on line 3", "a\nb\n${{missing}}", 3, 1],
    ["missing variable mid-line on line 2", "a\nxx ${{missing}}", 2, 4],
  ] as [string, string, number, number][])(
    "nd-output: a failed render (%s) throws a NodeOperationError carrying line and column",
    async (_n, template, line, column) => {
      const r = await run({
        ...base,
        variableMappings: { mappings: [] },
        template,
        outputField: "resolved_prompt",
      });
      expect(r.error).toBeDefined();
      expect(r.error!.name).toBe("NodeOperationError");
      expect(r.error!.message).toContain(`line ${line}, column ${column}`);
      expect(r.error!.message).toContain("missing");
    }
  );

  it("nd-output: a syntax error reports its line and column", async () => {
    const r = await run({
      ...base,
      template: "a\n{{IF who}}x",
      outputField: "resolved_prompt",
    });
    expect(r.error).toBeDefined();
    expect(r.error!.message).toMatch(/\(line 2, column \d+\)/);
  });
});
```

### tests/headless/nodeps.test.ts (frozen)

```
import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "..", "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const tsconfig = JSON.parse(
  fs.readFileSync(path.join(root, "tsconfig.json"), "utf8")
);

describe("nd-nodeps: no runtime dependencies, api and cli built, bin exposed", () => {
  it("nd-nodeps: package.json declares no runtime dependencies", () => {
    // Passes today by design; guards the must-not "add a runtime dependency".
    expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
  });

  it("nd-nodeps: package.json exposes the template-resolver bin", () => {
    expect(pkg.bin).toEqual({ "template-resolver": "dist/cli/index.js" });
  });

  it.each(["api/**/*", "cli/**/*"])(
    "nd-nodeps: tsconfig include covers %s",
    (pattern) => {
      expect(tsconfig.include).toContain(pattern);
    }
  );
});
```

## 4. Diff

5 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/core/src/analyze.ts b/core/src/analyze.ts
index 2701f06..5073854 100644
--- a/core/src/analyze.ts
+++ b/core/src/analyze.ts
@@ -1,6 +1,6 @@
 import { Lexer } from "./lexer";
 import { Parser } from "./parser";
-import { parseFilter } from "./filters";
+import { FILTERS, parseFilter } from "./filters";
 import {
   conditionOperands,
   hasBareWhitespace,
@@ -13,6 +13,7 @@ import {
   CaseNode,
   ForNode,
   IfNode,
+  Limits,
   ListItemNode,
   ListNode,
   TableHeaderNode,
@@ -39,6 +40,8 @@ export interface VariableUsage {
   usedIn: UsageKind[];
   /** True when every read supplies a ?? default */
   optional: boolean;
+  /** True when some read has no ?? default; always !optional */
+  required: boolean;
 }
 
 export interface FilterUsage {
@@ -53,21 +56,30 @@ export interface AnalysisDiagnostic {
   column: number;
 }
 
+export type BlockKind = "IF" | "CASE" | "FOR" | "LIST" | "TABLE";
+
 export interface TemplateAnalysis {
   variables: VariableUsage[];
   filters: FilterUsage[];
+  /** Count per block kind present in the template */
+  blocks: Partial<Record<BlockKind, number>>;
   diagnostics: AnalysisDiagnostic[];
 }
 
-const KNOWN_FILTERS = new Set(["head", "tail", "trim", "escape_md"]);
+const KNOWN_FILTERS = new Set(FILTERS.map((f) => f.name));
 
 /**
  * Report the variables a template reads and the filters it applies, derived
  * from the parsed template. Loop item names (inside their loop) and
  * @-metadata are not inputs.
  */
-export function analyze(template: string): TemplateAnalysis {
-  const ast = new Parser(new Lexer(template).tokenize()).parse();
+export function analyze(
+  template: string,
+  options?: { limits?: Partial<Limits> }
+): TemplateAnalysis {
+  const ast = new Parser(new Lexer(template).tokenize(), {
+    maxDepth: options?.limits?.maxDepth,
+  }).parse();
   const walker = new Walker();
   walker.visitAll(ast.body);
   return walker.result();
@@ -82,6 +94,7 @@ interface Entry {
 class Walker {
   private entries = new Map<string, Entry>();
   private filterCounts = new Map<string, number>();
+  private blocks: Partial<Record<BlockKind, number>> = {};
   private diagnostics: AnalysisDiagnostic[] = [];
   private scopes: string[] = [];
   private tableDepth = 0;
@@ -93,11 +106,13 @@ class Walker {
         paths: Array.from(entry.paths),
         usedIn: Array.from(entry.usedIn),
         optional: entry.allOptional,
+        required: !entry.allOptional,
       })),
       filters: Array.from(this.filterCounts, ([name, count]) => ({
         name,
         count,
       })),
+      blocks: this.blocks,
       diagnostics: this.diagnostics,
     };
   }
@@ -111,14 +126,19 @@ class Walker {
       case "Variable":
         return this.visitVariable(node as VariableNode);
       case "If":
+        this.countBlock("IF");
         return this.visitIf(node as IfNode, "if");
       case "Case":
+        this.countBlock("CASE");
         return this.visitCase(node as CaseNode);
       case "For":
+        this.countBlock("FOR");
         return this.visitFor(node as ForNode);
       case "List":
+        this.countBlock("LIST");
         return (node as ListNode).items.forEach((i) => this.visitListItem(i));
       case "Table":
+        this.countBlock("TABLE");
         return this.visitTable(node as TableNode);
       case "Header":
       case "TableRow":
@@ -126,6 +146,10 @@ class Walker {
     }
   }
 
+  private countBlock(kind: BlockKind): void {
+    this.blocks[kind] = (this.blocks[kind] ?? 0) + 1;
+  }
+
   private visitVariable(node: VariableNode): void {
     const kind: UsageKind = this.tableDepth > 0 ? "table" : "output";
     const text = node.path.join(".");
diff --git a/core/src/estimate.ts b/core/src/estimate.ts
index 4dbd99a..b4cc28b 100644
--- a/core/src/estimate.ts
+++ b/core/src/estimate.ts
@@ -1,4 +1,7 @@
-/** Signature-only stub: estimate the token count of a text. */
-export function estimateTokens(_text: string): number {
-  return 0;
+/**
+ * Estimated token count of a text: one token per four characters, rounded up.
+ * An estimate, roughly +/-30 percent for English prose.
+ */
+export function estimateTokens(text: string): number {
+  return Math.ceil(text.length / 4);
 }
diff --git a/core/src/filters.ts b/core/src/filters.ts
index 5547c2a..506cc8b 100644
--- a/core/src/filters.ts
+++ b/core/src/filters.ts
@@ -84,6 +84,35 @@ function parseParam(param: string, params: Record<string, string>): void {
   params[key] = value;
 }
 
+/**
+ * Every filter applyFilter accepts
+ */
+export const FILTERS: { name: string; params: string; description: string }[] =
+  [
+    {
+      name: "head",
+      params: "head=N",
+      description:
+        "First N characters; a negative N drops the last |N| characters",
+    },
+    {
+      name: "tail",
+      params: "tail=N",
+      description:
+        "Last N characters; a negative N drops the first |N| characters",
+    },
+    {
+      name: "trim",
+      params: "",
+      description: "Leading and trailing whitespace removed",
+    },
+    {
+      name: "escape_md",
+      params: "",
+      description: "Markdown special characters escaped with a backslash",
+    },
+  ];
+
 /**
  * Apply single filter to text
  */
diff --git a/core/src/index.ts b/core/src/index.ts
index 8f9f40a..2b8af2d 100644
--- a/core/src/index.ts
+++ b/core/src/index.ts
@@ -33,3 +33,4 @@ export { render, validate } from "./render";
 export type { RenderOptions, RenderResult, Diagnostic } from "./render";
 export { estimateTokens } from "./estimate";
 export { spec } from "./spec";
+export type { Spec } from "./spec";
diff --git a/core/src/interpreter.ts b/core/src/interpreter.ts
index 6b061fd..3e7ede1 100644
--- a/core/src/interpreter.ts
+++ b/core/src/interpreter.ts
@@ -64,6 +64,13 @@ export class Interpreter {
     this.limits = withDefaultLimits(options?.limits);
   }
 
+  /**
+   * FOR iterations run by the latest interpret call
+   */
+  get iterationCount(): number {
+    return this.iterations;
+  }
+
   /**
    * Main interpretation entry point
    */
diff --git a/core/src/render.ts b/core/src/render.ts
index 3c04232..639901a 100644
--- a/core/src/render.ts
+++ b/core/src/render.ts
@@ -1,16 +1,20 @@
+import { Limits, TemplateValue, withDefaultLimits } from "./types";
+import { DiagnosticCode, TemplateError } from "./errors";
+import { Lexer } from "./lexer";
+import { Parser } from "./parser";
+import { Interpreter } from "./interpreter";
+import { analyze } from "./analyze";
+import { estimateTokens } from "./estimate";
+
 export interface RenderOptions {
   strictMode?: boolean;
-  limits?: {
-    maxIterations?: number;
-    maxOutputChars?: number;
-    maxDepth?: number;
-  };
+  limits?: Partial<Limits>;
   tokenEstimator?: (text: string) => number;
 }
 
 export interface Diagnostic {
   severity: "error" | "warning";
-  code: string;
+  code: DiagnosticCode | "invalid-input" | "analysis-warning";
   message: string;
   line: number;
   column: number;
@@ -30,25 +34,92 @@ export interface RenderResult {
   diagnostics: Diagnostic[];
 }
 
-/** Signature-only stub: render a template to a structured result. */
+/**
+ * Render a template against data. Template and data problems never throw:
+ * they come back as ok false, an empty output and the error first in
+ * diagnostics.
+ */
 export function render(
-  _template: string,
-  _data: Record<string, unknown>,
-  _options?: RenderOptions
+  template: string,
+  data: Record<string, unknown>,
+  options?: RenderOptions
 ): RenderResult {
+  const limits = withDefaultLimits(options?.limits);
+  const interpreter = new Interpreter(
+    new Map(Object.entries(data)) as Map<string, TemplateValue>,
+    { strictMode: options?.strictMode, limits }
+  );
+
+  let output: string;
+  try {
+    const tokens = new Lexer(template).tokenize();
+    const ast = new Parser(tokens, { maxDepth: limits.maxDepth }).parse();
+    output = interpreter.interpret(ast);
+  } catch (error) {
+    if (!(error instanceof TemplateError)) throw error;
+    return {
+      ok: false,
+      output: "",
+      messages: [],
+      stats: {
+        chars: 0,
+        estTokens: 0,
+        sectionsOmitted: 0,
+        iterations: interpreter.iterationCount,
+      },
+      diagnostics: [toDiagnostic(error)],
+    };
+  }
+
+  const estimate = options?.tokenEstimator ?? estimateTokens;
   return {
-    ok: false,
-    output: "",
+    ok: true,
+    output,
     messages: [],
-    stats: { chars: 0, estTokens: 0, sectionsOmitted: 0, iterations: 0 },
+    stats: {
+      chars: output.length,
+      estTokens: estimate(output),
+      sectionsOmitted: 0,
+      iterations: interpreter.iterationCount,
+    },
     diagnostics: [],
   };
 }
 
-/** Signature-only stub: check a template without data. */
-export function validate(_template: string): {
-  ok: boolean;
-  diagnostics: Diagnostic[];
-} {
-  return { ok: false, diagnostics: [] };
+/**
+ * Check a template without data: syntax errors and unknown filters are
+ * errors; conditions that only some data could satisfy are warnings.
+ */
+export function validate(
+  template: string,
+  options?: { limits?: Partial<Limits> }
+): { ok: boolean; diagnostics: Diagnostic[] } {
+  let diagnostics: Diagnostic[];
+  try {
+    diagnostics = analyze(template, options).diagnostics.map(
+      ({ code, message, line, column }): Diagnostic =>
+        code === "unknown-filter"
+          ? { severity: "error", code, message, line, column }
+          : { severity: "warning", code: "analysis-warning", message, line, column }
+    );
+  } catch (error) {
+    if (!(error instanceof TemplateError)) throw error;
+    diagnostics = [toDiagnostic(error)];
+  }
+  return {
+    ok: diagnostics.every((d) => d.severity !== "error"),
+    diagnostics,
+  };
+}
+
+function toDiagnostic(error: TemplateError): Diagnostic {
+  const diagnostic: Diagnostic = {
+    severity: "error",
+    code: error.code,
+    message: error.detail,
+    line: error.line,
+    column: error.column,
+  };
+  if (error.suggestion !== undefined) diagnostic.suggestion = error.suggestion;
+  return diagnostic;
 }
diff --git a/core/src/spec.ts b/core/src/spec.ts
index 3e682ca..a43f0dd 100644
--- a/core/src/spec.ts
+++ b/core/src/spec.ts
@@ -1,20 +1,127 @@
+import { DEFAULT_LIMITS, Limits } from "./types";
+import { FILTERS } from "./filters";
+
 export interface Spec {
   version: string;
   blocks: { name: string; closes?: string; args: string; description: string }[];
   filters: { name: string; params: string; description: string }[];
   operators: string[];
-  limits: { maxIterations: number; maxOutputChars: number; maxDepth: number };
+  limits: Limits;
   syntax: { variable: string; comment: string };
 }
 
-/** Signature-only stub: describe the template language. */
+const LANGUAGE_VERSION = "1.0";
+
+const BLOCKS: Spec["blocks"] = [
+  {
+    name: "IF",
+    closes: "END_IF",
+    args: "condition",
+    description: "Renders its body when the condition is true",
+  },
+  {
+    name: "ELSEIF",
+    args: "condition",
+    description: "Inside IF: renders when earlier conditions were false and this one is true",
+  },
+  {
+    name: "ELSE",
+    args: "",
+    description: "Inside IF: renders when every condition was false",
+  },
+  {
+    name: "CASE",
+    closes: "END_CASE",
+    args: "variable",
+    description: "Renders the first WHEN whose value equals the variable, else DEFAULT",
+  },
+  {
+    name: "WHEN",
+    closes: "END_WHEN",
+    args: '"value"',
+    description: "Inside CASE: renders when the CASE variable equals the value",
+  },
+  {
+    name: "DEFAULT",
+    closes: "END_DEFAULT",
+    args: "",
+    description: "Inside CASE: renders when no WHEN matched",
+  },
+  {
+    name: "FOR",
+    closes: "END_FOR",
+    args: "array AS item",
+    description:
+      "Renders its body once per array element, with @index0, @first, @last and related metadata",
+  },
+  {
+    name: "LIST",
+    closes: "END_LIST",
+    args: "",
+    description: "A numbered list of LIST_ITEM entries; lists nest",
+  },
+  {
+    name: "LIST_ITEM",
+    closes: "END_LIST_ITEM",
+    args: '[condition] [| fallback="text"]',
+    description:
+      "Inside LIST: one numbered item, skipped or replaced by its fallback when the condition is false",
+  },
+  {
+    name: "TABLE",
+    closes: "END_TABLE",
+    args: '[align="left|center|right"]',
+    description: "A markdown table of an optional HEADER and ROW or FOR-generated rows; align takes one alignment per column",
+  },
+  {
+    name: "HEADER",
+    closes: "END_HEADER",
+    args: "",
+    description: "Inside TABLE: header cells separated by |",
+  },
+  {
+    name: "ROW",
+    closes: "END_ROW",
+    args: "",
+    description: "Inside TABLE: row cells separated by |",
+  },
+];
+
+const OPERATORS = [
+  "==",
+  "!=",
+  ">",
+  "<",
+  ">=",
+  "<=",
+  "contains",
+  "startsWith",
+  "endsWith",
+  "isEmpty",
+  "isNotEmpty",
+  "isArray",
+  "isNumber",
+  "isObject",
+  "isBoolean",
+  "AND",
+  "OR",
+  "NOT",
+];
+
+/**
+ * The template language: blocks, filters, condition operators, default
+ * limits and syntax
+ */
 export function spec(): Spec {
   return {
-    version: "",
-    blocks: [],
-    filters: [],
-    operators: [],
-    limits: { maxIterations: 0, maxOutputChars: 0, maxDepth: 0 },
-    syntax: { variable: "", comment: "" },
+    version: LANGUAGE_VERSION,
+    blocks: BLOCKS.map((b) => ({ ...b })),
+    filters: FILTERS.map((f) => ({ ...f })),
+    operators: [...OPERATORS],
+    limits: { ...DEFAULT_LIMITS },
+    syntax: {
+      variable: "${{path.to.value ?? \"default\" | filter=arg}}",
+      comment: "{{# comment #}}",
+    },
   };
 }
diff --git a/n8n/TemplateResolver.node.ts b/n8n/TemplateResolver.node.ts
index 99e39a1..2d3f7dd 100644
--- a/n8n/TemplateResolver.node.ts
+++ b/n8n/TemplateResolver.node.ts
@@ -1,4 +1,10 @@
-import { VariableMap, analyze, resolveTemplate } from "../core/src";
+import {
+  Diagnostic,
+  TemplateAnalysis,
+  TemplateError,
+  analyze,
+  render,
+} from "../core/src";
 import {
   IExecuteFunctions,
   INodeExecutionData,
@@ -170,7 +176,17 @@ By \${{author}}
         ) as string;
 
         // Extract variables from template
-        const analysis = analyze(template);
+        let analysis: TemplateAnalysis;
+        try {
+          analysis = analyze(template);
+        } catch (error) {
+          if (!(error instanceof TemplateError)) throw error;
+          throw new NodeOperationError(
+            this.getNode(),
+            located(error.detail, error.line, error.column),
+            { itemIndex }
+          );
+        }
         const detectedVariables = analysis.variables
           .map((v) => v.name)
           .sort();
@@ -179,7 +195,7 @@ By \${{author}}
         );
 
         // Build variable map
-        const variables: VariableMap = new Map();
+        const variables = new Map<string, string>();
         if (variableMappings.mappings?.length) {
           for (const mapping of variableMappings.mappings) {
             if (mapping.variableName && mapping.value !== undefined) {
@@ -199,11 +215,18 @@ By \${{author}}
         );
 
         if (strictMode && missingRequired.length > 0) {
+          const attempt = render(template, Object.fromEntries(variables), {
+            strictMode,
+          });
+          const firstError = attempt.ok
+            ? ""
+            : ` First error: ${describe(attempt.diagnostics[0])}.`;
           throw new NodeOperationError(
             this.getNode(),
             `Template requires unmapped variables: ${missingRequired.join(", ")}. ` +
               `Add mappings or disable "Strict Mode". ` +
-              `Detected variables: ${detectedVariables.join(", ")}`,
+              `Detected variables: ${detectedVariables.join(", ")}` +
+              firstError,
             { itemIndex }
           );
         }
@@ -215,12 +238,20 @@ By \${{author}}
           }
         }
 
-        // Resolve template
-        const resolved = resolveTemplate(template, variables, { strictMode });
+        const result = render(template, Object.fromEntries(variables), {
+          strictMode,
+        });
+        if (!result.ok) {
+          throw new NodeOperationError(
+            this.getNode(),
+            describe(result.diagnostics[0]),
+            { itemIndex }
+          );
+        }
 
         // Build output
         const outputData: { [key: string]: string | TemplateMetadata } = {
-          [outputField]: resolved,
+          [outputField]: result.output,
         };
 
         if (showDetectedVariables) {
@@ -263,3 +294,11 @@ By \${{author}}
     return [returnData];
   }
 }
+
+function located(message: string, line: number, column: number): string {
+  return `${message} (line ${line}, column ${column})`;
+}
+
+function describe(diagnostic: Diagnostic): string {
+  return located(diagnostic.message, diagnostic.line, diagnostic.column);
+}
diff --git a/package.json b/package.json
index 10e1b2d..7e75055 100644
--- a/package.json
+++ b/package.json
@@ -27,6 +27,9 @@
     "test:watch": "jest --watch",
     "test:coverage": "jest --coverage"
   },
+  "bin": {
+    "template-resolver": "dist/cli/index.js"
+  },
   "files": [
     "dist"
   ],
diff --git a/tsconfig.json b/tsconfig.json
index 4166bb0..ba69a48 100644
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -21,7 +21,7 @@
     "skipLibCheck": true,
     "outDir": "./dist/"
   },
-  "include": ["core/**/*", "n8n/**/*", "n8n/**/*.json", "package.json"],
+  "include": ["core/**/*", "n8n/**/*", "api/**/*", "cli/**/*", "n8n/**/*.json", "package.json"],
   "exclude": [
     "node_modules",
     "dist",
```

## Gate run
The card's gate command as it last ran, before this packet was built. Output only: run the command yourself to check it.
- Command: `node node_modules/jest/bin/jest.js --runTestsByPath tests/headless/render.test.ts tests/headless/spec.test.ts tests/headless/node.test.ts tests/headless/nodeps.test.ts --json`
- Exit status: 0
- Tests: 62 passed, 0 failed
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
