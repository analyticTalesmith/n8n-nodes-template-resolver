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
