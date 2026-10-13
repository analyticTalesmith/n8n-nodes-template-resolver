#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DocsMoveError, applyDocsMove, planDocsMove } from '../lib/docs-move.mjs';

const isMain = (() => {
  try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();

if (isMain) {
  const usage = 'Usage: aperture docs move <projectDir> --to local|shared [--apply]';
  const args = process.argv.slice(2);
  let target;
  let apply = false;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--to') target = args[++i];
    else if (args[i] === '--apply') apply = true;
    else if (args[i].startsWith('--')) { console.error(`Unknown option ${args[i]}. ${usage}`); process.exit(2); }
    else positional.push(args[i]);
  }
  if (positional.length !== 1 || !['local', 'shared'].includes(target)) { console.error(usage); process.exit(2); }
  try {
    const plan = planDocsMove(positional[0], target);
    console.log(`from: ${plan.source}`);
    console.log(`to: ${plan.destination}`);
    for (const file of plan.files) console.log(`copy ${file.path} -> ${file.destination}`);
    for (const file of plan.privateFiles) console.log(`keep private ${file.path} -> ${file.destination}`);
    if (plan.from === 'shared') console.log('Earlier Git commits remain visible after this move.');
    if (!apply) console.log('dry run: nothing changed; add --apply to move docs');
    else {
      const result = applyDocsMove(plan);
      console.log(`active docs: ${result.active}`);
      console.log(`source retained: ${result.retained}`);
    }
  } catch (error) {
    console.error(`${error.rule ?? 'docs-move-failed'}: ${error.message}`);
    process.exit(error instanceof DocsMoveError || error.rule ? 1 : 2);
  }
}
