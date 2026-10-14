import { readFileSync } from 'node:fs';
import { CARD_FILES, workFile } from './card-files.mjs';
import { parseRedEvidence } from './checks/red-evidence.mjs';
import { GATE_RUN_MAX_FAILING, readGateRun } from './gate-run.mjs';

const COMMAND_MAX = 300;
const NAME_MAX = 200;
const oneLine = (text, max) => (text.length > max ? `${text.slice(0, max)}...` : text).replace(/\s+/g, ' ');
const code = (text, max) => `\`${oneLine(text, max).replaceAll('`', "'")}\``;

/** @param {string[]} names @param {number} total */
const failingLine = (names, total) =>
  `Failing tests: ${names.length === 0 ? 'none' : names.map((name) => code(name, NAME_MAX)).join(', ')}${total > names.length ? `, and ${total - names.length} more` : ''}`;

/**
 * The Gate run section of a review packet: the card's gate command, its exit status, the test counts and the failing
 * test names, from the summary the gate wrote (gate-run.json) or, when none was written, from the card's red-evidence log,
 * which holds the run recorded before the build. It states output only, never how the work was done. Null when neither exists.
 * @param {string} projectDir
 * @param {string} id
 * @returns {string | null}
 */
export function gateRunSection(projectDir, id) {
  const run = readGateRun(projectDir, id);
  if (run !== null) {
    const passed = run.tests === null ? null : run.tests.passed === null ? 'passing count not stated' : `${run.tests.passed} passed`;
    return [
      '## Gate run',
      "The card's gate command as it last ran, before this packet was built. Output only: run the command yourself to check it.",
      `- Command: ${code(run.command.join(' '), COMMAND_MAX)}`,
      `- Exit status: ${run.exit_status}`,
      `- Tests: ${run.tests === null ? 'no test counts in its output' : `${passed}, ${run.tests.failed} failed`}`,
      `- ${failingLine(run.failing, run.failing_total)}`,
    ].join('\n');
  }
  let text;
  try {
    text = readFileSync(workFile(projectDir, id, CARD_FILES.redEvidence), 'utf8');
  } catch {
    return null;
  }
  const { evidence } = parseRedEvidence(text);
  if (evidence === null) return null;
  const names = [...new Set(evidence.rows.map((row) => row.test))];
  return [
    '## Gate run',
    "No gate run summary was written, so this is the card's recorded red run (recorded before the build, when its tests failed first). Output only: run the gate command yourself to see the current result.",
    `- Command: ${code(evidence.command.join(' '), COMMAND_MAX)}`,
    `- Exit status: ${evidence.exit_status}`,
    `- ${failingLine(names.slice(0, GATE_RUN_MAX_FAILING), names.length)}`,
  ].join('\n');
}
