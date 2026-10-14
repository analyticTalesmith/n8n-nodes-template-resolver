import { BoardError, cardPath, isCardId } from './board.mjs';
import { BACKLOG_DIR, COLUMNS, CYCLES_DIR, isCycleName } from './layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

export const WORK_ROOT = 'docs/ephemeral/work';
/** Everything under here is process material: reports, plans, handoffs, cycles and the backlog. */
export const PROCESS_ROOT = 'docs/ephemeral';
export const CARD_FILES = Object.freeze({
  spec: 'spec.md',
  plan: 'plan.md',
  brief: 'brief.md',
  reviewerBrief: 'reviewer-brief.md',
  report: 'report.md',
  review: 'review.md',
  packet: 'review-packet.md',
  evaluatorPackage: 'evaluator-package.md',
  reviewOutput: 'review-output.json',
  rounds: 'review-rounds.json',
  redEvidence: 'red-evidence.md',
  gateRun: 'gate-run.json',
  rootCause: 'root-cause.md',
});

/**
 * True when a project-relative path is the process root or lies under it (backslashes read as slashes).
 * A path with a `..` segment is false, so climbing out of a folder never counts as process material.
 * @param {string} path
 * @returns {boolean}
 */
export function isProcessPath(path) {
  const p = String(path).replaceAll('\\', '/');
  if (p.split('/').includes('..')) return false;
  return p === PROCESS_ROOT || p.startsWith(`${PROCESS_ROOT}/`);
}

/** Handoffs and learnings: notes a session may write at any time. Repeats HANDOFF_ROOT and LEARNINGS_ROOT as literals. */
export const NOTE_ROOTS = Object.freeze(['docs/ephemeral/handoffs', 'docs/ephemeral/learnings']);

/**
 * True when a project-relative path is a process path under one of the NOTE_ROOTS.
 * @param {string} path
 * @returns {boolean}
 */
export function isNotePath(path) {
  const p = String(path).replaceAll('\\', '/');
  return isProcessPath(p) && NOTE_ROOTS.some((root) => p.startsWith(`${root}/`));
}

/**
 * Absolute path of a working document under docs/ephemeral/work/<id>/.
 * @param {string} projectDir
 * @param {string} id
 * @param {string} name file name inside the work folder
 * @returns {string}
 */
export function workFile(projectDir, id, name) {
  if (!isCardId(id)) {
    throw new BoardError(`"${id}" is not a card id (like 0001-some-title), so no working document path can be built. Check the id.`);
  }
  return resolveProjectPath(resolveProjectRoots(projectDir), `${WORK_ROOT}/${id}/${name}`);
}

/**
 * Absolute path of a file inside the card's folder (in its cycle or the global backlog), or null when the card is not on the board.
 * @param {string} projectDir
 * @param {string} id
 * @param {string} name
 * @returns {string | null}
 */
export function cardFile(projectDir, id, name) {
  const found = cardPath(projectDir, id);
  return found ? `${found.dir}/${name}` : null;
}

/**
 * True when a project-relative path lies inside the card's folder (in the global backlog or any column of any cycle)
 * or its work folder.
 * @param {string} path
 * @param {string} id
 * @returns {boolean}
 */
export function isCardProcessPath(path, id) {
  const p = String(path).replaceAll('\\', '/');
  if (p.startsWith(`${WORK_ROOT}/${id}/`) || p.startsWith(`${BACKLOG_DIR}/${id}/`)) return true;
  if (!p.startsWith(`${CYCLES_DIR}/`)) return false;
  // <cycle>/kanban/<column>/<id>/<file...>
  const [cycle, kanban, column, folder, ...inside] = p.slice(CYCLES_DIR.length + 1).split('/');
  return isCycleName(cycle) && kanban === 'kanban' && COLUMNS.includes(column) && folder === id && inside.length > 0;
}

/**
 * True when a project-relative path is a file inside ANOTHER card's folder in a cycle's kanban (any column of any cycle).
 * Moving, readying or filing a sibling card is board bookkeeping, so it never counts as part of this card's change;
 * that is what lets a lead ready several cards and commit once without each card's diff carrying its siblings' moves.
 * A path with a `..` segment, a folder that is not a card id, a file directly in a column and this card's own folder are false.
 * @param {string} path
 * @param {string} id the card the change is judged for
 * @returns {boolean}
 */
export function isOtherCardKanbanPath(path, id) {
  const p = String(path).replaceAll('\\', '/');
  if (p.split('/').includes('..') || !p.startsWith(`${CYCLES_DIR}/`)) return false;
  const [cycle, kanban, column, folder, ...inside] = p.slice(CYCLES_DIR.length + 1).split('/');
  return isCycleName(cycle) && kanban === 'kanban' && COLUMNS.includes(column) && isCardId(folder) && folder !== id && inside.length > 0 && !inside.includes('');
}

/** The folders of a cycle whose whole content belongs to the cycle rather than to any one card. */
const CYCLE_RECORD_FOLDERS = Object.freeze(['deltas', 'feedback', 'verification']);

/**
 * True when a project-relative path is one of a cycle's own files: its CYCLE.md, anything under its deltas,
 * feedback or verification folder, or the .gitkeep of one of its kanban columns. Card folders inside the kanban
 * are not the cycle's own files. A path with a `..` segment is false.
 * @param {string} path
 * @returns {boolean}
 */
export function isCycleOwnPath(path) {
  const p = String(path).replaceAll('\\', '/');
  if (!p.startsWith(`${CYCLES_DIR}/`) || p.split('/').includes('..')) return false;
  const [cycle, top, ...rest] = p.slice(CYCLES_DIR.length + 1).split('/');
  if (!isCycleName(cycle)) return false;
  if (top === 'CYCLE.md') return rest.length === 0;
  if (CYCLE_RECORD_FOLDERS.includes(top)) return rest.length > 0 && !rest.includes('');
  return top === 'kanban' && rest.length === 2 && COLUMNS.includes(rest[0]) && rest[1] === '.gitkeep';
}

/**
 * The delta documents a card itself delivers: the paths of its files_scope and manifest (add, edit, remove) that are
 * exactly docs/ephemeral/cycles/<cycle>/deltas/<name>.md in the cycle the card sits in, never INDEX.md. No folder, glob
 * or other cycle counts. Read from the card's own listing, never from a delta file. Forward slashes, de-duplicated, sorted.
 * @param {string} projectDir
 * @param {{ id: string, files_scope?: unknown, manifest?: { add?: unknown, edit?: unknown, remove?: unknown } }} card
 * @returns {string[]} [] for a card in no cycle or not on the board
 */
export function deltaDeliverables(projectDir, card) {
  const found = cardPath(projectDir, card.id);
  if (found === null || found.cycle === null || found.cycle === undefined) return [];
  const folder = `${CYCLES_DIR}/${found.cycle}/deltas/`;
  const listed = [card.files_scope, card.manifest?.add, card.manifest?.edit, card.manifest?.remove].flatMap((paths) => (Array.isArray(paths) ? paths : []));
  const isDelta = (path) => {
    if (typeof path !== 'string' || !path.startsWith(folder)) return false;
    const name = path.slice(folder.length);
    return /^[^/*?[\]{}\\]+\.md$/.test(name) && name !== 'INDEX.md';
  };
  return [...new Set(listed.filter(isDelta))].sort();
}
