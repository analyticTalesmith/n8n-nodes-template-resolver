# Template Resolver for n8n

A template engine node for n8n that builds dynamic text from variables. Designed for constructing LLM prompts that adapt based on workflow data.

The same engine also runs without n8n: a command line (`template-resolver`) and a small HTTP API both return a [structured render result](#structured-render-result) with located [diagnostics](#diagnostics).

## What It Does

Takes a template with placeholders and conditions, combines it with variable values from your workflow, and outputs the resolved text.

```
Template + Variables → Resolved Text
```

**Example:**

Template:

```
Hello ${{name}}!
{{IF is_premium}}You have premium access.{{END_IF}}
```

Variables:

- `name` = "Alice"
- `is_premium` = true

Output:

```
Hello Alice!
You have premium access.
```

---

## Installation (Docker)

```bash
# 1. Build the package
npm run build && npm pack

# 2. Copy to n8n container
docker cp n8n-nodes-template-resolver-*.tgz n8n:/home/node/.n8n/custom/

# 3. Install inside container
docker exec -it n8n sh -c "cd /home/node/.n8n/custom && npm install n8n-nodes-template-resolver-*.tgz"

# 4. Restart n8n
docker restart n8n
```

---

## Syntax Reference

### Variables: `${{name}}`

Insert values into your template.

```
Customer: ${{customer_name}}
Email: ${{customer_email}}
```

**Nested properties** use dot notation:

```
City: ${{order.shipping.address.city}}
```

**Array items** use numeric indices:

```
First tag: ${{tags.0}}
Second tag: ${{tags.1}}
```

**Missing variables** are an error in strict mode (the default) unless the placeholder has a `??` default; with strict mode off they become empty strings.

---

### Default Values: `${{name ?? "fallback"}}`

Provide a fallback when a variable is empty or missing:

```
Author: ${{author ?? "Anonymous"}}
```

---

### Filters: `${{name | filter}}`

Transform values before output.

| Filter      | Example                  | Description                        |
| ----------- | ------------------------ | ---------------------------------- |
| `trim`      | `${{text \| trim}}`      | Remove leading/trailing whitespace |
| `head=N`    | `${{text \| head=100}}`  | First N characters                 |
| `tail=N`    | `${{text \| tail=50}}`   | Last N characters                  |
| `escape_md` | `${{text \| escape_md}}` | Escape markdown special characters |

**Chain multiple filters:**

```
${{description | trim | head=200 | escape_md}}
```

---

### Conditionals: `{{IF}}` / `{{ELSE}}` / `{{ELSEIF}}`

Show or hide sections based on conditions.

**Simple condition:**

```
{{IF has_context}}
# Context
${{context}}
{{END_IF}}
```

**If/Else:**

```
{{IF is_authenticated}}
Welcome back, ${{username}}!
{{ELSE}}
Please log in.
{{END_IF}}
```

**Multiple branches:**

```
{{IF priority == "high"}}
🔴 Urgent - respond immediately
{{ELSEIF priority == "medium"}}
🟡 Standard priority
{{ELSE}}
🟢 Low priority
{{END_IF}}
```

**Nested conditions:**

```
{{IF needs_response}}
{{IF is_urgent}}
Respond within 1 hour.
{{ELSE}}
Respond within 24 hours.
{{END_IF}}
{{END_IF}}
```

---

### Case/When: `{{CASE}}`

Clean syntax for matching a variable against multiple values:

```
{{CASE department}}
{{WHEN "sales"}}
You are a sales specialist.
{{END_WHEN}}
{{WHEN "support"}}
You are a support agent.
{{END_WHEN}}
{{WHEN "billing"}}
You are a billing expert.
{{END_WHEN}}
{{DEFAULT}}
You are a general assistant.
{{END_DEFAULT}}
{{END_CASE}}
```

- First matching `{{WHEN}}` wins
- `{{DEFAULT}}` handles unmatched values (optional)
- Values must be quoted: `{{WHEN "value"}}`

---

### Loops: `{{FOR}}`

Iterate over arrays:

```
{{FOR items AS item}}
- ${{item}}
{{END_FOR}}
```

**With object properties:**

```
{{FOR users AS user}}
- ${{user.name}} (${{user.email}})
{{END_FOR}}
```

**Loop variables:**

| Variable    | Description                   |
| ----------- | ----------------------------- |
| `@index0`   | Zero-based index (0, 1, 2...) |
| `@index1`   | One-based index (1, 2, 3...)  |
| `@first`    | True on first iteration       |
| `@last`     | True on last iteration        |
| `@notFirst` | True except first iteration   |
| `@notLast`  | True except last iteration    |

**Example - comma-separated list:**

```
Tags: {{FOR tags AS tag}}${{tag}}{{IF @notLast}}, {{END_IF}}{{END_FOR}}
```

Output: `Tags: api, automation, workflow`

---

### Lists: `{{LIST}}`

Auto-numbered lists:

```
{{LIST}}
{{LIST_ITEM}}First item{{END_LIST_ITEM}}
{{LIST_ITEM}}Second item{{END_LIST_ITEM}}
{{LIST_ITEM}}Third item{{END_LIST_ITEM}}
{{END_LIST}}
```

Output:

```
1. First item
2. Second item
3. Third item
```

**Conditional items:**

```
{{LIST}}
{{LIST_ITEM show_intro}}Introduction{{END_LIST_ITEM}}
{{LIST_ITEM}}Main content{{END_LIST_ITEM}}
{{LIST_ITEM show_summary}}Summary{{END_LIST_ITEM}}
{{END_LIST}}
```

Skipped items don't create gaps in numbering.

**Fallback text:**

```
{{LIST_ITEM condition | fallback="Default text"}}Content{{END_LIST_ITEM}}
```

---

### Tables: `{{TABLE}}`

Generate markdown tables:

```
{{TABLE}}
{{HEADER}}Name|Age|Role{{END_HEADER}}
{{ROW}}Alice|30|Engineer{{END_ROW}}
{{ROW}}Bob|25|Designer{{END_ROW}}
{{END_TABLE}}
```

Output:

```
| Name | Age | Role |
|:-----|:----|:-----|
| Alice | 30 | Engineer |
| Bob | 25 | Designer |
```

**With variables:**

```
{{TABLE}}
{{HEADER}}Product|Price|Stock{{END_HEADER}}
{{FOR products AS p}}
{{ROW}}${{p.name}}|${{p.price}}|${{p.quantity}}{{END_ROW}}
{{END_FOR}}
{{END_TABLE}}
```

**Column alignment:**

```
{{TABLE align="left|center|right"}}
{{HEADER}}Left|Center|Right{{END_HEADER}}
{{ROW}}A|B|C{{END_ROW}}
{{END_TABLE}}
```

---

### Comments: `{{# comment #}}`

Comments are removed from output:

```
{{# This note won't appear in the final text #}}
Hello ${{name}}!

{{#
Multi-line comments
are also supported
#}}
```

---

### Math: `${{a + b}}`

Basic arithmetic in variable expressions:

```
Total: ${{price * quantity}}
Average: ${{sum / count}}
Next: ${{@index0 + 1}}
```

Operators: `+`, `-`, `*`, `/`, `%`

Use parentheses for order of operations:

```
${{(base_price + tax) * quantity}}
```

---

## Operators

### Comparison

| Operator     | Example                   | Description      |
| ------------ | ------------------------- | ---------------- |
| `==`         | `status == "active"`      | Equal            |
| `!=`         | `status != "deleted"`     | Not equal        |
| `>`          | `age > 18`                | Greater than     |
| `<`          | `count < 10`              | Less than        |
| `>=`         | `score >= 90`             | Greater or equal |
| `<=`         | `price <= 100`            | Less or equal    |
| `contains`   | `email contains "@gmail"` | Substring match  |
| `startsWith` | `url startsWith "https"`  | Prefix match     |
| `endsWith`   | `file endsWith ".pdf"`    | Suffix match     |

### Type Checks

| Operator     | Example               | Description         |
| ------------ | --------------------- | ------------------- |
| `isEmpty`    | `description isEmpty` | Empty/missing value |
| `isNotEmpty` | `title isNotEmpty`    | Has a value         |
| `isArray`    | `items isArray`       | Value is an array   |
| `isNumber`   | `age isNumber`        | Value is numeric    |
| `isObject`   | `config isObject`     | Value is an object  |
| `isBoolean`  | `flag isBoolean`      | Value is boolean    |

### Logic

| Operator | Example          | Description        |
| -------- | ---------------- | ------------------ |
| `AND`    | `a AND b`        | Both must be true  |
| `OR`     | `a OR b`         | Either can be true |
| `NOT()`  | `NOT(expired)`   | Negation           |
| `()`     | `(a AND b) OR c` | Grouping           |

---

## Truthiness

What counts as **true**:

- Non-empty strings
- Non-zero numbers
- `true`
- Non-empty arrays
- Non-empty objects

What counts as **false**:

- Empty string `""`
- `0`
- `false`
- `null` / `undefined`
- Empty array `[]`
- Empty object `{}`
- Strings: `"false"`, `"0"`, `"no"`

---

## Node Configuration

### Inputs

| Field                       | Description                                 |
| --------------------------- | ------------------------------------------- |
| **Template**                | Your template text with syntax markers      |
| **Variable Mappings**       | Connect template variables to workflow data |
| **Strict Mode**             | Error on missing variables (default: on)    |
| **Show Detected Variables** | Include metadata in output                  |
| **Output Field Name**       | Name for the resolved text field            |

### Variable Mappings

Map each template variable to a workflow value:

| Variable Name   | Value                                       |
| --------------- | ------------------------------------------- |
| `customer_name` | `{{ $('Webhook').item.json.name }}`         |
| `order_items`   | `{{ $('Get Order').item.json.items }}`      |
| `is_premium`    | `{{ $('Check Status').item.json.premium }}` |

### Output

```json
{
  "resolved_prompt": "The fully processed template text...",
  "_template_metadata": {
    "detected_variables": ["customer_name", "is_premium", "order_items"],
    "mapped_variables": ["customer_name", "is_premium"],
    "missing_variables": ["order_items"],
    "variable_count": 3
  }
}
```

Metadata only included when "Show Detected Variables" is enabled. `detected_variables` is sorted; a variable read only with a `??` default never counts as required.

When rendering fails, the node raises an error carrying the first diagnostic's message and its line and column (with "Continue On Fail" the item becomes `{ error, error_type }` instead).

---

## Automatic Type Handling

The resolver automatically handles common data formats:

**JSON strings are parsed:**

```
# Variable: user = '{"name": "Alice", "role": "admin"}'
Name: ${{user.name}}  →  Name: Alice
```

**Comma-separated strings become arrays:**

```
# Variable: tags = "api,workflow,automation"
{{FOR tags AS tag}}#${{tag}} {{END_FOR}}
→ #api #workflow #automation
```

**Malformed JSON is tolerated:**

```
# Trailing commas are fixed automatically
{"items": ["a", "b", "c",],}  →  parsed correctly
```

---

## Example: LLM Prompt Template

```
# Role
{{CASE role}}
{{WHEN "support"}}
You are a customer support agent for ${{company}}.
{{END_WHEN}}
{{WHEN "sales"}}
You are a sales representative for ${{company}}.
{{END_WHEN}}
{{DEFAULT}}
You are a helpful assistant.
{{END_DEFAULT}}
{{END_CASE}}

# Customer
- Name: ${{customer.name}}
- Plan: ${{customer.plan}}
{{IF customer.is_vip}}
- ⭐ VIP Customer - prioritize their request
{{END_IF}}

{{IF conversation_history}}
# Previous Messages
{{FOR conversation_history AS msg}}
[${{msg.role}}]: ${{msg.content}}
{{END_FOR}}
{{END_IF}}

# Current Request
${{current_message}}

# Instructions
{{LIST}}
{{LIST_ITEM}}Respond professionally and helpfully{{END_LIST_ITEM}}
{{LIST_ITEM customer.is_vip}}Offer priority support options{{END_LIST_ITEM}}
{{LIST_ITEM needs_escalation}}Explain the escalation process{{END_LIST_ITEM}}
{{END_LIST}}
```

---

## Structured render result

Every render, whether through the command line (`--json`), the HTTP API (`POST /v1/render`) or core's `render(template, data, options)`, returns the same object. Template and data problems never throw; they come back in the result.

```json
{
  "ok": true,
  "output": "Hello Alice!\nYou have premium access.\n",
  "messages": [],
  "stats": {
    "chars": 38,
    "estTokens": 10,
    "sectionsOmitted": 0,
    "iterations": 0
  },
  "diagnostics": []
}
```

| Field                   | Meaning                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `ok`                    | `false` when an error stopped rendering                                                  |
| `output`                | The rendered text; `""` when `ok` is `false`                                             |
| `messages`              | Always `[]` for now (reserved for message blocks)                                        |
| `stats.chars`           | Length of `output`                                                                       |
| `stats.estTokens`       | Token estimate, `ceil(chars / 4)`: roughly +/-30 percent for English prose               |
| `stats.sectionsOmitted` | Always `0` for now (reserved for section blocks)                                         |
| `stats.iterations`      | FOR iterations run in total, also reported when the render failed                        |
| `diagnostics`           | On failure, one diagnostic: the error that stopped rendering                             |

`validate` returns `{ ok, diagnostics }`, where `ok` is `false` only when some diagnostic is an error; warnings leave it `true`.

### Diagnostics

Render and validate results (`render`, `validate`, `POST /v1/render`, `POST /v1/validate`) carry diagnostics of the shape `{ severity, code, message, line, column, suggestion? }`; `analyze` results use a smaller shape, described [below](#analysis-diagnostics). `severity` is `"error"` or `"warning"`; `line` and `column` are 1-based and point at the template tag or placeholder that failed, including runtime errors such as a missing variable or a bad filter parameter. `suggestion` is present when the engine has a hint.

| Code               | Severity | When                                                                                                   |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| `syntax-error`     | error    | The template does not parse: unknown tag, unclosed block, bad `FOR` syntax, stray `END_*`             |
| `type-error`       | error    | An operation fails on its values: non-numeric comparison or math, bad filter parameters, non-array `FOR` in strict mode |
| `missing-variable` | error    | Strict mode and a placeholder reads a variable that is not in the data and has no `??` default         |
| `unknown-filter`   | error    | A filter other than `head`, `tail`, `trim`, `escape_md`                                                 |
| `limit-iterations` | error    | FOR loops ran more than `maxIterations` iterations in total                                            |
| `limit-output`     | error    | The output grew past `maxOutputChars`                                                                  |
| `limit-depth`      | error    | Blocks nest deeper than `maxDepth`                                                                     |
| `invalid-input`    | error    | Core `render` was given data that is not an object (the CLI and the API reject such data before rendering) |
| `analysis-warning` | warning  | `validate` only: a condition the engine cannot read, such as `{{IF status is active}}`                 |

#### Analysis diagnostics

`analyze` (`template-resolver analyze` and `POST /v1/analyze`) reports diagnostics as `{ code, message, line, column }`, with no `severity` and no `suggestion`. Its codes:

| Code                     | When                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `unknown-filter`         | A filter other than `head`, `tail`, `trim`, `escape_md`                                      |
| `unrecognized-condition` | A condition the engine cannot read, such as `{{IF status is active}}` (`validate` reports it as `analysis-warning`) |
| `syntax-error`, `limit-depth` | `POST /v1/analyze` only: the template does not parse; the result has empty `variables`, `filters` and `blocks` and this one diagnostic |

For a template that does not parse, `template-resolver analyze` prints no JSON: it prints the error to stderr in the format below and exits 1.

The command line prints diagnostics to stderr as `file:line:column: severity code: message`:

```console
$ template-resolver render greeting.tpl
greeting.tpl:1:7: error missing-variable: Variable 'name' not found
```

### Limits

Limits bound the work of one render. Each can be lowered per render; anything left out takes its default.

| Limit            | Default   | Bounds                                                  | Diagnostic         |
| ---------------- | --------- | ------------------------------------------------------- | ------------------ |
| `maxIterations`  | 10000     | Total FOR iterations across the whole render            | `limit-iterations` |
| `maxOutputChars` | 1000000   | Length of the output                                    | `limit-output`     |
| `maxDepth`       | 32        | Nesting of blocks (also applied by validate and analyze) | `limit-depth`      |

The command line sets them with `--max-iterations`, `--max-output-chars` and `--max-depth`; the HTTP API with `options.limits` (a request can only lower the server's limits). `template-resolver spec` and `GET /v1/spec` report the defaults.

---

## Command line: `template-resolver`

```
template-resolver <command> [options]
```

| Command                                    | Does                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `template-resolver render <file\|->`       | Renders a template and prints the output to stdout                       |
| `template-resolver validate <file\|->`     | Checks a template without data; prints `{ok, diagnostics}` as JSON       |
| `template-resolver analyze <file\|->`      | Prints the variables, filters and blocks a template uses, as JSON        |
| `template-resolver spec`                   | Prints the template language spec as JSON (blocks, filters, operators, default limits, syntax) |
| `template-resolver serve`                  | Starts the HTTP API                                                      |

Exit codes for every command:

| Exit code | Meaning                                                                                   |
| --------- | ----------------------------------------------------------------------------------------- |
| 0         | Success (for `validate`, warnings only still exit 0)                                      |
| 1         | Template errors: a failed render, a `validate` with an error, an `analyze` that cannot parse |
| 2         | Usage or I/O errors: unknown command or option, unreadable file, data that is not a JSON object, a port that cannot be bound |

`--help` prints the usage and exits 0; no command at all prints the usage to stderr and exits 2.

**`render` options**

| Option                                 | Meaning                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `--data <file\|->`                     | JSON object with the variables (default `{}`)                            |
| `--strict` / `--no-strict`             | Strict mode is on by default; `--no-strict` renders missing variables as `""`; the two cannot be combined |
| `--max-iterations n`                   | Lower or raise `maxIterations`                                           |
| `--max-output-chars n`                 | Lower or raise `maxOutputChars`                                          |
| `--max-depth n`                        | Lower or raise `maxDepth`                                                |
| `--json`                               | Print the full structured render result instead of the text (exit codes unchanged) |

Without `--json`, the output goes to stdout and diagnostics to stderr.

**stdin:** `-` in place of a file reads stdin, for the template or for `--data`. Only one input may come from stdin; `render - --data -` is a usage error (exit 2).

**`serve` options:** `--port n` (default 3000) and `--host h` (default `127.0.0.1`, loopback only). It prints `listening on http://host:port` and runs with the default limits and the 1 MiB body limit until interrupted (Ctrl+C), then exits 0.

### Examples

With `greeting.tpl` holding the template from [What It Does](#what-it-does) and `data.json` holding `{"name": "Alice", "is_premium": true}`:

```console
$ template-resolver render greeting.tpl --data data.json
Hello Alice!
You have premium access.
$ echo $?
0
```

Data from stdin:

```console
$ echo '{"name": "Bob"}' | template-resolver render greeting.tpl --data -
Hello Bob!

```

A template error exits 1:

```console
$ template-resolver render greeting.tpl
greeting.tpl:1:7: error missing-variable: Variable 'name' not found
$ echo $?
1
$ template-resolver render greeting.tpl --no-strict
Hello !

```

A lowered limit:

```console
$ cat loop.tpl
{{FOR items AS i}}${{i}}{{END_FOR}}
$ echo '{"items": [1, 2, 3, 4, 5]}' > items.json
$ template-resolver render loop.tpl --data items.json --max-iterations 3
loop.tpl:1:1: error limit-iterations: Loops ran more than 3 iterations in total
```

`--json` prints the structured render result shown [above](#structured-render-result):

```console
$ template-resolver render greeting.tpl --data data.json --json
{
  "ok": true,
  "output": "Hello Alice!\nYou have premium access.\n",
  "messages": [],
  "stats": {
    "chars": 38,
    "estTokens": 10,
    "sectionsOmitted": 0,
    "iterations": 0
  },
  "diagnostics": []
}
```

`validate` reports an error (exit 1) or a warning (exit 0):

```console
$ printf 'Hi ${{name | shout}}\n' | template-resolver validate -
{
  "ok": false,
  "diagnostics": [
    {
      "severity": "error",
      "code": "unknown-filter",
      "message": "Unknown filter: shout",
      "line": 1,
      "column": 4
    }
  ]
}
$ echo $?
1
$ cat check.tpl
{{IF status is active}}Active{{END_IF}}
$ template-resolver validate check.tpl
{
  "ok": true,
  "diagnostics": [
    {
      "severity": "warning",
      "code": "analysis-warning",
      "message": "Unrecognized condition: status is active",
      "line": 1,
      "column": 1
    }
  ]
}
$ echo $?
0
```

`analyze`:

```console
$ template-resolver analyze greeting.tpl
{
  "variables": [
    {
      "name": "name",
      "paths": [
        "name"
      ],
      "usedIn": [
        "output"
      ],
      "optional": false,
      "required": true
    },
    {
      "name": "is_premium",
      "paths": [
        "is_premium"
      ],
      "usedIn": [
        "if"
      ],
      "optional": false,
      "required": true
    }
  ],
  "filters": [],
  "blocks": {
    "IF": 1
  },
  "diagnostics": []
}
```

`spec` (the end of it, with the default limits):

```console
$ template-resolver spec | tail -n 10
  "limits": {
    "maxIterations": 10000,
    "maxOutputChars": 1000000,
    "maxDepth": 32
  },
  "syntax": {
    "variable": "${{path.to.value ?? \"default\" | filter=arg}}",
    "comment": "{{# comment #}}"
  }
}
```

Usage errors exit 2:

```console
$ template-resolver render - --data -
template-resolver: only one input may be read from stdin

Usage: template-resolver <command> [options]

Commands:
  render <template-file|-> [--data <file|->] [--strict | --no-strict]
         [--max-iterations n] [--max-output-chars n] [--max-depth n] [--json]
      Render a template and print the output.
  validate <template-file|->   Check a template; prints {ok, diagnostics} as JSON.
  analyze <template-file|->    Print the variables, filters and blocks a template uses.
  spec                         Print the template language spec as JSON.
  serve [--port n] [--host h]  Start the HTTP API (default 127.0.0.1:3000).

"-" reads stdin; only one input may come from stdin.
Exit codes: 0 ok, 1 template errors, 2 usage or I/O errors.
$ echo $?
2
```

---

## HTTP API

Start it with `template-resolver serve`:

```console
$ template-resolver serve
listening on http://127.0.0.1:3000
```

The API is stateless JSON over HTTP. It listens on loopback (`127.0.0.1`) by default and has no authentication, so binding another host with `--host` exposes it to that network.

| Route                   | Request body                                         | 200 response                              |
| ----------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `POST /v1/render`       | `{template, data?, options?: {strictMode?, limits?}}` | The [structured render result](#structured-render-result) |
| `POST /v1/validate`     | `{template}`                                         | `{ok, diagnostics}`                       |
| `POST /v1/analyze`      | `{template}`                                         | The analysis (variables, filters, blocks, diagnostics) |
| `GET /v1/spec`          |                                                      | The template language spec                |
| `GET /v1/openapi.json`  |                                                      | The OpenAPI 3.1 document, `api/openapi.json` |

- POST bodies must be JSON with `Content-Type: application/json`, at most 1 MiB.
- Template problems are results, not HTTP errors: `200` with `ok: false` and diagnostics. An `analyze` of a template that does not parse returns `200` with empty variables and the error in `diagnostics`.
- `options.strictMode` defaults to `true`. `options.limits` takes `maxIterations`, `maxOutputChars` and `maxDepth`; a request can only lower the server's limits, so a value above the server's is capped at the server's. `validate` and `analyze` use the server's `maxDepth`.

Request errors are `{"error": {"code", "message"}}`:

| Status | Code                     | When                                                                                     |
| ------ | ------------------------ | ---------------------------------------------------------------------------------------- |
| 400    | `invalid-request`        | Body is not JSON or not an object, `template` is not a string, `data` or `options` is not an object, an option has the wrong type, a limit is not a non-negative integer |
| 404    | `not-found`              | No route for the path                                                                    |
| 405    | `method-not-allowed`     | The path exists for another method; the `Allow` header names it                          |
| 413    | `payload-too-large`      | The body exceeds 1 MiB                                                                   |
| 415    | `unsupported-media-type` | A POST whose `Content-Type` is not `application/json`                                    |

### Examples

```console
$ curl -s -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"template": "Hello ${{name}}!", "data": {"name": "Alice"}}'
{"ok":true,"output":"Hello Alice!","messages":[],"stats":{"chars":12,"estTokens":3,"sectionsOmitted":0,"iterations":0},"diagnostics":[]}
```

A template error is still `200`:

```console
$ curl -s -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"template": "Hello ${{name}}!"}'
{"ok":false,"output":"","messages":[],"stats":{"chars":0,"estTokens":0,"sectionsOmitted":0,"iterations":0},"diagnostics":[{"severity":"error","code":"missing-variable","message":"Variable 'name' not found","line":1,"column":7,"suggestion":"No variables defined. Check variable mappings."}]}
```

A request that lowers a limit:

```console
$ curl -s -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"template": "{{FOR items AS i}}${{i}}{{END_FOR}}", "data": {"items": [1, 2, 3]}, "options": {"limits": {"maxIterations": 2}}}'
{"ok":false,"output":"","messages":[],"stats":{"chars":0,"estTokens":0,"sectionsOmitted":0,"iterations":3},"diagnostics":[{"severity":"error","code":"limit-iterations","message":"Loops ran more than 2 iterations in total","line":1,"column":1,"suggestion":"Iterate over less data or raise limits.maxIterations"}]}
```

```console
$ curl -s -X POST http://127.0.0.1:3000/v1/validate -H 'Content-Type: application/json' -d '{"template": "{{IF ready}}Go"}'
{"ok":false,"diagnostics":[{"severity":"error","code":"syntax-error","message":"Unclosed {{IF}} block starting at line 1","line":1,"column":1,"suggestion":"Add {{END_IF}}"}]}
```

```console
$ curl -s -X POST http://127.0.0.1:3000/v1/analyze -H 'Content-Type: application/json' -d '{"template": "${{user.name ?? \"guest\"}} ${{note | trim}}"}'
{"variables":[{"name":"user","paths":["user.name"],"usedIn":["output"],"optional":true,"required":false},{"name":"note","paths":["note"],"usedIn":["output"],"optional":false,"required":true}],"filters":[{"name":"trim","count":1}],"blocks":{},"diagnostics":[]}
```

```console
$ curl -s http://127.0.0.1:3000/v1/spec | head -c 100
{"version":"1.0","blocks":[{"name":"IF","closes":"END_IF","args":"condition","description":"Renders 
$ curl -s http://127.0.0.1:3000/v1/openapi.json | head -n 5
{
  "openapi": "3.1.0",
  "info": {
    "title": "Template Resolver API",
    "version": "1.0.0",
```

Request errors (the status printed after the body):

```console
$ curl -s -w '\n%{http_code}\n' -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"data": {}}'
{"error":{"code":"invalid-request","message":"template must be a string"}}
400
$ curl -s -w '\n%{http_code}\n' http://127.0.0.1:3000/v1/nope
{"error":{"code":"not-found","message":"No route for /v1/nope"}}
404
$ curl -s -o /dev/null -w '%{http_code} Allow: %header{allow}\n' http://127.0.0.1:3000/v1/render
405 Allow: POST
$ curl -s -w '\n%{http_code}\n' -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: text/plain' -d 'Hello'
{"error":{"code":"unsupported-media-type","message":"Content-Type must be application/json"}}
415
$ node -e "process.stdout.write(JSON.stringify({template: 'x'.repeat(1100000)}))" > big.json
$ curl -s -w '\n%{http_code}\n' -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' --data-binary @big.json
{"error":{"code":"payload-too-large","message":"Body exceeds 1048576 bytes"}}
413
```

---

## Development

```bash
npm install          # Install dependencies
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run build        # Build for production
npm pack             # Create installable package
node --test tools/tests/*.test.mjs   # Tooling tests (CI, jest reporter, restructure checks)
```

`npm run build` also builds the command line. The package's bin `template-resolver` is `dist/cli/index.js`: from a clone, run it as `node dist/cli/index.js <command>`, or `npm link` once to put `template-resolver` on your PATH. The examples above were run that way.

The repository has a headless core, a thin n8n wrapper and two more thin consumers:

- `core/src/` is the pure template library (lexer, parser, interpreter, filters, `analyze`, and `render`, `validate`, `spec`); it imports nothing from n8n and does no I/O.
- `n8n/` is the node; it imports core directly.
- `api/` is the HTTP API (node's `http`), with its committed OpenAPI document `api/openapi.json`; `cli/` is the command line, whose `serve` starts the API.
- `tests/` holds the jest suites, including golden-file cases under `tests/golden/cases/` (update with the harness's update mode); `tools/` holds the jest TAP reporter and node:test tooling tests.
- `docs/living/` holds the architecture and the decision records (`docs/living/decisions/adr/`).

---

## License

MIT
