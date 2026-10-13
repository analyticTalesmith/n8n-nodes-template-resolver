import { cardPath, readCard, writeCard } from './board.mjs';
import { CycleError, readCycle } from './cycle.mjs';
import { humanColumn } from './moves.mjs';

/** @typedef {import('./card.mjs').Card} Card */

/** A claim whose heartbeat is older than this many minutes shows as stale. */
export const STALE_AFTER_MINUTES = 30;

const CLAIMABLE = ['02_ready', '03_in_progress'];
const LEAD = 'lead';

export class ClaimError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'ClaimError';
  }
}

const cleanOwner = (owner) => {
  if (typeof owner !== 'string' || owner.trim() === '') {
    throw new ClaimError('An owner name is required. Pass a non-empty owner, for example the worker or session name.');
  }
  return owner.trim();
};

/**
 * Describes a card's claim: free, held, or stale (heartbeat older than the threshold).
 * minutes is the whole minutes since the heartbeat, floored; a heartbeat in the future (clock skew) counts as 0.
 * @param {Card} card
 * @param {Date} [now]
 * @returns {{ state: 'free' | 'held' | 'stale', owner?: string, minutes?: number }}
 */
export function claimStatus(card, now = new Date()) {
  const held = card.claim;
  if (held === null || held === undefined) return { state: 'free' };
  if (typeof held !== 'object') return { state: 'stale' };
  const status = { state: 'stale' };
  if (typeof held.owner === 'string') status.owner = held.owner;
  const beat = Date.parse(held.heartbeat);
  if (Number.isNaN(beat)) return status;
  status.minutes = Math.max(0, Math.floor((now.getTime() - beat) / 60_000));
  status.state = status.minutes > STALE_AFTER_MINUTES ? 'stale' : 'held';
  return status;
}

const holderOf = (card) => card.claim?.owner;

/**
 * Takes a free card, or refreshes the heartbeat when the same owner already holds it (even if stale).
 * Only ready and in-progress cards of a cycle can be claimed, and a fresh claim also needs that cycle open. Like heartbeat and release this reads the card, changes it
 * and writes it back with no lock, so two processes acting at the same moment can overwrite each other.
 * @param {string} projectDir
 * @param {string} id
 * @param {string} owner
 * @param {Date} [now]
 * @returns {Card}
 */
export function claim(projectDir, id, owner, now = new Date()) {
  const name = cleanOwner(owner);
  const card = readCard(projectDir, id);
  const { cycle, column } = cardPath(projectDir, id);
  if (cycle === null) {
    throw new ClaimError(`Card ${id} is in the global backlog, not in a cycle, so it cannot be claimed. Select it into an open cycle first.`);
  }
  if (!CLAIMABLE.includes(column)) {
    throw new ClaimError(
      `Card ${id} is in ${humanColumn(column)}; only ready or in-progress cards can be claimed. Move it to ready first.`,
    );
  }
  const status = claimStatus(card, now);
  if (status.state !== 'free' && holderOf(card) !== name) {
    const holder = holderOf(card) ?? 'an unknown owner';
    throw new ClaimError(
      status.state === 'stale'
        ? `Card ${id} has a stale claim held by ${holder}. Nothing is released automatically; a human or the lead must release it first.`
        : `Card ${id} is held by ${holder}. Wait for them to release it, or ask the lead.`,
    );
  }
  if (status.state === 'free' || holderOf(card) !== name) requireOpenCycle(projectDir, cycle, id);
  const updated = { ...card, claim: { owner: name, heartbeat: now.toISOString() } };
  writeCard(projectDir, id, updated);
  return updated;
}

/** A fresh claim needs the card's cycle readable and open; throws a ClaimError saying what to do otherwise. */
function requireOpenCycle(projectDir, name, id) {
  let cycle;
  try {
    cycle = readCycle(projectDir, name);
  } catch (cause) {
    if (!(cause instanceof CycleError)) throw cause;
    throw new ClaimError(`Card ${id} cannot be claimed: ${cause.message}`, { cause });
  }
  if (cycle.status !== 'open') {
    throw new ClaimError(`Cycle ${name} is closed, so card ${id} cannot be claimed. Work on it in an open cycle.`);
  }
}

/**
 * Refreshes the heartbeat; only the holder may. Works in any column. No lock (see claim).
 * @param {string} projectDir
 * @param {string} id
 * @param {string} owner
 * @param {Date} [now]
 * @returns {Card}
 */
export function heartbeat(projectDir, id, owner, now = new Date()) {
  const name = cleanOwner(owner);
  const card = readCard(projectDir, id);
  if (card.claim == null) throw new ClaimError(`Card ${id} is not claimed, so there is no heartbeat to send. Claim it first.`);
  if (holderOf(card) !== name) {
    throw new ClaimError(`Card ${id} is held by ${holderOf(card) ?? 'an unknown owner'}, not ${name}. Only the holder can send heartbeats.`);
  }
  const updated = { ...card, claim: { owner: name, heartbeat: now.toISOString() } };
  writeCard(projectDir, id, updated);
  return updated;
}

/**
 * Clears a claim. The holder may release its own; `lead` may release anyone's. Works in any column. No lock (see claim).
 * @param {string} projectDir
 * @param {string} id
 * @param {string} owner
 * @returns {Card}
 */
export function release(projectDir, id, owner) {
  const name = cleanOwner(owner);
  const card = readCard(projectDir, id);
  if (card.claim == null) throw new ClaimError(`Card ${id} is not claimed, so there is nothing to release.`);
  if (name !== LEAD && holderOf(card) !== name) {
    throw new ClaimError(
      `Card ${id} is held by ${holderOf(card) ?? 'an unknown owner'}, not ${name}. Only the holder or the lead can release it.`,
    );
  }
  const updated = { ...card, claim: null };
  writeCard(projectDir, id, updated);
  return updated;
}
