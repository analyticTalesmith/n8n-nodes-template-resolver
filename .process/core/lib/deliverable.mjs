import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ATOM_ROOTS } from './atom.mjs';
import { readFrontmatter } from './frontmatter.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/**
 * @typedef {{ heading: string, line: number, ids: string[], exempt: string | null }} Section
 * @typedef {{ path: string, kind: string, records: { raw: string, id: string, commit: string }[], sections: Section[] }} Deliverable
 */

/** The frontmatter key that marks a composed deliverable; its value names the type (prd, user-docs, release-notes). */
export const COMPOSED_KEY = 'composed';
/** The frontmatter key that lists each cited atom id with the commit it was verified at. */
export const CITES_KEY = 'cites';
const CITE = /\[cites:([^\]]*)\]/g;
const EXEMPT_HEADING = /^exempt:\s*(.*)$/i;
const FENCE = /^\s*(```|~~~)/;
const RECORD = /^([^:\s]+):[ \t]*(\S*)$/;

const frontmatterOf = (text) => {
  try {
    return readFrontmatter(text);
  } catch {
    return null;
  }
};

/** The Markdown files below a directory as relative paths, INDEX.md skipped; an unreadable folder gives none. */
function markdownFiles(dir, prefix = '') {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return entries.flatMap((entry) => {
    const rel = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return markdownFiles(join(dir, entry.name), `${rel}/`);
    return entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'INDEX.md' ? [rel] : [];
  });
}

/**
 * Splits a body into its level-two sections. Text before the first one (the title and the reader line) is not a
 * section. Headings inside code fences are text.
 * @param {string[]} lines the body lines
 * @param {number} offset the number of lines before the body, so line numbers are file line numbers
 * @returns {Section[]}
 */
function sectionsOf(lines, offset) {
  /** @type {(Section & { text: string[] })[]} */
  const found = [];
  let fenced = false;
  lines.forEach((line, index) => {
    if (FENCE.test(line)) fenced = !fenced;
    const heading = !fenced && /^##[ \t]+\S/.test(line) ? line.replace(/^##[ \t]+/, '').trim() : null;
    if (heading !== null) {
      const exempt = EXEMPT_HEADING.exec(heading);
      found.push({ heading, line: offset + index + 1, ids: [], exempt: exempt === null ? null : exempt[1].trim(), text: [] });
    } else if (found.length > 0) {
      found[found.length - 1].text.push(line);
    }
  });
  return found.map(({ text, ...section }) => {
    const ids = [];
    for (const match of text.join('\n').matchAll(CITE)) ids.push(...match[1].split(/[\s,]+/).filter((id) => id !== ''));
    return { ...section, ids };
  });
}

/**
 * Parses one file. Null when it is not a composed deliverable. Never throws.
 * @param {string} text
 * @param {string} path
 * @returns {Deliverable | null}
 */
export function parseDeliverable(text, path) {
  const data = frontmatterOf(text);
  if (data === null || typeof data[COMPOSED_KEY] !== 'string' || data[COMPOSED_KEY].trim() === '') return null;
  const all = text.replace(/^﻿/, '').split(/\r?\n/);
  const close = all.findIndex((line, index) => index > 0 && /^---[ \t]*$/.test(line));
  const cites = Array.isArray(data[CITES_KEY]) ? data[CITES_KEY] : [];
  const records = cites.map((raw) => {
    const match = RECORD.exec(String(raw).trim());
    return { raw: String(raw), id: match === null ? '' : match[1], commit: match === null ? '' : match[2] };
  });
  return { path, kind: data[COMPOSED_KEY].trim(), records, sections: sectionsOf(all.slice(close + 1), close + 1) };
}

/**
 * Reads every composed deliverable under docs/living, the cycle folders and the archived cycles.
 * @param {string} projectDir
 * @returns {Deliverable[]}
 */
export function readDeliverables(projectDir) {
  const roots = resolveProjectRoots(projectDir);
  /** @type {Deliverable[]} */
  const found = [];
  for (const root of ATOM_ROOTS) {
    const base = resolveProjectPath(roots, root);
    for (const rel of markdownFiles(base)) {
      let text;
      try {
        text = readFileSync(join(base, rel), 'utf8');
      } catch {
        continue;
      }
      const parsed = parseDeliverable(text, `${root}/${rel}`);
      if (parsed !== null) found.push(parsed);
    }
  }
  return found;
}
