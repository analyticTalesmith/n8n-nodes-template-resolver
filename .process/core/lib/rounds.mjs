import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BoardError, cardPath, readCard, slugify, writeCard } from './board.mjs';
import { CARD_FILES, cardFile, deltaDeliverables, isCardProcessPath } from './card-files.mjs';
import { sha256Bytes, toPosix } from './files.mjs';
import { BACKLOG_DIR, CARD_MD, PROCESS_DIR } from './layout.mjs';
import { changedSince, projectRootOf, reviewPatch, runGit } from './git.mjs';
import { headCommitOrNull, readGateRun } from './gate-run.mjs';
import { writeIndexes } from './index-docs.mjs';
import { resolveProjectRoots } from './project-roots.mjs';
import { reviewOwnPaths } from './review-scope.mjs';
import { EVIDENCE_KINDS, RULINGS, isEvidenceEntry } from './review-schema.mjs';
import { createCard } from '../scripts/card-new.mjs';
import { scriptCommand } from './script-command.mjs';
import { isPlainObject } from './types.mjs';

/** @typedef {import('./card.mjs').Card} Card */
/** @typedef {import('./review-schema.mjs').ReviewFinding} ReviewFinding */
/** @typedef {import('./review-schema.mjs').ReviewResponse} ReviewResponse */
/** @typedef {import('../scripts/review.mjs').ReviewLabel} ReviewLabel */
/** @typedef {'open' | 'fixed' | 'rebutted' | 'sustained' | 'withdrawn' | 'filed' | 'verified'} FindingStatus */
/** @typedef {{ after_round: number, restate: string, verify: string, action: 'fixed' | 'rebut', ground?: 'evidence' | 'drift', evidence: string[] }} Reply */
/** @typedef {{ after_round: number, ruling: 'sustain' | 'withdraw' | 'drift', note: string }} Ruling */
/** @typedef {ReviewFinding & { label: string, raised_in: number, status: FindingStatus, sustained: number, failed_fixes: number, replies: Reply[], rulings: Ruling[], ticket?: string }} TrackedFinding */
/** @typedef {{ number: number, at: string, reviewer: ReviewLabel, output_sha256: string, diff_sha256: string, at_commit: string | null, restatement: string, brief_mismatch: string | null, evidence: string[], stalled: boolean, raised: string[], responses: ReviewResponse[] }} Round */
/** @typedef {{ finding: string, by: string, at: string, gate_commit: string, test: string, files: string[], diff_sha256: string | null }} Closure */
/** @typedef {{ card: string, rounds: Round[], findings: TrackedFinding[], closures?: Closure[] }} RoundsState */
/** @typedef {{ round: number, stalled: boolean, fixRequests: string[], undecided: string[], backToShaping: string[], briefMismatch: string | null, clear: boolean, messages: string[] }} RoundsReport */

/** The start of the messages line that carries the reviewer's brief mismatch text. */
export const MISMATCH_PREFIX = 'The reviewer says the brief has a defect for the lead: ';

export const FIX_CLASSES = Object.freeze(['defect', 'goal-risk']);
export const BACK_TO_SHAPING_AFTER = 2;
export const REPLY_TEXT_MAX = 200;
const TICKET_TITLE_MAX = 120;
const LOG_HEADER = 'Generated from review-rounds.json by core/scripts/rounds.mjs; edits here are overwritten.';
const LIVE = ['open', 'fixed', 'rebutted', 'sustained'];
const REPLY_ACTIONS = ['fixed', 'rebut'];
const GROUNDS = ['evidence', 'drift'];
const TICKET_TYPES = ['improvement', 'bug'];

export class RoundsError extends Error {
  /** @param {'rounds-no-review' | 'rounds-review-reused' | 'rounds-unknown-finding' | 'rounds-input-invalid' | 'rounds-not-drift' | 'rounds-close-refused' | 'review-output-stale'} rule @param {string} message */
  constructor(rule, message) {
    super(message);
    this.name = 'RoundsError';
    this.rule = rule;
  }
}

const invalid = (message) => new RoundsError('rounds-input-invalid', message);
const sha256 = (text) => sha256Bytes(Buffer.from(text, 'utf8'));
const isFix = (finding) => FIX_CLASSES.includes(finding.class);
const isLive = (finding) => LIVE.includes(finding.status);
const isList = (value) => Array.isArray(value);
const isRound = (r) => isPlainObject(r) && typeof r.number === 'number' && isList(r.raised) && isList(r.responses);
const isStoredFinding = (f) =>
  isPlainObject(f) && typeof f.label === 'string' && typeof f.class === 'string' && typeof f.status === 'string' && isPlainObject(f.serves) && isList(f.evidence) && isList(f.replies) && isList(f.rulings);
const isClosure = (c) =>
  isPlainObject(c) && ['finding', 'by', 'at', 'gate_commit', 'test'].every((key) => typeof c[key] === 'string') && isList(c.files) && c.files.every((path) => typeof path === 'string') && (c.diff_sha256 === null || typeof c.diff_sha256 === 'string');
const oneLine = (text) => String(text).replace(/\s+/g, ' ').trim();

/**
 * The working-patch hash for the card's recorded base commit, as the packet records it; null when no base is recorded.
 * @param {string} projectDir
 * @param {Card} card
 * @param {import('./git.mjs').GitRunner} [run]
 * @returns {string | null}
 */
export function currentDiffSha256(projectDir, card, run = runGit) {
  const base = /** @type {{ base_commit?: unknown }} */ (card).base_commit;
  return typeof base === 'string' && base !== '' ? reviewPatch(projectDir, base, run, { include: deltaDeliverables(projectDir, card), own: reviewOwnPaths(card) }).sha256 : null;
}

const short = (hash) => String(hash).slice(0, 12);

/** The card folder, or a BoardError when the card is not on the board. */
function folderOf(projectDir, id) {
  const found = cardPath(projectDir, id);
  if (found === null) throw new BoardError(`Card ${id} is not on the board. Check the id with the board listing.`);
  return found.dir;
}

/**
 * The tracked state of a card's reviews; an empty state when no file exists.
 * @param {string} projectDir
 * @param {string} id
 * @returns {RoundsState}
 */
export function readRounds(projectDir, id) {
  const file = `${folderOf(projectDir, id)}/${CARD_FILES.rounds}`;
  if (!existsSync(file)) return { card: id, rounds: [], findings: [] };
  let state;
  try {
    state = JSON.parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    throw invalid(`${file} is unreadable (${cause.message}). Restore it from version control, or delete it and record the reviews again.`);
  }
  if (!isPlainObject(state) || !Array.isArray(state.rounds) || !Array.isArray(state.findings)) {
    throw invalid(`${file} is unreadable: it must be an object with rounds and findings lists. Restore it from version control.`);
  }
  if (!state.rounds.every(isRound) || !state.findings.every(isStoredFinding) || (state.closures !== undefined && !(isList(state.closures) && state.closures.every(isClosure)))) {
    throw invalid(`${file} is unreadable: every round, finding and closure must be a complete object. Restore it from version control, or delete it and record the reviews again.`);
  }
  return state;
}

/**
 * @param {RoundsState} state
 * @returns {RoundsReport}
 */
export function roundsReport(state, projectDir) {
  const latest = state.rounds.at(-1);
  const fixRequests = state.findings.filter((f) => isFix(f) && isLive(f)).map((f) => f.label);
  const undecided = state.findings.filter((f) => f.class === 'drift' && f.status === 'open').map((f) => f.label);
  const backToShaping = state.findings.filter((f) => f.failed_fixes >= BACK_TO_SHAPING_AFTER && f.status !== 'withdrawn' && f.status !== 'filed' && f.status !== 'verified').map((f) => f.label);
  const stillOpen = [...fixRequests, ...undecided];
  const stalled = latest?.stalled === true && stillOpen.length > 0;
  const briefMismatch = latest?.brief_mismatch ?? null;
  const messages = [];
  if (stalled) {
    messages.push(
      `Round ${latest.number} is stalled: stalled means nothing new came in while ${stillOpen.join(', ')} still need a fix or a ruling. The Review lead rules on the open findings (${scriptCommand(projectDir, 'rounds.mjs')} rule); a dispute about the design itself goes to the human in todo.md.`,
    );
  }
  for (const label of backToShaping) {
    messages.push(`${label} was sustained ${BACK_TO_SHAPING_AFTER} times and its fix keeps failing, so the spec may be wrong. The lead considers moving the card to shaping (card-move <projectDir> <id> shaping --reason <why>).`);
  }
  if (briefMismatch !== null) messages.push(`${MISMATCH_PREFIX}${oneLine(briefMismatch)}`);
  const optional = state.findings.filter((f) => f.class === 'simplification' && f.status === 'open').map((f) => f.label);
  if (optional.length) messages.push(`Optional simplification findings, never blocking: ${optional.join(', ')}.`);
  return { round: state.rounds.length, stalled, fixRequests, undecided, backToShaping, briefMismatch, clear: state.rounds.length > 0 && fixRequests.length === 0 && undecided.length === 0, messages };
}

const evidenceLine = (list) => (list.length ? list.join(', ') : 'none');

/**
 * The full review.md.
 * @param {RoundsState} state
 * @returns {string}
 */
export function renderReviewLog(state) {
  const out = [LOG_HEADER, '', `# Review log: ${state.card}`, ''];
  for (const round of state.rounds) {
    out.push(`## Round ${round.number}`, '', `- Reviewer: ${round.reviewer?.label ?? 'unknown'}`, `- At: ${round.at}`, `- Stalled: ${round.stalled ? 'yes' : 'no'}`);
    out.push(`- Brief mismatch: ${round.brief_mismatch ?? 'none'}`, `- Raised: ${round.raised.length ? round.raised.join(', ') : 'none'}`, '', `Restatement: ${oneLine(round.restatement)}`, '');
    for (const r of round.responses) out.push(`- Response to ${r.finding}: ${r.verdict} (evidence: ${evidenceLine(r.evidence)})`);
    if (round.responses.length) out.push('');
  }
  if (state.closures?.length) {
    out.push('## Gate-verified closures', '');
    for (const c of state.closures) out.push(`- ${c.finding}: verified by ${c.by} at ${c.at}; gate run at commit ${short(c.gate_commit)}; test ${c.test}; files ${c.files.join(', ')}`);
    out.push('');
  }
  out.push('## Findings', '');
  if (state.findings.length === 0) out.push('None.', '');
  for (const f of state.findings) {
    out.push(`### ${f.label}: ${oneLine(f.title)}`, '', `- Class: ${f.class}`, `- Status: ${f.status}${f.ticket ? ` (${f.ticket})` : ''}`, `- Serves: ${f.serves.target}: ${oneLine(f.serves.scenario)}`);
    out.push(`- Raised in round ${f.raised_in}; sustained ${f.sustained}, failed fixes ${f.failed_fixes}`, `- Reproduction: ${oneLine(f.reproduction)}`, `- Evidence: ${evidenceLine(f.evidence)}`);
    for (const r of f.replies) {
      out.push(`- Reply after round ${r.after_round} (${r.action}${r.ground ? `, ${r.ground}` : ''}): restate: ${r.restate}; verify: ${r.verify}; evidence: ${evidenceLine(r.evidence)}`);
    }
    for (const r of f.rulings) out.push(`- Review lead ruling after round ${r.after_round}: ${r.ruling}: ${r.note}`);
    out.push('');
  }
  return `${out.join('\n').trimEnd()}\n`;
}

/**
 * Packet section 5 body.
 * @param {RoundsState} state
 * @returns {string}
 */
export function renderEarlierFindings(state) {
  const ruled = state.findings.filter((f) => f.status === 'withdrawn' || f.status === 'filed');
  const open = state.findings.filter((f) => f.status !== 'withdrawn' && f.status !== 'filed' && f.status !== 'verified');
  let opening = 'Answer each fix-class (defect or goal-risk) finding below in `responses` with sustain or withdraw and evidence. Raise new findings only about what the revision changed or an in-scope problem newly evidenced.';
  if (ruled.length) opening += ' A finding listed under Already ruled is decided: do not raise it again unless the revision touched it (say so in `responses`) or you have new evidence.';
  const out = [opening, ''];
  if (open.length === 0) out.push('No earlier findings remain open.');
  for (const f of open) {
    out.push(`### ${f.label}: ${oneLine(f.title)}`, '', `- Class: ${f.class}`, `- Serves: ${f.serves.target}: ${oneLine(f.serves.scenario)}`, `- Reproduction: ${oneLine(f.reproduction)}`, `- Status: ${f.status}`);
    for (const r of f.replies) {
      out.push(`- Reply (${r.action}${r.ground ? `, ${r.ground}` : ''}): restate: ${r.restate}; verify: ${r.verify}; evidence: ${evidenceLine(r.evidence)}`);
    }
    for (const r of f.rulings) out.push(`- Review lead ruling: ${r.ruling}: ${r.note}`);
    out.push('');
  }
  if (ruled.length) {
    out.push('### Already ruled', '');
    for (const f of ruled) {
      out.push(`- ${f.label}: ${oneLine(f.title)} (${f.class}, ${f.status})`);
      for (const r of f.rulings) out.push(`  - Review lead ruling: ${r.ruling}: ${r.note}`);
    }
    out.push('');
  }
  return out.join('\n').trimEnd();
}

/** Writes JSON state, then review.md, then (when given) the card's round count. */
function save(projectDir, id, state, card) {
  const dir = folderOf(projectDir, id);
  writeFileSync(`${dir}/${CARD_FILES.rounds}`, `${JSON.stringify(state, null, 2)}\n`);
  writeFileSync(`${dir}/${CARD_FILES.review}`, renderReviewLog(state));
  if (card !== undefined) writeCard(projectDir, id, { ...card, review_rounds: state.rounds.length });
}

const clone = (value) => JSON.parse(JSON.stringify(value));
const find = (state, label, projectDir) => {
  const found = state.findings.find((f) => f.label === label);
  if (found === undefined) throw new RoundsError('rounds-unknown-finding', `There is no finding ${label} on this card. Check the labels with ${scriptCommand(projectDir, 'rounds.mjs')} status.`);
  return found;
};

function checkText(name, value) {
  if (typeof value !== 'string' || value.trim() === '') throw invalid(`${name} must be a non-empty text. Write one line.`);
  if (/[\r\n]/.test(value)) throw invalid(`${name} must be a single line. Remove the line breaks.`);
  if (value.length > REPLY_TEXT_MAX) throw invalid(`${name} is ${value.length} characters; the limit is ${REPLY_TEXT_MAX}. Shorten it.`);
}

/**
 * Records the review in review-output.json as the next round.
 * @param {string} projectDir
 * @param {string} id
 * @param {{ now?: Date }} [options]
 * @returns {RoundsReport}
 */
export function recordRound(projectDir, id, { now = new Date() } = {}) {
  const card = readCard(projectDir, id);
  const state = readRounds(projectDir, id);
  const file = cardFile(projectDir, id, CARD_FILES.reviewOutput);
  if (!existsSync(file)) throw new RoundsError('rounds-no-review', `Card ${id} has no ${CARD_FILES.reviewOutput}. Run ${scriptCommand(projectDir, 'review.mjs')} run first.`);
  const text = readFileSync(file, 'utf8');
  const hash = sha256(text);
  if (state.rounds.some((r) => r.output_sha256 === hash)) {
    throw new RoundsError('rounds-review-reused', `This review was already recorded as a round. Run ${scriptCommand(projectDir, 'review.mjs')} run for a new review.`);
  }
  let output;
  try {
    output = JSON.parse(text);
  } catch (cause) {
    throw invalid(`${CARD_FILES.reviewOutput} is not valid JSON (${cause.message}). Run the review again.`);
  }
  if (!isPlainObject(output) || typeof output.restatement !== 'string' || typeof output.diff_sha256 !== 'string' || !isPlainObject(output.reviewer) || !Array.isArray(output.findings) || !Array.isArray(output.responses)) {
    throw invalid(`${CARD_FILES.reviewOutput} is not a review output (restatement, reviewer, diff_sha256, findings, responses). Run the review again.`);
  }

  const listOk = (value) => Array.isArray(value) && value.every(isEvidenceEntry);
  const wellFormed =
    output.responses.every((r) => isPlainObject(r) && typeof r.finding === 'string' && (r.verdict === 'sustain' || r.verdict === 'withdraw') && listOk(r.evidence)) &&
    output.findings.every((f) => isPlainObject(f) && typeof f.title === 'string' && listOk(f.evidence) && isPlainObject(f.serves));
  if (!wellFormed) throw invalid(`${CARD_FILES.reviewOutput} has findings or responses of the wrong shape. Run the review again.`);
  const again = `Run the review again: ${scriptCommand(projectDir, 'review.mjs')} run ${projectDir} ${id}.`;
  if (output.card !== id) throw new RoundsError('review-output-stale', `${CARD_FILES.reviewOutput} was written for card ${oneLine(output.card)}, not ${id}. ${again}`);
  const current = currentDiffSha256(projectDir, card);
  if (current !== null && output.diff_sha256 !== current) {
    throw new RoundsError('review-output-stale', `${CARD_FILES.reviewOutput} reviewed an older diff (${short(output.diff_sha256)}) than the current work (${short(current)}). ${again}`);
  }

  const next = clone(state);
  const number = next.rounds.length + 1;
  const evidence = new Set([`patch:${output.diff_sha256}`]);
  for (const response of output.responses) {
    const finding = find(next, response.finding);
    if (!isFix(finding) || !isLive(finding)) throw invalid(`Finding ${finding.label} is ${finding.class}/${finding.status}; only open fix-class findings take responses. Remove that response.`);
    for (const entry of response.evidence) evidence.add(entry);
    if (response.verdict === 'withdraw') finding.status = 'withdrawn';
    else {
      if (finding.status === 'fixed') finding.failed_fixes += 1;
      finding.status = 'sustained';
      finding.sustained += 1;
    }
  }
  for (const finding of state.findings) for (const reply of finding.replies) if (reply.after_round === number - 1) reply.evidence.forEach((entry) => evidence.add(entry));
  let sequence = Math.max(0, ...next.findings.map((f) => Number(f.label.slice(1))));
  const raised = [];
  for (const raw of output.findings) {
    const label = `f${++sequence}`;
    raised.push(label);
    raw.evidence.forEach((entry) => evidence.add(entry));
    next.findings.push({ ...raw, label, raised_in: number, status: 'open', sustained: 0, failed_fixes: 0, replies: [], rulings: [] });
  }
  const seen = new Set(next.rounds.flatMap((r) => r.evidence));
  const set = [...evidence].sort();
  next.rounds.push({
    number,
    at: now.toISOString(),
    reviewer: output.reviewer,
    output_sha256: hash,
    diff_sha256: output.diff_sha256,
    at_commit: headCommitOrNull(projectDir),
    restatement: output.restatement,
    brief_mismatch: output.brief_mismatch ?? null,
    evidence: set,
    stalled: number > 1 && set.every((entry) => seen.has(entry)),
    raised,
    responses: output.responses,
  });
  save(projectDir, id, next, card);
  return roundsReport(next, projectDir);
}

/**
 * Records the implementer's reply to a finding.
 * @param {string} projectDir
 * @param {string} id
 * @param {{ finding: string, restate: string, verify: string, action: 'fixed' | 'rebut', ground?: 'evidence' | 'drift', evidence?: string[] }} input
 * @returns {RoundsReport}
 */
export function replyToFinding(projectDir, id, input) {
  const state = readRounds(projectDir, id);
  const finding = find(state, input.finding, projectDir);
  checkText('restate', input.restate);
  checkText('verify', input.verify);
  if (!REPLY_ACTIONS.includes(input.action)) throw invalid(`action must be one of ${REPLY_ACTIONS.join(', ')}.`);
  const evidence = input.evidence ?? [];
  if (!Array.isArray(evidence) || !evidence.every(isEvidenceEntry)) {
    throw invalid(`Every evidence entry must look like <kind>:<ref> with a kind of ${EVIDENCE_KINDS.join(', ')}.`);
  }
  if (input.action === 'rebut') {
    if (!GROUNDS.includes(input.ground)) throw invalid(`A rebuttal needs a ground: one of ${GROUNDS.join(', ')}.`);
    if (evidence.length === 0) throw invalid('A rebuttal needs at least one evidence entry such as doc:<path>.');
  }
  if (!isFix(finding) || (finding.status !== 'open' && finding.status !== 'sustained')) {
    throw invalid(`Finding ${finding.label} is ${finding.class}/${finding.status}; only open or sustained defect and goal-risk findings take replies.`);
  }
  finding.replies.push({ after_round: state.rounds.length, restate: input.restate, verify: input.verify, action: input.action, ...(input.action === 'rebut' ? { ground: input.ground } : {}), evidence: [...evidence] });
  finding.status = input.action === 'fixed' ? 'fixed' : 'rebutted';
  save(projectDir, id, state);
  return roundsReport(state, projectDir);
}

/**
 * Records the Review lead's ruling on a finding. The role file says who rules; nothing here records or checks who ran it.
 * @param {string} projectDir
 * @param {string} id
 * @param {{ finding: string, ruling: 'sustain' | 'withdraw' | 'drift', note: string }} input
 * @returns {RoundsReport}
 */
export function ruleOnFinding(projectDir, id, input) {
  const state = readRounds(projectDir, id);
  const finding = find(state, input.finding, projectDir);
  if (!RULINGS.includes(input.ruling)) throw invalid(`ruling must be one of ${RULINGS.join(', ')}.`);
  checkText('note', input.note);
  const answeredIn = state.rounds.find((r) => r.number > finding.raised_in && r.responses.some((x) => x.finding === finding.label));
  if (answeredIn) {
    throw invalid(
      `Finding ${finding.label} was raised in round ${finding.raised_in} and the reviewer already answered it in round ${answeredIn.number}; its status is ${finding.status}. A ruling cannot override that answer: use the reply command (${scriptCommand(projectDir, 'rounds.mjs')} reply) to respond, or wait for the next review.`,
    );
  }
  if (finding.status === 'withdrawn' || finding.status === 'filed') throw invalid(`Finding ${finding.label} is already ${finding.status}; there is nothing to rule on.`);
  finding.rulings.push({ after_round: state.rounds.length, ruling: input.ruling, note: input.note });
  if (input.ruling === 'sustain') {
    finding.status = 'sustained';
  } else if (input.ruling === 'withdraw') finding.status = 'withdrawn';
  else {
    finding.class = 'drift';
    finding.status = 'open';
  }
  save(projectDir, id, state);
  return roundsReport(state, projectDir);
}

/**
 * The card body with the context under its first heading that is exactly `## Goal and why` (the ticket template) or
 * `## Context` (older cards); a missing heading is added at the end so the text is never dropped.
 */
export function withContext(body, context) {
  const placed = body.replace(/^## (Goal and why|Context)$/m, (heading) => `${heading}

${context}`);
  if (placed !== body) return placed;
  return `${body.trimEnd()}

## Context

${context}
`;
}

/**
/**
 * The folder whose backlog takes a follow-up ticket: the main checkout when the reviewed card is checked out in a linked
 * worktree of a project that keeps its documents in the repository, so the ticket is not a stray file in the card's own
 * change and a ticket number is never taken twice by parallel worktrees; the given folder otherwise.
 * @param {string} projectDir
 * @returns {string}
 */
export function backlogRoot(projectDir) {
  const root = projectRootOf(projectDir);
  if (root === projectDir || !existsSync(join(root, PROCESS_DIR, 'aperture.json'))) return projectDir;
  try {
    return resolveProjectRoots(projectDir).mode === 'shared' ? root : projectDir;
  } catch {
    return projectDir;
  }
}

/**
 * Files an undecided drift finding as a card in the global backlog whose origin is the cycle of the reviewed card. The
 * ticket goes into the backlog of the project root (see backlogRoot) and takes its number from there.
 * @param {string} projectDir
 * @param {string} id
 * @param {{ finding: string, type?: 'improvement' | 'bug' }} input
 * @returns {{ report: RoundsReport, ticket: Card, root: string }}
 */
export function fileDrift(projectDir, id, input) {
  const state = readRounds(projectDir, id);
  const finding = find(state, input.finding, projectDir);
  const type = input.type ?? 'improvement';
  if (!TICKET_TYPES.includes(type)) throw invalid(`type must be one of ${TICKET_TYPES.join(', ')}.`);
  if (finding.class !== 'drift' || finding.status !== 'open') {
    throw new RoundsError('rounds-not-drift', `Finding ${finding.label} is ${finding.class}/${finding.status}; only an open drift finding is filed as a card. Rule it drift first (${scriptCommand(projectDir, 'rounds.mjs')} rule --ruling drift).`);
  }
  let title;
  try {
    slugify(finding.title);
    title = `Follow-up: ${oneLine(finding.title)}`.slice(0, TICKET_TITLE_MAX).trimEnd();
  } catch {
    title = `Follow-up from ${id}`;
  }
  const origin = cardPath(projectDir, id).cycle;
  const root = backlogRoot(projectDir);
  const ticket = createCard(root, { title, type, origin });
  const mdFile = cardFile(root, ticket.id, CARD_MD);
  const context = [
    `Source card: ${id}`,
    `Finding: ${finding.label} (${finding.class})`,
    `Serves: ${finding.serves.target}: ${oneLine(finding.serves.scenario)}`,
    `Reproduction: ${oneLine(finding.reproduction)}`,
    ...finding.evidence.map((entry) => `Evidence: ${oneLine(entry)}`),
  ].join('\n');
  const body = readFileSync(mdFile, 'utf8');
  writeFileSync(mdFile, withContext(body, context));
  finding.status = 'filed';
  finding.ticket = ticket.id;
  save(projectDir, id, state);
  return { report: roundsReport(state, projectDir), ticket, root };
}

/**
 * Files every open drift finding of the card, in label order, each through fileDrift (which saves its own mark before the
 * next ticket is made, so an interrupted run resumes on the rest), then regenerates the indexes of the backlog root once.
 * Findings the lead ruled on are no longer open drift and are left alone.
 * @param {string} projectDir
 * @param {string} id
 * @param {{ type?: 'improvement' | 'bug' }} [input]
 * @returns {{ report: RoundsReport, tickets: Array<{ finding: string, ticket: Card }>, root: string }}
 */
export function fileAllDrift(projectDir, id, { type } = {}) {
  if (type !== undefined && !TICKET_TYPES.includes(type)) throw invalid(`type must be one of ${TICKET_TYPES.join(', ')}.`);
  const labels = readRounds(projectDir, id).findings.filter((f) => f.class === 'drift' && f.status === 'open').map((f) => f.label);
  const root = backlogRoot(projectDir);
  const tickets = labels.map((finding) => ({ finding, ticket: fileDrift(projectDir, id, { finding, type }).ticket }));
  if (tickets.length > 0) writeIndexes(root);
  return { report: roundsReport(readRounds(projectDir, id), projectDir), tickets, root };
}

const refuse = (why) => new RoundsError('rounds-close-refused', `${why} Run a full blind round instead (review run, then rounds record).`);
const normalPath = (path) => toPosix(String(path), { stripDotSlash: true });
/** Filed follow-up tickets and generated index files are written by file-drift, never part of a fix. */
const isFiledOrIndex = (path) => path.startsWith(`${BACKLOG_DIR}/`) || path.split('/').at(-1) === 'INDEX.md';
const looksLikeTest = (path) => path.split('/').some((part, i, parts) => ['test', 'tests', '__tests__'].includes(part) && i < parts.length - 1) || /\.(test|spec)\.|_test\.[^/]*$|_test$/.test(path.split('/').at(-1));
const listed = (paths) => `${paths.slice(0, 5).join(', ')}${paths.length > 5 ? `, and ${paths.length - 5} more` : ''}`;

/** Every modified, staged or untracked path in the working tree, with the old name of a rename too. */
function uncommittedPaths(projectDir, run) {
  const tokens = run(projectDir, ['status', '--porcelain', '-z', '--untracked-files=all']).split('\0').filter(Boolean);
  const paths = [];
  for (let i = 0; i < tokens.length; i += 1) {
    paths.push(normalPath(tokens[i].slice(3)));
    if (tokens[i][0] === 'R' || tokens[i][0] === 'C') paths.push(normalPath(tokens[++i]));
  }
  return paths;
}

/**
 * Closes fixed fix-class findings on the evidence of a green gate run instead of a second blind round. Everything is
 * checked before anything is written; any failed check is a RoundsError rounds-close-refused that says to run a full blind round.
 * The finding files are the given files, or the file part of each finding's location.
 * @param {string} projectDir
 * @param {string} id
 * @param {{ findings: string[], by: string, scopeUnchanged: boolean, test: string, files?: string[] }} input
 * @param {{ run?: import('./git.mjs').GitRunner, now?: Date }} [options]
 * @returns {RoundsReport}
 */
export function closeVerifiedByGate(projectDir, id, input, { run = runGit, now = new Date() } = {}) {
  if (typeof input.by !== 'string' || input.by.trim() === '') throw refuse('--by is required: say who states the scope is unchanged.');
  if (input.scopeUnchanged !== true) throw refuse('--scope-unchanged is required: the lead must state the card scope is unchanged.');
  if (typeof input.test !== 'string' || input.test.trim() === '') throw refuse('--test is required: name the test added or changed for the fix.');
  if (!Array.isArray(input.findings) || input.findings.length === 0) throw refuse('Name at least one finding.');
  const state = readRounds(projectDir, id);
  const named = input.findings.map((label) => find(state, label, projectDir));
  for (const f of named) {
    if (!isFix(f) || f.status !== 'fixed') throw refuse(`Finding ${f.label} is ${f.class}/${f.status}; only a defect or goal-risk finding the implementer replied fixed to can be closed this way.`);
  }
  const round = state.rounds.at(-1);
  if (typeof round?.at_commit !== 'string') throw refuse('The latest round has no recorded commit, so the changes since it cannot be told.');
  const test = normalPath(input.test);
  const files = (input.files ?? named.map((f) => f.location?.replace(/:\d+(?:[-:]\d+)?$/, ''))).filter((path) => typeof path === 'string' && path !== '').map(normalPath);
  if (files.length === 0) throw refuse('The findings name no file; pass --file for each file the fix changed.');
  const changed = changedSince(projectDir, round.at_commit, (path) => isCardProcessPath(path, id) || isFiledOrIndex(normalPath(path)), run).paths;
  const outside = changed.filter((path) => path !== test && !files.includes(path));
  if (outside.length > 0) throw refuse(`These paths changed since round ${round.number} and are neither a finding file nor the test: ${listed(outside)}.`);
  if (!changed.includes(test)) throw refuse(`The test ${test} was not added or changed since round ${round.number}; a fix needs a test.`);
  const sources = named.map((f) => f.location?.replace(/:\d+(?:[-:]\d+)?$/, '')).filter((path) => typeof path === 'string' && path !== '').map(normalPath);
  if (!looksLikeTest(test) || sources.includes(test) || !existsSync(join(projectDir, test))) {
    throw refuse(`--test ${test} must be a test file that still exists, changed since round ${round.number}, and is not the source file of a finding being closed: a path with a test, tests or __tests__ folder, or a name containing .test. or .spec. or ending in _test.`);
  }
  const dirty = uncommittedPaths(projectDir, run).filter((path) => !isCardProcessPath(path, id) && !isFiledOrIndex(path));
  if (dirty.length > 0) throw refuse(`These paths have uncommitted changes: ${listed(dirty)}. Commit them and rerun the gate first, so the green gate run covers the fix.`);
  const head = headCommitOrNull(projectDir, run);
  const gate = readGateRun(projectDir, id);
  if (gate === null) throw refuse('There is no gate run recorded for this card.');
  if (gate.exit_status !== 0) throw refuse(`The last gate run failed (exit status ${gate.exit_status}).`);
  if (head === null || gate.commit !== head) throw refuse('The last gate run was not at the current commit.');
  const diff = currentDiffSha256(projectDir, readCard(projectDir, id), run);
  for (const f of named) f.status = 'verified';
  state.closures = [...(state.closures ?? []), ...named.map((f) => ({ finding: f.label, by: input.by.trim(), at: now.toISOString(), gate_commit: head, test, files: [...new Set(files)], diff_sha256: diff }))];
  save(projectDir, id, state);
  return roundsReport(state, projectDir);
}

/**
 * Rewrites review.md from the state when it differs, and sets the card's review_rounds to the recorded round count when
 * they differ (a run that died between the two writes). Returns whether review.md was rewritten: false when it already
 * matches or there is no state file.
 * @param {string} projectDir
 * @param {string} id
 * @returns {boolean}
 */
export function syncReviewLog(projectDir, id) {
  const dir = folderOf(projectDir, id);
  if (!existsSync(`${dir}/${CARD_FILES.rounds}`)) return false;
  const state = readRounds(projectDir, id);
  const card = readCard(projectDir, id);
  if (card.review_rounds !== state.rounds.length) writeCard(projectDir, id, { ...card, review_rounds: state.rounds.length });
  const want = renderReviewLog(state);
  const log = `${dir}/${CARD_FILES.review}`;
  if (existsSync(log) && readFileSync(log, 'utf8') === want) return false;
  writeFileSync(log, want);
  return true;
}
