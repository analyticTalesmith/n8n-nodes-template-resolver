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
