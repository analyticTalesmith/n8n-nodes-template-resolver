import { isProcessPath } from '../card-files.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('../git.mjs').Change} Change */
/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {{ path: string, reason: string, approved_by: string }} TestAmendment */

const TEST_FOLDERS = new Set(['test', 'tests', '__tests__']);
const TEST_FILE = [/\.(test|spec|acceptance)\.[a-z0-9]+$/, /_test\.[a-z0-9]+$/, /^test_.+\.py$/];

/**
 * True when a project-relative path (forward slashes) is a test file: under a test folder or named like a test.
 * An acceptance script counts by file name (`<name>.acceptance.<ext>`), never by folder.
 * @param {string} path
 * @returns {boolean}
 */
export function isTestPath(path) {
  const parts = String(path).toLowerCase().split('/');
  const name = parts.pop() ?? '';
  return parts.some((part) => TEST_FOLDERS.has(part)) || TEST_FILE.some((pattern) => pattern.test(name));
}

const finding = (rule, message, path) => ({ rule, message, ...(path === undefined ? {} : { path }) });
const filled = (value) => typeof value === 'string' && value.trim() !== '';
const isLogged = (entry) => entry !== null && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.path === 'string' && typeof entry.reason === 'string' && typeof entry.approved_by === 'string';

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
