import { stripBom } from '../files.mjs';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CARD_FILES, WORK_ROOT, workFile } from '../card-files.mjs';
import { runCommand } from './boundary.mjs';
import { notFailingFinding, redProofArgv, runCardGate } from './card-gate.mjs';
import { frozenTestPaths } from '../packet-parts.mjs';
import { scriptCommand } from '../script-command.mjs';
import { parseGateOutput, parseTap } from './gate-output.mjs';
import { runnerOf } from './runner-json.mjs';

export { parseGateOutput, parseTap };

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./boundary.mjs').CommandRunner} CommandRunner */
/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {{ name: string, kind: 'assertion' | 'timeout' | 'file-load' | 'error' | 'cancelled', message: string }} TapFailure */
/** @typedef {{ command: string[], exit_status: number, tests_sha256: string | null, rows: { test: string, criterion: string, reason: string }[] }} RedEvidence */

/** Phrases that mark a Reason as a failure to run rather than a failure of the behavior; matched without regard to case. */
export const INVALID_REASONS = Object.freeze(['cannot start', 'missing import', 'syntax error', 'timeout', 'timed out', 'missing module', 'cannot find module', 'cannot load']);

/** The Reason label of each kind of failure. Only the assertion label is a valid red. */
const LABELS = Object.freeze({ assertion: 'assertion failed', timeout: 'timeout', 'file-load': 'file failed to load', error: 'error thrown', cancelled: 'cancelled' });
const NO_CRITERION = 'none';
const CRITERION_ID = /^[a-z][a-z0-9]*-[a-z0-9]+/;
const finding = (rule, message) => ({ rule, message });
const firstLine = (text) => String(text).split(/\r?\n/).map((line) => line.trim()).find((line) => line !== '') ?? '';
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A short hash of the test files a card names (its gate command and criteria traces), by path and content as they are on
 * disk. The red-evidence log carries it, so a log written for other tests than the card has now is not taken as its red run.
 * @param {string} projectDir
 * @param {Card} card
 * @returns {string} 12 hex characters
 */
export function testFilesHash(projectDir, card) {
  const hash = createHash('sha256');
  for (const path of frozenTestPaths(card).sort()) {
    const file = join(projectDir, path);
    hash.update(`${path}\0${existsSync(file) ? readFileSync(file) : 'missing'}\0`);
  }
  return hash.digest('hex').slice(0, 12);
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
  const lines = stripBom(String(text ?? '')).split(/\r?\n/);
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
  return problems.length > 0 ? { evidence: null, problems } : { evidence: { command, exit_status: /** @type {number} */ (status), tests_sha256: field('tests_sha256') || null, rows }, problems };
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
 * @param {{ cardId: string, command: string[], exitStatus: number, failures: TapFailure[], criteria: string[], projectDir?: string, testsHash?: string }} input
 * @returns {string}
 */
export function buildRedEvidence({ cardId, command, exitStatus, failures, criteria, projectDir, testsHash }) {
  const rows = failures.map((f) => `| ${cell(f.name)} | ${criterionIn(f.name, criteria) ?? NO_CRITERION} | ${cell(reasonOf(f))} |`);
  const covered = new Set(failures.map((f) => criterionIn(f.name, criteria)).filter((id) => id !== null));
  return [
    '---',
    `summary: Red evidence for ${cardId}: ${failures.length} failing ${failures.length === 1 ? 'test' : 'tests'} across ${covered.size} ${covered.size === 1 ? 'criterion' : 'criteria'}.`,
    `command: ${JSON.stringify(command)}`,
    `exit_status: ${exitStatus}`,
    ...(testsHash === undefined ? [] : [`tests_sha256: ${testsHash}`]),
    '---',
    '',
    `# Red evidence for ${cardId}`,
    '',
    `Written by \`${scriptCommand(projectDir, 'red-evidence.mjs')}\` from the first run of the tests. Do not edit by hand; run the script again.`,
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
/** What to add to a jest or vitest gate so its failures can be read. */
export const reportAdvice = (runner) =>
  runner === 'jest'
    ? 'Add --json to the gate array in card.json (jest then prints its report to stdout; do not give it --outputFile).'
    : 'Add --reporter=json and --outputFile=<file> to the gate array in card.json (vitest writes its json report to that file, and every run rewrites it).';
const quoted = (names) => names.map((name) => `"${name}"`).join(', ');

export const RED_RECORDED_EARLIER = 'red-evidence-recorded-earlier';
const recordedEarlierFinding = (id) =>
  finding(RED_RECORDED_EARLIER, `The gate command passes now because card ${id} was built after its red run; the red evidence was recorded before the build, for this same command, and is accepted as it stands. Do not edit the tests to make them fail again.`);

/**
 * Whether a passing gate command is only the built fix showing: the card was already moved to in progress (it has a base
 * commit) and its red-evidence log, written from a failing run of this same command, still covers every test criterion
 * with assertion failures. A card never built, or with a missing, other-command, green or incomplete log, is not covered.
 * @param {{ projectDir: string, card: Card, argv: string[] }} input
 */
function recordedBeforeBuild({ projectDir, card, argv }) {
  const base = /** @type {{ base_commit?: unknown }} */ (card).base_commit;
  if (typeof base !== 'string' || base === '') return false;
  const logFile = workFile(projectDir, card.id, CARD_FILES.redEvidence);
  if (!existsSync(logFile)) return false;
  const { evidence } = parseRedEvidence(readFileSync(logFile, 'utf8'));
  if (evidence === null || !sameList(evidence.command, argv) || evidence.exit_status === 0) return false;
  if (evidence.rows.some((row) => reasonProblem(row.reason) !== null)) return false;
  // A log that names the tests it was written for must still match them; an older log without the hash is judged as before.
  if (evidence.tests_sha256 !== null && evidence.tests_sha256 !== testFilesHash(projectDir, card)) return false;
  const covered = new Set(evidence.rows.map((row) => row.criterion));
  return idlessTestCriteria(card).length === 0 && cardCriterionIds(card, 'test').every((id) => covered.has(id));
}

/**
 * Runs the card's gate command once and compares it with the card's red-evidence log: the log must be well formed, name the
 * same command and exit status, list the failing tests the run shows, cover every test criterion, and every failure must be
 * an assertion failure. The failing set always comes from the run. Output that is neither TAP nor a jest or vitest json report is not read for failures; the
 * log's shape, command and exit status are still checked, a node --test gate without the TAP reporter gets the blocking finding red-evidence-tap-required, a jest or vitest gate the blocking finding red-evidence-report-required, any other runner the warning red-evidence-unparsed-output.
 * The command is the card's gate, or for a card with no gate its first gates entry whose level selectedLevels names (the first
 * entry when the selection is not known); see redProofArgv.
 * @param {{ projectDir: string, card: Card, run?: CommandRunner, platform?: string, selectedLevels?: string[] }} input
 * @returns {Finding[]}
 */
export function checkRedEvidence({ projectDir, card, run = runCommand, platform = process.platform, selectedLevels }) {
  const startedAt = Date.now();
  const argv = /** @type {string[]} */ (redProofArgv(card, selectedLevels));
  const { result, findings: gateFindings } = runCardGate({ projectDir, card, run, platform, argv });
  if (result === null) return gateFindings;
  if (result.status === 0) return recordedBeforeBuild({ projectDir, card, argv }) ? [recordedEarlierFinding(card.id)] : [notFailingFinding(argv)];
  const tap = parseGateOutput({ argv, stdout: result.stdout, projectDir, startedAt });
  /** @type {Finding[]} */
  const findings = [];
  const flagged = new Set();
  const wrongReason = (name, what, advice) => {
    if (flagged.has(name)) return;
    flagged.add(name);
    findings.push(finding('red-evidence-wrong-reason', `Test "${name}" does not fail for the stated reason (${what}); only an assertion failure counts as red. ${advice ?? `Fix the test or its imports so it fails by assertion, then run ${scriptCommand(projectDir, 'red-evidence.mjs')}.`}`));
  };
  for (const f of tap.failures) {
    if (f.kind === 'assertion') continue;
    wrongReason(f.name, reasonOf(f), f.kind === 'file-load' ? `The file did not load, so run it by hand (node <file>) to see the error, fix it so the test fails by assertion, then run ${scriptCommand(projectDir, 'red-evidence.mjs')}.` : undefined);
  }

  for (const { id, texts } of sharedCriterionIds(card)) {
    findings.push(finding('red-evidence-criterion-id-shared', `Criteria ${quoted(texts)} all start with the id ${id}, so one failing test would count for every one of them. Give each criterion its own id (such as ${id}a and ${id}b) and name a failing test after each.`));
  }
  const logName = `${WORK_ROOT}/${card.id}/${CARD_FILES.redEvidence}`;
  const logFile = workFile(projectDir, card.id, CARD_FILES.redEvidence);
  const fix = `Run ${scriptCommand(projectDir, 'red-evidence.mjs')} <projectDir> ${card.id} to write it from the run.`;
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
        const problem = tap.parsed ? reasonProblem(row.reason) : null;
        if (problem !== null) wrongReason(row.test, `its Reason holds "${problem.what}"`, problem.phraseInMessage ? `The phrase comes from the assertion's own message, so reword that message (the test itself is fine), then run ${scriptCommand(projectDir, 'red-evidence.mjs')}.` : undefined);
      }
      const covered = new Set(evidence.rows.map((row) => row.criterion));
      for (const id of cardCriterionIds(card, 'test')) {
        if (!covered.has(id)) findings.push(finding('red-evidence-no-failing-test', `Criterion ${id} is verified by test but has no failing test in ${logName}. Write a test named after ${id} that fails by assertion, then run the script again. A no-regression or pass-before criterion has no failing test to write: change its verify type to review or tool in card.json instead.`));
      }
      for (const text of idlessTestCriteria(card)) {
        findings.push(finding('red-evidence-no-failing-test', `Criterion "${text}" is verified by test but its text starts with no id, so no failing test can be matched to it in ${logName}. Start the criterion text with an id like vf-01a, name a test after it that fails by assertion, then run the script again. A no-regression or pass-before criterion has no failing test to write: change its verify type to review or tool in card.json instead.`));
      }
      if (!sameList(evidence.command, argv)) findings.push(finding('red-evidence-stale', `The command in ${logName} is not the card's proof command, ${argv.join(' ')}. ${fix}`));
      if (evidence.exit_status !== result.status) findings.push(finding('red-evidence-stale', `${logName} says the run exited ${evidence.exit_status}, but it exited ${result.status}. ${fix}`));
      if (tap.parsed) {
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
  if (!tap.parsed) {
    if (runsNodeTest(argv) && !asksForTap(argv)) {
      findings.push(finding('red-evidence-tap-required', `The gate command ${JSON.stringify(argv)} runs node --test without the TAP reporter, so failing tests cannot be read and a crash could pass as red. Add --test-reporter=tap to the gate array in card.json, then run ${scriptCommand(projectDir, 'red-evidence.mjs')} <projectDir> ${card.id}.`));
    } else if (runnerOf(argv) === 'jest' || runnerOf(argv) === 'vitest') {
      findings.push(finding('red-evidence-report-required', `The gate command ${JSON.stringify(argv)} printed no report the check can read, so failing tests cannot be read and a crash could pass as red. ${reportAdvice(runnerOf(argv))} Then run ${scriptCommand(projectDir, 'red-evidence.mjs')} <projectDir> ${card.id}.`));
    } else {
      findings.push(finding('red-evidence-unparsed-output', `The gate command's output is not node:test TAP or a jest or vitest json report, so failing tests were not read; only the log's shape, command and exit status were checked. Add --test-reporter=tap (node --test), --json (jest) or --reporter=json --outputFile=<file> (vitest) to the gate command for the full check.`));
    }
  }
  return findings;
}
