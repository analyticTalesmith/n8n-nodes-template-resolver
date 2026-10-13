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
 * Runs the card's gate command once, without a shell. Returns its result, or a card-gate-command-failed finding and no
 * result when the gate is not an argv, the command timed out, could not start or ended by a signal. The exit status is
 * not judged here.
 * @param {{ projectDir: string, card: Card, run?: CommandRunner, platform?: string }} input
 * @returns {{ result: CommandResult | null, findings: Finding[] }}
 */
export function runCardGate({ projectDir, card, run = runCommand, platform = process.platform }) {
  const argv = card.gate;
  const failed = (message) => ({ result: null, findings: [finding('card-gate-command-failed', message)] });
  if (!isArgv(argv)) {
    return failed('The card gate must be a non-empty array of non-empty strings (program, then its arguments), run without a shell. Fix gate in card.json.');
  }
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
  return { result, findings: [] };
}

/**
 * The finding for a card gate command that passed when test-first needs it to fail.
 * @param {string[]} argv
 * @returns {Finding}
 */
export const notFailingFinding = (argv) =>
  finding('tests-not-failing', `The card's gate command (${argv.join(' ')}) passed before building; test-first needs the new tests to exist and fail at ready. Write the failing tests first, or mark the criteria as verified another way.`);

/**
 * Runs the card's own gate command (its planned tests and linters) without a shell. With expect pass the command must
 * exit 0; with expect fail it must exit non-zero, which proves test-first tests exist and fail before building.
 * @param {{ projectDir: string, card: Card, expect: 'pass' | 'fail', run?: CommandRunner, platform?: string }} input
 * @returns {Finding[]}
 */
export function checkCardGate({ projectDir, card, expect, run = runCommand, platform = process.platform }) {
  const { result, findings } = runCardGate({ projectDir, card, run, platform });
  if (result === null) return findings;
  const argv = /** @type {string[]} */ (card.gate);
  if (expect === 'fail') return result.status === 0 ? [notFailingFinding(argv)] : [];
  if (result.status === 0) return [];
  const output = `${result.stdout}\n${result.stderr}`.split(/\r?\n/).filter((l) => l.trim() !== '');
  const shown = output.slice(0, OUTPUT_LINES).join('\n');
  const rest = output.length > OUTPUT_LINES ? `\n(${output.length - OUTPUT_LINES} more lines)` : '';
  return [finding('card-gate-failed', `The card gate command (${argv.join(' ')}) exited ${result.status}. Fix what it reports.\n${shown}${rest}`)];
}
