import { fileAtCommit, runGit } from '../git.mjs';
import { frozenTestPaths } from '../packet-parts.mjs';

/** @typedef {import('../git.mjs').GitRunner} GitRunner */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

/** The rule this check raises. It is a warning: the review still goes ahead, on the diff alone. */
export const FROZEN_TEST_MISSING = 'packet-frozen-test-missing';

/**
 * Warns when a test file the card names (its gate argv, then the paths of its criteria's traces) is not at the base
 * commit, because the review packet can then show the reviewer no frozen test for it. A compiled path in the gate
 * command is the usual cause: name the source test file there and list it in each criterion's traces.
 * @param {{ projectDir: string, card: { gate?: unknown, criteria?: Array<{ traces?: unknown }> }, base: string, run?: GitRunner }} input
 * @returns {Finding[]}
 */
export function checkFrozenTestsPresent({ projectDir, card, base, run = runGit }) {
  const missing = frozenTestPaths(card).filter((path) => fileAtCommit(projectDir, base, path, run) === null);
  return missing.map((path) => ({
    rule: FROZEN_TEST_MISSING,
    path,
    message: `${path} is named by the card's gate command or a criterion's traces but is not at the base commit, so the review packet cannot show it as a frozen test. Name the source test file (not a compiled copy) in the gate command, and list each criterion's test file paths in its traces; ignore this warning for a test the implementer writes.`,
  }));
}
