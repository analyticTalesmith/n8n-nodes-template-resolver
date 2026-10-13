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

test('tr-04: a test file that fails to load is reported as a not ok entry', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr04-'));
  try {
    fs.writeFileSync(path.join(dir, 'broken.fixture.js'), "require('./does-not-exist');\ntest('never runs', () => {});\n");
    const config = JSON.stringify({ rootDir: dir, testMatch: ['**/*.fixture.js'], testEnvironment: 'node' });
    const res = spawnSync(process.execPath, [jestBin, '--config', config, '--reporters', reporter], {
      cwd: dir, encoding: 'utf8', timeout: 120000,
    });
    assert.equal(res.error, undefined, `jest must spawn: ${res.error}`);
    const out = res.stdout ?? '';
    assert.match(out, /^not ok \d+ - .*broken\.fixture\.js/m, `a load failure must be a "not ok N - file" line, got: ${out}`);
    assert.doesNotMatch(out, /^# fail 0\s*$/m, 'the fail total must not be 0');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
