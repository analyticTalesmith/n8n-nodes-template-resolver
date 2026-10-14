import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readmePath = path.join(root, 'README.md');
const openapiPath = path.join(root, 'api', 'openapi.json');

function readme() {
  assert.ok(fs.existsSync(readmePath), 'README.md must exist at the repo root');
  return fs.readFileSync(readmePath, 'utf8');
}

function missing(text, items) {
  return items.filter((item) => !text.includes(item));
}

function assertAllMentioned(text, items, what) {
  assert.deepEqual(missing(text, items), [], `the README must mention every ${what}; missing`);
}

const routes = [
  'POST /v1/render',
  'POST /v1/validate',
  'POST /v1/analyze',
  'GET /v1/spec',
  'GET /v1/openapi.json',
];
const subcommands = ['render', 'validate', 'analyze', 'spec', 'serve'].map((s) => `template-resolver ${s}`);
const diagnosticCodes = [
  'syntax-error', 'type-error', 'missing-variable', 'unknown-filter',
  'limit-iterations', 'limit-output', 'limit-depth', 'invalid-input', 'analysis-warning',
];
const httpErrorCodes = [
  'invalid-request', 'not-found', 'method-not-allowed', 'payload-too-large', 'unsupported-media-type',
];
const limits = [['maxIterations', '10000'], ['maxOutputChars', '1000000'], ['maxDepth', '32']];

test('dc-coverage: the README names every API route', () => {
  assertAllMentioned(readme(), routes, 'API route as "METHOD /path"');
});

test('dc-coverage: the README names every CLI subcommand', () => {
  assertAllMentioned(readme(), subcommands, 'CLI subcommand as "template-resolver <sub>"');
});

test('dc-coverage: the README names every diagnostic and HTTP error code', () => {
  assertAllMentioned(readme(), [...diagnosticCodes, ...httpErrorCodes], 'diagnostic and HTTP error code');
});

test('dc-coverage: the README names each limit with its default', () => {
  const text = readme();
  assertAllMentioned(text, limits.map(([name]) => name), 'limit name');
  for (const [name, value] of limits) {
    const line = text.split('\n').find((l) => l.includes(name) && l.replace(/[,_ ]/g, '').includes(value));
    assert.ok(line, `the README must state the default ${value} on the same line as ${name}`);
  }
});

test('dc-coverage: the README documents the CLI exit codes 0, 1 and 2', () => {
  const text = readme();
  const idx = text.search(/exit code/i);
  assert.ok(idx >= 0, 'the README must have an exit codes explanation');
  const section = text.slice(Math.max(0, idx - 300), idx + 600);
  for (const code of ['0', '1', '2']) {
    assert.match(section, new RegExp(`(^|[^\d])${code}([^\d]|$)`), `the exit codes text must mention exit code ${code}`);
  }
  assert.ok(text.includes('template-resolver'), 'the exit codes must sit in a section about the template-resolver CLI');
});

test('dc-coverage: the README mentions every path in api/openapi.json', () => {
  assert.ok(fs.existsSync(openapiPath), 'api/openapi.json must exist (delivered by the API card)');
  const doc = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
  const paths = Object.keys(doc.paths ?? {});
  assert.ok(paths.length > 0, 'api/openapi.json must declare at least one path');
  assertAllMentioned(readme(), paths, 'OpenAPI path');
});
