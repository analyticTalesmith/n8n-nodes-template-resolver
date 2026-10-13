import { readFileSync } from 'node:fs';
import { cardPath } from './board.mjs';

/** The ticket contract files in a card folder: card.md holds the contract, context.md the working memory. */
export const CONTRACT_FILES = Object.freeze({ card: 'card.md', context: 'context.md' });

/** @typedef {'add' | 'edit' | 'remove'} WriteKind */
/** @typedef {{ path: string, kind: WriteKind }} ScopeWrite */
/** @typedef {{ date: string, path: string, kind: WriteKind, reason: string, approvedBy: string }} ScopeException */

const WRITE_KINDS = ['add', 'edit', 'remove'];
const lf = (text) => String(text).replaceAll('\r\n', '\n');
const slashes = (path) => String(path).trim().replaceAll('\\', '/').replace(/^(\.\/)+/, '');

/** Text without HTML comments (template guidance), so a hint never counts as content. */
export const stripComments = (text) => lf(text).replace(/<!--[\s\S]*?-->/g, '');

/** Prose with comments, fenced code and inline code removed: what a reader sees as text and links. */
export function proseOnly(text) {
  const kept = [];
  let fenced = false;
  for (const line of stripComments(text).split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    else if (!fenced) kept.push(line.replace(/`[^`\n]*`/g, ''));
  }
  return kept.join('\n');
}

/**
 * The body of a level-2 section (comments removed), or null when the heading is absent. The match is exact, so
 * `Scope` never matches `Scope exceptions`.
 * @param {string} text
 * @param {string} name
 * @returns {string | null}
 */
export function sectionBody(text, name) {
  const rows = stripComments(text).split('\n');
  const start = rows.findIndex((row) => {
    const m = /^##\s+(.*?)\s*#*\s*$/.exec(row);
    return m !== null && m[1].toLowerCase() === name.toLowerCase();
  });
  if (start === -1) return null;
  const body = [];
  for (const row of rows.slice(start + 1)) {
    if (/^#{1,2}\s/.test(row)) break;
    body.push(row);
  }
  return body.join('\n').trim();
}

/** Table cells of one row, or null when the line is not a table row or is the separator row. */
function cellsOf(line) {
  if (!/^\s*\|/.test(line)) return null;
  const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  return cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '') ? null : cells;
}

const unquote = (text) => text.trim().replace(/^`+|`+$/g, '').trim();

/**
 * The Scope section of a card.md: write paths with their permission, and whether it says `read-only` on a line
 * of its own. Reads table rows and list items; a row without a recognised permission is ignored.
 * @param {string} cardText
 * @returns {{ found: boolean, writes: ScopeWrite[], readOnly: boolean }}
 */
export function parseScope(cardText) {
  const body = sectionBody(cardText, 'Scope');
  if (body === null) return { found: false, writes: [], readOnly: false };
  /** @type {ScopeWrite[]} */
  const writes = [];
  let readOnly = false;
  for (const line of body.split('\n')) {
    const cells = cellsOf(line);
    let path;
    let rest;
    if (cells !== null) {
      if (/^path$/i.test(unquote(cells[0]))) continue;
      path = unquote(cells[0]);
      rest = cells.slice(1).join(' ');
    } else {
      const item = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
      if (item === null) {
        if (/^`?read-only`?(?:\s*[:.—–-].*)?$/i.test(line.trim())) readOnly = true;
        continue;
      }
      if (/^`?read-only`?(?:\s*[:.—–-].*)?$/i.test(item[1].trim())) {
        readOnly = true;
        continue;
      }
      const tick = /^`([^`]+)`(.*)$/.exec(item[1]);
      if (tick !== null) [path, rest] = [tick[1], tick[2]];
      else continue;
    }
    const permission = /\b(add|edit|remove|read-only)\b/i.exec(rest);
    if (path === '' || permission === null) continue;
    const kind = permission[1].toLowerCase();
    if (WRITE_KINDS.includes(kind)) writes.push({ path: slashes(path), kind: /** @type {WriteKind} */ (kind) });
  }
  return { found: true, writes, readOnly };
}

/** Module names from the readable Scope table's Blast radius column. */
export function parseBlastRadius(cardText) {
  const body = sectionBody(cardText, 'Scope');
  if (body === null) return { found: false, modules: [] };
  let column = -1;
  const modules = new Set();
  for (const line of body.split('\n')) {
    const cells = cellsOf(line);
    if (cells === null) continue;
    const header = cells.findIndex((cell) => /^blast radius$/i.test(unquote(cell)));
    if (header >= 0) {
      column = header;
      continue;
    }
    if (column < 0 || /^path$/i.test(unquote(cells[0]))) continue;
    const cell = cells[column] ?? '';
    const annotated = cell.includes(';') || cell.includes('(');
    for (const part of cell.split(annotated ? ';' : ',')) {
      const entry = unquote(part);
      const name = annotated ? entry.replace(/\s+\([^()]*\)$/, '') : entry;
      const layerOnly = annotated && /^(?:composition|shared|frontend|api(?:\/(?:frontend|internal|public))?|entry|application|domain|infrastructure)$/i.test(name) && name === entry;
      if (name !== '' && name !== '-' && !/^none$/i.test(name) && !layerOnly) modules.add(name);
    }
  }
  return { found: column >= 0, modules: [...modules].sort() };
}

/**
 * The accepted rows of the Scope exceptions log in a context.md: dated, with a path, a kind of add, edit or remove,
 * and a reason. Header, placeholder and incomplete rows are ignored. Never throws.
 * @param {string} contextText
 * @returns {ScopeException[]}
 */
export function parseScopeExceptions(contextText) {
  const body = sectionBody(contextText, 'Scope exceptions');
  if (body === null) return [];
  /** @type {ScopeException[]} */
  const entries = [];
  for (const line of body.split('\n')) {
    const item = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    const cells = cellsOf(line) ?? (item === null ? null : item[1].split('|').map((c) => c.trim()));
    if (cells === null || cells.length < 4) continue;
    const [date, path, kind, reason, approvedBy = ''] = cells;
    if (!/^\d{4}-\d{2}-\d{2}/.test(date) || unquote(path) === '' || !WRITE_KINDS.includes(unquote(kind).toLowerCase()) || reason === '') continue;
    entries.push({ date, path: slashes(unquote(path)), kind: /** @type {WriteKind} */ (unquote(kind).toLowerCase()), reason, approvedBy });
  }
  return entries;
}

/**
 * Text of a contract file in the card's folder in the working tree, or null when the card is not on the board or the
 * file cannot be read. Never throws.
 * @param {string} projectDir
 * @param {string} id
 * @param {string} name
 * @returns {{ path: string, text: string | null } | null} null when the card is not on the board
 */
export function readContractFile(projectDir, id, name) {
  let located = null;
  try {
    located = cardPath(projectDir, id);
  } catch {
    located = null;
  }
  if (!located) return null;
  const file = `${located.dir}/${name}`;
  try {
    return { path: file, text: lf(readFileSync(file, 'utf8')) };
  } catch {
    return { path: file, text: null };
  }
}

/**
 * The scope exceptions log of a card as it is in the working tree; empty when there is none. Never throws.
 * @param {string} projectDir
 * @param {string} id
 * @returns {ScopeException[]}
 */
export function readScopeExceptions(projectDir, id) {
  const file = readContractFile(projectDir, id, CONTRACT_FILES.context);
  return file?.text ? parseScopeExceptions(file.text) : [];
}
