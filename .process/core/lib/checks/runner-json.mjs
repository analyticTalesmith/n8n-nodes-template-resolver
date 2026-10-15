import { toPosix } from '../files.mjs';

/** @typedef {{ name: string, kind: 'assertion' | 'timeout' | 'file-load' | 'error' | 'cancelled', message: string }} TapFailure */

/**
 * The test runner a gate argv names, read from the argv alone: node's own runner (--test), jest or vitest (as the program,
 * or after npx, pnpm exec and the like). Anything else is null; the output shape still decides how it is read.
 * @param {string[]} argv
 * @returns {'node-test' | 'jest' | 'vitest' | null}
 */
export function runnerOf(argv) {
  if (!Array.isArray(argv)) return null;
  if (argv.includes('--test')) return 'node-test';
  const programs = argv.map((part) => String(part).split(/[\\/]/).pop().replace(/\.(?:cmd|exe|js|mjs|cjs)$/i, ''));
  if (programs.includes('vitest')) return 'vitest';
  if (programs.includes('jest')) return 'jest';
  return null;
}

/**
 * The path a gate argv asks the runner to write its report to (--outputFile=path, --outputFile path, --outputFile.json=path),
 * or null. Vitest writes its json report to a file unless it is told where.
 * @param {string[]} argv
 * @returns {string | null}
 */
export function reportFileOf(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const match = /^--outputFile(?:\.json)?(?:=(.*))?$/.exec(argv[i]);
    if (match === null) continue;
    const path = match[1] ?? argv[i + 1];
    return typeof path === 'string' && path !== '' && !path.startsWith('--') ? path : null;
  }
  return null;
}

// eslint-disable-next-line no-control-regex
const stripAnsi = (text) => String(text ?? '').replace(/\u001b\[[0-9;]*m/g, '');
const TIMEOUT = /exceeded timeout of \d+\s*ms|timed out in \d+\s*ms|test timed out/i;
const ASSERTION = /^(?:\w*Error: )?(?:expect[.(]|AssertionError\b)|ERR_ASSERTION/;

/** The first meaningful line of a jest or vitest message: not blank, not the "Test suite failed to run" banner. */
const meaningfulLine = (text) =>
  stripAnsi(text)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*●\s*/, '').trim())
    .find((line) => line !== '' && !/^Test suite failed to run$/i.test(line)) ?? '';

/**
 * Markers of a failed assertion anywhere in a message: jest's matcher line (`expect(received).toBe(expected)`), its
 * `Expected:` / `Received:` lines, or a vitest or node `AssertionError`. One is enough. The word expect alone is not one.
 */
const MARKER = /expect\((?:received|actual)\)\.\w+\(|^(?:Expected|Received)(?: [\w ]+)?:|\bAssertionError\b/;
const STACK_FRAME = /^\s+at\s/;

/** True when a line of the message, above its first stack frame, carries a marker. Best effort: no marker means error. */
function hasMarker(message) {
  for (const line of stripAnsi(message).split(/\r?\n/)) {
    if (STACK_FRAME.test(line)) return false;
    if (MARKER.test(line.trim())) return true;
  }
  return false;
}

/** @param {string} message @returns {TapFailure['kind']} */
function kindOfMessage(message) {
  if (TIMEOUT.test(message)) return 'timeout';
  return ASSERTION.test(meaningfulLine(message)) || hasMarker(message) ? 'assertion' : 'error';
}

const JSON_START = /(?:^|\n)(\{"num(?:Total|Failed|Passed)\w*":)/;

/**
 * The report object in a runner's output: the whole text, or the JSON line a runner printed among other lines.
 * @param {string} text
 * @returns {any | null}
 */
function reportIn(text) {
  const trimmed = String(text ?? '').trim();
  const candidates = [trimmed];
  const at = JSON_START.exec(trimmed);
  if (at !== null) candidates.push(trimmed.slice(at.index + at[0].length - at[1].length));
  for (const candidate of candidates) {
    if (!candidate.startsWith('{')) continue;
    try {
      const value = JSON.parse(candidate);
      if (value !== null && typeof value === 'object' && Array.isArray(value.testResults)) return value;
    } catch {
      // not the report; try the next candidate
    }
  }
  return null;
}

/**
 * Reads the failing tests of a jest --json or vitest json report into the failure model the TAP reader produces. A failed
 * test is a failure by its kind (an expect failure is an assertion, a timeout a timeout, any other throw an error); a test
 * file that failed with no test in it (a missing module, a syntax error) is a failing "file-load" named after the file.
 * @param {string} output
 * @param {string} [root] project directory, so a file name is written relative to it
 * @returns {{ parsed: boolean, failures: TapFailure[], passed: number | null }} passed is the runner's own count of passing tests
 */
export function parseRunnerJson(output, root = '') {
  const report = reportIn(output);
  if (report === null) return { parsed: false, failures: [], passed: null };
  const base = toPosix(String(root)).replace(/\/$/, '');
  const relative = (name) => {
    const path = toPosix(String(name ?? ''));
    return base !== '' && path.toLowerCase().startsWith(`${base.toLowerCase()}/`) ? path.slice(base.length + 1) : path;
  };
  /** @type {TapFailure[]} */
  const failures = [];
  for (const file of report.testResults) {
    const results = Array.isArray(file.assertionResults) ? file.assertionResults : [];
    for (const test of results) {
      if (test.status !== 'failed') continue;
      const message = stripAnsi((Array.isArray(test.failureMessages) ? test.failureMessages : []).join('\n'));
      const name = String(test.fullName ?? [...(test.ancestorTitles ?? []), test.title].join(' ')).trim();
      failures.push({ name, kind: kindOfMessage(message), message: meaningfulLine(message) });
    }
    if (file.status === 'failed' && results.length === 0) {
      failures.push({ name: relative(file.name), kind: 'file-load', message: meaningfulLine(file.message) });
    }
  }
  return { parsed: true, failures, passed: Number.isInteger(report.numPassedTests) ? report.numPassedTests : null };
}
