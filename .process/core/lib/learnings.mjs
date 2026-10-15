import { toLf } from './files.mjs';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { readFrontmatter } from './frontmatter.mjs';
import { isCardId } from './board.mjs';
import { writeFileAtomic } from './files.mjs';
import { LEARNINGS_ARCHIVE_DIR, LEARNINGS_DIR } from './layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./files.mjs').FileIo} FileIo */

export const LEARNINGS_ROOT = LEARNINGS_DIR;
/** Where a considered learning goes. Created on demand, so it is not one of the required project folders. */
export const ARCHIVE_ROOT = LEARNINGS_ARCHIVE_DIR;
export const LEARNING_SCOPES = Object.freeze(['project', 'pack', 'aperture']);
export const LEARNING_SECTIONS = Object.freeze(['What happened', 'Evidence', 'Suggested change']);

const FENCE = /^---[ \t]*$/;
const ITEM = /^[ \t]*-[ \t]+\S/;

/** The lines after the frontmatter, or all lines when there is none. */
function bodyLines(lines) {
  if (!FENCE.test(lines[0] ?? '')) return lines;
  const close = lines.findIndex((line, index) => index > 0 && FENCE.test(line));
  return close === -1 ? lines : lines.slice(close + 1);
}

/** Section text by heading, for the headings in LEARNING_SECTIONS; text before the first heading is dropped. */
function sectionsOf(lines) {
  /** @type {Map<string, string[]>} */
  const found = new Map();
  let current = null;
  for (const line of lines) {
    const heading = /^##[ \t]+(.*?)[ \t]*$/.exec(line);
    if (heading !== null) {
      current = LEARNING_SECTIONS.includes(heading[1]) && !found.has(heading[1]) ? heading[1] : null;
      if (current !== null) found.set(current, []);
    } else if (current !== null) {
      found.get(current).push(line);
    }
  }
  return found;
}

/**
 * Checks the shape of a learning note, copied from the template or hand-written. Pure; the truth of the evidence is not checked.
 * @param {string} text
 * @returns {Finding[]}
 */
export function checkLearning(text) {
  /** @type {Finding[]} */
  const findings = [];
  const missing = (what, fix) => findings.push({ rule: 'learning-field-missing', message: `The learning note ${what}. ${fix}` });
  const source = typeof text === 'string' ? toLf(text) : '';

  const data = readFrontmatter(source);
  if (data === null) {
    missing('has no frontmatter', 'Start from core/templates/learning.md.');
  } else {
    const scalar = (key) => (typeof data[key] === 'string' ? data[key] : '');
    if (scalar('type') !== 'learning') missing('has no "type: learning" in its frontmatter', 'Set type to learning.');
    for (const key of ['date', 'title', 'scope']) {
      if (scalar(key) === '') missing(`has an empty or missing ${key}`, `Fill in ${key} in the frontmatter.`);
    }
    if ('card' in data && !isCardId(data.card)) {
      missing(`has a card "${String(data.card)}" that is not a card id`, 'Use a card id such as 0001-name, or remove card.');
    }
    const scope = scalar('scope');
    if (scope !== '' && !LEARNING_SCOPES.includes(scope)) {
      findings.push({
        rule: 'learning-scope-unknown',
        message: `The learning note has scope "${scope}". Use one of: ${LEARNING_SCOPES.join(', ')}.`,
      });
    }
  }

  const sections = sectionsOf(bodyLines(source.split('\n')));
  for (const name of LEARNING_SECTIONS) {
    const body = sections.get(name);
    if (body === undefined) {
      missing(`has no "## ${name}" section`, `Add the "## ${name}" section.`);
    } else if (body.every((line) => line.trim() === '')) {
      missing(`has an empty "## ${name}" section`, `Write something under "## ${name}".`);
    }
  }
  const evidence = sections.get('Evidence');
  if (evidence !== undefined && !evidence.some((line) => ITEM.test(line))) {
    findings.push({
      rule: 'learning-no-evidence',
      message: 'The Evidence section has no list item. Add at least one "- " line, such as "- review rounds: 4".',
    });
  }
  return findings;
}

/**
 * `name` if no file of that name is in `dir`, else the first free of `<stem>-2<ext>`, `<stem>-3<ext>` and so on.
 * @param {string} dir
 * @param {string} name
 */
export function unusedName(dir, name) {
  const ext = extname(name);
  const stem = name.slice(0, name.length - ext.length);
  let candidate = name;
  for (let n = 2; existsSync(join(dir, candidate)); n++) candidate = `${stem}-${n}${ext}`;
  return candidate;
}

const KEY = /^([A-Za-z0-9_-]+):/;
const LIST_ITEM = /^[ \t]*-/;
const strip = (line) => (line.endsWith('\r') ? line.slice(0, -1) : line);

/** The value as a frontmatter scalar that readFrontmatter reads back unchanged: quoted when it would read as a comment, a list or a quoted value. */
const scalar = (value) => {
  const text = String(value).trim();
  return /^[#["']|["']$/.test(text) ? `"${text}"` : text;
};

/**
 * The note with the given keys set in its frontmatter, replacing an earlier value of the same key (and a block list
 * under it); every other byte, the body included, is kept, in the note's own line endings. A note without frontmatter
 * gets one in front of its text.
 * @param {string} text
 * @param {Record<string, string>} fields
 */
function stampNote(text, fields) {
  const bom = text.startsWith('﻿') ? '﻿' : '';
  const lines = text.slice(bom.length).split('\n');
  const close = FENCE.test(strip(lines[0])) ? lines.findIndex((line, i) => i > 0 && FENCE.test(strip(line))) : -1;
  const cr = (close === -1 ? text.includes('\r\n') : lines[0].endsWith('\r')) ? '\r' : '';
  const stamps = Object.entries(fields).map(([key, value]) => `${key}: ${scalar(value)}${cr}`);
  if (close === -1) return `${bom}---${cr}\n${stamps.join('\n')}\n---${cr}\n${text.slice(bom.length)}`;
  const kept = [];
  for (let i = 1; i < close; i++) {
    if (!Object.hasOwn(fields, KEY.exec(strip(lines[i]))?.[1] ?? '')) {
      kept.push(lines[i]);
      continue;
    }
    while (i + 1 < close && LIST_ITEM.test(lines[i + 1])) i++;
  }
  return bom + [lines[0], ...kept, ...stamps, ...lines.slice(close)].join('\n');
}

/**
 * True when the note opens a frontmatter block with --- and never closes it, so stamping cannot tell where it ends.
 * @param {string} text
 */
export function hasUnclosedFrontmatter(text) {
  const lines = text.replace(/^﻿/, '').split('\n');
  return FENCE.test(strip(lines[0])) && !lines.some((line, i) => i > 0 && FENCE.test(strip(line)));
}

/**
 * Moves a live learning note to the archive, adding `considered`, `disposition` and `outcome` to its frontmatter.
 * The note keeps its name unless the archive holds one already; then it gets `-2`, `-3` and so on. The archived copy
 * is written before the live note is removed, and removed again if the live note cannot be.
 * @param {string} projectDir
 * @param {string} relPath project-relative path of the live note
 * @param {{ considered: string, disposition: 'applied' | 'discarded', outcome: string, io?: FileIo }} stamp
 * @returns {string} the archived project-relative path
 */
export function archiveLearning(projectDir, relPath, { considered, disposition, outcome, io }) {
  const roots = resolveProjectRoots(projectDir);
  const from = resolveProjectPath(roots, relPath);
  const text = readFileSync(from, 'utf8');
  if (hasUnclosedFrontmatter(text)) throw new Error(`${relPath} opens its frontmatter with --- and never closes it. Add the closing --- line, then archive it.`);
  const stamped = stampNote(text, { considered, disposition, outcome });
  const archived = `${ARCHIVE_ROOT}/${unusedName(resolveProjectPath(roots, ARCHIVE_ROOT), basename(from))}`;
  const to = resolveProjectPath(roots, archived);
  writeFileAtomic(to, stamped, io);
  try {
    rmSync(from, { maxRetries: 5, retryDelay: 50 });
  } catch (err) {
    rmSync(to, { force: true });
    throw err;
  }
  return archived;
}
