import { readGateRun } from './gate-run.mjs';
import { shortSha } from './git.mjs';

/** Where a line says the run was made: at the short commit, or at an unrecorded commit when the run recorded none. */
const where = (commit) => (typeof commit === 'string' && commit !== '' ? `at commit ${shortSha(commit)}` : 'at an unrecorded commit');

/**
 * The Gate run section of a review packet: one line saying the gate was green at a commit, or that the green run is
 * stale. It is tool output from gate-run.json, never the builder's claim, and it carries no test output: a card in
 * review has a green gate by construction, so there are no failing names or counts to show. With levels recorded the
 * line names each level that ran. Null when there is no record or the recorded run was not green (the packet header
 * then says so); `diffHash` is the packet's own diff hash, which a record made against other code does not match.
 * @param {string} projectDir
 * @param {string} id
 * @param {string | null} [diffHash]
 * @returns {string | null}
 */
export function gateRunSection(projectDir, id, diffHash = null) {
  const run = readGateRun(projectDir, id);
  if (run === null || run.exit_status !== 0 || run.levels.some((entry) => entry.exit_status !== 0)) return null;
  const at = where(run.commit);
  // A record with no diff hash, or a packet with none to compare it with, cannot be told current, so it reads as stale.
  if (run.diff_sha256 === null || diffHash === null) return `## Gate run\n\nGate command last ran green ${at}, but the run cannot be matched to the code now: this run is stale.`;
  if (run.diff_sha256 !== diffHash) return `## Gate run\n\nGate command last ran green ${at}, but the code changed after it ran: this run is stale.`;
  const levels = run.levels.map((entry) => entry.level);
  if (levels.length > 0 && !(levels.length === 1 && levels[0] === 'gate')) return `## Gate run\n\nGates green ${at}: ${levels.join(', ')}.`;
  const counted = run.tests !== null && run.tests.passed !== null ? `${run.tests.passed} tests` : 'tests not counted';
  return `## Gate run\n\nGate command green ${at} (${counted}).`;
}
