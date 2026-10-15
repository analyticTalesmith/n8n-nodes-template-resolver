import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { CONFIG_PATH } from './config.mjs';
import { reviewedPath } from './delta.mjs';
import { hashBytes } from './files.mjs';
import { GitError, changedFiles, fileAtCommit, headCommit, isCommitId, runGit } from './git.mjs';
import { isPlainObject } from './types.mjs';

/** @typedef {import('./git.mjs').GitRunner} GitRunner */
/** @typedef {{ cwd?: string, sessionId?: string, scratchpadDir?: string, stopHookActive: boolean, lastMessage?: string }} HookInput */
/** @typedef {{ head: string, files: Record<string, string | null> }} Snapshot */
/** @typedef {{ cls: string, path: string }} CaptureEntry */

export const HOOK_INPUT_MAX_BYTES = 1024 * 1024;
export const REMINDER_MAX_CHARS = 300;
// Below the 5 s hook timeout, so the script ends itself before the harness kills it.
export const SCRIPT_DEADLINE_MS = 4000;
// Keeps the Stop scan near 100 to 200 ms.
export const TURN_SCAN_MAX_FILES = 50;
export const BASELINE_PREFIX = 'aperture-baseline-';

const REMINDER_PREFIX = 'Aperture:';
const CAPTURE_PREFIX = 'Noted: ';
const BOLD_LABEL = '**Noted:** ';
const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;
// A path printed into a reminder is one short line.
const PATH_SHOWN_MAX_CHARS = 120;
const BASELINE_MAX_BYTES = 8 * 1024 * 1024;
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;

/** Raised by a deadline check once the script's time is up. */
export class HookDeadlineError extends Error {
  constructor() {
    super('the hook deadline passed');
    this.name = 'HookDeadlineError';
  }
}


/**
 * Parses the hook's stdin and keeps only the fields the scripts read; every other field is dropped.
 * @param {string} text
 * @returns {HookInput | null} null when the text is too large or not a JSON object
 */
export function readHookInput(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > HOOK_INPUT_MAX_BYTES) return null;
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isPlainObject(data)) return null;
  /** @type {HookInput} */
  const input = { stopHookActive: data.stop_hook_active === true };
  const strings = { cwd: 'cwd', session_id: 'sessionId', scratchpad_dir: 'scratchpadDir', last_assistant_message: 'lastMessage' };
  for (const [from, to] of Object.entries(strings)) if (typeof data[from] === 'string') input[to] = data[from];
  return input;
}

/**
 * A plain project-relative path with forward slashes (no drive, no leading slash, no empty, '.' or '..' segment, no
 * control character), or null. Text from the hook input or the baseline file reaches the file system only through this.
 * @param {string} text
 * @returns {string | null}
 */
export function projectPath(text) {
  const path = reviewedPath(String(text));
  if (/\p{Cc}/u.test(path) || isAbsolute(path) || /^[A-Za-z]:/.test(path)) return null;
  return path.split('/').every((part) => part !== '' && part !== '.' && part !== '..') ? path : null;
}

/** True when `path` is `root` or inside it; both are real paths. */
const within = (root, path) => {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

const realDir = (path) => {
  try {
    const real = realpathSync.native(path);
    return statSync(real).isDirectory() ? real : null;
  } catch {
    return null;
  }
};

/**
 * Where this session's baseline lives: a file named after the session id in the session's scratchpad.
 * @param {string} projectRoot
 * @param {HookInput} input
 * @returns {string | null} null when the id is not plain, or the scratchpad is not an absolute existing folder outside the project
 */
export function baselinePath(projectRoot, input) {
  const { sessionId, scratchpadDir } = input ?? {};
  if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) return null;
  if (typeof scratchpadDir !== 'string' || !isAbsolute(scratchpadDir)) return null;
  const pad = realDir(scratchpadDir);
  const root = realDir(projectRoot);
  if (pad === null || root === null || within(root, pad)) return null;
  return join(pad, `${BASELINE_PREFIX}${sessionId}.json`);
}

/**
 * The project a hook script belongs to: three folders above `.process/core/scripts/`, holding the Aperture config.
 * @param {string} scriptPath
 * @returns {string | null}
 */
export function hookProjectRoot(scriptPath) {
  const root = realDir(resolve(dirname(scriptPath), '..', '..', '..'));
  return root !== null && existsSync(join(root, CONFIG_PATH)) ? root : null;
}

/**
 * The working tree against `base`: every changed path (both sides of a rename) with the hash of its current bytes.
 * Symlinks and unreadable entries are left out. `check` is called before each file so a slow tree ends at the deadline.
 * @param {string} root
 * @param {string | null} base a full sha, or null for HEAD
 * @param {{ check?: () => void, run?: GitRunner }} [options]
 * @returns {Snapshot}
 */
export function takeSnapshot(root, base, { check = () => {}, run = runGit } = {}) {
  const head = base ?? headCommit(root, { short: false, run });
  const files = {};
  for (const change of changedFiles(root, head, run)) {
    for (const path of change.from === undefined ? [change.path] : [change.from, change.path]) {
      check();
      const file = join(root, path);
      let stat;
      try {
        stat = lstatSync(file);
      } catch (cause) {
        if (cause.code === 'ENOENT' || cause.code === 'ENOTDIR') files[path] = null;
        continue;
      }
      if (!stat.isFile()) continue;
      try {
        files[path] = hashBytes(readFileSync(file));
      } catch {
        // A file that cannot be read is left out rather than stopping the hook.
      }
    }
  }
  return { head, files };
}

/**
 * Adds the base commit's hash for each path deleted since the baseline was taken, so a file that was clean then and
 * has moved since is recognised by its content.
 * @param {string} root
 * @param {Snapshot} before
 * @param {Snapshot} after
 * @param {{ check?: () => void, run?: GitRunner }} [options]
 * @returns {Snapshot}
 */
export function completeBaseline(root, before, after, { check = () => {}, run = runGit } = {}) {
  const files = { ...before.files };
  for (const [path, hash] of Object.entries(after.files)) {
    if (hash !== null || Object.hasOwn(files, path)) continue;
    check();
    try {
      const text = fileAtCommit(root, before.head, path, run);
      if (text !== null) files[path] = hashBytes(Buffer.from(text, 'utf8'));
    } catch (cause) {
      if (!(cause instanceof GitError)) throw cause;
    }
  }
  return { head: before.head, files };
}

/**
 * A baseline read back from the scratchpad, or null when absent, too large or not the expected shape.
 * @param {string} path
 * @returns {Snapshot | null}
 */
export function readBaseline(path) {
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.size > BASELINE_MAX_BYTES) return null;
    const data = JSON.parse(readFileSync(path, 'utf8'));
    if (!isPlainObject(data) || typeof data.head !== 'string' || !isCommitId(data.head, { full: true }) || !isPlainObject(data.files)) return null;
    // A key reaches the file system in the secret scan, so one path outside the project discards the whole baseline.
    const entries = Object.entries(data.files);
    if (!entries.every(([path, hash]) => projectPath(path) === path && (hash === null || typeof hash === 'string'))) return null;
    return { head: data.head, files: data.files };
  } catch {
    return null;
  }
}

/**
 * Paths whose content changed between two snapshots. A path whose new hash appears anywhere in `before`, or a
 * deleted path whose old hash reappears in `after`, is a move, not a write.
 * @param {Snapshot} before
 * @param {Snapshot} after
 * @returns {{ written: string[], moved: string[] }}
 */
export function turnChanges(before, after) {
  const oldHashes = new Set(Object.values(before.files).filter((hash) => hash !== null));
  const newHashes = new Set(Object.values(after.files).filter((hash) => hash !== null));
  const written = [];
  const moved = [];
  const paths = [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])].sort();
  for (const path of paths) {
    const old = Object.hasOwn(before.files, path) ? before.files[path] : undefined;
    const now = Object.hasOwn(after.files, path) ? after.files[path] : null;
    if (old === now) continue;
    if (now !== null) (oldHashes.has(now) ? moved : written).push(path);
    else (typeof old === 'string' && newHashes.has(old) ? moved : written).push(path);
  }
  return { written, moved };
}

/**
 * The last line (trimmed) starting 'Noted: ' or '**Noted:** ', also when wrapped whole in a code span or bold as a
 * model copying the card writes it: entries '<class> → <path>' ('->' accepted), split on a comma only where the next
 * part holds an arrow, so a path keeps its commas. Entries without an arrow are dropped.
 * @param {string | undefined} message
 * @returns {{ entries: CaptureEntry[] } | null} null when no line starts 'Noted: '
 */
export function parseCaptureLine(message) {
  if (typeof message !== 'string') return null;
  const body = (line) => {
    const text = line.trim();
    if (text.startsWith(BOLD_LABEL)) return text.slice(BOLD_LABEL.length);
    for (const mark of ['`', '**']) {
      const prefix = mark + CAPTURE_PREFIX;
      if (text.startsWith(prefix) && text.endsWith(mark) && text.length >= prefix.length + mark.length) return text.slice(prefix.length, -mark.length);
    }
    return text.startsWith(CAPTURE_PREFIX) ? text.slice(CAPTURE_PREFIX.length) : null;
  };
  const line = message.split(/\r?\n/).map(body).findLast((text) => text !== null);
  if (line === undefined) return null;
  const entries = [];
  for (const part of line.split(/,\s*(?=[^,→]*(?:→|->))/)) {
    const arrow = /\s*(?:→|->)\s*/.exec(part);
    if (arrow === null) continue;
    const cls = part.slice(0, arrow.index).trim();
    const path = part.slice(arrow.index + arrow[0].length).trim().replace(/^`(.*)`$/, '$1');
    if (cls !== '' && path !== '') entries.push({ cls, path });
  }
  return { entries };
}

// Every limit here counts UTF-16 units (String length); a cut never leaves half of a surrogate pair.
const firstUnits = (text, count) => text.slice(0, count).replace(/[\uD800-\uDBFF]$/, '');
const lastUnits = (text, count) => text.slice(-count).replace(/^[\uDC00-\uDFFF]/, '');

/** One printable line; a long path keeps its end, where the file name is. */
function shown(path) {
  const text = String(path).replace(CONTROL, '');
  return text.length <= PATH_SHOWN_MAX_CHARS ? text : `...${lastUnits(text, PATH_SHOWN_MAX_CHARS - 3)}`;
}

/** As many of the paths as fit in `room` characters, then how many more. */
function pathList(paths, room) {
  let text = '';
  for (let i = 0; i < paths.length; i++) {
    const next = `${text}${i === 0 ? '' : ', '}${shown(paths[i])}`;
    const rest = paths.length - i - 1;
    const tail = rest > 0 ? ` and ${rest} more` : '';
    if (i > 0 && next.length + tail.length > room) return `${text} and ${paths.length - i} more`;
    text = next;
  }
  return text;
}

/**
 * One reminder for the model, secret first, or null when the turn and its Noted line agree.
 * @param {{ capture: { entries: CaptureEntry[] } | null, written: string[], missing: string[], recordWrites: string[],
 *   secrets: Array<{ path: string, line: number, pattern: string }> }} input
 * @returns {string | null} at most REMINDER_MAX_CHARS characters
 */
export function stopReminder({ missing = [], recordWrites = [], secrets = [] }) {
  const parts = [];
  if (secrets.length > 0) {
    const [first] = secrets;
    const more = secrets.length > 1 ? ` (${secrets.length - 1} more)` : '';
    parts.push(`${shown(first.path)} line ${first.line} looks like a ${first.pattern} secret${more}; remove it and read it from the environment.`);
  }
  const room = (fixed) => REMINDER_MAX_CHARS - REMINDER_PREFIX.length - fixed.length - parts.join(' ').length - 2;
  if (missing.length > 0) {
    const fixed = 'The Noted line names  but this turn did not change it; record it there or fix the line.';
    parts.push(`The Noted line names ${pathList(missing, room(fixed))} but this turn did not change it; record it there or fix the line.`);
  }
  if (recordWrites.length > 0) {
    const fixed = 'A record home changed () with no Noted line; end the reply with one.';
    parts.push(`A record home changed (${pathList(recordWrites, room(fixed))}) with no Noted line; end the reply with one.`);
  }
  if (parts.length === 0) return null;
  const text = `${REMINDER_PREFIX} ${parts.join(' ')}`;
  return text.length <= REMINDER_MAX_CHARS ? text : `${firstUnits(text, REMINDER_MAX_CHARS - 3)}...`;
}

/** Reads a stream to its end; null when it is longer than `max` bytes (the rest is still drained, never parsed). */
function readBounded(stream, max) {
  return new Promise((done, fail) => {
    const chunks = [];
    let size = 0;
    stream.on('data', (chunk) => {
      size += chunk.length;
      if (size <= max) chunks.push(Buffer.from(chunk));
    });
    stream.on('end', () => done(size > max ? null : Buffer.concat(chunks).toString('utf8')));
    stream.on('error', fail);
  });
}

const oneLine = (text) => String(text).replace(/\s+/g, ' ').trim();

/**
 * Runs a hook handler fail-open: reads stdin, keeps the five known fields, finds the project from the script's own
 * location and requires the hook's cwd inside it. Every failure, a passed deadline included, ends with exit code 0
 * and no output; with `debug`, one stderr line says why.
 * @param {(context: { root: string, input: HookInput, check: () => void }) => string} handler returns the stdout text, '' for none
 * @param {{ scriptPath: string, io?: { stdin?: NodeJS.ReadableStream, write?: (text: string, done: () => void) => void,
 *   exit?: (code: number) => void, log?: (line: string) => void, debug?: boolean, now?: () => number, deadlineMs?: number } }} options
 * @returns {Promise<void>}
 */
export async function runHook(handler, { scriptPath, io = {} }) {
  const {
    stdin = process.stdin,
    write = (text, done) => process.stdout.write(text, done),
    exit = (code) => process.exit(code),
    log = (line) => process.stderr.write(`${line}\n`),
    debug = Boolean(process.env.APERTURE_DEBUG),
    now = Date.now,
    deadlineMs = SCRIPT_DEADLINE_MS,
  } = io;
  let finished = false;
  let timer;
  const finish = (output, reason) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (reason !== undefined && debug) log(`aperture hook: ${oneLine(reason)}`);
    if (output) write(output, () => exit(0));
    else exit(0);
  };
  const end = now() + deadlineMs;
  const check = () => {
    if (now() > end) throw new HookDeadlineError();
  };
  // Only a real run (no injected exit) guards the process: a stray error or a closed stdout must still end with 0.
  if (io.exit === undefined) {
    process.on('uncaughtException', (cause) => finish('', cause?.message ?? cause));
    process.on('unhandledRejection', (cause) => finish('', cause?.message ?? cause));
    process.stdout.on('error', () => exit(0));
  }
  timer = setTimeout(() => finish('', 'the hook deadline passed'), deadlineMs);
  try {
    const text = await readBounded(stdin, HOOK_INPUT_MAX_BYTES);
    if (finished) return;
    if (text === null) return finish('', 'the hook input is larger than the limit');
    const input = readHookInput(text);
    if (input === null) return finish('', 'the hook input is not a JSON object');
    const root = hookProjectRoot(scriptPath);
    if (root === null) return finish('', `no ${CONFIG_PATH} three folders above the script`);
    const cwd = typeof input.cwd === 'string' && isAbsolute(input.cwd) ? realDir(input.cwd) : null;
    if (cwd === null || !within(root, cwd)) return finish('', 'the hook cwd is not inside the project');
    const output = handler({ root, input, check });
    check();
    finish(output);
  } catch (cause) {
    finish('', cause?.message ?? cause);
  }
}
