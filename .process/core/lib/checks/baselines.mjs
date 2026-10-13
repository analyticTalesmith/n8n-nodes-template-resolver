import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isTokenFile } from './front-end-css.mjs';
import { resolveProjectPath, resolveProjectRoots } from '../project-roots.mjs';

/** @typedef {import('../git.mjs').Change} Change */
/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {{ at: string, files: Record<string, string> }} BaselineApproval */

const SHA256 = /^[0-9a-f]{64}$/;
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value !== '';

/**
 * Reads gate.front_end.baselines: absent gives a null list, a non-empty list of non-empty strings gives the list,
 * anything else gives a front-end-config-invalid finding.
 * @param {Record<string, unknown>} settings
 * @returns {{ list: readonly string[] | null, problem: Finding | null }}
 */
export function readBaselineSetting(settings) {
  const value = settings.baselines;
  if (value === undefined) return { list: null, problem: null };
  if (!Array.isArray(value) || value.length === 0 || !value.every(isNonEmptyString)) {
    return {
      list: null,
      problem: { rule: 'front-end-config-invalid', message: 'gate.front_end.baselines must be a non-empty list of path strings (an entry ending in "/" is a folder). Fix it in .process/aperture.json.' },
    };
  }
  return { list: value, problem: null };
}

/**
 * The baseline files a change touches, sorted: a path matched by an entry (a folder prefix ending in "/", or an exact
 * path). A rename counts its old and new path separately.
 * @param {Change[]} changes
 * @param {readonly string[]} baselines
 * @returns {string[]}
 */
export function changedBaselines(changes, baselines) {
  const paths = new Set();
  for (const change of changes) {
    for (const path of [change.path, change.status === 'R' ? change.from : undefined]) {
      if (path !== undefined && isTokenFile(path, baselines)) paths.add(path);
    }
  }
  return [...paths].sort();
}

/**
 * The sha256 of a file's raw bytes (never line-ending normalized), or "deleted" when it does not exist.
 * @param {string} projectDir
 * @param {string} path project-relative
 * @returns {string}
 */
export function baselineHash(projectDir, path) {
  try {
    return createHash('sha256').update(readFileSync(resolveProjectPath(resolveProjectRoots(projectDir), path))).digest('hex');
  } catch (err) {
    if (err.code === 'ENOENT') return 'deleted';
    throw err;
  }
}

/**
 * Judges that every changed visual baseline carries the human's approval: a record in the card holding the hash of the
 * exact bytes approved. Regenerating a baseline after approval makes it stale.
 * @param {{ projectDir: string, card: Card, changes: Change[], settings: Record<string, unknown> }} input
 * @returns {Finding[]}
 */
export function checkBaselines({ projectDir, card, changes, settings }) {
  const { list, problem } = readBaselineSetting(settings);
  if (problem !== null) return [problem];
  if (list === null) return [];
  const changed = changedBaselines(changes ?? [], list);
  if (changed.length === 0) return [];

  const record = /** @type {{ baseline_approval?: unknown }} */ (card).baseline_approval;
  const files = record === undefined ? {} : isPlainObject(record) && typeof record.at === 'string' && isPlainObject(record.files) ? record.files : null;
  if (files === null || !Object.values(files).every((hash) => hash === 'deleted' || (typeof hash === 'string' && SHA256.test(hash)))) {
    return [
      {
        rule: 'baseline-approval-invalid',
        message: 'baseline_approval in card.json is not { at, files } with each file mapped to a 64-character lowercase sha256 or "deleted". Do not edit it by hand; have the human at the gate run approve-baselines again.',
      },
    ];
  }
  const findings = [];
  for (const path of changed) {
    if (!Object.hasOwn(files, path)) {
      findings.push({
        rule: 'baseline-unapproved',
        message: `${path} is a changed visual baseline with no approval. Look at the image diff; the human at the gate then runs approve-baselines for this card. An agent must not regenerate a baseline to turn a test green.`,
        path,
      });
    } else {
      let current;
      try {
        current = baselineHash(projectDir, path);
      } catch (err) {
        findings.push({
          rule: 'baseline-unreadable',
          message: `${path} cannot be read (${err.code ?? err.message}). Make it a readable regular file, or remove it from the baseline list.`,
          path,
        });
        continue;
      }
      if (files[path] !== current) {
        findings.push({
          rule: 'baseline-approval-stale',
          message: `${path} changed after it was approved. Look at the image diff again; the human at the gate then runs approve-baselines for this card.`,
          path,
        });
      }
    }
  }
  return findings;
}
