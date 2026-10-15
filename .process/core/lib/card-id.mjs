/**
 * The one owner of the card id shape. Two shapes are valid:
 *   old: `0033-make-closing-a-cycle`                  four digits, a hyphen, a kebab slug
 *   new: `270113-featurex-b3-make-closing-a-cycle`   yymmdd, swarm, agent letters then a counter, a kebab slug
 * Everything else that needs to recognise, order or print a card id goes through this module.
 */

import { sha256Bytes } from './files.mjs';

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const DATE = String.raw`\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])`;

const OLD = new RegExp(String.raw`^(\d{4})-(${SLUG})$`);
const NEW = new RegExp(String.raw`^(${DATE})-([a-z0-9]+)-([a-z]{1,2})(\d+)-(${SLUG})$`);

/** The whole id, old or new shape. The pattern cannot see that a date is real (270230); `isCardId` and `parseCardId` do. */
export const CARD_ID = new RegExp(String.raw`^(?:\d{4}-${SLUG}|${DATE}-[a-z0-9]+-[a-z]{1,2}\d+-${SLUG})$`);

/** @param {string} date yymmdd, with a month 01-12 and a day 01-31 already checked */
function isRealDate(date) {
  const year = 2000 + Number(date.slice(0, 2));
  const month = Number(date.slice(2, 4));
  const day = Number(date.slice(4, 6));
  const stamp = new Date(Date.UTC(year, month - 1, day));
  return stamp.getUTCFullYear() === year && stamp.getUTCMonth() === month - 1 && stamp.getUTCDate() === day;
}

/**
 * @param {unknown} id
 * @returns {{ shape: 'old'|'new', counter: number, date?: string, swarm?: string, agent?: string, slug: string } | null} null when it is not a card id
 */
export function parseCardId(id) {
  if (typeof id !== 'string') return null;
  const old = OLD.exec(id);
  if (old) return { shape: 'old', counter: Number(old[1]), slug: old[2] };
  const next = NEW.exec(id);
  if (next && isRealDate(next[1])) return { shape: 'new', counter: Number(next[4]), date: next[1], swarm: next[2], agent: next[3], slug: next[5] };
  return null;
}

/** True when the value is a well-formed card id; anything else must never reach a path join. */
export const isCardId = (id) => parseCardId(id) !== null;

const text = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Orders ids: old ids before new ones, old by counter, new by date, swarm, agent, then counter; the slug breaks a tie.
 * A value that is not a card id sorts after every id, by its text.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareCardIds(a, b) {
  const left = parseCardId(a);
  const right = parseCardId(b);
  if (left === null || right === null) return left === right ? text(a, b) : left === null ? 1 : -1;
  if (left.shape !== right.shape) return left.shape === 'old' ? -1 : 1;
  const order = left.shape === 'old'
    ? left.counter - right.counter
    : text(left.date, right.date) || text(left.swarm, right.swarm) || text(left.agent, right.agent) || left.counter - right.counter;
  return order || text(left.slug, right.slug);
}

/**
 * The line a loop reports for a card that keeps failing.
 * @param {string} id
 * @param {string} reason
 * @param {number} times
 * @returns {string}
 */
export const blockedLine = (id, reason, times) => `blocked: ${id} (${reason}, ${times} times)`;

const BLOCKED_LINE = /^blocked: (\S+) \((.*), (\d+) times\)$/;

/**
 * @param {string} line
 * @returns {{ id: string, reason: string, times: number } | null} null when the line is not a blocked card line naming a card id
 */
export function parseBlockedLine(line) {
  const match = BLOCKED_LINE.exec(line);
  if (match === null || !isCardId(match[1])) return null;
  return { id: match[1], reason: match[2], times: Number(match[3]) };
}

const OLD_PREFIX = /^(\d{4})-/;

/**
 * The counter an old-shape folder name reserves on the board, even when the rest of the name is not a valid slug (an orphan
 * folder still holds its number).
 * @param {string} name
 * @returns {number | null} null when the name does not start with four digits and a hyphen
 */
export function oldCounterOf(name) {
  const match = OLD_PREFIX.exec(name);
  return match === null ? null : Number(match[1]);
}

/** The longest a whole card id may be, so the deepest path inside a cycle stays under the Windows path limit. */
export const MAX_CARD_ID_LENGTH = 70;

const SWARM_LENGTH = 12;
const SWARM_CUT = 8;
const SWARM = /^[a-z0-9]{1,12}$/;
const AGENT = /^[a-z]{1,2}$/;
const SLUG_ONLY = new RegExp(`^${SLUG}$`);
const DATE_ONLY = new RegExp(`^${DATE}$`);
const LETTERS = 26;
const hashOf = (name) => sha256Bytes(Buffer.from(name, 'utf8'));

/**
 * The swarm id of a branch or folder name: the readable part (the name without its type prefix, everything up to the first
 * slash, lowercased, letters and digits only, cut to 8) followed by the first 4 hex characters of the SHA-256 of the whole
 * original name, so two different names never share a key. An empty readable part gives the 4 hex characters alone.
 * @param {string} name a branch name, or a folder name when HEAD is detached
 * @returns {string} matches ^[a-z0-9]{1,12}$
 */
export function swarmIdFor(name) {
  const text = String(name);
  const readable = text.slice(text.indexOf('/') + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, SWARM_CUT);
  return readable + hashOf(text).slice(0, SWARM_LENGTH - SWARM_CUT);
}

/**
 * The agent code for the nth agent started: a to z, then aa to zz.
 * @param {number} index 0 to 701
 * @returns {string}
 * @throws {RangeError} when the index is not a whole number from 0 to 701
 */
export function agentCode(index) {
  if (!Number.isInteger(index) || index < 0 || index >= LETTERS + LETTERS * LETTERS) {
    throw new RangeError(`Agent index ${index} is out of range: use a whole number from 0 (a) to 701 (zz).`);
  }
  const letter = (n) => String.fromCharCode(97 + n);
  return index < LETTERS ? letter(index) : letter(Math.floor((index - LETTERS) / LETTERS)) + letter((index - LETTERS) % LETTERS);
}

/** True for one or two lowercase letters, the agent part of a new-shape id. */
export const isAgentCode = (value) => typeof value === 'string' && AGENT.test(value);

/**
 * The UTC date of a moment as yymmdd.
 * @param {Date} now
 * @returns {string}
 */
export function idDate(now) {
  const two = (n) => String(n).padStart(2, '0');
  return `${two(now.getUTCFullYear() % 100)}${two(now.getUTCMonth() + 1)}${two(now.getUTCDate())}`;
}

/**
 * Builds a new-shape id, cutting the slug from its end (and any hyphen that leaves dangling) so the whole id is at most
 * MAX_CARD_ID_LENGTH characters.
 * @param {{ date: string, swarm: string, agent: string, counter: number, slug: string }} parts
 * @returns {string} always accepted by isCardId
 * @throws {RangeError} when a part is not valid
 */
export function buildCardId({ date, swarm, agent, counter, slug }) {
  const refuse = (name, value, rule) => {
    throw new RangeError(`Card id ${name} ${JSON.stringify(value)} is not valid: ${rule}.`);
  };
  if (typeof date !== 'string' || !DATE_ONLY.test(date) || !isRealDate(date)) refuse('date', date, 'use a real calendar date as yymmdd');
  if (typeof swarm !== 'string' || !SWARM.test(swarm)) refuse('swarm', swarm, 'use 1 to 12 lowercase letters and digits');
  if (!isAgentCode(agent)) refuse('agent', agent, 'use one or two lowercase letters');
  if (!Number.isSafeInteger(counter) || counter < 1) refuse('counter', counter, 'use a positive whole number');
  if (typeof slug !== 'string' || !SLUG_ONLY.test(slug)) refuse('slug', slug, 'use lowercase letters and digits joined by single hyphens');
  const head = `${date}-${swarm}-${agent}${counter}-`;
  const kept = slug.slice(0, Math.max(MAX_CARD_ID_LENGTH - head.length, 0)).replace(/-+$/, '');
  if (kept === '') throw new RangeError(`The id parts ${head} leave no room for a slug within ${MAX_CARD_ID_LENGTH} characters.`);
  return head + kept;
}

/**
 * The id without its slug: `0033` for an old id, `270113-featurex-b3` for a new one.
 * @param {unknown} id
 * @returns {string | null} null when the value is not a card id
 */
export function cardIdPrefix(id) {
  const parsed = parseCardId(id);
  return parsed === null ? null : id.slice(0, id.length - parsed.slug.length - 1);
}
