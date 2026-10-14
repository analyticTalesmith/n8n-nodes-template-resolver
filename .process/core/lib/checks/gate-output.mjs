import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { parseRunnerJson, reportFileOf } from './runner-json.mjs';

/** @typedef {import('./runner-json.mjs').TapFailure} TapFailure */

// ---------- TAP ----------

const unescapeTap = (text) => text.replace(/\\([\\#])/g, '$1');
const decodeScalar = (raw) => {
  if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replaceAll("''", "'");
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }
  return raw;
};

/**
 * The key: value lines of the YAML block under a `not ok` line; a `|` block scalar is read as its indented lines.
 * @param {string[]} lines
 * @param {number} from index of the line after `not ok`
 * @param {number} indent indent of the `not ok` line
 * @returns {Record<string, string>}
 */
function readBlock(lines, from, indent) {
  /** @type {Record<string, string>} */
  const fields = {};
  const pad = ' '.repeat(indent + 2);
  if (lines[from] !== `${pad}---`) return fields;
  for (let i = from + 1; i < lines.length && lines[i] !== `${pad}...`; i += 1) {
    const match = /^(\w+): ?(.*)$/.exec(lines[i].startsWith(pad) ? lines[i].slice(pad.length) : '');
    if (match === null) continue;
    const [, key, raw] = match;
    if (/^[|>][-+]?$/.test(raw)) {
      const body = [];
      while (i + 1 < lines.length && lines[i + 1].startsWith(`${pad}  `)) body.push(lines[++i].slice(pad.length + 2));
      fields[key] = body.join('\n');
    } else {
      fields[key] = decodeScalar(raw);
    }
  }
  return fields;
}

/** @param {Record<string, string>} fields @returns {TapFailure['kind']} */
const kindOf = (fields) => {
  if (fields.failureType === 'testTimeoutFailure') return 'timeout';
  if (fields.failureType === 'cancelledByParent' || fields.failureType === 'cancelledByRunner') return 'cancelled';
  if (fields.exitCode !== undefined) return 'file-load';
  if (fields.code === 'ERR_ASSERTION') return 'assertion';
  return 'error';
};

/**
 * The first line of the error a test file printed when it failed to load: the comment lines just above its `# Subtest:` line.
 * @param {string[]} lines
 * @param {number} index index of the `not ok` line
 * @returns {string}
 */
function loadErrorLine(lines, index) {
  const above = [];
  for (let i = index - 2; i >= 0 && lines[i].startsWith('# '); i -= 1) above.unshift(lines[i].slice(2).trim());
  return above.find((line) => /^\w*Error\b/.test(line)) ?? '';
}

/**
 * Reads the failing leaf tests (never the suites, nor a test that failed only because its subtests did) from node:test TAP output. A file that failed to load is a
 * failing test named after the file, with its separators written as slashes.
 * @param {string} output
 * @returns {{ isTap: boolean, failures: TapFailure[] }}
 */
export function parseTap(output) {
  const text = String(output ?? '');
  if (!/^TAP version \d+/m.test(text)) return { isTap: false, failures: [] };
  const lines = text.split(/\r?\n/);
  /** @type {TapFailure[]} */
  const failures = [];
  lines.forEach((line, index) => {
    const match = /^( *)not ok \d+ - (.*)$/.exec(line);
    if (match === null || /(?<!\\)\s#\s*(?:SKIP|TODO)\b/i.test(match[2])) return;
    const fields = readBlock(lines, index + 1, match[1].length);
    if (fields.type === 'suite' || fields.failureType === 'subtestsFailed') return;
    const kind = kindOf(fields);
    const name = unescapeTap(match[2].trim());
    const message = kind === 'file-load' ? loadErrorLine(lines, index) || (fields.error ?? '') : (fields.error ?? '');
    failures.push({ name: kind === 'file-load' ? name.replaceAll('\\', '/') : name, kind, message });
  });
  return { isTap: true, failures };
}

/** The pass count in the summary lines node:test prints at the end of a TAP run, or null. */
const tapPassed = (text) => {
  const match = /^# pass (\d+)\s*$/m.exec(String(text ?? ''));
  return match === null ? null : Number(match[1]);
};

/** A report file written longer than this before the run began is taken as a leftover of an earlier run. */
const REPORT_SLACK_MS = 1000;

/**
 * Reads a gate run's failing tests from whichever shape its output has: node:test TAP, or a jest --json or vitest json
 * report, found in the output itself or in the file the gate argv tells the runner to write it to (only when that file
 * is fresh, written since the run began). The failures have the same model whatever the shape.
 * @param {{ argv: string[], stdout: string, projectDir: string, startedAt?: number }} input
 * @returns {{ parsed: boolean, format: 'tap' | 'json' | null, failures: TapFailure[], passed: number | null }} passed is the count of passing tests the output states, null when it states none
 */
export function parseGateOutput({ argv, stdout, projectDir, startedAt = 0 }) {
  const tap = parseTap(stdout);
  if (tap.isTap) return { parsed: true, format: 'tap', failures: tap.failures, passed: tapPassed(stdout) };
  const inOutput = parseRunnerJson(stdout, projectDir);
  if (inOutput.parsed) return { parsed: true, format: 'json', failures: inOutput.failures, passed: inOutput.passed };
  const named = reportFileOf(argv);
  if (named !== null) {
    const file = isAbsolute(named) ? named : join(projectDir, named);
    try {
      if (statSync(file).mtimeMs >= startedAt - REPORT_SLACK_MS) {
        const inFile = parseRunnerJson(readFileSync(file, 'utf8'), projectDir);
        if (inFile.parsed) return { parsed: true, format: 'json', failures: inFile.failures, passed: inFile.passed };
      }
    } catch {
      // no report file: the output stays unparsed
    }
  }
  return { parsed: false, format: null, failures: [], passed: null };
}
