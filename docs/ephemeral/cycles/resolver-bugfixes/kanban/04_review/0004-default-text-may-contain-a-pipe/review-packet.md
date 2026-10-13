---
type: review-packet
card: 0004-default-text-may-contain-a-pipe
tier: product
built_at: 2026-10-13T18:09:42.056Z
base: 785fa6a058a08210d56a2278c92c5e0459b6c284
head: 7870dd415c84a1871a6611ea52df319e941e8297
frozen: true
brief_sha256: bac435a65d23b3baf4883cd81cf59c51ee42bca9d805d68c9eb6ac35a94ad816
manifest_sha256: 6d5ca45d633101a309b203679302267b908086cac84842af16def08652d65022
criteria_sha256: 00f71c5ed21407aca6a1c6ee5d8d123c2663187239fe1b1c7979db609c4527a3
scope_sha256: 56e60a11df138afd31804cea4d679a82e1241cb134443b5a7d1726c0b2a4f36c
diff_sha256: 101286b7f8c57faaa338eb048fc32c52690f1c7c81c5ac5772d354530aa515ea
omitted_paths: 6
criteria_count: 4
must_not_count: 2
---

# Review packet: 0004-default-text-may-contain-a-pipe

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a quoted default text after ?? may contain a pipe and renders whole, with later filters still applied.

### Criteria

- c1 (verify: test): dp-01 a double-quoted default text after ?? may contain a pipe character and renders whole when the value is missing
- c2 (verify: test): dp-02 filters after a default that contains a pipe still apply to the default text
- c3 (verify: test): dp-03 a single-quoted default containing a pipe renders whole, and defaults and filters without a quoted pipe behave as before
- c4 (verify: review): dp-04 the existing jest suite files are untouched and the whole node:test suite still passes

### Must not

- m1: change how a pipe outside quotes separates filters
- m2: change the ?? rule for which values count as empty

### Reviewer brief

```
## Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a quoted default text after ?? may contain a pipe and renders whole, with later filters still applied.
Must not:
- change how a pipe outside quotes separates filters
- change the ?? rule for which values count as empty

## Questions

- goal-critical: does a pipe inside a quoted default render as part of the default?
- goal-critical: does a pipe outside quotes still separate filters, including after a quoted default?
- polish: is the change small and local to the expression split?

## Rubric

- The split honors both single and double quotes.
- A default with an escaped or unbalanced quote does not hang or throw a new error type.
- No unrelated edits in parser.ts.

## Design context

- README.md
```

### spec.md as of base 785fa6a

```
# Spec: default text may contain a pipe

## Goal

A pipe inside a quoted default text after ?? is part of the default, and filters after the default still apply.

## Scope

In: nodes/TemplateResolver/parser.ts parseVariableExpression. Out: lexer, interpreter, filters, extractAllVariables.

## Boundaries

- Always: split filters only on pipes outside single or double quotes.
- Ask first: any change to the AST node shape or to the public resolveTemplate signature.
- Never: edit tests.

## Contract and constraints

- contract: the expression is split into the core (path and default) and filters at pipes that are outside quotes.
- constraint: an expression without quotes, or with quotes that hold no pipe, parses exactly as before.

## Change manifest

Edit nodes/TemplateResolver/parser.ts only.

## Acceptance criteria

- dp-01 `${{x ?? "a|b"}}` with x missing renders `a|b`.
- dp-02 `${{x ?? "a|b" | head=2}}` with x missing renders `a|`.
- dp-03 `${{x ?? 'a|b'}}` renders `a|b`; `${{x ?? "d" | trim}}` and `${{text | trim | head=3}}` render as before.
- dp-04 existing tests keep passing.
```

### card.md as of base 785fa6a

```
# Default text may contain a pipe

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

`${{name ?? "a|b"}}` fails with "Unknown filter" because the variable expression is split on every pipe before the default text is read, so the second half of the default is treated as a filter name. A default value is free text and may contain a pipe (a path, a label such as "n/a | pending"); it must render whole, and filters after it must still apply.

## Must-haves

- `contract` `dp-01` A double-quoted default text after ?? may contain a pipe character and renders whole when the value is missing.
- `contract` `dp-02` Filters after a default that contains a pipe still apply to the default text.
- `contract` `dp-03` A single-quoted default containing a pipe renders whole, and defaults and filters without a quoted pipe behave as before.
- `constraint` `dp-04` must: leave the existing jest suite files untouched and keep the whole node:test suite passing.

## Must-nots

- Do not change how a pipe outside quotes separates filters.
- Do not change the ?? rule for which values count as empty.

## Context links

- none

## User documentation

none

## Interface contract

none: internal parser behavior; the public resolveTemplate signature is unchanged.

## Scope

| Path | Permission (add, edit, remove) | Approx lines | Blast radius |
| --- | --- | --- | --- |
| nodes/TemplateResolver/parser.ts | edit | 20 | resolver-core |
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: none
- remove: none
- edit: `nodes/TemplateResolver/parser.ts`
- files_scope: `nodes/TemplateResolver/parser.ts`

## 2. Your verification plan

Before you read section 3, write `verification_plan`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.

## 3. Design context

### README.md

````
# Template Resolver for n8n

A template engine node for n8n that builds dynamic text from variables. Designed for constructing LLM prompts that adapt based on workflow data.

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

**Missing variables** become empty strings (no errors).

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
    "detected_variables": ["customer_name", "order_items", "is_premium"],
    "mapped_variables": ["customer_name", "is_premium"],
    "missing_variables": ["order_items"],
    "variable_count": 3
  }
}
```

Metadata only included when "Show Detected Variables" is enabled.

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

## Development

```bash
npm install          # Install dependencies
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run build        # Build for production
npm pack             # Create installable package
```

---

## License

MIT
````

## Frozen tests (read-only)

These test files were committed before the work began, at base 785fa6a. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### test-node/default-pipe.test.ts (frozen)

```
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Lexer } from '../nodes/TemplateResolver/lexer';
import { Parser } from '../nodes/TemplateResolver/parser';
import { Interpreter } from '../nodes/TemplateResolver/interpreter';
import type { TemplateValue } from '../nodes/TemplateResolver/types';

function render(template: string, vars: Record<string, TemplateValue>): string {
	const tokens = new Lexer(template).tokenize();
	const ast = new Parser(tokens).parse();
	return new Interpreter(new Map(Object.entries(vars))).interpret(ast);
}

test('dp-01 a double-quoted default holding a pipe renders whole when the variable is missing', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render('${{x ?? "a|b"}}', { y: 1 });
		},
		'rendering a default that contains a pipe must not throw an unknown filter error',
	);
	assert.equal(output, 'a|b', 'the default text keeps its pipe and renders whole');
});

test('dp-02 a filter after a default holding a pipe still applies to the whole default', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render('${{x ?? "a|b" | head=2}}', { y: 1 });
		},
		'rendering a pipe-holding default followed by a filter must not throw',
	);
	assert.equal(output, 'a|', 'head=2 is applied to the whole default a|b, giving a|');
});

test('dp-03 a single-quoted default holding a pipe renders whole', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render("${{x ?? 'a|b'}}", { y: 1 });
		},
		'rendering a single-quoted default that contains a pipe must not throw',
	);
	assert.equal(output, 'a|b', 'the single-quoted default keeps its pipe and renders whole');
});

test('guard dp-03 a pipe-free default followed by a filter renders as before', () => {
	assert.equal(render('${{x ?? "d" | trim}}', { y: 1 }), 'd', 'the default d is trimmed and rendered');
});

test('guard dp-03 chained filters without a default render as before', () => {
	assert.equal(render('${{text | trim | head=3}}', { text: '  hello ' }), 'hel', 'trim then head=3 on "  hello " gives hel');
});

test('dp-03 an existing value is not replaced by a default holding a pipe', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render('${{x ?? "a|b"}}', { x: 'v' });
		},
		'a present variable with a pipe-holding default must not throw an unknown filter error',
	);
	assert.equal(output, 'v', 'a present variable renders its own value, not the default');
});
```

Named by the card but not at the base commit (the implementer's own tests, never frozen): `.test-build/test-node/default-pipe.test.js`.

## 4. Diff

6 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/nodes/TemplateResolver/parser.ts b/nodes/TemplateResolver/parser.ts
index c7e6eee..6bb8705 100644
--- a/nodes/TemplateResolver/parser.ts
+++ b/nodes/TemplateResolver/parser.ts
@@ -133,8 +133,8 @@ export class Parser {
     defaultValue?: string;
     filters?: FilterCall[];
   } {
-    // --- 1. Split filters FIRST ---
-    const parts = expr.split("|").map((p) => p.trim());
+    // --- 1. Split filters FIRST (pipes inside quotes belong to the text) ---
+    const parts = this.splitOutsideQuotes(expr, "|").map((p) => p.trim());
     const core = parts[0];
     const filterExprs = parts.slice(1);
 
@@ -170,6 +170,29 @@ export class Parser {
     };
   }
 
+  /**
+   * Split on a separator character, ignoring any inside single or double quotes
+   */
+  private splitOutsideQuotes(text: string, separator: string): string[] {
+    const parts: string[] = [];
+    let quote: string | null = null;
+    let start = 0;
+
+    for (let i = 0; i < text.length; i++) {
+      const ch = text[i];
+      if (quote) {
+        if (ch === quote) quote = null;
+      } else if (ch === '"' || ch === "'") {
+        quote = ch;
+      } else if (ch === separator) {
+        parts.push(text.slice(start, i));
+        start = i + 1;
+      }
+    }
+    parts.push(text.slice(start));
+    return parts;
+  }
+
   /**
    * Parse IF block: {{IF condition}}...{{ELSEIF}}...{{ELSE}}...{{END_IF}}
    */
```

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
