import { relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cardPath } from '../board.mjs';
import { CARD_FILES, cardFile } from '../card-files.mjs';
import { GitError } from '../git.mjs';
import { currentDiffSha256, readRounds, roundsReport } from '../rounds.mjs';
import { localPacketFresh } from '../local-docs-attestation.mjs';
import { resolveProjectRoots } from '../project-roots.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

/** The card's rounds file relative to the project, for finding paths. */
const roundsPath = (projectDir, card) => {
  const found = cardPath(projectDir, card.id);
  if (found === null) return CARD_FILES.rounds;
  const roots = resolveProjectRoots(projectDir);
  const root = roots.mode === 'local' ? roots.docsRoot : resolve(projectDir);
  const prefix = roots.mode === 'local' ? 'docs/' : '';
  return `${prefix}${relative(root, found.dir).replaceAll('\\', '/')}/${CARD_FILES.rounds}`;
};

/** The tracked state, or null when it cannot be read. */
function load(projectDir, card) {
  try {
    return readRounds(projectDir, card.id);
  } catch {
    return null;
  }
}

const unreadable = (path) => ({
  rule: 'review-missing',
  message: `${path} is unreadable, so no review round can be confirmed. Restore it from version control, or run node core/scripts/review.mjs run and node core/scripts/rounds.mjs record again.`,
  path,
});

/**
 * A review round must be recorded before the card leaves review, and the latest round must have reviewed the current
 * diff. Without a recorded base commit the diff is not compared (the diff checks already ask for the base).
 * @param {{ projectDir: string, card: Card }} input
 * @returns {Finding[]}
 */
export function checkReviewRecorded({ projectDir, card }) {
  const path = roundsPath(projectDir, card);
  const state = load(projectDir, card);
  if (state === null) {
    return [unreadable(path)];
  }
  if (state.rounds.length === 0) {
    return [{ rule: 'review-missing', message: `No review round is recorded for ${card.id}. Run node core/scripts/review.mjs run, then node core/scripts/rounds.mjs record.`, path }];
  }
  const latest = state.rounds.at(-1);
  const again = 'Run the review again: node core/scripts/review.mjs run, then node core/scripts/rounds.mjs record.';
  let current;
  try {
    current = currentDiffSha256(projectDir, card);
  } catch (err) {
    if (!(err instanceof GitError)) throw err;
    return [{ rule: 'review-stale-round', message: `The current diff cannot be computed (${err.message}), so round ${latest.number} cannot be confirmed as a review of it. Fix the repository or the base commit, then check again.`, path }];
  }
  if (current !== null && latest.diff_sha256 !== current) {
    return [{ rule: 'review-stale-round', message: `The latest round (${latest.number}) reviewed an older diff than the current work. ${again}`, path }];
  }
  if (resolveProjectRoots(projectDir).mode === 'local') {
    let packet;
    let output;
    try {
      packet = readFileSync(cardFile(projectDir, card.id, CARD_FILES.packet), 'utf8');
      const outputText = readFileSync(cardFile(projectDir, card.id, CARD_FILES.reviewOutput), 'utf8');
      if (createHash('sha256').update(outputText).digest('hex') !== latest.output_sha256) throw new Error('review output changed');
      output = JSON.parse(outputText);
    } catch {
      return [{ rule: 'review-stale-round', message: `The local review packet or recorded review output is missing or changed. ${again}`, path }];
    }
    const packetHash = createHash('sha256').update(packet).digest('hex');
    if (output.packet_sha256 !== packetHash || !localPacketFresh(projectDir, packet)) {
      return [{ rule: 'review-stale-round', message: `Local documents changed after round ${latest.number}, or its packet cannot be verified. ${again}`, path }];
    }
  }
  return [];
}

/**
 * No fix request may be open and no drift finding undecided.
 * @param {{ projectDir: string, card: Card }} input
 * @returns {Finding[]}
 */
export function checkReviewClear({ projectDir, card }) {
  const state = load(projectDir, card);
  if (state === null || state.rounds.length === 0) return [];
  const path = roundsPath(projectDir, card);
  let report;
  try {
    report = roundsReport(state);
  } catch {
    return [unreadable(path)];
  }
  const byLabel = new Map(state.findings.map((f) => [f.label, f]));
  /** @type {Finding[]} */
  const findings = [];
  for (const label of report.fixRequests) {
    const f = byLabel.get(label);
    findings.push({
      rule: 'review-open-findings',
      message: `Finding ${label} (${f.class}, ${f.status}) is still a fix request. Fix it and get it withdrawn in the next round, or have the Review lead rule on it (node core/scripts/rounds.mjs rule).`,
      path,
    });
  }
  for (const label of report.undecided) {
    findings.push({
      rule: 'review-undecided-drift',
      message: `Drift finding ${label} is undecided. File it as a backlog card (node core/scripts/rounds.mjs file --finding ${label}) or withdraw it (node core/scripts/rounds.mjs rule --finding ${label} --ruling withdraw --note <why>).`,
      path,
    });
  }
  return findings;
}
