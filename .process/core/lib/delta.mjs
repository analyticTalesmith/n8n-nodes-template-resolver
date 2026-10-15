import { PathError, toLf, toPosix } from './files.mjs';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CYCLES_DIR, CYCLE_ARCHIVE_DIR, CycleNameError, DOCS_ROOT, LIVING_DIR, PROCESS_CORE, cyclePaths, isCycleName } from './layout.mjs';
import { isCommitId } from './git.mjs';
import { readFrontmatter, readRecovered, setFrontmatterField } from './frontmatter.mjs';
import { isApproved } from './approval.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { writeIndexes } from './index-docs.mjs';
import { evidenceReport, recoveredInScope } from './checks/evidence-cited.mjs';

/**
 * @typedef {{ slug: string, cycle: string, op: string, target: string, summary: string, status: 'open' | 'applied', path: string }} Delta
 */

/** The ways a delta can change a living document. */
export const OPS = Object.freeze(['add', 'modify', 'remove', 'recover']);

const STATUSES = ['open', 'applied'];
const SUMMARY_MAX = 160;
const CLOSE_REVIEW = 'close-review.md';
const OPEN_QUESTIONS = '## Open questions';
const KNOWN_ISSUES = '## Known issues';
// The index command writes this file into a deltas folder that holds deltas; it lists them and is not one.
const FOLDER_INDEX = 'INDEX.md';
/** Whether a folder entry is a delta file. */
const isDeltaFile = (entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== FOLDER_INDEX;
const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'delta.md');
const DOCUMENT_TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'document.md');

export class DeltaError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'DeltaError';
  }
}

const slashes = (path) => toPosix(String(path));

/**
 * A document path as a close review's validates list names it, in the form the checks compare: forward slashes and
 * no leading `./`. The validator and the living state check both read the list through this.
 * @param {unknown} path
 * @returns {string}
 */
export const reviewedPath = (path) => slashes(path).replace(/^(\.\/)+/, '');

/** The frontmatter field naming the cycle whose approved close review validated a document. */
export const VALIDATED_IN = 'validated_in';
const byName = (a, b) => (a.name < b.name ? -1 : 1);
const isFile = (path) => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};
const readText = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
};

function sectionLines(text, heading) {
  const selected = [];
  let current = false;
  let fence = null;
  let comment = false;
  for (let line of toLf(text).split('\n')) {
    if (fence !== null) {
      const close = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (close && close[0] === fence[0] && close.length >= fence.length) fence = null;
      continue;
    }
    if (comment) {
      const end = line.indexOf('-->');
      if (end < 0) continue;
      line = line.slice(end + 3);
      comment = false;
    }
    const start = line.indexOf('<!--');
    if (start >= 0) {
      const end = line.indexOf('-->', start + 4);
      if (end < 0) { line = line.slice(0, start); comment = true; }
      else line = line.slice(0, start) + line.slice(end + 3);
    }
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) { fence = marker; continue; }
    if (line.startsWith('## ')) current = line.trim() === heading;
    else if (current) selected.push(line);
  }
  return selected;
}

function openQuestionNumbers(text) {
  return sectionLines(text, OPEN_QUESTIONS).flatMap((line) => {
    const match = /^- Q([1-9]\d*)\.\s/.exec(line);
    return match ? [`Q${match[1]}`] : [];
  });
}

function acknowledgedQuestions(review, target, questions) {
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const path = new RegExp(`(^|[^A-Za-z0-9_./-])${escaped}(?![A-Za-z0-9_./-])`);
  const lines = sectionLines(review, KNOWN_ISSUES).filter((line) => path.test(line));
  return questions.filter((number) => !lines.some((line) => new RegExp(`(?<![A-Za-z0-9_])${number}(?![A-Za-z0-9_])`).test(line)));
}
const listEntries = (dir, logical) => {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new DeltaError(`Cannot read ${logical}: ${error.message}. Restore access to the documentation store and retry.`);
  }
};
const stateOf = (text) => {
  const state = readFrontmatter(text ?? '')?.state;
  return typeof state === 'string' && state !== '' ? state : 'missing';
};
const recoverProblem = (text, target) => {
  if (stateOf(text) !== 'planned') return `${target} must hold state: planned for op recover, but its state is ${stateOf(text)}.`;
  const { recovered, recoveredAt } = readRecovered(readFrontmatter(text));
  if (!recovered) return `${target} must hold provenance: recovered for op recover.`;
  if (recoveredAt === null || !isCommitId(recoveredAt, { full: true })) return `${target} must hold recovered_at: a full lowercase commit hash for op recover.`;
  return null;
};

/**
 * Why a value cannot be a living document target, or null when its form is acceptable.
 * @param {unknown} target
 * @returns {string | null}
 */
function targetProblem(target) {
  const shown = JSON.stringify(target);
  const rule = `a target is a project-relative path to a .md file inside ${LIVING_DIR}, written with forward slashes and without "..", "." or an absolute form`;
  if (typeof target !== 'string' || target === '') return `target ${shown} is missing: ${rule}.`;
  if (/[\\:\u0000-\u001f]/.test(target)) return `target ${shown} is not usable: ${rule}.`;
  if (target.split('/').some((part) => part === '' || part === '.' || part === '..')) return `target ${shown} is not usable: ${rule}.`;
  if (!target.startsWith(`${LIVING_DIR}/`) || !target.endsWith('.md')) return `target ${shown} is outside ${LIVING_DIR} or not a .md file: ${rule}.`;
  return null;
}

/**
 * Whether the deepest existing part of a target's path, with links followed, still lies inside the living docs folder.
 * @param {ReturnType<typeof resolveProjectRoots>} roots
 * @param {string} target
 * @returns {boolean}
 */
function linkStaysInsideLiving(roots, target) {
  try {
    const livingAbs = resolveProjectPath(roots, LIVING_DIR);
    const living = realpathSync(livingAbs);
    let probe = join(livingAbs, ...target.slice(LIVING_DIR.length + 1).split('/'));
    while (!existsSync(probe)) {
      const parent = dirname(probe);
      if (parent === probe) return false;
      probe = parent;
    }
    const real = relative(living, realpathSync(probe));
    return real.split(sep)[0] !== '..' && !isAbsolute(real);
  } catch {
    return false;
  }
}

/**
 * The absolute path of a target, or the reason it is refused. An existing file must also resolve inside the living docs folder.
 * @param {ReturnType<typeof resolveProjectRoots>} roots
 * @param {unknown} target
 * @returns {{ abs: string } | { problem: string }}
 */
function locate(roots, target) {
  const problem = targetProblem(target);
  if (problem !== null) return { problem };
  let abs;
  try {
    abs = resolveProjectPath(roots, target);
  } catch (err) {
    if (!(err instanceof PathError)) throw err;
    if (linkStaysInsideLiving(roots, target)) {
      return { problem: `target ${JSON.stringify(target)} has a link in its path, so it would not be a plain file at that path. Point it at a real file path inside ${LIVING_DIR} with no link in it.` };
    }
    return { problem: `target ${JSON.stringify(target)} resolves outside ${LIVING_DIR} through a link. Point it at a real file inside ${LIVING_DIR}.` };
  }
  if (existsSync(abs) && statSync(abs).isDirectory()) {
    return { problem: `target ${JSON.stringify(target)} is a directory, not a document. Point it at a .md file inside ${LIVING_DIR}.` };
  }
  try {
    const real = relative(realpathSync(resolveProjectPath(roots, LIVING_DIR)), realpathSync(abs));
    if (real === '' || real.split(sep)[0] === '..' || isAbsolute(real)) {
      return { problem: `target ${JSON.stringify(target)} resolves outside ${LIVING_DIR}. Point it at a real file inside ${LIVING_DIR}.` };
    }
  } catch {
    // The target or the folder does not exist; callers check existence where it matters.
  }
  return { abs };
}

/**
 * Finds a cycle's brief and returns its paths and status.
 * @param {string} projectDir
 * @param {string} cycle
 */
function findCycle(projectDir, cycle) {
  let paths;
  try {
    paths = cyclePaths(cycle);
  } catch (err) {
    if (err instanceof CycleNameError) throw new DeltaError(err.message);
    throw err;
  }
  const roots = resolveProjectRoots(projectDir);
  const brief = resolveProjectPath(roots, paths.brief);
  const text = isFile(brief) ? readText(brief) : null;
  if (text === null) {
    throw new DeltaError(`There is no cycle "${cycle}": ${paths.brief} is missing. Check the cycle name or start the cycle first.`);
  }
  const status = readFrontmatter(text)?.status;
  return { paths, roots, status: typeof status === 'string' ? status : '' };
}

/**
 * Every delta file in active and archived cycles, read tolerantly (a missing or odd field reads as an empty string).
 * `readable` is false for a file with no frontmatter, an unknown op or status, or no target.
 * @param {string} projectDir
 * @returns {{ cycle: string, slug: string, path: string, op: string, target: string, summary: string, status: string, readable: boolean }[]}
 */
export function readDeltaRecords(projectDir) {
  const roots = resolveProjectRoots(projectDir);
  const records = [];
  for (const base of [CYCLES_DIR, CYCLE_ARCHIVE_DIR]) {
    for (const cycleEntry of listEntries(resolveProjectPath(roots, base), base).sort(byName)) {
      if (!cycleEntry.isDirectory()) continue;
      const dir = `${base}/${cycleEntry.name}/deltas`;
      for (const file of listEntries(resolveProjectPath(roots, dir), dir).sort(byName)) {
        if (!isDeltaFile(file)) continue;
        const parsed = readFrontmatter(readText(resolveProjectPath(roots, `${dir}/${file.name}`)) ?? '');
        const data = parsed ?? {};
        const text = (key) => (typeof data[key] === 'string' ? data[key] : '');
        const record = {
          cycle: cycleEntry.name,
          slug: file.name.slice(0, -3),
          path: `${dir}/${file.name}`,
          op: text('op'),
          target: slashes(text('target')),
          summary: text('summary'),
          status: text('status'),
        };
        const readable = parsed !== null && OPS.includes(record.op) && STATUSES.includes(record.status) && record.target !== '';
        records.push({ ...record, readable });
      }
    }
  }
  return records;
}

function summaryProblem(summary) {
  if (typeof summary !== 'string' || summary.trim() === '') return 'A delta needs a summary: one non-empty line saying what changes.';
  if (/[\r\n]/.test(summary)) return 'The summary must be one line.';
  if (summary.trim().length > SUMMARY_MAX) return `The summary is ${summary.trim().length} characters; the limit is ${SUMMARY_MAX}.`;
  return null;
}

/** The delta template with its three fields set through the frontmatter writer, and an optional body after it. */
function renderDelta({ summary, op, target }, body) {
  let text = toLf(readFileSync(TEMPLATE, 'utf8')).replace(/\{\{(summary|op|target)\}\}/g, '');
  for (const [key, value] of [['summary', summary], ['op', op], ['target', target]]) {
    const next = setFrontmatterField(text, key, value);
    if (next === null) throw new Error(`The delta template at ${TEMPLATE} has no frontmatter. Reinstall Aperture's core files.`);
    text = next;
  }
  const back = readFrontmatter(text);
  if (back?.summary !== summary || back?.op !== op || back?.target !== target) {
    throw new DeltaError('The summary cannot be stored safely in frontmatter. Rephrase it in plain words.');
  }
  return typeof body === 'string' && body.trim() !== '' ? `${text.replace(/\n*$/, '\n')}\n${body.trim()}\n` : text;
}

/** The generic document template as a planned stub for a new target: titled from the file name, summary taken from the delta. */
function renderStub(target, summary) {
  const name = target.split('/').pop().replace(/\.md$/, '').replace(/-+/g, ' ');
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  const template = toLf(readFileSync(DOCUMENT_TEMPLATE, 'utf8')).replace(/\{\{title\}\}/g, title);
  return setFrontmatterField(template, 'summary', summary) ?? template;
}

/**
 * Checks every rule for one delta and returns what would be written, without writing anything.
 * `batch` holds the plans already made for earlier entries of the same call.
 */
function planDelta(projectDir, cycle, { slug, op, target, summary, body, createStub = true }, batch = []) {
  const { paths, roots, status } = findCycle(projectDir, cycle);
  if (status !== 'open') throw new DeltaError(`Cycle "${cycle}" is ${status === '' ? 'not open' : status}; record deltas only in an open cycle.`);
  if (!isCycleName(slug)) {
    throw new DeltaError(`Delta slug ${JSON.stringify(slug)} is not usable: a slug is kebab-case (lowercase letters, digits and single hyphens), 1 to 48 characters.`);
  }
  if (slug === 'index') throw new DeltaError('Delta slug "index" is reserved for the generated INDEX.md file. Choose another slug.');
  if (!OPS.includes(op)) throw new DeltaError(`Delta operation ${JSON.stringify(op)} is not known: use one of ${OPS.join(', ')}.`);
  const badSummary = summaryProblem(summary);
  if (badSummary !== null) throw new DeltaError(badSummary);
  const located = locate(roots, target);
  if ('problem' in located) throw new DeltaError(located.problem);
  const cleanSummary = summary.trim();
  let stub = null;
  if (!isFile(located.abs)) {
    if (op === 'add' && createStub) {
      stub = { abs: located.abs, text: renderStub(target, cleanSummary) };
    } else {
      throw new DeltaError(
        op === 'add'
          ? `${target} does not exist. Create the planned document first (copy core/templates/document.md, keep state: planned), then record the add delta.`
          : op === 'recover'
            ? `${target} does not exist. Create the recovered document first (copy core/templates/recovered.md, keep state: planned), then record the recover delta.`
            : `${target} does not exist, so it cannot be ${op === 'modify' ? 'modified' : 'removed'}. Check the path, or use op add for a new document.`,
      );
    }
  } else {
    const targetText = readText(located.abs);
    if (op === 'add' && readRecovered(readFrontmatter(targetText)).recovered) {
      throw new DeltaError(`${target} has provenance: recovered; use op recover instead of op add.`);
    }
    if (op === 'add' && stateOf(targetText) !== 'planned') {
      throw new DeltaError(`${target} must hold state: planned to be added, but its state is ${stateOf(targetText)}. Create the document as planned, or use op modify.`);
    }
    if (op === 'recover') {
      const problem = recoverProblem(targetText, target);
      if (problem !== null) throw new DeltaError(problem);
    }
  }
  const records = readDeltaRecords(projectDir);
  // A damaged file may be an open delta for this document, so it blocks unless it plainly names another one.
  const damaged = records.find((record) => !record.readable && record.status !== 'applied' && (record.target === '' || record.target === target));
  if (damaged !== undefined) {
    throw new DeltaError(`Delta file ${damaged.path} cannot be read as a delta (it needs frontmatter with op, target and status), so it may already be an open delta for ${target}. Fix or remove that file, then record the delta again.`);
  }
  const clash = records.find((record) => record.readable && record.status === 'open' && record.target === target);
  if (clash !== undefined) {
    throw new DeltaError(`${target} already has an open delta in ${clash.path}. Apply or remove that delta before recording another for the same document.`);
  }
  if (batch.some((earlier) => earlier.delta.target === target)) {
    throw new DeltaError(`${target} is named twice in one call. Record one delta per document.`);
  }
  const file = `${paths.deltas}/${slug}.md`;
  if (batch.some((earlier) => earlier.delta.slug === slug) || existsSync(resolveProjectPath(roots, file))) {
    throw new DeltaError(`A delta named "${slug}" already exists in cycle "${cycle}" (${file}). Choose another slug.`);
  }
  return {
    roots,
    deltasDir: paths.deltas,
    file,
    text: renderDelta({ summary: cleanSummary, op, target }, body),
    stub,
    delta: { slug, cycle, op, target, summary: cleanSummary, status: 'open', path: file },
  };
}

/** Writes planned deltas and stubs; if a write fails, removes what this call wrote before rethrowing. */
function writePlans(plans) {
  const written = [];
  try {
    for (const plan of plans) {
      if (plan.stub !== null) {
        mkdirSync(dirname(plan.stub.abs), { recursive: true });
        writeFileSync(plan.stub.abs, plan.stub.text, { flag: 'wx' });
        written.push(plan.stub.abs);
      }
      mkdirSync(resolveProjectPath(plan.roots, plan.deltasDir), { recursive: true });
      const abs = resolveProjectPath(plan.roots, plan.file);
      writeFileSync(abs, plan.text, { flag: 'wx' });
      written.push(abs);
    }
  } catch (err) {
    for (const abs of written) rmSync(abs, { force: true });
    throw err;
  }
}

/**
 * Records a proposed change to one living document in an open cycle. Writes nothing when any rule fails.
 * For op add on a missing target it also writes a planned stub from the generic document template, unless createStub is false.
 * @param {string} projectDir
 * @param {string} cycle
 * @param {{ slug: string, op: string, target: string, summary: string, body?: string, createStub?: boolean }} input
 * @returns {Delta}
 * @throws {DeltaError}
 */
export function addDelta(projectDir, cycle, input) {
  const plan = planDelta(projectDir, cycle, input);
  writePlans([plan]);
  return plan.delta;
}

/**
 * Records several deltas in one open cycle, all or none: every entry is checked before anything is written.
 * @param {string} projectDir
 * @param {string} cycle
 * @param {{ slug: string, op: string, target: string, summary: string, body?: string, createStub?: boolean }[]} entries
 * @returns {Delta[]}
 * @throws {DeltaError}
 */
export function addDeltas(projectDir, cycle, entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new DeltaError('Give at least one delta to record.');
  const plans = [];
  for (const entry of entries) plans.push(planDelta(projectDir, cycle, entry, plans));
  writePlans(plans);
  return plans.map((plan) => plan.delta);
}

/**
 * Lists a cycle's deltas, sorted by slug.
 * @param {string} projectDir
 * @param {string} cycle
 * @returns {Delta[]}
 * @throws {DeltaError} for a missing cycle or a delta file that cannot be read as a delta
 */
export function listDeltas(projectDir, cycle) {
  const { paths, roots } = findCycle(projectDir, cycle);
  /** @type {Delta[]} */
  const deltas = [];
  for (const entry of listEntries(resolveProjectPath(roots, paths.deltas), paths.deltas)) {
    if (!isDeltaFile(entry)) continue;
    const path = `${paths.deltas}/${entry.name}`;
    const data = readFrontmatter(readText(resolveProjectPath(roots, path)) ?? '');
    const field = (key) => (typeof data?.[key] === 'string' ? data[key] : '');
    const problems = [];
    if (data === null) problems.push('it has no frontmatter');
    if (!OPS.includes(field('op'))) problems.push(`op must be one of ${OPS.join(', ')}`);
    if (!STATUSES.includes(field('status'))) problems.push(`status must be one of ${STATUSES.join(', ')}`);
    if (field('target') === '') problems.push('target is missing');
    if (problems.length > 0) throw new DeltaError(`Delta file ${path} cannot be read: ${problems.join('; ')}. Fix the file, or recreate the delta.`);
    deltas.push({
      slug: entry.name.slice(0, -3),
      cycle,
      op: field('op'),
      target: field('target'),
      summary: field('summary'),
      status: /** @type {'open' | 'applied'} */ (field('status')),
      path,
    });
  }
  return deltas.sort((a, b) => (a.slug < b.slug ? -1 : 1));
}

const FILES = Object.freeze({
  read: (abs) => readFileSync(abs, 'utf8'),
  write: (abs, text) => writeFileSync(abs, text),
  remove: (abs) => rmSync(abs),
});

/**
 * Writes every change, or none: when a write fails, every file already written and the one that failed part way are
 * put back. Always a DeltaError then, naming the failed file and any file that could not be put back.
 * @param {string} projectDir the checkout path; error paths retain the logical docs root form
 * @param {{ abs: string, prev: string, next: string | null }[]} changes next null deletes the file
 * @param {{ read: (abs: string) => string, write: (abs: string, text: string) => void, remove: (abs: string) => void }} [io]
 *   the file operations; a test passes its own to make one fail
 * @throws {DeltaError}
 */
export function commitChanges(projectDir, changes, io = FILES) {
  const roots = resolveProjectRoots(projectDir);
  const shown = (abs) => {
    const underDocs = relative(roots.docsRoot, abs);
    if (underDocs === '' || (underDocs !== '..' && !underDocs.startsWith(`..${sep}`) && !isAbsolute(underDocs))) {
      return slashes(join(DOCS_ROOT, underDocs));
    }
    return slashes(relative(roots.checkoutRoot, abs));
  };
  const done = [];
  let failure = null;
  for (const change of changes) {
    try {
      if (change.next === null) io.remove(change.abs);
      else io.write(change.abs, change.next);
      done.push(change);
    } catch (err) {
      failure = { change, err };
      break;
    }
  }
  if (failure === null) return;
  const untouched = (change) => {
    try {
      return io.read(change.abs) === change.prev;
    } catch {
      return false;
    }
  };
  const left = [];
  for (const change of [failure.change, ...done.reverse()]) {
    if (change === failure.change && untouched(change)) continue;
    try {
      io.write(change.abs, change.prev);
    } catch {
      left.push(shown(change.abs));
    }
  }
  const what = `Could not write ${shown(failure.change.abs)} (${failure.err.message}).`;
  throw new DeltaError(
    left.length === 0
      ? `${what} Every file was put back as it was, so nothing changed. Fix the cause and run the command again.`
      : `${what} These files could not be put back and are left changed: ${left.join(', ')}. Restore them from ${roots.mode === 'local' ? 'a backup' : 'version control'} before running the command again.`,
  );
}

/**
 * The new text of a document with its fields set in order, or the reason it cannot be.
 * @param {string} text
 * @param {[string, string][]} fields
 */
function withFields(text, fields) {
  let next = text;
  try {
    for (const [key, value] of fields) {
      next = setFrontmatterField(next, key, value);
      if (next === null) return { problem: 'it has no frontmatter block' };
    }
    return { next };
  } catch (err) {
    return { problem: err.message };
  }
}

/** Splits text at the end of its frontmatter block: the block with its closing fence, and what follows. */
function splitFrontmatter(text) {
  const match = /^(﻿?---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*)(?:\r?\n|$)/.exec(text);
  return match === null ? { head: '', rest: text } : { head: match[1], rest: text.slice(match[0].length) };
}

/** What the author wrote in a delta file after its frontmatter, apart from the template's own guidance; '' when nothing. */
function deltaBody(text) {
  const rest = toLf(splitFrontmatter(text).rest).trim();
  const guidance = toLf(splitFrontmatter(toLf(readFileSync(TEMPLATE, 'utf8'))).rest).trim();
  return (rest.startsWith(guidance) ? rest.slice(guidance.length) : rest).trim();
}

/**
 * Applies one open delta, or all ordinary open deltas when no recovery is open: all checks first, then all writes.
 * @param {string} projectDir
 * @param {string} cycle
 * @param {string} [slug]
 * @returns {{ applied: string[] }}
 * @throws {DeltaError} naming every failed check; nothing is changed then
 */
export function applyDeltas(projectDir, cycle, slug) {
  const { roots } = findCycle(projectDir, cycle);
  const all = listDeltas(projectDir, cycle);
  let chosen = all.filter((delta) => delta.status === 'open');
  if (slug !== undefined) {
    const found = all.find((delta) => delta.slug === slug);
    if (found === undefined) throw new DeltaError(`Cycle "${cycle}" has no delta "${slug}". List the deltas to see the slugs.`);
    if (found.status !== 'open') throw new DeltaError(`Delta "${slug}" is already applied; there is nothing to apply.`);
    chosen = [found];
  } else {
    const recover = chosen.filter((delta) => delta.op === 'recover');
    if (recover.length > 0) {
      throw new DeltaError(`Open recover deltas must be applied one at a time by slug after their archaeology cards are done: ${recover.map((delta) => delta.slug).join(', ')}. No deltas were applied.`);
    }
  }
  /** @type {string[]} */
  const problems = [];
  /** @type {{ abs: string, prev: string, next: string | null }[]} */
  const changes = [];
  /** @type {Map<string, string>} target to the slug of the first delta naming it */
  const seen = new Map();
  for (const delta of chosen) {
    const fail = (reason) => problems.push(`Delta "${delta.slug}" (${delta.op} ${delta.target}): ${reason}`);
    if (seen.has(delta.target)) {
      fail(`another delta in this batch, "${seen.get(delta.target)}", names the same document. Apply them one at a time.`);
      continue;
    }
    seen.set(delta.target, delta.slug);
    const located = locate(roots, delta.target);
    if ('problem' in located) {
      fail(located.problem);
      continue;
    }
    const prev = isFile(located.abs) ? readText(located.abs) : null;
    if (prev === null) {
      fail(`${delta.target} does not exist, so the change cannot be applied. Restore the document or drop the delta.`);
      continue;
    }
    if (delta.op === 'remove') {
      changes.push({ abs: located.abs, prev, next: null });
      continue;
    }
    if (delta.op === 'add' && readRecovered(readFrontmatter(prev)).recovered) {
      fail(`${delta.target} has provenance: recovered; use op recover instead of op add.`);
      continue;
    }
    if (delta.op === 'add' && stateOf(prev) !== 'planned') {
      fail(`${delta.target} must hold state: planned to be added, but its state is ${stateOf(prev)}.`);
      continue;
    }
    if (delta.op === 'recover') {
      const problem = recoverProblem(prev, delta.target);
      if (problem !== null) {
        fail(problem);
        continue;
      }
    }
    // A validation belongs to the content it approved, so a document set back to built keeps none.
    const clear = readFrontmatter(prev)?.[VALIDATED_IN] !== undefined ? [[VALIDATED_IN, '']] : [];
    const result = withFields(prev, [['state', 'built'], ...clear]);
    if ('problem' in result) {
      fail(`${delta.target} cannot be marked built: ${result.problem}.`);
      continue;
    }
    let next = result.next;
    const body = delta.op === 'add' ? deltaBody(readText(resolveProjectPath(roots, delta.path)) ?? '') : '';
    if (body !== '') {
      const eol = next.includes('\r\n') ? '\r\n' : '\n';
      next = `${splitFrontmatter(next).head}${eol}${eol}${body.replace(/\n/g, eol)}${eol}`;
    }
    changes.push({ abs: located.abs, prev, next });
  }
  if (problems.length === 0) {
    for (const delta of chosen) {
      const abs = resolveProjectPath(roots, delta.path);
      const prev = readText(abs) ?? '';
      const next = setFrontmatterField(prev, 'status', 'applied');
      if (next === null) problems.push(`Delta file ${delta.path} has no frontmatter block.`);
      else changes.push({ abs, prev, next });
    }
  }
  if (problems.length > 0) throw new DeltaError(`Nothing was applied. ${problems.join(' ')}`);
  commitChanges(projectDir, changes);
  writeIndexes(projectDir);
  return { applied: chosen.map((delta) => delta.slug) };
}

/**
 * Sets the documents named by an approved close review to validated and records the cycle in their `validated_in`
 * field. Needs `approved_by` in the review and every named document at state built; checks all before writing any.
 * @param {string} projectDir
 * @param {string} cycle
 * @param {{ run?: import('./git.mjs').GitRunner }} [options]
 * @returns {{ validated: string[] }}
 * @throws {DeltaError}
 */
export function validateCycleDocs(projectDir, cycle, options = {}) {
  const { paths, roots } = findCycle(projectDir, cycle);
  const reviewPath = `${paths.verification}/${CLOSE_REVIEW}`;
  const reviewAbs = resolveProjectPath(roots, reviewPath);
  const text = isFile(reviewAbs) ? readText(reviewAbs) : null;
  if (text === null) throw new DeltaError(`${reviewPath} is missing. Write the close review (copy core/templates/close-review.md) and have a person approve it.`);
  const data = readFrontmatter(text);
  if (data === null) throw new DeltaError(`${reviewPath} has no frontmatter block, so approved_by and validates cannot be read.`);
  if (!isApproved(data.approved_by)) {
    throw new DeltaError(`${reviewPath} names no approver in its approved_by field (it is empty or a placeholder such as false or tbd). Only a person fills it, after reading the review.`);
  }
  if (!Array.isArray(data.validates)) {
    throw new DeltaError(`${reviewPath} needs a validates list of project-relative document paths (validates: [] if none).`);
  }
  const named = [...new Set(data.validates.map(reviewedPath))];
  /** @type {string[]} */
  const problems = [];
  let records;
  let evidenceScope;
  /** @type {{ abs: string, prev: string, next: string | null }[]} */
  const changes = [];
  for (const target of named) {
    const located = locate(roots, target);
    if ('problem' in located) {
      problems.push(located.problem);
      continue;
    }
    const prev = isFile(located.abs) ? readText(located.abs) : null;
    if (prev === null) {
      problems.push(`${target} does not exist.`);
      continue;
    }
    if (stateOf(prev) !== 'built') {
      problems.push(`${target} is at state ${stateOf(prev)}, not built.`);
      continue;
    }
    if (readRecovered(readFrontmatter(prev)).recovered) {
      try {
        records ??= readDeltaRecords(projectDir);
        evidenceScope ??= new Set(recoveredInScope({ projectDir, records }));
        if (evidenceScope.has(target)) {
          const report = evidenceReport({ projectDir, records, only: target, run: options.run });
          for (const item of report.findings) problems.push(`${target} ${item.rule}: ${item.message}`);
        }
      } catch (cause) {
        problems.push(`${target} evidence could not be checked: ${cause.message}.`);
      }
      for (const question of acknowledgedQuestions(text, target, openQuestionNumbers(prev))) {
        problems.push(`${target} has open question ${question} absent from ${reviewPath} ${KNOWN_ISSUES}.`);
      }
    }
    const result = withFields(prev, [['state', 'validated'], [VALIDATED_IN, cycle]]);
    if ('problem' in result) problems.push(`${target} cannot be marked validated: ${result.problem}.`);
    else changes.push({ abs: located.abs, prev, next: result.next });
  }
  if (problems.length > 0) {
    throw new DeltaError(`Nothing was validated. ${reviewPath} names documents that are not ready: ${problems.join(' ')} Apply outstanding deltas, correct recovered evidence or acknowledge open questions, or correct the validates list.`);
  }
  commitChanges(projectDir, changes);
  return { validated: named };
}

/**
 * How many readable deltas of a cycle are still open.
 * @param {string} projectDir
 * @param {string} cycle
 * @returns {number}
 */
export function openDeltaCount(projectDir, cycle) {
  return readDeltaRecords(projectDir).filter((r) => r.cycle === cycle && r.readable && r.status === 'open').length;
}

/**
 * The one-line reminder to apply a cycle's open deltas.
 * @param {string} cycle
 * @param {number} open
 * @returns {string}
 */
export function applyReminder(cycle, open) {
  return `Cycle ${cycle} has ${open} open delta${open === 1 ? '' : 's'}: run node ${PROCESS_CORE}/scripts/delta.mjs apply ${cycle} after the work merges.`;
}
