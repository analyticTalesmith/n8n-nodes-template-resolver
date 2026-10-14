import { existsSync, readFileSync } from 'node:fs';
import { archivedIds, cardPath, isCardId } from './board.mjs';
import { VERIFY_TYPES } from './card.mjs';
import { CARD_FILES, workFile } from './card-files.mjs';
import { checkFrozen } from './checks/frozen.mjs';
import { parseRedEvidence } from './checks/red-evidence.mjs';
import { CycleError, readCycle } from './cycle.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./card.mjs').Card} Card */
/** @typedef {{ projectDir: string, card: Card, from: string, to: string, tier: string, concerns?: Record<string, string>, reason?: string, resume?: boolean }} MoveContext */
/** @typedef {(ctx: MoveContext) => Finding[]} Guard */

export const ALLOWED_MOVES = Object.freeze(
  [
    ['00_backlog', '01_shaping'],
    ['01_shaping', '02_ready'],
    ['02_ready', '03_in_progress'],
    ['03_in_progress', '04_review'],
    ['03_in_progress', '01_shaping'],
    ['04_review', '03_in_progress'],
    ['04_review', '01_shaping'],
    ['04_review', '05_gate'],
    ['05_gate', '06_done'],
  ].map((edge) => Object.freeze(edge)),
);

/** Human form of a column folder name: `03_in_progress` becomes `in progress`. */
export const humanColumn = (column) => column.replace(/^\d+_/, '').replaceAll('_', ' ');

const edgeKey = (from, to) => `${from}>${to}`;
const finding = (rule, message) => ({ rule, message });

/** @type {Map<string, { guard: Guard }[]>} */
const registered = new Map();

/**
 * Adds a guard that runs on every move along one edge, next to the built-in guards.
 * @param {string} from column folder name
 * @param {string} to column folder name
 * @param {Guard} guard
 * @returns {() => void} removes the guard again
 */
export function registerGuard(from, to, guard) {
  const key = edgeKey(from, to);
  const entry = { guard };
  registered.set(key, [...(registered.get(key) ?? []), entry]);
  return () => {
    const rest = (registered.get(key) ?? []).filter((e) => e !== entry);
    if (rest.length) registered.set(key, rest);
    else registered.delete(key);
  };
}

const inArchive = (projectDir, id) => isCardId(id) && archivedIds(projectDir).has(id);

/** A card is selected when it sits in an open cycle; the global backlog, a closed cycle or an unreadable one is not. */
const notSelected = ({ projectDir, card }) => {
  const cycle = cardPath(projectDir, card.id)?.cycle ?? null;
  const refuse = (why) => [finding('move-not-selected', `Card ${card.id} is not selected: ${why}`)];
  if (cycle === null) return refuse('it is not in a cycle. Select it into an open cycle first.');
  let status;
  try {
    ({ status } = readCycle(projectDir, cycle));
  } catch (err) {
    if (!(err instanceof CycleError)) throw err;
    return refuse(`its cycle ${cycle} cannot be read (${err.message}). Fix the cycle brief first.`);
  }
  return status === 'open' ? [] : refuse(`its cycle ${cycle} is closed. Work on it in an open cycle.`);
};

const noCriteria = ({ card }) =>
  card.criteria.length > 0 && card.criteria.every((c) => VERIFY_TYPES.includes(c.verify))
    ? []
    : [
        finding(
          'move-no-criteria',
          `Card ${card.id} needs at least one criterion, each with a verify type (${VERIFY_TYPES.join(', ')}), before it is ready. Add them to card.json.`,
        ),
      ];

const depsNotDone = ({ projectDir, card }) => {
  const pending = [];
  for (const dep of card.depends_on) {
    const found = cardPath(projectDir, dep);
    if (found?.column === '06_done' || (!found && inArchive(projectDir, dep))) continue;
    pending.push(found ? `${dep} (${humanColumn(found.column)})` : `${dep} (not found)`);
  }
  return pending.length
    ? [
        finding(
          'move-deps-not-done',
          `Card ${card.id} depends on cards that are not done: ${pending.join(', ')}. Finish them or remove the dependency first.`,
        ),
      ]
    : [];
};

const noClaim = ({ card }) =>
  card.claim ? [] : [finding('move-no-claim', `Card ${card.id} has no claim. Claim the card before moving it to in progress.`)];

const noReason = ({ card, from, to, reason }) =>
  typeof reason === 'string' && reason.trim() !== ''
    ? []
    : [
        finding(
          'move-no-reason',
          `Moving ${card.id} from ${humanColumn(from)} to ${humanColumn(to)} needs a reason. Give a non-empty reason saying what must change (on the command line: --reason <text>).`,
        ),
      ];

/** The one edge a resume may take: back into work from the shaping a correction was made in. */
export const RESUME_EDGE = Object.freeze(['01_shaping', '03_in_progress']);

const sameList = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((part, index) => part === b[index]);

/** A resumed card was started once: it has the base commit its diff is measured from. */
const resumeNeedsBase = ({ card }) =>
  typeof card.base_commit === 'string' && card.base_commit !== ''
    ? []
    : [finding('move-resume-no-base', `Card ${card.id} has no base commit, so it was never started and has nothing to resume. Move it to ready and then in progress the usual way.`)];

/**
 * A resumed card skips the red-first run because its red evidence already exists: the log was written from a failing run
 * of this same gate command before the build. A card with no gate command has no red run to reuse.
 */
const resumeNeedsRedEvidence = ({ projectDir, card }) => {
  if (card.gate === null) return [];
  let evidence = null;
  try {
    const file = workFile(projectDir, card.id, CARD_FILES.redEvidence);
    if (existsSync(file)) ({ evidence } = parseRedEvidence(readFileSync(file, 'utf8')));
  } catch {
    evidence = null;
  }
  return evidence !== null && evidence.exit_status !== 0 && sameList(evidence.command, card.gate)
    ? []
    : [
        finding(
          'move-resume-no-red-evidence',
          `Card ${card.id} cannot resume: no red-evidence log written from a failing run of its gate command (${CARD_FILES.redEvidence} in its work folder) was found, so the red-first run cannot be skipped. Move it to ready and run the red-first check the usual way.`,
        ),
      ];
};

/** The corrected manifest, criteria and brief must be frozen again before work resumes on them. */
const resumeNeedsFreeze = ({ projectDir, card }) => checkFrozen({ projectDir, card });

const bugNeedsRepro = ({ card }) =>
  card.type === 'bug' && card.criteria.some((c) => c.verify === 'test')
    ? []
    : [
        finding(
          'move-bug-needs-repro',
          `Card ${card.id} skips shaping only as a bug with a repro. Add a criterion with verify test that reproduces it, or move the card through shaping.`,
        ),
      ];

/** @type {Record<string, Guard[]>} */
const BUILT_IN = {
  [edgeKey('00_backlog', '01_shaping')]: [notSelected],
  [edgeKey('01_shaping', '02_ready')]: [noCriteria],
  [edgeKey('02_ready', '03_in_progress')]: [depsNotDone, noClaim],
  [edgeKey('03_in_progress', '01_shaping')]: [noReason],
  [edgeKey('04_review', '03_in_progress')]: [noReason],
  [edgeKey('04_review', '01_shaping')]: [noReason],
};

/**
 * Runs every guard for a move and collects all findings. Never throws for invalid cards, and a guard that
 * throws is reported as a move-guard-failed finding. Guards registered on a pair that is not an allowed move
 * are never consulted (the move is refused as not allowed first).
 * @param {MoveContext} ctx
 * @returns {Finding[]}
 */
export function checkMove(ctx) {
  const { from, to, card } = ctx;
  const resumeEdge = from === RESUME_EDGE[0] && to === RESUME_EDGE[1];
  if (ctx.resume === true && !resumeEdge) {
    return [finding('move-resume-not-shaping', `Only a card in shaping can be resumed into in progress (card-move <id> in_progress --resume); card ${card.id} is moving from ${humanColumn(from)} to ${humanColumn(to)}. Leave out --resume.`)];
  }
  const listed = ALLOWED_MOVES.some((edge) => edge[0] === from && edge[1] === to) || (resumeEdge && ctx.resume === true);
  const bugSkip = card.type === 'bug' && from === '00_backlog' && to === '02_ready';
  if (!listed && !bugSkip) {
    const next = ALLOWED_MOVES.filter((edge) => edge[0] === from).map((edge) => humanColumn(edge[1]));
    const hint = next.length ? `From ${humanColumn(from)} it can move to: ${next.join(', ')}.` : `Nothing moves out of ${humanColumn(from)}.`;
    const resumeHint = resumeEdge ? ' A card that was built and sent back to shaping for a correction goes back to work with --resume (card-move <id> in_progress --resume), after it is frozen again.' : '';
    return [finding('move-not-allowed', `Card ${card.id} cannot move from ${humanColumn(from)} to ${humanColumn(to)}. ${hint}${resumeHint}`)];
  }
  const key = edgeKey(from, to);
  const resumeGuards = resumeEdge && ctx.resume === true ? [noCriteria, resumeNeedsBase, resumeNeedsRedEvidence, resumeNeedsFreeze] : [];
  const guards = [...(bugSkip ? [bugNeedsRepro] : []), ...resumeGuards, ...(BUILT_IN[key] ?? []), ...(registered.get(key) ?? []).map((e) => e.guard)];
  return guards.flatMap((guard) => {
    try {
      return guard(ctx);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return [
        finding(
          'move-guard-failed',
          `A move guard for ${humanColumn(from)} to ${humanColumn(to)} threw an error (${reason}), so the guard itself failed and card ${card.id} was not moved. Fix or remove that guard.`,
        ),
      ];
    }
  });
}
