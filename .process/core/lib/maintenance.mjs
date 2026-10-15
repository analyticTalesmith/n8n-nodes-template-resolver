import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { GitError, runGit, shortSha } from './git.mjs';
import { isoDate } from './time.mjs';
import { toPosix } from './files.mjs';

/** The classes a sweep gives every branch, worktree, stash, orphan folder and remote branch. */
export const CLASSES = Object.freeze(['merged', 'contained', 'superseded', 'unique', 'dirty']);
/** Classes whose loss costs nothing: the work lives in the base or in another kept ref. */
const SAFE_CLASSES = new Set(['merged', 'contained', 'superseded']);
const ARCHIVE_DIR = '.local/archive';
const LOCAL_EXCLUDE = '/.local/';
const WORKTREES_DIR = '.worktrees';
const BUNDLE_NAME = 'refs.bundle';
const MANIFEST_NAME = 'manifest.json';
const TEMP_REF_PREFIX = 'refs/aperture-archive';
const REGENERABLE_IGNORED = /^(?:.*\/)?node_modules\/?$/;

export class MaintenanceError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'MaintenanceError';
  }
}

/**
 * @typedef {{ kind: 'branch' | 'worktree' | 'stash' | 'orphan' | 'remote', name: string, class: string, safe: boolean, reason: string, tip?: string, path?: string, branch?: string, subject?: string, index?: number }} Item
 * @typedef {{ mode: 'report' | 'apply', base: string, current: string, items: Item[], archive: string | null, deleted: Array<{ kind: string, name: string, tip: string }>, skipped: Array<{ kind: string, name: string, reason: string }> }} SweepResult
 */

const lines = (text) => text.split(/\r?\n/).filter((line) => line !== '');
const slashes = (path) => toPosix(String(path));
const caseless = process.platform === 'win32' || process.platform === 'darwin';
const samePath = (a, b) => (caseless ? slashes(resolve(a)).toLowerCase() === slashes(resolve(b)).toLowerCase() : slashes(resolve(a)) === slashes(resolve(b)));

/** Runs git; a git failure becomes null so a caller can treat "no" and "cannot" alike when that is right. */
function tryGit(run, cwd, args) {
  try {
    return run(cwd, args);
  } catch (cause) {
    if (cause instanceof GitError) return null;
    throw cause;
  }
}

/** The worktrees git knows, main one first. */
function listWorktrees(run, cwd) {
  const blocks = run(cwd, ['worktree', 'list', '--porcelain']).split(/\r?\n\r?\n/).filter((block) => block.trim() !== '');
  return blocks.map((block) => {
    const entry = { path: '', head: '', branch: null, detached: false, locked: null, prunable: null };
    for (const line of lines(block)) {
      const cut = line.indexOf(' ');
      const key = cut === -1 ? line : line.slice(0, cut);
      const value = cut === -1 ? '' : line.slice(cut + 1);
      if (key === 'worktree') entry.path = value;
      else if (key === 'HEAD') entry.head = value;
      else if (key === 'branch') entry.branch = value.replace(/^refs\/heads\//, '');
      else if (key === 'detached') entry.detached = true;
      else if (key === 'locked') entry.locked = value || 'locked';
      else if (key === 'prunable') entry.prunable = value || 'prunable';
    }
    return entry;
  });
}

/** Every ref as { name, short, sha }, with annotated tags peeled to their commit. */
function listRefs(run, cwd) {
  const out = run(cwd, ['for-each-ref', '--format=%(refname)%00%(objectname)%00%(*objectname)']);
  return lines(out).map((line) => {
    const [name, sha, peeled] = line.split('\0');
    return { name, sha: peeled || sha };
  });
}

/** Splits git status -z output into entries; a rename or copy carries its origin as a second token, which is dropped. */
function statusEntries(output) {
  const entries = [];
  const tokens = output.split('\0');
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.length < 4) continue;
    entries.push({ status: token.slice(0, 2).trim() || '?', path: token.slice(3) });
    if (token[0] === 'R' || token[0] === 'C') i += 1;
  }
  return entries;
}

/**
 * What stops a worktree being removed: tracked changes and untracked entries (`files`; an untracked folder is one
 * entry), and ignored entries other than node_modules, which a package install recreates (`ignored`).
 */
function uncommitted(run, path) {
  const all = statusEntries(run(path, ['status', '--porcelain=v1', '-z', '--ignored']));
  return {
    files: all.filter((entry) => entry.status !== '!!'),
    ignored: all.filter((entry) => entry.status === '!!' && !REGENERABLE_IGNORED.test(entry.path)).map((entry) => entry.path),
  };
}

const filesOrNone = (run, path) => {
  try {
    return uncommittedFiles(run, path);
  } catch (cause) {
    if (!(cause instanceof GitError)) throw cause;
    return [];
  }
};

/** The state of a worktree, or one unreadable entry when git cannot read it, so it is never taken for clean. */
function readableState(run, path) {
  try {
    return uncommitted(run, path);
  } catch (cause) {
    if (!(cause instanceof GitError)) throw cause;
    return { files: [{ status: '?', path: '(status unreadable)' }], ignored: [] };
  }
}

/** Every uncommitted file of one worktree, one entry per file, for the manifest. */
const uncommittedFiles = (run, path) => statusEntries(run(path, ['status', '--porcelain=v1', '-z', '--untracked-files=all']));

const dirtyReason = ({ files, ignored }) =>
  [files.length > 0 ? `${files.length} uncommitted entr${files.length === 1 ? 'y' : 'ies'}` : '', ignored.length > 0 ? `ignored files other than node_modules (${ignored[0]})` : '']
    .filter(Boolean)
    .join(' and ');

/** Finds the base the sweep compares against: refs to test, and the local name that is never deleted. */
function resolveBase(run, repo, override, primaryBranch) {
  const exists = (ref) => tryGit(run, repo, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null;
  if (override !== undefined) {
    if (typeof override !== 'string' || override === '' || override.startsWith('-') || !exists(override)) {
      throw new MaintenanceError(`The base "${override}" is not a commit in this repository. Name a branch or ref that exists.`);
    }
    const name = override.replace(/^(?:refs\/heads\/|refs\/remotes\/origin\/|origin\/)/, '');
    return { name, refs: [override] };
  }
  const head = tryGit(run, repo, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  const name = head ? head.trim().replace(/^origin\//, '') : ['main', 'master'].find((candidate) => exists(`refs/heads/${candidate}`)) ?? primaryBranch;
  const refs = [`refs/remotes/origin/${name}`, `refs/heads/${name}`].filter(exists);
  if (!name || refs.length === 0) {
    throw new MaintenanceError('Cannot tell the default branch (no origin/HEAD, no main or master). Pass --base <branch>.');
  }
  return { name, refs };
}

/**
 * Lists everything a sweep can clear, classifies each item, and in apply mode archives and then deletes what is safe.
 * Report mode changes nothing. Apply mode first writes a bundle and a manifest under .local/archive/<date>/ of the
 * main worktree and deletes only after both exist.
 * @param {string} repoDir any worktree of the repository
 * @param {{ apply?: boolean, base?: string, remote?: string[], pr?: (branch: string) => ({ state: string, headSha: string } | null | undefined), run?: import('./git.mjs').GitRunner, now?: Date }} [options]
 *   `pr` is the optional pull request lookup (gh); `remote` names remote branches the human approved for deletion.
 * @returns {SweepResult}
 * @throws {MaintenanceError} when the directory is not a repository, the base is unknown, or the archive cannot be written
 */
export function sweep(repoDir, { apply = false, base: baseOption, remote = [], pr, run = runGit, now = new Date() } = {}) {
  const cwd = resolve(repoDir);
  const top = tryGit(run, cwd, ['rev-parse', '--show-toplevel']);
  if (top === null) throw new MaintenanceError(`${cwd} is not inside a git repository. Run the sweep in a project that is one.`);
  const worktrees = listWorktrees(run, cwd);
  const main = worktrees[0];
  const repo = main.path;
  const currentWorktree = top.trim();
  const currentBranch = (tryGit(run, cwd, ['symbolic-ref', '--short', '-q', 'HEAD']) ?? '').trim();
  const base = resolveBase(run, repo, baseOption, main.branch);
  const protectedNames = new Map();
  for (const [name, why] of [[base.name, 'base branch'], [main.branch, 'checked out in the main worktree'], [currentBranch, 'current branch']]) {
    if (name && !protectedNames.has(name)) protectedNames.set(name, why);
  }
  const baseTips = base.refs.map((ref) => run(repo, ['rev-parse', `${ref}^{commit}`]).trim());
  const baseTrees = base.refs.map((ref) => run(repo, ['rev-parse', `${ref}^{tree}`]).trim());

  // One call per base lists every branch it already contains; later checks only pay for the rest.
  const mergedRefs = base.refs.map((ref) => new Set(lines(run(repo, ['for-each-ref', `--merged=${ref}`, '--format=%(refname)', 'refs/heads', 'refs/remotes']))));
  const ancestor = (a, b) => tryGit(run, repo, ['merge-base', '--is-ancestor', a, b]) !== null;
  const squashed = (tip, index) => {
    const out = tryGit(run, repo, ['merge-tree', '--write-tree', '--no-messages', base.refs[index], tip]);
    return out !== null && out.split(/\r?\n/)[0].trim() === baseTrees[index];
  };
  const patchesInBase = (tip, ref) => {
    const out = tryGit(run, repo, ['cherry', ref, tip]);
    return out !== null && lines(out).every((line) => line.startsWith('-'));
  };

  /**
   * Whether the base still carries the branch's work. Matching patches are not enough: the base may have applied them
   * and then reverted them. So every path the branch changed since the fork must be in the base as the branch has it,
   * or have been changed there since the fork, and a path the branch deleted must be gone from the base.
   */
  const workInBase = (tip, ref) => {
    const fork = tryGit(run, repo, ['merge-base', ref, tip])?.trim();
    const diff = fork ? tryGit(run, repo, ['diff', '--raw', '-z', '--no-renames', '--no-abbrev', fork, tip]) : null;
    if (!diff) return false;
    const tokens = diff.split('\0').filter(Boolean);
    for (let i = 0; i + 1 < tokens.length; i += 2) {
      const [, , before, after] = tokens[i].split(/\s+/);
      const inBase = tryGit(run, repo, ['rev-parse', '--verify', '--quiet', `${ref}:${tokens[i + 1]}`])?.trim() ?? null;
      const deleted = /^0+$/.test(after);
      if (deleted ? inBase !== null : inBase === null || (inBase !== after && inBase === before)) return false;
    }
    return true;
  };

  /** merged, superseded or unique, from the commit alone (and, last, the pull request). */
  const intrinsic = (tip, branch, { lookup, refName }) => {
    for (let i = 0; i < base.refs.length; i += 1) {
      if (refName ? mergedRefs[i].has(refName) : ancestor(tip, base.refs[i])) return { class: 'merged', reason: `already in ${base.refs[i].replace(/^refs\/(?:heads|remotes)\//, '')}` };
    }
    for (let i = 0; i < base.refs.length; i += 1) {
      if (squashed(tip, i)) return { class: 'merged', reason: `squash-merged: its changes are already in ${base.refs[i].replace(/^refs\/(?:heads|remotes)\//, '')}` };
    }
    for (const ref of base.refs) {
      if (patchesInBase(tip, ref) && workInBase(tip, ref)) return { class: 'superseded', reason: 'every commit has an equivalent patch in the base' };
    }
    if (lookup && pr && branch) {
      const found = pr(branch);
      if (found && String(found.state).toUpperCase() === 'MERGED' && String(found.headSha ?? '').toLowerCase() === tip.toLowerCase()) {
        return { class: 'merged', reason: 'its pull request merged at this tip' };
      }
    }
    return { class: 'unique', reason: 'has commits that are in no other kept ref' };
  };

  const refs = listRefs(run, repo);
  const localBranches = refs.filter((ref) => ref.name.startsWith('refs/heads/')).map((ref) => ({ name: ref.name.slice('refs/heads/'.length), tip: ref.sha }));
  const remoteBranches = refs
    .filter((ref) => ref.name.startsWith('refs/remotes/') && !ref.name.endsWith('/HEAD'))
    .map((ref) => ({ name: ref.name.slice('refs/remotes/'.length), tip: ref.sha }));
  const tags = refs.filter((ref) => ref.name.startsWith('refs/tags/'));
  const tipOfBase = (tip) => baseTips.includes(tip);

  /** @type {Item[]} */
  const items = [];

  // Branches: classify from the commit, then demote duplicates to contained.
  const branchItems = localBranches.map(({ name, tip }) => {
    const guard = protectedNames.get(name);
    const item = { kind: 'branch', name, tip, ...intrinsic(tip, name, { lookup: guard === undefined, refName: `refs/heads/${name}` }), safe: false };
    if (guard !== undefined) item.reason = `protected: ${guard}`;
    item.protected = guard !== undefined;
    return item;
  });
  const branchByName = new Map(branchItems.map((item) => [item.name, item]));
  const demotable = branchItems.filter((item) => item.class === 'unique' && !item.protected).sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const item of demotable) {
    const containing = lines(run(repo, ['for-each-ref', `--contains=${item.tip}`, '--format=%(refname)', 'refs/heads', 'refs/remotes', 'refs/tags']));
    const holder = containing.find((refName) => {
      if (refName.startsWith('refs/remotes/')) return !refName.endsWith('/HEAD');
      if (refName.startsWith('refs/tags/')) return true;
      const other = branchByName.get(refName.slice('refs/heads/'.length));
      return other !== undefined && other !== item && other.class === 'unique' && (other.tip !== item.tip || other.name < item.name);
    });
    if (holder) {
      item.class = 'contained';
      item.reason = `its commits are kept by ${holder.replace(/^refs\/(?:heads|remotes|tags)\//, '')}`;
    }
  }
  for (const item of branchItems) item.safe = !item.protected && SAFE_CLASSES.has(item.class);

  // Worktrees.
  const registered = worktrees.map((entry) => entry.path);
  const worktreeItems = [];
  const heldByKeeper = (tip) =>
    lines(run(repo, ['for-each-ref', `--contains=${tip}`, '--format=%(refname)', 'refs/heads', 'refs/remotes', 'refs/tags'])).some((refName) => {
      if (refName.startsWith('refs/heads/')) return branchByName.get(refName.slice('refs/heads/'.length))?.safe === false;
      return !refName.endsWith('/HEAD');
    });
  // A branch whose only reflog entry is its creation has no commits of its own: a session may be about to use it.
  const justCreated = (branch) => {
    const log = lines(tryGit(run, repo, ['reflog', 'show', '--format=%gs', `refs/heads/${branch}`]) ?? '');
    return log.length > 0 && log.every((entry) => entry.startsWith('branch: Created from'));
  };
  const manifestWorktrees = [];
  for (const entry of worktrees) {
    const isMain = samePath(entry.path, repo);
    const isCurrent = samePath(entry.path, currentWorktree);
    const name = slashes(entry.path);
    // A worktree whose status git cannot read is kept, never treated as clean.
    const state = entry.prunable ? { files: [], ignored: [] } : readableState(run, entry.path);
    manifestWorktrees.push({ path: name, rawPath: entry.path, branch: entry.branch, head: entry.head, dirty: state.files.length > 0 });
    if (isMain || isCurrent) continue;
    const item = { kind: 'worktree', name, path: name, branch: entry.branch ?? undefined, tip: entry.head };
    if (entry.prunable) {
      // Pruning drops the worktree's reflog, so a detached head is judged like any other commit and kept when nothing else holds it.
      if (entry.branch || !entry.head) {
        worktreeItems.push({ ...item, class: 'contained', safe: true, reason: 'its folder is gone; only the registration is left', prune: true });
        continue;
      }
      const own = intrinsic(entry.head, null, { lookup: false });
      const held = own.class === 'unique' && heldByKeeper(entry.head);
      const cls = held ? 'contained' : own.class;
      const why = held ? 'its commits are kept by another ref' : own.reason;
      worktreeItems.push({ ...item, class: cls, safe: SAFE_CLASSES.has(cls), reason: `its folder is gone; ${why}`, prune: true });
      continue;
    }
    const branchItem = entry.branch ? branchByName.get(entry.branch) : undefined;
    let verdict;
    if (branchItem?.protected) verdict = { class: branchItem.class, safe: false, reason: branchItem.reason };
    else if (state.files.length > 0 || state.ignored.length > 0) verdict = { class: 'dirty', safe: false, reason: dirtyReason(state) };
    else if (baseTips.includes(entry.head) || (entry.branch && justCreated(entry.branch))) verdict = { class: branchItem?.class ?? 'merged', safe: false, reason: 'fresh branch with no commits of its own, possibly in use' };
    else if (branchItem) verdict = { class: branchItem.class, safe: branchItem.safe, reason: branchItem.reason };
    else {
      const own = intrinsic(entry.head, null, { lookup: false });
      const held = own.class === 'unique' && heldByKeeper(entry.head);
      const cls = held ? 'contained' : own.class;
      verdict = { class: cls, safe: SAFE_CLASSES.has(cls), reason: held ? 'its commits are kept by another ref' : own.reason };
    }
    if (entry.locked && verdict.class !== 'dirty') verdict = { ...verdict, safe: false, reason: `locked worktree (${verdict.reason})` };
    else if (entry.locked) verdict.reason = `locked worktree (${verdict.reason})`;
    worktreeItems.push({ ...item, ...verdict });
  }
  // A branch checked out in a worktree that stays cannot be deleted either.
  for (const wt of worktreeItems) {
    if (wt.safe || !wt.branch) continue;
    const branchItem = branchByName.get(wt.branch);
    if (branchItem?.safe) {
      branchItem.safe = false;
      branchItem.reason = `checked out in ${wt.path}, which is kept (${wt.reason})`;
    }
  }

  // Stashes.
  const stashItems = [];
  for (const line of lines(tryGit(run, repo, ['stash', 'list', '--format=%H%x00%gd%x00%gs']) ?? '')) {
    const [sha, selector, subject] = line.split('\0');
    const index = Number(/\{(\d+)\}/.exec(selector)?.[1]);
    const hasUntracked = tryGit(run, repo, ['rev-parse', '--verify', '--quiet', `${sha}^3`]) !== null;
    const done = !hasUntracked && base.refs.some((ref, i) => squashed(sha, i));
    stashItems.push({
      kind: 'stash',
      name: selector,
      index,
      tip: sha,
      subject,
      class: done ? 'superseded' : 'unique',
      safe: done,
      reason: done ? 'its change is already in the base' : hasUntracked ? 'holds untracked files the base lacks' : 'holds changes the base lacks',
    });
  }

  // Orphan folders under .worktrees.
  const orphanItems = [];
  const wtRoot = join(repo, WORKTREES_DIR);
  if (existsSync(wtRoot)) {
    for (const entry of readdirSync(wtRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const path = join(wtRoot, entry.name);
      if (registered.some((known) => samePath(known, path))) continue;
      const empty = readdirSync(path).length === 0;
      orphanItems.push({
        kind: 'orphan',
        name: entry.name,
        path: slashes(path),
        class: empty ? 'contained' : 'dirty',
        safe: empty,
        reason: empty ? 'empty folder git does not know' : 'folder git does not know holds files',
      });
    }
  }

  // Remote branches are never safe on their own; the human names them.
  const remoteItems = remoteBranches.map(({ name, tip }) => {
    const verdict = intrinsic(tip, null, { lookup: false, refName: `refs/remotes/${name}` });
    const approvable = SAFE_CLASSES.has(verdict.class) && name.split('/').slice(1).join('/') !== base.name;
    return { kind: 'remote', name, tip, ...verdict, safe: false, reason: approvable ? `${verdict.reason}; deleted only when named with --remote` : verdict.reason };
  });

  items.push(...branchItems.map(({ protected: _p, ...rest }) => rest), ...worktreeItems, ...stashItems, ...orphanItems, ...remoteItems);
  /** @type {SweepResult} */
  const result = { mode: apply ? 'apply' : 'report', base: base.name, current: currentBranch || '(detached)', items, archive: null, deleted: [], skipped: [] };
  if (!apply) {
    result.skipped = items.filter((item) => !item.safe && item.kind !== 'remote').map(({ kind, name, reason }) => ({ kind, name, reason }));
    return result;
  }

  // Apply: plan the remote deletions the human named, then archive, then delete.
  const remotes = lines(tryGit(run, repo, ['remote']) ?? '');
  const remoteTargets = [];
  for (const wanted of remote) {
    const owner = remotes.find((r) => wanted.startsWith(`${r}/`));
    const found = remoteBranches.find((r) => r.name === wanted);
    if (!owner || !found) {
      result.skipped.push({ kind: 'remote', name: wanted, reason: 'no such remote branch; run git fetch --prune and name it as <remote>/<branch>' });
    } else if (wanted.slice(owner.length + 1) === base.name || protectedNames.has(wanted.slice(owner.length + 1))) {
      result.skipped.push({ kind: 'remote', name: wanted, reason: 'the base or a protected branch is never deleted' });
    } else if (!remoteTargets.some((t) => t.name === wanted)) {
      remoteTargets.push({ kind: 'remote', name: wanted, remote: owner, branch: wanted.slice(owner.length + 1), tip: found.tip });
    }
  }
  const targets = [
    ...worktreeItems.filter((item) => item.safe),
    ...branchItems.filter((item) => item.safe),
    ...stashItems.filter((item) => item.safe),
    ...orphanItems.filter((item) => item.safe),
    ...remoteTargets,
  ];
  if (targets.length === 0) {
    result.skipped.push(...items.filter((item) => !item.safe && item.kind !== 'remote').map(({ kind, name, reason }) => ({ kind, name, reason })));
    return result;
  }

  excludeLocalArchive(repo, run);
  const folder = freshArchiveFolder(repo, now);
  result.archive = slashes(folder);
  const manifest = {
    created: now.toISOString(),
    base: base.name,
    baseRefs: base.refs,
    baseTips,
    current: result.current,
    restore: `git fetch ${BUNDLE_NAME} <ref>:<ref> restores a bundled ref at its old tip; the bundle needs the base commits, which stay in the repository.`,
    refs: refs.map(({ name, sha }) => ({ name, sha })),
    worktrees: manifestWorktrees.map(({ path, branch, head }) => ({ path, branch, head })),
    stashes: stashItems.map(({ name, tip, subject }) => ({ name, sha: tip, subject })),
    uncommitted: manifestWorktrees.flatMap(({ path, rawPath, dirty }) =>
      (dirty ? filesOrNone(run, rawPath) : []).map(({ status, path: file }) => {
        const full = join(path, file);
        const rel = relative(repo, full);
        return { worktree: path, status, path: slashes(rel.startsWith('..') || isAbsolute(rel) ? full : rel) };
      }),
    ),
    orphans: orphanItems.map(({ name, path, class: cls }) => ({ name, path, class: cls })),
    planned: targets.map(({ kind, name, tip }) => ({ kind, name, tip })),
    deleted: [],
    skipped: [],
  };
  const tempRefs = [];
  try {
    mkdirSync(folder, { recursive: true });
    const bundled = [];
    let counter = 0;
    for (const target of targets) {
      if (target.kind === 'branch') bundled.push({ ref: `refs/heads/${target.name}`, tip: target.tip });
      else if (target.kind === 'remote') bundled.push({ ref: `refs/remotes/${target.name}`, tip: target.tip });
      else if (target.kind === 'stash' || (target.kind === 'worktree' && !target.branch)) {
        const ref = `${TEMP_REF_PREFIX}/${target.kind}-${counter}`;
        counter += 1;
        run(repo, ['update-ref', ref, target.tip]);
        tempRefs.push(ref);
        bundled.push({ ref, tip: target.tip });
      }
    }
    const needed = bundled.filter(({ tip }) => !baseTips.some((baseTip) => ancestor(tip, baseTip)));
    if (needed.length > 0) {
      run(repo, ['bundle', 'create', join(folder, BUNDLE_NAME), ...needed.map(({ ref }) => ref), ...baseTips.map((tip) => `^${tip}`)]);
    }
    writeFileSync(join(folder, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
  } catch (cause) {
    throw new MaintenanceError(`Could not write the archive in ${folder} (${cause.message}). Nothing was deleted; fix the cause and run the sweep again.`);
  } finally {
    for (const ref of tempRefs) tryGit(run, repo, ['update-ref', '-d', ref]);
  }

  // Deletions, always without a force flag on git worktree remove or git push.
  const done = (kind, name, tip) => result.deleted.push({ kind, name, tip });
  const skip = (kind, name, reason) => result.skipped.push({ kind, name, reason });
  const failedWorktrees = new Set();
  for (const wt of worktreeItems.filter((item) => item.safe)) {
    try {
      if (wt.prune) {
        run(repo, ['worktree', 'prune']);
        done('worktree', wt.name, wt.tip);
        continue;
      }
      const state = uncommitted(run, wt.path);
      if (state.files.length > 0 || state.ignored.length > 0) throw new MaintenanceError('it became dirty after the report');
      run(repo, ['worktree', 'remove', wt.path]);
      done('worktree', wt.name, wt.tip);
    } catch (cause) {
      failedWorktrees.add(wt.name);
      skip('worktree', wt.name, `could not remove it (${cause.message})`);
    }
  }
  for (const item of branchItems.filter((candidate) => candidate.safe)) {
    const wt = worktreeItems.find((candidate) => candidate.branch === item.name);
    if (wt && failedWorktrees.has(wt.name)) {
      skip('branch', item.name, `checked out in ${wt.path}, which could not be removed`);
      continue;
    }
    const now = tryGit(run, repo, ['rev-parse', '--verify', '--quiet', `refs/heads/${item.name}`])?.trim();
    if (now !== item.tip) {
      skip('branch', item.name, 'it moved after the report; run the sweep again');
      continue;
    }
    try {
      // The bundle holds the tip, so a squash-merged branch that -d would refuse is recoverable.
      run(repo, ['branch', '-D', '--', item.name]);
      done('branch', item.name, item.tip);
    } catch (cause) {
      skip('branch', item.name, `could not delete it (${cause.message})`);
    }
  }
  for (const item of stashItems.filter((candidate) => candidate.safe).sort((a, b) => b.index - a.index)) {
    const now = tryGit(run, repo, ['rev-parse', '--verify', '--quiet', `stash@{${item.index}}`])?.trim();
    if (now !== item.tip) {
      skip('stash', item.name, 'it moved after the report; run the sweep again');
      continue;
    }
    try {
      run(repo, ['stash', 'drop', '-q', `stash@{${item.index}}`]);
      done('stash', item.name, item.tip);
    } catch (cause) {
      skip('stash', item.name, `could not drop it (${cause.message})`);
    }
  }
  for (const item of orphanItems.filter((candidate) => candidate.safe)) {
    try {
      rmdirSync(item.path);
      done('orphan', item.name, '');
    } catch (cause) {
      skip('orphan', item.name, `could not remove it (${cause.message})`);
    }
  }
  for (const target of remoteTargets) {
    try {
      // The lease names the tip the report and bundle hold, so a branch that moved on the remote since the last fetch is kept.
      run(repo, ['push', `--force-with-lease=refs/heads/${target.branch}:${target.tip}`, target.remote, '--delete', '--', target.branch]);
      done('remote', target.name, target.tip);
    } catch (cause) {
      const stale = /stale info|rejected|lease/i.test(cause.message);
      skip('remote', target.name, stale ? `the remote branch is not at ${shortSha(target.tip)} any more; run git fetch --prune ${target.remote} and sweep again` : `could not delete it (${cause.message})`);
    }
  }
  for (const item of items) {
    if (!item.safe && item.kind !== 'remote' && !result.skipped.some((s) => s.kind === item.kind && s.name === item.name)) skip(item.kind, item.name, item.reason);
  }
  manifest.deleted = result.deleted;
  manifest.skipped = result.skipped;
  writeFileSync(join(folder, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
  return result;
}

/** A dated, not yet existing folder under .local/archive of the main worktree: <date>, then <date>-2, <date>-3. */
function freshArchiveFolder(repo, now) {
  const date = isoDate(now);
  let folder = join(repo, ARCHIVE_DIR, date);
  for (let n = 2; existsSync(folder); n += 1) folder = join(repo, ARCHIVE_DIR, `${date}-${n}`);
  return folder;
}

/**
 * Adds /.local/ to the repository's local exclude (never to a tracked ignore file) so the archive is not committed.
 * @param {string} dir the main worktree
 * @param {import('./git.mjs').GitRunner} [run]
 * @returns {boolean} whether a line was added
 */
export function excludeLocalArchive(dir, run = runGit) {
  const out = tryGit(run, dir, ['rev-parse', '--git-path', 'info/exclude']);
  if (out === null) return false;
  const file = resolve(dir, out.trim());
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (text.split(/\r?\n/).includes(LOCAL_EXCLUDE)) return false;
  mkdirSync(resolve(file, '..'), { recursive: true });
  appendFileSync(file, `${text && !text.endsWith('\n') ? '\n' : ''}${LOCAL_EXCLUDE}\n`);
  return true;
}

/**
 * The report as plain text: items grouped by kind with class and reason, then what was archived and deleted.
 * @param {SweepResult} result
 * @returns {string}
 */
export function formatReport(result) {
  const out = [`Sweep ${result.mode}: base ${result.base}, current ${result.current}`];
  const titles = { branch: 'Branches', worktree: 'Worktrees', stash: 'Stashes', orphan: 'Orphan folders in .worktrees', remote: 'Remote branches' };
  for (const kind of Object.keys(titles)) {
    const group = result.items.filter((item) => item.kind === kind);
    if (group.length === 0) continue;
    out.push('', `${titles[kind]}:`);
    for (const item of group) {
      const tip = item.tip ? ` ${shortSha(item.tip)}` : '';
      const label = item.subject ? `${item.name} "${item.subject}"` : item.name;
      out.push(`  ${item.safe ? 'safe' : 'keep'}  ${item.class.padEnd(10)} ${label}${tip}  ${item.reason}`);
    }
  }
  if (result.archive) out.push('', `Archive: ${result.archive}`);
  if (result.mode === 'apply') {
    out.push('', 'Deleted:');
    if (result.deleted.length === 0) out.push('  nothing');
    for (const entry of result.deleted) out.push(`  ${entry.kind} ${entry.name}${entry.tip ? ` ${shortSha(entry.tip)}` : ''}`);
  } else {
    const safe = result.items.filter((item) => item.safe).length;
    out.push('', `${safe} item${safe === 1 ? '' : 's'} safe to delete. Nothing was changed. Run again with --apply after reading this; name remote branches with --remote <remote>/<branch>.`);
  }
  return out.join('\n');
}
