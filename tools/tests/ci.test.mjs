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
