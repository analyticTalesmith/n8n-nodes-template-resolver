import { isKebab } from './names.mjs';

export const COLUMNS = Object.freeze([
  '00_backlog',
  '01_shaping',
  '02_ready',
  '03_in_progress',
  '04_review',
  '05_gate',
  '06_done',
]);

export const TIERS = Object.freeze(['spike', 'prototype', 'product', 'hardened']);

export const CYCLES_DIR = 'docs/ephemeral/cycles';
export const BACKLOG_DIR = 'docs/ephemeral/backlog';
export const INBOX_DIR = 'docs/ephemeral/feedback/inbox';
export const CYCLE_ARCHIVE_DIR = 'docs/archive/cycles';

/** Docs folders and process paths that readers join paths from: project-relative, forward slashes, no trailing slash. */
export const DOCS_ROOT = 'docs';
export const LIVING_DIR = `${DOCS_ROOT}/living`;
export const EPHEMERAL_DIR = `${DOCS_ROOT}/ephemeral`;
export const ARCHIVE_DIR = `${DOCS_ROOT}/archive`;
export const WORK_DIR = `${EPHEMERAL_DIR}/work`;
export const HANDOFF_DIR = `${EPHEMERAL_DIR}/handoffs`;
export const LEARNINGS_DIR = `${EPHEMERAL_DIR}/learnings`;
export const RESEARCH_DIR = `${EPHEMERAL_DIR}/research`;
export const FEEDBACK_DIR = `${EPHEMERAL_DIR}/feedback`;
export const SESSIONS_DIR = `${FEEDBACK_DIR}/sessions`;
export const PROPOSALS_DIR = `${EPHEMERAL_DIR}/proposals`;
export const TODO_FILE = `${EPHEMERAL_DIR}/todo.md`;
export const TICKET_ARCHIVE_DIR = `${ARCHIVE_DIR}/tickets`;
export const LEARNINGS_ARCHIVE_DIR = `${ARCHIVE_DIR}/learnings`;
export const ARCH_DIR = `${LIVING_DIR}/architecture`;
export const MODULES_DIR = `${ARCH_DIR}/modules`;
export const DECISIONS_DIR = `${LIVING_DIR}/decisions`;
export const TOKENS_DIR = `${LIVING_DIR}/ux/tokens`;
export const PROCESS_DIR = '.process';
export const PROCESS_CORE = `${PROCESS_DIR}/core`;
export const PROCESS_TEAMS = `${PROCESS_DIR}/teams`;
export const PROCESS_TIERS = `${PROCESS_DIR}/tiers/rigor`;
export const PROCESS_LOCAL = `${PROCESS_DIR}/local`;
/** File names inside a card folder. */
export const CARD_JSON = 'card.json';
export const CARD_MD = 'card.md';
export const CONTEXT_MD = 'context.md';

export const PROJECT_DIRS = Object.freeze([
  '.process/core',
  '.process/teams',
  '.process/local',
  'docs/living/product',
  'docs/living/ux',
  'docs/living/domain',
  'docs/living/architecture',
  'docs/living/decisions',
  CYCLES_DIR,
  BACKLOG_DIR,
  INBOX_DIR,
  'docs/ephemeral/work',
  'docs/ephemeral/research',
  'docs/ephemeral/handoffs',
  'docs/ephemeral/learnings',
  CYCLE_ARCHIVE_DIR,
  'docs/archive/work',
  'docs/archive/research',
]);

/** The folders inside one cycle, next to its CYCLE.md brief. */
export const CYCLE_FOLDERS = Object.freeze(['deltas', 'kanban', 'feedback', 'verification']);

const CYCLE_NAME_MAX = 48;
// Windows cannot create a folder with one of these names, whatever the extension.
const WINDOWS_DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/;
const CYCLE_NAME_RULE = `a cycle name is kebab-case (lowercase letters, digits and single hyphens), 1 to ${CYCLE_NAME_MAX} characters, and not a Windows device name`;

export class CycleNameError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'CycleNameError';
  }
}

/**
 * Whether a value is safe to use as a cycle folder name.
 * @param {unknown} name
 * @returns {boolean}
 */
export function isCycleName(name) {
  return typeof name === 'string' && name.length <= CYCLE_NAME_MAX && isKebab(name) && !WINDOWS_DEVICE.test(name);
}

/**
 * Where a cycle's files live, relative to the project root, with forward slashes.
 * @param {string} name
 * @returns {{ root: string, brief: string, deltas: string, kanban: string, feedback: string, verification: string, archive: string }}
 * @throws {CycleNameError} when the name breaks the cycle name rule
 */
export function cyclePaths(name) {
  if (!isCycleName(name)) throw new CycleNameError(`invalid cycle name ${JSON.stringify(name)}: ${CYCLE_NAME_RULE}`);
  const root = `${CYCLES_DIR}/${name}`;
  return {
    root,
    brief: `${root}/CYCLE.md`,
    deltas: `${root}/deltas`,
    kanban: `${root}/kanban`,
    feedback: `${root}/feedback`,
    verification: `${root}/verification`,
    archive: `${CYCLE_ARCHIVE_DIR}/${name}`,
  };
}

/**
 * The folder of one kanban column inside a cycle.
 * @param {string} name
 * @param {string} column one of COLUMNS
 * @returns {string}
 * @throws {CycleNameError} on a bad cycle name
 * @throws {RangeError} on a column that is not in COLUMNS
 */
export function cycleColumn(name, column) {
  const { kanban } = cyclePaths(name);
  if (!COLUMNS.includes(column)) throw new RangeError(`unknown column ${JSON.stringify(column)}: expected one of ${COLUMNS.join(', ')}`);
  return `${kanban}/${column}`;
}

/**
 * Builds the stage roles, the stage groups and the move edges from a column list (in kanban order).
 * @param {readonly string[]} columns seven column folder names
 */
export function buildStages(columns) {
  const [backlog, shaping, ready, inProgress, review, gate, done] = columns;
  const stage = Object.freeze({ backlog, shaping, ready, inProgress, review, gate, done });
  const group = (...roles) => Object.freeze(roles.map((role) => stage[role]));
  return Object.freeze({
    STAGE: stage,
    CLAIMABLE: group('ready', 'inProgress'),
    AMENDABLE: group('inProgress', 'review'),
    BUILT: group('review', 'gate', 'done'),
    STARTED: group('inProgress', 'review', 'gate', 'done'),
    ACTIVE: group('inProgress', 'review', 'gate'),
    RED_FIRST: group('ready', 'inProgress', 'review', 'gate', 'done'),
    ALLOWED_MOVES: Object.freeze(
      [
        ['backlog', 'shaping'],
        ['shaping', 'ready'],
        ['ready', 'inProgress'],
        ['inProgress', 'review'],
        ['inProgress', 'shaping'],
        ['review', 'inProgress'],
        ['review', 'shaping'],
        ['review', 'gate'],
        ['gate', 'done'],
      ].map(([from, to]) => Object.freeze([stage[from], stage[to]])),
    ),
    RESUME_EDGE: group('shaping', 'inProgress'),
    FORWARD: Object.freeze(Object.fromEntries(columns.slice(0, -1).map((column, i) => [column, columns[i + 1]]))),
  });
}

const stages = buildStages(COLUMNS);

/** The stages by role: the one place a column folder name is read by what it means. */
export const STAGE = stages.STAGE;
/** Stages a card can be claimed in. */
export const CLAIMABLE = stages.CLAIMABLE;
/** Stages where a frozen card's brief or tests can still be amended. */
export const AMENDABLE = stages.AMENDABLE;
/** Stages whose cards have been built. */
export const BUILT = stages.BUILT;
/** Stages whose cards have been started. */
export const STARTED = stages.STARTED;
/** Stages whose cards are being worked on right now. */
export const ACTIVE = stages.ACTIVE;
/** Stages whose cards must have recorded failing tests first. */
export const RED_FIRST = stages.RED_FIRST;
/** Every move a card may make, as [from, to] pairs. */
export const ALLOWED_MOVES = stages.ALLOWED_MOVES;
/** The one edge a resume may take: back into work from the shaping a correction was made in. */
export const RESUME_EDGE = stages.RESUME_EDGE;
/** Each stage mapped to the next one on the forward path. */
export const FORWARD = stages.FORWARD;

/** The key a move edge is stored under in tables keyed by edge. */
export const edgeKey = (from, to) => `${from}>${to}`;

/** Human form of a column folder name: `03_in_progress` becomes `in progress`. */
export const humanColumn = (column) => column.replace(/^\d+_/, '').replaceAll('_', ' ');
