import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
const buildTests = join(root, '.test-build', 'test-node');

function findTests(dir) {
	const found = [];
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) found.push(...findTests(path));
		else if (name.endsWith('.test.js')) found.push(path);
	}
	return found;
}

rmSync(join(root, '.test-build'), { recursive: true, force: true });

const compile = spawnSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.test.json')], {
	cwd: root,
	stdio: 'inherit',
});
if (compile.status !== 0) {
	process.exit(compile.status ?? 1);
}

const given = process.argv.slice(2);
const files = given.length > 0 ? given.map((file) => resolve(file)) : findTests(buildTests);

// An outer `node --test` marks its children with NODE_TEST_CONTEXT, which silences a nested run.
const { NODE_TEST_CONTEXT, ...env } = process.env;
const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], {
	cwd: root,
	env,
	stdio: 'inherit',
});
process.exit(run.status ?? 1);
