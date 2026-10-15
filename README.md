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

The `??` default also accepts a variable that is missing in strict mode, which the [`default` filter](#filters-name--filter) does not: `${{name | default="x"}}` is still a `missing-variable` error when `name` is missing in strict mode.

---

### Filters: `${{name | filter}}`

Transform values before output.

| Filter | Example | Description |
| --- | --- | --- |
| `head=N` | `${{text \| head=100}}` | First N characters; a negative N drops the last \|N\| characters |
| `tail=N` | `${{text \| tail=50}}` | Last N characters; a negative N drops the first \|N\| characters |
| `trim` | `${{text \| trim}}` | Leading and trailing whitespace removed |
| `escape_md[=inline\|block]` | `${{note \| escape_md=block}}` | Markdown special characters escaped with a backslash (inline, the default); block also escapes line starts that would read as structure: headings, quotes, list markers, tables, rules and fences |
| `fence[=lang]` | `${{code \| fence=ts}}` | The value in a code fence of at least three backticks, longer than any backtick run inside it, with the optional language; one leading and one trailing line break of the value are removed |
| `heading_offset=N` | `${{doc \| heading_offset=2}}` | Markdown ATX headings shifted by N levels (negative N shifts up), clamped to 1-6; headings inside fenced code are untouched |
| `upper` | `${{name \| upper}}` | Text in upper case |
| `lower` | `${{name \| lower}}` | Text in lower case |
| `title` | `${{name \| title}}` | First letter of each whitespace-separated word in upper case, the rest in lower case |
| `replace:find="a",with="b"` | `${{text \| replace:find="a",with="b"}}` | Every occurrence of the literal text find replaced by with (empty when omitted); find is required and never read as a pattern |
| `indent[=N]` | `${{text \| indent=4}}` | N spaces (default 2, from 0 to 100) added at the start of every non-empty line; line breaks are kept |
| `quote` | `${{text \| quote}}` | Text as a JSON double-quoted string, with quotes, backslashes and control characters escaped |
| `round[=N]` | `${{price \| round=2}}` | A number rounded half away from zero to exactly N decimal places (default 0, up to 20); anything that is not a finite number is left as it is |
| `default="x"` | `${{nick \| default="n/a"}}` | The given value when the input is missing, null, empty or whitespace-only text, the text 0, false or no (any letter case), the number 0, false, an empty list or an empty object; otherwise the input |
| `join=SEP` | `${{tags \| join=", "}}` | Items joined with SEP, each as the output step prints it |
| `length` | `${{tags \| length}}` | Items of a list, UTF-16 code units of a text, keys of an object |
| `first` | `${{tags \| first}}` | First item of a list, empty when there is none |
| `last` | `${{tags \| last}}` | Last item of a list, empty when there is none |
| `sort[=key]` | `${{items \| sort=name}}` | Stable sort: numbers, then strings, then the rest; sort=key orders objects by that key |
| `unique` | `${{tags \| unique}}` | List with the first occurrence of each value, order kept |
| `slice[:start=N,end=N]` | `${{tags \| slice:start=1,end=3}}` | Part of a list from start up to end; negative counts from the end |
| `lines` | `${{text \| lines}}` | Text split on line breaks into a list |
| `json` | `${{config \| json}}` | Compact JSON text with object keys in stable order |

**Chain multiple filters:**

```
${{description | trim | head=200 | escape_md}}
```

**Arguments.** A filter is written `name`, `name=value` (the one parameter of the filter) or `name:key=value,key=value` (named parameters). A value in quotes keeps any `=`, `,` and `:` inside it, so `join="a=b"` and `replace:find="a,b",with="x=y"` each read as one value.

```console
$ cat args.tpl
${{a | replace:find="a,b",with="x=y"}}
${{b | join=": "}}
${{c | join="a=b"}}
$ template-resolver render args.tpl --data args.json
1 x=y 2
p: q
xa=by
```

With `args.json` holding `{"a": "1 a,b 2", "b": ["p", "q"], "c": ["x", "y"]}`.

**Filter errors.** A filter that is not in the table, a parameter the filter does not declare and a bad parameter value are each a located error, in strict mode and with it off alike; `validate` and `analyze` report the first two without data.

```console
$ printf '${{a | shout}}\n' > bad.tpl
$ template-resolver render bad.tpl --data a.json
bad.tpl:1:1: error unknown-filter: Unknown filter: shout
$ printf '${{a | escape_md:mode=block}}\n' > bad.tpl
$ template-resolver render bad.tpl --data a.json --no-strict
bad.tpl:1:1: error type-error: Filter escape_md has no parameter 'mode' (accepts: value)
$ printf '${{a | indent=500}}\n' > bad.tpl
$ template-resolver render bad.tpl --data a.json
bad.tpl:1:1: error type-error: indent requires a whole number from 0 to 100 (e.g., indent=2), got 500
```

With `a.json` holding `{"a": "hi"}`.

**Lists.** `sort`, `unique`, `slice` and `lines` return a list: printed on its own it is compact JSON, and a filter after it receives the list.

```console
$ cat lists.tpl
${{tags | sort}} ${{tags | sort | first}} ${{tags | unique | join="+"}}
$ template-resolver render lists.tpl --data tags.json
["apple","apple","pear"] apple pear+apple
```

With `tags.json` holding `{"tags": ["pear", "apple", "apple"]}`.

**`default` and `round`.** `default="x"` replaces a value that is not truthy by the [truthiness rules](#truthiness) (missing, empty, `0`, `false`, an empty list), but in strict mode a missing variable is still a `missing-variable` error before `default` runs; use it for empty values, or turn strict mode off, or use `??`, which also accepts a missing variable in strict mode. `round=N` rounds half away from zero on the digits of the number, so `1.005` with `round=2` is `1.01`.

```console
$ cat round.tpl
${{price | round=2}} ${{price | round}} ${{n | default="none"}} ${{gone ?? "x"}}
$ template-resolver render round.tpl --data round.json
1.01 1 none x
$ printf '${{gone | default="x"}}\n' > gone.tpl
$ template-resolver render gone.tpl
gone.tpl:1:1: error missing-variable: Variable 'gone' not found
$ template-resolver render gone.tpl --no-strict
x
```

With `round.json` holding `{"price": 1.005, "n": 0}`.

**All the filters at once.** This template calls every filter once and then branches with the [`between`](#membership-range-and-length) operator and the [WHEN comparison](#casewhen-case):

````
head: ${{summary | head=11}}
tail: ${{summary | tail=6}}
trim: [${{padded | trim}}]
escape_md: ${{note | escape_md}}
upper: ${{name | upper}}
lower: ${{name | lower}}
title: ${{name | title}}
replace: ${{name | replace:find="a",with="4"}}
quote: ${{name | quote}}
round: ${{price | round=2}}
default: ${{nick | default="n/a"}}
join: ${{tags | join=", "}}
length: ${{tags | length}}
first: ${{tags | first}}
last: ${{tags | last}}
sort: ${{tags | sort}}
unique and join: ${{dupes | unique | join="+"}}
slice: ${{tags | slice:start=1,end=3}}
lines: ${{poem | lines}}
json: ${{config | json}}
indent:
${{poem | indent=2}}
fence:
${{code | fence=js}}
heading_offset:
${{doc | heading_offset=1}}
{{IF tags.length > 2 AND level between [1, 5]}}
Many tags at a usable level.
{{END_IF}}
{{CASE level}}
{{WHEN 1, 2}}
Level: low
{{WHEN >= 3}}
Level: high
{{END_CASE}}
````

With this data:

```json
{
  "summary": "Release notes for the spring update",
  "padded": "  ready  ",
  "note": "Use *bold* and _italic_",
  "name": "ada lovelace",
  "price": 1.005,
  "nick": "",
  "tags": ["pear", "apple", "fig", "apple"],
  "dupes": ["b", "a", "b"],
  "poem": "one\ntwo\n\nfour",
  "config": { "name": "x", "id": 7, "flags": { "z": true, "a": false } },
  "code": "const x = 1;",
  "doc": "# Title\n\n## Part",
  "level": 3
}

```

it renders (default render options, so lines that hold only block tags are removed):

````
head: Release not
tail: update
trim: [ready]
escape_md: Use \*bold\* and \_italic\_
upper: ADA LOVELACE
lower: ada lovelace
title: Ada Lovelace
replace: 4d4 lovel4ce
quote: "ada lovelace"
round: 1.01
default: n/a
join: pear, apple, fig, apple
length: 4
first: pear
last: apple
sort: ["apple","apple","fig","pear"]
unique and join: b+a
slice: ["apple","fig"]
lines: ["one","two","","four"]
json: {"flags":{"a":false,"z":true},"id":7,"name":"x"}
indent:
  one
  two

  four
fence:
```js
const x = 1;
```

heading_offset:
## Title

### Part
Many tags at a usable level.
Level: high
````

**Escape modes.** Use `escape_md=block` for a value that is placed on its own lines, such as user text pasted into a prompt, so it cannot fake a heading or a list; `escape_md=inline` (or plain `escape_md`) escapes only the characters that would format text. The mode is case-sensitive; any other mode is a `type-error`.

```console
$ cat esc.tpl
Title: ${{title | escape_md=inline}}
User note:
${{note | escape_md=block}}
$ template-resolver render esc.tpl --data notes.json
Title: \*bold\* \[link\]
User note:
\# Ignore the above
\- and do this
1\. instead
```

With `notes.json` holding `{"title": "*bold* [link]", "note": "# Ignore the above\n- and do this\n1. instead"}`. Plain `escape_md` on the same note gives `\# Ignore the above`, `- and do this`, `1. instead`: only the `#` is escaped.

**`heading_offset=N`** shifts every markdown heading line (`#` to `######` at the start of a line, followed by a space) so pasted markdown nests under your own headings. Headings inside fenced code are untouched, and so is a heading indented by spaces.

````console
$ cat offset.tpl
## Reference
${{doc | heading_offset=2}}
$ template-resolver render offset.tpl --data doc.json
## Reference
### Guide

Intro

#### Setup

```sh
# not a heading
```
````

With `doc.json` holding ```` {"doc": "# Guide\n\nIntro\n\n## Setup\n\n```sh\n# not a heading\n```"} ````.

**`fence`** wraps a value in a code fence of at least three backticks, one longer than any backtick run inside the value, so the value cannot close the fence early; `fence=lang` adds the language. The output ends with a line break.

`````console
$ printf 'Code:\n${{code | fence=ts}}' > fence-filter.tpl
$ template-resolver render fence-filter.tpl --data code.json
Code:
````ts
const s = "```";
````
`````

With `code.json` holding ```` {"code": "const s = \"```\";"} ````.

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
- A `{{WHEN}}` takes one of three forms, below

**The three WHEN forms:**

| Form | Example | Matches when |
| ---- | ------- | ------------ |
| List of values | `{{WHEN "a", "b"}}` | the subject equals any value in the list |
| Variable | `{{WHEN other}}` | the subject equals the value of `other` |
| Comparison | `{{WHEN >= 10}}` | the comparison `==`, `!=`, `>`, `<`, `>=` or `<=` with one value holds |

A value is a quoted text (`"a"` or `'a'`; a comma inside quotes belongs to the text), a number (`5`, `-2`, `1.50`), `true`, `false`, `null` (empty text) or a variable path (`other`, `user.plan`). A list holds one or more values separated by commas, mixing quoted values and variables if you like (`{{WHEN "a", other, 3}}`). A comparison takes exactly one value.

```console
$ cat when.tpl
{{CASE plan}}
{{WHEN "free", "trial"}}
Limited
{{END_WHEN}}
{{WHEN other}}
Same as other
{{END_WHEN}}
{{WHEN >= 10}}
Big
{{END_WHEN}}
{{DEFAULT}}
Other
{{END_DEFAULT}}
{{END_CASE}}
$ echo '{"plan": "trial", "other": "x"}' > plan.json
$ template-resolver render when.tpl --data plan.json
Limited
$ echo '{"plan": "x", "other": "x"}' > plan.json
$ template-resolver render when.tpl --data plan.json
Same as other
$ echo '{"plan": 12, "other": "x"}' > plan.json
$ template-resolver render when.tpl --data plan.json
Big
```

**Matching.** The subject and every value are compared as the equality rule of the [operators](#equality) says: when either side is a quoted text, both compare as text (`{{WHEN "1"}}` does not match `1.0`); otherwise numeric texts compare as numbers (`{{WHEN 1}}` matches `1.0` and `"01"`) and anything else as text. A variable counts as unquoted. `!=` is the negation of `==`. A null subject, or a missing one with strict mode off, is empty text, which `{{WHEN ""}}` matches. The comparison operators `>`, `<`, `>=` and `<=` need numbers on both sides: a side that is not numeric (empty text for a missing value included) is a located `type-error`, not "no match".

```console
$ echo '{"plan": "zz", "other": "x"}' > plan.json
$ template-resolver render when.tpl --data plan.json
when.tpl:8:1: error type-error: Cannot use operator '>=' with non-numeric values: "zz" >= "10"
```

**Variables that are missing.** A variable in a `{{WHEN}}` is looked up like the subject: a missing one is a `missing-variable` error in strict mode, located at the `{{WHEN}}`, and empty text with strict mode off. The error is raised only when matching reaches that `{{WHEN}}`.

```console
$ echo '{"plan": "5"}' > plan.json
$ template-resolver render when.tpl --data plan.json
when.tpl:5:1: error missing-variable: Variable 'other' not found
$ template-resolver render when.tpl --data plan.json --no-strict
Other
```

**Syntax errors.** These are `syntax-error` diagnostics located at the `{{WHEN}}` tag, in every mode, even in a branch that never renders: nothing after `WHEN`, an empty list item (`{{WHEN "a",}}`), an unterminated quote, a value that is neither a literal nor a variable path (`{{WHEN a b}}`), and a comparison with no value, with several values (`{{WHEN >= 1, 2}}`) or after a list item (`{{WHEN "a", > 5}}`).

```console
$ printf '{{CASE n}}{{WHEN >= 1, 2}}a{{END_WHEN}}{{END_CASE}}\n' > bad-when.tpl
$ template-resolver render bad-when.tpl --data n.json
bad-when.tpl:1:11: error syntax-error: '>=' in {{WHEN}} takes exactly one value
```

With `n.json` holding `{"n": 1}`.

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

### Whitespace: standalone tag lines and trim markers

**The standalone rule.** A line that holds only block tags and whitespace is removed together with its line break, so block tags on their own lines leave no blank lines behind. It covers IF, ELSEIF, ELSE, CASE, WHEN, DEFAULT, FOR, SECTION, FENCE, RAW, their END tags and comments. LIST, TABLE and their parts keep their own spacing, and a line that also holds text or a variable is untouched.

```console
$ cat standalone.tpl
Intro
{{IF vip}}
VIP customer
{{END_IF}}
Outro
$ template-resolver render standalone.tpl --data vip.json
Intro
VIP customer
Outro
$ template-resolver render standalone.tpl --data vip.json --no-standalone-lines
Intro

VIP customer

Outro
```

With `vip.json` holding `{"vip": true}`. The rule is on by default everywhere; turn it off with the `standaloneLines: false` render option, `options.standaloneLines` in the HTTP API, `--no-standalone-lines` on the command line, or by disabling **Remove Standalone Tag Lines** in the n8n node.

**Trim markers.** `{{- TAG}}` removes all whitespace (spaces, tabs, line breaks) before the tag, and `{{TAG -}}` all whitespace after it; comments take `{{-# ... #-}}`. Markers work whether the standalone rule is on or off. They apply first; a tag line whose line break before it was trimmed then shares its line with the preceding text, so it is no longer standalone and its own line break stays:

```console
$ cat trim.tpl
Tags:
{{- FOR tags AS t}} ${{t}}{{END_FOR}}
$ template-resolver render trim.tpl --data tags.json
Tags: api llm
$ cat trim-both.tpl
[
  {{- FOR xs AS x -}}
  ${{x}},
  {{- END_FOR -}}
]
$ template-resolver render trim-both.tpl --data xs.json
[1,2,3,]
```

With `tags.json` holding `{"tags": ["api", "llm"]}` and `xs.json` holding `{"xs": [1, 2, 3]}`.

---

### Literal text: `{{RAW}}` and `\{{`

`{{RAW}}...{{END_RAW}}` outputs its content literally: tags, variables and comments inside are not interpreted. A backslash right before `{{` escapes it: `\{{` outputs a literal `{{` and the backslash is consumed. `\\{{` outputs one literal backslash followed by an active tag. A backslash anywhere else is ordinary text.

```console
$ cat raw.tpl
Write a template like this:
{{RAW}}
Hello ${{name}}! {{IF vip}}VIP{{END_IF}}
{{END_RAW}}
Inline: \{{IF x}} is not a tag, ${{name}} is a variable.
$ template-resolver render raw.tpl --data name.json
Write a template like this:
Hello ${{name}}! {{IF vip}}VIP{{END_IF}}
Inline: {{IF x}} is not a tag, Alice is a variable.
$ cat path.tpl
Path: C:\\{{IF x}}yes{{END_IF}}
$ template-resolver render path.tpl --data x.json
Path: C:\yes
```

With `name.json` holding `{"name": "Alice"}` and `x.json` holding `{"x": true}`.

---

### Sections: `{{SECTION}}`

`{{SECTION "Title" level=2}}...{{END_SECTION}}` outputs a markdown heading (`level` 1 to 6, default 2), a blank line and the body with its leading and trailing blank lines trimmed. The title is a quoted string or a variable path. When the body renders empty, the whole section is omitted and `stats.sectionsOmitted` counts it; `skip_empty=false` keeps the heading of an empty section instead. An omitted section removes only its own output: the blank lines the template holds around it stay.

```console
$ cat section.tpl
{{SECTION "Context"}}
${{context}}
{{END_SECTION}}

{{SECTION "Examples" level=3}}
{{FOR examples AS e}}
- ${{e}}
{{END_FOR}}
{{END_SECTION}}

{{SECTION "Notes" skip_empty=false}}
${{notes ?? ""}}
{{END_SECTION}}
$ template-resolver render section.tpl --data section.json
## Context

The user asks about billing.


## Notes
```

With `section.json` holding `{"context": "The user asks about billing.", "examples": []}`: the empty Examples section is omitted (its surrounding blank lines remain) and `--json` reports `"sectionsOmitted": 1`.

---

### Code fences: `{{FENCE}}`

`{{FENCE lang="ts"}}...{{END_FENCE}}` wraps its rendered body in a code fence of at least three backticks, one longer than any backtick run inside the body, so pasted code cannot close the fence early. `lang` is optional and takes a quoted string or a variable path. One leading and one trailing line break of the body are removed.

`````console
$ cat fence.tpl
Review this file:
{{FENCE lang="ts"}}
${{code}}
{{END_FENCE}}
$ template-resolver render fence.tpl --data code.json
Review this file:
````ts
const s = "```";
````
`````

With `code.json` as in the `fence` filter example above.

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

**Printing.** A result prints with at most 15 significant digits, so `0.1 + 0.2` prints `0.3` and `1 / 3` prints `0.333333333333333`. Integers of any size and negative numbers print unchanged.

**Names with a hyphen.** A hyphen between two letters is part of a name: `${{first-name}}` reads the variable `first-name`. Arithmetic needs spaces around the minus (`a - b`); `n-1`, `x1-y` and `1-a` are arithmetic too, because a digit sits next to the hyphen. A missing hyphenated name in strict mode is a `missing-variable` error whose suggestion shows the spaced form (`If you meant subtraction, write 'first - name'`).

```console
$ cat math.tpl
Sum: ${{a + b}}
Third: ${{1 / 3}}
Name: ${{first-name}}, difference: ${{a - b}}
$ template-resolver render math.tpl --data math.json
Sum: 0.3
Third: 0.333333333333333
Name: Ada, difference: -0.1
```

With `math.json` holding `{"a": 0.1, "b": 0.2, "first-name": "Ada"}`.

**Errors in math.** These are located `type-error` diagnostics (the position of the variable placeholder) in every mode, strict or not:

- A zero divisor: `/` or `%` by zero, `0 / 0` and a divisor that computes to zero.
- A malformed expression, whatever the data holds: `(1 + 2`, `1 +`, `1 + * 2` and `2 $ 3`. With strict mode off it is an error too, not empty output. A well-formed expression that names a missing or non-numeric variable stays missing data: empty with strict mode off. A missing name with an odd character (`a:b`, `Order #`) is plain missing data, not math.
- A value that has no text form (a cyclic object or array, or a BigInt) used as output, as a `CASE` subject or before a filter that turns its value into text. `null` and a missing value still print as empty.

```console
$ cat zero.tpl
Ratio: ${{a / b}}
$ template-resolver render zero.tpl --data zero.json
zero.tpl:1:8: error type-error: Cannot divide by zero in math expression
$ printf '${{(a + b}}\n' > bad-math.tpl
$ template-resolver render bad-math.tpl --data math.json --no-strict
bad-math.tpl:1:1: error type-error: Unmatched parentheses in math expression
$ printf 'Total: ${{total * }}\n' > bad-math2.tpl
$ template-resolver render bad-math2.tpl --data math.json --no-strict
bad-math2.tpl:1:8: error type-error: Invalid math expression
```

With `zero.json` holding `{"a": 1, "b": 0}`.

**`render` only.** The zero divisor, the malformed expression, the unprintable value and the 15-digit printing apply to `render`: the command line, the HTTP API, the n8n node and core's `render`. Core's `resolveTemplate` keeps its old output for these (`Infinity`, `NaN` and the plain number), as it does for `standaloneLines`. The hyphenated names and the condition operators are the same in both.

```console
$ node -e '
const { render, resolveTemplate } = require("./dist/core/src");
const data = { a: 1, b: 0 };
console.log(JSON.stringify(resolveTemplate("${{a / b}} ${{a % b}} ${{0.1 + 0.2}}", new Map(Object.entries(data)))));
const r = render("${{a / b}}", data);
console.log(r.ok, r.diagnostics[0].code);
const loop = {}; loop.self = loop;
const c = render("${{loop}}", { loop });
console.log(c.ok, c.diagnostics[0].message);
'
"Infinity NaN 0.30000000000000004"
false type-error
false Cannot print a value with no text form (a cyclic structure or a BigInt)
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

### Equality

`==` and `!=` follow one rule, also used by the items of `in` and by [`{{WHEN}}`](#casewhen-case): when either side is a quoted literal, both sides compare as text; otherwise two numbers compare numerically and anything else compares as text. So `z == "01234"` is false when `z` is `1234` (the text `1234` is not `01234`), while `z == 1234` is true.

```console
$ cat eq.tpl
{{IF z == "01234"}}text match{{ELSE}}no text match{{END_IF}}
{{IF z == 1234}}number match{{ELSE}}no number match{{END_IF}}
{{IF z == "1234"}}text equal{{END_IF}}
$ template-resolver render eq.tpl --data eq.json
no text match
number match
text equal
```

With `eq.json` holding `{"z": 1234}`.

### Membership, range and length

| Operator     | Example                        | Description                                                      |
| ------------ | ------------------------------ | ---------------------------------------------------------------- |
| `in`         | `role in ["admin", "owner"]`   | The left side is one of the items of a list, or a substring of a text |
| `not in`     | `role not in allowed`          | The exact negation of `in`                                       |
| `between`    | `score between [1, 10]`        | A number from the first to the second bound, both included       |
| `.length`    | `tags.length > 2`              | Count of items of an array, or characters of a text              |

- **`in` and `not in`** take a list literal in brackets (items are literals or variable paths separated by commas; `[]` is empty), a variable that holds a list, or a text (a quoted text or a variable holding one: a case-sensitive substring test). Items are compared by the [equality rule](#equality). A missing or null value on either side is not in the list (`not in` is true). The words are case-insensitive.
- **`between [lo, hi]`** takes exactly two numbers or numeric texts (a boolean is not numeric here) and includes both ends; `lo` above `hi` is false. Anything else, such as a missing or non-numeric bound, a list that is not two items or a right side that is not a list literal, is a `type-error`. There is no `not between`: write `NOT (n between [1, 10])`.
- **`.length`** is a path segment after any value: an array gives its element count and a text gives its length in UTF-16 code units (an emoji counts 2, as with the `length` filter). Any other value, or missing data, stays null, so no zero appears from nowhere. It works in conditions, in output (`${{tags.length}}`), in math and after other segments (`user.tags.length`). A variable that is itself named `length` is an ordinary variable.

```console
$ cat ops.tpl
{{IF role in ["admin", "owner"]}}staff{{ELSE}}guest{{END_IF}}
{{IF role in allowed}}allowed{{ELSE}}not allowed{{END_IF}}
{{IF role not in allowed}}not in the list{{END_IF}}
{{IF "ell" in word}}substring{{END_IF}}
{{IF score between [1, 10]}}in range{{ELSE}}out of range{{END_IF}}
{{IF tags.length > 2}}many tags{{END_IF}}
Tags: ${{tags.length}}, name: ${{name.length}}
$ template-resolver render ops.tpl --data ops.json
staff
not allowed
not in the list
substring
in range
many tags
Tags: 3, name: 5
```

With `ops.json` holding `{"role": "owner", "allowed": ["a", "b"], "word": "hello", "score": 10, "tags": ["x", "y", "z"], "name": "Alice"}`.

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
| `&&`     | `a && b`         | The same as `AND`  |
| `\|\|`   | `a \|\| b`       | The same as `OR`   |
| `!`      | `!expired`       | The same as `NOT`  |
| `()`     | `(a AND b) OR c` | Grouping           |

`&&`, `||` and `!` are spellings of `AND`, `OR` and `NOT`:

```console
$ cat logic.tpl
{{IF a && !b}}1{{END_IF}}{{IF b || a}}2{{END_IF}}{{IF !(a && b)}}3{{END_IF}}
$ template-resolver render logic.tpl --data logic.json
123
```

With `logic.json` holding `{"a": true, "b": false}`.

### Unknown words

A condition that holds a word the engine does not know is an error in every mode: `{{IF a like b}}` and `{{IF a matches "x"}}` are a located `type-error`, also in a branch that `AND` or `OR` would skip. There is no `matches` operator, and no pattern in a template is ever compiled. `validate` and `analyze` report the same condition as a warning (`analysis-warning`, `unrecognized-condition`) so that a template can be checked without data.

```console
$ cat like.tpl
{{IF status is active}}Active{{END_IF}}
$ template-resolver render like.tpl --data logic.json --no-strict
like.tpl:1:1: error type-error: Unrecognized condition: status is active
```

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
| **Remove Standalone Tag Lines** | Remove lines that hold only block tags (default: on); see [Whitespace](#whitespace-standalone-tag-lines-and-trim-markers) |
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

Every render, whether through the command line (`--json`), the HTTP API (`POST /v1/render`) or core's `render(template, data, options)`, returns the same object. Template and data problems never throw; they come back in the result. Core's render options include `strictMode` (default `true`), `standaloneLines` (default `true`, see [Whitespace](#whitespace-standalone-tag-lines-and-trim-markers)) and `limits`.

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
| `stats.sectionsOmitted` | Number of `SECTION` blocks omitted because their body rendered empty                     |
| `stats.iterations`      | FOR iterations run in total, also reported when the render failed                        |
| `diagnostics`           | On failure, one diagnostic: the error that stopped rendering                             |

`validate` returns `{ ok, diagnostics }`, where `ok` is `false` only when some diagnostic is an error; warnings leave it `true`.

### Diagnostics

Render and validate results (`render`, `validate`, `POST /v1/render`, `POST /v1/validate`) carry diagnostics of the shape `{ severity, code, message, line, column, suggestion? }`; `analyze` results use a smaller shape, described [below](#analysis-diagnostics). `severity` is `"error"` or `"warning"`; `line` and `column` are 1-based and point at the template tag or placeholder that failed, including runtime errors such as a missing variable or a bad filter parameter. `suggestion` is present when the engine has a hint.

| Code               | Severity | When                                                                                                   |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| `syntax-error`     | error    | The template does not parse: unknown tag, unclosed block, bad `FOR` or `WHEN` syntax, stray `END_*`   |
| `type-error`       | error    | An operation fails on its values: non-numeric comparison or math, a division or remainder by zero, a malformed math expression, a value with no text form (a cyclic object or a BigInt), an unrecognized word in a condition, a bad or undeclared filter parameter, non-array `FOR` in strict mode |
| `missing-variable` | error    | Strict mode and a placeholder reads a variable that is not in the data and has no `??` default         |
| `unknown-filter`   | error    | A filter that is not in the [filter table](#filters-name--filter)                                       |
| `limit-iterations` | error    | FOR loops ran more than `maxIterations` iterations in total                                            |
| `limit-output`     | error    | The output grew past `maxOutputChars`                                                                  |
| `limit-depth`      | error    | Blocks nest deeper than `maxDepth`                                                                     |
| `limit-nodes`      | error    | The template holds more than `maxNodes` nodes (a text run, a placeholder or a block each count one)   |
| `invalid-input`    | error    | Core `render` was given data that is not an object (the CLI and the API reject such data before rendering) |
| `analysis-warning` | warning  | `validate` only: a condition the engine cannot read, such as `{{IF status is active}}` (`render` reports it as a `type-error`) |

#### Analysis diagnostics

`analyze` (`template-resolver analyze` and `POST /v1/analyze`) reports diagnostics as `{ code, message, line, column }`, with no `severity` and no `suggestion`. Its codes:

| Code                     | When                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `unknown-filter`         | A filter that is not in the [filter table](#filters-name--filter)                            |
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
| `maxNodes`       | 20000     | Size of the template: the nodes counted while it is parsed (each run of text, each placeholder and each block counts one; also applied by validate and analyze) | `limit-nodes`      |

The command line sets them with `--max-iterations`, `--max-output-chars`, `--max-depth` and `--max-nodes`; the HTTP API with `options.limits` (a request can only lower the server's limits). `template-resolver spec` and `GET /v1/spec` report the defaults.

The `limit-nodes` error is located at the node that crossed the limit, so it points at the place where the template grew too large. With `nodes.tpl` holding a two-line template and `nodes.json` holding `{"name": "A", "vip": true}`:

```console
$ cat nodes.tpl
Hi ${{name}}
{{IF vip}}VIP{{END_IF}}
$ template-resolver render nodes.tpl --data nodes.json --max-nodes 5
nodes.tpl:2:24: error limit-nodes: Template exceeds the maximum of 5 nodes
```

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
| `template-resolver spec`                   | Prints the template language spec as JSON (blocks, filters, operators, default limits, render options, syntax) |
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
| `--standalone-lines` / `--no-standalone-lines` | The [standalone rule](#whitespace-standalone-tag-lines-and-trim-markers) is on by default; `--no-standalone-lines` keeps lines that hold only block tags; the two cannot be combined (exit 2) |
| `--max-iterations n`                   | Lower or raise `maxIterations`                                           |
| `--max-output-chars n`                 | Lower or raise `maxOutputChars`                                          |
| `--max-depth n`                        | Lower or raise `maxDepth`                                                |
| `--max-nodes n`                        | Lower or raise `maxNodes`                                                |
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

`spec` (the end of it, with the default limits, the render options and the syntax):

```console
$ template-resolver spec | tail -n 20
  "limits": {
    "maxIterations": 10000,
    "maxOutputChars": 1000000,
    "maxDepth": 32,
    "maxNodes": 20000
  },
  "options": [
    {
      "name": "standaloneLines",
      "default": "true for render, false for resolveTemplate",
      "description": "Removes a line holding only block tags and whitespace, with its line break; LIST, TABLE and their parts keep their own spacing"
    }
  ],
  "syntax": {
    "variable": "${{path.to.value ?? \"default\" | filter=arg}}",
    "comment": "{{# comment #}}",
    "trim": "{{- TAG}} trims whitespace before a tag and {{TAG -}} after it; comments take {{-# comment #-}}",
    "escape": "\\{{ outputs {{ literally"
  }
}
```

Both standalone flags together are a usage error:

```console
$ template-resolver render standalone.tpl --data vip.json --standalone-lines --no-standalone-lines
template-resolver: --standalone-lines and --no-standalone-lines cannot be combined

Usage: template-resolver <command> [options]
...
$ echo $?
2
```

Usage errors exit 2:

```console
$ template-resolver render - --data -
template-resolver: only one input may be read from stdin

Usage: template-resolver <command> [options]

Commands:
  render <template-file|-> [--data <file|->] [--strict | --no-strict]
         [--standalone-lines | --no-standalone-lines]
         [--max-iterations n] [--max-output-chars n] [--max-depth n]
         [--max-nodes n] [--json]
      Render a template and print the output. A line holding only block tags
      is removed by default; --no-standalone-lines keeps it.
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
| `POST /v1/render`       | `{template, data?, options?: {strictMode?, standaloneLines?, limits?}}` | The [structured render result](#structured-render-result) |
| `POST /v1/validate`     | `{template}`                                         | `{ok, diagnostics}`                       |
| `POST /v1/analyze`      | `{template}`                                         | The analysis (variables, filters, blocks, diagnostics) |
| `GET /v1/spec`          |                                                      | The template language spec                |
| `GET /v1/openapi.json`  |                                                      | The OpenAPI 3.1 document, `api/openapi.json` |

- POST bodies must be JSON with `Content-Type: application/json`, at most 1 MiB.
- Template problems are results, not HTTP errors: `200` with `ok: false` and diagnostics. An `analyze` of a template that does not parse returns `200` with empty variables and the error in `diagnostics`.
- `options.strictMode` defaults to `true`. `options.standaloneLines` (boolean) defaults to `true`; `false` keeps lines that hold only block tags (see [Whitespace](#whitespace-standalone-tag-lines-and-trim-markers)). `options.limits` takes `maxIterations`, `maxOutputChars`, `maxDepth` and `maxNodes`; a request can only lower the server's limits, so a value above the server's is capped at the server's. `validate` and `analyze` use the server's `maxDepth` and `maxNodes`.

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

A request that turns the standalone rule off, and one whose `standaloneLines` is not a boolean:

```console
$ curl -s -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"template": "Intro\n{{IF vip}}\nVIP customer\n{{END_IF}}\nOutro\n", "data": {"vip": true}, "options": {"standaloneLines": false}}'
{"ok":true,"output":"Intro\n\nVIP customer\n\nOutro\n","messages":[],"stats":{"chars":27,"estTokens":7,"sectionsOmitted":0,"iterations":0},"diagnostics":[]}
$ curl -s -w '\n%{http_code}\n' -X POST http://127.0.0.1:3000/v1/render -H 'Content-Type: application/json' -d '{"template": "x", "options": {"standaloneLines": "no"}}'
{"error":{"code":"invalid-request","message":"options.standaloneLines must be a boolean"}}
400
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
$ curl -s -X POST http://127.0.0.1:3000/v1/analyze -H 'Content-Type: application/json' -d '{"template": "{{SECTION \"Code\"}}\n{{FENCE lang=\"ts\"}}\n${{code}}\n{{END_FENCE}}\n{{END_SECTION}}\n"}'
{"variables":[{"name":"code","paths":["code"],"usedIn":["output"],"optional":false,"required":true}],"filters":[],"blocks":{"SECTION":1,"FENCE":1},"diagnostics":[]}
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
