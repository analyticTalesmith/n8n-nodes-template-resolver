---
summary: Surface map of the repository at the recovered commit: manifests, scripts, build and test setup, entry points and folders.
state: built
provenance: recovered
recovered_at: 712fcfd7f7af0b329e6506120a25f0db8e58de06
recovered_in: 0002-describe-the-template-resolver-as-it-is
---

# Repository overview

> Since recovery: the source folder `nodes/` is now `core/src/` (pure library, no n8n imports) and `n8n/` (the node), jest and ts-jest are declared again, CI runs on GitHub Actions, and `.github/` is no longer ignored. Tags in this document cite the recovered commit.

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
- `.gitignore` (7 lines) ignores `dist`, `node_modules`, `*.tgz`, `.vscode/`, `.github/`, `coverage/` and `deprecated/` [src: .gitignore:1-7]. It lists `.github/` [src: .gitignore:5] [open: Q3]
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
- `.gitignore` lists `node_modules` and `dist` [src: .gitignore:1] [src: .gitignore:2]; whether either exists in the pinned tree, and so whether any script is runnable as found, was not verified [open: Q8]
- The mock replaces `n8n-workflow` for tests with minimal interface declarations and a `NodeOperationError` class whose constructor takes `(node, message)` and sets `name` to `NodeOperationError` [src: __mocks__/n8n-workflow.ts:1-37]

## Entry points

- n8n loads the single node file listed in the manifest, `dist/nodes/TemplateResolver/TemplateResolver.node.js` [src: package.json:36-38]. Its source is `nodes/TemplateResolver/TemplateResolver.node.ts`, which exports the class `TemplateResolver` and the function `resolveTemplate` [src: nodes/TemplateResolver/TemplateResolver.node.ts:22] [src: nodes/TemplateResolver/TemplateResolver.node.ts:66]
- Whether the compiled output lands at `dist/nodes/...` (the path the manifest names) was not observed, because no build was run [open: Q5]
- `nodes/TemplateResolver/index.ts` is a barrel that re-exports `types`, `errors`, `coercion`, `filters`, `lexer`, `parser`, `expressions`, `interpreter`, `utils` and `TemplateResolver.node` [src: nodes/TemplateResolver/index.ts:2-29]. It is not named in `package.json`, and no `main` field points at it [src: package.json:1-50]
- The `package.json` scripts above invoke `n8n-node`, `tsc` and `jest` [src: package.json:18-29]; whether any other CLI, server or script entry exists in the repository was not established [open: Q9]

## Top-level folders


| Path | Contents (as listed) |
|---|---|
| `nodes/` | `TemplateResolver/` is the folder named by the manifest's node path [src: package.json:37] |
| `tests/` | the jest `roots` entry [src: jest.config.js:4] |
| `__mocks__/` | holds the mock that `n8n-workflow` is mapped to [src: jest.config.js:7] |
| `docs/` | `archive/`, `ephemeral/`, `living/` [open: Q7] |
| `.process/` | `core/`, `local/`, `shapes/`, `teams/`, `tiers/` and the files `aperture.json`, `managed.json` (process tooling; contents not read) [open: Q7] |
| `.claude/` | `skills/` (contents not read) [open: Q7] |

Root files: `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `LICENSE.md`, `README.md`, `changelog.md`, `eslint.config.mjs`, `jest.config.js`, `package-lock.json`, `package.json`, `tsconfig.json` [open: Q7]

- Source module map: `nodes/TemplateResolver/` is the only source folder; see `docs/living/architecture/modules/template-resolver.md` [src: tsconfig.json:24]
- The SVG `icoTemplateResolver.svg` is in the node folder, but the node class sets `icon` to `fa:file-code` [src: nodes/TemplateResolver/TemplateResolver.node.ts:71] [open: Q6]

## Open questions

- Q1. `package.json` omits `jest`, `ts-jest` and `@types/jest` while `jest.config.js` and the `test` scripts need them, and `package-lock.json` lists them as root devDependencies. Which file a fresh install follows, and whether `npm test` passes after install, is unknown; no install or test was run, and installation state was not checked. Looked at: `package.json:40-46`, `package-lock.json:13-18`.
- Q2. The codex `primaryDocumentation` URL looks like a placeholder (`org/repo`) while `package.json` `repository.url` names a different GitHub path. Whether it is intentional is not stated in the code. Looked at: `TemplateResolver.node.json:9`, `package.json:14-17`.
- Q3. `.gitignore` lists `.github/`; whether the pinned tree has a `.github/` directory or any workflow is unverified because no pinned tree listing was read. Whether CI runs elsewhere is unknown.
- Q4. What `n8n-node build`, `lint` and `release` do (from `@n8n/node-cli`) was not read; the `@n8n/node-cli` sources were not opened.
- Q5. Whether the `n8n-node build` output places the node at `dist/nodes/TemplateResolver/TemplateResolver.node.js`, matching the manifest, is unobserved (no build was run).
- Q6. Whether `icoTemplateResolver.svg` is referenced by anything: the node class references `fa:file-code` and no TypeScript file names the SVG. Looked at: `nodes/TemplateResolver/*.ts`.
- Q7. The entries for `docs/`, `.process/`, `.claude/` and the root files below come from a directory listing of the working tree, not a pinned-commit tree listing, and their contents were not read, so both their presence at the pin and what they hold are unverified.
- Q8. Whether `node_modules/` or `dist/` exist or are tracked in the pinned tree was not established; only the `.gitignore` entries were read.
- Q9. Whether any CLI, server or script entry other than the `package.json` scripts exists at the repository root was not established; only a working-tree listing was seen.

## Answered
