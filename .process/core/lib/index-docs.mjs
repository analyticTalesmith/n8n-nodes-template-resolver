import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileAtCommit, runGit } from './git.mjs';
import { checkDocFrontmatter, readFrontmatter } from './frontmatter.mjs';
import { CYCLES_DIR } from './layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {{ path: string, text: string, current: string | null }} IndexPlan */
/** @typedef {import('./git.mjs').Change} Change */
/** @typedef {import('./git.mjs').GitRunner} GitRunner */

/** The folders whose directories each describe themselves in an index file. */
export const INDEX_ROOTS = Object.freeze(['docs/living', CYCLES_DIR]);
export const START_MARKER = '<!-- generated index: replace everything between this line and the end marker -->';
export const END_MARKER = '<!-- end generated index -->';
/** A markdown file larger than this is worth splitting; it is a warning, never a failure. */
export const SIZE_FLAG_BYTES = 30720;

const INDEX_FILE = 'INDEX.md';
const CYCLE_FILE = 'CYCLE.md';
const SKIPPED_FOLDER = 'kanban';
const SCRIPT_COMMAND = 'node .process/core/scripts/index.mjs <projectDir>';
const SUMMARY_FIELDS = new Set(['summary', 'frontmatter']);

/**
 * The name of the index file for a directory: CYCLE.md for a direct child of the cycles folder that holds one, INDEX.md otherwise.
 * @param {string} dirRel directory relative to the project, with forward slashes
 * @param {string[]} [names] the file names in the directory; without them a direct child of the cycles folder is taken to hold a CYCLE.md
 * @returns {'INDEX.md' | 'CYCLE.md'}
 */
export function indexFileFor(dirRel, names) {
  const prefix = `${CYCLES_DIR}/`;
  const isCycle = dirRel.startsWith(prefix) && dirRel.length > prefix.length && !dirRel.slice(prefix.length).includes('/');
  return isCycle && (names === undefined || names.includes(CYCLE_FILE)) ? CYCLE_FILE : INDEX_FILE;
}

const byName = (a, b) => a.name.localeCompare(b.name, 'en') || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const toLf = (text) => text.replace(/\r\n/g, '\n');

/** The summary of a document, or null when its frontmatter fails the summary rule. */
const summaryOf = (text) => {
  if (checkDocFrontmatter(text).some(({ field }) => SUMMARY_FIELDS.has(field))) return null;
  return /** @type {string} */ (readFrontmatter(text).summary).trim();
};

/** Start and end offsets of the generated block (markers included) and the line ending of its start line, or null unless both marker lines are present in order. */
function findBlock(text) {
  let offset = 0;
  let start = -1;
  let eol = '\n';
  for (const line of text.split('\n')) {
    const bare = line.endsWith('\r') ? line.slice(0, -1) : line;
    if (start === -1 && bare === START_MARKER) {
      start = offset;
      eol = bare === line ? '\n' : '\r\n';
    } else if (start !== -1 && bare === END_MARKER) return { start, end: offset + bare.length, eol };
    offset += line.length + 1;
  }
  return null;
}

const blockFor = (items) => [START_MARKER, ...items.map(({ label, link, summary }) => `- [${label}](${link}) — ${summary}`), END_MARKER].join('\n');

const newIndexText = (dirRel, block) =>
  `---\nsummary: Index of ${dirRel}.\n---\n\n# ${dirRel}\n\nContents of ${dirRel}.\n\n${block}\n`;

/** The existing index text with its block replaced, or with the block appended after a blank line. */
function withBlock(current, block) {
  const found = findBlock(current);
  if (found !== null) {
    if (toLf(current.slice(found.start, found.end)) === block) return current;
    return current.slice(0, found.start) + block.replace(/\n/g, found.eol) + current.slice(found.end);
  }
  let trailing = 0;
  for (let i = current.length - 1; i >= 0 && (current[i] === '\n' || current[i] === '\r'); i -= 1) if (current[i] === '\n') trailing += 1;
  return `${current}${'\n'.repeat(Math.max(0, 2 - trailing))}${block}\n`;
}

/**
 * Walks the index roots without writing. Returns the planned index of every qualifying directory and the problems found.
 * @param {string} projectDir
 * @returns {{ plans: IndexPlan[], problems: Finding[], markdown: { path: string, bytes: number }[] }}
 */
export function inspectIndexes(projectDir, options = {}) {
  const roots = resolveProjectRoots(projectDir, options);
  const physical = (path) => resolveProjectPath(roots, path);
  /** @type {IndexPlan[]} */
  const plans = [];
  /** @type {Finding[]} */
  const problems = [];
  const markdown = [];
  const summaryProblem = (path) =>
    problems.push({
      rule: 'index-summary-missing',
      message: `${path} has no usable summary in its frontmatter. Add a one-line summary: to it, then run ${SCRIPT_COMMAND}.`,
      path,
    });

  /** @returns {{ summary: string | null, indexName: string } | null} null when the directory does not qualify for an index */
  const visit = (dirRel) => {
    const entries = readdirSync(physical(dirRel), { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && !entry.name.startsWith('.') && entry.name.endsWith('.md')).map((entry) => entry.name);
    const indexName = indexFileFor(dirRel, files);
    const folders = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== SKIPPED_FOLDER);
    const items = [];
    let qualifyingFolders = 0;
    for (const { name } of folders.sort(byName)) {
      const child = visit(`${dirRel}/${name}`);
      if (child === null) continue;
      qualifyingFolders += 1;
      if (child.summary !== null) items.push({ name, label: `${name}/`, link: `${name}/${child.indexName}`, summary: child.summary });
    }
    for (const name of files) {
      const path = `${dirRel}/${name}`;
      const text = readFileSync(physical(path), 'utf8');
      markdown.push({ path, bytes: Buffer.byteLength(text) });
      if (name === indexName || (indexName === CYCLE_FILE && name === INDEX_FILE)) continue;
      const summary = summaryOf(text);
      if (summary === null) summaryProblem(path);
      else items.push({ name, label: name, link: name, summary });
    }
    // a cycle that holds its brief always has an index, even before it has any other document
    if (qualifyingFolders === 0 && indexName !== CYCLE_FILE && !files.some((name) => name !== indexName)) return null;

    const path = `${dirRel}/${indexName}`;
    const current = files.includes(indexName) ? readFileSync(physical(path), 'utf8') : null;
    const block = blockFor(items.sort(byName));
    const text = current === null ? newIndexText(dirRel, block) : withBlock(current, block);
    plans.push({ path, text, current });
    let summary = `Index of ${dirRel}.`;
    if (current !== null) {
      summary = summaryOf(current);
      if (summary === null) summaryProblem(path);
    }
    return { summary, indexName };
  };

  for (const rootRel of INDEX_ROOTS) {
    const rootPath = physical(rootRel);
    let stat;
    try {
      stat = lstatSync(rootPath);
    } catch (error) {
      if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') continue;
      throw error;
    }
    if (stat.isDirectory()) visit(rootRel);
  }
  return { plans: plans.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)), problems, markdown };
}

/**
 * What every index should contain. Reads only.
 * @param {string} projectDir
 * @returns {IndexPlan[]} text equals current for an index that is fresh; current is null for an index that does not exist yet
 */
export function planIndexes(projectDir, options = {}) {
  return inspectIndexes(projectDir, options).plans;
}

/**
 * Writes every index whose planned text differs from what is on disk.
 * @param {string} projectDir
 * @returns {{ written: string[] }} paths relative to the project
 */
export function writeIndexes(projectDir, options = {}) {
  const roots = resolveProjectRoots(projectDir, options);
  const written = [];
  for (const { path, text, current } of planIndexes(projectDir, options)) {
    if (text === current) continue;
    writeFileSync(resolveProjectPath(roots, path), text);
    written.push(path);
  }
  return { written };
}

/**
 * Markdown files over the size flag, for a warning.
 * @param {string} projectDir
 * @returns {{ path: string, bytes: number }[]}
 */
export function findLargeFiles(projectDir, options = {}) {
  return inspectIndexes(projectDir, options)
    .markdown.filter(({ bytes }) => bytes > SIZE_FLAG_BYTES)
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * What is wrong with the indexes on disk: a missing index, one without its block, a stale block, a missing summary.
 * @param {string} projectDir
 * @returns {Finding[]}
 */
export function indexProblems(projectDir, options = {}) {
  const { plans, problems } = inspectIndexes(projectDir, options);
  /** @type {Finding[]} */
  const findings = [];
  for (const { path, text, current } of plans) {
    if (current === null) {
      findings.push({ rule: 'index-missing', message: `${path} does not exist. Run ${SCRIPT_COMMAND} to create it.`, path });
    } else if (findBlock(current) === null) {
      findings.push({
        rule: 'index-block-missing',
        message: `${path} lacks the start and end markers of the generated block. Run ${SCRIPT_COMMAND} to add it after your header.`,
        path,
      });
    } else if (text !== current) {
      findings.push({ rule: 'index-stale', message: `${path} no longer matches the documents it lists. Run ${SCRIPT_COMMAND} to regenerate it.`, path });
    }
  }
  return [...findings, ...problems];
}

const outsideBlock = (text, found) => text.slice(0, found.start) + text.slice(found.end);

/**
 * Which changed paths are only what the index generator would write. An edited index (INDEX.md or a cycle brief) counts
 * when its text outside the generated block equals the base version's; a new INDEX.md counts when it equals the text
 * the generator plans for it. A deleted, renamed or hand-edited index never counts, and a path whose base version or
 * working file cannot be read does not count either; its reason is returned so a finding can say why. Reads only.
 * @param {string} projectDir
 * @param {Change[]} changes
 * @param {string} base commit the changes are measured from
 * @param {GitRunner} [run]
 * @returns {{ exempt: Set<string>, why: Map<string, string> }}
 */
export function generatedIndexChanges(projectDir, changes, base, run = runGit, options = {}) {
  /** @type {Set<string>} */
  const exempt = new Set();
  /** @type {Map<string, string>} */
  const why = new Map();
  const candidates = changes
    .filter(({ status }) => status === 'A' || status === 'M')
    .map(({ status, path }) => ({ status, path: String(path).replaceAll('\\', '/') }))
    .filter(({ path }) => path.endsWith(`/${INDEX_FILE}`) || path.endsWith(`/${CYCLE_FILE}`));
  if (candidates.length === 0) return { exempt, why };
  let plans;
  try {
    plans = new Map(planIndexes(projectDir, options).map((plan) => [plan.path, plan]));
  } catch (error) {
    for (const { path } of candidates) why.set(path, `the generator could not plan the indexes (${error.message})`);
    return { exempt, why };
  }
  for (const { status, path } of candidates) {
    const plan = plans.get(path);
    if (plan === undefined || plan.current === null) continue;
    const working = toLf(plan.current);
    if (status === 'A') {
      const planned = findBlock(plan.text);
      const dirRel = path.slice(0, -INDEX_FILE.length - 1);
      if (path.endsWith(`/${INDEX_FILE}`) && planned !== null && working === newIndexText(dirRel, plan.text.slice(planned.start, planned.end))) exempt.add(path);
      continue;
    }
    let before;
    try {
      before = fileAtCommit(projectDir, base, path, run);
    } catch (error) {
      why.set(path, `its version at the base commit could not be read (${error.message})`);
      continue;
    }
    const after = findBlock(working);
    const was = before === null ? null : findBlock(before);
    if (before === null || was === null || after === null) {
      why.set(path, before === null ? 'it has no version at the base commit' : 'it has no generated block to compare');
    } else if (outsideBlock(before, was) === outsideBlock(working, after)) {
      exempt.add(path);
    } else {
      why.set(path, 'it also changed outside the generated block');
    }
  }
  return { exempt, why };
}
