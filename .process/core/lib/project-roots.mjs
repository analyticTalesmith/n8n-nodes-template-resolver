import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, parse, posix, relative, resolve, sep, win32 } from 'node:path';
import { resolveInside, safeRelative, sha256Bytes, writeJsonAtomic } from './files.mjs';
import { CYCLES_DIR, DOCS_ROOT, PROCESS_DIR, SESSIONS_DIR } from './layout.mjs';

const REGISTRY = 'registry.json';
const MARKER = `${PROCESS_DIR}/docs-store.json`;
const DOCS_PREFIX = `${DOCS_ROOT}/`;
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const IDENTITY = 'store.json';
const STORE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORE_GENERATION = new WeakMap();
const LOCK_WAIT_MS = 30_000;
const LOCK_POLL_MS = 20;
/** Lock mkdir codes that mean another process holds the lock. Windows reports EPERM, EACCES or EBUSY when a mkdir races the holder's rmdir. */
const LOCK_CONTENTION = new Set(['EEXIST', 'EPERM', 'EACCES', 'EBUSY']);

export class ProjectRootsError extends Error {
  constructor(message, rule, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ProjectRootsError';
    this.rule = rule;
  }
}

/** A test may supply `dataRoot`; ordinary calls use the user's platform data folder. */
export function projectDataRoot({ dataRoot, platform = process.platform, env = process.env, homeDir = homedir() } = {}) {
  if (dataRoot !== undefined) {
    if (typeof dataRoot !== 'string' || !isAbsolute(dataRoot)) throw new ProjectRootsError('The local data root must be absolute. Repair the configured path.', 'store-unsafe');
    return resolve(dataRoot);
  }
  if (platform === 'win32') return win32.resolve(env.LOCALAPPDATA || win32.join(homeDir, 'AppData', 'Local'), 'Aperture');
  if (platform === 'darwin') return posix.resolve(homeDir, 'Library', 'Application Support', 'Aperture');
  return posix.resolve(env.XDG_DATA_HOME || posix.join(homeDir, '.local', 'share'), 'aperture');
}

function checkoutPath(checkoutRoot) {
  try {
    const real = realpathSync.native(checkoutRoot);
    if (!statSync(real).isDirectory()) throw new Error('not a directory');
    return real;
  } catch (cause) {
    throw new ProjectRootsError(`Checkout ${checkoutRoot} is unavailable. Restore the checkout or repair its path.`, 'checkout-missing', cause);
  }
}

function readJson(path, rule, repair) {
  let value;
  try {
    value = JSON.parse(readFileSync(path, 'utf8'));
  } catch (cause) {
    throw new ProjectRootsError(`${path} cannot be read as JSON. ${repair}`, rule, cause);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProjectRootsError(`${path} has an invalid shape. ${repair}`, rule);
  }
  return value;
}

function noLinks(path) {
  const absolute = resolve(path);
  const base = parse(absolute).root;
  let current = base;
  for (const segment of absolute.slice(base.length).split(sep).filter(Boolean)) {
    current = join(current, segment);
    let stat;
    try {
      stat = lstatSync(current);
    } catch (cause) {
      if (cause.code === 'ENOENT') return;
      throw new ProjectRootsError(`Cannot inspect ${current}. Repair access to the local store.`, 'store-unsafe', cause);
    }
    if (stat.isSymbolicLink()) throw new ProjectRootsError(`${current} is a symlink or junction. Repair the local store path before continuing.`, 'store-unsafe');
  }
}

/** The path with its deepest existing ancestor resolved to the real spelling (an 8.3 short name or a link becomes the long one). */
function realSpelling(path) {
  const absolute = resolve(path);
  const rest = [];
  for (let current = absolute; ; current = dirname(current)) {
    try { return join(realpathSync.native(current), ...rest.reverse()); } catch { /* Not there yet: resolve the parent. */ }
    if (dirname(current) === current) return absolute;
    rest.push(basename(current));
  }
}

function isWithin(parent, child) {
  const rel = relative(realSpelling(parent), realSpelling(child));
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function generation(path) {
  const stat = statSync(path, { bigint: true });
  return `${stat.dev}:${stat.ino}:${stat.birthtimeNs}`;
}

function withRegistryLock(dataRoot, action, { lockMkdir = mkdirSync, lockWaitMs = LOCK_WAIT_MS } = {}) {
  const madeDataRoot = !existsSync(dataRoot);
  mkdirSync(dataRoot, { recursive: true });
  const lockPath = join(dataRoot, '.registry.lock');
  const deadline = process.hrtime.bigint() + BigInt(Math.ceil(lockWaitMs * 1_000_000));
  const busy = (lastCause) => new ProjectRootsError(`Registry lock ${lockPath} is busy. Wait for setup to finish, or repair a stale lock after checking no setup is running.`, 'registry-locked', lastCause);
  while (true) {
    try {
      lockMkdir(lockPath);
      break;
    } catch (cause) {
      if (!LOCK_CONTENTION.has(cause.code)) {
        throw new ProjectRootsError(`Cannot lock registry at ${lockPath}. Repair local-store access.`, 'registry-locked', cause);
      }
      let lockStat;
      try {
        lockStat = lstatSync(lockPath);
      } catch (inspectError) {
        if (inspectError.code === 'ENOENT') {
          // The holder released it between the failed mkdir and now: retry at once, but a mkdir that keeps failing with no folder must still end.
          if (process.hrtime.bigint() >= deadline) throw busy(cause);
          continue;
        }
        throw new ProjectRootsError(`Cannot inspect registry lock ${lockPath}. Repair local-store access.`, 'registry-locked', inspectError);
      }
      if (!lockStat.isDirectory()) {
        throw new ProjectRootsError(`${lockPath} is not a lock directory. Repair the local registry lock.`, 'registry-locked');
      }
      if (process.hrtime.bigint() >= deadline) throw busy(cause);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_POLL_MS);
    }
  }
  try {
    return action();
  } finally {
    rmdirSync(lockPath);
    if (madeDataRoot) {
      try { rmdirSync(dataRoot); } catch { /* Keep a populated directory or one another process now uses. */ }
    }
  }
}

function registryAt(dataRoot) {
  const path = join(dataRoot, REGISTRY);
  if (!existsSync(path)) return { version: 1, projects: {} };
  noLinks(path);
  const registry = readJson(path, 'registry-invalid', 'Repair or restore the machine-local registry.');
  if (registry.version !== 1 || registry.projects === null || typeof registry.projects !== 'object' || Array.isArray(registry.projects)) {
    throw new ProjectRootsError(`Registry ${path} has an invalid shape. Repair or restore it.`, 'registry-invalid');
  }
  return registry;
}

function storePaths(dataRoot, storeId) {
  if (!STORE_ID.test(storeId)) throw new ProjectRootsError('Store ID is invalid. Repair or relink the local project.', 'identity-mismatch');
  const base = join(dataRoot, 'projects', storeId);
  return { base, docsRoot: join(base, DOCS_ROOT), identity: join(base, IDENTITY) };
}

function validateStore(checkoutRoot, dataRoot, storeId) {
  const paths = storePaths(dataRoot, storeId);
  noLinks(paths.docsRoot);
  noLinks(paths.identity);
  if (!existsSync(paths.docsRoot) || !statSync(paths.docsRoot).isDirectory()) {
    throw new ProjectRootsError(`Local docs store ${paths.docsRoot} is missing. Restore it or relink this checkout.`, 'store-missing');
  }
  if (!existsSync(paths.identity)) throw new ProjectRootsError(`Store identity ${paths.identity} is missing. Restore it or relink this checkout.`, 'identity-mismatch');
  const identity = readJson(paths.identity, 'identity-mismatch', 'Repair or relink this checkout.');
  if (identity.storeId !== storeId || identity.checkoutRoot !== checkoutRoot) {
    throw new ProjectRootsError(`Store ${paths.base} belongs to a different checkout. Relink it explicitly after verifying ownership.`, 'identity-mismatch');
  }
  if (isWithin(checkoutRoot, paths.docsRoot)) {
    throw new ProjectRootsError('Local docs store is inside the checkout. Repair its location before continuing.', 'store-unsafe');
  }
  return paths.docsRoot;
}

/** Resolve an existing project, preserving legacy shared mode only when no local identity exists. */
export function resolveProjectRoots(checkoutRoot, options = {}) {
  const checkout = checkoutPath(checkoutRoot);
  const dataRoot = projectDataRoot(options);
  noLinks(dataRoot);
  const markerPath = resolveInside(checkout, MARKER);
  const markerPresent = existsSync(markerPath);
  const registry = registryAt(dataRoot);
  const record = registry.projects[checkout];
  if (!markerPresent && !record) return { checkoutRoot: checkout, docsRoot: resolveInside(checkout, DOCS_ROOT), mode: 'shared', storeId: null };
  if (!markerPresent) throw new ProjectRootsError(`Local registry names ${checkout}, but ${MARKER} is missing. Restore the marker or relink this checkout.`, 'identity-mismatch');
  const marker = readJson(markerPath, 'identity-mismatch', 'Restore the marker or relink this checkout.');
  if (!STORE_ID.test(marker.storeId)) throw new ProjectRootsError(`${MARKER} has an invalid store ID. Repair or relink this checkout.`, 'identity-mismatch');
  if (!record) {
    const elsewhere = Object.entries(registry.projects).find(([, item]) => item?.storeId === marker.storeId);
    throw new ProjectRootsError(
      elsewhere ? `Checkout moved from ${elsewhere[0]} to ${checkout}. Relink the local docs store explicitly.` : `Local registry entry for ${checkout} is missing. Restore the registry or relink the local docs store.`,
      elsewhere ? 'relink-required' : 'registry-missing',
    );
  }
  if (record.mode !== 'local' || record.storeId !== marker.storeId) {
    throw new ProjectRootsError(`Registry and ${MARKER} disagree. Repair or relink this checkout.`, 'identity-mismatch');
  }
  const docsRoot = validateStore(checkout, dataRoot, record.storeId);
  const roots = { checkoutRoot: checkout, docsRoot, mode: 'local', storeId: record.storeId };
  STORE_GENERATION.set(roots, generation(docsRoot));
  return roots;
}

/** Register a preflighted checkout. The registry record is the final durable write. */
export function registerLocalProject(checkoutRoot, options = {}) {
  const checkout = checkoutPath(checkoutRoot);
  const dataRoot = projectDataRoot(options);
  if (isWithin(checkout, dataRoot)) throw new ProjectRootsError(`Local data root ${dataRoot} is inside the checkout. Repair its location before setup.`, 'store-unsafe');
  noLinks(dataRoot);
  return withRegistryLock(dataRoot, () => registerLocked(checkout, dataRoot, options), { lockMkdir: options.lockMkdir, lockWaitMs: options.lockWaitMs });
}

function registerLocked(checkout, dataRoot, options) {
  const current = resolveProjectRoots(checkout, options);
  if (current.mode === 'local') return current;
  const markerPath = resolveInside(checkout, MARKER);
  const registry = registryAt(dataRoot);
  const storeId = options.storeId ?? randomUUID();
  const paths = storePaths(dataRoot, storeId);
  noLinks(paths.base);
  if (existsSync(paths.base)) throw new ProjectRootsError(`Store ${paths.base} already exists. Repair or relink the colliding store.`, 'registration-failed');
  const processDir = dirname(markerPath);
  const madeProcessDir = !existsSync(processDir);
  const projectsDir = dirname(paths.base);
  const madeProjectsDir = !existsSync(projectsDir);
  let madeStore = false;
  let madeMarker = false;
  try {
    mkdirSync(paths.docsRoot, { recursive: true });
    madeStore = true;
    writeJsonAtomic(paths.identity, { storeId, checkoutRoot: checkout });
    mkdirSync(processDir, { recursive: true });
    writeJsonAtomic(markerPath, { storeId });
    madeMarker = true;
    options.populate?.(paths.docsRoot);
    validateStore(checkout, dataRoot, storeId);
    writeJsonAtomic(join(dataRoot, REGISTRY), { ...registry, projects: { ...registry.projects, [checkout]: { mode: 'local', storeId } } });
  } catch (cause) {
    if (madeMarker) rmSync(markerPath, { force: true });
    if (madeStore) rmSync(paths.base, { recursive: true, force: true });
    for (const [path, created] of [[processDir, madeProcessDir], [projectsDir, madeProjectsDir]]) {
      if (created && existsSync(path)) {
        try { rmdirSync(path); } catch { /* Preserve anything another operation wrote. */ }
      }
    }
    throw new ProjectRootsError(`Could not register local docs for ${checkout}. Repair the failed setup and retry.`, 'registration-failed', cause);
  }
  return resolveProjectRoots(checkout, options);
}

/** Retire a local binding after a verified copy into shared docs. The external store is retained. */
export function switchToSharedProject(checkoutRoot, options = {}) {
  const checkout = checkoutPath(checkoutRoot);
  const dataRoot = projectDataRoot(options);
  noLinks(dataRoot);
  return withRegistryLock(dataRoot, () => {
    const roots = resolveProjectRoots(checkout, options);
    if (roots.mode !== 'local') throw new ProjectRootsError(`${checkout} is not a local-only project. Choose a local project to move.`, 'mode-mismatch');
    options.verifyShared?.(roots);
    const registry = registryAt(dataRoot);
    const markerPath = resolveInside(checkout, MARKER);
    const nextProjects = { ...registry.projects };
    delete nextProjects[checkout];
    try {
      writeJsonAtomic(join(dataRoot, REGISTRY), { ...registry, projects: nextProjects });
      rmSync(markerPath);
    } catch (cause) {
      try { writeJsonAtomic(join(dataRoot, REGISTRY), registry); } catch { /* A retained marker makes a partial transition fail closed. */ }
      throw new ProjectRootsError(`Could not switch ${checkout} to shared docs. Restore the local binding or retry the move.`, 'switch-failed', cause);
    }
    return { ...roots, mode: 'shared', docsRoot: resolveInside(checkout, DOCS_ROOT), previousDocsRoot: roots.docsRoot };
  });
}

/** Map stable logical docs paths into the store; all other paths stay in the checkout. */
export function resolveProjectPath(roots, logicalPath) {
  const path = safeRelative(logicalPath);
  if (path === DOCS_ROOT || path.startsWith(DOCS_PREFIX)) {
    if (roots.mode === 'local') {
      const dataRoot = dirname(dirname(dirname(roots.docsRoot)));
      const fresh = resolveProjectRoots(roots.checkoutRoot, { dataRoot });
      if (fresh.mode !== 'local' || fresh.storeId !== roots.storeId || fresh.docsRoot !== roots.docsRoot || STORE_GENERATION.get(fresh) !== STORE_GENERATION.get(roots)) {
        throw new ProjectRootsError(`Local docs store ${roots.docsRoot} changed since it was resolved. Repair or relink this checkout.`, 'store-replaced');
      }
    }
    if (path === DOCS_ROOT) return roots.docsRoot;
    return resolveInside(roots.docsRoot, path.slice(DOCS_PREFIX.length));
  }
  return resolveInside(roots.checkoutRoot, path);
}

/**
 * Raw feedback sessions are machine-local even when durable docs are shared.
 * The logical docs path remains stable in feedback references and digests.
 */
export function resolveRawSessionPath(roots, logicalPath, options = {}) {
  const path = safeRelative(logicalPath);
  const root = `${SESSIONS_DIR}/`;
  const cycle = new RegExp(`^${escapeRegExp(CYCLES_DIR)}/[^/]+/feedback/sessions/[^/]+\\.md$`);
  if (!((path.startsWith(root) && !path.slice(root.length).includes('/') && path.endsWith('.md')) || cycle.test(path))) {
    throw new ProjectRootsError(`Raw session ${path} must be a .md file directly in a feedback sessions folder.`, 'session-path-unsafe');
  }
  if (roots.mode === 'local') return resolveProjectPath(roots, path);
  const dataRoot = projectDataRoot(options);
  noLinks(dataRoot);
  if (isWithin(roots.checkoutRoot, dataRoot)) {
    throw new ProjectRootsError(`Private session store ${dataRoot} is inside the checkout. Repair its location.`, 'store-unsafe');
  }
  const id = sha256Bytes(Buffer.from(roots.checkoutRoot, 'utf8'));
  const privateRoot = join(dataRoot, 'private-sessions', id);
  noLinks(privateRoot);
  return resolveInside(privateRoot, path.slice(DOCS_PREFIX.length));
}
