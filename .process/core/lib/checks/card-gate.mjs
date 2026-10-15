import { recordGateRun } from '../gate-run.mjs';
import { deltaDeliverables } from '../card-files.mjs';
import { reviewPatch, runGit } from '../git.mjs';
import { reviewOwnPaths } from '../review-scope.mjs';
import { WINDOWS_LAUNCHER_HINT, runCommand } from './boundary.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./boundary.mjs').CommandRunner} CommandRunner */
/** @typedef {import('./boundary.mjs').CommandResult} CommandResult */
/** @typedef {import('../card.mjs').Card} Card */

export const CARD_GATE_TIMEOUT_MS = 600000;
const OUTPUT_LINES = 20;

const finding = (rule, message) => ({ rule, message });
const isArgv = (value) => Array.isArray(value) && value.length > 0 && value.every((part) => typeof part === 'string' && part !== '');

/**
 * Runs one gate command (the card's gate unless `argv` is given), without a shell. Returns its result, or a
 * card-gate-command-failed finding and no result when the gate is not an argv, the command timed out, could not start
 * or ended by a signal. The exit status is not judged here. startedAt is the time the run began, in milliseconds.
 * @param {{ projectDir: string, card: Card, run?: CommandRunner, platform?: string, argv?: unknown }} input
 * @returns {{ result: CommandResult | null, findings: Finding[], startedAt?: number }}
 */
export function runCardGate({ projectDir, card, run = runCommand, platform = process.platform, argv = card.gate }) {
  const failed = (message) => ({ result: null, findings: [finding('card-gate-command-failed', message)] });
  if (!isArgv(argv)) {
    return failed('The card gate must be a non-empty array of non-empty strings (program, then its arguments), run without a shell. Fix gate in card.json.');
  }
  const startedAt = Date.now();
  const result = run(argv, { cwd: projectDir, timeoutMs: CARD_GATE_TIMEOUT_MS });
  const code = /** @type {any} */ (result.error)?.code;
  if (code === 'ETIMEDOUT') {
    return failed(`The card gate command (${argv[0]}) timed out after ${CARD_GATE_TIMEOUT_MS / 1000} s. Make it faster or fix what hangs.`);
  }
  if (result.error) {
    const hint = platform === 'win32' && (code === 'ENOENT' || code === 'EINVAL') ? ` On Windows, ${WINDOWS_LAUNCHER_HINT}.` : '';
    return failed(`The card gate command (${argv[0]}) could not start (${result.error.message}). Fix gate in card.json.${hint}`);
  }
  if (result.status === null) {
    return failed(`The card gate command (${argv[0]}) ended by a signal before it exited. Run it by hand to see why.`);
  }
  return { result, findings: [], startedAt };
}

/**
 * The commands a card's gate runs: the single gate as one entry with no level, then each entry of gates.
 * @param {Card} card
 * @returns {Array<{ level: string | null, argv: string[] }>} a malformed argv is passed on unchanged
 */
export function gateEntries(card) {
  // A malformed entry is kept as it is, so running it reports card-gate-command-failed instead of the entry silently not running.
  const single = card.gate === null || card.gate === undefined ? [] : [{ level: null, argv: /** @type {string[]} */ (card.gate) }];
  const listed = Array.isArray(/** @type {any} */ (card).gates) ? /** @type {any} */ (card).gates : [];
  return [...single, ...listed.map((entry) => ({ level: entry?.level ?? null, argv: entry?.argv }))];
}

/**
 * The one command that proves test-first for a card: its single gate when set; else the first gates entry whose level is in
 * selectedLevels, or the first entry when selectedLevels is not given or names none of them; null when the card has neither.
 * The test-first check, the red-evidence script and the gate's skip decision all take the command from here.
 * @param {Card} card
 * @param {string[]} [selectedLevels] the test levels the card's depth selects, when known
 * @returns {string[] | null} a malformed argv is passed on unchanged
 */
export function redProofArgv(card, selectedLevels) {
  if (card.gate !== null && card.gate !== undefined) return card.gate;
  const entries = gateEntries(card);
  const chosen = entries.find((entry) => entry.level !== null && selectedLevels?.includes(entry.level)) ?? entries[0];
  return chosen === undefined ? null : chosen.argv;
}

/**
 * The hash of the diff the packet would show (the same patch the review rounds hash, from the card's base commit), so the
 * record can tell a run made before the code changed again; null when there is no base commit or git cannot say.
 */
function diffHashOf(projectDir, card) {
  try {
    const base = /** @type {{ base_commit?: unknown }} */ (card).base_commit;
    return typeof base === 'string' && base !== '' ? reviewPatch(projectDir, base, runGit, { include: deltaDeliverables(projectDir, card), own: reviewOwnPaths(card) }).sha256 : null;
  } catch {
    return null;
  }
}

/**
 * The finding for a card gate command that passed when test-first needs it to fail.
 * @param {string[]} argv
 * @returns {Finding}
 */
export const notFailingFinding = (argv) =>
  finding('tests-not-failing', `The card's gate command (${argv.join(' ')}) passed before building; test-first needs the new tests to exist and fail at ready. Write the failing tests first, or mark the criteria as verified another way.`);

/**
 * Runs the card's own gate commands (its planned tests and linters) without a shell: the single gate and every gates
 * entry whose level is in selectedLevels (every entry when selectedLevels is not given). With expect pass every command
 * must exit 0 and each nonzero exit is one finding naming its level; with expect fail at least one must exit non-zero,
 * which proves test-first tests exist and fail before building. Green is only the exit code; no output is read. A run
 * that finished leaves its summary, with each level that ran, in the card's work folder (gate-run.json) for the review
 * packet.
 * @param {{ projectDir: string, card: Card, expect: 'pass' | 'fail', run?: CommandRunner, platform?: string, selectedLevels?: string[] }} input
 * @returns {Finding[]}
 */
export function checkCardGate({ projectDir, card, expect, run = runCommand, platform = process.platform, selectedLevels }) {
  const entries = gateEntries(card);
  if (entries.length === 0) return runCardGate({ projectDir, card, run, platform }).findings;
  const chosen = entries.filter((entry) => entry.level === null || selectedLevels === undefined || selectedLevels.includes(entry.level));
  const skipped = entries.filter((entry) => !chosen.includes(entry)).map((entry) => entry.level);
  /** @type {Finding[]} */
  const problems = [];
  const ran = [];
  for (const entry of chosen) {
    const { result, findings, startedAt } = runCardGate({ projectDir, card, run, platform, argv: entry.argv });
    if (result === null) problems.push(...findings.map((found) => (entry.level === null ? found : { ...found, message: `For the ${entry.level} level: ${found.message}` })));
    else ran.push({ ...entry, result, startedAt: startedAt ?? Date.now() });
  }
  if (ran.length > 0) {
    const [first] = ran;
    recordGateRun({
      projectDir, card, argv: first.argv, status: /** @type {number} */ (first.result.status), stdout: first.result.stdout, startedAt: first.startedAt,
      levels: ran.map((entry) => ({ level: entry.level ?? 'gate', command: entry.argv, exit_status: /** @type {number} */ (entry.result.status) })), skipped,
      diffSha256: diffHashOf(projectDir, card),
    });
  }
  if (problems.length > 0) return problems;
  if (expect === 'fail') return ran.some((entry) => entry.result.status !== 0) ? [] : [notFailingFinding(ran[0].argv)];
  return ran.filter((entry) => entry.result.status !== 0).map((entry) => {
    const output = `${entry.result.stdout}\n${entry.result.stderr}`.split(/\r?\n/).filter((l) => l.trim() !== '');
    const shown = output.slice(0, OUTPUT_LINES).join('\n');
    const rest = output.length > OUTPUT_LINES ? `\n(${output.length - OUTPUT_LINES} more lines)` : '';
    const where = entry.level === null ? '' : ` for the ${entry.level} level`;
    return finding('card-gate-failed', `The card gate command${where} (${entry.argv.join(' ')}) exited ${entry.result.status}. Fix what it reports.\n${shown}${rest}`);
  });
}
