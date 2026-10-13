---
type: review-packet
card: 0003-nested-for-keeps-outer-loop-variables
tier: product
built_at: 2026-10-13T18:05:23.729Z
base: a955a0bf90f5cb23b1c11f29852ac5977416303a
head: 4db9a78f3af5abbd9b7e0178d689c404a47384c8
frozen: true
brief_sha256: 71b0bd09d8b614a83f7144888d836f5ad419195e60f77bba2474b3f3b80b931b
manifest_sha256: c250af2da6b22861526e058f05d6edfb9e335f98c3709646cb984bba2109ecfd
criteria_sha256: b245381d47decf1eb413993f7c76b4786bd86b69798e769f15c200eb77980927
scope_sha256: c64cfb067c5757316fdf699b1685051052dd102e3c9f51627914b795fca0f8c9
diff_sha256: 197058d9a63143b8f3cef35349aaddc36b0a20d9bb09986469606094cd9f1e52
omitted_paths: 11
criteria_count: 4
must_not_count: 2
---

# Review packet: 0003-nested-for-keeps-outer-loop-variables

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: keep the enclosing loop's variables and @index values after an inner loop ends.

### Criteria

- c1 (verify: test): nf-01 after an inner FOR loop ends, the outer loop variable and its @index0 and @first values still resolve in the rest of the outer body
- c2 (verify: test): nf-02 two sibling inner loops and a doubly nested loop render every iteration with the right outer item
- c3 (verify: test): nf-03 a TABLE row loop inside an outer FOR keeps the outer loop variable for later rows and text
- c4 (verify: review): nf-04 the existing jest suite files are untouched and the whole node:test suite still passes

### Must not

- m1: change what a single, non-nested loop renders
- m2: change variable lookup order outside loops

### Reviewer brief

```
## Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: keep the enclosing loop's variables and @index values after an inner loop ends.
Must not:
- change what a single, non-nested loop renders
- change variable lookup order outside loops

## Questions

- goal-critical: after an inner loop ends, does text in the outer body still resolve the outer item and @index values?
- goal-critical: is the enclosing loop's state restored even when the inner loop body throws?
- polish: is the change small and local to the loop handling?

## Rubric

- Loop variables are restored by value, not by re-evaluating the iterable.
- Both the FOR visitor and the TABLE row loop are fixed.
- No unrelated edits in interpreter.ts.

## Design context

- README.md
```

### spec.md as of base a955a0b

```
# Spec: nested FOR keeps outer loop variables

## Goal

After an inner loop finishes, the enclosing loop's item and @index values are what they were, in FOR bodies and in TABLE row loops.

## Scope

In: nodes/TemplateResolver/interpreter.ts loop state handling. Out: lexer, parser, filters, expressions.

## Boundaries

- Always: restore the enclosing loop's entries when a loop ends, including when its body throws.
- Ask first: any change to the AST or the public resolveTemplate signature.
- Never: edit tests.

## Contract and constraints

- contract: a loop saves the loop-variable entries it will overwrite and restores them when it ends; a top-level loop ends with an empty context as before.
- constraint: single loops render exactly as before.

## Change manifest

Edit nodes/TemplateResolver/interpreter.ts only.

## Acceptance criteria

- nf-01 outer item and @index0/@first resolve after an inner loop in the same outer iteration.
- nf-02 sibling inner loops and a doubly nested loop render the expected text.
- nf-03 a TABLE row loop inside a FOR keeps the outer variable for later rows and text.
- nf-04 existing tests keep passing.
```

### card.md as of base a955a0b

```
# Nested FOR keeps outer loop variables

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

A FOR loop inside another FOR loop wipes the outer loop's variables when the inner loop ends, so text after the inner loop that names the outer item fails with "Variable not found" (or renders empty in lenient mode). The resolver must keep the outer loop's item and @index values after an inner loop finishes, because templates for lists of lists are a core use.

## Must-haves

- `contract` `nf-01` After an inner FOR loop ends, the outer loop variable and its @index0 and @first values still resolve in the rest of the outer body.
- `contract` `nf-02` Two sibling inner loops and a doubly nested loop render every iteration with the right outer item.
- `contract` `nf-03` A TABLE row loop inside an outer FOR keeps the outer loop variable for later rows and text.
- `constraint` `nf-04` must: leave the existing jest suite files untouched and keep the whole node:test suite passing.

## Must-nots

- Do not change what a single, non-nested loop renders.
- Do not change variable lookup order outside loops.

## Context links

- none

## User documentation

none

## Interface contract

none: internal interpreter behavior; the public resolveTemplate signature is unchanged.

## Scope

| Path | Permission (add, edit, remove) | Approx lines | Blast radius |
| --- | --- | --- | --- |
| nodes/TemplateResolver/interpreter.ts | edit | 25 | resolver-core |
```

### Scope exceptions log (as of now, written during the work)

Each row is a change outside the card's scope that its lead approved. A builder who can edit the card folder can add a row, so the human gate is the backstop.

| Date | Path | Kind | Reason | Approved by |
| --- | --- | --- | --- | --- |
| 2026-10-13 | `docs/ephemeral/cycles/resolver-bugfixes/CYCLE.md` | edit | add the table loop must-have id the test plan cites | project lead |
| 2026-10-13 | `docs/ephemeral/cycles/resolver-bugfixes/test-plan.md` | edit | cycle test plan rows for this card, written before the claim | project lead |

### Manifest and scope

- add: none
- remove: none
- edit: `nodes/TemplateResolver/interpreter.ts`
- files_scope: `nodes/TemplateResolver/interpreter.ts`

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

These test files were committed before the work began, at base a955a0b. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### test-node/nested-for.test.ts (frozen)

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

test('nf-01 outer item, @index0 and @first resolve after an inner loop', () => {
	const template =
		'{{FOR a AS x}}{{FOR b AS y}}${{y}}{{END_FOR}}[${{x}}|${{@index0}}|${{@first}}]{{END_FOR}}';
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render(template, { a: ['A1', 'A2'], b: ['b1', 'b2'] });
		},
		'rendering text after an inner loop must not throw for the outer variable',
	);
	assert.equal(output, 'b1b2[A1|0|true]b1b2[A2|1|false]', 'outer item, @index0 and @first keep the outer loop values after the inner loop');
});

test('nf-02 sibling inner loops keep the outer item between and after them', () => {
	const template =
		'{{FOR a AS x}}${{x}}:{{FOR b AS y}}${{y}}{{END_FOR}}/${{x}}:{{FOR c AS z}}${{z}}{{END_FOR}}/${{x}};{{END_FOR}}';
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render(template, { a: ['A1', 'A2'], b: ['b1', 'b2'], c: ['c1'] });
		},
		'rendering after each sibling inner loop must not throw for the outer variable',
	);
	assert.equal(output, 'A1:b1b2/A1:c1/A1;A2:b1b2/A2:c1/A2;', 'the outer item resolves between and after sibling inner loops');
});

test('nf-02 a three-level nested loop keeps every enclosing item after the inner loops', () => {
	const template =
		'{{FOR a AS x}}{{FOR b AS y}}{{FOR c AS z}}${{z}}{{END_FOR}}(${{y}}){{END_FOR}}<${{x}}>{{END_FOR}}';
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render(template, { a: ['A1', 'A2'], b: ['b1', 'b2'], c: ['c1', 'c2'] });
		},
		'rendering after the innermost and middle loops must not throw',
	);
	assert.equal(
		output,
		'c1c2(b1)c1c2(b2)<A1>c1c2(b1)c1c2(b2)<A2>',
		'the middle item resolves after the innermost loop and the outermost item after the middle loop',
	);
});

test('nf-03 a TABLE row loop inside a FOR keeps the outer variable in rows and after the table', () => {
	const template =
		'{{FOR a AS x}}{{TABLE}}{{HEADER}}Outer|Inner{{END_HEADER}}{{FOR b AS y}}{{ROW}}${{x}}|${{y}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}after ${{x}};{{END_FOR}}';
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render(template, { a: ['A1', 'A2'], b: ['b1', 'b2'] });
		},
		'rendering a table row loop and the text after it must not throw for the outer variable',
	);
	assert.ok(output.includes('| A1 | b1 |'), 'first outer iteration, first row shows the outer item');
	assert.ok(output.includes('| A1 | b2 |'), 'later rows in the first outer iteration still show the outer item');
	assert.ok(output.includes('after A1;'), 'text after the table in the first outer iteration resolves the outer item');
	assert.ok(output.includes('| A2 | b2 |'), 'second outer iteration rows show the second outer item');
	assert.ok(output.includes('after A2;'), 'text after the table in the second outer iteration resolves the outer item');
});
```

Named by the card but not at the base commit (the implementer's own tests, never frozen): `.test-build/test-node/nested-for.test.js`.

## 4. Diff

11 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/nodes/TemplateResolver/interpreter.ts b/nodes/TemplateResolver/interpreter.ts
index fbdbc50..df56cbb 100644
--- a/nodes/TemplateResolver/interpreter.ts
+++ b/nodes/TemplateResolver/interpreter.ts
@@ -27,6 +27,11 @@ import {
 } from "./expressions";
 import { parseFilter, applyFilters } from "./filters";
 
+interface LoopEntries {
+  keys: string[];
+  existing: Map<string, TemplateValue>;
+}
+
 /**
  * Interpreter: Walks AST and produces output string
  *
@@ -211,28 +216,65 @@ export class Interpreter {
     }
 
     const results: string[] = [];
-
-    for (let i = 0; i < array.length; i++) {
-      // Set loop context
-      this.loopContext.set(node.itemName, array[i]);
-      this.loopContext.set("@index0", i);
-      this.loopContext.set("@index1", i + 1);
-      this.loopContext.set("@first", i === 0);
-      this.loopContext.set("@last", i === array.length - 1);
-      this.loopContext.set("@notFirst", i !== 0);
-      this.loopContext.set("@notLast", i !== array.length - 1);
-
-      // Render body
-      const output = node.body.map((child) => this.visit(child)).join("");
-      results.push(output);
+    const saved = this.saveLoopEntries(node.itemName);
+
+    try {
+      for (let i = 0; i < array.length; i++) {
+        // Set loop context
+        this.loopContext.set(node.itemName, array[i]);
+        this.loopContext.set("@index0", i);
+        this.loopContext.set("@index1", i + 1);
+        this.loopContext.set("@first", i === 0);
+        this.loopContext.set("@last", i === array.length - 1);
+        this.loopContext.set("@notFirst", i !== 0);
+        this.loopContext.set("@notLast", i !== array.length - 1);
+
+        // Render body
+        const output = node.body.map((child) => this.visit(child)).join("");
+        results.push(output);
+      }
+    } finally {
+      // Restore the enclosing loop's entries
+      this.restoreLoopEntries(saved);
     }
 
-    // Clear loop context
-    this.loopContext.clear();
-
     return results.join("");
   }
 
+  /**
+   * Save the loop entries a loop with this item name will overwrite
+   */
+  private saveLoopEntries(itemName: string): LoopEntries {
+    const keys = [
+      itemName,
+      "@index0",
+      "@index1",
+      "@first",
+      "@last",
+      "@notFirst",
+      "@notLast",
+    ];
+    const existing = new Map<string, TemplateValue>();
+    for (const key of keys) {
+      if (this.loopContext.has(key)) {
+        existing.set(key, this.loopContext.get(key) as TemplateValue);
+      }
+    }
+    return { keys, existing };
+  }
+
+  /**
+   * Put saved loop entries back, removing those that did not exist before
+   */
+  private restoreLoopEntries(saved: LoopEntries): void {
+    for (const key of saved.keys) {
+      this.loopContext.delete(key);
+    }
+    for (const [key, value] of saved.existing) {
+      this.loopContext.set(key, value);
+    }
+  }
+
   /**
    * Visit LIST node
    */
@@ -310,35 +352,38 @@ export class Interpreter {
         const array = tryCoerceToArray(iterable);
 
         if (array) {
-          for (let i = 0; i < array.length; i++) {
-            // Set loop context
-            this.loopContext.set(forNode.itemName, array[i]);
-            this.loopContext.set("@index0", i);
-            this.loopContext.set("@index1", i + 1);
-            this.loopContext.set("@first", i === 0);
-            this.loopContext.set("@last", i === array.length - 1);
-            this.loopContext.set("@notFirst", i !== 0);
-            this.loopContext.set("@notLast", i !== array.length - 1);
-
-            // Process FOR body - look for TableRow nodes
-            for (const bodyNode of forNode.body) {
-              if (bodyNode.type === "TableRow") {
-                const tableRowNode = bodyNode as TableRowNode;
-                const cells = this.processCellsArray(tableRowNode.cells);
-                rows.push(cells);
-              } else {
-                // Fallback: render and split by |
-                const forOutput = this.visit(bodyNode);
-                if (forOutput.trim()) {
-                  const cells = forOutput.split("|").map((cell) => cell.trim());
+          const saved = this.saveLoopEntries(forNode.itemName);
+          try {
+            for (let i = 0; i < array.length; i++) {
+              // Set loop context
+              this.loopContext.set(forNode.itemName, array[i]);
+              this.loopContext.set("@index0", i);
+              this.loopContext.set("@index1", i + 1);
+              this.loopContext.set("@first", i === 0);
+              this.loopContext.set("@last", i === array.length - 1);
+              this.loopContext.set("@notFirst", i !== 0);
+              this.loopContext.set("@notLast", i !== array.length - 1);
+
+              // Process FOR body - look for TableRow nodes
+              for (const bodyNode of forNode.body) {
+                if (bodyNode.type === "TableRow") {
+                  const tableRowNode = bodyNode as TableRowNode;
+                  const cells = this.processCellsArray(tableRowNode.cells);
                   rows.push(cells);
+                } else {
+                  // Fallback: render and split by |
+                  const forOutput = this.visit(bodyNode);
+                  if (forOutput.trim()) {
+                    const cells = forOutput.split("|").map((cell) => cell.trim());
+                    rows.push(cells);
+                  }
                 }
               }
             }
+          } finally {
+            // Restore the enclosing loop's entries
+            this.restoreLoopEntries(saved);
           }
-
-          // Clear loop context
-          this.loopContext.clear();
         }
       } else {
         // Regular row - process all cells
```

## 5. Earlier findings and replies

Answer each fix-class (defect or goal-risk) finding below in `responses` with sustain or withdraw and evidence. Raise new findings only about what the revision changed or an in-scope problem newly evidenced.

No earlier findings remain open.

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
