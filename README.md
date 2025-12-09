# n8n-nodes-template-resolver

A custom template resolution node for n8n for conditional prompt/text creation based on the values passed into the template's variables.

**Primary Use Case:** Building dynamic prompts for LLM nodes (OpenAI, Anthropic, etc.) by injecting context from previous workflow steps into structured prompt templates.

## Features

- **Variable Substitution** — Insert dynamic values with `${{variableName}}`
- **Conditional Blocks** — Show/hide prompt sections with `{{IF}}`, `{{ELSEIF}}`, `{{ELSE}}`
- **Switch/Case Logic** — Multi-branch conditionals with `{{CASE}}`/`{{WHEN}}`
- **Loops** — Iterate over arrays with `{{FOR}}`
- **Dynamic Lists** — Auto-numbered lists with `{{LIST_ITEM}}`
- **Rich Comparisons** — Equality, contains, starts/ends with, length checks, and more
- **Boolean Logic** — Combine conditions with `AND`, `OR`, and parentheses

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Node Configuration](#node-configuration)
- [Template Syntax](#template-syntax)
  - [Variable Substitution](#1-variable-substitution)
  - [Conditional Blocks](#2-conditional-blocks-ifelseifelse)
  - [CASE/WHEN Blocks](#3-casewhen-blocks)
  - [FOR Loops](#4-for-loops)
  - [LIST_ITEM](#5-list_item-auto-numbered-lists)
- [Operators Reference](#operators-reference)
- [LLM Prompt Engineering Examples](#llm-prompt-engineering-examples)
- [Tips & Best Practices](#tips--best-practices)
- [Development](#development)

---

## Installation Via n8n Docker Image

1. **Build the package** in your development environment (or download latest release):
   ```bash
   npm run build
   npm pack
   ```
   This creates `n8n-nodes-template-resolver-x.y.z.tgz`

2. **Copy the package** to your n8n Docker container's custom nodes directory:
   ```bash
   docker cp n8n-nodes-template-resolver-x.y.z.tgz n8n:/home/node/.n8n/custom/
   ```

3. **Install the package** inside the container:
   ```bash
   docker exec -it n8n /bin/sh
   cd /home/node/.n8n/custom && npm install n8n-nodes-template-resolver-x.y.z.tgz
   ```

4. **Restart n8n**:
   ```bash
   docker restart n8n
   ```

---

## Quick Start

After installation, search for **"Template Resolver"** in the n8n node panel.

### Basic Example

**Template:**
```
# Role
You are a helpful assistant specializing in ${{domain}}.

# Task
${{task_description}}

{{IF include_examples}}
# Examples
${{examples}}
{{ENDIF}}
```

**Variable Mappings:**

| Variable Name | Value |
|---------------|-------|
| `domain` | `{{ $('Config').item.json.domain }}` |
| `task_description` | `{{ $('User Input').item.json.task }}` |
| `include_examples` | `{{ $('Config').item.json.includeExamples }}` |
| `examples` | `{{ $('Examples DB').item.json.examples }}` |

---

## Node Configuration

### Inputs

| Field | Type | Description |
|-------|------|-------------|
| **Template** | String | Your prompt template with syntax markers |
| **Variable Mappings** | Collection | Maps template variables to workflow values |

### Variable Mappings

Variable Mappings connect placeholder variables in your template to actual values from your n8n workflow.

**How it works:**

1. In your template, use `${{variable_name}}` to mark where dynamic content goes
2. In Variable Mappings, add an entry for each variable:
   - **Variable Name** — The exact name as written in your template (e.g., `customer_name`)
   - **Value** — The n8n expression that provides the data (e.g., `{{ $('Previous Node').item.json.fieldName }}`)

**Example mapping:**

| Variable Name | Value |
|---------------|-------|
| `customer_name` | `{{ $('Webhook').item.json.customer.name }}` |
| `ticket_history` | `{{ $('Get History').item.json.messages.toJsonString() }}` |
| `priority` | `{{ $('Classify').item.json.priority }}` |

### Outputs

| Field | Type | Description |
|-------|------|-------------|
| **resolvedContent** | String | The fully processed template |
| **metadata** | Object | Processing details (see below) |

### Metadata Object

```json
{
  "detected_variables": ["customer_name", "priority", "ticket_history"],
  "mapped_variables": ["customer_name", "priority"],
  "missing_variables": ["ticket_history"],
  "variable_count": 3
}
```

> Use `missing_variables` to see which variables weren't provided to help debug templates.

---

## Template Syntax

### 1. Variable Substitution

Insert values using `${{variableName}}`:

```
The customer's name is ${{customer_name}}.
Their account ID is ${{account_id}}.
```

**Dot notation** for nested objects:
```
Ship to: ${{order.shipping.city}}, ${{order.shipping.country}}
```

**JSON strings are auto-parsed.** If a variable contains a JSON string, you can still access nested properties:

```
# Variable: metadata = '{"source": "api", "version": "2.1"}'

Source: ${{metadata.source}}   → Source: api
Version: ${{metadata.version}} → Version: 2.1
```

This means n8n expressions using `.toJsonString()` still support dot notation access.

**Array index access:**
```
# Variable: tags = '["urgent", "billing", "escalate"]'

First tag: ${{tags.0}} → urgent
```

> Missing variables or properties become empty strings.

---

### 2. Conditional Blocks (IF/ELSEIF/ELSE)

Control which sections appear in your prompt based on variable values.

#### Basic IF — Include section when variable is truthy

```
{{IF previous_messages}}
# Conversation History
${{previous_messages}}
{{ENDIF}}
```

#### IF/ELSE — Two-way branch

```
{{IF is_enterprise_customer}}
You may offer custom solutions and extended SLAs.
{{ELSE}}
Direct complex requests to our sales team.
{{ENDIF}}
```

#### IF/ELSEIF/ELSE — Multi-way branch

```
{{IF sentiment == "angry"}}
Respond with empathy. Acknowledge frustration before addressing the issue.
{{ELSEIF sentiment == "confused"}}
Provide clear, step-by-step explanations. Avoid jargon.
{{ELSEIF sentiment == "satisfied"}}
Maintain positive tone. Look for upsell opportunities.
{{ELSE}}
Use a neutral, professional tone.
{{ENDIF}}
```

#### Nested Conditionals

```
{{IF needs_translation}}
{{IF target_language == "es"}}
Respond in Spanish.
{{ELSEIF target_language == "fr"}}
Respond in French.
{{ELSE}}
Respond in English.
{{ENDIF}}
{{ENDIF}}
```

---

### 3. CASE/WHEN Blocks

Cleaner syntax when branching on a single variable's value:

```
{{CASE department}}
{{WHEN "billing"}}
You are a billing specialist. You can discuss invoices, payments, and refunds.
{{WHEN "technical"}}
You are a technical support engineer. You can troubleshoot issues and explain features.
{{WHEN "sales"}}
You are a sales representative. You can discuss pricing, plans, and upgrades.
{{DEFAULT}}
You are a general support agent. Route specialized questions to the appropriate team.
{{ENDCASE}}
```

**Key points:**
- Only the first matching `{{WHEN}}` executes
- `{{DEFAULT}}` handles unmatched values (optional)
- Values can be quoted (`"billing"`) or unquoted (`billing`)

---

### 4. FOR Loops

Iterate over arrays to build dynamic prompt sections:

#### Basic Loop

```
# Previous Tickets
{{FOR tickets AS ticket}}
[#${{ticket.id}}] ${{ticket.subject}} - ${{ticket.status}}
{{ENDFOR}}
```

#### Simple Array

```
Related topics: {{FOR topics AS t}}${{t}}, {{END}}
```

Output: `Related topics: authentication, password reset, 2FA,`

#### JSON Array Strings

FOR loops automatically parse JSON array strings:

```
# Variable: steps = '["Verify identity", "Check account status", "Process request"]'

{{FOR steps AS step}}
- ${{step}}
{{END}}
```

#### Default Alias

Without `AS`, use `this`:

```
{{FOR items}}
- ${{this}}
{{END}}
```

#### Syntax Variants

Both valid: `{{ENDFOR}}` or `{{END}}`

---

### 5. LIST_ITEM (Auto-Numbered Lists)

Generate numbered lists where items appear conditionally:

```
Before we proceed, I need to verify:
{{LIST_ITEM?needs_identity}}Your identity (last 4 of SSN or security question)
{{LIST_ITEM?needs_account}}Your account number or registered email
{{LIST_ITEM?needs_order}}The order number in question
{{LIST_ITEM}}Your preferred contact method for follow-up
```

With `needs_identity: "yes"`, `needs_account: ""`, `needs_order: "yes"`:

```
Before we proceed, I need to verify:
1. Your identity (last 4 of SSN or security question)
2. The order number in question
3. Your preferred contact method for follow-up
```

**Key behaviors:**
- Sequential numbering (skipped items don't create gaps)
- Counter resets after non-list content
- Omit condition for always-included items: `{{LIST_ITEM}}Always shown`

---

## Operators Reference

### Comparison Operators

| Operator | Aliases | Description |
|----------|---------|-------------|
| `==` | `equals`, `is` | Exact equality |
| `!=` | `not_equals`, `is_not` | Not equal |
| `contains` | — | Substring match |
| `not_contains` | — | No substring match |
| `starts_with` | — | Prefix match |
| `ends_with` | — | Suffix match |
| `not_empty` | `exists` | Has non-empty value |
| `empty` | `missing` | Is empty or missing |
| `length_gt` | — | Length greater than N |
| `length_lt` | — | Length less than N |
| `is_array` | — | Value is an array |
| `is_number` | — | Value is numeric |

### Boolean Operators

| Operator | Description |
|----------|-------------|
| `AND` | Both conditions must be true |
| `OR` | Either condition can be true |
| `( )` | Group conditions |

> **Precedence:** `AND` binds tighter than `OR`. Use parentheses to override.

### Truthiness

**Truthy:** Non-empty strings, numbers, arrays, objects

**Falsy:** Empty strings, whitespace-only, `null`, `undefined`, missing variables

---

## LLM Prompt Engineering Examples

### Example 1: Customer Support Ticket Router

Route and respond to support tickets based on classification and customer data:

```
# Role
{{CASE ticket_type}}
{{WHEN "billing"}}
You are a billing support specialist for ${{company_name}}.
{{WHEN "technical"}}
You are a technical support engineer for ${{company_name}}.
{{WHEN "account"}}
You are an account manager for ${{company_name}}.
{{DEFAULT}}
You are a customer support representative for ${{company_name}}.
{{ENDCASE}}

# Customer Context
- Name: ${{customer.name}}
- Account Type: ${{customer.plan}}
- Customer Since: ${{customer.created_at}}
{{IF customer.lifetime_value}}
- Lifetime Value: $${{customer.lifetime_value}}
{{ENDIF}}

{{IF is_vip_customer}}
**VIP CUSTOMER** - Prioritize resolution. Authorized for courtesy credits up to $100.
{{ENDIF}}

# Current Ticket
Subject: ${{ticket.subject}}
Message: ${{ticket.body}}

{{IF ticket.previous_messages}}
# Conversation History
{{FOR ticket.previous_messages AS msg}}
[${{msg.sender}}]: ${{msg.text}}
{{END}}
{{ENDIF}}

# Response Guidelines
{{LIST_ITEM}}Address the customer by name
{{LIST_ITEM?is_frustrated}}Acknowledge their frustration before problem-solving
{{LIST_ITEM}}Provide a clear resolution or next steps
{{LIST_ITEM?needs_escalation}}If unable to resolve, explain the escalation process
{{LIST_ITEM}}End with an offer for additional assistance
```

---

### Example 2: Data Extraction and Structuring

Extract structured data from unstructured text:

```
# Task
Extract structured information from the following ${{document_type}}.

# Source Document
${{raw_text}}

# Extraction Requirements
{{CASE document_type}}
{{WHEN "invoice"}}
Extract: vendor_name, invoice_number, date, line_items (array with description, quantity, unit_price), subtotal, tax, total, payment_terms
{{WHEN "resume"}}
Extract: name, email, phone, summary, work_experience (array with company, title, dates, achievements), education, skills
{{WHEN "contract"}}
Extract: parties (array), effective_date, termination_date, key_terms (array), obligations (array), signatures
{{WHEN "receipt"}}
Extract: merchant, date, items (array with name, price), payment_method, total
{{DEFAULT}}
Extract all identifiable entities, dates, monetary values, and key facts.
{{ENDCASE}}

{{IF extraction_schema}}
# Required Schema
Return data matching this exact structure:
${{extraction_schema}}
{{ENDIF}}

# Output Format
Return valid JSON only. No explanation or markdown.
{{IF include_confidence}}
Include a "confidence" field (0-1) for each extracted value.
{{ENDIF}}
```

---

### Example 3: Meeting Notes Processor

Transform raw meeting transcripts into structured notes:

```
# Task
Process this meeting transcript and generate structured notes.

# Meeting Metadata
- Date: ${{meeting_date}}
- Duration: ${{duration_minutes}} minutes
- Attendees: {{FOR attendees AS person}}${{person.name}} (${{person.role}}), {{END}}

# Transcript
${{transcript}}

# Output Requirements
Generate the following sections:

{{LIST_ITEM}}**Summary** - 2-3 sentence overview of the meeting
{{LIST_ITEM}}**Key Discussion Points** - Main topics covered
{{LIST_ITEM}}**Decisions Made** - Any conclusions or agreements reached
{{LIST_ITEM?extract_action_items}}**Action Items** - Tasks assigned, with owner and deadline if mentioned
{{LIST_ITEM?extract_blockers}}**Blockers/Concerns** - Issues raised that need resolution
{{LIST_ITEM?extract_followups}}**Follow-up Items** - Topics deferred to future discussions

{{IF output_format == "markdown"}}
Format using markdown with headers and bullet points.
{{ELSEIF output_format == "slack"}}
Format for Slack with emoji indicators (✅ decisions, 📋 action items, ⚠️ blockers).
{{ELSE}}
Format as plain text with clear section headers.
{{ENDIF}}

{{IF attendee_specific}}
At the end, include a section for each attendee listing their specific action items.
{{ENDIF}}
```

---

### Example 4: Dynamic Email Composer

Generate contextual emails based on trigger events:

```
# Task
Write an email for the following scenario.

# Email Type: ${{email_type}}

{{CASE email_type}}
{{WHEN "welcome"}}
Write a warm welcome email for a new ${{plan_type}} customer. Highlight key features and include getting started steps.
{{WHEN "churn_risk"}}
Write a re-engagement email. The customer hasn't logged in for ${{days_inactive}} days. Offer value without being pushy.
{{WHEN "upgrade_prompt"}}
Write a soft upsell email. The customer has hit ${{usage_percentage}}% of their ${{current_plan}} limits. Highlight benefits of ${{suggested_plan}}.
{{WHEN "renewal_reminder"}}
Write a renewal reminder. Their ${{plan_type}} subscription expires in ${{days_until_expiry}} days.
{{WHEN "feedback_request"}}
Write a feedback request email. They completed ${{action_completed}} recently.
{{ENDCASE}}

# Customer Data
- Name: ${{customer.first_name}} ${{customer.last_name}}
- Company: ${{customer.company}}
- Account Age: ${{customer.account_age_days}} days

{{IF customer.recent_activity}}
# Recent Activity
{{FOR customer.recent_activity AS activity}}
- ${{activity.date}}: ${{activity.description}}
{{END}}
{{ENDIF}}

# Tone & Style
{{IF brand_voice}}
Brand Voice: ${{brand_voice}}
{{ELSE}}
Use a friendly, professional tone.
{{ENDIF}}

{{IF include_cta}}
Include a clear call-to-action: ${{cta_text}}
CTA Link: ${{cta_url}}
{{ENDIF}}

# Constraints
- Subject line: Max 50 characters, compelling
- Body: ${{max_paragraphs}} paragraphs maximum
{{IF avoid_words}}
- Avoid these words: ${{avoid_words}}
{{ENDIF}}
```

---

### Example 5: Code Generation Assistant

Generate code based on specifications and context:

```
# Task
Generate ${{language}} code for the following requirement.

# Requirement
${{requirement_description}}

{{IF existing_code}}
# Existing Code Context
```${{language}}
${{existing_code}}
```
{{ENDIF}}

{{IF api_docs}}
# Relevant API Documentation
${{api_docs}}
{{ENDIF}}

# Technical Constraints
{{LIST_ITEM}}Language: ${{language}} ${{language_version}}
{{LIST_ITEM?framework}}Framework: ${{framework}}
{{LIST_ITEM?style_guide}}Follow style guide: ${{style_guide}}
{{LIST_ITEM?max_complexity}}Maximum cyclomatic complexity: ${{max_complexity}}
{{LIST_ITEM}}Include error handling for edge cases

{{IF dependencies}}
# Available Dependencies
{{FOR dependencies AS dep}}
- ${{dep.name}} (${{dep.version}}): ${{dep.purpose}}
{{END}}
{{ENDIF}}

# Output Requirements
{{CASE output_type}}
{{WHEN "function"}}
Generate a single function with docstring/JSDoc comments.
{{WHEN "class"}}
Generate a class with appropriate methods and documentation.
{{WHEN "module"}}
Generate a complete module with exports and internal helpers.
{{WHEN "test"}}
Generate unit tests covering happy path and edge cases.
{{ENDCASE}}

{{IF include_tests}}
Include unit tests using ${{test_framework}}.
{{ENDIF}}

{{IF include_types}}
Include full type annotations/interfaces.
{{ENDIF}}

Return only the code. No explanations unless as code comments.
```

---

### Example 6: Multi-Source Data Analysis

Analyze data from multiple sources and generate insights:

```
# Role
You are a data analyst for ${{department}} at ${{company_name}}.

# Analysis Request
${{analysis_question}}

# Data Sources
{{FOR data_sources AS source}}
## ${{source.name}} (${{source.type}})
${{source.data}}

{{END}}

{{IF time_range}}
# Time Range
Analyze data from ${{time_range.start}} to ${{time_range.end}}.
{{ENDIF}}

# Analysis Requirements
{{CASE analysis_type}}
{{WHEN "trend"}}
Identify trends, patterns, and anomalies. Note any seasonality or cyclical behavior.
{{WHEN "comparison"}}
Compare across the provided dimensions. Highlight significant differences and similarities.
{{WHEN "forecast"}}
Based on historical patterns, project likely outcomes for ${{forecast_period}}.
{{WHEN "diagnostic"}}
Investigate root causes for ${{metric_of_interest}}. Consider all contributing factors.
{{DEFAULT}}
Provide a comprehensive analysis covering trends, outliers, and actionable insights.
{{ENDCASE}}

{{IF benchmark_data}}
# Benchmarks for Comparison
${{benchmark_data}}
{{ENDIF}}

# Output Format
{{IF executive_summary}}
Start with a 2-3 sentence executive summary for leadership.
{{ENDIF}}

Structure your analysis as:
{{LIST_ITEM}}Key Findings (most important insights first)
{{LIST_ITEM}}Supporting Data (specific numbers and evidence)
{{LIST_ITEM?include_visualizations}}Suggested Visualizations (describe charts that would illustrate findings)
{{LIST_ITEM}}Recommendations (actionable next steps)
{{LIST_ITEM?include_caveats}}Caveats and Limitations (data quality issues, assumptions made)

{{IF audience == "technical"}}
Include statistical measures and methodology notes.
{{ELSEIF audience == "executive"}}
Focus on business impact. Minimize technical jargon.
{{ENDIF}}
```

---

## Tips & Best Practices

### Prompt Engineering Tips

1. **Modular sections** — Use `{{IF}}` blocks to create reusable prompt templates that adapt to different contexts

2. **Graceful degradation** — Always wrap optional context in conditionals so prompts work even with missing data:
   ```
   {{IF context}}
   # Context
   ${{context}}
   {{ENDIF}}
   ```

3. **Use CASE for personas** — Switch entire prompt personalities based on a single variable:
   ```
   {{CASE persona}}
   {{WHEN "teacher"}}You explain concepts patiently with examples...
   {{WHEN "expert"}}You provide technical, precise responses...
   {{ENDCASE}}
   ```

4. **Dynamic few-shot examples** — Use FOR loops to inject relevant examples:
   ```
   {{FOR examples AS ex}}
   Input: ${{ex.input}}
   Output: ${{ex.output}}
   
   {{END}}
   ```

### Technical Tips

5. **Check metadata** — Use `missing_variables` output to catch typos and missing mappings

6. **Test incrementally** — Build complex templates section by section

7. **Quote string comparisons** — Use `{{IF status == "active"}}` for clarity

8. **Mind whitespace** — The resolver normalizes excessive blank lines automatically

---

## Development

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Building

```bash
npm run build
npm pack
```

---

## License

MIT