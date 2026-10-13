import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { cardPath } from '../board.mjs';
import { resolveProjectRoots } from '../project-roots.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

/** The claim checker's report, in the card folder beside the other review files. */
export const CLAIM_CHECK_REPORT = 'claim-check.md';

// One line per claim: a cited path and range, then its class.
const CLAIM_LINE = /\S+:\d+(?:-\d+)?\b.*\b(?:confirmed|wrong|unsupported|inference|prescriptive)\b/i;
const slashes = (path) => String(path).replaceAll('\\', '/').replace(/^(\.\/)+/, '');

/** The card folder as a project-relative logical path, the way the other review checks name it. */
function logicalDir(projectDir, dir) {
  const roots = resolveProjectRoots(projectDir);
  const root = roots.mode === 'local' ? roots.docsRoot : resolve(projectDir);
  return `${roots.mode === 'local' ? 'docs/' : ''}${slashes(relative(root, dir))}`;
}

/**
 * An archaeology card is one whose manifest or docs impact names the target of a recover delta. It must hold the claim
 * checker's report before it leaves review: a claim-check.md with at least one line that cites a path and range and
 * gives its class. Whether the report is right stays the human's call; this proves only that the cold read happened.
 * @param {{ projectDir: string, card: Card, records: { op: string, target: string, status: string, readable: boolean }[] }} input
 * @returns {Finding[]}
 */
export function checkClaimChecked({ projectDir, card, records }) {
  const named = new Set([...card.manifest.add, ...card.manifest.edit, ...(Array.isArray(card.docs_impact) ? card.docs_impact : [])].map(slashes));
  const targets = records.filter((r) => r.readable && r.op === 'recover' && r.status === 'open' && named.has(slashes(r.target))).map((r) => r.target);
  if (targets.length === 0) return [];
  const location = cardPath(projectDir, card.id);
  const path = location === null ? CLAIM_CHECK_REPORT : `${logicalDir(projectDir, location.dir)}/${CLAIM_CHECK_REPORT}`;
  const fix = `Spawn a fresh research:claim-checker on ${targets.join(', ')} and save its report as ${CLAIM_CHECK_REPORT} in the card folder; fix each non-confirmed claim once, then check again.`;
  if (location === null) return [{ rule: 'claim-check-missing', message: `The card folder for ${card.id} cannot be found, so its claim check cannot be read. ${fix}`, path }];
  let text;
  try {
    text = readFileSync(join(location.dir, CLAIM_CHECK_REPORT), 'utf8');
  } catch {
    return [{ rule: 'claim-check-missing', message: `${card.id} recovers ${targets.join(', ')} but has no ${CLAIM_CHECK_REPORT}. ${fix}`, path }];
  }
  if (!text.split(/\r?\n/).some((line) => CLAIM_LINE.test(line))) {
    return [{ rule: 'claim-check-empty', message: `${CLAIM_CHECK_REPORT} has no line that cites a path and range and classes the claim as confirmed, wrong, unsupported, inference or prescriptive. ${fix}`, path }];
  }
  return [];
}
