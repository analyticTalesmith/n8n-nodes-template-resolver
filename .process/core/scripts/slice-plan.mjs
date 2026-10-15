import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError } from '../lib/board.mjs';
import { WORK_DIR } from '../lib/layout.mjs';
import { SlicePlanError, generateSlicePlan } from '../lib/slice-plan.mjs';

export { SlicePlanError, generateSlicePlan };

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = `Usage: node slice-plan.mjs <projectDir> (<cycleName> | --parent <cardId>) [--force]  (writes ${WORK_DIR}/<slice>/slice-plan.md)`;
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const args = process.argv.slice(2);
  const positional = [];
  let parent;
  let force = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--parent') {
      if (parent !== undefined || i + 1 >= args.length) usage('--parent needs one card id, given once.');
      parent = args[++i];
    } else if (args[i] === '--force') {
      force = true;
    } else if (args[i].startsWith('--')) {
      usage(`Unknown option ${args[i]}.`);
    } else {
      positional.push(args[i]);
    }
  }
  if (positional.length !== (parent === undefined ? 2 : 1)) {
    usage(parent === undefined ? 'Expected a project directory and a cycle name.' : 'Expected a project directory (and no cycle name with --parent).');
  }
  const [projectDir, cycle] = positional;
  try {
    const result = generateSlicePlan(resolve(projectDir), parent === undefined ? { cycle } : { parent }, { force });
    console.log(`Wrote ${result.path} (${result.waves.length} wave${result.waves.length === 1 ? '' : 's'}, ${result.conflicts.length} scope conflict${result.conflicts.length === 1 ? '' : 's'}).`);
    for (const id of result.flagged) console.log(`Flag: ${id} has no context links.`);
  } catch (err) {
    if (err instanceof SlicePlanError) {
      console.error(`${err.detail}: ${err.message}`);
      process.exit(err.detail === 'selector' ? 2 : 1);
    }
    if (err instanceof BoardError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
