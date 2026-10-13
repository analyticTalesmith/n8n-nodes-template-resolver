import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

export class LocalDocsAttestationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LocalDocsAttestationError';
  }
}

/** Hash exact bytes of named local documents. A missing document has a null baseline. */
export function localDocsHashes(projectDir, paths) {
  const roots = resolveProjectRoots(projectDir);
  if (roots.mode !== 'local') return null;
  const result = {};
  for (const path of [...new Set(paths.map((path) => typeof path === 'string' ? path.replaceAll('\\', '/') : path))].sort()) {
    if (typeof path !== 'string' || !path.startsWith('docs/')) {
      throw new LocalDocsAttestationError(`Local document path ${JSON.stringify(path)} must begin with docs/. Fix the card or reviewer brief.`);
    }
    let target;
    try {
      target = resolveProjectPath(roots, path);
    } catch (cause) {
      throw new LocalDocsAttestationError(`Cannot resolve local document ${path}: ${cause.message}`);
    }
    try {
      if (!statSync(target).isFile()) throw new LocalDocsAttestationError(`${path} is not a file. Repair the local document before review.`);
      result[path] = createHash('sha256').update(readFileSync(target)).digest('hex');
    } catch (cause) {
      if (cause.code === 'ENOENT') result[path] = null;
      else if (cause instanceof LocalDocsAttestationError) throw cause;
      else throw new LocalDocsAttestationError(`Cannot read local document ${path}: ${cause.message}. Repair local-store access.`);
    }
  }
  return result;
}

export function validLocalDocsHashes(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([path, hash]) =>
    path.startsWith('docs/') && (hash === null || (typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash))));
}

/** All living documents at this instant, including generated indexes. Refuse unbounded trees and links. */
export function localLivingHashes(projectDir) {
  const roots = resolveProjectRoots(projectDir);
  if (roots.mode !== 'local') return null;
  const paths = [];
  const walk = (logical) => {
    let entries;
    try {
      entries = readdirSync(resolveProjectPath(roots, logical), { withFileTypes: true });
    } catch (cause) {
      if (cause.code === 'ENOENT') return;
      throw new LocalDocsAttestationError(`Cannot inspect ${logical}: ${cause.message}. Repair local-store access.`);
    }
    for (const entry of entries) {
      const next = `${logical}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new LocalDocsAttestationError(`${next} is a link. Replace it with a regular local document.`);
      if (entry.isDirectory()) walk(next);
      else if (entry.isFile()) paths.push(next);
      else throw new LocalDocsAttestationError(`${next} is not a regular file. Repair the local document store.`);
      if (paths.length > 2500) throw new LocalDocsAttestationError('The living-doc tree exceeds 2500 files. Split or archive it before freezing or reviewing.');
    }
  };
  walk('docs/living');
  return localDocsHashes(projectDir, paths);
}

/** Git-style changes to living docs since the card froze; null in shared mode. */
export function localLivingChanges(projectDir, card) {
  const current = localLivingHashes(projectDir);
  if (current === null) return null;
  const before = card?.freeze?.local_living_sha256 ?? (card?.type === 'bug' ? card?.local_baseline?.local_living_sha256 : undefined);
  if (!validLocalDocsHashes(before)) throw new LocalDocsAttestationError('The card has no valid local living-document baseline. Return it to shaping and freeze, or use the bug fast path from backlog again.');
  return [...new Set([...Object.keys(before), ...Object.keys(current)])]
    .filter((path) => before[path] !== current[path])
    .sort()
    .map((path) => ({ path, status: before[path] === undefined ? 'A' : current[path] === undefined ? 'D' : 'M' }));
}

/** Reconstruct the packet's relevant local-doc set and compare exact bytes, including newly added living files. */
export function localPacketFresh(projectDir, packetText) {
  const header = /^---\n([\s\S]*?)\n---/.exec(packetText);
  const sealed = header === null ? null : /^local_docs_sha256: ([0-9a-f]{64})$/m.exec(header[1])?.[1];
  if (sealed === null || sealed === undefined) return false;
  const match = /### Uncommitted local documents\n\n[^\n]*\n\n(`{3,})json\n([\s\S]*?)\n\1/.exec(packetText);
  if (match === null) return false;
  let recorded;
  try { recorded = JSON.parse(match[2]); } catch { return false; }
  if (!validLocalDocsHashes(recorded)) return false;
  if (createHash('sha256').update(JSON.stringify(recorded)).digest('hex') !== sealed) return false;
  const named = Object.keys(recorded).filter((path) => !path.startsWith('docs/living/'));
  const current = { ...localLivingHashes(projectDir), ...localDocsHashes(projectDir, named) };
  const sort = (value) => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
  return sort(current) === sort(recorded);
}
