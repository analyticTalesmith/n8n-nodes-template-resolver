import { spawnSync } from 'node:child_process';
import { realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, cardPath, isCardId, listCards } from '../lib/board.mjs';
import { isCardProcessPath } from '../lib/card-files.mjs';
import { isFilingNoise, isOwnCycleBrief, isOwnCyclePlan, scopeOf } from '../lib/checks/manifest.mjs';
import { toPosix } from '../lib/files.mjs';
import { GitError, changedFiles, runGit, shortSha } from '../lib/git.mjs';
import { END_MARKER, INDEX_ROOTS, START_MARKER, indexFileFor, writeIndexes } from '../lib/index-docs.mjs';
import { BACKLOG_DIR, CYCLES_DIR, STAGE, cycleColumn } from '../lib/layout.mjs';
import { defaultBranch } from '../lib/worktree.mjs';
import { next } from './next.mjs';

const USAGE = 'Usage: node card-merge.mjs <projectDir> <cardId> [--into <branch>] [--verify]';
const MERGE_SUBJECT = 'chore: merge finished card work';
const FOLLOW_UP_SUBJECT = 'chore: regenerate the generated indexes';
const TAIL_LINES = 20;
/** Path segments down to a ticket folder in a cycle's backlog column: the column folder's segments plus the ticket id. */
const CYCLE_TICKET_FOLDER_DEPTH = cycleColumn('placeholder', STAGE.backlog).split('/').length + 1;
/** Exit codes: merged; refused before any change, or a real conflict aborted clean; usage error; merged but the gate failed. */
const EXIT = Object.freeze({ merged: 0, refused: 1, usage: 2, verifyFailed: 3 });

class Refusal extends Error {}

const lines = (text) => text.split(/\r?\n/).filter((line) => line !== '');

/** Only what index.mjs writes: INDEX.md anywhere under the index roots, CYCLE.md only directly inside a cycle folder. */
function isGenerated(path) {
  const slash = path.lastIndexOf('/');
  const dir = path.slice(0, slash);
  const name = path.slice(slash + 1);
  if (!INDEX_ROOTS.some((root) => dir === root || dir.startsWith(`${root}/`))) return false;
  if (dir.split('/').includes('kanban')) return false;
  return name === 'INDEX.md' || (name === 'CYCLE.md' && indexFileFor(dir) === 'CYCLE.md');
}

function gitOrNull(cwd, args) {
  try {
    return runGit(cwd, args);
  } catch (cause) {
    if (cause instanceof GitError) return null;
    throw cause;
  }
}

const dirtyFiles = (cwd) => lines(runGit(cwd, ['status', '--porcelain']));
const hasMergeHead = (cwd) => gitOrNull(cwd, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']) !== null;

/** The path of the worktree that has the branch checked out, or null. */
function worktreeOf(cwd, branch) {
  for (const block of runGit(cwd, ['worktree', 'list', '--porcelain']).split(/\r?\n\r?\n/)) {
    if (/^branch refs\/heads\/(.*)$/m.exec(block)?.[1] === branch) return /^worktree (.*)$/m.exec(block)?.[1] ?? null;
  }
  return null;
}

/** The text of a file outside its generated block, or null when it has no block. */
function outsideBlock(text) {
  const start = text.indexOf(START_MARKER);
  const end = text.indexOf(END_MARKER);
  return start === -1 || end < start ? text : text.slice(0, start) + text.slice(end + END_MARKER.length);
}

/**
 * Resolves a conflicted generated file: keeps the side whose hand-written text outside the generated block is the
 * changed one (both identical, or only one changed), so the block can be regenerated. Returns false when both sides
 * changed that text differently, which is a real conflict.
 */
function chooseSide(cwd, path) {
  const stage = (n) => gitOrNull(cwd, ['show', `:${n}:${path}`]);
  const [base, ours, theirs] = [1, 2, 3].map(stage);
  if (ours === null || theirs === null) return false;
  const [o, t] = [outsideBlock(ours), outsideBlock(theirs)];
  const b = base === null ? null : outsideBlock(base);
  let side;
  if (o === t || t === b) side = '--ours';
  else if (o === b) side = '--theirs';
  else return false;
  runGit(cwd, ['checkout', side, '--', path]);
  return true;
}

const tail = (text) => lines(text).slice(-TAIL_LINES).join('\n');

/** Runs the gate argv (npm test when none) in the project; returns { ok, output }. */
function runGate(projectDir, gate) {
  const [program, ...args] = gate ?? ['npm', 'test'];
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith('GIT_')));
  const result = spawnSync(program, args, { cwd: projectDir, env, encoding: 'utf8', shell: gate === null && process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 });
  return { ok: result.status === 0 && !result.error, output: `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? String(result.error.message) : ''}` };
}

/** Commits the regenerated indexes when they changed; returns the written paths. */
function regenerate(projectDir) {
  const { written } = writeIndexes(projectDir);
  if (written.length) runGit(projectDir, ['add', '--', ...written]);
  return written;
}

/**
 * Merges a done card's branch into the branch checked out in the project and cleans up. Returns the exit code.
 * @param {string[]} args
 * @param {{ out?: (line: string) => void, err?: (line: string) => void }} [io]
 */
export function main(args, { out = console.log, err = console.error } = {}) {
  const positional = [];
  let into;
  let verify = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--verify' && !verify) verify = true;
    else if (arg === '--into' && args[i + 1] !== undefined && !args[i + 1].startsWith('--') && into === undefined) {
      into = args[i + 1];
      i += 1;
    } else if (arg.startsWith('--')) {
      err(`Unknown or incomplete option ${arg}. ${USAGE}`);
      return EXIT.usage;
    } else positional.push(arg);
  }
  if (positional.length !== 2) {
    err(`Expected a project directory and a card id. ${USAGE}`);
    return EXIT.usage;
  }
  const projectDir = resolve(positional[0]);
  const cardId = positional[1];
  try {
    if (!statSync(projectDir, { throwIfNoEntry: false })?.isDirectory()) throw new Refusal(`${projectDir} is not a directory.`);
    if (!isCardId(cardId)) throw new Refusal(`"${cardId}" is not a card id (like 0001-some-title).`);
    return mergeCard({ projectDir, cardId, into, verify, out, err });
  } catch (cause) {
    if (cause instanceof Refusal || cause instanceof BoardError || cause instanceof GitError) {
      err(cause.message.replace(/\s+/g, ' ').trim());
      return EXIT.refused;
    }
    throw cause;
  }
}

function mergeCard({ projectDir, cardId, into, verify, out, err }) {
  if (cardPath(projectDir, cardId) === null) throw new Refusal(`Card ${cardId} was not found on the board of ${projectDir}.`);
  const entry = listCards(projectDir).find(({ card }) => card.id === cardId);
  if (entry.column !== STAGE.done) throw new Refusal(`Card ${cardId} is not done (it is in ${entry.column}). Move it to ${STAGE.done} before merging.`);
  const branch = defaultBranch(cardId, entry.card.type);
  if (gitOrNull(projectDir, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]) === null) {
    throw new Refusal(`The card branch ${branch} does not exist in ${projectDir}; nothing to merge.`);
  }
  const current = (gitOrNull(projectDir, ['symbolic-ref', '--short', '-q', 'HEAD']) ?? '').trim();
  const target = into ?? current;
  if (current === '' || target !== current) {
    throw new Refusal(`The target branch ${target || '(detached HEAD)'} is not the branch checked out in ${projectDir} (${current || 'detached'}). Check it out there first, or run the script where it is checked out.`);
  }
  if (target === branch) throw new Refusal(`The target branch ${target} is the card branch itself.`);
  const targetDirty = dirtyFiles(projectDir);
  if (targetDirty.length) throw new Refusal(`The target worktree ${projectDir} has uncommitted changes (${targetDirty.length} path${targetDirty.length === 1 ? '' : 's'}). Commit or stash them first.`);
  const cardTree = worktreeOf(projectDir, branch);
  if (cardTree !== null) {
    const dirty = dirtyFiles(cardTree);
    if (dirty.length) throw new Refusal(`The card worktree ${cardTree} has uncommitted changes (${dirty.length} path${dirty.length === 1 ? '' : 's'}). Commit them first.`);
  }
  const outside = outsideScope(projectDir, entry.card, branch);
  if (outside.length) {
    throw new Refusal(`Card ${cardId} changes files outside its files_scope and manifest, so nothing was merged: ${outside.join(', ')}. Revert those changes on ${branch}, or ask the lead to amend the card's scope.`);
  }
  const gate = entry.card.gate ?? null;

  const targetTip = runGit(projectDir, ['rev-parse', 'HEAD']).trim();
  const cardTip = runGit(projectDir, ['rev-parse', `refs/heads/${branch}`]).trim();
  try {
    runGit(projectDir, ['merge', '--no-ff', '-m', MERGE_SUBJECT, `refs/heads/${branch}`]);
    out(`merged the card branch into ${target}`);
  } catch (cause) {
    if (!(cause instanceof GitError)) throw cause;
    if (!hasMergeHead(projectDir)) throw new Refusal(`The merge could not start: ${cause.message}`);
    return resolveConflicts({ projectDir, target, targetTip, cardTip, out, err }) ?? finish();
  }
  return finish();

  function finish() {
    const written = regenerate(projectDir);
    if (written.length) {
      runGit(projectDir, ['commit', '-q', '-m', FOLLOW_UP_SUBJECT]);
      out(`regenerated ${written.length} generated file${written.length === 1 ? '' : 's'}`);
    }
    return afterMerge({ projectDir, entry, branch, cardTree, gate, verify, target, out, err });
  }
}

/**
 * The files the card branch changed since it left the target that are neither in the card's files_scope or manifest nor
 * routine records (generated indexes, the card's own records, its cycle's brief and plan, ticket stubs). A rename counts
 * as its old path removed and its new path added, so both are checked. Paths are sorted and listed once.
 */
function outsideScope(projectDir, card, branch) {
  const base = runGit(projectDir, ['merge-base', 'HEAD', `refs/heads/${branch}`]).trim();
  const { key, planned, inScope } = scopeOf(card);
  const paths = changedFiles(projectDir, base, runGit, `refs/heads/${branch}`).flatMap(({ status, path, from }) =>
    status === 'R' ? [{ status: 'D', path: from }, { status: 'A', path }] : [{ status, path }],
  );
  // Only a file added to a ticket folder that did not exist on the base is filing noise; edits, deletes and a stray nul are not.
  const newTicketFile = ({ status, path }) => {
    if (status !== 'A' || !isFilingNoise({ status, path }) || path.split('/').at(-1).toLowerCase() === 'nul') return false;
    const segments = path.split('/');
    const folderDepth = path.startsWith(`${CYCLES_DIR}/`) ? CYCLE_TICKET_FOLDER_DEPTH : BACKLOG_DIR.split('/').length + 1;
    if (segments.length !== folderDepth + 1) return false;
    return runGit(projectDir, ['ls-tree', '-r', '--name-only', base, '--', segments.slice(0, folderDepth).join('/')]).trim() === '';
  };
  const routine = ({ status, path }) => {
    const p = toPosix(path);
    return isGenerated(p) || isCardProcessPath(p, card.id) || newTicketFile({ status, path: p }) ||
      ((status === 'A' || status === 'M') && (isOwnCycleBrief(card, p) || isOwnCyclePlan(card, p)));
  };
  const outside = paths.filter((change) => !routine(change) && !inScope(change.path) && !planned.has(key(change.path)));
  return [...new Set(outside.map(({ path }) => path))].sort();
}

/** Resolves a conflict made only of generated files and commits it (returns null), or aborts and returns the refusal exit. */
function resolveConflicts({ projectDir, target, targetTip, cardTip, out, err }) {
  const conflicted = lines(runGit(projectDir, ['diff', '--name-only', '--diff-filter=U'])).map(toPosix);
  const real = conflicted.filter((path) => !isGenerated(path) || !chooseSide(projectDir, path));
  if (real.length === 0) {
    const written = regenerate(projectDir);
    runGit(projectDir, ['add', '--', ...conflicted]);
    runGit(projectDir, ['commit', '-q', '--no-edit']);
    out(`resolved ${conflicted.length} generated file conflict${conflicted.length === 1 ? '' : 's'} by regenerating (${written.length} rewritten)`);
    return null;
  }
  runGit(projectDir, ['merge', '--abort']);
  err(`Conflict merging into ${target}: ${shortSha(targetTip)} (target) and ${shortSha(cardTip)} (card). The merge was aborted and nothing changed.`);
  err('Conflicted files (a person decides how to resolve the ones that are not generated):');
  for (const path of conflicted) err(`  ${path}${isGenerated(path) && !real.includes(path) ? ' (generated)' : ''}`);
  return EXIT.refused;
}

function afterMerge({ projectDir, entry, branch, cardTree, gate, verify, target, out, err }) {
  if (verify) {
    const { ok, output } = runGate(projectDir, gate);
    if (!ok) {
      err(`verify failed on the merged ${target}; the merge is kept, and so are the card worktree and branch. Output tail:`);
      err(tail(output));
      return EXIT.verifyFailed;
    }
    out('verify: pass');
  }
  if (cardTree !== null && resolve(cardTree) !== projectDir) {
    try {
      runGit(projectDir, ['worktree', 'remove', cardTree]);
      out(`removed the card worktree ${cardTree}`);
    } catch (cause) {
      if (!(cause instanceof GitError)) throw cause;
      out(`kept the card worktree ${cardTree}: git would not remove it without force (${cause.message.split(':').slice(1).join(':').trim()})`);
    }
  }
  try {
    runGit(projectDir, ['branch', '-d', branch]);
    out(`removed the card branch ${branch}`);
  } catch (cause) {
    if (!(cause instanceof GitError)) throw cause;
    out(`kept the card branch ${branch}: ${cause.message.split(':').slice(1).join(':').trim()}`);
  }
  out('next: git push');
  if (entry.cycle !== null) {
    try {
      const { ready } = next(projectDir, entry.cycle);
      if (ready.length) out(`next ready cards in ${entry.cycle}: ${ready.map((card) => card.id).join(', ')}`);
    } catch {
      // the next ready cards are a convenience; a closed or broken cycle does not undo a merge
    }
  }
  return EXIT.merged;
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) process.exitCode = main(process.argv.slice(2));
