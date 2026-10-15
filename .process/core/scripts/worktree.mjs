import { pathToFileURL } from 'node:url';
import { createCardWorktree, syncCardWorktree, WorktreeError } from '../lib/worktree.mjs';
import { GitError } from '../lib/git.mjs';

const USAGE = 'Usage: node worktree.mjs <projectDir> <cardId> [--branch <name>] [--from <ref>] (--from skips the check that the card is committed on the cycle branch) | node worktree.mjs <projectDir> <cardId> sync [--branch <name>]';

/**
 * Parses the arguments after the script name. Returns the usage problem instead of throwing.
 * @param {string[]} args
 */
export function parseArgs(args) {
  const [projectDir, cardId, ...rest] = args;
  if (!projectDir || !cardId || projectDir.startsWith('--') || cardId.startsWith('--')) return { problem: 'Missing project directory or card id.' };
  let sync = false;
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === 'sync' && !sync) sync = true;
    else if ((arg === '--branch' || arg === '--from') && rest[i + 1] !== undefined && !rest[i + 1].startsWith('--') && options[arg.slice(2)] === undefined) {
      options[arg.slice(2)] = rest[i + 1];
      i += 1;
    } else return { problem: `Unexpected argument ${arg}.` };
  }
  if (sync && options.from !== undefined) return { problem: '--from only applies when creating a worktree.' };
  return { projectDir, cardId, sync, ...options };
}

/**
 * Runs the script. Exit 0 done, 1 refused (one line naming the cause), 2 usage.
 * @param {string[]} args
 * @param {{ out?: (line: string) => void, err?: (line: string) => void }} [io]
 * @returns {number}
 */
export function main(args, { out = console.log, err = console.error } = {}) {
  const parsed = parseArgs(args);
  if (parsed.problem) {
    err(`${parsed.problem} ${USAGE}`);
    return 2;
  }
  const { projectDir, cardId, sync, branch, from } = parsed;
  try {
    if (sync) {
      const result = syncCardWorktree({ projectDir, cardId, branch });
      if (result.moved.length === 0) out(`Nothing to sync: ${result.branch} has no commits that ${result.cycleBranch} lacks.`);
      else {
        out(`Fast-forwarded ${result.cycleBranch} to ${result.branch}, ${result.moved.length} commit${result.moved.length === 1 ? '' : 's'}:`);
        for (const line of result.moved) out(`  ${line}`);
      }
      return 0;
    }
    const result = createCardWorktree({ projectDir, cardId, branch, from });
    out(`Created branch ${result.branch} from ${result.from}.`);
    out(result.path);
    return 0;
  } catch (cause) {
    if (cause instanceof WorktreeError || cause instanceof GitError) {
      err(cause.message.replace(/\s+/g, ' ').trim());
      return 1;
    }
    throw cause;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main(process.argv.slice(2));
