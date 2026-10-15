import { GitError, runGit } from '../git.mjs';
import { scriptCommand } from '../script-command.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

/** The reported rule for a claimed card with no builder signal below the tier that refuses it; a warning, never a block. */
export const BUILDER_NOT_SIGNALLED_WARNING = 'builder-not-signalled-warning';
/** The reported rule for a recorded built commit that is not in the repository below the tier that refuses it. */
export const BUILDER_COMMIT_UNKNOWN_WARNING = 'builder-done-commit-unknown-warning';
const LISTED = 5;

const literal = (path) => `:(literal)${path}`;
const list = (items, total) => `${items.slice(0, LISTED).join(', ')}${total > LISTED ? `, and ${total - LISTED} more` : ''}`;

/**
 * A card leaves in progress only after its builder said it is finished: the claim records the head commit then (claim.mjs
 * done), and no commit after it, and no uncommitted change, may touch a path of the card's manifest. Other paths are never
 * counted, so a shared branch or a bookkeeping commit does not refuse. A card with no claim, an empty manifest or a project
 * that is not a git checkout is never refused. A claimed card with no signal is refused, or only warned about when `warn` is set.
 * @param {{ projectDir: string, card: Card, run?: import('../git.mjs').GitRunner, warn?: boolean }} input
 * @returns {Finding[]}
 */
export function checkBuilderDone({ projectDir, card, run = runGit, warn = false }) {
  const claim = card.claim;
  const manifest = card.manifest;
  const paths = [...(manifest?.add ?? []), ...(manifest?.edit ?? []), ...(manifest?.remove ?? [])];
  if (claim == null || paths.length === 0) return [];
  const claimCommand = `${scriptCommand(projectDir, 'claim.mjs')} ${projectDir} done ${card.id} --owner ${claim.owner}`;
  const record = `record it with claim.mjs done (${claimCommand})`;
  const finish = `Have the builder finish, ${record}, then try again.`;
  try {
    run(projectDir, ['rev-parse', 'HEAD']);
    if (claim.built === undefined) {
      return [{ rule: warn ? BUILDER_NOT_SIGNALLED_WARNING : 'builder-not-signalled', message: `Nobody recorded that the builder of ${card.id} is finished. Wait for the builder to say done, ${record}, then try again.`, path: card.id }];
    }
    if (claim.built.commit === null) return [];
    try {
      run(projectDir, ['cat-file', '-e', `${claim.built.commit}^{commit}`]);
    } catch (err) {
      if (!(err instanceof GitError)) throw err;
      return [{ rule: warn ? BUILDER_COMMIT_UNKNOWN_WARNING : 'builder-done-commit-unknown', message: `The commit ${claim.built.commit} recorded when the builder of ${card.id} said done is not in this repository (a rebase, a shallow or fresh clone, or a hand edit), so the work after it cannot be checked. Run ${claimCommand} again to record the current commit.`, path: card.id }];
    }
    const later =run(projectDir, ['log', '--format=%h %s', `${claim.built.commit}..HEAD`, '--', ...paths.map(literal)]).split('\n').filter(Boolean);
    if (later.length > 0) {
      return [{ rule: 'builder-not-done', message: `${later.length} commit${later.length === 1 ? '' : 's'} changed the card's manifest paths after the builder said done (${list(later, later.length)}). ${finish}`, path: card.id }];
    }
    const dirty = run(projectDir, ['status', '--porcelain', '-z', '--', ...paths.map(literal)]).split('\0').filter(Boolean).map((entry) => entry.slice(3));
    if (dirty.length > 0) {
      return [{ rule: 'builder-not-done', message: `The card's manifest paths have uncommitted changes (${list(dirty, dirty.length)}). ${finish}`, path: card.id }];
    }
  } catch (err) {
    if (!(err instanceof GitError)) throw err;
  }
  return [];
}
