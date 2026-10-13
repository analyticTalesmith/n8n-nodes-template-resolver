import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, isCardId, readCard } from '../lib/board.mjs';
import { ClaimError, claim, claimStatus, heartbeat, release } from '../lib/claim.mjs';

const ACTIONS = ['claim', 'heartbeat', 'release', 'status'];

/**
 * One-line text for a claim status.
 * @param {string} id
 * @param {ReturnType<typeof claimStatus>} status
 * @returns {string}
 */
export function formatClaim(id, status) {
  if (status.state === 'free') return `${id}: free`;
  const owner = status.owner ?? 'unknown';
  if (status.state === 'held') return `${id}: held by ${owner} (${status.minutes} min)`;
  const since = status.minutes === undefined ? 'unknown time' : `${status.minutes} min`;
  return `${id}: stale, last heartbeat ${since} ago, held by ${owner}`;
}

/**
 * One-line description of a card's claim for the board.
 * @param {string} projectDir
 * @param {string} id
 * @param {Date} [now]
 * @returns {string}
 */
export function describeClaim(projectDir, id, now = new Date()) {
  return formatClaim(id, claimStatus(readCard(projectDir, id), now));
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = `Usage: node claim.mjs <projectDir> <${ACTIONS.join('|')}> <id> [--owner <name>] (--owner is required except for status and may be given once)`;
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const positional = [];
  let owner;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      if (args[i] !== '--owner') usage(`Unknown option ${args[i]}.`);
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) usage('--owner requires a value.');
      if (owner !== undefined) usage('--owner given more than once.');
      owner = value;
      i++;
    } else {
      positional.push(args[i]);
    }
  }
  const [projectDir, action, id] = positional;
  if (positional.length !== 3) usage('Expected a project directory, an action and a card id.');
  if (!ACTIONS.includes(action)) usage(`Unknown action "${action}".`);
  if (!isCardId(id)) usage(`"${id}" is not a card id (like 0001-some-title).`);
  if (action !== 'status' && owner === undefined) usage(`--owner is required for ${action}.`);
  const dir = resolve(projectDir);
  try {
    if (action === 'claim') {
      claim(dir, id, owner);
      console.log(`claimed ${id} by ${owner.trim()}`);
    } else if (action === 'heartbeat') {
      heartbeat(dir, id, owner);
      console.log(`heartbeat ${id}`);
    } else if (action === 'release') {
      release(dir, id, owner);
      console.log(`released ${id}`);
    } else {
      console.log(describeClaim(dir, id));
    }
  } catch (err) {
    if (err instanceof ClaimError || err instanceof BoardError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
