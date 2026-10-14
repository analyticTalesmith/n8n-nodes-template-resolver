import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { cardPath } from './board.mjs';
import { CARD_FILES, workFile } from './card-files.mjs';
import { parseGateOutput } from './checks/gate-output.mjs';

/**
 * @typedef {{
 *   command: string[], exit_status: number, ran_at: string, tests: { passed: number | null, failed: number } | null,
 *   failing: string[], failing_total: number
 * }} GateRun
 */

/** The most failing test names the summary keeps, and the longest a kept name is. */
export const GATE_RUN_MAX_FAILING = 20;
const MAX_NAME = 200;

/**
 * Writes the summary of a card's gate run to gate-run.json in its work folder, so the review packet can show it: the
 * command, the exit status and, when the output is node:test TAP or a jest or vitest json report, the counts and the
 * failing test names. The summary is a convenience, so a project that does not exist, a card that is not on its board or a folder that cannot take the file is skipped, never an error.
 * @param {{ projectDir: string, card: { id?: unknown }, argv: string[], status: number, stdout: string, startedAt: number }} input
 */
export function recordGateRun({ projectDir, card, argv, status, stdout, startedAt }) {
  try {
    if (typeof card.id !== 'string' || !existsSync(projectDir) || cardPath(projectDir, card.id) === null) return;
    const output = parseGateOutput({ argv, stdout, projectDir, startedAt });
    const failing = output.failures.map((f) => f.name.slice(0, MAX_NAME));
    /** @type {GateRun} */
    const summary = {
      command: argv,
      exit_status: status,
      ran_at: new Date(startedAt).toISOString(),
      tests: output.parsed ? { passed: output.passed, failed: failing.length } : null,
      failing: failing.slice(0, GATE_RUN_MAX_FAILING),
      failing_total: failing.length,
    };
    const file = workFile(projectDir, card.id, CARD_FILES.gateRun);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`);
  } catch {
    // the summary is optional; the gate result does not depend on it
  }
}

const isCount = (value) => Number.isInteger(value) && value >= 0;

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
    const failingOk = Array.isArray(value?.failing) && value.failing.every((name) => typeof name === 'string');
    if (!argvOk || !Number.isInteger(value.exit_status) || !testsOk || !failingOk) return null;
    return {
      command: value.command,
      exit_status: value.exit_status,
      ran_at: typeof value.ran_at === 'string' ? value.ran_at : '',
      tests: value.tests === null ? null : { passed: value.tests.passed, failed: value.tests.failed },
      failing: value.failing,
      failing_total: isCount(value.failing_total) ? value.failing_total : value.failing.length,
    };
  } catch {
    return null;
  }
}
