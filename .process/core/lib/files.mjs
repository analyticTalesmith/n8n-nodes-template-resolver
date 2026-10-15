import { createHash, randomBytes } from 'node:crypto';
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';

/** @typedef {{ writeFile?: typeof writeFileSync, rename?: typeof renameSync, sleep?: (ms: number) => void }} FileIo */

/** Waits before each retry of the final rename, in milliseconds. */
export const RENAME_WAITS_MS = Object.freeze([50, 100, 200, 400]);

const RETRY_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);
const TEXT_PROBE_BYTES = 8000;
const RESERVED_NAMES = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9]|conin\$|conout\$)$/i;
const BAD_CHARACTERS = /[\u0000-\u001f:<>"|?*]/;
const DRIVE_FORM = /^[A-Z]:/;

export class PathError extends Error {
  /**
   * @param {string} message
   * @param {'path-unsafe' | 'path-symlink'} rule
   * @param {string} path the offending path as given
   * @param {'form' | 'character' | 'name' | 'case-collision'} [detail]
   */
  constructor(message, rule, path, detail) {
    super(message);
    this.name = 'PathError';
    this.rule = rule;
    this.path = path;
    if (detail !== undefined) this.detail = detail;
  }
}

const unsafe = (rel, detail, why) =>
  new PathError(`Path ${JSON.stringify(rel)} is not allowed (${why}). Use a plain relative path of ordinary file names.`, 'path-unsafe', String(rel), detail);

/**
 * Normalises a relative path to forward slashes and refuses anything that could leave its root or
 * name a Windows device or alternate data stream.
 * @param {unknown} rel
 * @returns {string}
 */
export function safeRelative(rel) {
  if (typeof rel !== 'string' || rel === '') throw unsafe(rel, 'form', 'it is empty or not text');
  const path = rel.replaceAll('\\', '/');
  if (path.startsWith('/') || DRIVE_FORM.test(path)) throw unsafe(rel, 'form', 'it is absolute');
  const segments = path.split('/');
  for (const segment of segments) {
    if (segment === '') throw unsafe(rel, 'form', 'it has an empty segment');
    if (segment === '.' || segment === '..') throw unsafe(rel, 'form', 'it has a "." or ".." segment');
  }
  for (const segment of segments) {
    if (BAD_CHARACTERS.test(segment)) throw unsafe(rel, 'character', 'it has a control character or one of : < > " | ? *');
    if (/[. ]$/.test(segment)) throw unsafe(rel, 'name', 'a segment ends in a dot or a space');
    if (RESERVED_NAMES.test(segment.split('.')[0])) throw unsafe(rel, 'name', 'a segment is a Windows device name');
  }
  return segments.join('/');
}

/**
 * True where the file system compares names ignoring case by default (Windows and macOS).
 * @param {string} [platform]
 */
export const ignoresCase = (platform = process.platform) => platform === 'win32' || platform === 'darwin';

const foldCase = ignoresCase();
const withSeparator = (p) => (p.endsWith(sep) ? p : p + sep);
const comparable = (p) => (foldCase ? p.toLowerCase() : p);

/**
 * Absolute path of `rel` inside `root`. Every existing component below the root is checked with lstat,
 * so a symlink or junction there is refused. Check right before writing: the window is not closed.
 * @param {string} root
 * @param {string} rel
 * @returns {string}
 */
export function resolveInside(root, rel) {
  const safe = safeRelative(rel);
  const base = resolve(root);
  const target = resolve(base, safe);
  if (!comparable(target).startsWith(comparable(withSeparator(base)))) throw unsafe(rel, 'form', 'it leaves its root');
  let current = base;
  for (const segment of safe.split('/')) {
    current = join(current, segment);
    let stat;
    try {
      stat = lstatSync(current);
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'ENOTDIR') break;
      throw err;
    }
    if (stat.isSymbolicLink()) {
      throw new PathError(
        `${safe} passes through a symlink or junction at ${current}. Remove the link; Aperture does not write through links.`,
        'path-symlink',
        safe,
      );
    }
  }
  return target;
}

/**
 * Groups of paths that are equal when case is ignored.
 * @param {string[]} paths
 * @returns {string[][]}
 */
export function findCaseCollisions(paths) {
  const groups = new Map();
  for (const path of paths) {
    const key = path.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), path]);
  }
  return [...groups.values()].filter((group) => new Set(group).size > 1);
}

/**
 * Sorted forward-slash relative paths of every file under `dir`. Refuses symlinks, junctions, unsafe
 * names and names that differ only by case.
 * @param {string} dir
 * @returns {string[]}
 */
export function listTree(dir) {
  const files = [];
  const all = [];
  const walk = (abs, rel) => {
    for (const name of readdirSync(abs)) {
      const childRel = rel === '' ? name : `${rel}/${name}`;
      safeRelative(childRel);
      const stat = lstatSync(join(abs, name));
      if (stat.isSymbolicLink()) {
        throw new PathError(`${childRel} is a symlink or junction. Replace it with a real file or folder.`, 'path-symlink', childRel);
      }
      all.push(childRel);
      if (stat.isDirectory()) walk(join(abs, name), childRel);
      else if (stat.isFile()) files.push(childRel);
      else throw unsafe(childRel, 'form', 'it is not a regular file or folder');
    }
  };
  walk(dir, '');
  const [collision] = findCaseCollisions(all);
  if (collision) {
    throw new PathError(
      `${collision.join(' and ')} differ only by case, so they cannot coexist on every file system. Rename one.`,
      'path-unsafe',
      collision[0],
      'case-collision',
    );
  }
  return files.sort();
}

/** A sha256 digest as hex: 64 lowercase characters. */
export const SHA256_HEX = /^[0-9a-f]{64}$/;

/** @param {unknown} value */
export const isSha256 = (value) => typeof value === 'string' && SHA256_HEX.test(value);

/**
 * sha256 hex of the raw bytes, never line-ending normalised.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export const sha256Bytes = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * sha256 hex of the text as UTF-8 with CRLF read as LF first, so a checkout setting does not change it.
 * @param {string} text
 * @returns {string}
 */
export const sha256Text = (text) => sha256Bytes(Buffer.from(text.replaceAll('\r\n', '\n'), 'utf8'));

/** @param {Buffer} bytes */
export const isText = (bytes) => !bytes.subarray(0, TEXT_PROBE_BYTES).includes(0);

/**
 * sha256 hex; a text file is hashed with CRLF read as LF so a checkout setting does not change it.
 * @param {Buffer} bytes
 * @returns {string}
 */
export function hashBytes(bytes) {
  const data = isText(bytes) ? Buffer.from(bytes.toString('latin1').replaceAll('\r\n', '\n'), 'latin1') : bytes;
  return sha256Bytes(data);
}

/**
 * @param {string} path
 * @returns {string | null} null when the file is absent
 */
export function hashFile(path) {
  try {
    return hashBytes(readFileSync(path));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

const defaultSleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * Writes through a temp file in the same folder and renames it over the target. The rename is retried
 * after each wait in RENAME_WAITS_MS when an editor or scanner holds the target; the temp file never stays.
 * @param {string} path
 * @param {string | Buffer} data
 * @param {FileIo} [io]
 */
export function writeFileAtomic(path, data, io = {}) {
  const { writeFile = writeFileSync, rename = renameSync, sleep = defaultSleep } = io;
  const folder = dirname(path);
  mkdirSync(folder, { recursive: true });
  const temp = join(folder, `.${basename(path)}.${randomBytes(6).toString('hex')}.tmp`);
  try {
    writeFile(temp, data);
    for (let attempt = 0; ; attempt++) {
      try {
        rename(temp, path);
        return;
      } catch (err) {
        if (!RETRY_CODES.has(err.code) || attempt === RENAME_WAITS_MS.length) throw err;
        sleep(RENAME_WAITS_MS[attempt]);
      }
    }
  } catch (err) {
    rmSync(temp, { force: true });
    throw err;
  }
}

/**
 * @param {string} path
 * @param {unknown} value
 * @param {FileIo} [io]
 */
export function writeJsonAtomic(path, value, io) {
  writeFileAtomic(path, JSON.stringify(value, null, 2) + '\n', io);
}

/**
 * Backslashes to forward slashes. Each option is off by default, so a caller names exactly the
 * clean-up it needs; they run in this order: trim, slashes, leading `./`, trailing `/`.
 * @param {string} path
 * @param {{ stripDotSlash?: boolean, trim?: boolean, stripTrailingSlash?: boolean }} [options]
 * @returns {string}
 */
export function toPosix(path, { stripDotSlash = false, trim = false, stripTrailingSlash = false } = {}) {
  let out = (trim ? path.trim() : path).replaceAll('\\', '/');
  if (stripDotSlash) out = out.replace(/^(\.\/)+/, '');
  if (stripTrailingSlash) out = out.replace(/\/+$/, '');
  return out;
}

/**
 * CRLF reads as LF. A lone CR is left alone, as every copy this replaced did, so text hashed after this call keeps its hash.
 * @param {string} text
 * @returns {string}
 */
export const toLf = (text) => text.replace(/\r\n/g, '\n');

/**
 * @param {string} text
 * @returns {string} the text without a leading byte order mark
 */
export const stripBom = (text) => (text.startsWith('\uFEFF') ? text.slice(1) : text);

/**
 * @param {string} text
 * @returns {'\r\n' | '\n'} CRLF only when the text contains a CRLF
 */
export const detectEol = (text) => (text.includes('\r\n') ? '\r\n' : '\n');
