import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { cardPath } from './board.mjs';
import { CARD_FILES, workFile } from './card-files.mjs';
import { parseGateOutput } from './checks/gate-output.mjs';
import { headCommit } from './git.mjs';

/**
 * @typedef {{ level: string, command: string[], exit_status: number, commit: string | null }} GateLevelRun
 * @typedef {{
 *   command: string[], exit_status: number, ran_at: string, tests: { passed: number | null, failed: number } | null,
 *   commit: string | null, diff_sha256: string | null, levels: GateLevelRun[], skipped: string[]
 * }} GateRun
 */

/**
 * The full head commit of a directory, or null when it is not a git checkout or git cannot say.
 * @param {string} projectDir
 * @param {import('./git.mjs').GitRunner} [run]
 * @returns {string | null}
 */
export function headCommitOrNull(projectDir, run) {
  try {
    return headCommit(projectDir, { short: false, run });
  } catch {
    return null;
  }
}

/**
 * Writes the summary of a card's gate run to gate-run.json in its work folder, so the review packet can show it: the
 * command, the exit status, the passing count when the output states it (a node:test TAP, jest or vitest json report),
 * the commit the run was made at and a hash of the diff it was made against, so a run made before the code changed again
 * is told apart from a current one. No failing test names are kept: a card in review has a green gate. The summary is a convenience, so a project that does not exist, a card that is not on its board or a folder that cannot take the file is skipped, never an error.
 * With `levels`, each level that ran is listed with its command, exit status and the commit it ran at; `skipped` names
 * the levels the depth did not select.
 * @param {{ projectDir: string, card: { id?: unknown }, argv: string[], status: number, stdout: string, startedAt: number, diffSha256?: string | null, levels?: Array<{ level: string, command: string[], exit_status: number }>, skipped?: Array<string | null> }} input
 */
export function recordGateRun({ projectDir, card, argv, status, stdout, startedAt, levels = [], skipped = [], diffSha256 = null }) {
  try {
    if (typeof card.id !== 'string' || !existsSync(projectDir) || cardPath(projectDir, card.id) === null) return;
    const output = parseGateOutput({ argv, stdout, projectDir, startedAt });
    const failed = output.failures.length;
    /** @type {GateRun} */
    const summary = {
      command: argv,
      exit_status: status,
      ran_at: new Date(startedAt).toISOString(),
      tests: output.parsed ? { passed: output.passed, failed } : null,
      commit: commitOf(projectDir, false),
      diff_sha256: diffSha256,
      levels: levels.map((entry) => ({ ...entry, commit: commitOf(projectDir) })),
      skipped: skipped.filter((level) => typeof level === 'string'),
    };
    const file = workFile(projectDir, card.id, CARD_FILES.gateRun);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`);
  } catch {
    // the summary is optional; the gate result does not depend on it
  }
}

const isCount = (value) => Number.isInteger(value) && value >= 0;

/** The commit the project is at (short unless `short` is false), or null when it is not a repository with a commit. */
function commitOf(projectDir, short = true) {
  try {
    return headCommit(projectDir, { short });
  } catch {
    return null;
  }
}

/**
 * Reads a card's gate-run.json; null when it is missing or not a summary of the shape recordGateRun writes.
 * @param {string} projectDir
 * @param {string} id
 * @returns {GateRun | null}
 */
export function readGateRun(projectDir, id) {
  try {
    const value = JSON.parse(readFileSync(workFile(projectDir, id, CARD_FILES.gateRun), 'utf8'));
    const argvOk = Array.isArray(value?.command) && value.command.length > 0 && value.command.every((part) => typeof part === 'string');
    const testsOk = value?.tests === null || (typeof value?.tests === 'object' && isCount(value.tests.failed) && (value.tests.passed === null || isCount(value.tests.passed)));
    if (!argvOk || !Number.isInteger(value.exit_status) || !testsOk) return null;
    return {
      command: value.command,
      exit_status: value.exit_status,
      ran_at: typeof value.ran_at === 'string' ? value.ran_at : '',
      tests: value.tests === null ? null : { passed: value.tests.passed, failed: value.tests.failed },
      commit: typeof value.commit === 'string' && value.commit !== '' ? value.commit : null,
      diff_sha256: typeof value.diff_sha256 === 'string' && value.diff_sha256 !== '' ? value.diff_sha256 : null,
      levels: Array.isArray(value.levels)
        ? value.levels.filter((entry) => typeof entry?.level === 'string' && Array.isArray(entry.command) && Number.isInteger(entry.exit_status)).map((entry) => ({ level: entry.level, command: entry.command, exit_status: entry.exit_status, commit: typeof entry.commit === 'string' ? entry.commit : null }))
        : [],
      skipped: Array.isArray(value.skipped) ? value.skipped.filter((level) => typeof level === 'string') : [],
    };
  } catch {
    return null;
  }
}
