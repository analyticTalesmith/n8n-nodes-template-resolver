import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, slugify } from './board.mjs';
import { checkSecrets } from './checks/secrets.mjs';
import { readCycle } from './cycle.mjs';
import { FrontmatterError, readFrontmatter, setFrontmatterField } from './frontmatter.mjs';
import { BACKLOG_DIR, CYCLES_DIR, FEEDBACK_DIR, INBOX_DIR, PROPOSALS_DIR, SESSIONS_DIR, cyclePaths, isCycleName } from './layout.mjs';
import { resolveProjectPath, resolveProjectRoots, resolveRawSessionPath } from './project-roots.mjs';
import { isPlainObject } from './types.mjs';
import { toLf } from './files.mjs';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'feedback.md');
const SUMMARY_MAX = 160;
const DIGEST_SUFFIX = '.digest.json';
const DIGEST_KEYS = ['items', 'questions'];
const ITEM_KEYS = ['summary', 'stream', 'level', 'source', 'quote', 'body', 'affects', 'severity', 'priority'];
const QUESTIONS_MAX = 5;
const TRIAGE_NAME = /^triage-\d{4}-\d{2}-\d{2}(-\d+)?\.md$/;
const ITERATE_NAME = /^iterate-\d{4}-\d{2}-\d{2}(-\d+)?\.md$/;
const ROWS_HEADING = '## Rows';
const ROWS_HEADER = '| Item | Route | Target | Reason |';
const ROUTE_STATUS = { replan: 'replanned', ticket: 'ticketed', inbox: 'triaged', proposal: 'proposed', drop: 'dropped' };
/** Where the target of a route must lie; inbox takes no target and drop may name any existing path. */
const ROUTE_FOLDER = { replan: CYCLES_DIR, ticket: BACKLOG_DIR, proposal: PROPOSALS_DIR };

export const STATUSES = Object.freeze(['new', 'triaged', 'replanned', 'ticketed', 'proposed', 'dropped']);
export const ROUTES = Object.freeze(Object.keys(ROUTE_STATUS));
export { SESSIONS_DIR };
export const BATCH_MAX = 200;

/** Physical folders for a raw session and its durable digest. Does not create either folder. */
export function sessionFolders(projectDir, { cycle } = {}) {
  const folder = cycle === undefined ? SESSIONS_DIR : `${cycleFeedback(projectDir, cycle, { mustBeOpen: false })}/sessions`;
  const roots = resolveProjectRoots(projectDir);
  return {
    session: dirname(resolveRawSessionPath(roots, `${folder}/example.md`)),
    digest: dirname(resolveProjectPath(roots, `${folder}/example.digest.json`)),
  };
}

const docsBase = (projectDir) => dirname(resolveProjectRoots(projectDir).docsRoot);

export const STREAMS = Object.freeze([
  'unit-test',
  'integration-test',
  'system-test',
  'acceptance-test',
  'end-to-end-test',
  'ai-qa',
  'developer',
  'qa-team',
  'external-user',
]);
export const LEVELS = Object.freeze(['strategic', 'prioritization', 'defect']);
/** Impact if left untreated; set by the reporter or QA. Optional: an item without one stays valid. */
export const SEVERITIES = Object.freeze(['critical', 'major', 'minor', 'trivial']);
/** When to act; set by the owner. A separate field from severity, also optional. */
export const PRIORITIES = Object.freeze(['now', 'next', 'later', 'never']);

export class FeedbackError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'FeedbackError';
  }
}

const oneLine = (value) => typeof value === 'string' && value.trim() !== '' && !/[\r\n]/.test(value);

/** Checks every field, throwing on the first problem. */
function validate({ summary, stream, level, source, severity, priority }) {
  if (!oneLine(summary) || summary.length > SUMMARY_MAX) {
    throw new FeedbackError(`The summary must be one non-empty line of at most ${SUMMARY_MAX} characters. Shorten or reword it.`);
  }
  if (!STREAMS.includes(stream)) throw new FeedbackError(`Unknown stream "${stream}". Use one of: ${STREAMS.join(', ')}.`);
  if (!LEVELS.includes(level)) throw new FeedbackError(`Unknown level "${level}". Use one of: ${LEVELS.join(', ')}.`);
  if (!oneLine(source)) {
    throw new FeedbackError('The source must be one non-empty line: the person, tool or run the feedback came from.');
  }
  if (severity !== undefined && !SEVERITIES.includes(severity)) {
    throw new FeedbackError(`Unknown severity ${JSON.stringify(severity)}. Use one of: ${SEVERITIES.join(', ')}, or leave it out.`);
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    throw new FeedbackError(`Unknown priority ${JSON.stringify(priority)}. Use one of: ${PRIORITIES.join(', ')}, or leave it out.`);
  }
}

/** The file name slug for a summary; `at` prefixes the message ("Item 3: ") when one item of several is named. */
function slugOf(summary, at) {
  try {
    return slugify(summary);
  } catch (cause) {
    if (!(cause instanceof BoardError)) throw cause;
    throw new FeedbackError(`${at}The summary needs at least one letter or digit to name the file. Reword it.`);
  }
}

/**
 * Puts text right under a section heading of the form, above its guidance comment. Sections are filled last to
 * first, so the heading found is always the form's own and never one inside text already filled in below it.
 */
const fill = (text, heading, content) => text.replace(`## ${heading}\n\n`, () => `## ${heading}\n\n${content}\n\n`);
const lf = (value) => toLf(value).trimEnd();

/** The feedback form filled in, with status new. Fields must already be valid. */
function render({ summary, stream, level, source, body, session, quote, affects, severity, priority }) {
  // Sections first, while nothing above them but the bare form; the title and frontmatter cannot then match a heading.
  let text = toLf(readFileSync(TEMPLATE, 'utf8'));
  if (affects !== undefined && affects.length > 0) text = fill(text, 'Affected documents', affects.map((path) => `- ${path}`).join('\n'));
  if (quote !== undefined) text = fill(text, 'Evidence', lf(quote).split('\n').map((line) => (line === '' ? '>' : `> ${line}`)).join('\n'));
  if (body !== undefined && body.trim() !== '') text = fill(text, 'What was seen', lf(body));
  text = text.replace('{{title}}', () => summary);
  for (const [key, value] of [['summary', summary], ['stream', stream], ['level', level], ['source', source], ['status', 'new']]) {
    text = setFrontmatterField(text, key, value);
  }
  if (session !== undefined) text = setFrontmatterField(text, 'session', session);
  if (severity !== undefined) text = setFrontmatterField(text, 'severity', severity);
  if (priority !== undefined) text = setFrontmatterField(text, 'priority', priority);
  return text;
}

/**
 * A user-supplied project-relative path, checked before any path is built from it.
 * @param {unknown} value
 * @param {string} what names the value in the message
 * @returns {string}
 */
function safePath(value, what) {
  const ok =
    typeof value === 'string' &&
    value !== '' &&
    // A colon would name a drive or an NTFS alternate data stream.
    !/[\\":\r\n]/.test(value) &&
    !isAbsolute(value) &&
    value.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
  if (!ok) {
    throw new FeedbackError(
      `${what} ${JSON.stringify(value)} must be a project-relative path: forward slashes, no "..", "." or empty part, no colon, double quote or line break.`,
    );
  }
  return value;
}

/**
 * Runs undo steps after a failed write and rethrows the original error. A step that fails too is named in the
 * error's message, so the paths left to fix by hand are not lost.
 * @param {unknown} cause
 * @param {Array<{ path: string, step: () => void }>} steps
 * @returns {never}
 */
function undoAndRethrow(cause, steps) {
  const stuck = [];
  for (const { path, step } of steps) {
    try {
      step();
    } catch {
      stuck.push(path);
    }
  }
  if (stuck.length > 0 && cause instanceof Error) {
    cause.message += ` Undoing the write also failed for ${stuck.join(', ')}; check and fix them by hand.`;
  }
  throw cause;
}

const splitPath = (path) => {
  const cut = path.lastIndexOf('/');
  return { folder: cut === -1 ? '' : path.slice(0, cut), name: path.slice(cut + 1) };
};
const isFile = (file) => existsSync(file) && statSync(file).isFile();
const isItemName = (name) => name.endsWith('.md') && !/^index\.md$/i.test(name) && !TRIAGE_NAME.test(name) && !ITERATE_NAME.test(name);

/** The cycle name when `folder` is `<cycles>/<name><rest>`, else null. */
function cycleIn(folder, rest) {
  const prefix = `${CYCLES_DIR}/`;
  if (!folder.startsWith(prefix) || !folder.endsWith(rest)) return null;
  const name = folder.slice(prefix.length, folder.length - rest.length);
  return isCycleName(name) ? name : null;
}

const refuseUnknownKeys = (value, known, what) => {
  const extra = Object.keys(value).find((key) => !known.includes(key));
  if (extra !== undefined) throw new FeedbackError(`${what} has unknown key ${JSON.stringify(extra)}. Use only: ${known.join(', ')}.`);
};

/** The project-relative folder of a cycle's feedback, after checking the cycle exists (and is open when asked). */
function cycleFeedback(projectDir, cycle, { mustBeOpen }) {
  const { status } = readCycle(projectDir, cycle);
  if (mustBeOpen && status !== 'open') {
    throw new FeedbackError(`Cycle ${cycle} is ${status}, so it cannot take feedback. Use an open cycle.`);
  }
  return cyclePaths(cycle).feedback;
}

/**
 * Writes a feedback file with status new into the inbox, or into a cycle's feedback folder.
 * @param {string} projectDir
 * @param {{ summary: string, stream: string, level: string, source: string, cycle?: string, body?: string, severity?: string, priority?: string }} fields
 * @returns {{ path: string }} project-relative, with forward slashes
 * @throws {FeedbackError} on an invalid field
 * @throws {import('./cycle.mjs').CycleError} on an unknown cycle
 */
export function addFeedback(projectDir, { summary, stream, level, source, cycle, body, severity, priority }) {
  validate({ summary, stream, level, source, severity, priority });
  if (body !== undefined && typeof body !== 'string') throw new FeedbackError('The body must be text.');
  const folder = cycle === undefined ? INBOX_DIR : cycleFeedback(projectDir, cycle, { mustBeOpen: false });
  const slug = slugOf(summary, '');
  const text = render({ summary, stream, level, source, body, severity, priority });
  const root = docsBase(projectDir);
  mkdirSync(join(root, folder), { recursive: true });
  let name = slug;
  for (let n = 2; existsSync(join(root, folder, `${name}.md`)); n += 1) name = `${slug}-${n}`;
  const path = `${folder}/${name}.md`;
  writeFileSync(join(root, path), text, { flag: 'wx' });
  return { path };
}

/**
 * The feedback files of the inbox, or of a cycle's feedback folder, ordered by file name. Triage and iterate files
 * in the same folder are not feedback and are skipped.
 * @param {string} projectDir
 * @param {{ cycle?: string }} [options]
 * @returns {Array<{ path: string, summary: string, stream: string, level: string, status: string, severity?: string, priority?: string }>} severity and priority only when the item has them
 */
export function listFeedback(projectDir, { cycle } = {}) {
  const folder = cycle === undefined ? INBOX_DIR : cycleFeedback(projectDir, cycle, { mustBeOpen: false });
  const dir = join(docsBase(projectDir), folder);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && isItemName(e.name))
    .map((e) => e.name)
    .sort()
    .map((name) => {
      const data = readFrontmatter(readFileSync(join(dir, name), 'utf8')) ?? {};
      const text = (key) => (typeof data[key] === 'string' ? data[key] : '');
      const rated = {};
      if (text('severity') !== '') rated.severity = text('severity');
      if (text('priority') !== '') rated.priority = text('priority');
      return { path: `${folder}/${name}`, summary: text('summary'), stream: text('stream'), level: text('level'), status: text('status'), ...rated };
    });
}

/**
 * Moves an inbox file into an open cycle's feedback folder.
 * @param {string} projectDir
 * @param {string} file a file name in the inbox, or a project-relative path to a file directly inside it
 * @param {string} cycle
 * @returns {{ path: string }} project-relative, with forward slashes
 * @throws {FeedbackError} when the file is not an inbox file, the cycle is closed, or the name is taken there
 */
export function takeFeedback(projectDir, file, cycle) {
  if (typeof file !== 'string' || file === '') throw new FeedbackError('Name the inbox file to take.');
  const folder = cycleFeedback(projectDir, cycle, { mustBeOpen: true });
  const root = docsBase(projectDir);
  const inbox = resolve(root, INBOX_DIR);
  const source = resolve(/[\\/]/.test(file) ? root : inbox, file);
  const inside = relative(inbox, source);
  if (inside === '' || inside.split(sep)[0] === '..' || isAbsolute(inside) || /[\\/]/.test(inside)) {
    throw new FeedbackError(`"${file}" is not a file directly inside ${INBOX_DIR}. Give a file name from the inbox listing.`);
  }
  if (!existsSync(source) || !lstatSync(source).isFile()) {
    throw new FeedbackError(`"${file}" is not in ${INBOX_DIR}. Check the inbox listing.`);
  }
  if (!isItemName(inside)) throw new FeedbackError(`"${file}" is not a feedback file in ${INBOX_DIR}. Choose a .md item from the inbox listing.`);
  const target = join(root, folder, inside);
  if (existsSync(target)) {
    throw new FeedbackError(`Cycle ${cycle} already has ${folder}/${inside}. Rename the inbox file first.`);
  }
  mkdirSync(join(root, folder), { recursive: true });
  renameSync(source, target);
  return { path: `${folder}/${inside}` };
}

/** Reads a project file, turning a read failure into a FeedbackError that names it. */
function readProjectFile(root, path, what) {
  try {
    return readFileSync(join(root, path), 'utf8');
  } catch (cause) {
    throw new FeedbackError(`Cannot read ${what} ${path} (${cause.message}). Check the path.`);
  }
}

/** Refuses when any line of the given files looks like a secret; the message names path and line, never the match. */
function refuseSecrets(files, consequence) {
  const addedLines = files.flatMap(({ path, text }) => text.split(/\r?\n/).map((line, i) => ({ path, line: i + 1, text: line })));
  const [hit] = checkSecrets({ addedLines });
  if (hit) throw new FeedbackError(`${hit.message} ${consequence}`);
}

/** One digest entry checked against the feedback rules; `n` is its 1-based position. */
function checkEntry(entry, n) {
  const at = `Item ${n}: `;
  if (!isPlainObject(entry)) throw new FeedbackError(`${at}each item must be a JSON object.`);
  refuseUnknownKeys(entry, ITEM_KEYS, `Item ${n}`);
  try {
    validate(entry);
  } catch (cause) {
    if (!(cause instanceof FeedbackError)) throw cause;
    throw new FeedbackError(`${at}${cause.message}`);
  }
  const { quote, body, affects } = entry;
  if (typeof quote !== 'string' || quote.trim() === '') {
    throw new FeedbackError(`${at}the quote must be the exact words the item came from; nothing without a quote becomes an item.`);
  }
  if (body !== undefined && typeof body !== 'string') throw new FeedbackError(`${at}the body must be text.`);
  if (affects !== undefined) {
    if (!Array.isArray(affects)) throw new FeedbackError(`${at}affects must be a list of project-relative document paths.`);
    for (const path of affects) safePath(path, `${at}affects entry`);
  }
  return entry;
}

/**
 * Writes every item of a capture digest, or none. The digest sits directly in SESSIONS_DIR (items go to the inbox)
 * or in an existing cycle's feedback/sessions/ (items go to that cycle's feedback/). The matching raw session
 * uses the same logical path but stays in the machine-local store in shared mode.
 * @param {string} projectDir
 * @param {string} digest project-relative path of <name>.digest.json
 * @returns {{ paths: string[], questions: string[] }} paths project-relative, in digest order
 * @throws {FeedbackError} on a bad path, a missing session, a secret, bad JSON or any invalid item; nothing is written
 * @throws {import('./cycle.mjs').CycleError} when the digest's cycle does not exist
 */
export function addBatch(projectDir, digest) {
  const path = safePath(digest, 'The digest');
  const { folder, name } = splitPath(path);
  if (!name.endsWith(DIGEST_SUFFIX) || name.length === DIGEST_SUFFIX.length) {
    throw new FeedbackError(`The digest ${path} must be named <session>${DIGEST_SUFFIX}, beside its session <session>.md.`);
  }
  const cycle = cycleIn(folder, '/feedback/sessions');
  if (folder !== SESSIONS_DIR && cycle === null) {
    throw new FeedbackError(`The digest ${path} must sit directly in ${SESSIONS_DIR}/ or in a cycle's feedback/sessions/ folder.`);
  }
  const target = cycle === null ? INBOX_DIR : cycleFeedback(projectDir, cycle, { mustBeOpen: false });
  const root = docsBase(projectDir);
  const session = `${folder}/${name.slice(0, -DIGEST_SUFFIX.length)}.md`;
  const digestText = readProjectFile(root, path, 'the digest');
  const sessionFile = resolveRawSessionPath(resolveProjectRoots(projectDir), session);
  if (!isFile(sessionFile)) {
    throw new FeedbackError(`The digest ${path} has no private session at ${session}. Save the capture session to the local store first.`);
  }
  let sessionText;
  try {
    sessionText = readFileSync(sessionFile, 'utf8');
  } catch (cause) {
    throw new FeedbackError(`Cannot read the private session ${session} (${cause.message}). Repair local-store access.`);
  }
  refuseSecrets(
    [
      { path: session, text: sessionText },
      { path, text: digestText },
    ],
    'Nothing was added.',
  );

  let data;
  try {
    data = JSON.parse(digestText.replace(/^﻿/, ''));
  } catch (cause) {
    throw new FeedbackError(`The digest ${path} is not valid JSON (${cause.message}). Write it again from the session.`);
  }
  if (!isPlainObject(data)) throw new FeedbackError(`The digest ${path} must hold a JSON object with an items list.`);
  refuseUnknownKeys(data, DIGEST_KEYS, `The digest ${path}`);
  if (!Array.isArray(data.items)) throw new FeedbackError(`The digest ${path} needs an items list.`);
  if (data.items.length > BATCH_MAX) {
    throw new FeedbackError(`The digest ${path} holds ${data.items.length} items; at most ${BATCH_MAX} go in one batch. Split the session into smaller ones.`);
  }
  const questions = data.questions === undefined ? [] : data.questions;
  if (!Array.isArray(questions)) throw new FeedbackError(`The digest ${path} has questions that are not a list of one-line strings.`);
  if (questions.length > QUESTIONS_MAX) {
    throw new FeedbackError(`The digest ${path} holds ${questions.length} questions; at most ${QUESTIONS_MAX} questions go in one digest. Keep the ones that matter most.`);
  }
  questions.forEach((question, i) => {
    if (!oneLine(question)) throw new FeedbackError(`Question ${i + 1} in ${path} must be one line, not empty.`);
  });
  const entries = data.items.map((entry, i) => checkEntry(entry, i + 1));

  // Every name is planned before anything is written, against the folder and against the batch itself.
  const taken = new Set();
  const planned = entries.map((entry, i) => {
    const slug = slugOf(entry.summary, `Item ${i + 1}: `);
    let file = slug;
    for (let n = 2; taken.has(file) || existsSync(join(root, target, `${file}.md`)); n += 1) file = `${slug}-${n}`;
    taken.add(file);
    return { path: `${target}/${file}.md`, text: render({ ...entry, session }) };
  });

  mkdirSync(join(root, target), { recursive: true });
  const written = [];
  for (const { path: file, text } of planned) {
    try {
      writeFileSync(join(root, file), text, { flag: 'wx' });
    } catch (cause) {
      // Without EEXIST the file may have been created before the write failed, so it is removed with the others.
      const ours = /** @type {any} */ (cause)?.code === 'EEXIST' ? written : [...written, file];
      undoAndRethrow(cause, ours.map((path) => ({ path, step: () => rmSync(join(root, path), { force: true }) })));
    }
    written.push(file);
  }
  return { paths: written, questions: [...questions] };
}

/** The four cells of a table line with surrounding backticks stripped, or null for a line that is not a table row. */
function cellsOf(line) {
  const text = line.trim();
  if (!text.startsWith('|') || !text.endsWith('|') || text.length < 2) return null;
  return text
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim())
    .map((cell) => (cell.length >= 2 && cell.startsWith('`') && cell.endsWith('`') ? cell.slice(1, -1).trim() : cell));
}

/** The rows of the table under the triage file's rows heading, as [item, route, target, reason]. */
function triageRows(text, path) {
  const lines = toLf(text).split('\n');
  const start = lines.findIndex((line) => line.trim() === ROWS_HEADING);
  const rest = start === -1 ? [] : lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  const section = end === -1 ? rest : rest.slice(0, end);
  const header = section.findIndex((line) => line.trim().replace(/\s+/g, ' ') === ROWS_HEADER);
  if (header === -1 || !/^\|(\s*:?-+:?\s*\|){4}$/.test((section[header + 1] ?? '').trim())) {
    throw new FeedbackError(`The triage file ${path} needs the table ${ROWS_HEADER} with its separator line under ${ROWS_HEADING}, as in the triage form.`);
  }
  const rows = [];
  for (const line of section.slice(header + 2)) {
    const cells = cellsOf(line);
    if (cells === null) break;
    if (cells.length !== 4) {
      throw new FeedbackError(`Row ${rows.length + 1} of ${path} must have four cells: item, route, target and reason (no "|" inside a cell).`);
    }
    rows.push(cells);
  }
  return rows;
}

/** One triage row checked against the project; returns what routing it writes. Nothing is written here. */
function planRow(root, [item, route, target, reason], n, seen, claimed) {
  const at = `Row ${n}: `;
  safePath(item, `${at}the item`);
  // Names are compared without letter case: on Windows and macOS login.md and LOGIN.md are one file.
  if (seen.has(item.toLowerCase())) throw new FeedbackError(`${at}${item} appears twice; give each item one row.`);
  seen.add(item.toLowerCase());
  const { folder, name } = splitPath(item);
  if ((folder !== INBOX_DIR && cycleIn(folder, '/feedback') === null) || !isItemName(name)) {
    throw new FeedbackError(`${at}${item} is not a feedback item: it must be a .md file directly in ${INBOX_DIR}/ or a cycle's feedback/ folder, and not a triage or iterate file.`);
  }
  if (!isFile(join(root, item))) throw new FeedbackError(`${at}${item} is not there. Check the item path.`);
  const original = readFileSync(join(root, item), 'utf8');
  const { stream } = readFrontmatter(original) ?? {};
  if (!STREAMS.includes(stream)) {
    throw new FeedbackError(`${at}${item} has no known stream (${JSON.stringify(stream ?? '')}), so it is not a feedback item this script routes.`);
  }
  if (!ROUTES.includes(route)) throw new FeedbackError(`${at}unknown route ${JSON.stringify(route)}. Use one of: ${ROUTES.join(', ')}.`);
  // The reason stays in the triage file and is never written to the item, so it may hold any one line.
  if (!oneLine(reason)) throw new FeedbackError(`${at}the reason must be one non-empty line.`);

  const where = ROUTE_FOLDER[route];
  if (route === 'inbox' && target !== '') throw new FeedbackError(`${at}an inbox route has no target; leave the Target cell empty.`);
  if (where !== undefined && target === '') throw new FeedbackError(`${at}a ${route} route needs a target under ${where}/. Create it, then write its path in the row.`);
  if (target !== '') {
    safePath(target, `${at}the target`);
    if (where !== undefined && !target.startsWith(`${where}/`)) throw new FeedbackError(`${at}a ${route} target must lie under ${where}/, not at ${target}.`);
    if (!existsSync(join(root, target))) throw new FeedbackError(`${at}the target ${target} does not exist. Create it first, then route.`);
    // A ticket or a proposal is one document; a replan may name a card folder and a drop any duplicate.
    if ((route === 'ticket' || route === 'proposal') && !isFile(join(root, target))) {
      throw new FeedbackError(`${at}the ${route} target ${target} is not a file. Name the ${route} document itself.`);
    }
  }

  let moveTo;
  if (route === 'inbox' && folder !== INBOX_DIR) {
    moveTo = `${INBOX_DIR}/${name}`;
    if (claimed.has(moveTo.toLowerCase()) || existsSync(join(root, moveTo))) {
      throw new FeedbackError(`${at}${moveTo} already exists, so ${item} cannot move back to the inbox. Rename one of them first.`);
    }
    claimed.add(moveTo.toLowerCase());
  }
  const status = ROUTE_STATUS[route];
  let text;
  try {
    text = setFrontmatterField(setFrontmatterField(original, 'status', status), 'routed_to', target);
  } catch (cause) {
    if (!(cause instanceof FrontmatterError)) throw cause;
    throw new FeedbackError(`${at}${item} cannot take the route: ${cause.message}.`);
  }
  return { item, route, status, routed_to: target, original, text, moveTo };
}

/**
 * Applies a triage file: checks every row first, then sets status and routed_to on each item and moves a cycle item
 * routed to the inbox back there. The file is triage-YYYY-MM-DD[-N].md, directly in a cycle's feedback/ or in
 * the project's feedback folder (FEEDBACK_DIR).
 * @param {string} projectDir
 * @param {string} triage project-relative path of the triage file
 * @returns {{ routed: Array<{ item: string, route: string, status: string, routed_to: string }> }} in row order
 * @throws {FeedbackError} on a bad name, place or row; no item is changed
 * @throws {import('./cycle.mjs').CycleError} when the triage file's cycle does not exist
 */
export function routeFeedback(projectDir, triage) {
  const path = safePath(triage, 'The triage file');
  const { folder, name } = splitPath(path);
  if (!TRIAGE_NAME.test(name)) {
    throw new FeedbackError(`The triage file ${path} must be named triage-YYYY-MM-DD.md or triage-YYYY-MM-DD-N.md.`);
  }
  const cycle = cycleIn(folder, '/feedback');
  if (folder !== FEEDBACK_DIR && cycle === null) {
    throw new FeedbackError(`The triage file ${path} must lie directly in ${FEEDBACK_DIR}/ or in a cycle's feedback/ folder.`);
  }
  if (cycle !== null) cycleFeedback(projectDir, cycle, { mustBeOpen: false });
  const root = docsBase(projectDir);
  const rows = triageRows(readProjectFile(root, path, 'the triage file'), path);
  const seen = new Set();
  const claimed = new Set();
  const plans = rows.map((row, i) => planRow(root, row, i + 1, seen, claimed));

  // Each plan is recorded before its write, so an item the failing write truncated is restored too.
  const touched = [];
  try {
    for (const plan of plans) {
      touched.push(plan);
      writeFileSync(join(root, plan.item), plan.text);
      if (plan.moveTo !== undefined) {
        mkdirSync(join(root, INBOX_DIR), { recursive: true });
        // Checked again here: renameSync replaces an existing file without asking.
        if (existsSync(join(root, plan.moveTo))) {
          throw new FeedbackError(`${plan.moveTo} appeared while routing, so ${plan.item} was not moved. Rename one of them and route again.`);
        }
        renameSync(join(root, plan.item), join(root, plan.moveTo));
        plan.moved = true;
      }
    }
  } catch (cause) {
    undoAndRethrow(
      cause,
      touched.reverse().map((plan) => ({
        path: plan.item,
        step: () => {
          if (plan.moved) renameSync(join(root, plan.moveTo), join(root, plan.item));
          writeFileSync(join(root, plan.item), plan.original);
        },
      })),
    );
  }
  return { routed: plans.map(({ item, route, status, routed_to }) => ({ item, route, status, routed_to })) };
}
