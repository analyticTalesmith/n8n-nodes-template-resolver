import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, cardLabel, isCardQuery, resolveCard } from '../lib/board.mjs';
import { CycleError } from '../lib/cycle.mjs';
import { TicketError, closeTicket, listTickets, releaseTicket, selectTicket } from '../lib/ticket.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = 'Usage: node ticket.mjs <projectDir> list | select <cycle> <id> | release <id> | close <id> --reason <text>';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const [projectDir, command, ...rest] = process.argv.slice(2);
  if (!projectDir || projectDir.startsWith('--')) usage('Missing project directory.');
  if (!['list', 'select', 'release', 'close'].includes(command)) usage(`Unknown command ${command ?? '(none)'}.`);
  const wanted = command === 'list' ? 0 : command === 'select' ? 2 : command === 'release' ? 1 : 3;
  if (rest.length < wanted) usage(command === 'select' ? 'select needs a cycle and a ticket id.' : command === 'release' ? 'release needs a ticket id.' : command === 'close' ? 'close needs a ticket id and --reason <text>.' : 'Missing arguments.');
  if (rest.length > wanted) usage(`${command} takes ${wanted} argument${wanted === 1 ? '' : 's'}, got ${rest.length}.`);
  if (command === 'close' && rest[1] !== '--reason') usage('close needs --reason <text>.');
  const idArg = command === 'select' ? rest[1] : command === 'list' ? undefined : rest[0];
  if (idArg !== undefined && !isCardQuery(idArg)) usage(`"${idArg}" is not a card id or prefix (lowercase letters, digits and hyphens).`);
  try {
    const dir = resolve(projectDir);
    if (command === 'list') {
      for (const { id, title, type, origin } of listTickets(dir)) {
        console.log(`${cardLabel({ id, title })}  ${type}${origin ? `  (from ${origin})` : ''}`);
      }
    } else if (command === 'select') {
      const { id, label } = resolveCard(dir, rest[1]);
      const { cycle } = selectTicket(dir, rest[0], id);
      console.log(`selected ${label} into cycle ${cycle}`);
    } else if (command === 'release') {
      const { id, label } = resolveCard(dir, rest[0]);
      const { cycle } = releaseTicket(dir, id);
      console.log(`released ${label} from cycle ${cycle} to backlog`);
    } else {
      const { id, label } = resolveCard(dir, rest[0]);
      closeTicket(dir, id, rest[2]);
      console.log(`closed ${label}`);
    }
  } catch (err) {
    if (!(err instanceof TicketError || err instanceof CycleError || err instanceof BoardError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}
