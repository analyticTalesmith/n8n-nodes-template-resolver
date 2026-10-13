---
type: review-packet
card: 0007-raw-block-outputs-its-text-literally
tier: product
built_at: 2026-10-13T18:20:11.021Z
base: 342feb27736239cce79e7d6cb7080bd76bf2c0d5
head: 779b36619aa1f9ab9d73b68cabbeccf8c5912ad7
frozen: true
brief_sha256: aa635d4690c596935d58667c93f168794c5dffe2aedb3b0d4d87f790aadcc391
manifest_sha256: 714979ac8bf3072ad555cda59e45e0e10717d6371afa8cf58533bd1425d8a8d2
criteria_sha256: b217e9548020de61629971995f9cc9101d03a16a15d814ce739850481bc2c5c9
scope_sha256: 08a956ddda379e7ac16d14102ac383c9e55a7f23c11c25bf93c809b2c36cf6d2
diff_sha256: 7a6067b7ac9e47691169c10323ba8498a253f2d8a8287c55f282bec7455c5d4f
omitted_paths: 6
criteria_count: 6
must_not_count: 2
---

# Review packet: 0007-raw-block-outputs-its-text-literally

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: add a RAW block that outputs its contents literally so templates can include braces and tag-like text.
Card goal: the lexer turns the text between RAW and END_RAW into one literal Text token, and the README documents it.

### Criteria

- c1 (verify: test): rb-01 the text between RAW and END_RAW renders exactly as written, including IF tags, variable tags, comment markers and lone braces
- c2 (verify: test): rb-02 a RAW block inside IF and FOR bodies repeats per iteration and is skipped in an untaken branch, with surrounding tags and variables rendering as before
- c3 (verify: test): rb-03 the raw text is not trimmed and CRLF in it becomes LF
- c4 (verify: test): rb-04 an unclosed RAW block is a syntax error that names its line and column
- c5 (verify: review): rb-05 templates without RAW render exactly as before: the jest suite and the node:test suite pass and the jest suite files are untouched
- c6 (verify: manual): rb-06 the README documents RAW with one example whose output a person confirms

### Must not

- m1: change the parser, the interpreter or the behavior of any other tag
- m2: add nesting, escapes or options to RAW

### Reviewer brief

```
## Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: add a RAW block that outputs its contents literally so templates can include braces and tag-like text.
Card goal: the lexer turns the text between RAW and END_RAW into one literal Text token, and the README documents it.
Must not:
- change the parser, the interpreter or the behavior of any other tag
- add nesting, escapes or options to RAW

## Questions

- goal-critical: does everything between RAW and END_RAW come out exactly as written, including double braces and tag-like text?
- goal-critical: does an unclosed RAW fail with a syntax error at the RAW tag instead of silently consuming the rest?
- polish: is the README example accurate, and is the lexer change small and local?

## Rubric

- The raw scan does not alter templates without RAW.
- Line and column tracking stays correct for tokens after a RAW block.
- The README example's shown output matches what the resolver prints.

## Design context

- README.md
```

### spec.md as of base 342feb2

```
# Spec: raw block

## Goal

`{{RAW}}text{{END_RAW}}` renders `text` unchanged, whatever it contains.

## Scope

In: the lexer's tag scan, one README section. Out: parser, interpreter, filters, expressions, the n8n node file.

## Boundaries

- Always: emit the raw content as one ordinary Text token so the parser and interpreter need no change.
- Ask first: any change to the Token or AST types.
- Never: edit tests; add nesting or escapes.

## Options considered

1. Lexer-level scan (chosen): when a tag's keyword is RAW, read characters up to the next END_RAW tag and emit one Text token. No change to the AST.
2. A parser block node with its own interpreter visit: more code and a new AST type for no gain, since the content is only text.

## Contract and constraints

- contract: after the lexer reads a tag whose trimmed content is exactly `RAW`, it consumes everything up to the next `{{END_RAW}}` (the closing tag may have inner spaces, as other tags do) and emits one Text token with that content, CRLF normalized to LF. Empty content emits no token.
- contract: an END_RAW with no open RAW keeps the existing unknown-tag error.
- constraint: if no END_RAW follows, throw the lexer's SyntaxError at the RAW tag's line and column with the message `Unclosed {{RAW}} block` and the hint `Add {{END_RAW}}`.
- constraint: nothing else in the lexer changes for templates without RAW.

## Change manifest

Edit nodes/TemplateResolver/lexer.ts and README.md. Edit docs/living/product/raw-block.md (a planned stub the lead created with the delta; the build fills it with the built syntax; the delta applies it to built when the cycle merges).

## Acceptance criteria

- rb-01 `{{RAW}}{{IF x}} ${{name}} {{# c #}} { }{{END_RAW}}` renders `{{IF x}} ${{name}} {{# c #}} { }`.
- rb-02 a RAW block in a FOR body appears once per iteration; in an untaken IF branch it does not appear.
- rb-03 leading and trailing spaces and newlines inside RAW stay; CRLF becomes LF.
- rb-04 `a{{RAW}}b` throws a SyntaxError whose message names line 1 and column 2.
- rb-05 existing tests pass.
- rb-06 README section present with one example (manual).
```

### card.md as of base 342feb2

```
# Raw block outputs its text literally

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

A template that contains double braces as literal text (a code sample, a JSON example, Jinja) throws a syntax error today, so it cannot be used in a prompt template. Add a `{{RAW}} ... {{END_RAW}}` block whose contents are output exactly as written. The owner's feature spec lists this as a Tier 1 gap.

## Must-haves

- `contract` `rb-01` The text between RAW and END_RAW renders exactly as written, including IF tags, variable tags, comment markers and lone braces.
- `contract` `rb-02` A RAW block inside IF and FOR bodies repeats per iteration and is skipped in an untaken branch, with surrounding tags and variables rendering as before.
- `contract` `rb-03` The raw text is not trimmed and CRLF in it becomes LF.
- `constraint` `rb-04` must: report an unclosed RAW block as a syntax error that names its line and column.
- `constraint` `rb-05` must: leave templates without RAW rendering exactly as before.
- `contract` `rb-06` The README documents RAW with one example whose output a person confirms.

## Must-nots

- Do not change the parser, the interpreter or any other tag's behavior.
- Do not add nesting, escapes or options to RAW.

## Context links

- none

## User documentation

Users see the new tag. A new living document describes the built RAW syntax, and the README gains a short RAW section with one example and its output.

## Interface contract

The template syntax gains `{{RAW}}` and `{{END_RAW}}`. The first `{{END_RAW}}` after a `{{RAW}}` closes the block; there is no nesting. The public resolveTemplate signature is unchanged.

## Scope

| Path | Permission (add, edit, remove) | Approx lines | Blast radius |
| --- | --- | --- | --- |
| nodes/TemplateResolver/lexer.ts | edit | 30 | resolver-core |
| README.md | edit | 25 | resolver-core |
| docs/living/product/raw-block.md | edit | 30 | resolver-core |
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: none
- remove: none
- edit: `nodes/TemplateResolver/lexer.ts`, `README.md`, `docs/living/product/raw-block.md`
- files_scope: `nodes/TemplateResolver/lexer.ts`, `README.md`, `docs/living/product/raw-block.md`

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

These test files were committed before the work began, at base 342feb2. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### test-node/raw-block.test.ts (frozen)

```
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Lexer } from '../nodes/TemplateResolver/lexer';
import { Parser } from '../nodes/TemplateResolver/parser';
import { Interpreter } from '../nodes/TemplateResolver/interpreter';
import { TokenType } from '../nodes/TemplateResolver/types';
import type { TemplateValue, Token } from '../nodes/TemplateResolver/types';
import { SyntaxError as TemplateSyntaxError } from '../nodes/TemplateResolver/errors';

function render(template: string, vars: Record<string, TemplateValue>): string {
	const tokens = new Lexer(template).tokenize();
	const ast = new Parser(tokens).parse();
	return new Interpreter(new Map(Object.entries(vars))).interpret(ast);
}

function lex(template: string): Token[] {
	return new Lexer(template).tokenize();
}

test('rb-01 a RAW block lexes to one literal Text token', () => {
	const content = '{{IF x}} ${{name}} {{# c #}} { }';
	let tokens: Token[] = [];
	assert.doesNotThrow(
		() => {
			tokens = lex(`{{RAW}}${content}{{END_RAW}}`);
		},
		'tokenizing a RAW block must not throw an unknown tag error',
	);
	const meaningful = tokens.filter((t) => t.type !== TokenType.EOF);
	assert.equal(meaningful.length, 1, 'the RAW block yields exactly one token besides end of input');
	assert.equal(meaningful[0].type, TokenType.TEXT, 'the single token is a Text token');
	assert.equal(meaningful[0].value, content, 'the Text token holds the raw content unchanged');
});

test('rb-01 a RAW block renders its content literally with no variables', () => {
	const content = '{{IF x}} ${{name}} {{# c #}} { }';
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render(`{{RAW}}${content}{{END_RAW}}`, {});
		},
		'rendering a RAW block must not throw',
	);
	assert.equal(output, content, 'the output is the raw content exactly as written');
});

test('rb-02 a RAW block in a FOR body appears once per iteration', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render('{{FOR a AS x}}[{{RAW}}${{x}}{{END_RAW}}${{x}}]{{END_FOR}}', { a: [1, 2] });
		},
		'rendering a RAW block inside a FOR body must not throw',
	);
	assert.equal(output, '[${{x}}1][${{x}}2]', 'each iteration prints the raw text then the loop value');
});

test('rb-02 a RAW block in an untaken IF branch does not appear', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render('{{IF f}}{{RAW}}{{IF}}{{END_RAW}}{{END_IF}}z', { f: false });
		},
		'rendering a RAW block inside an untaken IF must not throw',
	);
	assert.equal(output, 'z', 'the untaken branch contributes nothing, only z remains');
});

test('rb-03 RAW keeps leading and trailing spaces and turns CRLF into LF', () => {
	let tokens: Token[] = [];
	assert.doesNotThrow(
		() => {
			tokens = lex('{{RAW}}  a\r\n b  {{END_RAW}}');
		},
		'tokenizing a RAW block with spaces and CRLF must not throw',
	);
	const meaningful = tokens.filter((t) => t.type !== TokenType.EOF);
	assert.equal(meaningful.length, 1, 'the block yields exactly one token besides end of input');
	assert.equal(meaningful[0].type, TokenType.TEXT, 'the token is a Text token');
	assert.equal(meaningful[0].value, '  a\n b  ', 'spaces are kept and CRLF becomes LF');
});

test('rb-04 an unclosed RAW block throws a SyntaxError at the RAW tag position', () => {
	let caught: unknown;
	try {
		lex('a{{RAW}}b');
	} catch (error) {
		caught = error;
	}
	assert.ok(caught instanceof TemplateSyntaxError, 'an unclosed RAW throws a template SyntaxError');
	const err = caught as TemplateSyntaxError;
	assert.match(err.message, /Unclosed/, 'the message says the block is Unclosed');
	assert.match(err.message, /RAW/, 'the message names RAW');
	assert.equal(err.line, 1, 'the error is reported on line 1');
	assert.equal(err.column, 2, 'the error is reported at column 2, where the RAW tag starts');
});

test('guard rb-05 a template without RAW renders unchanged', () => {
	assert.equal(render('a ${{n}} b', { n: 'X' }), 'a X b', 'a plain variable template renders as before');
});
```

Named by the card but not at the base commit (the implementer's own tests, never frozen): `.test-build/test-node/raw-block.test.js`.

## 4. Diff

6 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

````diff
diff --git a/README.md b/README.md
index ae56b95..cbeb6b1 100644
--- a/README.md
+++ b/README.md
@@ -322,6 +322,22 @@ are also supported
 
 ---
 
+### Raw blocks: `{{RAW}}`
+
+Text between `{{RAW}}` and `{{END_RAW}}` is output exactly as written, so it can contain braces and tag-like text. The first `{{END_RAW}}` closes the block, raw blocks do not nest, and an unclosed `{{RAW}}` is a syntax error.
+
+```
+Write ${{name}} like this: {{RAW}}${{name}} and {{IF x}}{{END_RAW}}
+```
+
+With `name = "Ada"` the output is:
+
+```
+Write Ada like this: ${{name}} and {{IF x}}
+```
+
+---
+
 ### Math: `${{a + b}}`
 
 Basic arithmetic in variable expressions:
diff --git a/docs/living/product/raw-block.md b/docs/living/product/raw-block.md
index 85bafe1..cba0301 100644
--- a/docs/living/product/raw-block.md
+++ b/docs/living/product/raw-block.md
@@ -8,4 +8,35 @@ user_facing: true
 
 ## Purpose
 
-For people writing templates: put text that contains double braces or tag-like text into a template without it being read as template syntax. This document is a planned stub; the build fills in the syntax, the rules and one example, describing what was built.
+For people writing templates: put text that contains double braces or tag-like text into a template without it being read as template syntax. Everything between `{{RAW}}` and `{{END_RAW}}` is output exactly as written.
+
+## Syntax
+
+```
+{{RAW}}text{{END_RAW}}
+```
+
+The closing tag may have spaces inside the braces, like other tags (`{{ END_RAW }}`).
+
+## Rules
+
+- The first `{{END_RAW}}` closes the block; raw blocks do not nest.
+- The text is not trimmed: leading and trailing spaces and newlines are kept. CRLF line endings become LF.
+- An empty block outputs nothing.
+- A `{{RAW}}` with no `{{END_RAW}}` after it is a syntax error ("Unclosed {{RAW}} block", hint "Add {{END_RAW}}") reported at the position of the `{{RAW}}` tag.
+- A `{{END_RAW}}` with no `{{RAW}}` before it is an unknown tag error, as before.
+- Inside a loop the block's text appears once per iteration; inside an untaken branch it does not appear.
+
+## Example
+
+Template, with `name = "Ada"`:
+
+```
+Write ${{name}} like this: {{RAW}}${{name}} and {{IF x}}{{END_RAW}}
+```
+
+Output:
+
+```
+Write Ada like this: ${{name}} and {{IF x}}
+```
diff --git a/nodes/TemplateResolver/lexer.ts b/nodes/TemplateResolver/lexer.ts
index bc49703..2468082 100644
--- a/nodes/TemplateResolver/lexer.ts
+++ b/nodes/TemplateResolver/lexer.ts
@@ -234,6 +234,11 @@ export class Lexer {
     const keyword = this.extractKeyword(trimmed);
     const tokenType = this.getTokenType(keyword);
 
+    if (trimmed === "RAW") {
+      this.scanRaw(startLine, startColumn);
+      return;
+    }
+
     if (tokenType === null) {
       throw new SyntaxError(
         `Unknown template tag: {{${keyword}}}`,
@@ -283,6 +288,39 @@ export class Lexer {
     );
   }
 
+  /**
+   * Scan raw block: {{RAW}} text {{END_RAW}} - the text is emitted literally
+   */
+  private scanRaw(startLine: number, startColumn: number): void {
+    const rest = this.template.slice(this.pos);
+    const closing = /\{\{[ \t]*END_RAW[ \t]*\}\}/.exec(rest);
+
+    if (closing === null) {
+      throw new SyntaxError(
+        "Unclosed {{RAW}} block",
+        startLine,
+        startColumn,
+        "Add {{END_RAW}}"
+      );
+    }
+
+    const textLine = this.line;
+    const textColumn = this.column;
+    const content = rest.slice(0, closing.index);
+
+    this.advance(closing.index);
+    this.advance(closing[0].length);
+
+    if (content.length > 0) {
+      this.tokens.push({
+        type: TokenType.TEXT,
+        value: content.replace(/\r\n/g, "\n"),
+        line: textLine,
+        column: textColumn,
+      });
+    }
+  }
+
   /**
    * Scan plain text (everything outside {{ }})
    */
````

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
