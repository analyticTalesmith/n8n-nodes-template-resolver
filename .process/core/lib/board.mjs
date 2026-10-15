import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { BACKLOG_DIR, CARD_JSON, COLUMNS, CYCLES_DIR, DOCS_ROOT, STAGE, CYCLE_ARCHIVE_DIR, TICKET_ARCHIVE_DIR, cycleColumn } from './layout.mjs';
import { buildCardId, cardIdPrefix, compareCardIds, idDate, isAgentCode, isCardId, oldCounterOf, parseCardId, swarmIdFor } from './card-id.mjs';
import { currentSwarmName } from './git.mjs';
import { validateCard } from './card.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { toPosix } from './files.mjs';

/** @typedef {import('./card.mjs').Card} Card */
/** @typedef {{ cycle: string | null, column: string, dir: string }} CardLocation */

const MAX_SLUG_LENGTH = 40;
/** The column a global backlog card reports; the backlog itself has no column folders. */
const BACKLOG_COLUMN = STAGE.backlog;

export class BoardError extends Error {
  /** @param {string} message @param {ErrorOptions} [options] pass { cause } to chain the underlying error */
  constructor(message, options) {
    super(message, options);
    this.name = 'BoardError';
  }
}

export { isCardId };

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
  return toPosix(resolveProjectPath(resolveProjectRoots(projectDir, options), `${parent}/${id}`));
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
      .sort(compareCardIds)
      .map((id) => ({ cycle, column, id, dir: toPosix(join(parent, id)) })),
  );
}

const duplicateError = (projectDir, id, dirs, options = {}) => {
  const docsRoot = resolveProjectRoots(projectDir, options).docsRoot;
  const folders = dirs.map((dir) => `${DOCS_ROOT}/${toPosix(relative(docsRoot, dir))}`).join(' and ');
  return new BoardError(`Card ${id} is in more than one place: ${folders}. Keep one folder and remove or renumber the others.`);
};

/**
 * Every archived card id: cards in archived cycle columns and closed tickets under the ticket archive folder.
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
  for (const name of subdirectories(resolveProjectPath(roots, TICKET_ARCHIVE_DIR))) {
    if (isCardId(name)) ids.add(name);
  }
  return ids;
}

const liveAndArchivedNames = (projectDir, options = {}) => [...listCardFolders(projectDir, options).map(({ id }) => id), ...archivedIds(projectDir, options)];

/**
 * Other card folders (the backlog, any cycle column or the archive) that carry the same id prefix: the same four-digit
 * counter for an old id, the same date, swarm, agent and counter for a new one. A non-empty result right after creating a
 * folder means another creation raced this one.
 * @param {string} projectDir
 * @param {string} id
 * @returns {string[]}
 */
export function siblingIds(projectDir, id, options = {}) {
  const prefix = cardIdPrefix(id);
  if (prefix === null) return [];
  const names = liveAndArchivedNames(projectDir, options).filter((name) => name !== id);
  if (parseCardId(id).shape === 'old') return names.filter((name) => oldCounterOf(name) === Number(prefix));
  return names.filter((name) => cardIdPrefix(name) === prefix);
}

/**
 * Next card id, always in the new shape `<yymmdd>-<swarm>-<agent><n>-<slug>`. The counter is one above the highest counter
 * of any live or archived folder with the same date, swarm and agent (old four-digit ids never count), starting at 1. Live
 * orphan folders reserve their counters even without card.json; archived folders reserve only valid card ids.
 * @param {string} projectDir
 * @param {string} title
 * @param {{ swarm?: string, agent?: string, now?: Date, dataRoot?: string }} [options]
 *   swarm is an already-derived swarm id (the current branch's when omitted), agent an agent code (default a), now the clock (UTC date)
 * @returns {string}
 * @throws {BoardError} on a title with no letters or digits, a bad agent code or a bad swarm id
 */
export function nextCardId(projectDir, title, { swarm, agent = 'a', now = new Date(), ...rest } = {}) {
  const slug = slugify(title);
  if (!isAgentCode(agent)) {
    throw new BoardError(`Agent code ${JSON.stringify(agent)} is not valid. Use one or two lowercase letters, such as a or zz.`);
  }
  const names = liveAndArchivedNames(projectDir, rest);
  const date = idDate(now);
  const swarmId = swarm ?? swarmIdFor(currentSwarmName(projectDir));
  let highest = 0;
  for (const name of names) {
    const parsed = parseCardId(name);
    if (parsed?.shape === 'new' && parsed.date === date && parsed.swarm === swarmId && parsed.agent === agent) highest = Math.max(highest, parsed.counter);
  }
  try {
    return buildCardId({ date, swarm: swarmId, agent, counter: highest + 1, slug });
  } catch (cause) {
    if (!(cause instanceof RangeError)) throw cause;
    throw new BoardError(`Cannot build a card id: ${cause.message}`, { cause });
  }
}

/**
 * Locates a card in the global backlog or a cycle (the archive is not searched). Returns null for a malformed id.
 * A backlog card reports a null cycle and the backlog column.
 * @param {string} projectDir
 * @param {string} id
 * @returns {CardLocation | null}
 * @throws {BoardError} when the id has a card folder in more than one place
 */
export function cardPath(projectDir, id, options = {}) {
  if (!isCardId(id)) return null;
  const found = cardParents(projectDir, options)
    .map((parent) => ({ ...parent, dir: join(parent.dir, id) }))
    .filter(({ dir }) => existsSync(join(dir, CARD_JSON)));
  if (found.length === 0) return null;
  if (found.length > 1) throw duplicateError(projectDir, id, found.map(({ dir }) => dir), options);
  const [{ cycle, column, dir }] = found;
  return { cycle, column, dir: toPosix(dir) };
}

/** Parses and validates the card.json inside a card folder. */
function readCardFile(dir) {
  const file = `${toPosix(dir)}/${CARD_JSON}`;
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
  writeFileSync(`${found.dir}/${CARD_JSON}`, JSON.stringify(card, null, 2) + '\n');
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
    if (!isCardId(id) || !existsSync(join(dir, CARD_JSON))) continue;
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

/**
 * The printed label of a card: its id and its title on one line, even when a damaged card holds control characters.
 * @param {{ id: string, title: string }} card
 * @returns {string}
 */
export function cardLabel({ id, title }) {
  return `${id}  ${String(title).replace(/[\s\p{Cc}]+/gu, ' ').trim()}`;
}

/** True when the text could be an id or a prefix of one: lowercase letters, digits and hyphens only. */
export const isCardQuery = (query) => typeof query === 'string' && /^[a-z0-9-]+$/.test(query);

/**
 * The full id of the one live card or ticket (backlog and cycles, not the archive) a query names: an exact id wins,
 * otherwise a prefix of the id, of the slug, or of the date and slug.
 * @param {string} projectDir
 * @param {string} query
 * @returns {string}
 * @throws {BoardError} for a malformed query, no match, or several matches (it never picks one)
 */
export function findCardId(projectDir, query) {
  if (!isCardQuery(query)) {
    throw new BoardError(`${JSON.stringify(query)} is not a card id or prefix: use lowercase letters, digits and hyphens.`);
  }
  if (cardPath(projectDir, query) !== null) return query;
  const ids = [...new Set(listCardFolders(projectDir)
    .filter(({ id, dir }) => isCardId(id) && existsSync(join(dir, CARD_JSON)))
    .map(({ id }) => id))];
  const matches = ids.filter((id) => {
    const parsed = parseCardId(id);
    return id.startsWith(query) || parsed.slug.startsWith(query) ||
      (parsed.shape === 'new' && `${parsed.date}-${parsed.slug}`.startsWith(query));
  });
  if (matches.length === 0) throw new BoardError(`No card or ticket matches ${query}.`);
  const sameSlug = matches.filter((id) => parseCardId(id).slug === query);
  if (sameSlug.length === 1) return sameSlug[0];
  if (matches.length > 1) {
    throw new BoardError(`${query} matches ${matches.length} cards; type more of the slug:\n${matches.map((id) => `  ${lookupLabel(projectDir, id)}`).join('\n')}`);
  }
  return matches[0];
}

/** The label of a card for an ambiguity list; a damaged card is shown by its id alone. */
function lookupLabel(projectDir, id) {
  try {
    return cardLabel(readCard(projectDir, id));
  } catch (error) {
    if (error instanceof BoardError) return id;
    throw error;
  }
}



/**
 * The printed label of the live card or ticket a query names, resolving a slug prefix first.
 * @param {string} projectDir
 * @param {string} query
 * @returns {{ id: string, label: string }}
 */
export function resolveCard(projectDir, query) {
  const id = findCardId(projectDir, query);
  return { id, label: cardLabel(readCard(projectDir, id)) };
}
