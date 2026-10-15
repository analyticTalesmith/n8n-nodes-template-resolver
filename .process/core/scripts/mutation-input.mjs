import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GitError, addedLines, effectiveBase, runGit, shortSha } from '../lib/git.mjs';
import { DEFAULT_MAX, mutationCandidates, renderMutationInput } from '../lib/mutation-input.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = 'Usage: node mutation-input.mjs <projectDir> --base <ref> [--max <count>]';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const positional = [];
  /** @type {{ base?: string, max?: number }} */
  const options = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) {
      positional.push(args[i]);
      continue;
    }
    const value = args[i + 1];
    if (args[i] !== '--base' && args[i] !== '--max') usage(`Unknown option ${args[i]}.`);
    if (value === undefined || value.startsWith('-')) usage(`${args[i]} requires a value.`);
    if (args[i] === '--base') options.base = value;
    else if (/^[1-9]\d{0,3}$/.test(value)) options.max = Number(value);
    else usage('--max must be a positive whole number.');
    i++;
  }
  if (positional.length !== 1) usage('Expected one project directory.');
  if (options.base === undefined) usage('--base is required.');
  try {
    const projectDir = resolve(positional[0]);
    const base = effectiveBase(projectDir, options.base);
    const sha = runGit(projectDir, ['rev-parse', '--verify', `${base}^{commit}`]).trim();
    const lines = addedLines(projectDir, sha);
    const candidates = mutationCandidates(lines, { max: options.max ?? DEFAULT_MAX });
    process.stdout.write(renderMutationInput(candidates, { base: shortSha(sha), considered: lines.length }));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(err instanceof GitError ? 1 : 2);
  }
}
