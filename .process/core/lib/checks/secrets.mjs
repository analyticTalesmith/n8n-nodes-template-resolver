/** @typedef {import('../git.mjs').AddedLine} AddedLine */
/** @typedef {import('../git.mjs').CommitLine} CommitLine */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

/** Secret shapes scanned for in added lines; two entries may share a name when one kind has two shapes. */
export const SECRET_PATTERNS = Object.freeze(
  [
    { name: 'private-key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
    { name: 'aws-access-key', pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/ },
    { name: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}/ },
    { name: 'github-token', pattern: /\bgithub_pat_[A-Za-z0-9_]{22,}/ },
    { name: 'slack-token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
    { name: 'api-secret-key', pattern: /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/ },
    { name: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{35}/ },
    { name: 'stripe-live-key', pattern: /\b[sr]k_live_[0-9A-Za-z]{16,}/ },
    { name: 'assigned-secret', pattern: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"\s]{16,}['"]/i },
  ].map((entry) => Object.freeze(entry)),
);

/** A line holding this marker is skipped. */
export const ALLOW_SECRET_MARKER = 'aperture-allow-secret';

const SHORT_SHA_LENGTH = 7;

/** Every pattern name one line matches, in pattern order; none for a marked or non-string line. */
function secretNames(text) {
  if (typeof text !== 'string' || text.includes(ALLOW_SECRET_MARKER)) return [];
  return SECRET_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ name }) => name);
}

/**
 * Finds secret-shaped text in the net added lines and in the lines each commit added, so a secret a later commit
 * deleted is still found. A hit in history is dropped when the net diff already reports the same file, line and
 * pattern, or the same file, pattern and line text (the secret is still there, on a moved line). A message names the
 * path, line and pattern (and the commit for a history hit), never the match.
 * @param {{ addedLines: AddedLine[], commitLines?: CommitLine[] }} input
 * @returns {Finding[]}
 */
export function checkSecrets({ addedLines, commitLines = [] }) {
  const hits = [];
  const seen = new Set();
  const advice = `Remove it and rotate it if it was ever real, read it from the environment instead, or end the line with ${ALLOW_SECRET_MARKER} if it is a deliberate fixture.`;
  for (const { path, line, text } of addedLines ?? []) {
    for (const name of secretNames(text)) {
      seen.add(`${path}\0${line}\0${name}`).add(`${path}\0${name}\0${text}`);
      hits.push({ path, line, finding: { rule: 'secret-in-diff', message: `${path} line ${line} looks like a ${name} secret. ${advice}`, path } });
    }
  }
  for (const { path, line, text, sha } of commitLines ?? []) {
    for (const name of secretNames(text)) {
      const at = `${path}\0${line}\0${name}`;
      const same = `${path}\0${name}\0${text}`;
      if (seen.has(at) || seen.has(same)) continue;
      seen.add(at).add(same);
      const commit = String(sha).slice(0, SHORT_SHA_LENGTH);
      hits.push({
        path,
        line,
        finding: {
          rule: 'secret-in-diff',
          message: `${path} line ${line} in commit ${commit} looks like a ${name} secret; it stays in history even if a later commit deleted it. ${advice} Rewrite the branch history before it is shared.`,
          path,
        },
      });
    }
  }
  return hits.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line)).map((hit) => hit.finding);
}
