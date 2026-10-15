import { existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { BoardError, cardPath, readCard } from './board.mjs';
import { parseCardId } from './card-id.mjs';
import { CARD_JSON } from './layout.mjs';
import { GitError, runGit } from './git.mjs';

/** @typedef {import('./git.mjs').GitRunner} GitRunner */

export const WORKTREES_DIR = '.worktrees';
/** The branch prefix of a card by its type; every other type is feature work. */
const PREFIX_BY_TYPE = Object.freeze({ bug: 'fix', security: 'fix' });

/** Raised for a refusal the caller can fix; the message is one line naming the cause. */
export class WorktreeError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message.replace(/\s+/g, ' ').trim());
    this.name = 'WorktreeError';
  }
}

const oneLine = (text) => text.trim().split(/\r?\n/)[0] ?? '';
const LABEL_WORDS = 4;
const slugOf = (cardId) => (parseCardId(cardId)?.slug ?? cardId).split('-').slice(0, LABEL_WORDS).join('-');

/**
 * The branch a card's worktree uses by default: the card's type decides the prefix, the card label cut to its first four words the name.
 * @param {string} cardId
 * @param {string} type
 */
export const defaultBranch = (cardId, type) => `${PREFIX_BY_TYPE[type] ?? 'feature'}/${slugOf(cardId)}`;

/** The branch checked out in a project, or its commit when detached. */
function currentRef(run, projectDir) {
  const branch = run(projectDir, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  return branch === 'HEAD' ? run(projectDir, ['rev-parse', 'HEAD']).trim() : branch;
}

function exists(run, cwd, ref) {
  try {
    run(cwd, ['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch (cause) {
    if (cause instanceof GitError) return false;
    throw cause;
  }
}

function cardOf(projectDir, cardId) {
  try {
    if (cardPath(projectDir, cardId) === null) throw new WorktreeError(`Card ${cardId} is not on the board of ${projectDir}. Check the id with the board listing.`);
    return readCard(projectDir, cardId);
  } catch (cause) {
    if (cause instanceof BoardError) throw new WorktreeError(cause.message);
    throw cause;
  }
}

/**
 * Cuts a worktree for a card under .worktrees/ from the cycle branch (the branch checked out in the project) or a given
 * ref, on a new branch. Refuses, creating nothing, when the card is unknown, the folder exists, the branch name is taken
 * or unusable, or the ref does not exist.
 * @param {{ projectDir: string, cardId: string, branch?: string, from?: string, run?: GitRunner }} input
 * @returns {{ path: string, branch: string, from: string }}
 */
export function createCardWorktree({ projectDir, cardId, branch, from, run = runGit }) {
  const root = resolve(projectDir);
  const card = cardOf(root, cardId);
  const name = branch ?? defaultBranch(cardId, card.type);
  if (name.startsWith('-') || name.includes('..') || /\s/.test(name) || !checkName(run, root, name)) {
    throw new WorktreeError(`"${name}" is not a usable branch name: use letters, digits, - and / without "..", for example feature/my-card.`);
  }
  const path = resolve(root, WORKTREES_DIR, name.replaceAll('/', '-'));
  const inside = relative(resolve(root, WORKTREES_DIR), path);
  if (inside === '' || inside.startsWith('..') || inside.includes(sep) || resolve(path) === root) {
    throw new WorktreeError(`The branch name ${name} would put the worktree outside ${WORKTREES_DIR}/. Choose another branch name.`);
  }
  if (existsSync(path)) throw new WorktreeError(`The worktree folder ${WORKTREES_DIR}/${name.replaceAll('/', '-')} already exists. Use it, or remove it first.`);
  if (exists(run, root, `refs/heads/${name}`)) throw new WorktreeError(`The branch ${name} already exists. Pass --branch with another name, or use the worktree that has it.`);
  const base = from ?? currentRef(run, root);
  if (from === undefined) {
    const location = cardPath(root, cardId);
    const file = `${relative(root, location.dir).split(sep).join('/')}/${CARD_JSON}`;
    if (!exists(run, root, `${base}:${file}`)) throw new WorktreeError(`The card ${cardId} is not committed on ${base}, so the worktree would lack it. Commit the card folder first, or pass --from with a ref that has it.`);
  }
  if (base.startsWith('-') || !exists(run, root, `${base}^{commit}`)) throw new WorktreeError(`The ref ${base} to cut from does not exist. Pass --from with a branch or commit.`);
  run(root, ['worktree', 'add', '-q', '-b', name, path, base]);
  return { path, branch: name, from: base };
}

function checkName(run, cwd, name) {
  try {
    run(cwd, ['check-ref-format', '--branch', name]);
    return true;
  } catch (cause) {
    if (cause instanceof GitError) return false;
    throw cause;
  }
}

const CASELESS = process.platform === 'win32' || process.platform === 'darwin';
const samePrefix = (path, base) => (CASELESS ? resolve(path).toLowerCase().startsWith(base.toLowerCase() + sep) : resolve(path).startsWith(base + sep));

/** The worktrees git lists under the project's .worktrees folder, with their branches. */
function cardWorktrees(run, root) {
  const base = resolve(root, WORKTREES_DIR);
  const blocks = run(root, ['worktree', 'list', '--porcelain']).split(/\r?\n\r?\n/);
  return blocks
    .map((block) => ({
      path: /^worktree (.*)$/m.exec(block)?.[1] ?? '',
      branch: /^branch refs\/heads\/(.*)$/m.exec(block)?.[1] ?? null,
    }))
    .filter(({ path, branch }) => branch !== null && samePrefix(path, base));
}

/**
 * Fast-forwards the cycle branch (the branch checked out in the project) to the tip of the card's worktree branch. Never
 * merges: when the cycle branch has commits the worktree branch lacks it changes nothing and says which is the first.
 * @param {{ projectDir: string, cardId: string, branch?: string, run?: GitRunner }} input
 * @returns {{ moved: string[], branch: string, cycleBranch: string }} the moved commits, oldest first, as `<short sha> <subject>`
 */
export function syncCardWorktree({ projectDir, cardId, branch, run = runGit }) {
  const root = resolve(projectDir);
  cardOf(root, cardId);
  const slug = slugOf(cardId);
  const found = cardWorktrees(run, root).filter((entry) => (branch === undefined ? entry.branch === slug || entry.branch.endsWith(`/${slug}`) : entry.branch === branch));
  if (found.length === 0) throw new WorktreeError(`No worktree for card ${cardId} is under ${WORKTREES_DIR}/. Create it first with worktree.mjs <projectDir> ${cardId}.`);
  if (found.length > 1) throw new WorktreeError(`More than one worktree matches card ${cardId} (${found.map((entry) => entry.branch).join(', ')}). Pass --branch with the one to sync.`);
  const [{ branch: workBranch }] = found;
  const cycleBranch = run(root, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  if (cycleBranch === 'HEAD') throw new WorktreeError('The project checkout is on a detached HEAD, so there is no cycle branch to fast-forward. Check out the cycle branch first.');
  const log = (range, flags = []) => run(root, ['log', '--reverse', '--format=%h %s', ...flags, range]).split(/\r?\n/).filter((line) => line !== '');
  const behind = log(`${workBranch}..${cycleBranch}`);
  if (behind.length > 0) {
    throw new WorktreeError(`Cannot fast-forward ${cycleBranch} to ${workBranch}: ${cycleBranch} has commits ${workBranch} lacks, the first is ${behind[0]}. Bring them into the worktree branch (git merge --ff-only ${cycleBranch} there, or rebase it), then sync again.`);
  }
  const moved = log(`${cycleBranch}..${workBranch}`);
  if (moved.length === 0) return { moved, branch: workBranch, cycleBranch };
  try {
    run(root, ['merge', '--ff-only', '-q', workBranch]);
  } catch (cause) {
    throw new WorktreeError(`git could not fast-forward ${cycleBranch}: ${oneLine(String(cause.cause?.stderr ?? cause.message))}`);
  }
  return { moved, branch: workBranch, cycleBranch };
}
