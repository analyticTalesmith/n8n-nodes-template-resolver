import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { BACKLOG_DIR, COLUMNS, CYCLES_DIR, CYCLE_ARCHIVE_DIR, cycleColumn } from './layout.mjs';
import { CARD_ID, validateCard } from './card.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/** @typedef {import('./card.mjs').Card} Card */
/** @typedef {{ cycle: string | null, column: string, dir: string }} CardLocation */

const MAX_SLUG_LENGTH = 40;
const ID_PREFIX = /^(\d{4})-/;
/** The column a global backlog card reports; the backlog itself has no column folders. */
const BACKLOG_COLUMN = COLUMNS[0];

export class BoardError extends Error {
  /** @param {string} message @param {ErrorOptions} [options] pass { cause } to chain the underlying error */
  constructor(message, options) {
    super(message, options);
    this.name = 'BoardError';
  }
}

/** True when the value is a well-formed card id (see CARD_ID); anything else must never reach a path join. */
export const isCardId = (id) => typeof id === 'string' && CARD_ID.test(id);
const toForwardSlashes = (p) => p.replaceAll('\\', '/');

const subdirectories = (dir) =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];

/**
 * Lowercase ASCII kebab-case form of a title, at most 40 characters.
 * @param {string} title
 * @returns {string}
 */
export function slugify(title) {
  const slug = String(title)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '');
  if (slug === '') {
    throw new BoardError(
      `Title "${title}" has no letters or digits to build an id from. Give the card a title containing at least one.`,
    );
  }
  return slug;
}

/**
 * Absolute folder of a card, with forward slashes: `<cycle>/kanban/<column>/<id>` inside the cycles folder, or
 * `<id>` inside the global backlog when the cycle is null (the column is then ignored). Every part is checked
 * before a path is built.
 * @param {string} projectDir
 * @param {string | null} cycle
 * @param {string} column one of COLUMNS
 * @param {string} id
 * @returns {string}
 * @throws {import('./layout.mjs').CycleNameError} on a bad cycle name
 * @throws {RangeError} on a column that is not in COLUMNS
 * @throws {BoardError} on a malformed card id
 */
export function cardFolder(projectDir, cycle, column, id, options = {}) {
  const parent = cycle === null ? BACKLOG_DIR : cycleColumn(cycle, column);
  if (!isCardId(id)) {
    throw new BoardError(`"${id}" is not a card id (like 0001-some-title), so no card folder can be built. Check the id.`);
  }
  return toForwardSlashes(resolveProjectPath(resolveProjectRoots(projectDir, options), `${parent}/${id}`));
}

/**
 * Every folder that holds card folders: the global backlog first, then each folder under the cycles folder (by
 * name) column by column. Every folder counts, even one without a CYCLE.md or with a name that breaks the cycle-name
 * rule, so its cards stay findable and their counters stay reserved; validate reports such folders, and cardFolder
 * still refuses to build a path in one. The archive is not included.
 * @param {string} projectDir
 * @returns {CardLocation[]}
 */
function cardParents(projectDir, options = {}) {
  const roots = resolveProjectRoots(projectDir, options);
  const cyclesRoot = resolveProjectPath(roots, CYCLES_DIR);
  const cycles = subdirectories(cyclesRoot).sort();
  const discoveredColumn = (cycle, column) => {
    // A discovered folder may have an invalid cycle name. Keep it scannable so
    // its card ids remain reserved, while refusing symlinks inside the store.
    let path = cyclesRoot;
    for (const part of [cycle, 'kanban', column]) {
      path = join(path, part);
      try {
        if (lstatSync(path).isSymbolicLink()) throw new BoardError(`Card folder ${path} is a symbolic link. Replace it with a real folder.`);
      } catch (error) {
        if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') throw error;
      }
    }
    return path;
  };
  return [
    { cycle: null, column: BACKLOG_COLUMN, dir: resolveProjectPath(roots, BACKLOG_DIR) },
    ...cycles.flatMap((cycle) => COLUMNS.map((column) => ({ cycle, column, dir: discoveredColumn(cycle, column) }))),
  ];
}

/**
 * Every card folder in the global backlog and every cycle, valid or not: any folder inside the backlog or a cycle
 * column, whether or not its name is a card id and whether or not it holds a readable card.json. Ordered like
 * listCards. For scans that must report each bad card instead of stopping at the first.
 * @param {string} projectDir
 * @returns {Array<{ cycle: string | null, column: string, id: string, dir: string }>} dir is absolute, with forward slashes
 */
export function listCardFolders(projectDir, options = {}) {
  return cardParents(projectDir, options).flatMap(({ cycle, column, dir: parent }) =>
    subdirectories(parent)
      .sort()
      .map((id) => ({ cycle, column, id, dir: toForwardSlashes(join(parent, id)) })),
  );
}

const duplicateError = (projectDir, id, dirs, options = {}) => {
  const docsRoot = resolveProjectRoots(projectDir, options).docsRoot;
  const folders = dirs.map((dir) => `docs/${toForwardSlashes(relative(docsRoot, dir))}`).join(' and ');
  return new BoardError(`Card ${id} is in more than one place: ${folders}. Keep one folder and remove or renumber the others.`);
};

/**
 * Every archived card id: cards in archived cycle columns and closed tickets under `docs/archive/tickets/`.
 * @param {string} projectDir
 * @returns {Set<string>}
 */
export function archivedIds(projectDir, options = {}) {
  const roots = resolveProjectRoots(projectDir, options);
  const root = resolveProjectPath(roots, CYCLE_ARCHIVE_DIR);
  const ids = new Set();
  for (const cycle of subdirectories(root)) {
    const kanban = join(root, cycle, 'kanban');
    for (const column of subdirectories(kanban)) {
      for (const name of subdirectories(join(kanban, column))) if (isCardId(name)) ids.add(name);
    }
  }
  for (const name of subdirectories(resolveProjectPath(roots, 'docs/archive/tickets'))) {
    if (isCardId(name)) ids.add(name);
  }
  return ids;
}

const liveAndArchivedNames = (projectDir, options = {}) => [...listCardFolders(projectDir, options).map(({ id }) => id), ...archivedIds(projectDir, options)];

/**
 * Other card folders (the backlog, any cycle column or the archive) that carry the same four-digit counter as this id.
 * A non-empty result right after creating a folder means another creation raced this one.
 * @param {string} projectDir
 * @param {string} id
 * @returns {string[]}
 */
export function siblingIds(projectDir, id, options = {}) {
  const counter = ID_PREFIX.exec(id)?.[1];
  if (counter === undefined) return [];
  return liveAndArchivedNames(projectDir, options)
    .filter((name) => name !== id && ID_PREFIX.exec(name)?.[1] === counter);
}

/**
 * Next card id: one more than the highest counter in the backlog, any cycle column or the archive, then the title
 * slug. Live orphan folders reserve their counters even without card.json. Archived folders reserve only valid card ids.
 * @param {string} projectDir
 * @param {string} title
 * @returns {string}
 */
export function nextCardId(projectDir, title, options = {}) {
  const slug = slugify(title);
  let highest = 0;
  for (const name of liveAndArchivedNames(projectDir, options)) {
    const match = ID_PREFIX.exec(name);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `${String(highest + 1).padStart(4, '0')}-${slug}`;
}

/**
 * Locates a card in the global backlog or a cycle (the archive is not searched). Returns null for a malformed id.
 * A backlog card reports a null cycle and the 00_backlog column.
 * @param {string} projectDir
 * @param {string} id
 * @returns {CardLocation | null}
 * @throws {BoardError} when the id has a card folder in more than one place
 */
export function cardPath(projectDir, id, options = {}) {
  if (!isCardId(id)) return null;
  const found = cardParents(projectDir, options)
    .map((parent) => ({ ...parent, dir: join(parent.dir, id) }))
    .filter(({ dir }) => existsSync(join(dir, 'card.json')));
  if (found.length === 0) return null;
  if (found.length > 1) throw duplicateError(projectDir, id, found.map(({ dir }) => dir), options);
  const [{ cycle, column, dir }] = found;
  return { cycle, column, dir: toForwardSlashes(dir) };
}

/** Parses and validates the card.json inside a card folder. */
function readCardFile(dir) {
  const file = `${toForwardSlashes(dir)}/card.json`;
  let card;
  try {
    card = JSON.parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    throw new BoardError(`${file} is not valid JSON (${cause.message}). Repair or restore the file.`, { cause });
  }
  const [first] = validateCard(card);
  if (first) {
    throw new BoardError(`${file} is not a valid card: ${first.rule}. ${first.message}`);
  }
  return card;
}

/**
 * @param {string} projectDir
 * @param {string} id
 * @returns {Card}
 */
export function readCard(projectDir, id) {
  const found = cardPath(projectDir, id);
  if (!found) {
    throw new BoardError(`Card ${id} is not on the board. Check the id with the board listing.`);
  }
  return readCardFile(found.dir);
}

/**
 * Rewrites card.json of a card already in the backlog or a cycle.
 * @param {string} projectDir
 * @param {string} id
 * @param {Card} card
 */
export function writeCard(projectDir, id, card) {
  const found = cardPath(projectDir, id);
  if (!found) {
    throw new BoardError(`Card ${id} is not on the board, so it cannot be written. Check the id.`);
  }
  writeFileSync(`${found.dir}/card.json`, JSON.stringify(card, null, 2) + '\n');
}

/**
 * Every card in the global backlog and in every cycle, open or closed: the backlog first, then cycle by name,
 * column, then id. Folders without card.json are skipped.
 * @param {string} projectDir
 * @returns {Array<{ cycle: string | null, column: string, card: Card }>}
 * @throws {BoardError} when an id has a card folder in more than one place
 */
export function listCards(projectDir) {
  const entries = [];
  /** @type {Map<string, string>} */
  const seen = new Map();
  for (const { cycle, column, id, dir } of listCardFolders(projectDir)) {
    if (!isCardId(id) || !existsSync(join(dir, 'card.json'))) continue;
    if (seen.has(id)) throw duplicateError(projectDir, id, [seen.get(id), dir]);
    seen.set(id, dir);
    entries.push({ cycle, column, card: readCardFile(dir) });
  }
  return entries;
}

/**
 * True when a card with this id sits in the backlog, a cycle or the archive.
 * @param {string} projectDir
 * @param {string} id
 */
export function cardExists(projectDir, id, options = {}) {
  return isCardId(id) && (cardPath(projectDir, id, options) !== null || archivedIds(projectDir, options).has(id));
}
