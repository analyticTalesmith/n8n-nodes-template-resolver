import { existsSync, readFileSync } from 'node:fs';
import { CARD_FILES, WORK_ROOT, workFile } from '../card-files.mjs';
import { runCommand } from './boundary.mjs';
import { notFailingFinding, runCardGate } from './card-gate.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./boundary.mjs').CommandRunner} CommandRunner */
/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {{ name: string, kind: 'assertion' | 'timeout' | 'file-load' | 'error' | 'cancelled', message: string }} TapFailure */
/** @typedef {{ command: string[], exit_status: number, rows: { test: string, criterion: string, reason: string }[] }} RedEvidence */

/** Phrases that mark a Reason as a failure to run rather than a failure of the behavior; matched without regard to case. */
export const INVALID_REASONS = Object.freeze(['cannot start', 'missing import', 'syntax error', 'timeout', 'timed out', 'missing module', 'cannot find module', 'cannot load']);

/** The Reason label of each kind of failure. Only the assertion label is a valid red. */
const LABELS = Object.freeze({ assertion: 'assertion failed', timeout: 'timeout', 'file-load': 'file failed to load', error: 'error thrown', cancelled: 'cancelled' });
const NO_CRITERION = 'none';
const CRITERION_ID = /^[a-z][a-z0-9]*-[a-z0-9]+/;
const finding = (rule, message) => ({ rule, message });
const firstLine = (text) => String(text).split(/\r?\n/).map((line) => line.trim()).find((line) => line !== '') ?? '';
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

// ---------- the log ----------

/**
 * The leading token of a criterion text, which is its id.
 * @param {string} text
 * @returns {string | null}
 */
export function criterionIdOf(text) {
  return CRITERION_ID.exec(String(text ?? ''))?.[0] ?? null;
}

/**
 * The criterion ids of a card, in order; with verify set, only those criteria.
 * @param {Card} card
 * @param {string} [verify]
 * @returns {string[]}
 */
export function cardCriterionIds(card, verify) {
  const criteria = Array.isArray(card.criteria) ? card.criteria : [];
  return criteria
    .filter((c) => c !== null && typeof c === 'object' && (verify === undefined || c.verify === verify))
    .map((c) => criterionIdOf(/** @type {any} */ (c).text))
    .filter((id) => id !== null);
}

/**
 * The texts of the card's test-verified criteria that start with no id, so no failing test can be matched to them.
 * @param {Card} card
 * @returns {string[]}
 */
export function idlessTestCriteria(card) {
  const criteria = Array.isArray(card.criteria) ? card.criteria : [];
  return criteria
    .filter((c) => c !== null && typeof c === 'object' && c.verify === 'test' && criterionIdOf(c.text) === null)
    .map((c) => String(c.text ?? '').trim() || '(empty criterion text)');
}

/**
 * The ids that two or more of the card's test-verified criteria start with, each with the texts that share it.
 * @param {Card} card
 * @returns {{ id: string, texts: string[] }[]}
 */
export function sharedCriterionIds(card) {
  const criteria = Array.isArray(card.criteria) ? card.criteria : [];
  /** @type {Map<string, string[]>} */
  const byId = new Map();
  for (const c of criteria) {
    if (c === null || typeof c !== 'object' || c.verify !== 'test') continue;
    const id = criterionIdOf(c.text);
    if (id !== null) byId.set(id, [...(byId.get(id) ?? []), String(c.text).trim()]);
  }
  return [...byId].filter(([, texts]) => texts.length > 1).map(([id, texts]) => ({ id, texts }));
}

/**
 * The Reason a log row holds for a failure: its kind label, then the first line of its message.
 * @param {TapFailure} failure
 * @returns {string}
 */
export const reasonOf = (failure) => `${LABELS[failure.kind]}: ${firstLine(failure.message)}`.trim();

const cell = (text) => String(text).replaceAll('|', '\\|');
const uncell = (text) => text.replaceAll('\\|', '|').trim();
const splitRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(uncell);

/**
 * Reads a red-evidence log.
 * @param {string} text
 * @returns {{ evidence: RedEvidence | null, problems: string[] }} evidence is null when any problem is found
 */
export function parseRedEvidence(text) {
  const lines = String(text ?? '').replace(/^﻿/, '').split(/\r?\n/);
  /** @type {string[]} */
  const problems = [];
  const close = lines[0]?.trim() === '---' ? lines.findIndex((line, index) => index > 0 && line.trim() === '---') : -1;
  if (close === -1) return { evidence: null, problems: ['the log has no frontmatter (a --- block with summary, command and exit_status)'] };
  const field = (key) => {
    const line = lines.slice(1, close).find((l) => l.startsWith(`${key}:`));
    return line === undefined ? null : line.slice(key.length + 1).trim();
  };
  if ((field('summary') ?? '') === '') problems.push('the frontmatter has no summary line');
  let command = /** @type {string[]} */ ([]);
  try {
    const rawCommand = field('command');
    const parsed = rawCommand === null ? null : JSON.parse(rawCommand);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((part) => typeof part === 'string' && part !== '')) throw new Error('not an argv');
    command = parsed;
  } catch {
    problems.push('command must be the gate argv as a JSON array of non-empty strings, like ["node", "--test", "test/a.test.mjs"]');
  }
  const rawStatus = field('exit_status');
  const status = rawStatus !== null && /^-?\d+$/.test(rawStatus) ? Number(rawStatus) : null;
  if (status === null || status === 0) problems.push('exit_status must be a non-zero integer, the exit status of the failing run');
  const header = lines.findIndex((line, index) => index > close && /^\|\s*Test\s*\|\s*Criterion\s*\|\s*Reason\s*\|\s*$/.test(line));
  /** @type {RedEvidence['rows']} */
  const rows = [];
  if (header === -1) {
    problems.push('the log has no table with the columns | Test | Criterion | Reason |');
  } else {
    let tableRows = 0;
    for (let i = header + 2; i < lines.length && lines[i].trim().startsWith('|'); i += 1) {
      tableRows += 1;
      const cells = splitRow(lines[i]);
      if (cells.length !== 3 || cells.some((c) => c === '')) problems.push(`table row ${tableRows} must have a Test, a Criterion and a Reason, none empty`);
      else rows.push({ test: cells[0], criterion: cells[1], reason: cells[2] });
    }
    if (tableRows === 0) problems.push('the table has no row; give one row per failing test');
  }
  return problems.length > 0 ? { evidence: null, problems } : { evidence: { command, exit_status: /** @type {number} */ (status), rows }, problems };
}

/**
 * The criterion a test name belongs to: the first of the ids that appears in it as a whole token.
 * @param {string} name
 * @param {string[]} ids
 * @returns {string | null}
 */
const criterionIn = (name, ids) => ids.find((id) => new RegExp(`(?<![a-z0-9])${escapeRegExp(id)}(?![a-z0-9])`).test(name)) ?? null;

/**
 * The text of a red-evidence log for a run's failures: one row per failing test, its Reason the kind label then the first
 * line of the message. A failure with no criterion id in its name (a file that failed to load) gets the criterion "none",
 * which the check reports.
 * @param {{ cardId: string, command: string[], exitStatus: number, failures: TapFailure[], criteria: string[] }} input
 * @returns {string}
 */
export function buildRedEvidence({ cardId, command, exitStatus, failures, criteria }) {
  const rows = failures.map((f) => `| ${cell(f.name)} | ${criterionIn(f.name, criteria) ?? NO_CRITERION} | ${cell(reasonOf(f))} |`);
  const covered = new Set(failures.map((f) => criterionIn(f.name, criteria)).filter((id) => id !== null));
  return [
    '---',
    `summary: Red evidence for ${cardId}: ${failures.length} failing ${failures.length === 1 ? 'test' : 'tests'} across ${covered.size} ${covered.size === 1 ? 'criterion' : 'criteria'}.`,
    `command: ${JSON.stringify(command)}`,
    `exit_status: ${exitStatus}`,
    '---',
    '',
    `# Red evidence for ${cardId}`,
    '',
    'Written by `node core/scripts/red-evidence.mjs` from the first run of the tests. Do not edit by hand; run the script again.',
    '',
    '| Test | Criterion | Reason |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

// ---------- the check ----------

const sameList = (a, b) => a.length === b.length && a.every((part, index) => part === b[index]);
/**
 * What makes a Reason a wrong one: a non-assertion label or an invalid phrase; null for a valid red. phraseInMessage is true
 * when the Reason is an assertion failure whose own message holds the phrase.
 * @param {string} reason
 * @returns {{ what: string, phraseInMessage: boolean } | null}
 */
export const reasonProblem = (reason) => {
  const lower = reason.toLowerCase();
  const label = Object.values(LABELS).find((l) => l !== LABELS.assertion && lower.startsWith(`${l}:`));
  if (label !== undefined) return { what: label, phraseInMessage: false };
  const phrase = INVALID_REASONS.find((p) => lower.includes(p));
  return phrase === undefined ? null : { what: phrase, phraseInMessage: lower.startsWith(`${LABELS.assertion}:`) };
};
/** Whether the argv runs the node test runner. */
const runsNodeTest = (argv) => argv.includes('--test');
/** Whether the argv selects the TAP reporter, as one argument or as two. */
const asksForTap = (argv) => argv.includes('--test-reporter=tap') || argv.some((part, index) => part === '--test-reporter' && argv[index + 1] === 'tap');
const quoted = (names) => names.map((name) => `"${name}"`).join(', ');

/**
 * Runs the card's gate command once and compares it with the card's red-evidence log: the log must be well formed, name the
 * same command and exit status, list the failing tests the run shows, cover every test criterion, and every failure must be
 * an assertion failure. The failing set always comes from the run. Output that is not TAP is not read for failures; the
 * log's shape, command and exit status are still checked, and a node --test gate without the TAP reporter gets the blocking finding red-evidence-tap-required, any other runner the warning red-evidence-unparsed-output.
 * @param {{ projectDir: string, card: Card, run?: CommandRunner, platform?: string }} input
 * @returns {Finding[]}
 */
export function checkRedEvidence({ projectDir, card, run = runCommand, platform = process.platform }) {
  const { result, findings: gateFindings } = runCardGate({ projectDir, card, run, platform });
  if (result === null) return gateFindings;
  const argv = /** @type {string[]} */ (card.gate);
  if (result.status === 0) return [notFailingFinding(argv)];
  const tap = parseTap(result.stdout);
  /** @type {Finding[]} */
  const findings = [];
  const flagged = new Set();
  const wrongReason = (name, what, advice) => {
    if (flagged.has(name)) return;
    flagged.add(name);
    findings.push(finding('red-evidence-wrong-reason', `Test "${name}" does not fail for the stated reason (${what}); only an assertion failure counts as red. ${advice ?? 'Fix the test or its imports so it fails by assertion, then run node core/scripts/red-evidence.mjs.'}`));
  };
  for (const f of tap.failures) {
    if (f.kind === 'assertion') continue;
    wrongReason(f.name, reasonOf(f), f.kind === 'file-load' ? 'The file did not load, so run it by hand (node <file>) to see the error, fix it so the test fails by assertion, then run node core/scripts/red-evidence.mjs.' : undefined);
  }

  for (const { id, texts } of sharedCriterionIds(card)) {
    findings.push(finding('red-evidence-criterion-id-shared', `Criteria ${quoted(texts)} all start with the id ${id}, so one failing test would count for every one of them. Give each criterion its own id (such as ${id}a and ${id}b) and name a failing test after each.`));
  }
  const logName = `${WORK_ROOT}/${card.id}/${CARD_FILES.redEvidence}`;
  const logFile = workFile(projectDir, card.id, CARD_FILES.redEvidence);
  const fix = `Run node core/scripts/red-evidence.mjs <projectDir> ${card.id} to write it from the run.`;
  if (!existsSync(logFile)) {
    findings.push(finding('red-evidence-missing', `Card ${card.id} has no red-evidence log at ${logName}. ${fix}`));
  } else {
    const { evidence, problems } = parseRedEvidence(readFileSync(logFile, 'utf8'));
    if (evidence === null) {
      findings.push(...problems.map((p) => finding('red-evidence-invalid', `${logName}: ${p}. ${fix}`)));
    } else {
      const known = cardCriterionIds(card);
      for (const row of evidence.rows) {
        if (!known.includes(row.criterion)) {
          findings.push(finding('red-evidence-unknown-criterion', `Row "${row.test}" names criterion "${row.criterion}", which is not a criterion id of this card. Use the id a criterion text starts with.`));
        } else if (criterionIn(row.test, [row.criterion]) === null) {
          findings.push(finding('red-evidence-unknown-criterion', `Row "${row.test}" names criterion "${row.criterion}", which is not in the test name. Name the test after its criterion id.`));
        }
        const problem = tap.isTap ? reasonProblem(row.reason) : null;
        if (problem !== null) wrongReason(row.test, `its Reason holds "${problem.what}"`, problem.phraseInMessage ? 'The phrase comes from the assertion\'s own message, so reword that message (the test itself is fine), then run node core/scripts/red-evidence.mjs.' : undefined);
      }
      const covered = new Set(evidence.rows.map((row) => row.criterion));
      for (const id of cardCriterionIds(card, 'test')) {
        if (!covered.has(id)) findings.push(finding('red-evidence-no-failing-test', `Criterion ${id} is verified by test but has no failing test in ${logName}. Write a test named after ${id} that fails by assertion, then run the script again.`));
      }
      for (const text of idlessTestCriteria(card)) {
        findings.push(finding('red-evidence-no-failing-test', `Criterion "${text}" is verified by test but its text starts with no id, so no failing test can be matched to it in ${logName}. Start the criterion text with an id like vf-01a, name a test after it that fails by assertion, then run the script again.`));
      }
      if (!sameList(evidence.command, argv)) findings.push(finding('red-evidence-stale', `The command in ${logName} is not the card's gate command. ${fix}`));
      if (evidence.exit_status !== result.status) findings.push(finding('red-evidence-stale', `${logName} says the run exited ${evidence.exit_status}, but it exited ${result.status}. ${fix}`));
      if (tap.isTap) {
        const logged = new Set(evidence.rows.map((row) => row.test));
        const ran = new Set(tap.failures.map((f) => f.name));
        const notLogged = [...ran].filter((name) => !logged.has(name));
        const notRun = [...logged].filter((name) => !ran.has(name));
        if (notLogged.length > 0 || notRun.length > 0) {
          const parts = [...(notLogged.length > 0 ? [`it does not list ${quoted(notLogged)}, which failed`] : []), ...(notRun.length > 0 ? [`it lists ${quoted(notRun)}, which did not fail`] : [])];
          findings.push(finding('red-evidence-stale', `${logName} disagrees with the run on the failing tests: ${parts.join('; ')}. ${fix}`));
        }
      }
    }
  }
  if (!tap.isTap) {
    if (runsNodeTest(argv) && !asksForTap(argv)) {
      findings.push(finding('red-evidence-tap-required', `The gate command ${JSON.stringify(argv)} runs node --test without the TAP reporter, so failing tests cannot be read and a crash could pass as red. Add --test-reporter=tap to the gate array in card.json, then run node core/scripts/red-evidence.mjs <projectDir> ${card.id}.`));
    } else {
      findings.push(finding('red-evidence-unparsed-output', `The gate command's output is not node:test TAP, so failing tests were not read; only the log's shape, command and exit status were checked. Add --test-reporter=tap to the gate command for the full check.`));
    }
  }
  return findings;
}
