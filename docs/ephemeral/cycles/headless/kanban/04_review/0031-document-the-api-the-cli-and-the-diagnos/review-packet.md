---
type: review-packet
card: 0031-document-the-api-the-cli-and-the-diagnos
tier: product
built_at: 2026-10-14T01:55:17.370Z
base: b5b5ad449160d2d73ff73309fe773dcdc0c3f58a
head: 78735251211ae9562697c2f41141e914447b9596
frozen: true
brief_sha256: d9b3a24cd8d834259c490f636a4846f11c783b5ad3ba3ef9f3220cf5ae18b053
manifest_sha256: 939865f0c742819635e2e17076cf952d627c5989784b7d61cf92c998f3c2ba73
criteria_sha256: b236ed166b77c70801b9fce875a63b1e7dd35ec3547f392d5395d4be4558a3a9
scope_sha256: c72790c9cc3057ccb1cc861f54c2e501ccec5dc352fff63c5dba3d12f2e03da4
diff_sha256: bfd5126014858cf4dfe2d3d55b4839d9fda23a3498b36e75fba17a35a408cd86
omitted_paths: 5
criteria_count: 3
must_not_count: 2
---

# Review packet: 0031-document-the-api-the-cli-and-the-diagnos

Manifest amended after the freeze at 2026-10-14T01:49:37.098Z by lead: the cycle's planned living documents are written by this card (edit +docs/living/architecture/headless-contract.md, edit +docs/living/architecture/modules/api.md, edit +docs/living/architecture/modules/cli.md, edit +docs/living/architecture/modules/template-resolver.md, scope +docs/living/architecture)

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: a reader can use the CLI and the API from the documentation alone and every documented route, subcommand and code exists.

### Criteria

- c1 (verify: test): dc-coverage: the README names every API route, every CLI subcommand, every diagnostic code and the limits with their defaults, and the OpenAPI document paths are all mentioned
- c2 (verify: review): dc-examples: each curl and CLI example block in the README runs against the built code and produces the output the README shows
- c3 (verify: review): dc-living: the cycle's deltas add living module documents for the api and the cli and modify the core module document, applied by delta apply after the merge

### Must not

- m1: document anything the code does not do
- m2: change source code

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A headless core with a structured render result, an HTTP API and a CLI.
Card goal: a reader can use the CLI and the API from the documentation alone and every documented route, subcommand and code exists.
Must not:
- document anything the code does not do
- change source code

## Questions

goal-critical: run each example; does it match the README text?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/headless-contract.md
```

### spec.md as of base b5b5ad4

```
# Spec

## Acceptance criteria

- dc-coverage: the README names every API route, every CLI subcommand, every diagnostic code and the limits with their defaults, and the OpenAPI document paths are all mentioned
- dc-examples: each curl and CLI example block in the README runs against the built code and produces the output the README shows
- dc-living: the cycle's deltas add living module documents for the api and the cli and modify the core module document, applied by delta apply after the merge
```

### card.md as of base b5b5ad4

```
# Document the API, the CLI and the diagnostics

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

The README explains the CLI, the HTTP API, the structured result and the diagnostics, matching the built behavior; the living docs gain module documents for the api and cli and an updated core module; the changelog records the cycle.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. The gate must print a report the red-evidence check can read: `["node", "--test", "--test-reporter=tap", "test/x.test.mjs"]`, `["npx", "jest", "--json", "src/x.test.ts"]`, or `["npx", "vitest", "run", "--reporter=json", "--outputFile=<report file>", "src/x.test.ts"]` (the report file is rewritten by every run). -->

- `contract` `dc-coverage` the README names every API route, every CLI subcommand, every diagnostic code and the limits with their defaults, and the OpenAPI document paths are all mentioned
- `contract` `dc-examples` each curl and CLI example block in the README runs against the built code and produces the output the README shows
- `contract` `dc-living` the cycle's deltas add living module documents for the api and the cli and modify the core module document, applied by delta apply after the merge


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- document anything the code does not do
- change source code


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

README.md and changelog.md are the user documentation this card writes.


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

none: documentation only.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `README.md` | edit | none |
| `changelog.md` | edit | none |

Files scope: `README.md`, `changelog.md`, `docs/living/`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: none
- remove: none
- edit: `README.md`, `changelog.md`, `docs/living/architecture/headless-contract.md`, `docs/living/architecture/modules/api.md`, `docs/living/architecture/modules/cli.md`, `docs/living/architecture/modules/template-resolver.md`
- files_scope: `README.md`, `changelog.md`, `docs/living/`, `docs/living/architecture`

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

These test files were committed before the work began, at base b5b5ad4. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tools/tests/headless-docs.test.mjs (frozen)

```
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readmePath = path.join(root, 'README.md');
const openapiPath = path.join(root, 'api', 'openapi.json');

function readme() {
  assert.ok(fs.existsSync(readmePath), 'README.md must exist at the repo root');
  return fs.readFileSync(readmePath, 'utf8');
}

function missing(text, items) {
  return items.filter((item) => !text.includes(item));
}

function assertAllMentioned(text, items, what) {
  assert.deepEqual(missing(text, items), [], `the README must mention every ${what}; missing`);
}

const routes = [
  'POST /v1/render',
  'POST /v1/validate',
  'POST /v1/analyze',
  'GET /v1/spec',
  'GET /v1/openapi.json',
];
const subcommands = ['render', 'validate', 'analyze', 'spec', 'serve'].map((s) => `template-resolver ${s}`);
const diagnosticCodes = [
  'syntax-error', 'type-error', 'missing-variable', 'unknown-filter',
  'limit-iterations', 'limit-output', 'limit-depth', 'invalid-input', 'analysis-warning',
];
const httpErrorCodes = [
  'invalid-request', 'not-found', 'method-not-allowed', 'payload-too-large', 'unsupported-media-type',
];
const limits = [['maxIterations', '10000'], ['maxOutputChars', '1000000'], ['maxDepth', '32']];

test('dc-coverage: the README names every API route', () => {
  assertAllMentioned(readme(), routes, 'API route as "METHOD /path"');
});

test('dc-coverage: the README names every CLI subcommand', () => {
  assertAllMentioned(readme(), subcommands, 'CLI subcommand as "template-resolver <sub>"');
});

test('dc-coverage: the README names every diagnostic and HTTP error code', () => {
  assertAllMentioned(readme(), [...diagnosticCodes, ...httpErrorCodes], 'diagnostic and HTTP error code');
});

test('dc-coverage: the README names each limit with its default', () => {
  const text = readme();
  assertAllMentioned(text, limits.map(([name]) => name), 'limit name');
  for (const [name, value] of limits) {
    const line = text.split('\n').find((l) => l.includes(name) && l.replace(/[,_ ]/g, '').includes(value));
    assert.ok(line, `the README must state the default ${value} on the same line as ${name}`);
  }
});

test('dc-coverage: the README documents the CLI exit codes 0, 1 and 2', () => {
  const text = readme();
  const idx = text.search(/exit code/i);
  assert.ok(idx >= 0, 'the README must have an exit codes explanation');
  const section = text.slice(Math.max(0, idx - 300), idx + 600);
  for (const code of ['0', '1', '2']) {
    assert.match(section, new RegExp(`(^|[^\d])${code}([^\d]|$)`), `the exit codes text must mention exit code ${code}`);
  }
  assert.ok(text.includes('template-resolver'), 'the exit codes must sit in a section about the template-resolver CLI');
});

test('dc-coverage: the README mentions every path in api/openapi.json', () => {
  assert.ok(fs.existsSync(openapiPath), 'api/openapi.json must exist (delivered by the API card)');
  const doc = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
  const paths = Object.keys(doc.paths ?? {});
  assert.ok(paths.length > 0, 'api/openapi.json must declare at least one path');
  assertAllMentioned(readme(), paths, 'OpenAPI path');
});
```

## 4. Diff

5 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

````diff
diff --git a/README.md b/README.md
index 9f4573c..ae81816 100644
--- a/README.md
+++ b/README.md
@@ -2,6 +2,8 @@
 
 A template engine node for n8n that builds dynamic text from variables. Designed for constructing LLM prompts that adapt based on workflow data.
 
+The same engine also runs without n8n: a command line (`template-resolver`) and a small HTTP API both return a [structured render result](#structured-render-result) with located [diagnostics](#diagnostics).
+
 ## What It Does
 
 Takes a template with placeholders and conditions, combines it with variable values from your workflow, and outputs the resolved text.
@@ -75,7 +77,7 @@ First tag: ${{tags.0}}
 Second tag: ${{tags.1}}
 ```
 
-**Missing variables** become empty strings (no errors).
+**Missing variables** are an error in strict mode (the default) unless the placeholder has a `??` default; with strict mode off they become empty strings.
 
 ---
 
@@ -430,7 +432,7 @@ Map each template variable to a workflow value:
 {
   "resolved_prompt": "The fully processed template text...",
   "_template_metadata": {
-    "detected_variables": ["customer_name", "order_items", "is_premium"],
+    "detected_variables": ["customer_name", "is_premium", "order_items"],
     "mapped_variables": ["customer_name", "is_premium"],
     "missing_variables": ["order_items"],
     "variable_count": 3
@@ -438,7 +440,9 @@ Map each template variable to a workflow value:
 }
 ```
 
-Metadata only included when "Show Detected Variables" is enabled.
+Metadata only included when "Show Detected Variables" is enabled. `detected_variables` is sorted; a variable read only with a `??` default never counts as required.
+
+When rendering fails, the node raises an error carrying the first diagnostic's message and its line and column (with "Continue On Fail" the item becomes `{ error, error_type }` instead).
 
 ---
 
@@ -513,6 +517,388 @@ ${{current_message}}
 
 ---
 
+## Structured render result
+
+Every render, whether through the command line (`--json`), the HTTP API (`POST /v1/render`) or core's `render(template, data, options)`, returns the same object. Template and data problems never throw; they come back in the result.
+
+```json
+{
+  "ok": true,
+  "output": "Hello Alice!\nYou have premium access.\n",
+  "messages": [],
+  "stats": {
+    "chars": 38,
+    "estTokens": 10,
+    "sectionsOmitted": 0,
+    "iterations": 0
+  },
+  "diagnostics": []
+}
+```
+
+| Field                   | Meaning                                                                                  |
+| ----------------------- | ---------------------------------------------------------------------------------------- |
+| `ok`                    | `false` when an error stopped rendering                                                  |
+| `output`                | The rendered text; `""` when `ok` is `false`                                             |
+| `messages`              | Always `[]` for now (reserved for message blocks)                                        |
+| `stats.chars`           | Length of `output`                                                                       |
+| `stats.estTokens`       | Token estimate, `ceil(chars / 4)`: roughly +/-30 percent for English prose               |
+| `stats.sectionsOmitted` | Always `0` for now (reserved for section blocks)                                         |
+| `stats.iterations`      | FOR iterations run in total, also reported when the render failed                        |
+| `diagnostics`           | On failure, one diagnostic: the error that stopped rendering                             |
+
+`validate` returns `{ ok, diagnostics }`, where `ok` is `false` only when some diagnostic is an error; warnings leave it `true`.
+
+### Diagnostics
+
+A diagnostic is `{ severity, code, message, line, column, suggestion? }`. `severity` is `"error"` or `"warning"`; `line` and `column` are 1-based and point at the template tag or placeholder that failed, including runtime errors such as a missing variable or a bad filter parameter. `suggestion` is present when the engine has a hint.
+
+| Code               | Severity | When                                                                                                   |
+| ------------------ | -------- | ------------------------------------------------------------------------------------------------------ |
+| `syntax-error`     | error    | The template does not parse: unknown tag, unclosed block, bad `FOR` syntax, stray `END_*`             |
+| `type-error`       | error    | An operation fails on its values: non-numeric comparison or math, bad filter parameters, non-array `FOR` in strict mode |
+| `missing-variable` | error    | Strict mode and a placeholder reads a variable that is not in the data and has no `??` default         |
+| `unknown-filter`   | error    | A filter other than `head`, `tail`, `trim`, `escape_md`                                                 |
+| `limit-iterations` | error    | FOR loops ran more than `maxIterations` iterations in total                                            |
+| `limit-output`     | error    | The output grew past `maxOutputChars`                                                                  |
+| `limit-depth`      | error    | Blocks nest deeper than `maxDepth`                                                                     |
+| `invalid-input`    | error    | Core `render` was given data that is not an object (the CLI and the API reject such data before rendering) |
+| `analysis-warning` | warning  | `validate` only: a condition the engine cannot read, such as `{{IF status is active}}`                 |
+
+The command line prints diagnostics to stderr as `file:line:column: severity code: message`:
+
+```console
+$ template-resolver render greeting.tpl
+greeting.tpl:1:7: error missing-variable: Variable 'name' not found
+```
+
+### Limits
+
+Limits bound the work of one render. Each can be lowered per render; anything left out takes its default.
+
+| Limit            | Default   | Bounds                                                  | Diagnostic         |
+| ---------------- | --------- | ------------------------------------------------------- | ------------------ |
+| `maxIterations`  | 10000     | Total FOR iterations across the whole render            | `limit-iterations` |
+| `maxOutputChars` | 1000000   | Length of the output                                    | `limit-output`     |
+| `maxDepth`       | 32        | Nesting of blocks (also applied by validate and analyze) | `limit-depth`      |
+
+The command line sets them with `--max-iterations`, `--max-output-chars` and `--max-depth`; the HTTP API with `options.limits` (a request can only lower the server's limits). `template-resolver spec` and `GET /v1/spec` report the defaults.
+
+---
+
+## Command line: `template-resolver`
+
+```
+template-resolver <command> [options]
+```
+
+| Command                                    | Does                                                                     |
+| ------------------------------------------ | ------------------------------------------------------------------------ |
+| `template-resolver render <file\|->`       | Renders a template and prints the output to stdout                       |
+| `template-resolver validate <file\|->`     | Checks a template without data; prints `{ok, diagnostics}` as JSON       |
+| `template-resolver analyze <file\|->`      | Prints the variables, filters and blocks a template uses, as JSON        |
+| `template-resolver spec`                   | Prints the template language spec as JSON (blocks, filters, operators, default limits, syntax) |
+| `template-resolver serve`                  | Starts the HTTP API                                                      |
+
+Exit codes for every command:
+
+| Exit code | Meaning                                                                                   |
+| --------- | ----------------------------------------------------------------------------------------- |
+| 0         | Success (for `validate`, warnings only still exit 0)                                      |
+| 1         | Template errors: a failed render, a `validate` with an error, an `analyze` that cannot parse |
+| 2         | Usage or I/O errors: unknown command or option, unreadable file, data that is not a JSON object, a port that cannot be bound |
+
+`--help` prints the usage and exits 0; no command at all prints the usage to stderr and exits 2.
+
+**`render` options**
+
+| Option                                 | Meaning                                                                  |
+| -------------------------------------- | ------------------------------------------------------------------------ |
+| `--data <file\|->`                     | JSON object with the variables (default `{}`)                            |
+| `--strict` / `--no-strict`             | Strict mode is on by default; `--no-strict` renders missing variables as `""`; the two cannot be combined |
+| `--max-iterations n`                   | Lower or raise `maxIterations`                                           |
+| `--max-output-chars n`                 | Lower or raise `maxOutputChars`                                          |
+| `--max-depth n`                        | Lower or raise `maxDepth`                                                |
+| `--json`                               | Print the full structured render result instead of the text (exit codes unchanged) |
+
+Without `--json`, the output goes to stdout and diagnostics to stderr.
+
+**stdin:** `-` in place of a file reads stdin, for the template or for `--data`. Only one input may come from stdin; `render - --data -` is a usage error (exit 2).
+
+**`serve` options:** `--port n` (default 3000) and `--host h` (default `127.0.0.1`, loopback only). It prints `listening on http://host:port` and runs with the default limits and the 1 MiB body limit until interrupted (Ctrl+C), then exits 0.
+
+### Examples
+
+With `greeting.tpl` holding the template from [What It Does](#what-it-does) and `data.json` holding `{"name": "Alice", "is_premium": true}`:
+
+```console
+$ template-resolver render greeting.tpl --data data.json
+Hello Alice!
+You have premium access.
+$ echo $?
+0
+```
+
+Data from stdin:
+
+```console
+$ echo '{"name": "Bob"}' | template-resolver render greeting.tpl --data -
+Hello Bob!
+
+```
+
+A template error exits 1:
+
+```console
+$ template-resolver render greeting.tpl
+greeting.tpl:1:7: error missing-variable: Variable 'name' not found
+$ echo $?
+1
+$ template-resolver render greeting.tpl --no-strict
+Hello !
+
+```
+
+A lowered limit:
+
+```console
+$ cat loop.tpl
+{{FOR items AS i}}${{i}}{{END_FOR}}
+$ echo '{"items": [1, 2, 3, 4, 5]}' > items.json
+$ template-resolver render loop.tpl --data items.json --max-iterations 3
+loop.tpl:1:1: error limit-iterations: Loops ran more than 3 iterations in total
+```
+
+`--json` prints the structured render result shown [above](#structured-render-result):
+
+```console
+$ template-resolver render greeting.tpl --data data.json --json
+{
+  "ok": true,
+  "output": "Hello Alice!\nYou have premium access.\n",
+  "messages": [],
+  "stats": {
+    "chars": 38,
+    "estTokens": 10,
+    "sectionsOmitted": 0,
+    "iterations": 0
+  },
+  "diagnostics": []
+}
+```
+
+`validate` reports an error (exit 1) or a warning (exit 0):
+
+```console
+$ printf 'Hi ${{name | shout}}\n' | template-resolver validate -
+{
+  "ok": false,
+  "diagnostics": [
+    {
+      "severity": "error",
+      "code": "unknown-filter",
+      "message": "Unknown filter: shout",
+      "line": 1,
+      "column": 4
+    }
+  ]
+}
+$ echo $?
+1
+$ cat check.tpl
+{{IF status is active}}Active{{END_IF}}
+$ template-resolver validate check.tpl
+{
+  "ok": true,
+  "diagnostics": [
+    {
+      "severity": "warning",
+      "code": "analysis-warning",
+      "message": "Unrecognized condition: status is active",
+      "line": 1,
+      "column": 1
+    }
+  ]
+}
+$ echo $?
+0
+```
+
+`analyze`:
+
+```console
+$ template-resolver analyze greeting.tpl
+{
+  "variables": [
+    {
+      "name": "name",
+      "paths": [
+        "name"
+      ],
+      "usedIn": [
+        "output"
+      ],
+      "optional": false,
+      "required": true
+    },
+    {
+      "name": "is_premium",
+      "paths": [
+        "is_premium"
+      ],
+      "usedIn": [
+        "if"
+      ],
+      "optional": false,
+      "required": true
+    }
+  ],
+  "filters": [],
+  "blocks": {
+    "IF": 1
+  },
+  "diagnostics": []
+}
+```
+
+`spec` (the end of it, with the default limits):
+
+```console
+$ template-resolver spec | tail -n 10
+  "limits": {
+    "maxIterations": 10000,
+    "maxOutputChars": 1000000,
+    "maxDepth": 32
+  },
+  "syntax": {
+    "variable": "${{path.to.value ?? \"default\" | filter=arg}}",
+    "comment": "{{# comment #}}"
+  }
+}
+```
+
+Usage errors exit 2:
+
+```console
+$ template-resolver render - --data -
+template-resolver: only one input may be read from stdin
+
+Usage: template-resolver <command> [options]
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
+$ echo $?
+2
+```
+
+---
+
+## HTTP API
+
+Start it with `template-resolver serve`:
+
+```console
+$ template-resolver serve
+listening on http://127.0.0.1:3000
+```
+
+The API is stateless JSON over HTTP. It listens on loopback (`127.0.0.1`) by default and has no authentication, so binding another host with `--host` exposes it to that network.
+
+| Route                   | Request body                                         | 200 response                              |
+| ----------------------- | ---------------------------------------------------- | ----------------------------------------- |
+| `POST /v1/render`       | `{template, data?, options?: {strictMode?, limits?}}` | The [structured render result](#structured-render-result) |
+| `POST /v1/validate`     | `{template}`                                         | `{ok, diagnostics}`                       |
+| `POST /v1/analyze`      | `{template}`                                         | The analysis (variables, filters, blocks, diagnostics) |
+| `GET /v1/spec`          |                                                      | The template language spec                |
+| `GET /v1/openapi.json`  |                                                      | The OpenAPI 3.1 document, `api/openapi.json` |
+
+- POST bodies must be JSON with `Content-Type: application/json`, at most 1 MiB.
+- Template problems are results, not HTTP errors: `200` with `ok: false` and diagnostics. An `analyze` of a template that does not parse returns `200` with empty variables and the error in `diagnostics`.
+- `options.strictMode` defaults to `true`. `options.limits` takes `maxIterations`, `maxOutputChars` and `maxDepth`; a request can only lower the server's limits, so a value above the server's is capped at the server's. `validate` and `analyze` use the server's `maxDepth`.
+
+Request errors are `{"error": {"code", "message"}}`:
+
+| Status | Code                     | When                                                                                     |
+| ------ | ------------------------ | ---------------------------------------------------------------------------------------- |
+| 400    | `invalid-request`        | Body is not JSON or not an object, `template` is not a string, `data` or `options` is not an object, an option has the wrong type, a limit is not a non-negative integer |
+| 404    | `not-found`              | No route for the path                                                                    |
+| 405    | `method-not-allowed`     | The path exists for another method; the `Allow` header names it                          |
+| 413    | `payload-too-large`      | The body exceeds 1 MiB                                                                   |
+| 415    | `unsupported-media-type` | A POST whose `Content-Type` is not `application/json`                                    |
+
+### Examples
+
+```console
+$ curl -s -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"template": "Hello ${{name}}!", "data": {"name": "Alice"}}'
+{"ok":true,"output":"Hello Alice!","messages":[],"stats":{"chars":12,"estTokens":3,"sectionsOmitted":0,"iterations":0},"diagnostics":[]}
+```
+
+A template error is still `200`:
+
+```console
+$ curl -s -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"template": "Hello ${{name}}!"}'
+{"ok":false,"output":"","messages":[],"stats":{"chars":0,"estTokens":0,"sectionsOmitted":0,"iterations":0},"diagnostics":[{"severity":"error","code":"missing-variable","message":"Variable 'name' not found","line":1,"column":7,"suggestion":"No variables defined. Check variable mappings."}]}
+```
+
+A request that lowers a limit:
+
+```console
+$ curl -s -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"template": "{{FOR items AS i}}${{i}}{{END_FOR}}", "data": {"items": [1, 2, 3]}, "options": {"limits": {"maxIterations": 2}}}'
+{"ok":false,"output":"","messages":[],"stats":{"chars":0,"estTokens":0,"sectionsOmitted":0,"iterations":3},"diagnostics":[{"severity":"error","code":"limit-iterations","message":"Loops ran more than 2 iterations in total","line":1,"column":1,"suggestion":"Iterate over less data or raise limits.maxIterations"}]}
+```
+
+```console
+$ curl -s -X POST http://127.0.0.1:3000/v1/validate -H 'Content-Type: application/json' -d '{"template": "{{IF ready}}Go"}'
+{"ok":false,"diagnostics":[{"severity":"error","code":"syntax-error","message":"Unclosed {{IF}} block starting at line 1","line":1,"column":1,"suggestion":"Add {{END_IF}}"}]}
+```
+
+```console
+$ curl -s -X POST http://127.0.0.1:3000/v1/analyze -H 'Content-Type: application/json' -d '{"template": "${{user.name ?? \"guest\"}} ${{note | trim}}"}'
+{"variables":[{"name":"user","paths":["user.name"],"usedIn":["output"],"optional":true,"required":false},{"name":"note","paths":["note"],"usedIn":["output"],"optional":false,"required":true}],"filters":[{"name":"trim","count":1}],"blocks":{},"diagnostics":[]}
+```
+
+```console
+$ curl -s http://127.0.0.1:3000/v1/spec | head -c 100
+{"version":"1.0","blocks":[{"name":"IF","closes":"END_IF","args":"condition","description":"Renders 
+$ curl -s http://127.0.0.1:3000/v1/openapi.json | head -n 5
+{
+  "openapi": "3.1.0",
+  "info": {
+    "title": "Template Resolver API",
+    "version": "1.0.0",
+```
+
+Request errors (the status printed after the body):
+
+```console
+$ curl -s -w '\n%{http_code}\n' -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"data": {}}'
+{"error":{"code":"invalid-request","message":"template must be a string"}}
+400
+$ curl -s -w '\n%{http_code}\n' http://127.0.0.1:3000/v1/nope
+{"error":{"code":"not-found","message":"No route for /v1/nope"}}
+404
+$ curl -s -o /dev/null -w '%{http_code} Allow: %header{allow}\n' http://127.0.0.1:3000/v1/render
+405 Allow: POST
+$ curl -s -w '\n%{http_code}\n' -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: text/plain' -d 'Hello'
+{"error":{"code":"unsupported-media-type","message":"Content-Type must be application/json"}}
+415
+$ node -e "process.stdout.write(JSON.stringify({template: 'x'.repeat(1100000)}))" > big.json
+$ curl -s -w '\n%{http_code}\n' -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' --data-binary @big.json
+{"error":{"code":"payload-too-large","message":"Body exceeds 1048576 bytes"}}
+413
+```
+
+---
+
 ## Development
 
 ```bash
@@ -525,10 +911,13 @@ npm pack             # Create installable package
 node --test tools/tests/*.test.mjs   # Tooling tests (CI, jest reporter, restructure checks)
 ```
 
-The repository has a headless core and a thin n8n wrapper:
+`npm run build` also builds the command line. The package's bin `template-resolver` is `dist/cli/index.js`: from a clone, run it as `node dist/cli/index.js <command>`, or `npm link` once to put `template-resolver` on your PATH. The examples above were run that way.
+
+The repository has a headless core, a thin n8n wrapper and two more thin consumers:
 
-- `core/src/` is the pure template library (lexer, parser, interpreter, filters, `analyze`); it imports nothing from n8n and does no I/O.
+- `core/src/` is the pure template library (lexer, parser, interpreter, filters, `analyze`, and `render`, `validate`, `spec`); it imports nothing from n8n and does no I/O.
 - `n8n/` is the node; it imports core directly.
+- `api/` is the HTTP API (node's `http`), with its committed OpenAPI document `api/openapi.json`; `cli/` is the command line, whose `serve` starts the API.
 - `tests/` holds the jest suites, including golden-file cases under `tests/golden/cases/` (update with the harness's update mode); `tools/` holds the jest TAP reporter and node:test tooling tests.
 - `docs/living/` holds the architecture and the decision records (`docs/living/decisions/adr/`).
 
diff --git a/changelog.md b/changelog.md
index 1daf668..327114d 100644
--- a/changelog.md
+++ b/changelog.md
@@ -5,6 +5,14 @@
 - The engine moved to `core/src` (pure library) with the n8n node in `n8n/`; `analyze()` derives usage from the parsed template
 - Golden-file test harness; design decisions recorded under `docs/living/decisions/adr/`
 - Removed a stray console log from the math fallback, a garbled prefix from error messages, and the ELSE IF hint now works for any letter case
+- Structured render result: core `render` returns `{ok, output, messages, stats, diagnostics}` and never throws for template or data problems; `validate` checks a template without data; `spec` describes the template language (version `1.0`)
+- Diagnostics carry a code (`syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`, `invalid-input`, `analysis-warning`) and the line and column of the failing tag or placeholder, runtime errors included
+- Render limits with defaults: `maxIterations` 10000, `maxOutputChars` 1000000, `maxDepth` 32
+- `analyze` reports `required` per variable and a count per block kind
+- The n8n node renders through `render` and reports the first diagnostic with its location
+- Command line `template-resolver` with `render`, `validate`, `analyze`, `spec` and `serve`; exit codes 0, 1 and 2
+- HTTP API: `POST /v1/render`, `POST /v1/validate`, `POST /v1/analyze`, `GET /v1/spec`, `GET /v1/openapi.json`, on loopback by default, with a committed OpenAPI 3.1 document; request limits can only lower the server's
+- README documents the result, the diagnostics, the limits, the command line and the HTTP API; missing variables are now described as an error in strict mode
 
 ### 1.0.0
 
diff --git a/docs/living/architecture/headless-contract.md b/docs/living/architecture/headless-contract.md
index a332a9a..bcc659b 100644
--- a/docs/living/architecture/headless-contract.md
+++ b/docs/living/architecture/headless-contract.md
@@ -5,32 +5,35 @@ state: planned
 
 # Headless contract
 
-Decisions already settled in the ADRs apply (0003 unknown names always error, 0004 structured result, 0005 dependency-free estimator, 0006 node imports core). No new runtime dependency: node's `http`, `util.parseArgs`, `fs` only.
+Decisions already settled in the ADRs apply (0003 unknown names always error, 0004 structured result, 0005 dependency-free estimator, 0006 node imports core). No new runtime dependency: node's `http`, `util.parseArgs`, `fs` only. Module detail: `modules/template-resolver.md` (core), `modules/api.md`, `modules/cli.md`.
 
 ## Core
 
 ```ts
 interface Limits { maxIterations: number; maxOutputChars: number; maxDepth: number }
-// defaults: maxIterations 10000 (total FOR iterations across the render), maxOutputChars 1000000, maxDepth 32 (nesting of blocks)
+// DEFAULT_LIMITS: maxIterations 10000 (total FOR iterations across the render), maxOutputChars 1000000, maxDepth 32 (nesting of blocks)
 interface RenderOptions { strictMode?: boolean; limits?: Partial<Limits>; tokenEstimator?: (text: string) => number }
-interface Diagnostic { severity: "error" | "warning"; code: string; message: string; line: number; column: number; suggestion?: string }
-interface RenderResult { ok: boolean; output: string; messages: Message[]; stats: { chars: number; estTokens: number; sectionsOmitted: number; iterations: number }; diagnostics: Diagnostic[] }
+interface Diagnostic { severity: "error" | "warning"; code: DiagnosticCode | "invalid-input" | "analysis-warning"; message: string; line: number; column: number; suggestion?: string }
+interface RenderResult { ok: boolean; output: string; messages: unknown[]; stats: { chars: number; estTokens: number; sectionsOmitted: number; iterations: number }; diagnostics: Diagnostic[] }
 render(template: string, data: Record<string, unknown>, options?: RenderOptions): RenderResult   // never throws for template or data problems
-validate(template: string): { ok: boolean; diagnostics: Diagnostic[] }
-analyze(template): existing result plus `required` on each variable (= !optional) and `blocks: Record<string, number>` (count per block kind)
+validate(template: string, options?: { limits?: Partial<Limits> }): { ok: boolean; diagnostics: Diagnostic[] }
+analyze(template, options?: { limits? }): existing result plus `required` on each variable (= !optional) and `blocks: Partial<Record<"IF" | "CASE" | "FOR" | "LIST" | "TABLE", number>>` (count per block kind present)
 spec(): { version: string; blocks: {name, closes?, args, description}[]; filters: {name, params, description}[]; operators: string[]; limits: Limits; syntax: {variable, comment} }
 ```
 
-- `messages` is an empty array until MESSAGE blocks exist; `sectionsOmitted` is 0 until SECTION exists.
-- Diagnostic codes: `syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`, `invalid-input`, `analysis-warning`. Every diagnostic has the 1-based line and column of the offending template node or tag; runtime errors (missing variable, bad filter parameters, math, type) carry the location of the node that failed, never a placeholder 1:1.
-- On failure `ok` is false, `output` is `""`, and the first diagnostic is the error that stopped rendering.
+- `messages` is an empty array until MESSAGE blocks exist; `sectionsOmitted` is 0 until SECTION exists. `stats.iterations` is reported on failure too.
+- Diagnostic codes: `syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth` (carried by `TemplateError` as `DiagnosticCode`), plus `invalid-input` (render, data not an object) and `analysis-warning` (validate). Every diagnostic has the 1-based line and column of the offending template node or tag; runtime errors (missing variable, bad filter parameters, math, type) carry the location of the node that failed, never a placeholder 1:1.
+- On failure `ok` is false, `output` is `""`, and the only diagnostic is the error that stopped rendering.
+- `validate` maps `analyze`'s diagnostics: `unknown-filter` stays an error; every other analysis finding (an unrecognized condition) becomes a warning with code `analysis-warning`. A template that does not parse gives its error. `ok` is false only when an error is present.
+- `analyze` still throws a `TemplateError` for a template that does not parse; its callers (validate, the API, the CLI, the node) turn that into a diagnostic or an error.
+- `spec().version` is the template language version, `"1.0"`, not the package version.
 - Estimator default: `Math.ceil(chars / 4)`, documented as an estimate with roughly +/-30 percent error for English prose.
-- `resolveTemplate` (throwing string API) keeps its behavior and is implemented over the same engine.
-- The n8n node calls `render` and writes `result.output` to the configured output field; a failed render becomes a NodeOperationError (or continue-on-fail item) with the first diagnostic's message and location.
+- `resolveTemplate` (throwing string API) keeps its behavior, accepts `limits`, and is implemented over the same engine.
+- The n8n node detects variables with `analyze`; in strict mode an unmapped required variable is a NodeOperationError naming the unmapped and detected variables and the first render error. Otherwise it calls `render` and writes `result.output` to the configured output field; a failed render becomes a NodeOperationError (or continue-on-fail item) with the first diagnostic's message and location.
 
 ## HTTP API (`api/`)
 
-`createServer(options?: { limits?, tokenEstimator?, maxBodyBytes? }): http.Server` and `listen` helper; default host 127.0.0.1, `maxBodyBytes` 1 MiB.
+`createServer(options?: { limits?, tokenEstimator?, maxBodyBytes? }): http.Server` and `listen(server, port = 0, host = "127.0.0.1")`; default host 127.0.0.1, `maxBodyBytes` 1 MiB.
 
 | Route | Request body | Response (200) |
 |---|---|---|
@@ -40,22 +43,22 @@ spec(): { version: string; blocks: {name, closes?, args, description}[]; filters
 | GET /v1/spec | | spec() |
 | GET /v1/openapi.json | | the committed `api/openapi.json` |
 
-- Template problems are results, not HTTP errors: 200 with `ok: false` and diagnostics.
-- Malformed requests: 400 `{error: {code: "invalid-request", message}}` (bad JSON, missing or non-string `template`, non-object `data`, unknown option types); 404 `not-found`; 405 `method-not-allowed` with `Allow`; 413 `payload-too-large`; 415 `unsupported-media-type` when POST content-type is not JSON. All responses are JSON.
-- Server option limits are the ceiling: a request may only lower a limit, never raise it above the server's.
+- Template problems are results, not HTTP errors: 200 with `ok: false` and diagnostics. An unparseable template on `/v1/analyze` gives 200 with empty variables, filters and blocks and the error in `diagnostics`.
+- Malformed requests: 400 `{error: {code: "invalid-request", message}}` (bad JSON, non-object body, missing or non-string `template`, non-object `data`, `options` or `options.limits`, non-boolean `strictMode`, a limit that is not a non-negative integer); 404 `not-found`; 405 `method-not-allowed` with `Allow`; 413 `payload-too-large`; 415 `unsupported-media-type` when POST content-type is not JSON; 500 `internal-error` for an unexpected exception. All responses are JSON.
+- Server option limits are the ceiling: a request may only lower a limit, never raise it above the server's (the effective value is the minimum). `validate` and `analyze` use the server's `maxDepth`.
 - `api/openapi.json` is committed, OpenAPI 3.1, describes every route, request and response schema; a test proves its paths and methods equal the router's table.
 
 ## CLI (`cli/`, bin `template-resolver`)
 
 `template-resolver <render|validate|analyze|spec|serve> [options]`
 
-- `render <template-file|-> [--data <file|->] [--strict | --no-strict] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]`: prints output to stdout; diagnostics as `file:line:col: severity code: message` on stderr; exit 0 on ok, 1 on template errors, 2 on usage or I/O errors. With `--json` prints the full RenderResult to stdout (exit codes unchanged).
-- `validate <template-file|->`, `analyze <template-file|->`: print JSON; `validate` exits 1 when not ok.
-- `spec`: prints the spec JSON. `serve [--port n] [--host h]`: starts the API (default 127.0.0.1:3000).
-- `-` reads stdin; only one input may be stdin. `--help` and no arguments print usage (exit 0 / 2).
+- `render <template-file|-> [--data <file|->] [--strict | --no-strict] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]`: prints output to stdout; diagnostics as `file:line:col: severity code: message` on stderr; exit 0 on ok, 1 on template errors, 2 on usage or I/O errors. With `--json` prints the full RenderResult to stdout (exit codes unchanged). Strict by default; limit flags set the render's limits directly.
+- `validate <template-file|->`, `analyze <template-file|->`: print JSON; `validate` exits 1 when not ok; `analyze` of an unparseable template prints the diagnostic to stderr and exits 1.
+- `spec`: prints the spec JSON. `serve [--port n] [--host h]`: starts the API with default server options (default 127.0.0.1:3000), prints `listening on http://host:port`, and on SIGINT or SIGTERM closes and exits 0; a port that cannot be bound exits 2.
+- `-` reads stdin; only one input may be stdin. `--help` prints usage to stdout (exit 0); no arguments print usage to stderr (exit 2).
 
-## Engine surface added before render (card 1)
+## Engine surface under render
 
-- `TemplateError` (and its subclasses) gain a string `code` from the diagnostic codes above; `line` and `column` are always the failing node's position (1-based). Plain `Error`s thrown by filters or math are converted to `TemplateError` at the node that evaluates them (unknown filter: `unknown-filter`; bad parameters: `type-error`).
+- `TemplateError` (and its subclasses) carry a string `code` from the diagnostic codes above; `line` and `column` are always the failing node's position (1-based). Plain `Error`s thrown by filters or math are converted to `TemplateError` at the node that evaluates them (unknown filter: `unknown-filter`; bad parameters: `type-error`).
 - `resolveTemplate(template, variables, { strictMode?, limits? })` accepts `limits`; exceeding one throws a `TemplateError` with code `limit-iterations`, `limit-output` or `limit-depth` located at the node that crossed it.
-- `DEFAULT_LIMITS` is exported from core.
+- `DEFAULT_LIMITS` and `withDefaultLimits` are exported from core.
diff --git a/docs/living/architecture/modules/api.md b/docs/living/architecture/modules/api.md
index d97adb4..780a7b0 100644
--- a/docs/living/architecture/modules/api.md
+++ b/docs/living/architecture/modules/api.md
@@ -7,4 +7,54 @@ state: planned
 
 ## Purpose
 
-Stateless HTTP surface over core, planned in the headless cycle.
+A stateless JSON-over-HTTP surface over core, so a program in any language can render, validate and analyze templates without n8n. It adds transport only: every answer about a template comes from core.
+
+## Responsibility
+
+- `api/routes.ts`: the route table and one handler per route; checks the request body shape and turns it into a core call; caps request limits at the server's.
+- `api/server.ts`: `createServer`, which finds the route, enforces the content type and the body size, parses JSON and writes every response, success or error, as JSON.
+- `api/index.ts`: re-exports `createServer`, `ServerOptions` and `routes`, and adds `listen`.
+- `api/openapi.json`: the committed OpenAPI 3.1 document describing every route, request and response.
+
+## Interface
+
+```ts
+createServer(options?: { limits?: Partial<Limits>; tokenEstimator?: (text: string) => number; maxBodyBytes?: number }): http.Server
+listen(server: http.Server, port = 0, host = "127.0.0.1"): Promise<{ port: number; host: string }>
+```
+
+Limits left out take core's defaults (`maxIterations` 10000, `maxOutputChars` 1000000, `maxDepth` 32); `maxBodyBytes` defaults to 1 MiB (1048576). `listen` binds loopback unless told otherwise.
+
+| Route | Request body | Response (200) |
+|---|---|---|
+| POST /v1/render | `{template, data?, options?: {strictMode?, limits?}}` | core `render` result |
+| POST /v1/validate | `{template}` | core `validate` result, `{ok, diagnostics}` |
+| POST /v1/analyze | `{template}` | core `analyze` result |
+| GET /v1/spec | | core `spec()` |
+| GET /v1/openapi.json | | the bytes of `api/openapi.json` |
+
+- `data` defaults to `{}`, `options.strictMode` to core's default (strict).
+- `options.limits` may only lower the server's limits: each given value must be a non-negative integer and the effective limit is `min(requested, server)`.
+- `validate` and `analyze` run with the server's `maxDepth`. An `analyze` of a template that does not parse answers 200 with empty `variables`, `filters` and `blocks` and the parse error in `diagnostics`.
+- The query string is ignored when matching a route. The OpenAPI document is served in the committed file's exact serialization.
+
+## Failure handling
+
+Template problems are results, never HTTP errors: 200 with `ok: false` and diagnostics. Request problems answer `{error: {code, message}}`:
+
+| Status | Code | When |
+|---|---|---|
+| 400 | `invalid-request` | body not JSON or not an object; `template` not a string; `data`, `options` or `options.limits` not an object; `options.strictMode` not a boolean; a limit not a non-negative integer |
+| 404 | `not-found` | no route has the path |
+| 405 | `method-not-allowed` | the path exists for another method; the `Allow` header lists the methods |
+| 413 | `payload-too-large` | the declared or streamed body exceeds `maxBodyBytes` |
+| 415 | `unsupported-media-type` | a POST whose `Content-Type` is not `application/json` |
+| 500 | `internal-error` | any unexpected exception; the message is generic |
+
+When the server refuses a request before the body has arrived (413, 415, 404 on a POST), it reads and discards the rest of the body before replying, so the client sees the status instead of a reset connection.
+
+## Dependencies
+
+- core (`render`, `validate`, `analyze`, `spec`, `withDefaultLimits`, `TemplateError`), imported from `core/src`.
+- node's `http` only; no runtime dependency.
+- Consumed by the cli module's `serve`.
diff --git a/docs/living/architecture/modules/cli.md b/docs/living/architecture/modules/cli.md
index f570a8a..4ac1ce1 100644
--- a/docs/living/architecture/modules/cli.md
+++ b/docs/living/architecture/modules/cli.md
@@ -7,4 +7,48 @@ state: planned
 
 ## Purpose
 
-Terminal surface over core, planned in the headless cycle.
+A terminal surface over core, the bin `template-resolver`, for rendering, checking and inspecting templates from files or pipes, and for starting the HTTP API. Like the api module it adds transport only.
+
+## Responsibility
+
+- `cli/main.ts`: `main(argv, io)` parses the arguments with `util.parseArgs` (strict), reads inputs, calls core and resolves the exit code. It never exits the process and does all I/O through the `CliIo` it is given, so tests drive it in process.
+- `cli/index.ts`: the bin entry (`#!/usr/bin/env node`); wires `main` to the real stdin, stdout and stderr, turns SIGINT and SIGTERM into the abort signal, and sets `process.exitCode`.
+
+## Interface
+
+```ts
+interface CliIo { readStdin(): Promise<string>; stdout(text: string): void; stderr(text: string): void; signal?: AbortSignal }
+main(argv: string[], io: CliIo): Promise<number>
+```
+
+Built to `dist/cli/index.js`, which `package.json` names as the bin `template-resolver`.
+
+| Command | Does |
+|---|---|
+| `render <template-file\|-> [--data <file\|->] [--strict \| --no-strict] [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]` | renders; output to stdout, diagnostics to stderr as `file:line:column: severity code: message`; `--json` prints the whole render result to stdout instead |
+| `validate <template-file\|->` | prints core `validate`'s `{ok, diagnostics}` as JSON |
+| `analyze <template-file\|->` | prints core `analyze` as JSON; a template that does not parse prints its diagnostic to stderr |
+| `spec` | prints core `spec()` as JSON |
+| `serve [--port n] [--host h]` | starts the api module's server (default `127.0.0.1:3000`, default limits and body size), prints `listening on http://host:port`, and runs until the abort signal |
+
+- Strict mode is on unless `--no-strict`; `--strict` with `--no-strict` is a usage error. `--data` defaults to `{}` and must be a JSON object.
+- Limit flags set the render's limits directly (they can raise as well as lower them); limits not given take core's defaults. `validate` and `analyze` use the defaults.
+- `-` reads stdin. Only one input may be stdin: `render - --data -` is a usage error, detected before anything is read. Diagnostics name stdin `<stdin>`.
+- JSON output is pretty-printed with two spaces and a trailing newline.
+- `--help` anywhere, or `-h` as the first argument, prints the usage to stdout.
+
+## Failure handling
+
+| Exit code | When |
+|---|---|
+| 0 | success; `validate` with warnings only; `--help`; `serve` after a clean shutdown |
+| 1 | template errors: render not ok, validate not ok, analyze cannot parse |
+| 2 | usage errors (no or unknown command, unknown option, wrong number of inputs, both inputs on stdin, a flag value that is not a non-negative integer, `--strict` with `--no-strict`), printed with the usage to stderr; I/O errors (unreadable file, invalid or non-object JSON data, a port that cannot be bound), printed as one line to stderr |
+
+Every message on stderr starts with `template-resolver: `. An unexpected exception is not caught by `main` and surfaces as a crash.
+
+## Dependencies
+
+- core (`render`, `validate`, `analyze`, `spec`, `TemplateError`), imported from `core/src`.
+- the api module (`createServer`, `listen`) for `serve`.
+- node's `fs`, `util.parseArgs` and `process` only; no runtime dependency.
diff --git a/docs/living/architecture/modules/template-resolver.md b/docs/living/architecture/modules/template-resolver.md
index 3577ece..cc5ac7c 100644
--- a/docs/living/architecture/modules/template-resolver.md
+++ b/docs/living/architecture/modules/template-resolver.md
@@ -70,6 +70,19 @@ The `value` description says it supports n8n expressions; the code only reads th
 
 `extractAllVariables` collects roots from `${{name...}}`, from `{{IF|CASE|FOR name}}` (case-insensitive tag word) and from `{{name ?` patterns, drops names starting with `@`, and returns them unique and sorted [src: nodes/TemplateResolver/utils.ts:16-44]. It does not exclude the `AS` name of a `FOR` tag, so `${{item}}` inside a loop adds `item` to the detected set [src: nodes/TemplateResolver/utils.ts:13-45]. In the node, an unmapped detected name therefore counts as missing, and in strict mode triggers the error in step 5 before resolution [src: nodes/TemplateResolver/TemplateResolver.node.ts:216-229] [answer: Q2] [open: Q10]
 
+## Structured result, diagnostics and limits
+
+Added after recovery, in the current tree (`core/src/render.ts`, `spec.ts`, `types.ts`, `errors.ts`, `estimate.ts`); the full contract is `docs/living/architecture/headless-contract.md`.
+
+- `render(template, data, { strictMode?, limits?, tokenEstimator? })` returns `{ ok, output, messages, stats: { chars, estTokens, sectionsOmitted, iterations }, diagnostics }` and never throws for template or data problems: on failure `ok` is false, `output` is `""` and the one diagnostic is the error that stopped rendering. `messages` is always `[]` and `sectionsOmitted` always 0 for now. `estTokens` defaults to `estimateTokens`, `Math.ceil(chars / 4)`.
+- `validate(template, { limits? })` returns `{ ok, diagnostics }` without data: parse errors and unknown filters are errors; conditions `analyze` cannot read become warnings with code `analysis-warning`; `ok` is false only when an error is present.
+- A diagnostic is `{ severity, code, message, line, column, suggestion? }`. Every `TemplateError` carries a `code` (`syntax-error`, `type-error`, `missing-variable`, `unknown-filter`, `limit-iterations`, `limit-output`, `limit-depth`) and the 1-based line and column of the node that failed: runtime errors are relocated to the evaluating node, and plain `Error`s from filters or math become `type-error` there. `render` adds `invalid-input` for data that is not an object.
+- `Limits { maxIterations, maxOutputChars, maxDepth }` with `DEFAULT_LIMITS` 10000 (total FOR iterations across the render), 1000000 (output characters) and 32 (block nesting, enforced by the parser, so also by `analyze` and `validate`); `withDefaultLimits` fills omitted ones. `resolveTemplate` accepts `limits` too and keeps throwing.
+- `spec()` describes the language: `version` (the language version, `"1.0"`), `blocks`, `filters`, `operators`, the default `limits` and `syntax`.
+- `analyze` additionally reports `required` per variable (always `!optional`) and `blocks`, a count per block kind (`IF`, `CASE`, `FOR`, `LIST`, `TABLE`); it throws on a template that does not parse.
+- The n8n node now detects variables with `analyze`, fails early in strict mode on unmapped required variables, renders with `render` and turns a failed result into a `NodeOperationError` carrying the first diagnostic's message, line and column.
+- Consumers besides the node: the api module (`api/`, HTTP) and the cli module (`cli/`, bin `template-resolver`) call `render`, `validate`, `analyze` and `spec` and add only transport; see `api.md` and `cli.md`.
+
 ## Behavior
 
 ### Tokenizing
````

## Gate run
The card's gate command as it last ran, before this packet was built. Output only: run the command yourself to check it.
- Command: `node --test --test-reporter=tap tools/tests/headless-docs.test.mjs`
- Exit status: 0
- Tests: 6 passed, 0 failed
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
