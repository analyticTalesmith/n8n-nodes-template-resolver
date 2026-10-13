import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @typedef {import('../lib/git.mjs').GitRunner} GitRunner */
/** @typedef {import('../lib/session-check.mjs').SessionFacts} SessionFacts */

// The libraries load at run time, not as static imports: a missing or mismatched file after a partial upgrade must
// end hook mode with exit 0, and a static import fails before any code here can catch it.
let lib = null;
let loadError = null;
try {
  const [secrets, files, git, handoff, check, hook, roots] = await Promise.all([
    import('../lib/checks/secrets.mjs'),
    import('../lib/files.mjs'),
    import('../lib/git.mjs'),
    import('../lib/handoff.mjs'),
    import('../lib/session-check.mjs'),
    import('../lib/session-hook.mjs'),
    import('../lib/project-roots.mjs'),
  ]);
  lib = { secrets, files, git, handoff, check, hook, roots };
} catch (cause) {
  loadError = cause;
}

// A handoff records a short or full sha; anything else is not a commit this script will pass to git.
const SHA = /^[0-9a-f]{4,40}$/;

/** Both sides of a rename, so a living document moved away still counts as changed. */
const paths = (changes) => changes.flatMap((c) => (c.from === undefined ? [c.path] : [c.from, c.path]));

/**
 * Gathers the git facts for checkSession: the base is the latest handoff's commit when git knows it (otherwise null,
 * and missingBase names the unknown commit); changed is every path changed since the base, or the uncommitted paths
 * when there is no base.
 * @param {string} projectDir
 * @param {{ run?: GitRunner, decisions?: Array<{ text: string, link: string }> }} [options]
 * @returns {SessionFacts}
 * @throws {GitError} when git cannot read the working tree or the diff from the base
 */
export function sessionFacts(projectDir, { run = lib.git.runGit, decisions = [] } = {}) {
  const { GitError, changedFiles } = lib.git;
  const root = resolve(projectDir);
  const working = changedFiles(root, 'HEAD', run);
  const uncommitted = working.map((c) => c.path);
  const recorded = lib.handoff.latestHandoff(root)?.commit ?? null;
  let base = null;
  let missingBase = null;
  if (recorded !== null) {
    try {
      if (!SHA.test(recorded)) throw new GitError(`"${recorded}" is not a commit sha.`);
      run(root, ['rev-parse', '--verify', '--quiet', `${recorded}^{commit}`]);
      base = recorded;
    } catch (err) {
      if (!(err instanceof GitError)) throw err;
      missingBase = recorded;
    }
  }
  const since = base === null ? [] : changedFiles(root, base, run);
  const changed = [...new Set([...paths(since), ...paths(working)])];
  return { changed, uncommitted, decisions, base, missingBase };
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

// A larger file is not something a turn writes by hand, and reading it would slow every Stop.
const TURN_SCAN_MAX_BYTES = 1024 * 1024;

const exists = (root, path) => {
  try {
    lstatSync(lib.roots.resolveProjectPath(lib.roots.resolveProjectRoots(root), path));
    return true;
  } catch {
    return false;
  }
};

/** The path itself, or for a folder any path inside it, changed this turn. */
const touched = (path, changed) => changed.some((p) => p === path || p.startsWith(`${path}/`));

/** Secret-shaped lines in up to TURN_SCAN_MAX_FILES text files this turn wrote, each pattern once per line; the match itself is never kept. */
function turnSecrets(root, written, check) {
  const { ALLOW_SECRET_MARKER, SECRET_PATTERNS } = lib.secrets;
  const hits = [];
  const roots = lib.roots.resolveProjectRoots(root);
  let scanned = 0;
  for (const path of written) {
    if (scanned === lib.hook.TURN_SCAN_MAX_FILES) break;
    check();
    let bytes;
    try {
      const file = lib.roots.resolveProjectPath(roots, path);
      const stat = lstatSync(file);
      if (!stat.isFile() || stat.size > TURN_SCAN_MAX_BYTES) continue;
      bytes = readFileSync(file);
    } catch {
      continue;
    }
    if (!lib.files.isText(bytes)) continue;
    scanned++;
    bytes
      .toString('utf8')
      .split(/\r?\n/)
      .forEach((text, index) => {
        if (text.includes(ALLOW_SECRET_MARKER)) return;
        const names = new Set(SECRET_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ name }) => name));
        for (const pattern of names) hits.push({ path, line: index + 1, pattern });
      });
  }
  return hits;
}

/**
 * Stop: compares the reply's Noted line with what the turn changed and returns one reminder only when they disagree,
 * then rolls the baseline forward so the next Stop covers one turn. Without a baseline only the captured paths'
 * existence is checked. Never blocks: the reminder is context for the model, never a decision.
 */
const stop = ({ root, input, check }) => {
  const { baselinePath, completeBaseline, parseCaptureLine, projectPath, readBaseline, stopReminder, takeSnapshot, turnChanges } = lib.hook;
  if (input.stopHookActive) return '';
  const target = baselinePath(root, input);
  let baseline = target === null ? null : readBaseline(target);
  let current = null;
  if (baseline !== null) {
    try {
      current = takeSnapshot(root, baseline.head, { check });
    } catch (cause) {
      // The baseline's commit is gone (a rebase, a reset): this turn cannot be compared, so it is checked as without one.
      if (!(cause instanceof lib.git.GitError)) throw cause;
      baseline = null;
    }
  }
  current ??= takeSnapshot(root, null, { check });
  const changes = baseline === null ? null : turnChanges(completeBaseline(root, baseline, current, { check }), current);
  const changed = changes === null ? null : [...changes.written, ...changes.moved];
  const capture = parseCaptureLine(input.lastMessage);
  const missing = [];
  for (const entry of capture?.entries ?? []) {
    // Model text reaches the file system only as a plain project-relative path; anything else is reported, never looked up.
    const path = projectPath(entry.path);
    const shown = path ?? entry.path;
    if (missing.includes(shown)) continue;
    if (path === null || !exists(root, path) || (changed !== null && !touched(path, changed))) missing.push(shown);
  }
  const recordWrites = changes !== null && capture === null ? changes.written.filter(lib.check.isRecordHome) : [];
  // Only paths with a current hash: a deleted file has nothing to scan, and a file back at the base content is clean.
  const present = changes === null ? [] : changes.written.filter((path) => typeof current.files[path] === 'string');
  const secrets = turnSecrets(root, present, check);
  const reminder = stopReminder({ capture, written: changes?.written ?? [], missing, recordWrites, secrets });
  if (target !== null) {
    try {
      lib.files.writeFileAtomic(target, JSON.stringify(current));
    } catch {
      // The reminder is already worked out; without a new baseline the next Stop covers more than one turn.
    }
  }
  return reminder === null ? '' : JSON.stringify({ hookSpecificOutput: { hookEventName: 'Stop', additionalContext: reminder } });
};

const cliArgs = process.argv.slice(2);
if (isMain && cliArgs.length === 1 && cliArgs[0] === '--hook') {
  if (lib === null) {
    if (process.env.APERTURE_DEBUG) process.stderr.write(`aperture hook: ${String(loadError?.message ?? loadError).replace(/\s+/g, ' ').trim()}\n`);
    process.exit(0);
  }
  lib.hook.runHook(stop, { scriptPath: fileURLToPath(import.meta.url) });
} else if (isMain) {
  if (lib === null) {
    console.error(`Cannot load the Aperture libraries next to this script: ${loadError?.message ?? loadError}. Run upgrade to repair the installation.`);
    process.exit(1);
  }
  const { GitError } = lib.git;
  const { SESSION_RULES, checkSession } = lib.check;
  const USAGE = 'Usage: node session-check.mjs <projectDir> [--strict] [--decision "<text> -> <path or url>"]... | --hook';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const positional = [];
  const decisions = [];
  let strict = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
    } else if (arg === '--strict') {
      strict = true;
    } else if (arg === '--decision') {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) usage('--decision requires a value.');
      i++;
      const at = value.indexOf(' -> ');
      decisions.push(at === -1 ? { text: value, link: '' } : { text: value.slice(0, at), link: value.slice(at + 4) });
    } else {
      usage(`Unknown option ${arg}.`);
    }
  }
  if (positional.length !== 1) usage('Expected a project directory.');
  let result;
  try {
    result = checkSession(positional[0], sessionFacts(positional[0], { decisions }));
  } catch (err) {
    if (err instanceof GitError) result = { findings: [{ rule: SESSION_RULES.git, message: err.message }], info: [] };
    else if (err instanceof lib.roots.ProjectRootsError) result = { findings: [{ rule: SESSION_RULES.failed, message: err.message }], info: [] };
    else throw err;
  }
  for (const f of result.findings) console.log(`${f.rule}: ${f.message}`);
  for (const line of result.info) console.log(`info: ${line}`);
  process.exit(strict && result.findings.length > 0 ? 1 : 0);
}
