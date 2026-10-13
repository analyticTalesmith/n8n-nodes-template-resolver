---
type: review-packet
card: 0002-working-test-runner
tier: product
built_at: 2026-10-13T17:52:25.160Z
base: a84943d3b29edbfbc14dfc86de28e453fa019dc0
head: 51e95a8354e01659e83a5a5a1d1700e4b4c11153
frozen: true
brief_sha256: d8563a94be5f5e1e60542d300b7d5eca7e4955bc6722464a340ef39c31fc0037
manifest_sha256: 026a47842fd88ce703b85511c441685f3512dd845ad630df7ff0c80194db6d55
criteria_sha256: 7e1cc39d611d0f4e35f61e93fc11356049dc504572360d624afda504e38ee60c
scope_sha256: c9f513c857f1aeabf6cdb3eb1349cd06bbc55fc32c08d48e5de626ee133bba77
diff_sha256: a28d9b0ee1da07822f338f054d2c87caa5b47c4393632c155da6b00adb5bf6d2
omitted_paths: 8
criteria_count: 3
must_not_count: 2
---

# Review packet: 0002-working-test-runner

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a node:test runner that compiles the TypeScript and runs tests in test-node/, so the bug cards can show a failing test first.

### Criteria

- c1 (verify: test): tr-01 npm run test:node compiles the sources and test-node tests with tsc and runs them with node:test, exiting 0 when they pass and nonzero when one fails
- c2 (verify: tool): tr-02 the runner prints node:test TAP on stdout so the card gate can read failing tests
- c3 (verify: review): tr-03 the build output directory is ignored by git and the existing jest suite files are untouched

### Must not

- m1: change tests/, nodes/, jest.config.js or __mocks__/
- m2: add a dependency other than @types/node

### Reviewer brief

```
## Objective

Project goal: a Markdown template resolver that is correct for the n8n node and as a headless library.
Cycle goal: fix nested FOR loops losing outer variables and ?? defaults containing a pipe, each with a failing regression test first, on a working test runner.
Card goal: a node:test runner that compiles the TypeScript and runs tests in test-node/, so the bug cards can show a failing test first.
Must not:
- change tests/, nodes/, jest.config.js or __mocks__/
- add a dependency other than @types/node

## Questions

- goal-critical: does a failing test in test-node/ produce a nonzero exit and a TAP "not ok" line?
- goal-critical: does the runner stop with a nonzero exit when tsc reports an error?
- polish: is the runner free of shell use and platform-specific paths?

## Rubric

- The runner is under 60 lines and has no dependency beyond node and typescript.
- The build output directory is git-ignored.
- The smoke test asserts a rendered string, not just that code runs.

## Design context

- README.md
```

### spec.md as of base a84943d

```
# Spec: working test runner

## Goal

A developer runs `npm run test:node` on a clean clone after `npm ci` and gets node:test TAP output for tests in `test-node/`.

## Scope

In: a runner script, a test tsconfig, one smoke test, a package.json script, an @types/node devDependency, an ignore line. Out: converting or deleting the jest suite, CI, lint.

## Boundaries

- Always: compile with the repo's own typescript; keep the runner dependency-free apart from node and typescript.
- Ask first: adding any other dependency.
- Never: touch tests/, nodes/, jest.config.js.

## Contract and constraints

- contract: `node scripts/run-node-tests.mjs` runs `tsc -p tsconfig.test.json` into `.test-build/`, then `node --test --test-reporter=tap` over the compiled `test-node/**/*.test.js`, and exits with the test run's status. A tsc failure exits nonzero before any test runs.
- constraint: the runner works without a shell (spawn with argv) and on Windows and POSIX.

## Change manifest

Add scripts/run-node-tests.mjs, tsconfig.test.json (commonjs, includes nodes/ and test-node/, outDir .test-build), test-node/smoke.test.ts (renders one template through the lexer, parser and interpreter). Edit package.json (script test:node, devDependency @types/node), package-lock.json, .gitignore (.test-build/).

## Acceptance criteria

- tr-01 `node scripts/run-node-tests.mjs` exits 0 with the smoke test passing, and exits nonzero when given a failing compiled test file as an argument.
- tr-02 stdout starts with `TAP version`.
- tr-03 `git status` shows no `.test-build` after a run; `git diff --stat` shows no change under tests/ or nodes/.

## Runner interface

`node scripts/run-node-tests.mjs [testFile...]`: compiles with tsc first; with no arguments it runs every `.test-build/test-node/**/*.test.js`; with arguments it runs exactly those files. Exit status is the test run's, or nonzero when tsc fails.
```

### card.md as of base a84943d

```
# Working test runner

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

The repository declares jest and ts-jest in jest.config.js but installs neither, so no test can run on a clean clone, and the Aperture card gate reads node:test TAP output. Add a minimal node:test runner that compiles the TypeScript sources and runs tests from test-node/, so later bug cards can prove a regression test fails first. The existing jest suite in tests/ is left alone.

## Must-haves

- `contract` `tr-01` `npm run test:node` compiles the sources and test-node tests with tsc and runs them with node:test, exiting 0 when they pass and nonzero when one fails.
- `contract` `tr-02` The runner prints node:test TAP on stdout so the card gate can read failing tests.
- `contract` `tr-03` The build output directory is ignored by git and the jest suite files are untouched.

## Must-nots

- Do not edit anything under tests/, nodes/, jest.config.js or __mocks__/.
- Do not add a dependency other than @types/node as a devDependency.

## Context links

- [Resolver cycle brief](../../CYCLE.md)

## User documentation

none

## Interface contract

none: adds a developer-facing npm script `test:node`; no public API of the node package changes.

## Scope

| Path | Permission (add, edit, remove) | Approx lines | Blast radius |
| --- | --- | --- | --- |
| scripts/run-node-tests.mjs | add | 40 | none |
| tsconfig.test.json | add | 15 | none |
| test-node/smoke.test.ts | add | 12 | none |
| scripts/run-node-tests.test.mjs | edit | 40 | none |
| package.json | edit | 3 | none |
| package-lock.json | edit | 20 | none |
| .gitignore | edit | 1 | none |
```

### Scope exceptions log (as of now, written during the work)

Each row is a change outside the card's scope that its lead approved. A builder who can edit the card folder can add a row, so the human gate is the backstop.

| Date | Path | Kind | Reason | Approved by |
| --- | --- | --- | --- | --- |
| 2026-10-13 | `docs/ephemeral/cycles/resolver-bugfixes/CYCLE.md` | edit | cycle stage and must-have records made by the lead after the test commit | project lead |
| 2026-10-13 | `docs/ephemeral/cycles/resolver-bugfixes/test-plan.md` | edit | cycle test plan rows made by the lead after the test commit | project lead |

### Manifest and scope

- add: `tsconfig.test.json`, `test-node/smoke.test.ts`
- remove: none
- edit: `scripts/run-node-tests.mjs`, `package.json`, `package-lock.json`, `.gitignore`
- files_scope: `scripts/run-node-tests.mjs`, `tsconfig.test.json`, `test-node/smoke.test.ts`, `package.json`, `package-lock.json`, `.gitignore`

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

These test files were committed before the work began, at base a84943d. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### scripts/run-node-tests.test.mjs (frozen)

```
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runner = join(root, 'scripts', 'run-node-tests.mjs');

function run(args = []) {
	return spawnSync(process.execPath, [runner, ...args], {
		cwd: root,
		encoding: 'utf8',
		timeout: 120000,
	});
}

test('tr-01 exits 0 and reports the smoke test passing when run with no arguments', () => {
	const result = run();
	assert.equal(result.status, 0, `runner should exit 0 when all tests pass; stderr: ${result.stderr}`);
	assert.match(
		result.stdout,
		/^# pass [1-9]\d*$/m,
		'runner should run at least one compiled test and report it as passing',
	);
	assert.match(result.stdout, /^# fail 0$/m, 'runner should report zero failing tests');
});

test('tr-01 exits nonzero when given a failing test file', () => {
	const dir = mkdtempSync(join(tmpdir(), 'run-node-tests-'));
	try {
		const failing = join(dir, 'failing.test.js');
		writeFileSync(
			failing,
			"const { test } = require('node:test');\n" +
				"test('always fails', () => { throw new Error('expected failure'); });\n",
		);
		const result = run([failing]);
		assert.notEqual(result.status, 0, 'runner should exit nonzero when a given test file fails');
		assert.notEqual(result.status, null, 'runner should exit with a status, not be killed');
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('tr-02 stdout starts with TAP version', () => {
	const result = run();
	assert.ok(
		result.stdout.startsWith('TAP version'),
		`stdout should begin with "TAP version"; got: ${JSON.stringify(result.stdout.slice(0, 40))}`,
	);
});
```

## 4. Diff

8 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/.gitignore b/.gitignore
index 047b74f..5cd641d 100644
--- a/.gitignore
+++ b/.gitignore
@@ -4,4 +4,5 @@ node_modules
 .vscode/
 .github/
 coverage/
-deprecated/
\ No newline at end of file
+deprecated/
+.test-build/
\ No newline at end of file
diff --git a/package-lock.json b/package-lock.json
index 7f9d2a7..7324f35 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -11,6 +11,7 @@
       "devDependencies": {
         "@n8n/node-cli": "*",
         "@types/jest": "^30.0.0",
+        "@types/node": "^24.10.2",
         "eslint": "9.32.0",
         "jest": "^30.2.0",
         "prettier": "3.6.2",
diff --git a/package.json b/package.json
index 78182d0..685f3b6 100644
--- a/package.json
+++ b/package.json
@@ -25,7 +25,8 @@
     "prepublishOnly": "n8n-node prerelease",
     "test": "jest",
     "test:watch": "jest --watch",
-    "test:coverage": "jest --coverage"
+    "test:coverage": "jest --coverage",
+    "test:node": "node scripts/run-node-tests.mjs"
   },
   "files": [
     "dist"
@@ -39,6 +40,7 @@
   },
   "devDependencies": {
     "@n8n/node-cli": "*",
+    "@types/node": "^24.10.2",
     "eslint": "9.32.0",
     "prettier": "3.6.2",
     "release-it": "^19.0.4",
diff --git a/scripts/run-node-tests.mjs b/scripts/run-node-tests.mjs
index 84467c8..b3833fc 100644
--- a/scripts/run-node-tests.mjs
+++ b/scripts/run-node-tests.mjs
@@ -1,2 +1,38 @@
-// Stub: signature only. The real runner replaces this.
-process.exitCode = 0;
+import { spawnSync } from 'node:child_process';
+import { readdirSync, statSync } from 'node:fs';
+import { dirname, join, resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
+
+const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
+const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
+const buildTests = join(root, '.test-build', 'test-node');
+
+function findTests(dir) {
+	const found = [];
+	for (const name of readdirSync(dir)) {
+		const path = join(dir, name);
+		if (statSync(path).isDirectory()) found.push(...findTests(path));
+		else if (name.endsWith('.test.js')) found.push(path);
+	}
+	return found;
+}
+
+const compile = spawnSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.test.json')], {
+	cwd: root,
+	stdio: 'inherit',
+});
+if (compile.status !== 0) {
+	process.exit(compile.status ?? 1);
+}
+
+const given = process.argv.slice(2);
+const files = given.length > 0 ? given.map((file) => resolve(file)) : findTests(buildTests);
+
+// An outer `node --test` marks its children with NODE_TEST_CONTEXT, which silences a nested run.
+const { NODE_TEST_CONTEXT, ...env } = process.env;
+const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], {
+	cwd: root,
+	env,
+	stdio: 'inherit',
+});
+process.exit(run.status ?? 1);
diff --git a/test-node/smoke.test.ts b/test-node/smoke.test.ts
new file mode 100644
index 0000000..82f73e9
--- /dev/null
+++ b/test-node/smoke.test.ts
@@ -0,0 +1,12 @@
+import { test } from 'node:test';
+import assert from 'node:assert/strict';
+import { Lexer } from '../nodes/TemplateResolver/lexer';
+import { Parser } from '../nodes/TemplateResolver/parser';
+import { Interpreter } from '../nodes/TemplateResolver/interpreter';
+
+test('renders a variable through the lexer, parser and interpreter', () => {
+	const tokens = new Lexer('Hi ${{name}}').tokenize();
+	const ast = new Parser(tokens).parse();
+	const output = new Interpreter(new Map([['name', 'Ada']])).interpret(ast);
+	assert.equal(output, 'Hi Ada');
+});
diff --git a/tsconfig.test.json b/tsconfig.test.json
new file mode 100644
index 0000000..a48324c
--- /dev/null
+++ b/tsconfig.test.json
@@ -0,0 +1,13 @@
+{
+  "compilerOptions": {
+    "module": "commonjs",
+    "target": "es2019",
+    "strict": true,
+    "esModuleInterop": true,
+    "skipLibCheck": true,
+    "outDir": ".test-build",
+    "rootDir": ".",
+    "types": ["node"]
+  },
+  "include": ["nodes/**/*", "test-node/**/*"]
+}
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
