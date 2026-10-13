import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError } from '../lib/board.mjs';
import { ConfigError } from '../lib/config.mjs';
import { PackageError, buildEvaluatorPackage } from '../lib/evaluator-package.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = 'Usage: node evaluator-package.mjs <projectDir> card <cardId> [--base <ref>] | node evaluator-package.mjs <projectDir> cycle <cycleName>';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const positional = [];
  /** @type {{ base?: string }} */
  const options = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      if (args[i] !== '--base') usage(`Unknown option ${args[i]}.`);
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) usage('--base requires a value.');
      if (options.base !== undefined) usage('--base given more than once.');
      options.base = value;
      i++;
    } else {
      positional.push(args[i]);
    }
  }
  const [projectDir, kind, name] = positional;
  if (positional.length !== 3 || !['card', 'cycle'].includes(kind)) usage('Expected a project directory, then card or cycle, then its name.');
  if (kind === 'cycle' && options.base !== undefined) usage('--base applies to a card package only.');
  try {
    const result = buildEvaluatorPackage(resolve(projectDir), kind === 'card' ? { card: name } : { cycle: name }, options);
    console.log(`package ${result.path} sha256 ${result.sha256}`);
    for (const [section, bytes] of Object.entries(result.stageBytes)) console.log(`${section}: ${bytes}`);
  } catch (err) {
    if (err instanceof PackageError) {
      for (const f of err.findings) console.error(`${f.rule}: ${f.message}`);
      process.exit(1);
    }
    if (err instanceof ConfigError || err instanceof BoardError) {
      console.error(err.message);
      process.exit(1);
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
}
