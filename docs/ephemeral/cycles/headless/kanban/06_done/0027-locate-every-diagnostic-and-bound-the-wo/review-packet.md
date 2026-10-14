---
type: review-packet
card: 0027-locate-every-diagnostic-and-bound-the-wo
tier: product
built_at: 2026-10-14T00:53:39.050Z
base: fa7fa47cac614faaf0b7c88b5eac665a6a4338e8
head: 71bb2c43b624abc10fa9e4476dc58b1617d9a4f2
frozen: true
brief_sha256: 1dac4fd1df4a20cf191098429ea1ab68e1b0e4556491f9babdbe397997ef6c85
manifest_sha256: 0e55ce53b32c0e14ef2ff41819850127b6c8b054a882297769d3a94d3ee065f7
criteria_sha256: e169f603becf81304fda05ee1829bf3ad11697a98b38e55b83e091adf7b797ff
scope_sha256: c5efdb3c0b55580888310f6734f85babc903e77d412fd4e9daaf0b3749c54b10
diff_sha256: 3b28e217c6e453d89af4b5ffa8cde2e259b3a06ebca5447e9009e11ebda213fb
omitted_paths: 5
criteria_count: 6
must_not_count: 3
---

# Review packet: 0027-locate-every-diagnostic-and-bound-the-wo

Manifest amended after the freeze at 2026-10-14T00:53:29.626Z by lead: a frozen test had a miscounted column and was corrected (edit +tests/headless/diagnostics.test.ts, scope +tests/headless)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: errors carry code, line and column everywhere; limits bound iterations, output and nesting.

### Criteria

- c1 (verify: test): dg-syntax: syntax, missing-variable and unknown-filter errors carry the codes syntax-error, missing-variable and unknown-filter with the line and column of the failing tag or variable
- c2 (verify: test): dg-runtime: math, filter-parameter and type errors carry the line and column of the node that evaluates them, not a placeholder 1:1, and the code type-error
- c3 (verify: test): lm-iterations: more total FOR iterations than limits.maxIterations throws limit-iterations located at the loop
- c4 (verify: test): lm-output: output longer than limits.maxOutputChars throws limit-output
- c5 (verify: test): lm-depth: block nesting deeper than limits.maxDepth throws limit-depth located at the offending block
- c6 (verify: test): lm-defaults: DEFAULT_LIMITS is exported with maxIterations 10000, maxOutputChars 1000000 and maxDepth 32, a partial limits option keeps the other defaults, and a template under every limit renders as before

### Must not

- m1: change what any currently passing template renders
- m2: add a runtime dependency
- m3: import n8n or do I/O in core

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: errors carry code, line and column everywhere; limits bound iterations, output and nesting.
Must not:
- change what any currently passing template renders
- add a runtime dependency
- import n8n or do I/O in core

## Questions

goal-critical: do runtime errors deep in a template (inside FOR or IF, on line 5 or later) report their own line and column?
goal-critical: do the limits stop a runaway template, including nested loops, before the process hangs?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/headless-contract.md
- docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
```

### spec.md as of base fa7fa47

```
# Spec

## Acceptance criteria

- dg-syntax: syntax, missing-variable and unknown-filter errors carry the codes syntax-error, missing-variable and unknown-filter with the line and column of the failing tag or variable
- dg-runtime: math, filter-parameter and type errors carry the line and column of the node that evaluates them, not a placeholder 1:1, and the code type-error
- lm-iterations: more total FOR iterations than limits.maxIterations throws limit-iterations located at the loop
- lm-output: output longer than limits.maxOutputChars throws limit-output
- lm-depth: block nesting deeper than limits.maxDepth throws limit-depth located at the offending block
- lm-defaults: DEFAULT_LIMITS is exported with maxIterations 10000, maxOutputChars 1000000 and maxDepth 32, a partial limits option keeps the other defaults, and a template under every limit renders as before
```

### card.md as of base fa7fa47

```
# Locate every diagnostic and bound the work with limits

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Every template error carries a code and the line and column of the node that failed, and the engine stops runaway work at configurable limits. This is the engine surface the structured render result, the API and the CLI report from.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `dg-syntax` syntax, missing-variable and unknown-filter errors carry the codes syntax-error, missing-variable and unknown-filter with the line and column of the failing tag or variable
- `contract` `dg-runtime` math, filter-parameter and type errors carry the line and column of the node that evaluates them, not a placeholder 1:1, and the code type-error
- `contract` `lm-iterations` more total FOR iterations than limits.maxIterations throws limit-iterations located at the loop
- `contract` `lm-output` output longer than limits.maxOutputChars throws limit-output
- `contract` `lm-depth` block nesting deeper than limits.maxDepth throws limit-depth located at the offending block
- `contract` `lm-defaults` DEFAULT_LIMITS is exported with maxIterations 10000, maxOutputChars 1000000 and maxDepth 32, a partial limits option keeps the other defaults, and a template under every limit renders as before


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change what any currently passing template renders
- add a runtime dependency
- import n8n or do I/O in core


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none: no user-visible surface until the structured result card.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

TemplateError.code; resolveTemplate options.limits; DEFAULT_LIMITS (see docs/living/architecture/headless-contract.md, engine surface).


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `core/src/errors.ts` | edit | none |
| `core/src/expressions.ts` | edit | none |
| `core/src/filters.ts` | edit | none |
| `core/src/interpreter.ts` | edit | none |
| `core/src/parser.ts` | edit | none |
| `core/src/resolve.ts` | edit | none |
| `core/src/types.ts` | edit | none |

Files scope: `core/src/`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: none
- remove: none
- edit: `core/src/errors.ts`, `core/src/expressions.ts`, `core/src/filters.ts`, `core/src/interpreter.ts`, `core/src/parser.ts`, `core/src/resolve.ts`, `core/src/types.ts`, `tests/headless/diagnostics.test.ts`
- files_scope: `core/src/`, `tests/headless`

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

### docs/living/decisions/adr/0003-unknown-names-are-always-errors.md

```
---
summary: Unknown filters and unknown identifiers are always errors; strict mode only governs missing data.
type: adr
domain: language
status: accepted
date: 2026-10-13
state: built
---

# Unknown names are always errors, strict mode governs missing data

**Context.** Unknown filters throw today but unknown identifiers followed by operators silently evaluate false, and strict mode mixes missing data with misspelled names.

**Decision.** A filter, operator or identifier that the language does not define is a syntax-level error in every mode. Strict mode decides only what happens when a defined variable has no value in the data.

**Alternatives.** Report unknown names as errors in strict mode only; rejected because a typo then passes silently in the default mode.

**Consequences.** Typos are caught before a run by validate and analyze. Missing data stays tolerant by default.
```

## Frozen tests (read-only)

These test files were committed before the work began, at base fa7fa47. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tests/headless/diagnostics.test.ts (frozen)

```
import { resolveTemplate } from "../../core/src";
import { TemplateValue } from "../../core/src/types";

type Entries = [string, TemplateValue][];
interface Caught {
  threw: boolean;
  code: unknown;
  line: unknown;
  column: unknown;
  isTemplateError: boolean;
}

// Render in strict mode and capture the located diagnostic fields of the throw.
function caught(template: string, entries: Entries = []): Caught {
  try {
    resolveTemplate(template, new Map(entries), { strictMode: true });
  } catch (e) {
    const x = e as any;
    return {
      threw: true,
      code: x.code,
      line: x.line,
      column: x.column,
      isTemplateError: typeof x?.line === "number" && typeof x?.column === "number",
    };
  }
  return { threw: false, code: undefined, line: undefined, column: undefined, isTemplateError: false };
}

interface Case {
  name: string;
  template: string;
  entries?: Entries;
  code?: string;
  line: number;
  column: number;
}

function runCases(id: string, cases: Case[]) {
  it.each(cases)(`${id}: $name`, (c) => {
    const r = caught(c.template, c.entries);
    expect(r.threw).toBe(true);
    expect(r.isTemplateError).toBe(
      true,
    );
    if (c.code !== undefined) {
      expect(r.code).toBe(c.code);
    }
    expect({ line: r.line, column: r.column }).toEqual({ line: c.line, column: c.column });
  });
}

describe("dg-syntax: syntax, missing-variable and unknown-filter errors are coded and located", () => {
  const syntax: Case[] = [
    {
      name: "unknown tag is a syntax-error at the tag, not at 1:1",
      template: "intro\n  {{BOGUS}}x",
      code: "syntax-error",
      line: 2,
      column: 3,
    },
    {
      name: "unclosed IF is a syntax-error at the opening tag",
      template: "a\n\n  {{IF t}}x",
      entries: [["t", "x"]],
      code: "syntax-error",
      line: 3,
      column: 3,
    },
    {
      name: "unmatched END_IF inside a FOR is a syntax-error at the stray tag",
      template: "a\n  {{FOR xs AS i}}\n   {{END_IF}}",
      entries: [["xs", ["a"]]],
      code: "syntax-error",
      line: 3,
      column: 4,
    },
    {
      name: "unclosed variable substitution is a syntax-error at its start",
      template: "a\nb\n   ${{t",
      entries: [["t", "x"]],
      code: "syntax-error",
      line: 3,
      column: 4,
    },
  ];
  runCases("dg-syntax", syntax);

  const missing: Case[] = [
    {
      name: "missing variable on line 2 is missing-variable at the variable",
      template: "first line\nb ${{missing}}",
      code: "missing-variable",
      line: 2,
      column: 3,
    },
    {
      name: "missing variable after text on a later line is located at its column",
      template: "a\nb\n   x ${{ghost}} y",
      code: "missing-variable",
      line: 3,
      column: 6,
    },
    {
      name: "missing variable inside a FOR body is located at the variable",
      template: "a\n{{FOR xs AS i}}\n  ${{i}} ${{nope}}\n{{END_FOR}}",
      entries: [["xs", ["a"]]],
      code: "missing-variable",
      line: 3,
      column: 8,
    },
    {
      name: "missing variable inside an IF body is located at the variable",
      template: "a\n{{IF t}}\n\n   ${{nope}}{{END_IF}}",
      entries: [["t", "x"]],
      code: "missing-variable",
      line: 4,
      column: 4,
    },
  ];
  runCases("dg-syntax", missing);

  const unknownFilter: Case[] = [
    {
      name: "unknown filter is unknown-filter at the variable",
      template: "a\n\n  ${{t | nofilter}}",
      entries: [["t", "x"]],
      code: "unknown-filter",
      line: 3,
      column: 3,
    },
    {
      name: "unknown filter inside a FOR is unknown-filter at the variable",
      template: "a\n{{FOR xs AS i}}\n x${{i | bogus=1}}\n{{END_FOR}}",
      entries: [["xs", ["a"]]],
      code: "unknown-filter",
      line: 3,
      column: 3,
    },
  ];
  runCases("dg-syntax", unknownFilter);
});

describe("dg-runtime: math, filter-parameter and type errors are located at the evaluating node", () => {
  const filterParams: Case[] = [
    {
      name: "head without a parameter is a type-error at the variable",
      template: "a\n  ${{t | head}}",
      entries: [["t", "text"]],
      code: "type-error",
      line: 2,
      column: 3,
    },
    {
      name: "head with a non-numeric parameter is a type-error at the variable",
      template: "a\nb\n  ${{t | head=abc}}",
      entries: [["t", "text"]],
      code: "type-error",
      line: 3,
      column: 3,
    },
    {
      name: "tail without a parameter is a type-error at the variable",
      template: "a\n\n\n    ${{t | tail}}",
      entries: [["t", "text"]],
      code: "type-error",
      line: 4,
      column: 5,
    },
    {
      name: "filter parameter error inside a FOR is located at the variable in the loop body",
      template: "a\n  {{FOR xs AS i}}\n   ${{i | head}}{{END_FOR}}",
      entries: [["xs", ["a"]]],
      code: "type-error",
      line: 3,
      column: 4,
    },
    {
      name: "filter parameter error inside a nested IF is located at the variable",
      template: "a\n{{IF t}}\n{{IF t}}\nxx ${{t | head}}{{END_IF}}{{END_IF}}",
      entries: [["t", "text"]],
      code: "type-error",
      line: 4,
      column: 4,
    },
  ];
  runCases("dg-runtime", filterParams);

  const typeErrors: Case[] = [
    {
      name: "numeric comparison on a non-numeric value is a type-error at the IF tag",
      template: "a\n  {{IF t > 3}}x{{END_IF}}",
      entries: [["t", "x"]],
      code: "type-error",
      line: 2,
      column: 3,
    },
    {
      name: "type-error in an IF inside a FOR is located at the IF tag",
      template: "a\nb\n{{FOR xs AS i}}\n  {{IF i > 3}}x{{END_IF}}\n{{END_FOR}}",
      entries: [["xs", ["a"]]],
      code: "type-error",
      line: 4,
      column: 3,
    },
  ];
  runCases("dg-runtime", typeErrors);

  // Math failures currently surface through the variable path. The card fixes
  // their location; the code is one of the two diagnostics such a node may map to.
  const math: Case[] = [
    {
      name: "math with an unmatched parenthesis is located at the math node",
      template: "a\nb\n  ${{a * (b + 1}}",
      entries: [["a", "1"], ["b", "2"]],
      line: 3,
      column: 3,
    },
    {
      name: "math error inside a FOR body is located at the math node",
      template: "a\n{{FOR xs AS i}}\n  ${{i + (1}}\n{{END_FOR}}",
      entries: [["xs", ["1"]]],
      line: 3,
      column: 3,
    },
  ];
  it.each(math)("dg-runtime: $name", (c) => {
    const r = caught(c.template, c.entries);
    expect(r.threw).toBe(true);
    expect({ line: r.line, column: r.column }).toEqual({ line: c.line, column: c.column });
    expect(["type-error", "missing-variable"]).toContain(r.code);
  });

  it("dg-runtime: no runtime failure is reported at the placeholder 1:1 when the node is elsewhere", () => {
    const templates: [string, Entries][] = [
      ["x\n ${{t | head}}", [["t", "a"]]],
      ["x\n {{IF t > 1}}y{{END_IF}}", [["t", "a"]]],
      ["x\n ${{a * (b}}", [["a", "1"], ["b", "2"]]],
    ];
    for (const [t, e] of templates) {
      const r = caught(t, e);
      expect(r.threw).toBe(true);
      expect({ line: r.line, column: r.column }).toEqual({ line: 2, column: 2 });
    }
  });
});
```

### tests/headless/limits.test.ts (frozen)

```
import { resolveTemplate, DEFAULT_LIMITS } from "../../core/src";
import { Limits, TemplateValue } from "../../core/src/types";

type Entries = [string, TemplateValue][];

interface Outcome {
  threw: boolean;
  output: string;
  code: unknown;
  line: unknown;
  column: unknown;
}

function run(template: string, entries: Entries = [], limits?: Partial<Limits>): Outcome {
  try {
    const output = resolveTemplate(template, new Map(entries), { strictMode: true, limits });
    return { threw: false, output, code: undefined, line: undefined, column: undefined };
  } catch (e) {
    const x = e as any;
    return { threw: true, output: "", code: x.code, line: x.line, column: x.column };
  }
}

const items = (n: number, v: TemplateValue = "x"): TemplateValue[] => Array.from({ length: n }, () => v);
const nestIf = (n: number) => "{{IF t}}\n".repeat(n) + "x" + "{{END_IF}}".repeat(n);
const T: Entries = [["t", "yes"]];

describe("lm-iterations: total FOR iterations are bounded and the throw is located at the loop", () => {
  const over = [
    {
      name: "a single loop of 6 with limit 5 throws limit-iterations at the loop tag",
      template: "a\n  {{FOR xs AS i}}${{i}}{{END_FOR}}",
      entries: [["xs", items(6)]] as Entries,
      limits: { maxIterations: 5 },
      line: 2,
      column: 3,
    },
    {
      name: "iterations are summed across sequential loops and located at the loop that crosses the limit",
      template: "a\n{{FOR xs AS i}}${{i}}{{END_FOR}}\n b{{FOR xs AS j}}${{j}}{{END_FOR}}",
      entries: [["xs", items(3)]] as Entries,
      limits: { maxIterations: 5 },
      line: 3,
      column: 3,
    },
    {
      name: "nested loops count their inner iterations (2 x 3 exceeds 5)",
      template: "a\n{{FOR xs AS i}}{{FOR ys AS j}}${{j}}{{END_FOR}}{{END_FOR}}",
      entries: [["xs", items(2)], ["ys", items(3)]] as Entries,
      limits: { maxIterations: 5 },
      line: 0,
      column: 0,
    },
    {
      name: "a limit of 0 forbids any iteration",
      template: "{{FOR xs AS i}}${{i}}{{END_FOR}}",
      entries: [["xs", items(1)]] as Entries,
      limits: { maxIterations: 0 },
      line: 1,
      column: 1,
    },
  ];
  it.each(over)("lm-iterations: $name", (c) => {
    const r = run(c.template, c.entries, c.limits);
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-iterations");
    if (c.line > 0) {
      expect({ line: r.line, column: r.column }).toEqual({ line: c.line, column: c.column });
    } else {
      expect(typeof r.line).toBe("number");
      expect((r.line as number) >= 2).toBe(true);
    }
  });

  const within = [
    { name: "a loop of exactly the limit renders", t: "{{FOR xs AS i}}${{i}}{{END_FOR}}", e: [["xs", items(5, "z")]] as Entries, l: { maxIterations: 5 }, tight: { maxIterations: 4 }, out: "zzzzz" },
    { name: "nested loops within the limit render", t: "{{FOR xs AS i}}{{FOR ys AS j}}${{j}}{{END_FOR}}{{END_FOR}}", e: [["xs", items(2)], ["ys", items(2, "k")]] as Entries, l: { maxIterations: 100 }, tight: { maxIterations: 3 }, out: "kkkk" },
  ];
  it.each(within)("lm-iterations: $name", (c) => {
    const r = run(c.t, c.e, c.l);
    expect(r.threw).toBe(false);
    expect(r.output).toBe(c.out);
    const tight = run(c.t, c.e, c.tight);
    expect(tight.code).toBe("limit-iterations");
  });
});

describe("lm-output: output length is bounded", () => {
  it("lm-output: output of 11 chars with limit 10 throws limit-output", () => {
    const r = run("${{t}}", [["t", "12345678901"]], { maxOutputChars: 10 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-output");
  });

  it("lm-output: output of exactly the limit renders unchanged", () => {
    const r = run("${{t}}", [["t", "1234567890"]], { maxOutputChars: 10 });
    expect(r.threw).toBe(false);
    expect(r.output).toBe("1234567890");
    expect(run("${{t}}", [["t", "1234567890"]], { maxOutputChars: 9 }).code).toBe("limit-output");
  });

  it("lm-output: output grown by a loop past the limit throws limit-output", () => {
    const r = run("a\n{{FOR xs AS i}}${{i}}ab{{END_FOR}}", [["xs", items(20)]], { maxOutputChars: 10 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-output");
    expect(typeof r.line).toBe("number");
    expect((r.line as number) >= 1).toBe(true);
  });

  it("lm-output: static text longer than the limit throws limit-output", () => {
    const r = run("0123456789\nabc", [], { maxOutputChars: 10 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-output");
  });

  it("lm-output: a lower limit than the default is honoured while a higher one allows long output", () => {
    const long = "y".repeat(2000);
    expect(run("${{t}}", [["t", long]], { maxOutputChars: 1000 }).code).toBe("limit-output");
    const ok = run("${{t}}", [["t", long]], { maxOutputChars: 5000 });
    expect(ok.threw).toBe(false);
    expect(ok.output).toBe(long);
  });
});

describe("lm-depth: block nesting is bounded and the throw is located at the offending block", () => {
  it("lm-depth: nesting within maxDepth renders", () => {
    const r = run(nestIf(3), T, { maxDepth: 3 });
    expect(r.threw).toBe(false);
    expect(r.output.endsWith("x")).toBe(true);
    expect(run(nestIf(3), T, { maxDepth: 2 }).code).toBe("limit-depth");
  });

  it("lm-depth: one level past maxDepth throws limit-depth at the block that is too deep", () => {
    // blocks open on lines 1..4; the 4th (line 4, column 1) is the first beyond depth 3
    const r = run(nestIf(4), T, { maxDepth: 3 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
    expect({ line: r.line, column: r.column }).toEqual({ line: 4, column: 1 });
  });

  it("lm-depth: mixed IF and FOR nesting counts every block kind", () => {
    const t = "a\n{{IF t}}\n {{FOR xs AS i}}\n   {{IF t}}x{{END_IF}}\n {{END_FOR}}\n{{END_IF}}";
    const r = run(t, [...T, ["xs", ["a"]]], { maxDepth: 2 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
    expect({ line: r.line, column: r.column }).toEqual({ line: 4, column: 4 });
  });

  it("lm-depth: a LIST nested in an IF exceeds maxDepth 1 and is located at the LIST", () => {
    const t = "a\n  {{IF t}}\n    {{LIST}}{{LIST_ITEM}}x{{END_LIST_ITEM}}{{END_LIST}}{{END_IF}}";
    const r = run(t, T, { maxDepth: 1 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
    expect({ line: r.line, column: r.column }).toEqual({ line: 3, column: 5 });
  });

  it("lm-depth: a TABLE nested in an IF exceeds maxDepth 1 and is located at the TABLE", () => {
    const t = "a\n  {{IF t}}\n  b {{TABLE}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}{{END_IF}}";
    const r = run(t, T, { maxDepth: 1 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
    expect({ line: r.line, column: r.column }).toEqual({ line: 3, column: 5 });
  });

  it("lm-depth: a single top-level LIST or TABLE is within maxDepth 1", () => {
    const list = run("{{LIST}}{{LIST_ITEM}}x{{END_LIST_ITEM}}{{END_LIST}}", [], { maxDepth: 1 });
    expect(list.threw).toBe(false);
    const table = run("{{TABLE}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", [], { maxDepth: 1 });
    expect(table.threw).toBe(false);
    expect(run("{{LIST}}{{LIST_ITEM}}x{{END_LIST_ITEM}}{{END_LIST}}", [], { maxDepth: 0 }).code).toBe("limit-depth");
  });

  it("lm-depth: a very deep template is rejected by the default depth, not by a stack overflow", () => {
    const r = run(nestIf(200), T);
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
  });
});

describe("lm-defaults: defaults, partial limits and unchanged rendering", () => {
  it("lm-defaults: DEFAULT_LIMITS is 10000 iterations, 1000000 output chars, depth 32", () => {
    expect(DEFAULT_LIMITS).toEqual({ maxIterations: 10000, maxOutputChars: 1000000, maxDepth: 32 });
  });

  it("lm-defaults: with no limits option, 10000 iterations render and 10001 throw limit-iterations", () => {
    const t = "{{FOR xs AS i}}{{END_FOR}}";
    expect(run(t, [["xs", items(10000)]]).threw).toBe(false);
    const r = run(t, [["xs", items(10001)]]);
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-iterations");
  });

  it("lm-defaults: with no limits option, depth 32 renders and depth 33 throws limit-depth", () => {
    expect(run(nestIf(32), T).threw).toBe(false);
    const r = run(nestIf(33), T);
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
  });

  it("lm-defaults: with no limits option, output of 1000000 chars renders and 1000001 throws limit-output", () => {
    expect(run("${{t}}", [["t", "a".repeat(1000000)]]).threw).toBe(false);
    const r = run("${{t}}", [["t", "a".repeat(1000001)]]);
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-output");
  });

  it("lm-defaults: a partial limits option keeps the other defaults (maxOutputChars set, iterations default stays)", () => {
    const r = run("{{FOR xs AS i}}{{END_FOR}}", [["xs", items(10001)]], { maxOutputChars: 5000000 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-iterations");
  });

  it("lm-defaults: a partial limits option keeps the other defaults (maxIterations set, depth default stays)", () => {
    expect(run(nestIf(32), T, { maxIterations: 5 }).threw).toBe(false);
    const r = run(nestIf(33), T, { maxIterations: 5 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-depth");
  });

  it("lm-defaults: a partial limits option keeps the other defaults (maxDepth set, output default stays)", () => {
    const r = run("${{t}}", [["t", "a".repeat(1000001)]], { maxDepth: 5 });
    expect(r.threw).toBe(true);
    expect(r.code).toBe("limit-output");
  });

  it("lm-defaults: a template under every limit renders exactly as before, with and without limits", () => {
    const t = "Hi ${{name}}\n{{FOR xs AS i}}- ${{i}}\n{{END_FOR}}{{IF name}}ok{{END_IF}}";
    const e: Entries = [["name", "Ann"], ["xs", ["a", "b"]]];
    const expected = "Hi Ann\n- a\n- b\nok";
    expect(run(t, e).output).toBe(expected);
    expect(run(t, e, { maxIterations: 10, maxOutputChars: 100, maxDepth: 4 }).output).toBe(expected);
    expect(run(t, e, {}).output).toBe(expected);
    expect(run(t, e, { maxOutputChars: 5 }).code).toBe("limit-output");
  });
});
```

## 4. Diff

5 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/core/src/errors.ts b/core/src/errors.ts
index c65f7a5..0a97ad8 100644
--- a/core/src/errors.ts
+++ b/core/src/errors.ts
@@ -1,18 +1,43 @@
+export type LimitCode = "limit-iterations" | "limit-output" | "limit-depth";
+
+export type DiagnosticCode =
+  | "syntax-error"
+  | "type-error"
+  | "missing-variable"
+  | "unknown-filter"
+  | LimitCode;
+
 /**
  * Base template error with rich context
  */
 export class TemplateError extends Error {
   constructor(
-    message: string,
-    public readonly line: number,
-    public readonly column: number,
-    public readonly suggestion?: string
+    public readonly detail: string,
+    public line: number,
+    public column: number,
+    public readonly suggestion: string | undefined,
+    public readonly code: DiagnosticCode
   ) {
-    super(TemplateError.formatMessage(message, line, column, suggestion));
+    super(TemplateError.formatMessage(detail, line, column, suggestion));
     this.name = "TemplateError";
     Object.setPrototypeOf(this, TemplateError.prototype);
   }
 
+  /**
+   * Move the error to the template node that evaluated it
+   */
+  locate(line: number, column: number): this {
+    this.line = line;
+    this.column = column;
+    this.message = TemplateError.formatMessage(
+      this.detail,
+      line,
+      column,
+      this.suggestion
+    );
+    return this;
+  }
+
   private static formatMessage(
     message: string,
     line: number,
@@ -37,7 +62,7 @@ export class SyntaxError extends TemplateError {
     column: number,
     suggestion?: string
   ) {
-    super(message, line, column, suggestion);
+    super(message, line, column, suggestion, "syntax-error");
     this.name = "SyntaxError";
     Object.setPrototypeOf(this, SyntaxError.prototype);
   }
@@ -53,12 +78,23 @@ export class TypeError extends TemplateError {
     column: number,
     suggestion?: string
   ) {
-    super(message, line, column, suggestion);
+    super(message, line, column, suggestion, "type-error");
     this.name = "TypeError";
     Object.setPrototypeOf(this, TypeError.prototype);
   }
 }
 
+/**
+ * Math expression that cannot be parsed (unmatched parentheses, dangling operators)
+ */
+export class MathSyntaxError extends TypeError {
+  constructor(message: string, line: number, column: number) {
+    super(message, line, column);
+    this.name = "MathSyntaxError";
+    Object.setPrototypeOf(this, MathSyntaxError.prototype);
+  }
+}
+
 /**
  * Missing variable error (strict mode)
  */
@@ -74,8 +110,56 @@ export class MissingVariableError extends TemplateError {
       availableVariables.length > 0
         ? `Available variables: ${availableVariables.join(", ")}\nCheck variable name or enable Lenient Mode`
         : "No variables defined. Check variable mappings.";
-    super(message, line, column, suggestion);
+    super(message, line, column, suggestion, "missing-variable");
     this.name = "MissingVariableError";
     Object.setPrototypeOf(this, MissingVariableError.prototype);
   }
 }
+
+/**
+ * Filter name that does not exist
+ */
+export class UnknownFilterError extends TemplateError {
+  constructor(filterName: string, line: number, column: number) {
+    super(
+      `Unknown filter: ${filterName}`,
+      line,
+      column,
+      "Available filters: head, tail, trim, escape_md",
+      "unknown-filter"
+    );
+    this.name = "UnknownFilterError";
+    Object.setPrototypeOf(this, UnknownFilterError.prototype);
+  }
+}
+
+/**
+ * Render work crossed a configured limit
+ */
+export class LimitError extends TemplateError {
+  constructor(
+    code: LimitCode,
+    message: string,
+    line: number,
+    column: number,
+    suggestion?: string
+  ) {
+    super(message, line, column, suggestion, code);
+    this.name = "LimitError";
+    Object.setPrototypeOf(this, LimitError.prototype);
+  }
+}
+
+/**
+ * The error located at the node that evaluated it. A plain Error (bad filter
+ * parameters, failed math) becomes a type error there.
+ */
+export function locateError(
+  error: unknown,
+  line: number,
+  column: number
+): unknown {
+  if (error instanceof TemplateError) return error.locate(line, column);
+  if (error instanceof Error) return new TypeError(error.message, line, column);
+  return error;
+}
diff --git a/core/src/expressions.ts b/core/src/expressions.ts
index 259fc3c..e30109c 100644
--- a/core/src/expressions.ts
+++ b/core/src/expressions.ts
@@ -1,5 +1,5 @@
 import { VariableMap, TemplateValue } from "./types";
-import { TypeError } from "./errors";
+import { TypeError, MathSyntaxError } from "./errors";
 import {
   tryCoerceToNumber,
   tryCoerceToArray,
@@ -713,7 +713,7 @@ function evaluateMathTokens(tokens: (number | string)[]): number {
     const closeIdx = tokens.indexOf(")", openIdx);
 
     if (closeIdx === -1) {
-      throw new TypeError("Unmatched parentheses in math expression", 1, 1);
+      throw new MathSyntaxError("Unmatched parentheses in math expression", 1, 1);
     }
 
     const subTokens = tokens.slice(openIdx + 1, closeIdx);
@@ -764,7 +764,7 @@ function evaluateMathTokens(tokens: (number | string)[]): number {
   }
 
   if (tokens.length !== 1 || typeof tokens[0] !== "number") {
-    throw new TypeError("Invalid math expression", 1, 1);
+    throw new MathSyntaxError("Invalid math expression", 1, 1);
   }
 
   return tokens[0];
diff --git a/core/src/filters.ts b/core/src/filters.ts
index 06156b2..5547c2a 100644
--- a/core/src/filters.ts
+++ b/core/src/filters.ts
@@ -1,4 +1,5 @@
 import { FilterCall } from "./types";
+import { UnknownFilterError } from "./errors";
 
 /**
  * Parse filter string into FilterCall object
@@ -97,7 +98,7 @@ export function applyFilter(text: string, filter: FilterCall): string {
     case "escape_md":
       return applyEscapeMdFilter(text);
     default:
-      throw new Error(`Unknown filter: ${filter.name}`);
+      throw new UnknownFilterError(filter.name, 1, 1);
   }
 }
 
diff --git a/core/src/interpreter.ts b/core/src/interpreter.ts
index f7f012d..6b061fd 100644
--- a/core/src/interpreter.ts
+++ b/core/src/interpreter.ts
@@ -13,8 +13,16 @@ import {
   TernaryNode,
   VariableMap,
   TemplateValue,
+  Limits,
+  withDefaultLimits,
 } from "./types";
-import { TypeError, MissingVariableError } from "./errors";
+import {
+  TypeError,
+  MissingVariableError,
+  MathSyntaxError,
+  LimitError,
+  locateError,
+} from "./errors";
 import {
   tryCoerceToArray,
   tryCoerceStringForPathSegment,
@@ -44,19 +52,23 @@ import { parseFilter, applyFilters } from "./filters";
  */
 export class Interpreter {
   private strictMode: boolean;
+  private limits: Limits;
+  private iterations = 0;
   private loopContext: Map<string, TemplateValue> = new Map();
 
   constructor(
     private variables: VariableMap,
-    options?: { strictMode?: boolean }
+    options?: { strictMode?: boolean; limits?: Partial<Limits> }
   ) {
     this.strictMode = options?.strictMode ?? true;
+    this.limits = withDefaultLimits(options?.limits);
   }
 
   /**
    * Main interpretation entry point
    */
   interpret(ast: ProgramNode): string {
+    this.iterations = 0;
     return this.visitProgram(ast);
   }
 
@@ -64,7 +76,51 @@ export class Interpreter {
    * Visit program node (root)
    */
   private visitProgram(node: ProgramNode): string {
-    return node.body.map((child) => this.visit(child)).join("");
+    const parts: string[] = [];
+    let length = 0;
+    for (const child of node.body) {
+      const output = this.visit(child);
+      length += output.length;
+      this.checkOutputLength(length, child);
+      parts.push(output);
+    }
+    return parts.join("");
+  }
+
+  /**
+   * Run a node's own evaluation, locating any error it throws at the node
+   */
+  private at<T>(node: ASTNode, evaluate: () => T): T {
+    try {
+      return evaluate();
+    } catch (error) {
+      throw locateError(error, node.line, node.column);
+    }
+  }
+
+  private countIteration(node: ForNode): void {
+    this.iterations++;
+    if (this.iterations > this.limits.maxIterations) {
+      throw new LimitError(
+        "limit-iterations",
+        `Loops ran more than ${this.limits.maxIterations} iterations in total`,
+        node.line,
+        node.column,
+        "Iterate over less data or raise limits.maxIterations"
+      );
+    }
+  }
+
+  private checkOutputLength(length: number, node: ASTNode): void {
+    if (length > this.limits.maxOutputChars) {
+      throw new LimitError(
+        "limit-output",
+        `Output is longer than ${this.limits.maxOutputChars} characters`,
+        node.line,
+        node.column,
+        "Render less content or raise limits.maxOutputChars"
+      );
+    }
   }
 
   /**
@@ -75,7 +131,7 @@ export class Interpreter {
       case "Text":
         return this.visitText(node as TextNode);
       case "Variable":
-        return this.visitVariable(node as VariableNode);
+        return this.at(node, () => this.visitVariable(node as VariableNode));
       case "If":
         return this.visitIf(node as IfNode);
       case "Case":
@@ -87,7 +143,7 @@ export class Interpreter {
       case "Table":
         return this.visitTable(node as TableNode);
       case "Ternary":
-        return this.visitTernary(node as TernaryNode);
+        return this.at(node, () => this.visitTernary(node as TernaryNode));
       case "Comment":
         return ""; // Comments excluded from output
       default:
@@ -108,17 +164,27 @@ export class Interpreter {
   private visitVariable(node: VariableNode): string {
     // Check if this is a math expression (contains operators)
     const pathStr = node.path.join(".");
+    let mathError: unknown = null;
     if (this.isMathExpression(pathStr)) {
       try {
         const result = evaluateMathExpression(pathStr, this.getAllVariables());
         return String(result);
       } catch (error) {
         // Not a valid math expression, continue with normal resolution
+        mathError = error;
       }
     }
 
     const allowUndefined = node.defaultValue !== undefined;
-    let value = this.resolveNestedPath(node.path, allowUndefined);
+    let value: TemplateValue;
+    try {
+      value = this.resolveNestedPath(node.path, allowUndefined);
+    } catch (error) {
+      const unparseableMath =
+        error instanceof MissingVariableError &&
+        mathError instanceof MathSyntaxError;
+      throw unparseableMath ? mathError : error;
+    }
 
     // Apply default operator if value is falsy
     if (node.defaultValue !== undefined && !isTruthy(value)) {
@@ -149,7 +215,9 @@ export class Interpreter {
    * Visit IF node
    */
   private visitIf(node: IfNode): string {
-    const result = evaluateCondition(node.condition, this.getAllVariables());
+    const result = this.at(node, () =>
+      evaluateCondition(node.condition, this.getAllVariables())
+    );
 
     if (result) {
       return node.consequent.map((child) => this.visit(child)).join("");
@@ -172,7 +240,9 @@ export class Interpreter {
    * Visit CASE node
    */
   private visitCase(node: CaseNode): string {
-    const value = this.resolveNestedPath(node.expression.split("."));
+    const value = this.at(node, () =>
+      this.resolveNestedPath(node.expression.split("."))
+    );
     const valueStr = this.valueToString(value);
 
     // Check WHEN clauses
@@ -194,7 +264,7 @@ export class Interpreter {
    * Visit FOR loop
    */
   private visitFor(node: ForNode): string {
-    const iterable = this.resolveNestedPath(node.iterable);
+    const iterable = this.at(node, () => this.resolveNestedPath(node.iterable));
     const array = tryCoerceToArray(iterable);
 
     if (array === null) {
@@ -210,9 +280,12 @@ export class Interpreter {
     }
 
     const results: string[] = [];
+    let length = 0;
     const outerLoopContext = new Map(this.loopContext);
 
     for (let i = 0; i < array.length; i++) {
+      this.countIteration(node);
+
       // Set loop context
       this.loopContext.set(node.itemName, array[i]);
       this.loopContext.set("@index0", i);
@@ -224,6 +297,8 @@ export class Interpreter {
 
       // Render body
       const output = node.body.map((child) => this.visit(child)).join("");
+      length += output.length;
+      this.checkOutputLength(length, node);
       results.push(output);
     }
 
@@ -268,7 +343,10 @@ export class Interpreter {
   ): string | null {
     // Check condition
     if (node.condition) {
-      const result = evaluateCondition(node.condition, this.getAllVariables());
+      const condition = node.condition;
+      const result = this.at(node, () =>
+        evaluateCondition(condition, this.getAllVariables())
+      );
       if (!result) {
         // Show fallback if provided
         return node.fallback || null;
@@ -312,12 +390,16 @@ export class Interpreter {
         const forNode = rowNode.cells[0][0] as ForNode;
 
         // Iterate and generate rows
-        const iterable = this.resolveNestedPath(forNode.iterable);
+        const iterable = this.at(forNode, () =>
+          this.resolveNestedPath(forNode.iterable)
+        );
         const array = tryCoerceToArray(iterable);
 
         if (array) {
           const outerLoopContext = new Map(this.loopContext);
           for (let i = 0; i < array.length; i++) {
+            this.countIteration(forNode);
+
             // Set loop context
             this.loopContext.set(forNode.itemName, array[i]);
             this.loopContext.set("@index0", i);
diff --git a/core/src/parser.ts b/core/src/parser.ts
index 96b81b6..3df3c7e 100644
--- a/core/src/parser.ts
+++ b/core/src/parser.ts
@@ -17,8 +17,9 @@ import {
   TableRowNode,
   CommentNode,
   FilterCall,
+  DEFAULT_LIMITS,
 } from "./types";
-import { SyntaxError } from "./errors";
+import { SyntaxError, LimitError } from "./errors";
 
 /**
  * Parser: Builds Abstract Syntax Tree from tokens
@@ -27,8 +28,15 @@ import { SyntaxError } from "./errors";
  */
 export class Parser {
   private pos = 0;
-
-  constructor(private tokens: Token[]) {}
+  private depth = 0;
+  private readonly maxDepth: number;
+
+  constructor(
+    private tokens: Token[],
+    options?: { maxDepth?: number }
+  ) {
+    this.maxDepth = options?.maxDepth ?? DEFAULT_LIMITS.maxDepth;
+  }
 
   /**
    * Main parsing entry point
@@ -63,15 +71,15 @@ export class Parser {
       case TokenType.VARIABLE:
         return this.parseVariable();
       case TokenType.IF:
-        return this.parseIf();
+        return this.nested(() => this.parseIf());
       case TokenType.CASE:
-        return this.parseCase();
+        return this.nested(() => this.parseCase());
       case TokenType.FOR:
-        return this.parseFor();
+        return this.nested(() => this.parseFor());
       case TokenType.LIST:
-        return this.parseList();
+        return this.nested(() => this.parseList());
       case TokenType.TABLE:
-        return this.parseTable();
+        return this.nested(() => this.parseTable());
       case TokenType.HEADER:
         return this.parseTableHeader();
       case TokenType.ROW:
@@ -90,6 +98,27 @@ export class Parser {
     }
   }
 
+  /**
+   * Parse a block one level deeper, rejecting it at its opening tag when the
+   * nesting would exceed maxDepth
+   */
+  private nested<T>(parseBlock: () => T): T {
+    if (this.depth >= this.maxDepth) {
+      const token = this.current();
+      throw new LimitError(
+        "limit-depth",
+        `Block nesting exceeds the maximum depth of ${this.maxDepth}`,
+        token.line,
+        token.column,
+        "Flatten nested blocks or raise limits.maxDepth"
+      );
+    }
+    this.depth++;
+    const node = parseBlock();
+    this.depth--;
+    return node;
+  }
+
   /**
    * Parse text node
    */
@@ -707,7 +736,7 @@ export class Parser {
         rows.push(this.parseTableRow());
       } else if (this.check(TokenType.FOR)) {
         // Allow FOR loops to generate rows
-        const forNode = this.parseFor();
+        const forNode = this.nested(() => this.parseFor());
 
         // Wrap in a special TableRowNode
         rows.push({
diff --git a/core/src/resolve.ts b/core/src/resolve.ts
index fceeca4..b9c8d58 100644
--- a/core/src/resolve.ts
+++ b/core/src/resolve.ts
@@ -1,4 +1,4 @@
-import { Limits, VariableMap } from "./types";
+import { Limits, VariableMap, withDefaultLimits } from "./types";
 import { Lexer } from "./lexer";
 import { Parser } from "./parser";
 import { Interpreter } from "./interpreter";
@@ -8,7 +8,7 @@ import { Interpreter } from "./interpreter";
  *
  * @param template - Template string with conditional markdown syntax
  * @param variables - Variable mappings (name → value)
- * @param options - Configuration options (strictMode)
+ * @param options - Configuration options (strictMode, limits; omitted limits take DEFAULT_LIMITS)
  * @returns Resolved markdown string
  */
 export function resolveTemplate(
@@ -16,15 +16,20 @@ export function resolveTemplate(
   variables: VariableMap,
   options?: { strictMode?: boolean; limits?: Partial<Limits> }
 ): string {
+  const limits = withDefaultLimits(options?.limits);
+
   // Tokenize
   const lexer = new Lexer(template);
   const tokens = lexer.tokenize();
 
   // Parse to AST
-  const parser = new Parser(tokens);
+  const parser = new Parser(tokens, { maxDepth: limits.maxDepth });
   const ast = parser.parse();
 
   // Interpret
-  const interpreter = new Interpreter(variables, options);
+  const interpreter = new Interpreter(variables, {
+    strictMode: options?.strictMode,
+    limits,
+  });
   return interpreter.interpret(ast);
 }
diff --git a/core/src/types.ts b/core/src/types.ts
index 424f0ec..2f4e8af 100644
--- a/core/src/types.ts
+++ b/core/src/types.ts
@@ -241,10 +241,22 @@ export interface Limits {
 }
 
 /**
- * Default limits (signature-only stub: neutral values until implemented)
+ * Default limits: total FOR iterations across the render, output length,
+ * and nesting of blocks
  */
 export const DEFAULT_LIMITS: Limits = {
-  maxIterations: 0,
-  maxOutputChars: 0,
-  maxDepth: 0,
+  maxIterations: 10000,
+  maxOutputChars: 1000000,
+  maxDepth: 32,
 };
+
+/**
+ * The given limits, with every limit left out taking its default
+ */
+export function withDefaultLimits(limits?: Partial<Limits>): Limits {
+  return {
+    maxIterations: limits?.maxIterations ?? DEFAULT_LIMITS.maxIterations,
+    maxOutputChars: limits?.maxOutputChars ?? DEFAULT_LIMITS.maxOutputChars,
+    maxDepth: limits?.maxDepth ?? DEFAULT_LIMITS.maxDepth,
+  };
+}
diff --git a/tests/headless/diagnostics.test.ts b/tests/headless/diagnostics.test.ts
index e0701e9..e5e2094 100644
--- a/tests/headless/diagnostics.test.ts
+++ b/tests/headless/diagnostics.test.ts
@@ -107,7 +107,7 @@ describe("dg-syntax: syntax, missing-variable and unknown-filter errors are code
       entries: [["xs", ["a"]]],
       code: "missing-variable",
       line: 3,
-      column: 8,
+      column: 10,
     },
     {
       name: "missing variable inside an IF body is located at the variable",
```

## Gate run
The card's gate command as it last ran, before this packet was built. Output only: run the command yourself to check it.
- Command: `node node_modules/jest/bin/jest.js --runTestsByPath tests/headless/diagnostics.test.ts tests/headless/limits.test.ts --json`
- Exit status: 0
- Tests: 46 passed, 0 failed
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
