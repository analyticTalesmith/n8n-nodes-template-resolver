import { mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, cardExists, cardFolder, nextCardId, siblingIds } from '../lib/board.mjs';
import { CARD_TYPES, newCard } from '../lib/card.mjs';
import { applyScopeBlock } from '../lib/card-scope.mjs';
import { CycleError, readCycle } from '../lib/cycle.mjs';
import { COLUMNS, TIERS } from '../lib/layout.mjs';

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');

/** A ticket template (card.md or context.md) with its {{title}} filled in, read with LF line ends. */
function fromTemplate(name, title) {
  return readFileSync(join(TEMPLATES, name), 'utf8').replaceAll('\r\n', '\n').replace('{{title}}', () => title);
}

/**
 * Creates a card in the first column of an open cycle, or in the global backlog when no cycle is given. Everything
 * is checked before anything is written.
 * @param {string} projectDir
 * card.md and context.md are written first (from core/templates) and card.json last: a folder without card.json is not a card, so card.json is
 * the commit point. If anything fails after the folder exists, the folder is removed again.
 * @param {{ title: string, type: string, cycle?: string, origin?: string | null, tier?: string, parent?: string, dependsOn?: string[] }} init
 *   origin is where the card came from (a cycle name or null); it defaults to the cycle the card is created in, or null
 * @param {{ writeFile?: typeof writeFileSync }} [io] replaceable file writer, for tests
 * @returns {import('../lib/card.mjs').Card}
 */
export function createCard(projectDir, { title, type, cycle, origin = cycle ?? null, tier, parent, dependsOn = [] }, { writeFile = writeFileSync, dataRoot } = {}) {
  if (!CARD_TYPES.includes(type)) {
    throw new BoardError(`Unknown card type "${type}". Use one of: ${CARD_TYPES.join(', ')}.`);
  }
  if (tier !== undefined && !TIERS.includes(tier)) {
    throw new BoardError(`Unknown card tier "${tier}". Use one of: ${TIERS.join(', ')}.`);
  }
  if (origin !== null && (typeof origin !== 'string' || origin === '')) {
    throw new BoardError(`A card origin is a non-empty string or null, not ${JSON.stringify(origin)}.`);
  }
  for (const id of [...(parent ? [parent] : []), ...dependsOn]) {
    if (!cardExists(projectDir, id, { dataRoot })) {
      throw new BoardError(`Card ${id} does not exist on the board or in the archive. Create it first or fix the id.`);
    }
  }
  if (cycle !== undefined) {
    let existing;
    try {
      existing = readCycle(projectDir, cycle);
    } catch (cause) {
      if (!(cause instanceof CycleError)) throw cause;
      throw new BoardError(`Cycle ${cycle} cannot take the card: ${cause.message}`, { cause });
    }
    if (existing.status !== 'open') {
      throw new BoardError(`Cycle ${cycle} is closed, so it takes no new cards. Pick an open cycle, or leave --cycle out to file the card in the global backlog.`);
    }
  }
  const id = nextCardId(projectDir, title, { dataRoot });
  const card = newCard({ id, title, type });
  card.parent = parent ?? null;
  card.depends_on = [...dependsOn];
  card.origin = origin;
  card.tier = tier ?? null;

  const dir = cardFolder(projectDir, cycle ?? null, COLUMNS[0], id, { dataRoot });
  mkdirSync(dirname(dir), { recursive: true });
  try {
    mkdirSync(dir);
  } catch (cause) {
    if (cause.code === 'EEXIST') {
      throw new BoardError(`${id} already exists at ${dir}, probably created at the same moment. Run the command again.`, {
        cause,
      });
    }
    throw cause;
  }
  try {
    const rivals = siblingIds(projectDir, id, { dataRoot });
    if (rivals.length) {
      throw new BoardError(
        `Another card with number ${id.slice(0, 4)} (${rivals.join(', ')}) appeared at the same moment, so ${id} was not created. Run the command again.`,
      );
    }
    writeFile(join(dir, 'card.md'), applyScopeBlock(fromTemplate('card.md', title), card).text);
    writeFile(join(dir, 'context.md'), fromTemplate('context.md', title));
    writeFile(join(dir, 'card.json'), JSON.stringify(card, null, 2) + '\n');
  } catch (cause) {
    rmSync(dir, { recursive: true, force: true });
    if (cause instanceof BoardError) throw cause;
    throw new BoardError(`Could not create ${id} (${cause.message}). Nothing was kept; run the command again.`, { cause });
  }
  return card;
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE =
    'Usage: node card-new.mjs <projectDir> --title <title> --type <type> [--cycle <name> | --origin <cycle>] [--tier <tier>] [--parent <id>] [--depends-on <id>]...';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const [projectDir, ...args] = process.argv.slice(2);
  if (!projectDir || projectDir.startsWith('--')) usage('Missing project directory.');
  const FLAGS = ['--title', '--type', '--cycle', '--origin', '--tier', '--parent', '--depends-on'];
  const options = { dependsOn: [] };
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!FLAGS.includes(flag)) usage(`Unknown option ${flag}.`);
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) usage(`${flag} requires a value.`);
    if (flag === '--depends-on') options.dependsOn.push(value);
    else options[flag.slice(2)] = value;
  }
  if (options.title === undefined) usage('--title is required.');
  if (options.type === undefined) usage('--type is required.');
  if (options.cycle !== undefined && options.origin !== undefined) {
    usage('Give one of --cycle or --origin: --cycle files the card in that cycle, --origin files it in the global backlog noting the cycle it came from.');
  }
  try {
    // Checked here, not in createCard: its other callers pass origins of their own.
    if (options.origin !== undefined) {
      try {
        readCycle(projectDir, options.origin);
      } catch (cause) {
        if (!(cause instanceof CycleError)) throw cause;
        throw new BoardError(`--origin ${options.origin} names no usable cycle: ${cause.message}`, { cause });
      }
    }
    console.log(createCard(projectDir, options).id);
  } catch (err) {
    if (!(err instanceof BoardError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}
