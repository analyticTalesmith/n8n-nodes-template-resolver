/** @typedef {import('../git.mjs').AddedLine} AddedLine */
/** @typedef {import('../git.mjs').Commit} Commit */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

import { shortSha } from '../git.mjs';
import { parseCardId } from '../card-id.mjs';

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

/** Name matching reads the same shapes as `ID_PATTERNS` in any case, plus the milestone code, which only names carry. */
const NAME_PATTERNS = [...ID_PATTERNS.map(({ pattern }) => pattern), /(?<![#\w.-])M\d+\b/].map((pattern) => new RegExp(pattern.source, 'gi'));

function tokensIn(text) {
  const hits = [];
  for (const scan of NAME_PATTERNS) for (const match of text.matchAll(scan)) hits.push({ index: match.index, token: match[0] });
  return hits.sort((a, b) => a.index - b.index).map((hit) => hit.token);
}

/**
 * Every id-like token in one name part, in any case. The lookbehind refuses a token that follows `-` or `.`, so the name is
 * also read from each point after a separator: `notes-t04.md` holds t04, `sc-1-notes` holds sc-1. A card id is read by its
 * slug only, because its agent-and-counter part (`b12`, `t10`) can look like a code.
 * @param {string} name
 * @returns {string[]}
 */
function idsInPart(name) {
  const card = parseCardId(name);
  const text = card ? card.slug : name;
  const found = new Set(tokensIn(text));
  for (const match of text.matchAll(/[-_. ]/g)) for (const token of tokensIn(text.slice(match.index + 1))) found.add(token);
  return [...found];
}

const idsInName = (name) => [...new Set(name.split('/').flatMap(idsInPart))];

const ADDED_STATUSES = new Set(['A', 'R', 'C']);

/**
 * Finds ids in added code lines (outside docs/), commit messages, the names of added or renamed paths and the branch.
 * Missing or malformed input is skipped, never thrown on.
 * @param {{ addedLines?: AddedLine[] | null, commits?: Commit[] | null, changes?: { status: string, path: string }[] | null, branch?: string | null }} [input]
 * @returns {Finding[]}
 */
export function checkNoIds({ addedLines, commits, changes, branch } = {}) {
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
      message: `Commit ${shortSha(String(sha))} holds ${found.join(', ')}. Reword the commit message to say what changed, without ids.`,
    });
  }
  for (const change of Array.isArray(changes) ? changes : []) {
    if (typeof change?.path !== 'string' || !ADDED_STATUSES.has(change.status)) continue;
    const found = idsInName(change.path);
    if (found.length === 0) continue;
    findings.push({
      rule: 'ids-in-name',
      message: `The added path ${change.path} holds ${found.join(', ')} in its name. Rename it to describe what it is, without ids.`,
      path: change.path,
    });
  }
  if (typeof branch === 'string') {
    const found = idsInName(branch);
    if (found.length > 0) {
      findings.push({
        rule: 'ids-in-branch',
        message: `The branch ${branch} holds ${found.join(', ')}. Rename it to describe the work in plain words, without ids.`,
      });
    }
  }
  return findings;
}
