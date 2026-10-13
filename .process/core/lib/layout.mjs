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

const CYCLE_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
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
  return typeof name === 'string' && name.length <= CYCLE_NAME_MAX && CYCLE_NAME.test(name) && !WINDOWS_DEVICE.test(name);
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
