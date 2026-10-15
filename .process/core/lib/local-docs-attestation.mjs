import { readFileSync, readdirSync, statSync } from 'node:fs';
import { isPlainObject } from './types.mjs';
import { isSha256, sha256Bytes, toPosix } from './files.mjs';
import { parseHeader } from './freeze.mjs';
import { DOCS_ROOT, LIVING_DIR } from './layout.mjs';
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
  for (const path of [...new Set(paths.map((path) => typeof path === 'string' ? toPosix(path) : path))].sort()) {
    if (typeof path !== 'string' || !path.startsWith(`${DOCS_ROOT}/`)) {
      throw new LocalDocsAttestationError(`Local document path ${JSON.stringify(path)} must begin with ${DOCS_ROOT}/. Fix the card or reviewer brief.`);
    }
    let target;
    try {
      target = resolveProjectPath(roots, path);
    } catch (cause) {
      throw new LocalDocsAttestationError(`Cannot resolve local document ${path}: ${cause.message}`);
    }
    try {
      if (!statSync(target).isFile()) throw new LocalDocsAttestationError(`${path} is not a file. Repair the local document before review.`);
      result[path] = sha256Bytes(readFileSync(target));
    } catch (cause) {
      if (cause.code === 'ENOENT') result[path] = null;
      else if (cause instanceof LocalDocsAttestationError) throw cause;
      else throw new LocalDocsAttestationError(`Cannot read local document ${path}: ${cause.message}. Repair local-store access.`);
    }
  }
  return result;
}

export function validLocalDocsHashes(value) {
  return isPlainObject(value) && Object.entries(value).every(([path, hash]) =>
    path.startsWith(`${DOCS_ROOT}/`) && (hash === null || isSha256(hash)));
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
  walk(LIVING_DIR);
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
  const sealed = parseHeader(packetText).local_docs_sha256;
  if (!isSha256(sealed)) return false;
  const match = /### Uncommitted local documents\n\n[^\n]*\n\n(`{3,})json\n([\s\S]*?)\n\1/.exec(packetText);
  if (match === null) return false;
  let recorded;
  try { recorded = JSON.parse(match[2]); } catch { return false; }
  if (!validLocalDocsHashes(recorded)) return false;
  if (sha256Bytes(Buffer.from(JSON.stringify(recorded), 'utf8')) !== sealed) return false;
  const named = Object.keys(recorded).filter((path) => !path.startsWith(`${LIVING_DIR}/`));
  const current = { ...localLivingHashes(projectDir), ...localDocsHashes(projectDir, named) };
  const sort = (value) => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
  return sort(current) === sort(recorded);
}
