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

**Combine with default:**

```
${{bio ?? "No bio provided" | trim | head=100}}
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
