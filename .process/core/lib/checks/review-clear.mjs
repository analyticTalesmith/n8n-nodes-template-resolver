import { relative, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { cardPath } from '../board.mjs';
import { CARD_FILES, cardFile } from '../card-files.mjs';
import { sha256Bytes, toPosix } from '../files.mjs';
import { GitError } from '../git.mjs';
import { readGateRun } from '../gate-run.mjs';
import { currentDiffSha256, readRounds, roundsReport } from '../rounds.mjs';
import { localPacketFresh } from '../local-docs-attestation.mjs';
import { resolveProjectRoots } from '../project-roots.mjs';
import { scriptCommand } from '../script-command.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

/** The card's rounds file relative to the project, for finding paths. */
const roundsPath = (projectDir, card) => {
  const found = cardPath(projectDir, card.id);
  if (found === null) return CARD_FILES.rounds;
  const roots = resolveProjectRoots(projectDir);
  const root = roots.mode === 'local' ? roots.docsRoot : resolve(projectDir);
  const prefix = roots.mode === 'local' ? 'docs/' : '';
  return `${prefix}${toPosix(relative(root, found.dir))}/${CARD_FILES.rounds}`;
};

/** The tracked state, or null when it cannot be read. */
function load(projectDir, card) {
  try {
    return readRounds(projectDir, card.id);
  } catch {
    return null;
  }
}

const unreadable = (path, projectDir) => ({
  rule: 'review-missing',
  message: `${path} is unreadable, so no review round can be confirmed. Restore it from version control, or run ${scriptCommand(projectDir, 'review.mjs')} run and ${scriptCommand(projectDir, 'rounds.mjs')} record again.`,
  path,
});

/**
 * A review round must be recorded before the card leaves review, and the latest round must have reviewed the current
 * diff, or the last gate-verified closure must have closed over it. Without a recorded base commit the diff is not compared
 * (the diff checks already ask for the base).
 * @param {{ projectDir: string, card: Card }} input
 * @returns {Finding[]}
 */
export function checkReviewRecorded({ projectDir, card }) {
  const path = roundsPath(projectDir, card);
  const state = load(projectDir, card);
  if (state === null) {
    return [unreadable(path, projectDir)];
  }
  if (state.rounds.length === 0) {
    return [{ rule: 'review-missing', message: `No review round is recorded for ${card.id}. Run ${scriptCommand(projectDir, 'review.mjs')} run, then ${scriptCommand(projectDir, 'rounds.mjs')} record.`, path }];
  }
  const latest = state.rounds.at(-1);
  const again = `Run the review again: ${scriptCommand(projectDir, 'review.mjs')} run, then ${scriptCommand(projectDir, 'rounds.mjs')} record.`;
  let current;
  try {
    current = currentDiffSha256(projectDir, card);
  } catch (err) {
    if (!(err instanceof GitError)) throw err;
    return [{ rule: 'review-stale-round', message: `The current diff cannot be computed (${err.message}), so round ${latest.number} cannot be confirmed as a review of it. Fix the repository or the base commit, then check again.`, path }];
  }
  const closed = state.closures?.at(-1);
  const closureCurrent = closed !== undefined && closed.diff_sha256 === current && Date.parse(closed.at) >= Date.parse(latest.at);
  if (current !== null && latest.diff_sha256 !== current && !closureCurrent) {
    return [{ rule: 'review-stale-round', message: `The latest round (${latest.number}) reviewed an older diff than the current work. ${again}`, path }];
  }
  if (resolveProjectRoots(projectDir).mode === 'local') {
    let packet;
    let output;
    try {
      packet = readFileSync(cardFile(projectDir, card.id, CARD_FILES.packet), 'utf8');
      const outputText = readFileSync(cardFile(projectDir, card.id, CARD_FILES.reviewOutput), 'utf8');
      if (sha256Bytes(Buffer.from(outputText, 'utf8')) !== latest.output_sha256) throw new Error('review output changed');
      output = JSON.parse(outputText);
    } catch {
      return [{ rule: 'review-stale-round', message: `The local review packet or recorded review output is missing or changed. ${again}`, path }];
    }
    const packetHash = sha256Bytes(Buffer.from(packet, 'utf8'));
    if (output.packet_sha256 !== packetHash || !localPacketFresh(projectDir, packet)) {
      return [{ rule: 'review-stale-round', message: `Local documents changed after round ${latest.number}, or its packet cannot be verified. ${again}`, path }];
    }
  }
  return [];
}

/**
 * The gate run the packet quotes must be for the code now: a card with a gate command needs a recorded run whose diff
 * hash is the hash of the current diff. A card with no gate command, or no base commit to hash against, has nothing to compare.
 * @param {{ projectDir: string, card: Card }} input
 * @returns {Finding[]}
 */
function staleGateRun({ projectDir, card }) {
  const gates = /** @type {any} */ (card).gates;
  if (!Array.isArray(card.gate) && !(Array.isArray(gates) && gates.length > 0)) return [];
  let current;
  try {
    current = currentDiffSha256(projectDir, card);
  } catch (err) {
    if (!(err instanceof GitError)) throw err;
    return [{ rule: 'gate-run-stale', message: `The current diff cannot be computed (${err.message}), so the recorded gate run cannot be matched to the code. Fix the repository or the base commit, then run ${scriptCommand(projectDir, 'gate.mjs')} ${projectDir} ${card.id} --to review again.`, path: roundsPath(projectDir, card) }];
  }
  if (current === null) {
    return [{ rule: 'gate-run-stale', message: `The card has no base commit, so the recorded gate run cannot be matched to the code. Move the card through ${scriptCommand(projectDir, 'card-move.mjs')} so its base commit is recorded, then run ${scriptCommand(projectDir, 'gate.mjs')} ${projectDir} ${card.id} --to review again.`, path: roundsPath(projectDir, card) }];
  }
  const run = readGateRun(projectDir, card.id);
  if (run !== null && run.exit_status === 0 && run.levels.every((entry) => entry.exit_status === 0) && run.diff_sha256 === current) return [];
  const why = run === null ? 'no gate run is recorded' : run.exit_status !== 0 ? 'the recorded gate run was not green' : 'the recorded gate run was made against other code';
  return [{ rule: 'gate-run-stale', message: `${why}, so the packet cannot say the gate was green for this work. Run ${scriptCommand(projectDir, 'gate.mjs')} ${projectDir} ${card.id} --to review again: it runs the gate command and rewrites the record.`, path: roundsPath(projectDir, card) }];
}

/**
 * No fix request may be open and no drift finding undecided, and the recorded gate run must be for the current code.
 * @param {{ projectDir: string, card: Card }} input
 * @returns {Finding[]}
 */
export function checkReviewClear({ projectDir, card }) {
  const stale = staleGateRun({ projectDir, card });
  const state = load(projectDir, card);
  if (state === null || state.rounds.length === 0) return stale;
  const path = roundsPath(projectDir, card);
  let report;
  try {
    report = roundsReport(state, projectDir);
  } catch {
    return [unreadable(path, projectDir)];
  }
  const byLabel = new Map(state.findings.map((f) => [f.label, f]));
  /** @type {Finding[]} */
  const findings = [...stale];
  for (const label of report.fixRequests) {
    const f = byLabel.get(label);
    findings.push({
      rule: 'review-open-findings',
      message: `Finding ${label} (${f.class}, ${f.status}) is still a fix request. Fix it and get it withdrawn in the next round, or have the Review lead rule on it (${scriptCommand(projectDir, 'rounds.mjs')} rule).`,
      path,
    });
  }
  for (const label of report.undecided) {
    findings.push({
      rule: 'review-undecided-drift',
      message: `Drift finding ${label} is undecided. File it as a backlog card (${scriptCommand(projectDir, 'rounds.mjs')} file --finding ${label}) or withdraw it (${scriptCommand(projectDir, 'rounds.mjs')} rule --finding ${label} --ruling withdraw --note <why>).`,
      path,
    });
  }
  return findings;
}
