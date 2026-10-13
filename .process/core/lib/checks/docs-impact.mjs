import { localDocsHashes, validLocalDocsHashes } from '../local-docs-attestation.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../git.mjs').Change} Change */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

const slashes = (path) => String(path).replaceAll('\\', '/').replace(/^(\.\/)+/, '');
/** Longest docs_impact entry accepted, in characters. */
export const MAX_DOC_PATH_LENGTH = 260;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

/** Why a string docs_impact entry cannot be used (and must never be printed), or null when it is usable. */
const invalidEntry = (doc) => {
  if (typeof doc !== 'string') return null;
  if (CONTROL_CHARACTER.test(doc)) return 'contains a control character (such as a newline, carriage return or NUL)';
  if (doc.length > MAX_DOC_PATH_LENGTH) return `is longer than ${MAX_DOC_PATH_LENGTH} characters`;
  return null;
};
const docsOf = (card) => (Array.isArray(card.docs_impact) ? card.docs_impact : []);

/**
 * Confirms each living doc the card names was changed, or deferred to merge when deferral is still allowed.
 * @param {{ card: Card, changes: Change[], allowDeferred: boolean }} input
 * @returns {Finding[]}
 */
export function checkDocsImpact({ projectDir, card, changes, allowDeferred }) {
  const docs = docsOf(card);
  if (docs.length === 0) return [];
  /** @type {Finding[]} */
  const findings = [];
  const deferredValue = /** @type {{ docs_deferred?: unknown }} */ (card).docs_deferred;
  if (deferredValue !== undefined && typeof deferredValue !== 'boolean') {
    findings.push({
      rule: 'docs-deferred-invalid',
      message: `docs_deferred must be true or false, not ${JSON.stringify(deferredValue)}. Fix it in card.json; an invalid value counts as false.`,
    });
  }
  const deferred = deferredValue === true;
  const touched = new Set(changes.flatMap((change) => [slashes(change.path), ...(change.from === undefined ? [] : [slashes(change.from)])]));
  let localCurrent = null;
  let localBefore = null;
  if (projectDir !== undefined) {
    localCurrent = localDocsHashes(projectDir, docs.filter((doc) => typeof doc === 'string' && invalidEntry(doc) === null));
    if (localCurrent !== null) {
      localBefore = card.freeze?.local_docs_sha256 ?? (card.type === 'bug' ? card.local_baseline?.local_docs_sha256 : undefined);
      if (!validLocalDocsHashes(localBefore) || Object.keys(localCurrent).some((path) => !Object.hasOwn(localBefore, path))) {
        findings.push({ rule: 'unverifiable-local-docs', message: 'The card has no complete local hash baseline for its docs_impact paths. Return to shaping and freeze it, or use the bug fast path from backlog again.', path: 'freeze.local_docs_sha256' });
      }
    }
  }
  for (const [index, doc] of docs.entries()) {
    const invalid = invalidEntry(doc);
    if (invalid !== null) {
      findings.push({
        rule: 'docs-impact-invalid-entry',
        message: `docs_impact entry ${index + 1} ${invalid}, so it is not shown or checked. Fix it in card.json: each entry is a project-relative path to a living doc.`,
        path: 'docs_impact',
      });
      continue;
    }
    if (localCurrent !== null) {
      const logical = slashes(doc);
      if (validLocalDocsHashes(localBefore) && Object.hasOwn(localBefore, logical) && localBefore[logical] !== localCurrent[logical]) continue;
    } else if (touched.has(slashes(doc))) continue;
    if (deferred && allowDeferred) continue;
    const advice =
      deferred && !allowDeferred
        ? 'docs_deferred: true no longer helps because deferral ends at merge. Update the doc now.'
        : 'Update it, or set docs_deferred: true in card.json to defer it until merge.';
    findings.push({
      rule: 'docs-impact-not-updated',
      message: `${doc} is listed in docs_impact but was not changed. ${advice}`,
      path: doc,
    });
  }
  return findings;
}
