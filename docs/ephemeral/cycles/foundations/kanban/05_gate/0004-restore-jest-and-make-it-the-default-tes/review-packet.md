---
type: review-packet
card: 0004-restore-jest-and-make-it-the-default-tes
tier: product
built_at: 2026-10-13T21:38:20.084Z
base: 2f6aef4db269a9da0dfc8c53483027359d8177eb
head: 4869375f8db9f9a5db388ae1391e16deb09c2a90
frozen: true
brief_sha256: 2ed5586dfc90da306a4838733562a2d7b8ee0b1d8ba99af9a1e186ef61256196
manifest_sha256: dc2e8551dc8ce55b050cd08e29f30727e5b6fbf46fe7ebdacdbb7a329a715531
criteria_sha256: 1a292a2a28d70885a7aa6c9e0efef1b27842a6aba00415184bc6b8b20bb7e51e
scope_sha256: e2f62ad3347b1336a7f4577e3d6ccf94ee58698af518d58aed7828f93dc49f0c
diff_sha256: dcd79bb160f0c086756abda030b60fce587e63b21d63bff31614aa5cfa858674
omitted_paths: 13
criteria_count: 4
must_not_count: 3
---

# Review packet: 0004-restore-jest-and-make-it-the-default-tes

Read the sections in order. Write `restatement` before you read section 3. At product tier and up, write `verification_plan` from section 1 alone before you read section 3.

## 1. Objective and contract

### Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: npm ci then npm test runs the existing jest suite and passes from a clean clone, and a TAP reporter lets cards gate on jest tests.

### Criteria

- c1 (verify: test): tr-01: package.json lists jest, ts-jest and @types/jest in devDependencies, the lockfile root agrees, and the test script runs jest
- c2 (verify: test): tr-02: the jest TAP reporter prints TAP where a failing assertion is a not ok test carrying code ERR_ASSERTION and a passing test is ok
- c3 (verify: test): tr-03: with dependencies installed the existing suite runs through the jest binary with no failures and at least 446 passing tests
- c4 (verify: test): tr-04: a test file that fails to load is reported as a not ok entry

### Must not

- m1: change any source under nodes/ or any existing test
- m2: add a runtime dependency
- m3: change the jest roots or the module mapper for n8n-workflow

### Reviewer brief

```
## Objective

Project goal: a deterministic, no-eval template language for prompt assembly, with a headless core and an n8n node as a thin wrapper.
Cycle goal: A clean clone installs, builds and tests green in CI; the core is a pure library apart from a thin n8n wrapper; the Tier 0 bugs are fixed; analyze reads the AST; golden-file tests exist.
Card goal: npm ci then npm test runs the existing jest suite and passes from a clean clone, and a TAP reporter lets cards gate on jest tests.
Must not:
- change any source under nodes/ or any existing test
- add a runtime dependency
- change the jest roots or the module mapper for n8n-workflow

## Questions

goal-critical: does npm ci succeed from a clean clone with the committed lockfile?
polish: are the devDependency ranges the ones the lock resolves?

## Rubric

- each criterion is met by the diff and its test
- no change outside the card scope

## Design context

- docs/living/architecture/overview.md
```

### spec.md as of base 2f6aef4

```
# Spec

Background: jest.config.js, the 446-test suite and package-lock.json entries exist; package.json devDependencies lack them (see the recovered surface map). The gate uses node:test for these tooling checks because the jest runner does not exist on the base commit; the reporter lets later cards gate on jest tests.

## Acceptance criteria

- tr-01: package.json lists jest, ts-jest and @types/jest in devDependencies, the lockfile root agrees, and the test script runs jest
- tr-02: the jest TAP reporter prints TAP where a failing assertion is a not ok test carrying code ERR_ASSERTION and a passing test is ok
- tr-03: with dependencies installed the existing suite runs through the jest binary with no failures and at least 446 passing tests
```

### card.md as of base 2f6aef4

```
# Restore jest and make it the default test command

Any agent picking this up: read the documents linked below, change only the files listed in Scope as a write (add, edit or remove), treat everything else as read-only, and stop and ask when you need more than this ticket gives you.

## Goal and why

<!-- One short paragraph for the model: what must be true when this is done, and why it matters. -->

A clean clone must pass `npm ci && npm test` with the existing 446-test jest suite. jest, ts-jest and @types/jest are in package-lock.json but missing from package.json, so the declared test script cannot run from the manifest. Restore them at the versions the lock resolves, keep the existing suite as the default test command, and add a small jest reporter that prints node:test-style TAP so Aperture's red-first evidence can read jest failures (Aperture reads only node:test TAP).


## Must-haves

<!-- The behavior that must hold. A short list, not a requirements document. -->
<!-- Type each line: "- `contract` `id` text" or "- `constraint` `id` must: text". Constraint kinds: must, must-not, evidence-required, human-decides, open-ended. -->
<!-- In card.json each criterion carries `traces`, a list of test file paths ("test/x.test.mjs#id"), and the gate command names the SOURCE test file, never a compiled copy: the review packet shows the reviewer the test files named there as frozen tests, and a path not at the base commit is a warning. -->

- `contract` `tr-01` package.json lists jest, ts-jest and @types/jest in devDependencies, the lockfile root agrees, and the test script runs jest
- `contract` `tr-02` the jest TAP reporter prints TAP where a failing assertion is a not ok test carrying code ERR_ASSERTION and a passing test is ok
- `contract` `tr-03` with dependencies installed the existing suite runs through the jest binary with no failures and at least 446 passing tests


## Must-nots

<!-- Invariants the work must not break: module boundaries, data it must not touch, patterns it must not invent. -->

- change any source under nodes/ or any existing test
- add a runtime dependency
- change the jest roots or the module mapper for n8n-workflow


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
| `tools/jest-tap-reporter.cjs` | add | build-tooling |
| `package-lock.json` | edit | build-tooling |
| `package.json` | edit | build-tooling |

Files scope: `package-lock.json`, `package.json`, `tools/jest-tap-reporter.cjs`
<!-- end generated scope -->
```

### Scope exceptions log (as of now, written during the work)

Each row is a change outside the card's scope that its lead approved. A builder who can edit the card folder can add a row, so the human gate is the backstop.

| Date | Path | Kind | Reason | Approved by |
| --- | --- | --- | --- | --- |
| 2026-10-13 | `tools/tests/test-runner.test.mjs` | edit | the frozen reporter test had a regex typo (\d in a template literal); amendment logged in card.json test_amendments | project lead (front approval) |
| 2026-10-13 | `docs/ephemeral/work/0004-restore-jest-and-make-it-the-default-tes/spec.md` | edit | add the tr-04 acceptance line after the sustained review finding | project lead (front approval) |

### Manifest and scope

- add: `tools/jest-tap-reporter.cjs`, `tools/tests/test-runner-load-failure.test.mjs`
- remove: none
- edit: `package.json`
- files_scope: `package.json`, `tools/jest-tap-reporter.cjs`, `tools/tests/test-runner-load-failure.test.mjs`

## 2. Your verification plan

Before you read section 3, write `verification_plan`: each check you would make to decide whether the work meets the criteria and the goals, written from section 1 alone. Judge the diff against it afterwards.

## 3. Design context

### docs/living/architecture/overview.md

```
---
summary: Surface map of the n8n-nodes-template-resolver repository at the recovered commit - one TypeScript n8n community node package, its manifests, scripts, test and lint setup, entry points and top-level folders.
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

- Language: TypeScript only; the source is `nodes/TemplateResolver/*.ts` (11 files) [src: nodes/TemplateResolver/index.ts:1]. Tests are TypeScript (`tests/TemplateResolver.node.test.ts`) and the test-only mock is TypeScript (`__mocks__/n8n-workflow.ts`) [src: jest.config.js:4-5]
- Config files are JavaScript or ES module: `jest.config.js` is CommonJS (`module.exports`) [src: jest.config.js:1]; `eslint.config.mjs` is an ES module [src: eslint.config.mjs:1]
- Package manifest `package.json`: name `n8n-nodes-template-resolver`, version `1.0.2`, license `MIT`, keyword `n8n-community-node-package`, `files` limited to `dist` [src: package.json:2-3] [src: package.json:30-32]
- The manifest has no `main`, `types` or `exports` field [src: package.json:1-50]
- n8n manifest (`package.json` key `n8n`): `n8nNodesApiVersion` is `1`, `strict` is `true`, and `nodes` lists exactly one file, `dist/nodes/TemplateResolver/TemplateResolver.node.js` [src: package.json:33-39]
- Runtime dependencies: none declared. `peerDependencies` has `n8n-workflow` at `*` [src: package.json:47-49]
- `devDependencies`: `@n8n/node-cli` (`*`), `eslint` (`9.32.0`), `prettier` (`3.6.2`), `release-it` (`^19.0.4`), `typescript` (`5.9.2`) [src: package.json:40-46]
- `jest`, `ts-jest` and `@types/jest` are NOT in `devDependencies` of `package.json`, although `jest.config.js` exists and the `test` scripts call `jest` [src: package.json:40-46] [src: jest.config.js:1-2] [src: package.json:26-28]
- `package-lock.json` records them: its root package entry lists `@types/jest` `^30.0.0`, `jest` `^30.2.0` and `ts-jest` `^29.4.6` under `devDependencies`, so the lockfile and `package.json` disagree [src: package-lock.json:13-18] [open: Q1]
- Node codex file `nodes/TemplateResolver/TemplateResolver.node.json` names node `n8n-nodes-template-resolver`, `nodeVersion` `1.0`, `codexVersion` `1.0`, category `Transform`, and a `primaryDocumentation` URL that is a placeholder-looking `https://github.com/org/repo?tab=readme-ov-file` [src: nodes/TemplateResolver/TemplateResolver.node.json:2-12] [open: Q2]
- `tsconfig.json` compiler options: `strict`, `module` `commonjs`, `target` `es2019`, `noUnusedLocals`, `declaration`, `sourceMap`, `incremental`, `outDir` `./dist/` [src: tsconfig.json:2-22]
- `tsconfig.json` `include` is `nodes/**/*`, `nodes/**/*.json` and `package.json`; `exclude` is `node_modules`, `dist`, `coverage`, `deprecated`, `tests`, `**/*.test.ts` and `**/*.spec.ts` [src: tsconfig.json:24-33]. Tests and the `__mocks__` folder are therefore outside the TypeScript build. [src: tsconfig.json:24-33]
- `.gitignore` (7 lines) ignores `dist`, `node_modules`, `*.tgz`, `.vscode/`, `.github/`, `coverage/` and `deprecated/` [src: .gitignore:1-7]. Because `.github/` is ignored, no workflow configuration under it can be tracked [open: Q3]
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

- `n8n-node` is the binary of the `@n8n/node-cli` devDependency; what its `build`, `dev`, `lint` and `release` steps do internally was not read [open: Q4]
- `build:watch` is the only script that calls `tsc` directly [src: package.json:20]
- No `node_modules/` and no `dist/` directory exist in the working tree, so no script was runnable as found [open: Q1]
- The mock replaces `n8n-workflow` for tests with minimal interface declarations and a `NodeOperationError` class whose constructor takes `(node, message)` and sets `name` to `NodeOperationError` [src: __mocks__/n8n-workflow.ts:1-37]

## Entry points

- n8n loads the single node file listed in the manifest, `dist/nodes/TemplateResolver/TemplateResolver.node.js` [src: package.json:36-38]. Its source is `nodes/TemplateResolver/TemplateResolver.node.ts`, which exports the class `TemplateResolver` and the function `resolveTemplate` [src: nodes/TemplateResolver/TemplateResolver.node.ts:22] [src: nodes/TemplateResolver/TemplateResolver.node.ts:66]
- Whether the compiled output lands at `dist/nodes/...` (the path the manifest names) was not observed, because `dist/` is absent [open: Q5]
- `nodes/TemplateResolver/index.ts` is a barrel that re-exports `types`, `errors`, `coercion`, `filters`, `lexer`, `parser`, `expressions`, `interpreter`, `utils` and `TemplateResolver.node` [src: nodes/TemplateResolver/index.ts:2-29]. It is not named in `package.json`, and no `main` field points at it [src: package.json:1-50]
- No CLI, server or script entry exists in the repository root besides the `package.json` scripts above [src: package.json:18-29]

## Top-level folders


| Path | Contents (as listed) |
|---|---|
| `nodes/` | `TemplateResolver/`: 11 TypeScript files, `TemplateResolver.node.json` and `icoTemplateResolver.svg` [src: tsconfig.json:24] |
| `tests/` | `TemplateResolver.node.test.ts` (about 115 KB) [src: jest.config.js:4] |
| `__mocks__/` | `n8n-workflow.ts` [src: jest.config.js:7] |
| `docs/` | `archive/`, `ephemeral/`, `living/` (`living/architecture/` held only `.gitkeep` before this recovery) [open: Q7] |
| `.process/` | `core/`, `local/`, `shapes/`, `skills/`, `teams/`, `tiers/` (process tooling; contents not read) [open: Q7] |
| `.claude/` | `skills/` (contents not read) [open: Q7] |

Root files: `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `LICENSE.md`, `README.md`, `changelog.md`, `eslint.config.mjs`, `jest.config.js`, `package-lock.json`, `package.json`, `tsconfig.json` [open: Q7]

- Source module map: `nodes/TemplateResolver/` is the only source folder; see `docs/living/architecture/modules/template-resolver.md` [src: tsconfig.json:24]
- The SVG `icoTemplateResolver.svg` is in the node folder, but the node class sets `icon` to `fa:file-code` [src: nodes/TemplateResolver/TemplateResolver.node.ts:71] [open: Q6]

## Open questions

- Q1. `package.json` omits `jest`, `ts-jest` and `@types/jest` while `jest.config.js` and the `test` scripts need them, and `package-lock.json` lists them as root devDependencies. Which file a fresh install follows, and whether `npm test` passes after install, is unknown; no install or test was run, and no `node_modules/` is present. Looked at: `package.json:40-46`, `package-lock.json:13-18`.
- Q2. The codex `primaryDocumentation` URL looks like a placeholder (`org/repo`) while `package.json` `repository.url` names a different GitHub path. Whether it is intentional is not stated in the code. Looked at: `TemplateResolver.node.json:9`, `package.json:14-17`.
- Q3. `.github/` is gitignored, so no tracked CI or release workflow could be found. Whether CI runs elsewhere is unknown.
- Q4. What `n8n-node build`, `lint` and `release` do (from `@n8n/node-cli`) was not read because the package is not installed here.
- Q5. Whether the `n8n-node build` output places the node at `dist/nodes/TemplateResolver/TemplateResolver.node.js`, matching the manifest, is unobserved (no `dist/`).
- Q6. Whether `icoTemplateResolver.svg` is referenced by anything: the node class references `fa:file-code` and no TypeScript file names the SVG. Looked at: `nodes/TemplateResolver/*.ts`.
- Q7. The purpose and contents of `docs/`, `.process/`, `.claude/` and the root documents (`README.md`, `AGENTS.md`, `CLAUDE.md`, `changelog.md`, `LICENSE.md`) were listed but not read, so what they hold is unknown.

## Answered
```

## Frozen tests (read-only)

These test files were committed before the work began, at base 2f6aef4. They are part of the plan, not the builder's reasoning. Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.

### tools/tests/test-runner.test.mjs (frozen)

```
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');
const reporter = path.join(root, 'tools', 'jest-tap-reporter.cjs');

function readJson(rel) {
  const file = path.join(root, rel);
  assert.ok(fs.existsSync(file), `${rel} must exist`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

test('tr-01: package.json and the lockfile root declare jest, ts-jest and @types/jest, and test runs jest', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const dev = pkg.devDependencies ?? {};
  const lockDev = lock.packages?.['']?.devDependencies ?? {};
  for (const name of ['jest', 'ts-jest', '@types/jest']) {
    assert.ok(dev[name], `package.json devDependencies must list ${name}`);
    assert.ok(lockDev[name], `lockfile root devDependencies must list ${name}`);
    assert.equal(dev[name], lockDev[name], `${name} range must match between package.json and the lockfile root`);
  }
  assert.equal(pkg.scripts?.test, 'jest', 'scripts.test must be exactly "jest"');
  assert.ok(fs.existsSync(path.join(root, 'jest.config.js')), 'jest.config.js must remain the jest config');
});

test('tr-02: the jest TAP reporter prints ok, not ok with code ERR_ASSERTION, and no assertion code for thrown errors', () => {
  assert.ok(fs.existsSync(reporter), 'tools/jest-tap-reporter.cjs must exist');
  assert.ok(fs.existsSync(jestBin), 'node_modules/jest/bin/jest.js must exist (run npm ci)');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr02-'));
  try {
    fs.writeFileSync(path.join(dir, 'pass.fixture.js'), "test('fixture passes', () => { expect(1).toBe(1); });\n");
    fs.writeFileSync(path.join(dir, 'fail.fixture.js'), "test('fixture fails', () => { expect(1).toBe(2); });\n");
    fs.writeFileSync(path.join(dir, 'boom.fixture.js'), "test('fixture throws', () => { throw new Error('boom'); });\n");
    const config = JSON.stringify({ rootDir: dir, testMatch: ['**/*.fixture.js'], testEnvironment: 'node' });
    const res = spawnSync(process.execPath, [jestBin, '--config', config, '--reporters', reporter], {
      cwd: dir, encoding: 'utf8', timeout: 120000,
    });
    assert.equal(res.error, undefined, `jest must spawn: ${res.error}`);
    const out = res.stdout ?? '';
    const lines = out.split(/\r?\n/);
    assert.match(lines[0] ?? '', /^TAP version/, `stdout must start with a TAP version line, got: ${lines[0]} | stderr: ${(res.stderr ?? '').slice(0, 200)}`);
    assert.match(out, /^ok \d+ - .*fixture passes/m, 'passing test must be an "ok N - name" line');
    const block = (name) => {
      const i = lines.findIndex((l) => new RegExp(`^not ok \d+ - .*${name}`).test(l));
      assert.ok(i >= 0, `"${name}" must be a "not ok N - name" line`);
      const body = [];
      for (let j = i + 1; j < lines.length && /^\s/.test(lines[j]); j++) body.push(lines[j]);
      return body;
    };
    const failBlock = block('fixture fails');
    assert.ok(failBlock.some((l) => /^ {2}---\s*$/.test(l)), 'failing test must be followed by an indented YAML block opening "  ---"');
    assert.ok(failBlock.some((l) => /^ {2}\.\.\.\s*$/.test(l)), 'YAML block must close with "  ..."');
    assert.ok(failBlock.some((l) => /code:\s*'?ERR_ASSERTION'?\s*$/.test(l)), 'assertion failure must carry "code: ERR_ASSERTION"');
    const boomBlock = block('fixture throws');
    assert.ok(!boomBlock.some((l) => /ERR_ASSERTION/.test(l)), 'a thrown non-assertion error must not carry code ERR_ASSERTION');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('tr-03: the existing suite passes through the jest binary with at least 446 passing tests', () => {
  assert.ok(fs.existsSync(jestBin), 'node_modules/jest/bin/jest.js must exist (run npm ci)');
  const res = spawnSync(process.execPath, [jestBin, '--json', '--silent'], {
    cwd: root, encoding: 'utf8', timeout: 600000, maxBuffer: 256 * 1024 * 1024,
  });
  assert.equal(res.error, undefined, `jest must run: ${res.error}`);
  let summary;
  try {
    summary = JSON.parse(res.stdout);
  } catch {
    assert.fail(`jest --json must print parseable JSON; stderr: ${(res.stderr ?? '').slice(0, 300)}`);
  }
  assert.equal(summary.numFailedTests, 0, 'no test may fail');
  assert.ok(summary.numPassedTests >= 446, `at least 446 tests must pass, got ${summary.numPassedTests}`);
});
```

Named by the card but not at the base commit (the implementer's own tests, never frozen): `tools/tests/test-runner-load-failure.test.mjs`.

## 4. Diff

13 paths under docs/ephemeral/ omitted (process material, not part of the work under review).

```diff
diff --git a/package.json b/package.json
index 78182d0..8b3237e 100644
--- a/package.json
+++ b/package.json
@@ -39,9 +39,12 @@
   },
   "devDependencies": {
     "@n8n/node-cli": "*",
+    "@types/jest": "^30.0.0",
     "eslint": "9.32.0",
+    "jest": "^30.2.0",
     "prettier": "3.6.2",
     "release-it": "^19.0.4",
+    "ts-jest": "^29.4.6",
     "typescript": "5.9.2"
   },
   "peerDependencies": {
diff --git a/tools/jest-tap-reporter.cjs b/tools/jest-tap-reporter.cjs
new file mode 100644
index 0000000..09b8821
--- /dev/null
+++ b/tools/jest-tap-reporter.cjs
@@ -0,0 +1,69 @@
+'use strict';
+
+const path = require('path');
+
+const esc = (s) => String(s).replace(/[\\#]/g, '\\$&');
+const firstLine = (s) =>
+  String(s)
+    .replace(/\u001b\[[0-9;]*m/g, '')
+    .split('\n')
+    .find((l) => l.trim());
+const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;
+
+function isAssertion(t) {
+  const details = t.failureDetails || [];
+  const first = (t.failureMessages && t.failureMessages[0]) || '';
+  return (
+    details.some((d) => d && (d.matcherResult || d.name === 'JestAssertionError' || d.code === 'ERR_ASSERTION')) ||
+    /^(JestAssertionError|AssertionError)/.test(first) ||
+    /^\s*(Error: )?expect\(/.test(first)
+  );
+}
+
+class JestTapReporter {
+  constructor(globalConfig) {
+    this.root = (globalConfig && globalConfig.rootDir) || process.cwd();
+    this.n = 0;
+    this.pass = 0;
+    this.fail = 0;
+  }
+
+  onRunStart() {
+    process.stdout.write('TAP version 13\n');
+  }
+
+  onTestResult(_test, result) {
+    const out = [];
+    if (result.testExecError || (!result.testResults.length && result.failureMessage)) {
+      const err = result.testExecError;
+      const msg = (err && err.message) || result.failureMessage || 'test file failed to run';
+      const first = firstLine(msg) || 'test file failed to run';
+      const file = esc(path.relative(this.root, result.testFilePath).split(path.sep).join('/'));
+      this.n += 1;
+      this.fail += 1;
+      out.push(`not ok ${this.n} - ${file}`, '  ---', `  error: ${quote(first)}`, "  failureType: 'testCodeFailure'", '  ...');
+    }
+    for (const t of result.testResults) {
+      const name = esc(t.ancestorTitles.concat(t.title).join(' '));
+      this.n += 1;
+      if (t.status === 'passed') {
+        this.pass += 1;
+        out.push(`ok ${this.n} - ${name}`);
+      } else if (t.status === 'failed') {
+        this.fail += 1;
+        const first = firstLine((t.failureMessages && t.failureMessages[0]) || 'failed');
+        out.push(`not ok ${this.n} - ${name}`, '  ---', `  error: ${quote(first)}`);
+        out.push(isAssertion(t) ? '  code: ERR_ASSERTION' : "  failureType: 'testCodeFailure'", '  ...');
+      } else {
+        out.push(`ok ${this.n} - ${name} # SKIP`);
+      }
+    }
+    if (out.length) process.stdout.write(out.join('\n') + '\n');
+  }
+
+  onRunComplete() {
+    process.stdout.write(`1..${this.n}\n# pass ${this.pass}\n# fail ${this.fail}\n`);
+  }
+}
+
+module.exports = JestTapReporter;
diff --git a/tools/tests/test-runner-load-failure.test.mjs b/tools/tests/test-runner-load-failure.test.mjs
new file mode 100644
index 0000000..fecb726
--- /dev/null
+++ b/tools/tests/test-runner-load-failure.test.mjs
@@ -0,0 +1,28 @@
+import { test } from 'node:test';
+import assert from 'node:assert/strict';
+import fs from 'node:fs';
+import os from 'node:os';
+import path from 'node:path';
+import { spawnSync } from 'node:child_process';
+import { fileURLToPath } from 'node:url';
+
+const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
+const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');
+const reporter = path.join(root, 'tools', 'jest-tap-reporter.cjs');
+
+test('tr-04: a test file that fails to load is reported as a not ok entry', () => {
+  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr04-'));
+  try {
+    fs.writeFileSync(path.join(dir, 'broken.fixture.js'), "require('./does-not-exist');\ntest('never runs', () => {});\n");
+    const config = JSON.stringify({ rootDir: dir, testMatch: ['**/*.fixture.js'], testEnvironment: 'node' });
+    const res = spawnSync(process.execPath, [jestBin, '--config', config, '--reporters', reporter], {
+      cwd: dir, encoding: 'utf8', timeout: 120000,
+    });
+    assert.equal(res.error, undefined, `jest must spawn: ${res.error}`);
+    const out = res.stdout ?? '';
+    assert.match(out, /^not ok \d+ - .*broken\.fixture\.js/m, `a load failure must be a "not ok N - file" line, got: ${out}`);
+    assert.doesNotMatch(out, /^# fail 0\s*$/m, 'the fail total must not be 0');
+  } finally {
+    fs.rmSync(dir, { recursive: true, force: true });
+  }
+});
diff --git a/tools/tests/test-runner.test.mjs b/tools/tests/test-runner.test.mjs
index cd12f91..cf5180f 100644
--- a/tools/tests/test-runner.test.mjs
+++ b/tools/tests/test-runner.test.mjs
@@ -48,7 +48,7 @@ test('tr-02: the jest TAP reporter prints ok, not ok with code ERR_ASSERTION, an
     assert.match(lines[0] ?? '', /^TAP version/, `stdout must start with a TAP version line, got: ${lines[0]} | stderr: ${(res.stderr ?? '').slice(0, 200)}`);
     assert.match(out, /^ok \d+ - .*fixture passes/m, 'passing test must be an "ok N - name" line');
     const block = (name) => {
-      const i = lines.findIndex((l) => new RegExp(`^not ok \d+ - .*${name}`).test(l));
+      const i = lines.findIndex((l) => new RegExp(`^not ok \\d+ - .*${name}`).test(l));
       assert.ok(i >= 0, `"${name}" must be a "not ok N - name" line`);
       const body = [];
       for (let j = i + 1; j < lines.length && /^\s/.test(lines[j]); j++) body.push(lines[j]);
```

## 5. Earlier findings and replies

Answer each fix-class (defect or goal-risk) finding below in `responses` with sustain or withdraw and evidence. Raise new findings only about what the revision changed or an in-scope problem newly evidenced.

### f1: The TAP reporter emits nothing for a test file that fails to run, so a suite that cannot load reads as '# fail 0'

- Class: goal-risk
- Serves: card-goal: A later card writes a red-first jest test that imports a not-yet-existing export. ts-jest reports a type error, so the file fails to run: jest sets result.testExecError and result.testResults is empty. onTestResult loops only over result.testResults and writes no line for that file. The TAP output then has no 'not ok' entry and ends '1..0 / # pass 0 / # fail 0'. Aperture, which reads this TAP, either sees no red failure or treats the run as clean. Gating cards on jest tests therefore breaks for the most common red-first shape in a TypeScript project.
- Reproduction: 1) Create a temp dir containing broken.fixture.js with the content `throw new Error('load failure'); test('x', () => {});`. 2) Run `node node_modules/jest/bin/jest.js --config '{"rootDir":"<dir>","testMatch":["**/*.fixture.js"],"testEnvironment":"node"}' --reporters tools/jest-tap-reporter.cjs`. 3) Observe that stdout is 'TAP version 13', '1..0', '# pass 0', '# fail 0', with no 'not ok' line, even though jest exits non-zero. Smallest fix: in onTestResult, when result.testExecError is set, emit a 'not ok N - <test file path>' entry with a YAML block carrying the error message (no ERR_ASSERTION code), and count it in this.fail.
- Status: sustained
- Review lead ruling: sustain: valid: a file that cannot load must read as a failure for red-first gating

### f2: A frozen test under tools/tests was edited (regex escape fix); the change is logged and approved but is outside files_scope

- Class: drift
- Serves: m1: m1 forbids changing any existing test, and the frozen tools/tests/test-runner.test.mjs changed. The change replaces `\d` with `\\d` inside a template literal passed to new RegExp. The original pattern degraded to `^not ok d+ - `, which could never match, so tr-02 could not pass against any correct reporter. The fix is correct and minimal, and the scope exceptions log records the project lead's approval. It is noted for the lead because the path is not in the card's files_scope or manifest.
- Reproduction: Compare the frozen test at base 2f6aef4 line 338 with the diff hunk at tools/tests/test-runner.test.mjs:51. The path appears only in the scope exceptions log, not in the manifest's files_scope.
- Status: open
- Review lead ruling: drift: the test amendment is logged in card.json test_amendments and the scope exceptions; accepted

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
