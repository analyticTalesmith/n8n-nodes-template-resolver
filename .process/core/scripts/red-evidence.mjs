import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, isCardId, readCard } from '../lib/board.mjs';
import { CARD_FILES, WORK_ROOT, workFile } from '../lib/card-files.mjs';
import { runCardGate } from '../lib/checks/card-gate.mjs';
import { buildRedEvidence, cardCriterionIds, parseTap, reasonOf, reasonProblem, testFilesHash } from '../lib/checks/red-evidence.mjs';

/**
 * Runs the card's gate command and writes red-evidence.md in the card's work folder from its node:test TAP output: one row
 * per failing test. The log is written even when a failure is not an assertion failure, so the check can name it. Writes no
 * other file.
 * @param {string} projectDir
 * @param {string} id
 * @returns {{ ok: boolean, message: string, wrongReasons: string[] }} ok is false when nothing was written or a row is not an assertion failure
 */
export function writeRedEvidence(projectDir, id) {
  const card = readCard(projectDir, id);
  const { result, findings } = runCardGate({ projectDir, card });
  if (result === null) return { ok: false, message: findings.map((f) => f.message).join('\n'), wrongReasons: [] };
  if (result.status === 0) {
    return { ok: false, message: `The gate command passed, so there are no failing tests to record. Write the failing tests first.`, wrongReasons: [] };
  }
  const tap = parseTap(result.stdout);
  if (!tap.isTap || tap.failures.length === 0) {
    return { ok: false, message: 'The gate command did not print node:test TAP with a failing test, so nothing was recorded. Add --test-reporter=tap to the gate command and make sure a test fails.', wrongReasons: [] };
  }
  const text = buildRedEvidence({ cardId: id, command: /** @type {string[]} */ (card.gate), exitStatus: result.status ?? 1, failures: tap.failures, criteria: cardCriterionIds(card), projectDir, testsHash: testFilesHash(projectDir, card) });
  const file = workFile(projectDir, id, CARD_FILES.redEvidence);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  const wrongReasons = tap.failures.filter((f) => f.kind !== 'assertion').map((f) => f.name);
  const written = `wrote ${WORK_ROOT}/${id}/${CARD_FILES.redEvidence} with ${tap.failures.length} failing ${tap.failures.length === 1 ? 'test' : 'tests'}`;
  const phrased = tap.failures.filter((f) => f.kind === 'assertion' && reasonProblem(reasonOf(f)) !== null).map((f) => f.name);
  const problems = [
    ...(wrongReasons.length > 0 ? [`not an assertion failure: ${wrongReasons.join(', ')}. Fix those tests so they fail by assertion (for a file that failed to load, run it by hand to see the error)`] : []),
    ...(phrased.length > 0 ? [`the assertion message holds a phrase the check reads as a wrong reason (timeout, syntax error and the like): ${phrased.join(', ')}. Reword those assertion messages`] : []),
  ];
  return {
    ok: problems.length === 0,
    message: problems.length === 0 ? written : `${written}; ${problems.join('; ')}, then run this again.`,
    wrongReasons: [...wrongReasons, ...phrased],
  };
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = 'Usage: node red-evidence.mjs <projectDir> <cardId>';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const args = process.argv.slice(2);
  if (args.length !== 2) usage('Expected a project directory and a card id.');
  const [projectDir, id] = args;
  if (!isCardId(id)) usage(`"${id}" is not a card id (like 0001-some-title).`);
  // A nested node --test inherits this variable and then prints no TAP.
  delete process.env.NODE_TEST_CONTEXT;
  try {
    const { ok, message } = writeRedEvidence(resolve(projectDir), id);
    (ok ? console.log : console.error)(message);
    process.exit(ok ? 0 : 1);
  } catch (err) {
    if (err instanceof BoardError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
