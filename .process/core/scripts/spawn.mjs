import { pathToFileURL } from 'node:url';
import { SpawnError, launchMember } from '../lib/spawn.mjs';

const USAGE = 'Usage: node spawn.mjs <projectDir> <team>:<role> --brief <file> [--cwd <path>] [--card <id>] [--print]';

/**
 * Parses the arguments after the script name. Returns the usage problem instead of throwing.
 * @param {string[]} args
 */
export function parseArgs(args) {
  const [projectDir, target, ...rest] = args;
  if (!projectDir || !target || projectDir.startsWith('--') || target.startsWith('--')) return { problem: 'Missing project directory or <team>:<role>.' };
  const [team, role, ...extra] = target.split(':');
  if (!team || !role || extra.length > 0) return { problem: `"${target}" is not <team>:<role>.` };
  const options = {};
  let print = false;
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--print' && !print) print = true;
    else if (['--brief', '--cwd', '--card'].includes(arg) && rest[i + 1] !== undefined && !rest[i + 1].startsWith('--') && options[arg.slice(2)] === undefined) {
      options[arg.slice(2)] = rest[i + 1];
      i += 1;
    } else return { problem: `Unexpected argument ${arg}.` };
  }
  if (options.brief === undefined) return { problem: '--brief <file> is required.' };
  return { projectDir, team, role, briefFile: options.brief, cwd: options.cwd, cardId: options.card, print };
}

/**
 * Runs the launcher. Exit 0 done (or the member's own status), 1 refused (one line naming the cause), 2 usage.
 * @param {string[]} args
 * @param {{ out?: (text: string) => void, err?: (text: string) => void }} [io]
 * @returns {number}
 */
export function main(args, { out = console.log, err = console.error } = {}) {
  const parsed = parseArgs(args);
  if (parsed.problem) {
    err(`${parsed.problem} ${USAGE}`);
    return 2;
  }
  try {
    const result = launchMember(parsed);
    if (result.print) out(JSON.stringify(result.print, null, 2));
    return result.status ?? 1;
  } catch (cause) {
    if (cause instanceof SpawnError) {
      err(cause.message);
      return 1;
    }
    throw cause;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main(process.argv.slice(2));
