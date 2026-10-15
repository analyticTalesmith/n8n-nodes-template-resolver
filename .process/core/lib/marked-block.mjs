import { toLf } from './files.mjs';
import { readFileSync } from 'node:fs';

export const BLOCK_BEGIN = '<!-- aperture:begin -->';
export const BLOCK_END = '<!-- aperture:end -->';

/** The file's markers are not one begin line followed by one end line, so the block has no safe place. */
export class MarkedBlockError extends Error {
  /**
   * @param {string} file
   * @param {number} begins
   * @param {number} ends
   * @param {string} [begin] the begin marker this file uses
   * @param {string} [end] the end marker this file uses
   */
  constructor(file, begins, ends, begin = BLOCK_BEGIN, end = BLOCK_END) {
    super(`${file} has ${begins} "${begin}" and ${ends} "${end}" markers that are not one begin line followed by one end line.`);
    this.name = 'MarkedBlockError';
    this.file = file;
    this.begins = begins;
    this.ends = ends;
  }
}

const endLine = (text) => (text.endsWith('\n') ? text : `${text}\n`);

const occurrences = (text, marker) => {
  const at = [];
  for (let i = text.indexOf(marker); i !== -1; i = text.indexOf(marker, i + 1)) at.push(i);
  return at;
};
const onOwnLine = (text, index, marker) => {
  const before = text[index - 1];
  const after = text.slice(index + marker.length, index + marker.length + 2);
  // A byte order mark is not text: a marker right after it on the first line is still at a line start.
  const lineStart = before === undefined || before === '\n' || (index === 1 && before === '\uFEFF');
  return lineStart && (after === '' || after.startsWith('\n') || after === '\r\n');
};

/**
 * BLOCK_BEGIN, LF, the body (LF-normalised, ending in LF), BLOCK_END, LF.
 * @param {string} body
 */
export function wrapBlock(body) {
  return `${BLOCK_BEGIN}\n${endLine(toLf(body))}${BLOCK_END}\n`;
}

/**
 * Where the one marked block sits: the index of the begin marker and of the end marker, or null when the text has no
 * marker at all. Anything but one begin line followed by one end line is refused.
 * @param {string} text
 * @param {string} file the name used in the error message
 * @param {string} [begin]
 * @param {string} [end]
 * @returns {{ begin: number, end: number } | null}
 * @throws {MarkedBlockError}
 */
export function locateBlock(text, file, begin = BLOCK_BEGIN, end = BLOCK_END) {
  const begins = occurrences(text, begin);
  const ends = occurrences(text, end);
  if (begins.length === 0 && ends.length === 0) return null;
  const valid =
    begins.length === 1 &&
    ends.length === 1 &&
    begins[0] < ends[0] &&
    onOwnLine(text, begins[0], begin) &&
    onOwnLine(text, ends[0], end);
  if (!valid) throw new MarkedBlockError(file, begins.length, ends.length, begin, end);
  return { begin: begins[0], end: ends[0] };
}

/**
 * Puts the Aperture block into a file's text without touching anything outside it. A CRLF file stays CRLF.
 * @param {string | null} existing the current file text, or null when there is no file
 * @param {string} block from wrapBlock
 * @param {string} file the name used in the error message
 * @returns {{ text: string, result: 'created' | 'inserted' | 'replaced' | 'unchanged' }}
 */
export function insertBlock(existing, block, file) {
  if (existing === null) return { text: block, result: 'created' };
  const breaks = existing.match(/\r?\n/g) ?? [];
  const eol = breaks.length > 0 && breaks.every((b) => b === '\r\n') ? '\r\n' : '\n';
  const shaped = eol === '\n' ? block : block.replaceAll('\n', '\r\n');
  const found = locateBlock(existing, file);
  if (found === null) {
    const lead = existing === '' || existing.endsWith('\n') ? '' : eol;
    return { text: `${existing}${lead}${eol}${shaped}`, result: 'inserted' };
  }
  const innerStart = existing.indexOf('\n', found.begin) + 1;
  const inner = existing.slice(innerStart, found.end);
  const next = shaped.slice(BLOCK_BEGIN.length + eol.length, shaped.length - BLOCK_END.length - eol.length);
  if (inner === next) return { text: existing, result: 'unchanged' };
  return { text: existing.slice(0, innerStart) + next + existing.slice(found.end), result: 'replaced' };
}

/**
 * Reads a file as UTF-8, refusing bytes that would not survive the write-back. A byte order mark is kept.
 * @param {string} path
 */
export function readUtf8Strict(path) {
  const bytes = readFileSync(path);
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch (cause) {
    throw new TypeError(`${path} is not valid UTF-8.`, { cause });
  }
}

/**
 * The AGENTS.md block body: Codex reads AGENTS.md and imports nothing, so the routing card is copied in
 * verbatim, followed by the lines on what differs in Codex.
 * @param {string} routingText
 * @param {string} agentsTemplate
 */
export function agentsBody(routingText, agentsTemplate) {
  return `${endLine(toLf(routingText))}\n${endLine(toLf(agentsTemplate))}`;
}
