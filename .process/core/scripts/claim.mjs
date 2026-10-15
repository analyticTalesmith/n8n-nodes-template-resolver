import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, isCardQuery, readCard, resolveCard } from '../lib/board.mjs';
import { isAgentCode } from '../lib/card-id.mjs';
import { ClaimError, claim, claimStatus, heartbeat, markBuilt, release } from '../lib/claim.mjs';

const ACTIONS = ['claim', 'heartbeat', 'done', 'release', 'status'];

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
  const USAGE = `Usage: node claim.mjs <projectDir> <${ACTIONS.join('|')}> <id> [--owner <name>] [--agent <letters>] (--owner is required except for status and may be given once; --agent, one or two lowercase letters, is only for claim and may be given once)`;
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const positional = [];
  let owner;
  let agent;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      if (args[i] !== '--owner' && args[i] !== '--agent') usage(`Unknown option ${args[i]}.`);
      const flag = args[i];
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) usage(`${flag} requires a value.`);
      if (flag === '--owner') {
        if (owner !== undefined) usage('--owner given more than once.');
        owner = value;
      } else {
        if (agent !== undefined) usage('--agent given more than once.');
        agent = value;
      }
      i++;
    } else {
      positional.push(args[i]);
    }
  }
  const [projectDir, action, query] = positional;
  if (positional.length !== 3) usage('Expected a project directory, an action and a card id.');
  if (!ACTIONS.includes(action)) usage(`Unknown action "${action}".`);
  if (!isCardQuery(query)) usage(`"${query}" is not a card id or prefix (lowercase letters, digits and hyphens).`);
  if (agent !== undefined && action !== 'claim') usage(`--agent is only for claim, not ${action}.`);
  if (agent !== undefined && !isAgentCode(agent)) usage(`--agent ${JSON.stringify(agent)} is not an agent code: use one or two lowercase letters.`);
  if (action !== 'status' && owner === undefined) usage(`--owner is required for ${action}.`);
  const dir = resolve(projectDir);
  try {
    const { id, label } = resolveCard(dir, query);
    if (action === 'claim') {
      claim(dir, id, owner, new Date(), { agent });
      console.log(`claimed ${label} by ${owner.trim()}${agent === undefined ? '' : ` as agent ${agent}`}`);
    } else if (action === 'heartbeat') {
      heartbeat(dir, id, owner);
      console.log(`heartbeat ${label}`);
    } else if (action === 'done') {
      markBuilt(dir, id, owner);
      console.log(`built ${label}`);
    } else if (action === 'release') {
      release(dir, id, owner, { onWarnings: (messages) => messages.forEach((m) => console.log(`warning: ${m}`)) });
      console.log(`released ${label}`);
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
