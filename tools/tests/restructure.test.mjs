import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = '712fcfd7f7af0b329e6506120a25f0db8e58de06';
const TEST_REL = 'tests/TemplateResolver.node.test.ts';
const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');

function tsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function specifiers(source) {
  const found = [];
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bjest\.mock\s*\(\s*['"]([^'"]+)['"]/g,
  ];
  for (const re of patterns) for (const m of source.matchAll(re)) found.push(m[1]);
  return found;
}

const forbiddenIo = ['fs', 'fs/promises', 'net', 'http', 'https', 'child_process'];
function isForbidden(spec) {
  const bare = spec.replace(/^node:/, '');
  if (forbiddenIo.includes(bare)) return true;
  return /^(n8n($|[-/])|@n8n\/)/.test(spec);
}

test('rs-01: no .ts file under core/ imports n8n-workflow, an n8n package, or fs, net, http, https, child_process', () => {
  const coreDir = path.join(root, 'core');
  assert.ok(fs.existsSync(coreDir), 'core/ must exist');
  const files = tsFiles(coreDir);
  assert.ok(files.length > 0, 'core/ must contain at least one .ts file');
  const offenders = [];
  for (const file of files) {
    for (const spec of specifiers(fs.readFileSync(file, 'utf8'))) {
      if (isForbidden(spec)) offenders.push(`${path.relative(root, file)} -> ${spec}`);
    }
  }
  assert.deepEqual(offenders, [], `core/ must not import n8n or Node I/O modules: ${offenders.join('; ')}`);
});

test('rs-02: n8n/ imports the core only through core/src or core/src/index, and core/src/index.ts exports resolveTemplate', () => {
  const indexFile = path.join(root, 'core', 'src', 'index.ts');
  assert.ok(fs.existsSync(indexFile), 'core/src/index.ts must exist');
  assert.match(fs.readFileSync(indexFile, 'utf8'), /resolveTemplate/, 'core/src/index.ts must export resolveTemplate');
  const n8nDir = path.join(root, 'n8n');
  assert.ok(fs.existsSync(n8nDir), 'n8n/ must exist');
  const files = tsFiles(n8nDir);
  assert.ok(files.length > 0, 'n8n/ must contain at least one .ts file');
  let reachesCore = 0;
  const offenders = [];
  for (const file of files) {
    for (const spec of specifiers(fs.readFileSync(file, 'utf8'))) {
      if (!/(^|\/)core(\/|$)/.test(spec)) continue;
      reachesCore++;
      if (!/core\/src(\/index)?$/.test(spec)) offenders.push(`${path.relative(root, file)} -> ${spec}`);
    }
  }
  assert.ok(reachesCore > 0, 'the n8n wrapper must import the core');
  assert.deepEqual(offenders, [], `n8n/ must import core only via core/src or core/src/index: ${offenders.join('; ')}`);
});

function dropImportLines(text) {
  const kept = [];
  let inBlock = false;
  for (const line of text.split(/\r?\n/)) {
    if (inBlock) {
      if (/^\s*\}\s*from\s/.test(line)) inBlock = false;
      continue;
    }
    if (/^import\s/.test(line)) {
      if (!/\bfrom\s*['"]|^import\s*['"]/.test(line)) inBlock = true;
      continue;
    }
    if (/^\} from /.test(line) || line.includes('jest.mock(')) continue;
    kept.push(line);
  }
  return kept;
}

test('rs-03: tests/TemplateResolver.node.test.ts differs from its base version only in import and mock specifier lines', () => {
  const baseText = execFileSync('git', ['show', `${BASE}:${TEST_REL}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const currentText = fs.readFileSync(path.join(root, TEST_REL), 'utf8');
  assert.match(
    currentText,
    /from\s*['"][^'"]*(core\/src|n8n\/)[^'"]*['"]/,
    'the test file must import from a path containing core/src or n8n/',
  );
  const base = dropImportLines(baseText);
  const current = dropImportLines(currentText);
  assert.equal(current.length, base.length, 'non-import line count must equal the base version');
  const firstDiff = base.findIndex((line, i) => line !== current[i]);
  assert.equal(firstDiff, -1, `non-import lines must equal the base version (first difference at kept line ${firstDiff + 1})`);
});

test('rs-04: the pre-existing suite passes with at least 446 passing tests and none failing', () => {
  assert.ok(fs.existsSync(path.join(root, 'core', 'src', 'index.ts')), 'core/src/index.ts must exist');
  assert.ok(fs.existsSync(jestBin), 'node_modules/jest/bin/jest.js must exist (run npm ci)');
  const run = spawnSync(process.execPath, [jestBin, '--json', '--silent', TEST_REL], {
    cwd: root, encoding: 'utf8', timeout: 5 * 60 * 1000, maxBuffer: 256 * 1024 * 1024,
  });
  const start = run.stdout.indexOf('{');
  assert.ok(start >= 0, `jest must print a JSON report; stderr: ${String(run.stderr).slice(0, 500)}`);
  const report = JSON.parse(run.stdout.slice(start));
  assert.equal(report.numFailedTests, 0, 'no test may fail');
  assert.ok(report.numPassedTests >= 446, `at least 446 tests must pass, got ${report.numPassedTests}`);
});

test('rs-05: the build succeeds and every package.json n8n.nodes path exists under dist/n8n/', () => {
  assert.ok(fs.existsSync(path.join(root, 'node_modules', '.bin')), 'node_modules/.bin must exist (run npm ci)');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const run = spawnSync(npm, ['run', 'build'], {
    cwd: root, encoding: 'utf8', timeout: 5 * 60 * 1000, shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(run.status, 0, `npm run build must exit 0; output: ${String(run.stdout).slice(-500)} ${String(run.stderr).slice(-500)}`);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const nodes = pkg.n8n?.nodes ?? [];
  assert.ok(nodes.length > 0, 'package.json n8n.nodes must list at least one path');
  for (const rel of nodes) {
    assert.ok(rel.startsWith('dist/n8n/'), `${rel} must start with dist/n8n/`);
    assert.ok(fs.existsSync(path.join(root, rel)), `${rel} must exist after the build`);
  }
});
