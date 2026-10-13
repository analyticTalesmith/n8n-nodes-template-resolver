/**
 * Frontmatter reading and single-field editing for living docs. Not a YAML parser.
 *
 * Supported: scalars, inline lists (one line or spanning lines), block lists, `#` comment lines,
 * LF or CRLF line endings, and a leading UTF-8 byte order mark (ignored for parsing, kept on write).
 *
 * An inline `[` that never closes before the closing --- is not guessed at: reading treats such a value as a plain
 * scalar, and setFrontmatterField refuses it with a FrontmatterError.
 */

const BOM = '﻿';
const FENCE = /^---[ \t]*$/;
const KEY_LINE = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/;
const ITEM_LINE = /^[ \t]*-(?:[ \t]+(.*))?$/;
const COMMENT_LINE = /^[ \t]*#/;
const ESCAPED_SCALAR = '!aperture-json ';

export class FrontmatterError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'FrontmatterError';
  }
}

const stripCr = (line) => (line.endsWith('\r') ? line.slice(0, -1) : line);
const eolOf = (line) => (line.endsWith('\r') ? '\r' : '');
const unquote = (value) => {
  const text = value.trim();
  return text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) ? text.slice(1, -1) : text;
};
const scalarOf = (value) => {
  if (value.startsWith(ESCAPED_SCALAR)) {
    try {
      const decoded = JSON.parse(value.slice(ESCAPED_SCALAR.length));
      if (typeof decoded === 'string') return decoded;
    } catch {
      // Keep malformed or historical values literal; reading frontmatter never fails on a scalar.
    }
  }
  return unquote(value);
};
/** The value after a key, with a comment-only value counted as empty. */
const valueOf = (raw) => {
  const value = raw.trim();
  return value.startsWith('#') ? '' : value;
};

/**
 * Splits a document into lines (keeping any carriage return on its line) and finds the frontmatter fences.
 * @param {string} text
 * @returns {{ lines: string[], close: number, bom: boolean, lastBracket: number } | null}
 */
function locate(text) {
  const bom = text.startsWith(BOM);
  const lines = (bom ? text.slice(1) : text).split('\n');
  if (!FENCE.test(stripCr(lines[0]))) return null;
  const close = lines.findIndex((line, index) => index > 0 && FENCE.test(stripCr(line)));
  if (close === -1) return null;
  let lastBracket = -1;
  for (let j = close - 1; j > 0 && lastBracket === -1; j -= 1) {
    if (lines[j].includes(']') && !COMMENT_LINE.test(lines[j])) lastBracket = j;
  }
  return { lines, close, bom, lastBracket };
}

/**
 * The last line of a block list whose items start at `from`, or -1 when there are no items.
 * Comment lines between items belong to the list.
 */
function blockEnd(lines, from, close) {
  let last = -1;
  for (let j = from; j < close; j += 1) {
    const line = stripCr(lines[j]);
    if (ITEM_LINE.test(line)) last = j;
    else if (!COMMENT_LINE.test(line)) break;
  }
  return last;
}

/**
 * Finds an inline list starting at line `i` with the given value. Linear in the lines it spans, and a list that
 * cannot close is rejected without scanning, so hostile input cannot force repeated scans.
 * @returns {null | { end: number, inner: string }} null when the value is not a list; end is -1 when it never closes
 */
function inlineList({ lines, lastBracket }, i, value) {
  if (!value.startsWith('[')) return null;
  if (lastBracket < i) return { end: -1, inner: '' };
  let joined = value;
  for (let j = i; j <= lastBracket; j += 1) {
    const piece = j === i ? value : stripCr(lines[j]);
    if (j > i) {
      if (COMMENT_LINE.test(piece)) continue;
      if (KEY_LINE.test(piece)) return { end: -1, inner: '' };
      joined += `\n${piece}`;
    }
    if (piece.includes(']')) return { end: j, inner: joined.slice(1, joined.indexOf(']')).trim() };
  }
  return { end: -1, inner: '' };
}

/**
 * Reads the frontmatter that living docs use: scalars, inline lists and block lists.
 * @param {string} text
 * @returns {Record<string, string | string[]> | null} null unless the text starts with a --- line closed by a later --- line
 */
export function readFrontmatter(text) {
  const found = locate(text);
  if (found === null) return null;
  const { lines, close } = found;
  /** @type {Record<string, string | string[]>} */
  const data = {};
  for (let i = 1; i < close; i += 1) {
    const match = KEY_LINE.exec(stripCr(lines[i]));
    if (match === null) continue;
    const [, key, raw] = match;
    const value = valueOf(raw);
    const list = inlineList(found, i, value);
    if (list !== null && list.end !== -1) {
      data[key] = list.inner === '' ? [] : list.inner.split(',').map(unquote);
      i = list.end;
      continue;
    }
    const last = value === '' ? blockEnd(lines, i + 1, close) : -1;
    if (last !== -1) {
      const items = [];
      for (let j = i + 1; j <= last; j += 1) {
        const item = ITEM_LINE.exec(stripCr(lines[j]));
        if (item !== null) items.push(unquote(item[1] ?? ''));
      }
      data[key] = items;
      i = last;
    } else {
      data[key] = scalarOf(value);
    }
  }
  return data;
}

const FIELD_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const BARE_VALUE = /^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/;

/**
 * Sets one scalar field, leaving every other byte as it was. Plain values are bare, other ordinary values are
 * double quoted, and values with backslashes or double quotes use a reserved JSON-string marker.
 * A key that appears more than once changes the occurrence the reader uses, the last one.
 * @param {string} text
 * @param {string} key
 * @param {string} value
 * @returns {string | null} null without frontmatter
 * @throws {RangeError} for a key that is not a plain name or a value with a line break
 * @throws {FrontmatterError} when the existing field is a list, malformed list exists, or the value cannot read back
 */
export function setFrontmatterField(text, key, value) {
  if (typeof key !== 'string' || !FIELD_KEY.test(key)) throw new RangeError(`not a usable frontmatter key: ${JSON.stringify(key)}`);
  if (typeof value !== 'string' || /[\r\n]/.test(value)) throw new RangeError('a frontmatter value must be one line');
  const found = locate(text);
  if (found === null) return null;
  const { lines, close, bom } = found;
  let target = -1;
  let isList = false;
  for (let i = 1; i < close; i += 1) {
    const match = KEY_LINE.exec(stripCr(lines[i]));
    if (match === null) continue;
    const raw = valueOf(match[2]);
    const list = inlineList(found, i, raw);
    if (list !== null && list.end === -1) throw new FrontmatterError(`the ${match[1]} list opens with [ but never closes with ]`);
    const last = list === null && raw === '' ? blockEnd(lines, i + 1, close) : -1;
    const end = list !== null && list.end !== -1 ? list.end : last;
    if (match[1] === key) {
      target = i;
      isList = end !== -1;
    }
    if (end !== -1) i = end;
  }
  if (isList) throw new FrontmatterError(`the ${key} field is a list and is not replaced`);
  // A trailing space would be trimmed on reading, so it is quoted even though the bare pattern allows it.
  const written = BARE_VALUE.test(value) && value === value.trimEnd()
    ? value
    : /[\\"]/.test(value) ? `${ESCAPED_SCALAR}${JSON.stringify(value)}` : `"${value}"`;
  const out = [...lines];
  if (target === -1) out.splice(close, 0, `${key}: ${written}${eolOf(lines[0])}`);
  else out[target] = `${key}: ${written}${eolOf(lines[target])}`;
  const result = (bom ? BOM : '') + out.join('\n');
  if (readFrontmatter(result)?.[key] !== value) throw new FrontmatterError(`the ${key} field did not read back as written`);
  return result;
}

/** The lifecycle states a project document can carry in its `state` key. */
export const DOC_STATES = Object.freeze(['planned', 'built', 'validated']);
export const PROVENANCE_RECOVERED = 'recovered';
export const COMMIT_HASH = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

/** Reads the recovered identity and commit without inferring either from the other. */
export function readRecovered(data) {
  return {
    recovered: data?.provenance === PROVENANCE_RECOVERED,
    recoveredAt: typeof data?.recovered_at === 'string' && data.recovered_at !== '' ? data.recovered_at : null,
  };
}

const SUMMARY_MAX = 160;
const BLOCK_SCALAR = /^[|>][-+0-9]*$/;

/**
 * Checks the minimal frontmatter of a project document: a one-line `summary`, a `state` that is optional
 * unless `requireState` is set (a state that is present must always be valid), and, for a ticket, an `origin`.
 * Other keys (including `claimed_in` and `introduced_in`) are allowed and not required.
 * @param {string} text
 * @param {{ ticket?: boolean, requireState?: boolean }} [options]
 * @returns {{ field: string, message: string }[]} empty when the document is fine
 */
export function checkDocFrontmatter(text, options = {}) {
  const data = typeof text === 'string' ? readFrontmatter(text) : null;
  if (data === null) return [{ field: 'frontmatter', message: 'the document must start with a --- frontmatter block closed by a second ---' }];
  /** @type {{ field: string, message: string }[]} */
  const findings = [];
  const summary = data.summary;
  if (typeof summary !== 'string' || summary.trim() === '') {
    findings.push({ field: 'summary', message: 'summary is required: one non-empty line' });
  } else if (BLOCK_SCALAR.test(summary) || /[\r\n]/.test(summary)) {
    findings.push({ field: 'summary', message: 'summary must be a single line' });
  } else if (summary.length > SUMMARY_MAX) {
    findings.push({ field: 'summary', message: `summary is ${summary.length} characters; the limit is ${SUMMARY_MAX}` });
  }
  const state = data.state;
  if (state === undefined ? options.requireState === true : !DOC_STATES.includes(state)) {
    findings.push({ field: 'state', message: `state must be one of ${DOC_STATES.join(', ')}` });
  }
  if (options.ticket === true && (typeof data.origin !== 'string' || data.origin.trim() === '')) {
    findings.push({ field: 'origin', message: 'a ticket needs an origin: the cycle or source it came from' });
  }
  if (data.provenance !== undefined && data.provenance !== PROVENANCE_RECOVERED) {
    findings.push({ field: 'provenance', message: 'provenance must be recovered when present' });
  }
  if (data.recovered_at !== undefined && data.recovered_at !== '' && (typeof data.recovered_at !== 'string' || !COMMIT_HASH.test(data.recovered_at))) {
    findings.push({ field: 'recovered_at', message: 'recovered_at must be a full lowercase commit hash when present' });
  }
  return findings;
}
