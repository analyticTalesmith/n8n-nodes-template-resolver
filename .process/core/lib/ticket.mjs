import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { cardFolder, cardPath, isCardId, listCards, readCard, writeCard } from './board.mjs';
import { readCycle } from './cycle.mjs';
import { COLUMNS } from './layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

export class TicketError extends Error {
  /** @param {string} message @param {ErrorOptions} [options] pass { cause } to chain the underlying error */
  constructor(message, options) {
    super(message, options);
    this.name = 'TicketError';
  }
}

/**
 * The cards in the global backlog, ordered by id.
 * @param {string} projectDir
 * @returns {Array<{ id: string, title: string, type: string, origin: string | null }>}
 */
export function listTickets(projectDir) {
  return listCards(projectDir)
    .filter(({ cycle }) => cycle === null)
    .map(({ card }) => ({ id: card.id, title: card.title, type: card.type, origin: card.origin ?? null }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Moves an unclaimed global backlog ticket to the ticket archive with its dated closure reason. */
export function closeTicket(projectDir, id, reason) {
  if (!isCardId(id)) {
    throw new TicketError(`"${id}" is not a card id (like 0001-some-title). Check the id with the ticket listing.`);
  }
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new TicketError('Closing a ticket needs a non-empty reason.');
  }
  const found = cardPath(projectDir, id);
  if (found === null) {
    throw new TicketError(`Card ${id} is not on the board. Check the id with the ticket listing.`);
  }
  if (found.cycle !== null) {
    throw new TicketError(`Card ${id} is already in a cycle (${found.cycle}), not the global backlog. Only backlog tickets can be closed.`);
  }
  const claimed = readCard(projectDir, id).claimed_in;
  if (claimed) {
    throw new TicketError(`Ticket ${id} is already claimed by cycle ${claimed}. Only unclaimed tickets can be closed.`);
  }
  const dir = resolveProjectPath(resolveProjectRoots(projectDir), `docs/archive/tickets/${id}`).replaceAll('\\', '/');
  if (existsSync(dir)) {
    throw new TicketError(`Ticket archive destination ${dir} already exists. The backlog ticket was not changed.`);
  }
  const closure = join(found.dir, 'closure.json');
  if (existsSync(closure)) {
    throw new TicketError(`Ticket ${id} already has a closure record at ${closure}. The backlog ticket was not changed.`);
  }
  try {
    mkdirSync(dirname(dir), { recursive: true });
    writeFileSync(closure, JSON.stringify({ closed_at: new Date().toISOString(), reason: reason.trim() }, null, 2) + '\n', { flag: 'wx' });
    renameSync(found.dir, dir);
  } catch (cause) {
    if (existsSync(closure)) {
      try {
        unlinkSync(closure);
      } catch (rollbackCause) {
        throw new TicketError(`Ticket ${id} could not be archived (${cause.message}), and its closure record could not be removed (${rollbackCause.message}). Repair ${closure} by hand.`, { cause });
      }
    }
    throw new TicketError(`Ticket ${id} could not be archived (${cause.message}). It remains in the global backlog.`, { cause });
  }
  return { id, dir };
}

/**
 * Moves a global backlog card into the backlog column of an open cycle and records the claim. The folder moves
 * with one rename; claimed_in is written afterwards and origin is left alone.
 * @param {string} projectDir
 * @param {string} cycle
 * @param {string} id
 * @returns {{ id: string, cycle: string, dir: string }}
 * @throws {TicketError} when the card is missing, not in the global backlog, or already claimed, the cycle is closed, or
 *   the folder cannot be moved (the card then stays in the backlog)
 * @throws {import('./cycle.mjs').CycleError} when the cycle name is invalid or the cycle does not exist
 */
export function selectTicket(projectDir, cycle, id) {
  if (!isCardId(id)) {
    throw new TicketError(`"${id}" is not a card id (like 0001-some-title). Check the id with the ticket listing.`);
  }
  const { status } = readCycle(projectDir, cycle);
  if (status !== 'open') {
    throw new TicketError(`Cycle ${cycle} is ${status}, so it cannot take tickets. Select into an open cycle.`);
  }
  const found = cardPath(projectDir, id);
  if (found === null) {
    throw new TicketError(`Card ${id} is not on the board. Check the id with the ticket listing.`);
  }
  if (found.cycle !== null) {
    throw new TicketError(`Card ${id} is already in a cycle (${found.cycle}), not the global backlog. Only backlog tickets can be selected.`);
  }
  const claimed = readCard(projectDir, id).claimed_in;
  if (claimed) {
    throw new TicketError(`Ticket ${id} is already claimed by cycle ${claimed}. Pick an unclaimed ticket.`);
  }
  const dir = cardFolder(projectDir, cycle, COLUMNS[0], id);
  try {
    mkdirSync(dirname(dir), { recursive: true });
    renameSync(found.dir, dir);
  } catch (cause) {
    throw new TicketError(
      `Ticket ${id} could not be moved into cycle ${cycle} (${cause.message}). The card stays in the backlog at ${found.dir} and nothing moved. Clear the way at ${dir} and select it again.`,
      { cause },
    );
  }
  try {
    writeCard(projectDir, id, { ...readCard(projectDir, id), claimed_in: cycle });
  } catch (cause) {
    throw new TicketError(
      `Ticket ${id} is now in cycle ${cycle}, but writing its claimed_in field failed (${cause.message}). Set claimed_in to "${cycle}" in ${dir}/card.json by hand.`,
    );
  }
  return { id, cycle, dir };
}

/** Returns a selected unfinished ticket to the global backlog, retaining its files and origin. */
export function releaseTicket(projectDir, id) {
  if (!isCardId(id)) {
    throw new TicketError(`"${id}" is not a card id (like 0001-some-title). Check the id with the board listing.`);
  }
  const found = cardPath(projectDir, id);
  if (found === null) {
    throw new TicketError(`Card ${id} is not on the board. Check the id with the board listing.`);
  }
  if (found.cycle === null) {
    throw new TicketError(`Card ${id} is already in the global backlog. Nothing to release.`);
  }
  const { status } = readCycle(projectDir, found.cycle);
  if (status !== 'open') {
    throw new TicketError(`Cycle ${found.cycle} is ${status}. Tickets cannot be released from a closed cycle.`);
  }
  if (found.column === COLUMNS.at(-1)) {
    throw new TicketError(`Card ${id} is done. A completed card cannot be released to the backlog.`);
  }
  const card = readCard(projectDir, id);
  if (card.claimed_in !== found.cycle) {
    throw new TicketError(`Card ${id} has claimed_in ${JSON.stringify(card.claimed_in ?? null)}, not ${JSON.stringify(found.cycle)}. Repair its claim before releasing it.`);
  }
  const dir = cardFolder(projectDir, null, COLUMNS[0], id);
  if (existsSync(dir)) {
    throw new TicketError(`Backlog destination ${dir} already exists. The selected card was not changed.`);
  }
  const staged = join(found.dir, `.release-${randomUUID()}.json`);
  try {
    writeFileSync(staged, JSON.stringify({ ...card, claimed_in: null }, null, 2) + '\n', { flag: 'wx' });
  } catch (cause) {
    if (existsSync(staged)) {
      try { unlinkSync(staged); }
      catch (cleanupCause) {
        throw new TicketError(`Ticket ${id} could not stage its cleared claim (${cause.message}), and the partial file ${staged} could not be removed (${cleanupCause.message}). Remove it by hand before releasing the ticket.`, { cause });
      }
    }
    throw new TicketError(`Ticket ${id} could not stage its cleared claim (${cause.message}). The selected card was not changed.`, { cause });
  }
  try {
    mkdirSync(dirname(dir), { recursive: true });
    renameSync(found.dir, dir);
  } catch (cause) {
    try { unlinkSync(staged); }
    catch (rollbackCause) {
      throw new TicketError(`Ticket ${id} could not move to the backlog (${cause.message}), and ${staged} could not be removed (${rollbackCause.message}). Remove that staged file by hand.`, { cause });
    }
    throw new TicketError(`Ticket ${id} could not move to the backlog (${cause.message}). It remains in cycle ${found.cycle}.`, { cause });
  }
  try {
    renameSync(join(dir, basename(staged)), join(dir, 'card.json'));
  } catch (cause) {
    try {
      renameSync(dir, found.dir);
    } catch (rollbackCause) {
      throw new TicketError(`Ticket ${id} moved to ${dir}, but its claim update failed (${cause.message}) and the folder could not be rolled back (${rollbackCause.message}). Its original card.json still claims ${found.cycle}; move the folder to ${found.dir} or finish clearing claimed_in by hand.`, { cause });
    }
    try { unlinkSync(staged); }
    catch (rollbackCause) {
      throw new TicketError(`Ticket ${id} was rolled back to ${found.dir} after its claim update failed (${cause.message}), but ${staged} could not be removed (${rollbackCause.message}). Remove that staged file by hand.`, { cause });
    }
    throw new TicketError(`Ticket ${id} claim update failed (${cause.message}); its folder and original card.json were rolled back to ${found.dir}.`, { cause });
  }
  return { id, cycle: found.cycle, dir };
}
