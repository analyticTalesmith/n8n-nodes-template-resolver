import { lstatSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { cardPath } from '../board.mjs';
import { isProcessPath } from '../card-files.mjs';
import { readFrontmatter } from '../frontmatter.mjs';
import { GitError, changedFiles, runGit } from '../git.mjs';
import { TIERS } from '../layout.mjs';
import { stateFindings } from '../verdicts.mjs';
import { effectiveTier } from '../tier.mjs';
import { resolveProjectRoots } from '../project-roots.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../git.mjs').GitRunner} GitRunner */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

/** The card-level verification record, in the card folder. */
export const VERIFICATION_RECORD = 'verification.md';

const COMMIT = /^[0-9a-f]{7,40}$/i;
const NAMED_PATHS = 3;
const SHOWN_VALUE = 40;
const RERUN = 'Spawn the verification lead to rerun verification against the current code, then check again.';

/** A record field for a message: quoted, cut short, so a message never carries more than the value asked about. */
const shown = (value) => JSON.stringify(value.length > SHOWN_VALUE ? `${value.slice(0, SHOWN_VALUE)}...` : value);
const field = (data, key) => (typeof data[key] === 'string' ? data[key].trim() : '');

/** The record's frontmatter and text, or null when the file is absent, unreadable or has none. */
function load(file) {
  try {
    const text = readFileSync(file, 'utf8').split(/\r?\n/).join('\n');
    const data = readFrontmatter(text);
    return data === null ? null : { data, text };
  } catch {
    return null;
  }
}

function absent(file) {
  try { lstatSync(file); return false; }
  catch (cause) { return cause.code === 'ENOENT'; }
}

/** What to do about a verdict other than accept. */
function notAccepted(verdict) {
  if (verdict === 'revise') return 'The verdict is revise: fix the findings and move the card back to in progress, then verify again.';
  if (verdict === 'blocked') return 'The verdict is blocked: resolve the blocker, or have the human accept the item as manual (the lead then records accept with the item under Manual).';
  if (verdict === '') return 'The verdict is empty. Finish the verification run and record accept, revise or blocked.';
  return `The verdict is ${shown(verdict)}, which is not accept, revise or blocked. Finish the verification run and record one of them.`;
}

/**
 * The card folder holds verification.md with verdict accept, and no file outside docs/ephemeral changed between its
 * ran_against commit and the working tree. Committing the record, or later process-only work, keeps it fresh.
 * At product tier and above an accepted record also carries the four-state, two-verdict shape (see verdicts.mjs); below
 * product the older shape is accepted. `tier` defaults to the card's effective tier.
 * Git runs only through `run`; a git failure is a stale record, never a throw.
 * @param {{ projectDir: string, card: Card, required?: boolean, tier?: string, run?: GitRunner }} input
 * @returns {Finding[]}
 */
export function checkVerificationRecorded({ projectDir, card, required = true, tier, run = runGit }) {
  const found = cardPath(projectDir, card.id);
  const roots = resolveProjectRoots(projectDir);
  const root = roots.mode === 'local' ? roots.docsRoot : resolve(projectDir);
  const path = found === null ? VERIFICATION_RECORD : `${roots.mode === 'local' ? 'docs/' : ''}${relative(root, found.dir).replaceAll('\\', '/')}/${VERIFICATION_RECORD}`;
  const recordFile = found === null ? null : `${found.dir}/${VERIFICATION_RECORD}`;
  if (!required && recordFile !== null && absent(recordFile)) return [];
  if (!required && recordFile === null) return [];
  const loaded = recordFile === null ? null : load(recordFile);
  if (loaded === null) {
    return [{ rule: 'verification-missing', message: `${path} is missing, unreadable or has no frontmatter, so no verification of ${card.id} is on record; spawn the verification lead for this card, which writes the record.`, path }];
  }
  const { data, text } = loaded;
  const verdict = field(data, 'verdict');
  if (verdict !== 'accept') return [{ rule: 'verification-not-accepted', message: `${path} does not accept the card. ${notAccepted(verdict)}`, path }];

  const ranAgainst = field(data, 'ran_against');
  const needStates = TIERS.indexOf(tier ?? effectiveTier(projectDir, card).tier) >= TIERS.indexOf('product');
  const states = needStates ? stateFindings({ data, text, path }) : [];
  const stale = (reason) => [...states, { rule: 'verification-stale', message: `${path}: ${reason}. ${RERUN}`, path }];
  if (!COMMIT.test(ranAgainst)) return stale(ranAgainst === '' ? 'ran_against is empty' : `ran_against ${shown(ranAgainst)} is not a commit id`);
  let changes;
  try {
    const commit = run(projectDir, ['rev-parse', '--verify', '--quiet', `${ranAgainst}^{commit}`]).trim();
    changes = changedFiles(projectDir, commit, run);
  } catch (err) {
    if (!(err instanceof GitError)) throw err;
    return stale(`ran_against ${ranAgainst} is not a commit git can compare with the working tree`);
  }
  const outside = [...new Set(changes.flatMap((c) => [c.from, c.path]).filter((p) => p !== undefined && !isProcessPath(p)))].sort();
  if (outside.length === 0) return states;
  const more = outside.length > NAMED_PATHS ? ` and ${outside.length - NAMED_PATHS} more` : '';
  return stale(`files outside docs/ephemeral changed since ${ranAgainst.slice(0, 12)}: ${outside.slice(0, NAMED_PATHS).join(', ')}${more}`);
}
