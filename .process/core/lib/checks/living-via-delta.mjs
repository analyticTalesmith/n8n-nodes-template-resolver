import { readDeltaRecords, reviewedPath } from '../delta.mjs';
import { CYCLES_DIR, TIERS } from '../layout.mjs';
import { localLivingChanges, LocalDocsAttestationError } from '../local-docs-attestation.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('../git.mjs').Change} Change */

/** From this tier a living document edited without a delta blocks the move; below it the edit is only a warning. */
export const LIVING_DELTA_FAIL_TIER = 'product';
export const LIVING_DELTA_RULE = 'living-without-delta';
export const LIVING_DELTA_WARNING = 'living-without-delta-warning';

/** The fix the gate names. */
export const LIVING_DELTA_FIX =
  'Record one with node .process/core/scripts/delta.mjs <projectDir> add <cycle> <slug> --op <add|modify|remove|recover> --target <path> --summary <text>, or revert the edit.';
/** The same fix, short enough that the handoff's 200-character line clip leaves it whole. */
export const LIVING_DELTA_FIX_SHORT = 'Record one with node .process/core/scripts/delta.mjs ... add, or revert the edit.';

const LIVING_PREFIX = 'docs/living/';
// The index script rewrites these, so an edit to one is never a direct change by a person or an agent.
const GENERATED_INDEX = 'INDEX.md';

// Only Markdown documents can be a delta's target (delta.mjs refuses anything else), so only they are guarded.
const isGuarded = (path) => path.startsWith(LIVING_PREFIX) && path.endsWith('.md') && path.split('/').at(-1) !== GENERATED_INDEX;

/**
 * Project-relative Markdown documents under docs/living/ among `paths` that no readable delta in a current (not
 * archived) cycle targets. INDEX.md files are exempt. A delta counts whether it is open or applied, and whether its cycle is open or
 * closed, because the docs steward applies and validates after a cycle closes and before it is archived.
 * @param {string} projectDir
 * @param {string[]} paths
 * @returns {string[]}
 */
export function livingWithoutDelta(projectDir, paths) {
  const guarded = [...new Set(paths.map(reviewedPath))].filter(isGuarded);
  if (guarded.length === 0) return [];
  const current = `${CYCLES_DIR}/`;
  const targeted = new Set(readDeltaRecords(projectDir).filter((r) => r.readable && r.path.startsWith(current)).map((r) => reviewedPath(r.target)));
  return guarded.filter((path) => !targeted.has(path));
}

/**
 * Reports each living document the card changed without a delta: a warning below LIVING_DELTA_FAIL_TIER, a failure
 * from it. A rename checks both its old and its new path.
 * @param {{ projectDir: string, changes: Change[], tier: string }} context
 * @returns {Finding[]}
 */
export function checkLivingViaDelta({ projectDir, changes, tier, card }) {
  let paths = changes.flatMap((change) => (change.status === 'R' && change.from !== undefined ? [change.from, change.path] : [change.path]));
  try {
    const local = localLivingChanges(projectDir, card);
    if (local !== null) paths = local.map((change) => change.path);
  } catch (cause) {
    if (!(cause instanceof LocalDocsAttestationError)) throw cause;
    return [{ rule: 'unverifiable-local-docs', message: cause.message, path: 'freeze.local_living_sha256' }];
  }
  const rule = TIERS.indexOf(tier) >= TIERS.indexOf(LIVING_DELTA_FAIL_TIER) ? LIVING_DELTA_RULE : LIVING_DELTA_WARNING;
  return livingWithoutDelta(projectDir, paths).map((path) => ({
    rule,
    path,
    message: `${path} changed without a delta. Living documents change through a delta in a current cycle. ${LIVING_DELTA_FIX}`,
  }));
}
