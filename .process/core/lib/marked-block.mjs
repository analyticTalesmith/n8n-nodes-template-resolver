import { readFileSync } from 'node:fs';

export const BLOCK_BEGIN = '<!-- aperture:begin -->';
export const BLOCK_END = '<!-- aperture:end -->';

/** The file's markers are not one begin line followed by one end line, so the block has no safe place. */
export class MarkedBlockError extends Error {
  /**
   * @param {string} file
   * @param {number} begins
   * @param {number} ends
   */
  constructor(file, begins, ends) {
    super(`${file} has ${begins} "${BLOCK_BEGIN}" and ${ends} "${BLOCK_END}" markers that are not one begin line followed by one end line.`);
    this.name = 'MarkedBlockError';
    this.file = file;
    this.begins = begins;
    this.ends = ends;
  }
}

const lf = (text) => text.replaceAll('\r\n', '\n');
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
  return `${BLOCK_BEGIN}\n${endLine(lf(body))}${BLOCK_END}\n`;
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
  const begins = occurrences(existing, BLOCK_BEGIN);
  const ends = occurrences(existing, BLOCK_END);
  if (begins.length === 0 && ends.length === 0) {
    const lead = existing === '' || existing.endsWith('\n') ? '' : eol;
    return { text: `${existing}${lead}${eol}${shaped}`, result: 'inserted' };
  }
  const valid =
    begins.length === 1 &&
    ends.length === 1 &&
    begins[0] < ends[0] &&
    onOwnLine(existing, begins[0], BLOCK_BEGIN) &&
    onOwnLine(existing, ends[0], BLOCK_END);
  if (!valid) throw new MarkedBlockError(file, begins.length, ends.length);
  const innerStart = existing.indexOf('\n', begins[0]) + 1;
  const inner = existing.slice(innerStart, ends[0]);
  const next = shaped.slice(BLOCK_BEGIN.length + eol.length, shaped.length - BLOCK_END.length - eol.length);
  if (inner === next) return { text: existing, result: 'unchanged' };
  return { text: existing.slice(0, innerStart) + next + existing.slice(ends[0]), result: 'replaced' };
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
  return `${endLine(lf(routingText))}\n${endLine(lf(agentsTemplate))}`;
}
