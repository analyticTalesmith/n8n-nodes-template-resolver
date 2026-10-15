import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { stripBom } from './files.mjs';
import { checkDocFrontmatter, DOC_STATES, readFrontmatter } from './frontmatter.mjs';
import { CYCLES_DIR, CYCLE_ARCHIVE_DIR, LIVING_DIR } from './layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {{ path: string, id: string, type: string, summary: string, state: string, source: string | null, links: { type: string, target: string }[] }} Atom */

export const ATOM_TYPES = Object.freeze(['outcome', 'actor', 'object', 'action', 'rule', 'boundary', 'interface', 'surface', 'decision', 'risk', 'test']);
export const SOURCE_REQUIRED = Object.freeze(['outcome', 'actor', 'object', 'rule']);
// Provisional: the id scheme is the human's to confirm. The prefix is never checked.
export const ATOM_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;

const ALL_BUT_TEST = ATOM_TYPES.filter((type) => type !== 'test');

/** Atom type -> link type -> target atom types. Outcome, actor, surface and test have no link types. */
export const LINK_TYPES = {
  action: { serves: ['outcome'], 'performed-by': ['actor'], 'acts-on': ['object'], 'shown-on': ['surface'], needs: ['action'] },
  object: { contains: ['object'], 'belongs-to': ['object'], 'relates-to': ['object'] },
  rule: { constrains: ALL_BUT_TEST, 'verified-by': ['test'] },
  interface: { 'provided-by': ['boundary'], 'consumed-by': ['boundary', 'actor'], carries: ['object'] },
  boundary: { contains: ALL_BUT_TEST, 'depends-on': ['boundary'] },
  decision: { decides: [...ATOM_TYPES], supersedes: ['decision'] },
  risk: { threatens: ['boundary', 'interface', 'object', 'action'], 'mitigated-by': ['rule', 'decision'] },
};

/** Where atoms live: the living docs, the cycle folders and the archived cycles. */
export const ATOM_ROOTS = Object.freeze([LIVING_DIR, CYCLES_DIR, CYCLE_ARCHIVE_DIR]);

const LINK_ITEM = /^([a-z][a-z0-9]*(?:-[a-z0-9]+)*):[ \t]*(\S+)$/;
const FILE_LINE = /^[^\s:]+:[1-9]\d*$/;
const ASSUMPTION = 'assumption';

const frontmatterOf = (content) => {
  try {
    return typeof content === 'string' ? readFrontmatter(content) : null;
  } catch {
    return null;
  }
};
const isAtomData = (data) => data !== null && (data.id !== undefined || ATOM_TYPES.includes(data.type));
const FENCE_LINE = /^---[ \t]*$/;
const ATOM_KEY_LINE = /^(?:id|type):/;
/** True when the text opens a --- fence that never closes and has an id: or type: line. */
const isUnclosed = (content) => {
  if (typeof content !== 'string') return false;
  const lines = stripBom(content).split('\n').map((line) => line.replace(/\r$/, ''));
  return FENCE_LINE.test(lines[0]) && !lines.slice(1).some((line) => FENCE_LINE.test(line)) && lines.some((line) => ATOM_KEY_LINE.test(line));
};
const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

/** True when the text has frontmatter with an `id` key or a `type` in ATOM_TYPES. */
export function isAtomText(content) {
  return isAtomData(frontmatterOf(content));
}

/**
 * Parses one file. atom is null when the file is not an atom or has no usable id and type, in which case the
 * findings still say what is wrong. Pure; never throws.
 * @param {string} content
 * @param {string} path
 * @returns {{ atom: Atom | null, findings: Finding[] }}
 */
export function parseAtom(content, path) {
  const data = frontmatterOf(content);
  if (data === null && isUnclosed(content)) {
    const message = `${path} starts with --- and has an id or type line but no closing --- line. Add a --- line after the last frontmatter line.`;
    return { atom: null, findings: [{ rule: 'atom-frontmatter-unclosed', message, path }] };
  }
  if (!isAtomData(data)) return { atom: null, findings: [] };
  const id = trimmed(data.id);
  const type = trimmed(data.type);
  const who = id === '' ? path : `${path}: atom ${id}`;
  /** @type {Finding[]} */
  const findings = [];
  const report = (rule, message) => findings.push({ rule, message: `${who} ${message}`, path });
  const missing = (field) => report('atom-field-missing', `has no ${field}. Add a ${field} line to its frontmatter.`);

  if (id === '') missing('id');
  else if (!ATOM_ID.test(id)) report('atom-id-invalid', `has the id "${id}", which is not lowercase words joined by hyphens, such as obj-content-silo. Rename the id.`);

  if (type === '') missing('type');
  else if (!ATOM_TYPES.includes(type)) report('atom-type-unknown', `has the type "${type}". Use one of ${ATOM_TYPES.join(', ')}.`);

  if (data.summary === undefined) missing('summary');
  else for (const f of checkDocFrontmatter(content).filter((item) => item.field === 'summary')) report('atom-summary-invalid', `${f.message}.`);

  if (data.state === undefined) missing('state');
  else if (!DOC_STATES.includes(data.state)) report('atom-state-invalid', `has the state "${data.state}". Use one of ${DOC_STATES.join(', ')}.`);

  const source = trimmed(data.source);
  if (source === '') {
    if (SOURCE_REQUIRED.includes(type)) missing('source');
  } else if (!(ATOM_ID.test(source) || FILE_LINE.test(source) || source === ASSUMPTION)) {
    report('atom-source-invalid', `has the source "${source}". Use an atom id, a file:line such as ${LIVING_DIR}/glossary.md:12, or the word assumption.`);
  }

  /** @type {{ type: string, target: string }[]} */
  const links = [];
  if (data.links === undefined) {
    missing('links');
  } else if (!Array.isArray(data.links)) {
    report('atom-links-invalid', 'has links that is not a list. Write links as a block list of "type: id" items, or links: [] for none.');
  } else {
    const allowed = Object.hasOwn(LINK_TYPES, type) ? LINK_TYPES[type] : {};
    for (const item of data.links) {
      const match = LINK_ITEM.exec(String(item).trim());
      if (match === null || !ATOM_ID.test(match[2])) {
        report('atom-link-malformed', `has the link item "${item}", which is not "type: id". Write it as, for example, "serves: out-see-all-work".`);
        continue;
      }
      if (!Object.hasOwn(allowed, match[1])) {
        const own = Object.keys(allowed);
        report('atom-link-type-unknown', `has the link type "${match[1]}", which a ${type === '' ? 'typeless' : type} atom does not have. ${own.length === 0 ? 'This type has no links; use links: [].' : `Use one of ${own.join(', ')}.`}`);
      }
      links.push({ type: match[1], target: match[2] });
    }
  }

  if (id === '' || !ATOM_TYPES.includes(type)) return { atom: null, findings };
  return { atom: { path, id, type, summary: trimmed(data.summary), state: trimmed(data.state), source: source === '' ? null : source, links }, findings };
}

/** The Markdown files below a directory as paths relative to it, INDEX.md skipped. A folder that cannot be listed gives none and a finding; a missing folder gives none silently. */
function markdownFiles(dir, display, findings, readDir, prefix = '') {
  let entries;
  try {
    entries = readDir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      const folder = prefix === '' ? display : display + '/' + prefix.slice(0, -1);
      findings.push({ rule: 'atom-file-unreadable', path: folder, message: folder + ' cannot be listed (' + (error?.code ?? 'unknown error') + '), so the atoms in it were not read. Fix the folder\'s permissions.' });
    }
    return [];
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return entries.flatMap((entry) => {
    const rel = prefix + entry.name;
    if (entry.isDirectory()) return markdownFiles(join(dir, entry.name), display, findings, readDir, rel + '/');
    return entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'INDEX.md' ? [rel] : [];
  });
}

/**
 * Reads every atom under the living docs folder, the cycle folders and the archived cycles, through the project roots.
 * Never throws for file content or file system errors and never writes. The optional second argument replaces the
 * file system calls so a read failure can be tested without changing permissions.
 * @param {string} projectDir
 * @param {{ readFile?: typeof readFileSync, readDir?: typeof readdirSync }} [io]
 * @returns {{ atoms: Atom[], findings: Finding[] }}
 */
export function readAtoms(projectDir, { readFile = readFileSync, readDir = readdirSync } = {}) {
  const roots = resolveProjectRoots(projectDir);
  /** @type {Atom[]} */
  const atoms = [];
  /** @type {Finding[]} */
  const findings = [];
  for (const root of ATOM_ROOTS) {
    const base = resolveProjectPath(roots, root);
    for (const rel of markdownFiles(base, root, findings, readDir)) {
      let content;
      try {
        content = readFile(join(base, rel), 'utf8');
      } catch (error) {
        findings.push({ rule: 'atom-file-unreadable', path: root + '/' + rel, message: root + '/' + rel + ' cannot be read (' + (error?.code ?? 'unknown error') + '), so its atom was not loaded. Fix the file\'s permissions.' });
        continue;
      }
      const parsed = parseAtom(content, root + '/' + rel);
      if (parsed.atom !== null) atoms.push(parsed.atom);
      findings.push(...parsed.findings);
    }
  }
  return { atoms, findings };
}

/** Where retired atom ids are recorded: one living document, one list item per id. */
export const RETIRED_IDS_PATH = `${LIVING_DIR}/retired-ids.md`;
const RETIRED_ITEM = /^-[ \t]+(\S+?)(?::[ \t]*(.*))?$/;

/**
 * Reads the list of retired atom ids. Each list item is "- <id>" or "- <id>: <note>", the note saying what the old
 * atom was and why it was retired. A missing or empty file means nothing is retired. Never throws and never writes.
 * @param {string} projectDir
 * @returns {{ retired: Map<string, { note: string }>, findings: Finding[] }}
 */
export function readRetiredIds(projectDir) {
  /** @type {Map<string, { note: string }>} */
  const retired = new Map();
  /** @type {Finding[]} */
  const findings = [];
  let content;
  try {
    content = readFileSync(resolveProjectPath(resolveProjectRoots(projectDir), RETIRED_IDS_PATH), 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      findings.push({ rule: 'atom-id-retired-registry', path: RETIRED_IDS_PATH, message: `${RETIRED_IDS_PATH} cannot be read (${error?.code ?? 'unknown error'}), so retired ids were not checked. Fix the file's permissions.` });
    }
    return { retired, findings };
  }
  const lines = stripBom(content).split('\n').map((line) => line.replace(/\r$/, ''));
  let start = 0;
  if (FENCE_LINE.test(lines[0] ?? '')) {
    const close = lines.findIndex((line, index) => index > 0 && FENCE_LINE.test(line));
    if (close > 0) start = close + 1;
  }
  let inComment = false;
  for (const [offset, raw] of lines.slice(start).entries()) {
    const line = raw.trim();
    if (inComment) {
      inComment = !line.includes('-->');
      continue;
    }
    if (line.startsWith('<!--')) {
      inComment = !line.includes('-->');
      continue;
    }
    if (line === '' || line.startsWith('#')) continue;
    const match = RETIRED_ITEM.exec(line);
    if (match === null || !ATOM_ID.test(match[1])) {
      findings.push({ rule: 'atom-id-retired-registry', path: RETIRED_IDS_PATH, message: `${RETIRED_IDS_PATH} line ${start + offset + 1} is "${line}", which is not "- <id>" or "- <id>: <note>" with an id of lowercase words joined by hyphens. Fix or remove the line.` });
      continue;
    }
    if (!retired.has(match[1])) retired.set(match[1], { note: (match[2] ?? '').trim() });
  }
  return { retired, findings };
}
