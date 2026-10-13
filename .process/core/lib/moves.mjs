import { archivedIds, cardPath, isCardId } from './board.mjs';
import { VERIFY_TYPES } from './card.mjs';
import { CycleError, readCycle } from './cycle.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./card.mjs').Card} Card */
/** @typedef {{ projectDir: string, card: Card, from: string, to: string, tier: string, concerns?: Record<string, string>, reason?: string }} MoveContext */
/** @typedef {(ctx: MoveContext) => Finding[]} Guard */

export const ALLOWED_MOVES = Object.freeze(
  [
    ['00_backlog', '01_shaping'],
    ['01_shaping', '02_ready'],
    ['02_ready', '03_in_progress'],
    ['03_in_progress', '04_review'],
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
  const listed = ALLOWED_MOVES.some((edge) => edge[0] === from && edge[1] === to);
  const bugSkip = card.type === 'bug' && from === '00_backlog' && to === '02_ready';
  if (!listed && !bugSkip) {
    const next = ALLOWED_MOVES.filter((edge) => edge[0] === from).map((edge) => humanColumn(edge[1]));
    const hint = next.length ? `From ${humanColumn(from)} it can move to: ${next.join(', ')}.` : `Nothing moves out of ${humanColumn(from)}.`;
    return [finding('move-not-allowed', `Card ${card.id} cannot move from ${humanColumn(from)} to ${humanColumn(to)}. ${hint}`)];
  }
  const key = edgeKey(from, to);
  const guards = [...(bugSkip ? [bugNeedsRepro] : []), ...(BUILT_IN[key] ?? []), ...(registered.get(key) ?? []).map((e) => e.guard)];
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
