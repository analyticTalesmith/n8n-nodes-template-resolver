import { indexProblems } from '../index-docs.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

/**
 * Fails a directory index that is missing, has no generated block, no longer matches its documents,
 * or lists a document without a summary. Large files are not findings; the script warns about them.
 * @param {{ projectDir: string, dataRoot?: string }} context
 * @returns {Finding[]}
 */
export function checkIndexFresh({ projectDir, dataRoot }) {
  return indexProblems(projectDir, { dataRoot });
}
