import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, cardLabel, listCards } from '../lib/board.mjs';
import { CycleError, listCycles, readCycle } from '../lib/cycle.mjs';
import { STAGE } from '../lib/layout.mjs';
import { ProjectRootsError } from '../lib/project-roots.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

/** Open cards in the backlog and in open cycles, in the board reader's stable order. */
export function openBoard(projectDir) {
  const openCycles = new Set(listCycles(projectDir).filter((name) => readCycle(projectDir, name).status === 'open'));
  return listCards(projectDir).filter(({ cycle, column }) =>
    cycle === null || (openCycles.has(cycle) && column !== STAGE.done));
}

if (isMain) {
  const usage = 'Usage: node board.mjs <projectDir>';
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0].startsWith('--')) {
    console.error(usage);
    process.exit(2);
  }
  try {
    for (const { cycle, column, card } of openBoard(resolve(args[0]))) {
      console.log(cycle === null
        ? `backlog  ${cardLabel(card)}`
        : `${cycle}  ${column}  ${cardLabel(card)}`);
    }
  } catch (error) {
    if (!(error instanceof BoardError || error instanceof CycleError || error instanceof ProjectRootsError)) throw error;
    console.error(error.message);
    process.exit(1);
  }
}
