import { isProcessPath } from '../card-files.mjs';
import { isPlainObject } from '../types.mjs';
import { isTestPath } from '../test-paths.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('../git.mjs').Change} Change */
/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {{ path: string, reason: string, approved_by: string }} TestAmendment */

export { isTestPath };

const finding = (rule, message, path) => ({ rule, message, ...(path === undefined ? {} : { path }) });
const filled = (value) => typeof value === 'string' && value.trim() !== '';
const isLogged = (entry) => isPlainObject(entry) && typeof entry.path === 'string' && typeof entry.reason === 'string' && typeof entry.approved_by === 'string';

/**
 * Tests are append-mostly: a modified, deleted or renamed test needs a logged reason and the lead's approval in the
 * card's test_amendments. Reads only the diff against the base commit, never a claim in the card.
 * @param {{ card: Card, changes: Change[] }} input
 * @returns {Finding[]}
 */
export function checkTestAmendments({ card, changes }) {
  const log = /** @type {{ test_amendments?: unknown }} */ (card).test_amendments;
  if (log !== undefined && !(Array.isArray(log) && log.every(isLogged))) {
    return [finding('test-amendments-invalid', 'test_amendments in card.json must be an array of { "path", "reason", "approved_by" } objects with string values. Fix it there.')];
  }
  const approved = new Set((log ?? []).filter((entry) => filled(entry.reason) && filled(entry.approved_by)).map((entry) => entry.path));
  const amended = new Set();
  for (const change of changes) {
    const path = change.status === 'R' ? change.from : ['M', 'D', 'T'].includes(change.status) ? change.path : undefined;
    if (path !== undefined && !isProcessPath(path) && isTestPath(path)) amended.add(path);
  }
  return [...amended]
    .filter((path) => !approved.has(path))
    .sort()
    .map((path) =>
      finding(
        'test-amended-unlogged',
        `The existing test ${path} was changed, deleted or renamed. Tests are append-mostly: once the lead approves, add { "path", "reason", "approved_by" } for it to test_amendments in card.json, or restore the test.`,
        path,
      ),
    );
}
