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
