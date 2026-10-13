import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { PathError } from './files.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

const ROOT = '.process/teams';
const TEAM = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HASH = /^[0-9a-f]{64}$/;

export class LocalCharterError extends Error {
  constructor(message, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'LocalCharterError';
  }
}

function charters(projectDir) {
  const roots = resolveProjectRoots(projectDir);
  if (roots.mode !== 'local') return null;
  const resolved = (path) => {
    try { return resolveProjectPath(roots, path); }
    catch (cause) {
      if (!(cause instanceof PathError)) throw cause;
      throw new LocalCharterError(`${path} is linked or unsafe. Repair the local team installation.`, cause);
    }
  };
  const directory = resolved(ROOT);
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch (cause) {
    if (cause.code === 'ENOENT') return [];
    throw new LocalCharterError(`Cannot read ${ROOT}. Restore the local team installation and freeze the card again.`, cause);
  }
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) throw new LocalCharterError(`${ROOT}/${entry.name} is linked. Remove the link before freezing or reviewing the card.`);
    if (!entry.isDirectory()) continue;
    if (!TEAM.test(entry.name)) throw new LocalCharterError(`${ROOT}/${entry.name} is not a valid team name. Repair the team installation.`);
    const path = `${ROOT}/${entry.name}/charter.md`;
    const file = resolved(path);
    let bytes;
    try {
      bytes = readFileSync(file);
    } catch (cause) {
      if (cause.code === 'ENOENT') continue;
      throw new LocalCharterError(`Cannot read ${path}. Restore the charter and freeze the card again.`, cause);
    }
    result.push({ team: entry.name, path, text: bytes.toString('utf8'), hash: createHash('sha256').update(bytes).digest('hex') });
  }
  return result;
}

/** Snapshot local operational charter bytes when a card enters its frozen scope. */
export function localCharterHashes(projectDir) {
  const found = charters(projectDir);
  return found === null ? null : Object.fromEntries(found.map(({ path, hash }) => [path, hash]));
}

/** Refuse a charter added or edited after freeze before using its ownership rules. */
export function frozenLocalCharters(projectDir, snapshot) {
  const found = charters(projectDir);
  if (found === null) return null;
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)
      || Object.entries(snapshot).some(([path, hash]) => !/^\.process\/teams\/[a-z0-9]+(?:-[a-z0-9]+)*\/charter\.md$/.test(path) || typeof hash !== 'string' || !HASH.test(hash))) {
    throw new LocalCharterError('The card has no valid frozen local team-charter baseline. Return it to shaping and freeze it again.');
  }
  const current = Object.fromEntries(found.map(({ path, hash }) => [path, hash]));
  const expected = Object.keys(snapshot).sort();
  const actual = Object.keys(current).sort();
  if (expected.length !== actual.length || expected.some((path, index) => path !== actual[index] || snapshot[path] !== current[path])) {
    throw new LocalCharterError('Local team charters changed since this card was frozen. Restore them or return the card to shaping and freeze it again.');
  }
  return found.map(({ team, path, text }) => ({ team, path, text }));
}
