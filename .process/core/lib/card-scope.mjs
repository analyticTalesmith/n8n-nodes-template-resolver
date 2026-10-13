import { scriptCommand } from './script-command.mjs';

/** The generated Scope table of a card.md: card.json is the source, the table is written from it. */

export const SCOPE_BEGIN = '<!-- generated scope: from card.json -->';
export const SCOPE_END = '<!-- end generated scope -->';
/** The command that rewrites a card's generated Scope table, for the project that runs it. */
export const scopeSyncCommand = (projectDir) => `${scriptCommand(projectDir, 'card-scope.mjs')} sync <projectDir> <cardId>`;

const KINDS = ['add', 'edit', 'remove'];
const slashes = (path) => String(path).replaceAll('\\', '/').replace(/^(\.\/)+/, '');
const strings = (value) => (Array.isArray(value) ? value.filter((s) => typeof s === 'string') : []);

/** The blast radius cell of a card: its module names, or `none` when it declares none. */
export function blastCell(card) {
  const names = [...new Set(strings(card?.blast_radius))].filter((name) => name !== 'none').sort();
  return names.length > 0 ? names.join(', ') : 'none';
}

/**
 * The first path of a card that cannot be written into a table cell (a backtick or a line break), or null.
 * @param {any} card
 * @returns {string | null}
 */
export function unsafeScopePath(card) {
  const manifest = card?.manifest !== null && typeof card?.manifest === 'object' ? card.manifest : {};
  return [...KINDS.flatMap((kind) => strings(manifest[kind])), ...strings(card?.files_scope)].find((path) => /[`\r\n]/.test(path)) ?? null;
}

/**
 * The generated block as written for a card: markers around a Path / Permission / Blast radius table with one row per
 * manifest path and a line naming files_scope. A card that writes no file gets the header only.
 * @param {any} card
 * @returns {string} LF line ends, no trailing newline
 */
export function renderScopeBlock(card) {
  const blast = blastCell(card);
  const manifest = card?.manifest !== null && typeof card?.manifest === 'object' ? card.manifest : {};
  const rows = KINDS.flatMap((kind) => [...new Set(strings(manifest[kind]).map(slashes))].sort().map((path) => `| \`${path.replaceAll('|', '\\|')}\` | ${kind} | ${blast} |`));
  const folders = [...new Set(strings(card?.files_scope).map(slashes))].sort();
  const line = `Files scope: ${folders.length > 0 ? folders.map((f) => `\`${f}\``).join(', ') : 'none'}`;
  return [SCOPE_BEGIN, '| Path | Permission (add, edit, remove) | Blast radius |', '| --- | --- | --- |', ...rows, '', line, SCOPE_END].join('\n');
}

/**
 * The generated block found in a card.md, or null when there is none (an old card) or its markers are unpaired.
 * @param {string} text
 * @returns {{ start: number, end: number, text: string } | null} offsets into text; text has LF line ends
 */
export function findScopeBlock(text) {
  const start = text.indexOf(SCOPE_BEGIN);
  if (start < 0) return null;
  const close = text.indexOf(SCOPE_END, start);
  if (close < 0) return null;
  const end = close + SCOPE_END.length;
  return { start, end, text: text.slice(start, end).replaceAll('\r\n', '\n') };
}

/** True when the card.md has a generated block that differs from what card.json would produce. */
export function scopeBlockStale(text, card) {
  const block = findScopeBlock(text);
  return block !== null && block.text !== renderScopeBlock(card);
}

const ROW = /^\s*(?:\||`?read-only`?(?:\s*[:.—–-].*)?$)/;

/**
 * The card.md text with its Scope block written from the card: an existing block is replaced in place; otherwise the
 * Scope section's table rows and read-only line give way to a new block placed right after the heading and every other line stays (the section ends at any heading). Line ends of the
 * input are kept. Returns the text unchanged when it has no Scope section to write into, with changed false.
 * @param {string} text
 * @param {any} card
 * @returns {{ text: string, changed: boolean, written: boolean }} written is false when there was nowhere to put the block
 */
export function applyScopeBlock(text, card) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const block = renderScopeBlock(card).replaceAll('\n', eol);
  const found = findScopeBlock(text);
  let next;
  if (found !== null) {
    next = text.slice(0, found.start) + block + text.slice(found.end);
  } else {
    const lines = text.split(/(?<=\n)/);
    const heading = lines.findIndex((line) => /^##\s+scope\s*#*\s*$/i.test(line.trim()));
    if (heading < 0) return { text, changed: false, written: false };
    let stop = lines.length;
    let fenced = false;
    for (let i = heading + 1; i < lines.length; i++) {
      if (!fenced && /^#{1,6}\s/.test(lines[i])) { stop = i; break; }
      if (lines[i].includes('<!--') && !lines[i].includes('-->')) fenced = true;
      else if (fenced && lines[i].includes('-->')) fenced = false;
    }
    let inComment = false;
    const kept = lines.slice(heading + 1, stop).filter((line) => {
      const wasIn = inComment;
      if (!wasIn && line.includes('<!--') && !line.includes('-->')) inComment = true;
      else if (wasIn && line.includes('-->')) inComment = false;
      return wasIn || line.includes('<!--') || !ROW.test(line.trimEnd());
    });
    while (kept.length > 0 && kept[0].trim() === '') kept.shift();
    while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop();
    const ended = (l) => (l.endsWith('\n') ? l : l + eol);
    const parts = [...lines.slice(0, heading), ended(lines[heading]), eol, block, eol];
    if (kept.length > 0) parts.push(eol, ...kept.map(ended));
    if (stop < lines.length) parts.push(eol, ...lines.slice(stop));
    next = parts.join('');
  }
  return { text: next, changed: next !== text, written: true };
}
