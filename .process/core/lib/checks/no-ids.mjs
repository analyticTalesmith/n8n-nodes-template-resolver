/** @typedef {import('../git.mjs').AddedLine} AddedLine */
/** @typedef {import('../git.mjs').Commit} Commit */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

// A match must not follow `#`, a word character, `-` or `.`, and must end at a boundary: hex colours, hyphenated compounds,
// base64url fragments and dotted names stay clear. The principle shape also excludes the elliptic-curve names.

/**
 * Id-like tokens, case-sensitive; each pattern matches the whole id, so `match[0]` is exactly what a message prints.
 * Known residue: a spreadsheet cell reference such as the branch shape can still match; end the line with the allow marker there.
 */
export const ID_PATTERNS = Object.freeze(
  [
    { name: 'success-criterion', pattern: /(?<![#\w.-])SC-\d+\b/ },
    { name: 'acceptance-scenario', pattern: /(?<![#\w.-])AS-\d+\b/ },
    { name: 'principle', pattern: /(?<![#\w.-])P-(?!(?:256|384|521)\b)\d+\b/ },
    { name: 'requirement', pattern: /(?<![#\w.-])FR-\d+\b/ },
    { name: 'threat', pattern: /(?<![#\w.-])T-[a-z]+-\d+\b/ },
    { name: 'task', pattern: /(?<![#\w.-])T\d{2}\b/ },
    { name: 'branch', pattern: /(?<![#\w.-])B\d{2}\b/ },
    { name: 'ticket', pattern: /(?<![#\w.-])TKT-\d+\b/ },
    { name: 'adr', pattern: /(?<![#\w.-])ADR[- ]?\d{3,4}\b/ },
  ].map((entry) => Object.freeze(entry)),
);

/** A line holding this marker is skipped. */
export const ALLOW_IDS_MARKER = 'aperture-allow-ids';

const SHORT_SHA_LENGTH = 7;

/**
 * Every id-like token in the text, in order of appearance. Anything but a string has none.
 * @param {unknown} text
 * @returns {string[]}
 */
export function findIds(text) {
  if (typeof text !== 'string') return [];
  const hits = [];
  for (const { pattern } of ID_PATTERNS) {
    const scan = new RegExp(pattern.source, 'g');
    for (const match of text.matchAll(scan)) hits.push({ index: match.index, token: match[0] });
  }
  return hits.sort((a, b) => a.index - b.index).map((hit) => hit.token);
}

/**
 * Ids in pull request text: line 1 is the title. One finding per line holding ids; the allow marker is not honoured.
 * Anything but a string is no text.
 * @param {unknown} text
 * @returns {Finding[]}
 */
export function checkPrText(text) {
  if (typeof text !== 'string') return [];
  /** @type {Finding[]} */
  const findings = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const found = findIds(line);
    if (found.length === 0) return;
    findings.push({ rule: 'ids-in-pr-text', message: `PR text line ${index + 1} holds ${found.join(', ')}; describe the change in plain words, without ids.` });
  });
  return findings;
}

const isDocsPath =(path) => typeof path === 'string' && path.startsWith('docs/');

/**
 * Finds ids in added code lines (outside docs/) and in commit messages. Missing or non-string text is skipped, never thrown on.
 * @param {{ addedLines?: AddedLine[] | null, commits?: Commit[] | null }} [input]
 * @returns {Finding[]}
 */
export function checkNoIds({ addedLines, commits } = {}) {
  /** @type {Finding[]} */
  const findings = [];
  for (const { path, line, text } of addedLines ?? []) {
    if (typeof text !== 'string' || isDocsPath(path) || text.includes(ALLOW_IDS_MARKER)) continue;
    const found = findIds(text);
    if (found.length === 0) continue;
    findings.push({
      rule: 'ids-in-code',
      message: `${path} line ${line} holds ${found.join(', ')}. Ids belong in docs and plans only: describe the behavior instead, or end the line with ${ALLOW_IDS_MARKER} if it is deliberate.`,
      path,
    });
  }
  for (const { sha, subject, body } of commits ?? []) {
    if (typeof subject !== 'string') continue;
    const found = findIds(`${subject}\n${typeof body === 'string' ? body : ''}`);
    if (found.length === 0) continue;
    findings.push({
      rule: 'ids-in-commit',
      message: `Commit ${String(sha).slice(0, SHORT_SHA_LENGTH)} holds ${found.join(', ')}. Reword the commit message to say what changed, without ids.`,
    });
  }
  return findings;
}
