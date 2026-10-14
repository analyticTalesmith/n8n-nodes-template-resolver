import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { PROCESS_ROOT, isProcessPath } from './card-files.mjs';

const MAX_BUFFER = 64 * 1024 * 1024;
const BINARY_SNIFF_BYTES = 8000;
const SHORT_SHA_LENGTH = 7;
const GIT_CONFIG = ['-c', 'core.quotepath=false'];

/** The parent environment without any GIT_ variable (a hook's GIT_DIR or GIT_INDEX_FILE must not redirect git), with English messages. */
const cleanEnv = () => ({
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith('GIT_'))),
  LANG: 'C',
  LC_ALL: 'C',
});

/** Raised when git cannot run or exits non-zero. `status` is git's exit code, or null when git could not start. */
export class GitError extends Error {
  /**
   * @param {string} message
   * @param {{ args?: string[], status?: number | null, cause?: unknown }} [details]
   */
  constructor(message, { args = [], status = null, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'GitError';
    this.args = args;
    this.status = status;
  }
}

/** @typedef {(cwd: string, args: string[]) => string} GitRunner */
/** @typedef {{ status: 'A' | 'D' | 'M' | 'R' | 'C' | 'T', path: string, from?: string }} Change */
/** @typedef {{ path: string, line: number, text: string }} AddedLine */
/** @typedef {AddedLine & { sha: string }} CommitLine */
/** @typedef {{ sha: string, subject: string, body: string, files: string[] }} Commit */

/**
 * Runs git without a shell and returns its stdout.
 * @type {GitRunner}
 */
export const runGit = (cwd, args) => {
  try {
    return execFileSync('git', args, { cwd, env: cleanEnv(), encoding: 'utf8', maxBuffer: MAX_BUFFER, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (cause) {
    const stderr = String(cause.stderr ?? '').trim();
    const reason = stderr || cause.message;
    throw new GitError(`git ${args.join(' ')} failed: ${reason}. Check that this is a git repository and the base commit exists.`, {
      args,
      status: typeof cause.status === 'number' ? cause.status : null,
      cause,
    });
  }
};

/** @param {string} base */
function assertRevision(base) {
  if (typeof base !== 'string' || base === '' || base.startsWith('-') || base.includes('..') || /[\u0000-\u001f]/.test(base)) {
    throw new GitError(`"${base}" is not a usable base commit: it must be a single revision, not empty, not a range (no ".."), and not starting with a dash.`, { args: [String(base)] });
  }
}

/** A citation may name a full or abbreviated hexadecimal commit, never a revision expression. */
function assertEvidenceCommit(commit) {
  assertRevision(commit);
  if (!/^[0-9a-f]{7,64}$/.test(commit)) throw new GitError('A cited commit must be 7 to 64 lowercase hexadecimal characters.');
}

/** The same project-relative path rules as fileAtCommit, checked before any git invocation. */
function assertEvidencePath(path) {
  if (typeof path !== 'string' || path === '' || path.startsWith('-') || path.startsWith('/') || path.includes('\\') || path.includes(':') || /[\u0000-\u001f]/.test(path) || path.split('/').some((part) => part === '..' || part === '.' || part === '')) {
    throw new GitError('A cited path must be project-relative, use forward slashes, and have no dot or empty segment.');
  }
}

const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const splitZ = (text) => text.split('\0').filter((part) => part !== '');

/** Untracked files that are not ignored, repo-relative with forward slashes. */
const untrackedFiles = (cwd, run) => splitZ(run(cwd, [...GIT_CONFIG, 'ls-files', '-z', '--others', '--exclude-standard']));

/**
 * Files changed from the base commit to the working tree (committed, staged, unstaged, untracked), sorted by path.
 * @param {string} cwd
 * @param {string} base
 * @param {GitRunner} [run]
 * @returns {Change[]}
 */
export function changedFiles(cwd, base, run = runGit) {
  assertRevision(base);
  const tokens = splitZ(run(cwd, [...GIT_CONFIG, 'diff', '-z', '--name-status', '--find-renames', '--no-color', '--no-ext-diff', '--no-textconv', base, '--']));
  /** @type {Change[]} */
  const changes = [];
  for (let i = 0; i < tokens.length; ) {
    const status = /** @type {Change['status']} */ (tokens[i][0]);
    if (status === 'R' || status === 'C') {
      changes.push({ status, path: tokens[i + 2], from: tokens[i + 1] });
      i += 3;
    } else {
      changes.push({ status, path: tokens[i + 1] });
      i += 2;
    }
  }
  for (const path of untrackedFiles(cwd, run)) changes.push({ status: 'A', path });
  return changes.sort(byPath);
}

/** Reads a git-quoted path ("..." with C escapes and octal bytes) back into text. */
function unquote(text) {
  if (!text.startsWith('"') || !text.endsWith('"')) return text;
  const bytes = [];
  const escapes = { n: 10, t: 9, r: 13, '"': 34, '\\': 92 };
  const body = Buffer.from(text.slice(1, -1), 'utf8');
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] !== 92) {
      bytes.push(body[i]);
      continue;
    }
    const next = String.fromCharCode(body[i + 1]);
    if (/[0-7]/.test(next)) {
      bytes.push(parseInt(body.subarray(i + 1, i + 4).toString('latin1'), 8));
      i += 3;
    } else {
      bytes.push(escapes[next] ?? body[i + 1]);
      i += 1;
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

const stripCarriageReturn = (line) => (line.endsWith('\r') ? line.slice(0, -1) : line);

/** Patch options that keep user diff settings, external tools and textconv filters from changing what is parsed. */
const PATCH_OPTIONS = Object.freeze(['--unified=0', '--no-color', '--no-ext-diff', '--no-textconv', '--find-renames', '--src-prefix=a/', '--dst-prefix=b/']);

/**
 * The added lines of a unified diff produced with PATCH_OPTIONS, in patch order. A deleted file gives none.
 * @param {string} patch
 * @returns {AddedLine[]}
 */
function parsePatch(patch) {
  /** @type {AddedLine[]} */
  const lines = [];
  /** @type {string | null} */
  let path = null;
  let inHunk = false;
  let next = 0;
  for (const row of patch.split('\n')) {
    if (row.startsWith('diff --git ')) {
      inHunk = false;
      path = null;
    } else if (!inHunk && row.startsWith('+++ ')) {
      const target = row.slice(4).replace(/\t$/, '');
      path = target === '/dev/null' ? null : unquote(target).replace(/^b\//, '');
    } else if (row.startsWith('@@')) {
      inHunk = true;
      next = Number(/\+(\d+)/.exec(row)?.[1] ?? 0);
    } else if (inHunk && row.startsWith('+') && path !== null) {
      lines.push({ path, line: next, text: stripCarriageReturn(row.slice(1)) });
      next += 1;
    }
  }
  return lines;
}

/**
 * A regular file's bytes, or null for a directory entry, nested repository, symlink, other non-regular entry, or a file
 * that vanished (ENOENT). Any other read failure is a GitError, so an unreadable file never counts as empty.
 * @param {string} absolute
 * @param {string} listed the repo-relative path git listed
 * @param {UntrackedIo} io
 * @returns {Buffer | null}
 */
function readUntracked(absolute, listed, { lstat = lstatSync, readFile = readFileSync }) {
  if (listed.endsWith('/')) return null;
  try {
    const stats = lstat(absolute);
    if (!stats.isFile()) return null;
    return readFile(absolute);
  } catch (cause) {
    if (cause?.code === 'ENOENT' || cause?.code === 'EISDIR') return null;
    throw new GitError(`Cannot read the untracked file ${listed} (${cause?.code ?? 'error'}: ${cause?.message ?? cause}), so its lines cannot be checked. Fix its permissions or close what holds it, then retry.`, {
      args: [listed],
      cause,
    });
  }
}

/** @typedef {{ lstat?: (path: string) => import('node:fs').Stats, readFile?: (path: string) => Buffer }} UntrackedIo */

/**
 * Lines added between the base commit and the working tree; untracked text files are all added.
 * @param {string} cwd
 * @param {string} base
 * @param {GitRunner} [run]
 * @param {UntrackedIo} [io] replaces the file reads of untracked files, for tests
 * @returns {AddedLine[]}
 */
export function addedLines(cwd, base, run = runGit, io = {}) {
  assertRevision(base);
  const lines = parsePatch(run(cwd, [...GIT_CONFIG, 'diff', ...PATCH_OPTIONS, base, '--']));
  for (const file of untrackedFiles(cwd, run)) {
    const content = readUntracked(join(cwd, file), file, io);
    if (content === null) continue;
    if (content.subarray(0, BINARY_SNIFF_BYTES).includes(0)) continue;
    const rows = content.toString('utf8').split('\n');
    if (rows.at(-1) === '') rows.pop();
    rows.forEach((text, index) => lines.push({ path: file, line: index + 1, text: stripCarriageReturn(text) }));
  }
  return lines.sort((a, b) => byPath(a, b) || a.line - b.line);
}

/** One untracked text file as the new-file block git would print for it. */
function newFileBlock(path, content) {
  const head = `diff --git a/${path} b/${path}\nnew file mode 100644\n`;
  if (content.length === 0) return head;
  const rows = content.toString('utf8').replaceAll('\r\n', '\n').split('\n');
  const endsWithNewline = rows.at(-1) === '';
  if (endsWithNewline) rows.pop();
  const body = rows.map((row) => `+${row}\n`).join('') + (endsWithNewline ? '' : '\\ No newline at end of file\n');
  return `${head}--- /dev/null\n+++ b/${path}\n@@ -0,0 +1,${rows.length} @@\n${body}`;
}

/** @typedef {{ include?: string[], own?: string[] | null }} PatchOptions include: exact project-relative paths under docs/ephemeral that stay in the patch and the fingerprint; own: paths and folders the review fingerprint is limited to (null for all, an empty list for none) */

/** The exact paths of `include` that are a changed path (or a rename source) of `changes`, sorted. A folder or a glob matches none. */
function changedIncluded(changes, include) {
  const changed = new Set(changes.flatMap((change) => (change.from === undefined ? [change.path] : [change.path, change.from])));
  return [...new Set(include)].filter((path) => changed.has(path)).sort();
}

/**
 * The patch from the base commit to the working tree for a reviewer: three lines of context, untracked non-ignored text
 * files as new-file blocks (a binary one as a one-line note), and everything under docs/ephemeral/ left out except the
 * exact paths in `options.include`. `omitted` counts the changed files that were left out; `included` lists the
 * included paths that changed, sorted.
 * @param {string} cwd
 * @param {string} base
 * @param {GitRunner} [run]
 * @param {UntrackedIo} [io] replaces the file reads of untracked files, for tests
 * @param {PatchOptions} [options]
 * @returns {{ patch: string, omitted: number, included: string[] }}
 */
export function workingPatch(cwd, base, run = runGit, io = {}, { include = [] } = {}) {
  assertRevision(base);
  const changes = changedFiles(cwd, base, run);
  const included = changedIncluded(changes, include);
  const keep = new Set(included);
  const omitted = changes.filter((change) => isProcessPath(change.path) && !keep.has(change.path)).length;
  let patch = run(cwd, [
    ...GIT_CONFIG,
    'diff',
    '--unified=3',
    ...PATCH_OPTIONS.filter((option) => option !== '--unified=0'),
    base,
    '--',
    '.',
    `:(exclude)${PROCESS_ROOT}`,
  ]);
  if (patch !== '' && !patch.endsWith('\n')) patch += '\n';
  if (included.length > 0) {
    const shown = run(cwd, [...GIT_CONFIG, 'diff', '--unified=3', ...PATCH_OPTIONS.filter((option) => option !== '--unified=0'), base, '--', ...included.map((path) => `:(literal)${path}`)]);
    patch += shown !== '' && !shown.endsWith('\n') ? `${shown}\n` : shown;
  }
  for (const file of untrackedFiles(cwd, run).sort()) {
    if (isProcessPath(file) && !keep.has(file)) continue;
    const content = readUntracked(join(cwd, file), file, io);
    if (content === null) continue;
    if (content.subarray(0, BINARY_SNIFF_BYTES).includes(0)) {
      patch += `diff --git a/${file} b/${file}\nnew file mode 100644\nBinary file b/${file} not shown\n`;
    } else {
      patch += newFileBlock(file, content);
    }
  }
  return { patch, omitted, included };
}

/** Fingerprint the reviewed working state independently of Git's rendering of untracked versus committed files. */
function reviewStateHash(cwd, base, run, include, own = null) {
  const paths = new Set();
  const ownLower = own === null ? null : own.map((entry) => (CASE_INSENSITIVE.has(process.platform) ? entry.toLowerCase() : entry));
  const owned = (path) => {
    if (ownLower === null || include.includes(path)) return true;
    const key = CASE_INSENSITIVE.has(process.platform) ? path.toLowerCase() : path;
    return ownLower.some((entry) => key === entry || key.startsWith(`${entry}/`));
  };
  const shown = (path) => (!isProcessPath(path) || include.includes(path)) && owned(path);
  for (const change of changedFiles(cwd, base, run)) {
    if (shown(change.path)) paths.add(change.path);
    if (change.from !== undefined && shown(change.from)) paths.add(change.from);
  }
  const digest = createHash('sha256');
  digest.update('aperture-review-state-v1\0');
  for (const path of [...paths].sort()) {
    let stat;
    try {
      stat = lstatSync(join(cwd, path));
    } catch (cause) {
      if (cause.code === 'ENOENT') {
        digest.update(JSON.stringify([path, 'deleted']) + '\n');
        continue;
      }
      throw new GitError(`Cannot inspect reviewed file ${path} (${cause.message}). Repair access and retry.`, { cause });
    }
    const kind = stat.isSymbolicLink() ? 'link' : stat.isFile() ? 'file' : 'other';
    if (kind === 'other') throw new GitError(`Reviewed path ${path} is not a file or link. Repair it before review.`);
    let bytes;
    try {
      bytes = kind === 'link' ? Buffer.from(readlinkSync(join(cwd, path)), 'utf8') : readFileSync(join(cwd, path));
    } catch (cause) {
      throw new GitError(`Cannot read reviewed file ${path} (${cause.message}). Repair access and retry.`, { cause });
    }
    digest.update(JSON.stringify([path, kind, kind === 'file' && Boolean(stat.mode & 0o111), bytes.length]) + '\n');
    digest.update(bytes);
    digest.update('\0');
  }
  return digest.digest('hex');
}

/**
 * The reviewer's patch from the fork point of `base` and HEAD, with a stable fingerprint of the resulting changed
 * paths and exact bytes. The fingerprint stays equal when an untracked file is committed without changing its content.
 * The packet records it, and recording a review or a round and leaving review compare against it.
 * @param {string} cwd
 * @param {string} base
 * @param {GitRunner} [run]
 * @param {PatchOptions} [options] the include paths stay in the patch and in the fingerprint; `own`, when given, narrows the
 *   fingerprint (not the patch) to those paths and the folders under them plus the include paths, so a change elsewhere in the tree, such as a
 *   merge of another card's work, leaves it unchanged
 * @returns {{ base: string, patch: string, omitted: number, included: string[], sha256: string }} base is the full sha the patch starts from
 */
export function reviewPatch(cwd, base, run = runGit, { include = [], own = null } = {}) {
  const fork = effectiveBase(cwd, base, run);
  const baseSha = run(cwd, ['rev-parse', '--verify', `${fork}^{commit}`]).trim();
  const { patch, omitted, included } = workingPatch(cwd, baseSha, run, {}, { include });
  return { base: baseSha, patch, omitted, included, sha256: reviewStateHash(cwd, baseSha, run, included, own) };
}

/**
 * A file's text at a commit (CRLF read as LF), or null when the path is not a file there. The path must be
 * project-relative with forward slashes, not start with a dash and hold no `..` segment.
 * @param {string} cwd
 * @param {string} commit
 * @param {string} path
 * @param {GitRunner} [run]
 * @returns {string | null}
 */
export function fileAtCommit(cwd, commit, path, run = runGit) {
  assertRevision(commit);
  assertEvidencePath(path);
  const object = `${commit}:${path}`;
  try {
    if (run(cwd, ['cat-file', '-t', object]).trim() !== 'blob') return null;
  } catch (err) {
    if (err instanceof GitError && typeof err.status === 'number') {
      // cat-file uses status 128 for both an absent path and operational failures.
      // Confirm absence with a separate tree query before returning null.
      if (run(cwd, ['ls-tree', '-z', '--full-tree', commit, '--', path]) === '') return null;
    }
    throw err;
  }
  return run(cwd, ['cat-file', 'blob', object]).replaceAll('\r\n', '\n');
}

/**
 * Paths changed from `commit` to the working tree (committed, staged, unstaged and untracked), old and new names of a
 * rename both included, sorted and unique, leaving out the paths `exempt` accepts. `untracked` lists those of them that
 * git does not track yet.
 * @param {string} cwd
 * @param {string} commit
 * @param {(path: string) => boolean} [exempt]
 * @param {GitRunner} [run]
 * @returns {{ paths: string[], untracked: string[] }}
 */
export function changedSince(cwd, commit, exempt = () => false, run = runGit) {
  const paths = new Set();
  for (const change of changedFiles(cwd, commit, run)) {
    for (const path of [change.from, change.path]) if (path !== undefined && !exempt(path)) paths.add(path);
  }
  const untracked = untrackedFiles(cwd, run).filter((path) => paths.has(path));
  return { paths: [...paths].sort(), untracked: untracked.sort() };
}

/** True only for a commit object reachable from HEAD. An absent or unrelated object returns false. */
export function isAncestorCommit(cwd, commit, run = runGit) {
  assertEvidenceCommit(commit);
  assertTopLevel(cwd, { run });
  try {
    run(cwd, ['rev-parse', '--verify', '--quiet', `${commit}^{object}`]);
  } catch (err) {
    if (err instanceof GitError && err.status === 1) return false;
    throw err;
  }
  if (run(cwd, ['cat-file', '-t', commit]).trim() !== 'commit') return false;
  try {
    run(cwd, ['merge-base', '--is-ancestor', commit, 'HEAD']);
    return true;
  } catch (err) {
    if (err instanceof GitError && err.status === 1) return false;
    throw err;
  }
}

/** True when a cited path changed in commits after the citation. */
export function pathChangedSince(cwd, commit, path, run = runGit) {
  assertEvidenceCommit(commit);
  assertEvidencePath(path);
  assertTopLevel(cwd, { run });
  try {
    run(cwd, ['diff', '--quiet', '--no-ext-diff', '--no-textconv', commit, 'HEAD', '--', path]);
    return false;
  } catch (err) {
    if (err instanceof GitError && err.status === 1) return true;
    throw err;
  }
}

/**
 * Commits in base..HEAD, oldest first. Uncommitted work is not included.
 * @param {string} cwd
 * @param {string} base
 * @param {GitRunner} [run]
 * @returns {Commit[]}
 */
export function commitsInRange(cwd, base, run = runGit) {
  assertRevision(base);
  const shas = run(cwd, ['rev-list', '--topo-order', '--reverse', `${base}..HEAD`, '--']).split('\n').filter(Boolean);
  return shas.map((sha) => {
    const [subject = '', ...rest] = run(cwd, ['log', '-1', '--no-show-signature', '--format=%s%x00%b', sha, '--']).split('\0');
    const files = splitZ(run(cwd, [...GIT_CONFIG, 'diff-tree', '--no-commit-id', '--name-only', '-r', '-z', '--root', sha, '--']));
    return { sha, subject: subject.trim(), body: rest.join('\0').trim(), files };
  });
}

/**
 * Lines each commit in base..HEAD added, oldest commit first, so text a later commit removed is still seen. A merge
 * commit contributes none (its parents' commits are listed themselves). Uncommitted work is not included.
 * @param {string} cwd
 * @param {string} base
 * @param {GitRunner} [run]
 * @returns {CommitLine[]}
 */
export function commitAddedLines(cwd, base, run = runGit) {
  assertRevision(base);
  const shas = run(cwd, ['rev-list', '--topo-order', '--reverse', `${base}..HEAD`, '--']).split('\n').filter(Boolean);
  return shas.flatMap((sha) =>
    parsePatch(run(cwd, [...GIT_CONFIG, 'diff-tree', '-p', '--no-commit-id', '--root', ...PATCH_OPTIONS, sha, '--'])).map((line) => ({ ...line, sha })),
  );
}

/**
 * The base the gate diffs from: the fork point `git merge-base <base> HEAD`, or the given base when merge-base fails
 * (no common history, unknown revision). A base that moved on after the work started then still gives the work alone.
 * @param {string} cwd
 * @param {string} base
 * @param {GitRunner} [run]
 * @returns {string}
 */
export function effectiveBase(cwd, base, run = runGit) {
  assertRevision(base);
  try {
    const fork = run(cwd, ['merge-base', base, 'HEAD']).trim();
    return fork === '' ? base : fork;
  } catch (err) {
    if (err instanceof GitError) return base;
    throw err;
  }
}

/** Platforms whose filesystems are conventionally case-insensitive. */
const CASE_INSENSITIVE = new Set(['win32', 'darwin']);

/**
 * Throws GitError unless the directory is the top level of its git work tree (real paths compared, case-insensitively
 * on win32 and darwin). Git paths are relative to the top level, so a project in a sub-directory is not supported.
 * @param {string} cwd
 * @param {{ run?: GitRunner, platform?: string }} [options]
 */
export function assertTopLevel(cwd, { run = runGit, platform = process.platform } = {}) {
  const top = run(cwd, ['rev-parse', '--show-toplevel']).trim();
  const real = (path) => {
    try {
      const resolved = realpathSync.native(path);
      return CASE_INSENSITIVE.has(platform) ? resolved.toLowerCase() : resolved;
    } catch (cause) {
      throw new GitError(`Cannot resolve ${path} (${cause.message}) to compare it with the git work tree.`, { args: [path], cause });
    }
  };
  if (real(top) !== real(cwd)) {
    throw new GitError(
      `${cwd} is not the top level of its git work tree (${top}). Run the gate from the repository root; projects in a sub-directory of a repository are not supported.`,
      { args: ['rev-parse', '--show-toplevel'] },
    );
  }
}

/**
 * The current commit, short (7 characters) by default.
 * @param {string} cwd
 * @param {{ short?: boolean, run?: GitRunner }} [options]
 * @returns {string}
 */
export function headCommit(cwd, { short = true, run = runGit } = {}) {
  const args = short ? ['rev-parse', `--short=${SHORT_SHA_LENGTH}`, 'HEAD'] : ['rev-parse', 'HEAD'];
  return run(cwd, args).trim();
}

/**
 * The main checkout of the repository a directory belongs to: the directory itself in the main checkout or outside any
 * repository, the main checkout's folder from a linked worktree. Read from the repository's common git directory.
 * @param {string} cwd
 * @param {{ run?: GitRunner }} [options]
 * @returns {string}
 */
export function projectRootOf(cwd, { run = runGit } = {}) {
  try {
    const common = resolve(cwd, run(cwd, ['rev-parse', '--git-common-dir']).trim());
    return basename(common) === '.git' ? dirname(common) : cwd;
  } catch {
    return cwd;
  }
}
