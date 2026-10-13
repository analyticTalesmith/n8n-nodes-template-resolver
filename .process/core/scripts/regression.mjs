import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, readCard } from '../lib/board.mjs';
import { RegressionError, regressionFor } from '../lib/regression.mjs';
import { readTierData } from '../lib/gate.mjs';
import { resolveDepth } from '../lib/depth.mjs';
import { effectiveTier } from '../lib/tier.mjs';

export { RegressionError, regressionFor };

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

/** One line saying what regression the card's tier asks for. Never throws. */
function tierLine(projectDir, cardId) {
  try {
    const card = readCard(projectDir, cardId);
    const { tier } = effectiveTier(projectDir, card);
    const { regression } = resolveDepth({ tierData: readTierData(projectDir).data, tier, card });
    const asks = regression['full-suite'].selected ? 'the full suite at the merge request plus selection per card' : regression.selection.selected ? 'selection per card' : 'no regression run';
    return `Tier ${tier} asks for ${asks}.`;
  } catch {
    return null;
  }
}

if (isMain) {
  const USAGE = 'Usage: node regression.mjs <projectDir> select <cardId> [--json]  (prints the regression run for a card from the module graph)';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const [projectDir, command, ...rest] = process.argv.slice(2);
  if (!projectDir || projectDir.startsWith('--')) usage('Missing project directory.');
  if (command !== 'select') usage(`Unknown command ${command ?? '(none)'}.`);
  const json = rest.includes('--json');
  const positional = rest.filter((arg) => arg !== '--json');
  if (rest.some((arg) => arg.startsWith('--') && arg !== '--json')) usage('Unknown option.');
  if (positional.length !== 1) usage('Expected one card id.');
  try {
    const dir = resolve(projectDir);
    const result = regressionFor(dir, positional[0]);
    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const tier = tierLine(dir, positional[0]);
      if (result.mode === 'full-suite') {
        console.log('FULL SUITE: run every test.');
        for (const reason of result.reasons) console.log(`  why: ${reason}`);
      } else {
        console.log(`selection: ${result.cards.length} card${result.cards.length === 1 ? '' : 's'}, modules ${result.closure.join(', ') || '(none)'}`);
        for (const reason of result.reasons) console.log(`  note: ${reason}`);
        for (const c of result.cards) console.log(`  ${c.id}${c.gate ? `  gate: ${c.gate.join(' ')}` : ''}`);
        for (const test of result.tests) console.log(`  test: ${test}`);
      }
      for (const f of result.findings) console.log(`  warning: ${f.message}`);
      if (tier !== null) console.log(tier);
    }
  } catch (err) {
    if (err instanceof RegressionError || err instanceof BoardError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
