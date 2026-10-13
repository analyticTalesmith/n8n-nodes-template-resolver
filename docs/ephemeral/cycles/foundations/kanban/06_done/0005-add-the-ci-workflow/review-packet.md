---
type: review-packet
card: 0005-add-the-ci-workflow
tier: product
built_at: 2026-10-13T21:48:11.483Z
base: e7069db9c344f65385b3956ece624de0aad10268
head: da58380f336fcf10f4cee37f71c62bffa2c57a77
frozen: true
brief_sha256: 2b8714a0cf31d422daf02c097d2770928c23dd21a51265a18513340f95474145
manifest_sha256: 3b8188c0e11a710d208dc8e2a869b6cdd85c5c04a970dce52fc2608e50621087
criteria_sha256: 477a561d88f0bd6f04508d0d1168554cbb8f962fac966aa4dca412cc6f2a415a
scope_sha256: 6a8254c89a519da9fe307516d9eab3978ebc995d798bcd9e9bea36775419365b
diff_sha256: 899b1b46ed149f4db2fb83d3cc8d5fcea735ec95502931b17998430a9c9a2d16
omitted_paths: 8
criteria_count: 4
must_not_count: 3
---

# Review packet: 0005-add-the-ci-workflow

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: A workflow file runs npm ci, npm run build and npm test on ubuntu-latest and windows-latest with Node LTS, and git no longer ignores it.

### Criteria

- c1 (verify: test): ci-01: the workflow runs on push to main and on pull_request, on a matrix of ubuntu-latest and windows-latest with the lts/* Node version
- c2 (verify: test): ci-02: the workflow runs npm ci, npm run build and npm test in that order
- c3 (verify: test): ci-03: .gitignore no longer ignores .github and git does not ignore the workflow file
- c4 (verify: test): ci-04: with dependencies installed, npm run build exits 0 and writes the compiled node entry listed in package.json n8n.nodes

### Must not

- m1: publish anything or add a release job
- m2: add secrets or tokens
- m3: change source under nodes/

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: A workflow file runs npm ci, npm run build and npm test on ubuntu-latest and windows-latest with Node LTS, and git no longer ignores it.
Must not:
- publish anything or add a release job
- add secrets or tokens
- change source under nodes/

## Questions

goal-critical: would the workflow run on a fresh pull request without extra setup?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/overview.md
```

### spec.md as of base e7069db

```
# Spec

## Acceptance criteria

- ci-01: the workflow runs on push to main and on pull_request, on a matrix of ubuntu-latest and windows-latest with the lts/* Node version
- ci-02: the workflow runs npm ci, npm run build and npm test in that order
- ci-03: .gitignore no longer ignores .github and git does not ignore the workflow file
- ci-04: with dependencies installed, npm run build exits 0 and writes the compiled node entry listed in package.json n8n.nodes
```

### card.md as of base e7069db

```
# Add the CI workflow

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

Add a GitHub Actions workflow that installs, builds and tests the package on the current Node LTS, on ubuntu and windows, for pushes to main and for pull requests. The repo's .gitignore currently ignores .github/, which would hide the workflow, so stop ignoring it.


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `ci-01` the workflow runs on push to main and on pull_request, on a matrix of ubuntu-latest and windows-latest with the lts/* Node version
- `contract` `ci-02` the workflow runs npm ci, npm run build and npm test in that order
- `contract` `ci-03` .gitignore no longer ignores .github and git does not ignore the workflow file
- `contract` `ci-04` with dependencies installed, npm run build exits 0 and writes the compiled node entry listed in package.json n8n.nodes


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- publish anything or add a release job
- add secrets or tokens
- change source under nodes/


## Context links

<!-- Links into docs/living that justify this ticket (vision, persona, epic and story, UX flow, principles, domain, ADRs). Link, never copy. Links are relative to this file, for example [Glossary](../../../../living/domain/glossary.md). -->

## User documentation

<!-- Say whether a user can see this change. If so, set user_visible true in card.json and list the user-facing documents it updates in user_docs (documents tagged user_facing: true in their frontmatter), or give user_docs_waiver, one line with the reason none changes. If no user can see it, write `none`. -->

none


## Interface contract

<!-- State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`. -->

none: no public interface changes.


## Scope

<!-- The table below is generated from card.json (files_scope, manifest, blast_radius); edit card.json, then run `node core/scripts/card-scope.mjs sync <projectDir> <cardId>` to rewrite it. Everything not listed is read-only. blast_radius names module documents under docs/living/architecture/modules/ (without .md), or `none` for a card that affects no module. In a project with no module pages yet, name the area in plain words in kebab-case, for example a directory name such as `scripts`, or use `none`. A card that changes no file deletes the generated block and writes `read-only` on its own line instead. -->

<!-- generated scope: from card.json -->
| Path | Permission (add, edit, remove) | Blast radius |
| --- | --- | --- |
| `.github/workflows/ci.yml` | add | build-tooling |
| `.gitignore` | edit | build-tooling |

Files scope: `.github/workflows/ci.yml`, `.gitignore`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

No scope exceptions are logged.

### Manifest and scope

- add: `.github/workflows/ci.yml`
- remove: none
- edit: `.gitignore`
- files_scope: `.github/workflows/ci.yml`, `.gitignore`

## 2. Your verification plan

Before you read section 3, write `verification_plan`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.

## 3. Design context

### docs/living/architecture/overview.md

```
---
summary: Surface map of the repository at the recovered commit: manifests, scripts, build and test setup, entry points and folders.
state: planned
provenance: recovered
recovered_at: 712fcfd7f7af0b329e6506120a25f0db8e58de06
recovered_in: 0002-describe-the-template-resolver-as-it-is
---

# Repository overview

## Purpose

Surface map of the repository at `C:/n8n-run` (package `n8n-nodes-template-resolver`): what languages and manifests it holds, how it is built and tested, where execution enters, and what each top-level folder contains. Readers are the teams that later change the template resolver or its tooling. The one source module is described in `docs/living/architecture/modules/template-resolver.md`.

## Scope read

Read: `package.json`, `package-lock.json` (root package entry and the jest entries only), `.gitignore`, `tsconfig.json`, `jest.config.js`, `eslint.config.mjs`, `__mocks__/n8n-workflow.ts`, `nodes/TemplateResolver/TemplateResolver.node.json`, and every source file under `nodes/TemplateResolver/`. Folder contents of `.claude/`, `.process/`, `docs/`, `tests/` and `__mocks__/` were listed only.

Deliberately not read: `README.md`, `AGENTS.md`, `CLAUDE.md`, `changelog.md`, `LICENSE.md`, the test file bodies (`tests/TemplateResolver.node.test.ts`), `.process/` and `docs/` contents, `.git/`. No command that runs code, git or tests was run, so no claim below was confirmed by running the build, lint or test scripts.

## Languages and manifests

- Language: TypeScript; `tsconfig.json` compiles `nodes/**/*` and the manifest names a compiled `.js` node file [src: tsconfig.json:24] [src: package.json:37]. Tests are matched as `**/*.test.ts` and the test-only mock is a `.ts` file [src: jest.config.js:5] [src: jest.config.js:7]
- Config files are JavaScript or ES module: `jest.config.js` is CommonJS (`module.exports`) [src: jest.config.js:1]; `eslint.config.mjs` is an ES module [src: eslint.config.mjs:1]
- Package manifest `package.json`: name `n8n-nodes-template-resolver`, version `1.0.2`, license `MIT`, keyword `n8n-community-node-package`, `files` limited to `dist` [src: package.json:2-3] [src: package.json:5] [src: package.json:7-9] [src: package.json:30-32]
- The manifest has no `main`, `types` or `exports` field [src: package.json:1-50]
- n8n manifest (`package.json` key `n8n`): `n8nNodesApiVersion` is `1`, `strict` is `true`, and `nodes` lists exactly one file, `dist/nodes/TemplateResolver/TemplateResolver.node.js` [src: package.json:33-39]
- Runtime dependencies: none declared. `peerDependencies` has `n8n-workflow` at `*` [src: package.json:47-49]
- `devDependencies`: `@n8n/node-cli` (`*`), `eslint` (`9.32.0`), `prettier` (`3.6.2`), `release-it` (`^19.0.4`), `typescript` (`5.9.2`) [src: package.json:40-46]
- `jest`, `ts-jest` and `@types/jest` are NOT in `devDependencies` of `package.json`, although `jest.config.js` exists and the `test` scripts call `jest` [src: package.json:40-46] [src: jest.config.js:1-2] [src: package.json:26-28]
- `package-lock.json` records them: its root package entry lists `@types/jest` `^30.0.0`, `jest` `^30.2.0` and `ts-jest` `^29.4.6` under `devDependencies`, so the lockfile and `package.json` disagree [src: package-lock.json:13-18] [open: Q1]
- Node codex file `nodes/TemplateResolver/TemplateResolver.node.json` names node `n8n-nodes-template-resolver`, `nodeVersion` `1.0`, `codexVersion` `1.0`, category `Transform`, and a `primaryDocumentation` URL that is a placeholder-looking `https://github.com/org/repo?tab=readme-ov-file` [src: nodes/TemplateResolver/TemplateResolver.node.json:2-12] [open: Q2]
- `tsconfig.json` compiler options: `strict`, `module` `commonjs`, `target` `es2019`, `noUnusedLocals`, `declaration`, `sourceMap`, `incremental`, `outDir` `./dist/` [src: tsconfig.json:2-22]
- `tsconfig.json` `include` is `nodes/**/*`, `nodes/**/*.json` and `package.json`; `exclude` is `node_modules`, `dist`, `coverage`, `deprecated`, `tests`, `**/*.test.ts` and `**/*.spec.ts` [src: tsconfig.json:24-33]. Tests and the `__mocks__` folder are therefore outside the TypeScript build. [src: tsconfig.json:24-33]
- `.gitignore` (7 lines) ignores `dist`, `node_modules`, `*.tgz`, `.vscode/`, `.github/`, `coverage/` and `deprecated/` [src: .gitignore:1-7]. The pinned tree has no `.github/` directory and `.gitignore` ignores it [src: .gitignore:5] [open: Q3]
- Lint config: `eslint.config.mjs` imports `config` from `@n8n/node-cli/eslint` and exports it unchanged [src: eslint.config.mjs:1-3]
- Test config: `jest.config.js` uses preset `ts-jest`, environment `node`, `roots` `<rootDir>/tests`, `testMatch` `**/*.test.ts`, and maps module `n8n-workflow` to `<rootDir>/__mocks__/n8n-workflow.ts` [src: jest.config.js:1-8]

## Build and test commands

All commands are `package.json` `scripts` [src: package.json:18-29]

| Script | Command |
|---|---|
| `build` | `n8n-node build` [src: package.json:19] |
| `build:watch` | `tsc --watch` [src: package.json:20] |
| `dev` | `n8n-node dev` [src: package.json:21] |
| `lint` | `n8n-node lint` [src: package.json:22] |
| `lint:fix` | `n8n-node lint --fix` [src: package.json:23] |
| `release` | `n8n-node release` [src: package.json:24] |
| `prepublishOnly` | `n8n-node prerelease` [src: package.json:25] |
| `test` | `jest` [src: package.json:26] |
| `test:watch` | `jest --watch` [src: package.json:27] |
| `test:coverage` | `jest --coverage` [src: package.json:28] |

- `n8n-node` is declared as a binary in `package-lock.json` [src: package-lock.json:2008]; what the `build`, `dev`, `lint` and `release` steps do internally was not read [open: Q4]
- `build:watch` is the only script that calls `tsc` directly [src: package.json:20]
- Neither `node_modules/` nor `dist/` is tracked: `.gitignore` ignores both [src: .gitignore:1] [src: .gitignore:2] [open: Q1]
- The mock replaces `n8n-workflow` for tests with minimal interface declarations and a `NodeOperationError` class whose constructor takes `(node, message)` and sets `name` to `NodeOperationError` [src: __mocks__/n8n-workflow.ts:1-37]

## Entry points

- n8n loads the single node file listed in the manifest, `dist/nodes/TemplateResolver/TemplateResolver.node.js` [src: package.json:36-38]. Its source is `nodes/TemplateResolver/TemplateResolver.node.ts`, which exports the class `TemplateResolver` and the function `resolveTemplate` [src: nodes/TemplateResolver/TemplateResolver.node.ts:22] [src: nodes/TemplateResolver/TemplateResolver.node.ts:66]
- Whether the compiled output lands at `dist/nodes/...` (the path the manifest names) was not observed, because `dist` is gitignored and not tracked [open: Q5]
- `nodes/TemplateResolver/index.ts` is a barrel that re-exports `types`, `errors`, `coercion`, `filters`, `lexer`, `parser`, `expressions`, `interpreter`, `utils` and `TemplateResolver.node` [src: nodes/TemplateResolver/index.ts:2-29]. It is not named in `package.json`, and no `main` field points at it [src: package.json:1-50]
- No CLI, server or script entry exists in the repository root besides the `package.json` scripts above [src: package.json:18-29]

## Top-level folders


| Path | Contents (as listed) |
|---|---|
| `nodes/` | `TemplateResolver/` is the folder named by the manifest's node path [src: package.json:37] |
| `tests/` | the jest `roots` entry [src: jest.config.js:4] |
| `__mocks__/` | holds the mock that `n8n-workflow` is mapped to [src: jest.config.js:7] |
| `docs/` | `archive/`, `ephemeral/`, `living/` (`living/architecture/` held only `.gitkeep` before this recovery) [open: Q7] |
| `.process/` | `core/`, `local/`, `shapes/`, `teams/`, `tiers/` and the files `aperture.json`, `managed.json` (process tooling; contents not read) [open: Q7] |
| `.claude/` | `skills/` (contents not read) [open: Q7] |

Root files: `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `LICENSE.md`, `README.md`, `changelog.md`, `eslint.config.mjs`, `jest.config.js`, `package-lock.json`, `package.json`, `tsconfig.json` [open: Q7]

- Source module map: `nodes/TemplateResolver/` is the only source folder; see `docs/living/architecture/modules/template-resolver.md` [src: tsconfig.json:24]
- The SVG `icoTemplateResolver.svg` is in the node folder, but the node class sets `icon` to `fa:file-code` [src: nodes/TemplateResolver/TemplateResolver.node.ts:71] [open: Q6]

## Open questions

- Q1. `package.json` omits `jest`, `ts-jest` and `@types/jest` while `jest.config.js` and the `test` scripts need them, and `package-lock.json` lists them as root devDependencies. Which file a fresh install follows, and whether `npm test` passes after install, is unknown; no install or test was run, and neither `node_modules/` nor `dist` is tracked. Looked at: `package.json:40-46`, `package-lock.json:13-18`.
- Q2. The codex `primaryDocumentation` URL looks like a placeholder (`org/repo`) while `package.json` `repository.url` names a different GitHub path. Whether it is intentional is not stated in the code. Looked at: `TemplateResolver.node.json:9`, `package.json:14-17`.
- Q3. The pinned tree has no `.github/` directory and `.gitignore` ignores it, so no CI or release workflow could be found. Whether CI runs elsewhere is unknown.
- Q4. What `n8n-node build`, `lint` and `release` do (from `@n8n/node-cli`) was not read because the package is not part of the tracked tree.
- Q5. Whether the `n8n-node build` output places the node at `dist/nodes/TemplateResolver/TemplateResolver.node.js`, matching the manifest, is unobserved (`dist` is not tracked).
- Q6. Whether `icoTemplateResolver.svg` is referenced by anything: the node class references `fa:file-code` and no TypeScript file names the SVG. Looked at: `nodes/TemplateResolver/*.ts`.
- Q7. The purpose and contents of `docs/`, `.process/`, `.claude/` and the root documents (`README.md`, `AGENTS.md`, `CLAUDE.md`, `changelog.md`, `LICENSE.md`) were listed but not read, so what they hold is unknown.

## Answered
```

## Frozen tests (read-only)

These test files were committed before the work began, at base e7069db. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tools/tests/ci.test.mjs (frozen)

```
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflow = path.join(root, '.github', 'workflows', 'ci.yml');

function readWorkflow() {
  assert.ok(fs.existsSync(workflow), '.github/workflows/ci.yml must exist');
  return fs.readFileSync(workflow, 'utf8');
}

test('ci-01: runs on push to main and pull_request, on ubuntu-latest and windows-latest with lts/*', () => {
  const yml = readWorkflow();
  assert.match(yml, /^on:/m, 'workflow must have an on: block');
  assert.match(yml, /^\s+push:/m, 'workflow must trigger on push');
  assert.match(
    yml,
    /branches:\s*(\[[^\]]*\bmain\b[^\]]*\]|\n(\s+-\s*.*\n)*?\s+-\s*['"]?main['"]?)/,
    'push must be limited to branch main',
  );
  assert.match(yml, /^\s+pull_request:/m, 'workflow must trigger on pull_request');
  assert.match(yml, /matrix:/, 'workflow must use a matrix');
  assert.match(yml, /ubuntu-latest/, 'matrix must include ubuntu-latest');
  assert.match(yml, /windows-latest/, 'matrix must include windows-latest');
  assert.match(yml, /lts\/\*/, 'Node version must be lts/*');
});

test('ci-02: runs npm ci, npm run build and npm test in that order', () => {
  const yml = readWorkflow();
  const ci = yml.search(/run:\s*npm ci\b/);
  const build = yml.search(/run:\s*npm run build\b/);
  const testStep = yml.search(/run:\s*npm (run )?test\b/);
  assert.ok(ci >= 0, 'a step must run npm ci');
  assert.ok(build >= 0, 'a step must run npm run build');
  assert.ok(testStep >= 0, 'a step must run npm test');
  assert.ok(ci < build && build < testStep, 'steps must be ordered npm ci, npm run build, npm test');
});

test('ci-03: .gitignore does not ignore .github and git does not ignore the workflow', () => {
  const ignore = path.join(root, '.gitignore');
  assert.ok(fs.existsSync(ignore), '.gitignore must exist');
  const lines = fs.readFileSync(ignore, 'utf8').split(/\r?\n/).map((l) => l.trim());
  assert.ok(
    !lines.some((l) => /^\/?\.github(\/.*)?$/.test(l)),
    '.gitignore must have no line ignoring .github',
  );
  const res = spawnSync('git', ['check-ignore', '-q', '.github/workflows/ci.yml'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(res.error, undefined, `git must spawn: ${res.error}`);
  assert.equal(res.status, 1, 'git check-ignore must exit 1 (workflow path not ignored)');
});

test('ci-04: npm run build exits 0 and writes every node entry listed in package.json n8n.nodes', () => {
  assert.ok(
    fs.existsSync(path.join(root, 'node_modules', '.bin')),
    'node_modules/.bin must exist (run npm ci)',
  );
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const nodes = pkg.n8n?.nodes ?? [];
  assert.ok(nodes.length > 0, 'package.json n8n.nodes must list at least one entry');
  const res = spawnSync('npm run build', {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    timeout: 300000,
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(res.error, undefined, `npm run build must run: ${res.error}`);
  assert.equal(res.status, 0, `npm run build must exit 0; stderr: ${(res.stderr ?? '').slice(0, 300)}`);
  for (const rel of nodes) {
    assert.ok(fs.existsSync(path.join(root, rel)), `${rel} must exist after build`);
  }
});
```

## 4. Diff

8 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
new file mode 100644
index 0000000..6a24fc8
--- /dev/null
+++ b/.github/workflows/ci.yml
@@ -0,0 +1,23 @@
+name: CI
+
+on:
+  push:
+    branches: [main]
+  pull_request:
+
+jobs:
+  test:
+    runs-on: ${{ matrix.os }}
+    strategy:
+      matrix:
+        os: [ubuntu-latest, windows-latest]
+        node-version: [lts/*]
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/setup-node@v4
+        with:
+          node-version: ${{ matrix.node-version }}
+          cache: npm
+      - run: npm ci
+      - run: npm run build
+      - run: npm test
diff --git a/.gitignore b/.gitignore
index 047b74f..a33c071 100644
--- a/.gitignore
+++ b/.gitignore
@@ -2,6 +2,5 @@ dist
 node_modules
 *.tgz
 .vscode/
-.github/
 coverage/
 deprecated/
\ No newline at end of file
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
