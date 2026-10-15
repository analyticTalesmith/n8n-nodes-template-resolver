import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, archivedIds, cardLabel, isCardId, listCards } from '../lib/board.mjs';
import { findCycle, parallelGroups } from '../lib/graph.mjs';
import { instructionsOf } from '../lib/card.mjs';
import { CycleError, readCycle } from '../lib/cycle.mjs';
import { readCycleInstructions } from '../lib/depth.mjs';
import { STAGE } from '../lib/layout.mjs';

/** @typedef {import('../lib/card.mjs').Card} Card */

const MAX_GROUP = 4;
const READY = STAGE.ready;
const DONE = STAGE.done;

export class NextError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NextError';
  }
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * What can be worked on now in a cycle, what is blocked and why, and which ready cards may run together.
 * @param {string} projectDir
 * @param {string} cycleName
 * @returns {{ ready: Card[], groups: Card[][], blocked: Array<{ id: string, reason: string }>, instructions: Array<{ source: string, text: string }> }}
 */
export function next(projectDir, cycleName) {
  const cycle = readCycle(projectDir, cycleName);
  if (cycle.status !== 'open') {
    throw new NextError(`Cycle ${cycleName} is closed, so nothing in it is picked up. Pick an open cycle.`);
  }
  const all = listCards(projectDir);
  const mine = all.filter((e) => e.cycle === cycleName);

  const loop = findCycle(mine.filter((e) => e.column !== DONE).map((e) => e.card));
  if (loop) {
    throw new NextError(
      `Cycle ${cycleName} has a dependency loop: ${[...loop, loop[0]].join(' -> ')}. Remove one depends_on link on it.`,
    );
  }

  const entries = new Map(all.map((e) => [e.card.id, e]));
  const archivedSet = archivedIds(projectDir);
  const archived = (id) => archivedSet.has(id);
  const pending = (dep) => {
    if (!isCardId(dep)) return 'dependency not found';
    if (archived(dep)) return null;
    const entry = entries.get(dep);
    if (!entry) return 'dependency not found';
    if (entry.column === DONE) return null;
    if (entry.cycle !== cycleName) return 'outside cycle';
    return `waiting for ${dep} (${entry.column})`;
  };

  const ready = [];
  const blocked = [];
  for (const { column, card } of mine) {
    if (column !== READY) continue;
    if (card.claim !== null) {
      blocked.push({ id: card.id, reason: `claimed by ${card.claim.owner}` });
      continue;
    }
    const reasons = card.depends_on.map(pending).filter((r) => r !== null);
    if (reasons.length) blocked.push({ id: card.id, reason: reasons.join('; ') });
    else ready.push(card);
  }
  ready.sort(byId);
  blocked.sort(byId);
  const instructions = [
    ...readCycleInstructions(projectDir, cycleName).map((text) => ({ source: 'cycle', text })),
    ...ready.flatMap((card) => instructionsOf(card).map((text) => ({ source: card.id, text }))),
  ];
  return { ready, groups: parallelGroups(ready, MAX_GROUP), blocked, instructions };
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = 'Usage: node next.mjs <projectDir> <cycleName>';
  const args = process.argv.slice(2);
  const flag = args.find((a) => a.startsWith('--'));
  if (flag || args.length !== 2) {
    console.error(`${flag ? `Unknown option ${flag}.` : 'Expected a project directory and a cycle name.'} ${USAGE}`);
    process.exit(2);
  }
  try {
    const { ready, groups, blocked, instructions } = next(resolve(args[0]), args[1]);
    if (ready.length === 0) console.log('ready: none');
    for (const card of ready) console.log(`ready  ${cardLabel(card)}`);
    groups.forEach((g, i) => g.forEach((card) => console.log(`group ${i + 1}  ${cardLabel(card)}`)));
    const titles = new Map(listCards(resolve(args[0])).map(({ card }) => [card.id, card.title]));
    for (const b of blocked) console.log(`blocked  ${cardLabel({ id: b.id, title: titles.get(b.id) ?? '' })}: ${b.reason}`);
    for (const i of instructions) console.log(`instruction ${i.source}: ${i.text}`);
  } catch (err) {
    if (err instanceof NextError || err instanceof BoardError || err instanceof CycleError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
