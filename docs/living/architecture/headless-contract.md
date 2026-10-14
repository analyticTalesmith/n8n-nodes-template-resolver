---
summary: Contract for the headless cycle: the structured render result, diagnostics, limits, the HTTP API, the OpenAPI document and the CLI.
state: planned
---

# Headless contract

Decisions already settled in the ADRs apply (0003 unknown names always error, 0004 structured result, 0005 dependency-free estimator, 0006 node imports core). No new runtime dependency: node's `http`, `util.parseArgs`, `fs` only. Module detail: `modules/template-resolver.md` (core), `modules/api.md`, `modules/cli.md`.

## Core

```ts
interface Limits { maxIterations: number; maxOutputChars: number; maxDepth: number }
// DEFAULT_LIMITS: maxIterations 10000 (total FOR iterations across the render), maxOutputChars 1000000, maxDepth 32 (nesting of blocks)
interface RenderOptions { strictMode?: boolean; limits?: Partial<Limits>; tokenEstimator?: (text: string) => number }
interface Diagnostic { severity: "error" | "warning"; code: DiagnosticCode | "invalid-input" | "analysis-warning"; message: string; line: number; column: number; suggestion?: string }
interface RenderResult { ok: boolean; output: string; messages: unknown[]; stats: { chars: number; estTokens: number; sectionsOmitted: number; iterations: number }; diagnostics: Diagnostic[] }
render(template: string, data: Record<string, unknown>, options?: RenderOptions): RenderResult   // never throws for template or data problems
validate(template: string, options?: { limits?: Partial<Limits> }): { ok: boolean; diagnostics: Diagnostic[] }
analyze(template, options?: { limits? }): existing result plus `required` on each variable (= !optional) and `blocks: Partial<Record<"IF" | "CASE" | "FOR" | "LIST" | "TABLE", number>>` (count per block kind present)
spec(): { version: string; blocks: {name, closes?, args, description}[]; filters: {name, params, description}[]; operators: string[]; limits: Limits; syntax: {variable, comment} }
```

- `messages` is an empty array until MESSAGE blocks exist; `sectionsOmitted` is 0 until SECTION exists. `stats.iterations` is reported on failure too.
- Diagnostic codes: `syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth` (carried by `TemplateError` as `DiagnosticCode`), plus `invalid-input` (render, data not an object) and `analysis-warning` (validate). Every diagnostic has the 1-based line and column of the offending template node or tag; runtime errors (missing variable, bad filter parameters, math, type) carry the location of the node that failed, never a placeholder 1:1.
- On failure `ok` is false, `output` is `""`, and the only diagnostic is the error that stopped rendering.
- `validate` maps `analyze`'s diagnostics: `unknown-filter` stays an error; every other analysis finding (an unrecognized condition) becomes a warning with code `analysis-warning`. A template that does not parse gives its error. `ok` is false only when an error is present.
- `analyze` still throws a `TemplateError` for a template that does not parse; its callers (validate, the API, the CLI, the node) turn that into a diagnostic or an error.
- `analyze`'s own diagnostics have the analysis shape `{ code, message, line, column }` (no `severity`, no `suggestion`), with codes `unknown-filter` and `unrecognized-condition`. `POST /v1/analyze` puts a parse failure (`syntax-error` or `limit-depth`) in that same shape; `template-resolver analyze` prints it to stderr instead.
- `spec().version` is the template language version, `"1.0"`, not the package version.
- Estimator default: `Math.ceil(chars / 4)`, documented as an estimate with roughly +/-30 percent error for English prose.
- `resolveTemplate` (throwing string API) keeps its behavior, accepts `limits`, and is implemented over the same engine.
- The n8n node detects variables with `analyze`; in strict mode an unmapped required variable is a NodeOperationError naming the unmapped and detected variables and the first render error. Otherwise it calls `render` and writes `result.output` to the configured output field; a failed render becomes a NodeOperationError (or continue-on-fail item) with the first diagnostic's message and location.

## HTTP API (`api/`)

`createServer(options?: { limits?, tokenEstimator?, maxBodyBytes? }): http.Server` and `listen(server, port = 0, host = "127.0.0.1")`; default host 127.0.0.1, `maxBodyBytes` 1 MiB.

| Route | Request body | Response (200) |
|---|---|---|
| POST /v1/render | `{template, data?, options?: {strictMode?, limits?}}` | RenderResult |
| POST /v1/validate | `{template}` | `{ok, diagnostics}` |
| POST /v1/analyze | `{template}` | analysis |
| GET /v1/spec | | spec() |
| GET /v1/openapi.json | | the committed `api/openapi.json` |

- Template problems are results, not HTTP errors: 200 with `ok: false` and diagnostics. An unparseable template on `/v1/analyze` gives 200 with empty variables, filters and blocks and the error in `diagnostics`.
- Malformed requests: 400 `{error: {code: "invalid-request", message}}` (bad JSON, non-object body, missing or non-string `template`, non-object `data`, `options` or `options.limits`, non-boolean `strictMode`, a limit that is not a non-negative integer); 404 `not-found`; 405 `method-not-allowed` with `Allow`; 413 `payload-too-large`; 415 `unsupported-media-type` when POST content-type is not JSON; 500 `internal-error` for an unexpected exception. All responses are JSON.
- Server option limits are the ceiling: a request may only lower a limit, never raise it above the server's (the effective value is the minimum). `validate` and `analyze` use the server's `maxDepth`.
- `api/openapi.json` is committed, OpenAPI 3.1, describes every route, request and response schema; a test proves its paths and methods equal the router's table.

## CLI (`cli/`, bin `template-resolver`)

`template-resolver <render|validate|analyze|spec|serve> [options]`

- `render <template-file|-> [--data <file|->] [--strict | --no-strict] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]`: prints output to stdout; diagnostics as `file:line:col: severity code: message` on stderr; exit 0 on ok, 1 on template errors, 2 on usage or I/O errors. With `--json` prints the full RenderResult to stdout (exit codes unchanged). Strict by default; limit flags set the render's limits directly.
- `validate <template-file|->`, `analyze <template-file|->`: print JSON; `validate` exits 1 when not ok; `analyze` of an unparseable template prints the diagnostic to stderr and exits 1.
- `spec`: prints the spec JSON. `serve [--port n] [--host h]`: starts the API with default server options (default 127.0.0.1:3000), prints `listening on http://host:port`, and on SIGINT or SIGTERM closes and exits 0; a port that cannot be bound exits 2.
- `-` reads stdin; only one input may be stdin. `--help` prints usage to stdout (exit 0); no arguments print usage to stderr (exit 2).

## Engine surface under render

- `TemplateError` (and its subclasses) carry a string `code` from the diagnostic codes above; `line` and `column` are always the failing node's position (1-based). Plain `Error`s thrown by filters or math are converted to `TemplateError` at the node that evaluates them (unknown filter: `unknown-filter`; bad parameters: `type-error`).
- `resolveTemplate(template, variables, { strictMode?, limits? })` accepts `limits`; exceeding one throws a `TemplateError` with code `limit-iterations`, `limit-output` or `limit-depth` located at the node that crossed it.
- `DEFAULT_LIMITS` and `withDefaultLimits` are exported from core.
