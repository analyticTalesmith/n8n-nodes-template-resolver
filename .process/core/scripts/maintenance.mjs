import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GitError } from '../lib/git.mjs';
import { MaintenanceError, formatReport, sweep } from '../lib/maintenance.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

/** The optional pull request lookup through gh; null when gh is missing, so the sweep still works without it. */
function ghLookup(cwd) {
  try {
    execFileSync('gh', ['--version'], { stdio: 'ignore' });
  } catch {
    return undefined;
  }
  return (branch) => {
    try {
      const out = execFileSync('gh', ['pr', 'list', '--head', branch, '--state', 'merged', '--json', 'headRefOid,state', '--limit', '1'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const [first] = JSON.parse(out);
      return first ? { state: first.state, headSha: first.headRefOid } : null;
    } catch {
      return null;
    }
  };
}

if (isMain) {
  const USAGE = 'Usage: node maintenance.mjs <projectDir> sweep [--apply] [--base <branch>] [--remote <remote>/<branch>]... [--no-gh]';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const [projectDir, command, ...rest] = process.argv.slice(2);
  if (!projectDir || projectDir.startsWith('--')) usage('Missing project directory.');
  if (command !== 'sweep') usage(`Unknown command ${command ?? '(none)'}.`);
  const options = { apply: false, remote: [], noGh: false };
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    if (flag === '--apply') options.apply = true;
    else if (flag === '--no-gh') options.noGh = true;
    else if (flag === '--base' || flag === '--remote') {
      const value = rest[i + 1];
      if (value === undefined || value.startsWith('--')) usage(`${flag} requires a value.`);
      if (flag === '--base') options.base = value;
      else options.remote.push(value);
      i += 1;
    } else usage(`Unknown option ${flag}.`);
  }
  if (options.remote.length > 0 && !options.apply) usage('--remote deletes remote branches, so it needs --apply.');
  try {
    const dir = resolve(projectDir);
    const result = sweep(dir, { apply: options.apply, base: options.base, remote: options.remote, pr: options.noGh ? undefined : ghLookup(dir) });
    console.log(formatReport(result));
  } catch (err) {
    if (!(err instanceof MaintenanceError || err instanceof GitError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}
