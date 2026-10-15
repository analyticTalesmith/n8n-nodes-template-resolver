import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { listTree, resolveInside, sha256Bytes } from './files.mjs';
import { CYCLES_DIR, DOCS_ROOT, SESSIONS_DIR } from './layout.mjs';
import { projectDataRoot, registerLocalProject, resolveProjectRoots, resolveRawSessionPath, switchToSharedProject } from './project-roots.mjs';

export class DocsMoveError extends Error {
  constructor(message, rule = 'docs-move-refused', cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'DocsMoveError';
    this.rule = rule;
  }
}

const sha = sha256Bytes;
const DOCS_PREFIX = `${DOCS_ROOT}/`;
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RAW_SESSION = new RegExp(`^${escapeRegExp(SESSIONS_DIR.slice(DOCS_PREFIX.length))}/|^${escapeRegExp(CYCLES_DIR.slice(DOCS_PREFIX.length))}/[^/]+/feedback/sessions/`);
const rawSession = (path) => RAW_SESSION.test(path);
const privateRoot = (checkoutRoot, options) => join(projectDataRoot(options), 'private-sessions', sha(Buffer.from(checkoutRoot)));
const sharedRoots = (checkoutRoot) => ({ checkoutRoot, mode: 'shared' });
const checkPrivateRoot = (checkoutRoot, options) => resolveRawSessionPath(sharedRoots(checkoutRoot), `${SESSIONS_DIR}/_probe.md`, options);
const sameFiles = (actual, expected) => actual.length === expected.length && actual.every((path, index) => path === expected[index]);

/** Preview an explicit mode change without writing anything. */
export function planDocsMove(checkoutRoot, targetMode, options = {}) {
  if (!['local', 'shared'].includes(targetMode)) throw new DocsMoveError('Choose --to local or --to shared.');
  const roots = resolveProjectRoots(checkoutRoot, options);
  if (roots.mode === targetMode) throw new DocsMoveError(`Docs are already ${targetMode}. Choose the other mode.`);
  if (!existsSync(roots.docsRoot)) throw new DocsMoveError(`Source docs ${roots.docsRoot} are missing. Restore them before moving.`);
  const storeId = targetMode === 'local' ? randomUUID() : roots.storeId;
  const destination = targetMode === 'local'
    ? join(projectDataRoot(options), 'projects', storeId, DOCS_ROOT)
    : join(roots.checkoutRoot, DOCS_ROOT);
  if (targetMode === 'local' && existsSync(dirname(destination))) {
    throw new DocsMoveError(`Destination ${dirname(destination)} already exists. Preview again to choose a new store.`);
  }
  if (targetMode === 'shared' && existsSync(destination)) {
    throw new DocsMoveError(`Destination ${destination} already contains a docs tree. Move or reconcile it before switching to shared docs.`);
  }
  const all = listTree(roots.docsRoot);
  const excluded = targetMode === 'shared' ? all.filter(rawSession) : [];
  const privateSource = roots.mode === 'shared' ? privateRoot(roots.checkoutRoot, options) : null;
  if (privateSource !== null) checkPrivateRoot(roots.checkoutRoot, options);
  const privatePaths = privateSource !== null && existsSync(privateSource) ? listTree(privateSource).filter(rawSession) : [];
  const copyPaths = [...all.filter((path) => !excluded.includes(path)).map((path) => ({ path, root: roots.docsRoot })), ...privatePaths.map((path) => ({ path, root: privateSource }))];
  if (new Set(copyPaths.map((f) => f.path)).size !== copyPaths.length) throw new DocsMoveError('A raw session exists in both shared docs and the private store. Reconcile the duplicate before moving.');
  const files = copyPaths.map(({ path, root }) => {
    const source = root === privateSource ? resolveRawSessionPath(sharedRoots(roots.checkoutRoot), `${DOCS_PREFIX}${path}`, options) : resolveInside(root, path);
    const to = resolveInside(destination, path);
    if (existsSync(to)) throw new DocsMoveError(`Destination conflict at ${to}. Move or reconcile that file, then preview again.`);
    return { path: `${DOCS_PREFIX}${path}`, source, destination: to, sha256: sha(readFileSync(source)) };
  });
  const privateDestination = targetMode === 'shared' ? privateRoot(roots.checkoutRoot, options) : null;
  if (privateDestination !== null) checkPrivateRoot(roots.checkoutRoot, options);
  const privateFiles = excluded.map((path) => {
    const source = resolveInside(roots.docsRoot, path);
    const to = resolveRawSessionPath(sharedRoots(roots.checkoutRoot), `${DOCS_PREFIX}${path}`, options);
    if (existsSync(to)) throw new DocsMoveError(`Private session conflict at ${to}. Reconcile it before moving.`);
    return { path: `${DOCS_PREFIX}${path}`, source, destination: to, sha256: sha(readFileSync(source)) };
  });
  return { checkoutRoot: roots.checkoutRoot, from: roots.mode, to: targetMode, source: roots.docsRoot, destination, privateDestination, storeId, files, privateFiles, sourceFiles: all, sourcePrivateFiles: privatePaths, excluded: excluded.map((p) => `${DOCS_PREFIX}${p}`) };
}

function verifySourceSet(plan, options) {
  if (!sameFiles(listTree(plan.source), plan.sourceFiles)) {
    throw new DocsMoveError('Source docs changed since preview. Preview the complete move again.');
  }
  if (plan.from === 'shared') {
    checkPrivateRoot(plan.checkoutRoot, options);
    const root = privateRoot(plan.checkoutRoot, options);
    const actual = existsSync(root) ? listTree(root).filter(rawSession) : [];
    if (!sameFiles(actual, plan.sourcePrivateFiles)) throw new DocsMoveError('Private sessions changed since preview. Preview the complete move again.');
  }
}

function verifyDestinationSet(plan) {
  const actual = listTree(plan.destination);
  const expected = plan.files.map((file) => file.path.slice(DOCS_PREFIX.length)).sort();
  if (!sameFiles(actual, expected)) throw new DocsMoveError('Destination docs changed during the move. Reconcile them before switching.', 'docs-move-failed');
}

function verifyFiles(plan) {
  for (const file of plan.files) {
    if (sha(readFileSync(file.source)) !== file.sha256) throw new DocsMoveError(`Source changed since preview: ${file.source}. Preview the move again.`);
    if (sha(readFileSync(file.destination)) !== file.sha256) throw new DocsMoveError(`Copy verification failed for ${file.destination}. Repair the destination before switching.`, 'docs-move-failed');
  }
}

function copyFiles(plan, root, io, verifyExact = true) {
  const created = [];
  const dirs = new Set();
  const cleanup = () => {
    for (const path of created.reverse()) rmSync(path, { force: true });
    for (const path of [...dirs].sort((a, b) => b.length - a.length)) {
      try { rmdirSync(path); } catch { /* Preserve any folder another process now uses. */ }
    }
  };
  try {
    for (const file of plan.files) {
      const path = resolveInside(root, relative(plan.destination, file.destination));
      if (existsSync(path)) throw new DocsMoveError(`Destination conflict at ${path}. Move or reconcile it, then preview again.`);
      const folder = dirname(path);
      if (!existsSync(folder)) {
        let current = folder;
        while (!existsSync(current)) { dirs.add(current); current = dirname(current); }
        mkdirSync(folder, { recursive: true });
      }
      const bytes = readFileSync(file.source);
      if (sha(bytes) !== file.sha256) throw new DocsMoveError(`Source changed since preview: ${file.source}. Preview the move again.`);
      const fd = openSync(path, 'wx');
      created.push(path);
      try { (io.writeFile ?? writeFileSync)(fd, bytes); }
      finally { closeSync(fd); }
    }
    verifyFiles(plan);
    if (verifyExact) verifyDestinationSet(plan);
  } catch (cause) {
    cleanup();
    throw cause;
  }
  return cleanup;
}

/** Copy, verify and switch. The source tree is always retained. */
export function applyDocsMove(plan, { dataRoot, io = {} } = {}) {
  if (!['local', 'shared'].includes(plan.to) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(plan.storeId)) {
    throw new DocsMoveError('Move mode or store ID changed since preview. Preview the move again.');
  }
  const current = resolveProjectRoots(plan.checkoutRoot, { dataRoot });
  if (current.mode !== plan.from || current.docsRoot !== plan.source || current.storeId !== (plan.from === 'local' ? plan.storeId : null)) {
    throw new DocsMoveError('Documentation location changed since preview. Preview the move again.');
  }
  const expectedDestination = plan.to === 'local'
    ? join(projectDataRoot({ dataRoot }), 'projects', plan.storeId, DOCS_ROOT)
    : join(current.checkoutRoot, DOCS_ROOT);
  const expectedPrivate = plan.to === 'shared' ? privateRoot(current.checkoutRoot, { dataRoot }) : null;
  checkPrivateRoot(current.checkoutRoot, { dataRoot });
  if (plan.destination !== expectedDestination || plan.privateDestination !== expectedPrivate) {
    throw new DocsMoveError('Move destination changed since preview. Preview the move again.');
  }
  if (plan.to === 'shared' && existsSync(expectedDestination)) {
    throw new DocsMoveError(`Destination ${expectedDestination} already contains a docs tree. Move or reconcile it before switching to shared docs.`);
  }
  verifySourceSet(plan, { dataRoot });
  for (const file of [...plan.files, ...plan.privateFiles]) {
    const logical = file.path;
    if (!logical.startsWith(DOCS_PREFIX)) throw new DocsMoveError(`Move path is not under ${DOCS_PREFIX}. Preview the move again.`);
    const rel = logical.slice(DOCS_PREFIX.length);
    const expectedSourceRoot = plan.from === 'shared' && rawSession(rel) && file.source.startsWith(privateRoot(current.checkoutRoot, { dataRoot }))
      ? privateRoot(current.checkoutRoot, { dataRoot }) : current.docsRoot;
    const destinationRoot = plan.privateFiles.includes(file) ? expectedPrivate : expectedDestination;
    const expectedSource = expectedSourceRoot === current.docsRoot ? resolveInside(expectedSourceRoot, rel) : resolveRawSessionPath(sharedRoots(current.checkoutRoot), logical, { dataRoot });
    const expectedTarget = destinationRoot === expectedPrivate ? resolveRawSessionPath(sharedRoots(current.checkoutRoot), logical, { dataRoot }) : resolveInside(destinationRoot, rel);
    if (file.source !== expectedSource || file.destination !== expectedTarget) {
      throw new DocsMoveError('Move file path changed since preview. Preview the move again.');
    }
  }
  for (const file of plan.files) {
    if (sha(readFileSync(file.source)) !== file.sha256) throw new DocsMoveError(`Source changed since preview: ${file.source}. Preview the move again.`);
    if (existsSync(file.destination)) throw new DocsMoveError(`Destination conflict at ${file.destination}. Move or reconcile it, then preview again.`);
  }
  for (const file of plan.privateFiles) {
    if (sha(readFileSync(file.source)) !== file.sha256) throw new DocsMoveError(`Private session changed since preview: ${file.source}. Preview the move again.`);
    if (existsSync(file.destination)) throw new DocsMoveError(`Private session conflict at ${file.destination}. Reconcile it before moving.`);
  }
  if (plan.to === 'local') {
    const roots = registerLocalProject(plan.checkoutRoot, {
      dataRoot, storeId: plan.storeId,
      populate: (docsRoot) => {
        if (docsRoot !== plan.destination) throw new DocsMoveError('Destination changed since preview. Preview the move again.');
        verifySourceSet(plan, { dataRoot });
        copyFiles(plan, docsRoot, io);
        verifySourceSet(plan, { dataRoot });
      },
    });
    return { ...plan, active: roots.docsRoot, retained: plan.source };
  }
  let cleanupPrivate;
  let cleanupShared;
  try {
    cleanupPrivate = copyFiles({ files: plan.privateFiles, destination: plan.privateDestination }, plan.privateDestination, io, false);
    cleanupShared = copyFiles(plan, plan.destination, io);
    switchToSharedProject(plan.checkoutRoot, { dataRoot, verifyShared: () => { verifySourceSet(plan, { dataRoot }); verifyFiles(plan); verifyFiles({ files: plan.privateFiles }); verifyDestinationSet(plan); } });
  } catch (cause) {
    cleanupShared?.();
    cleanupPrivate?.();
    throw cause;
  }
  return { ...plan, active: plan.destination, retained: plan.source };
}
