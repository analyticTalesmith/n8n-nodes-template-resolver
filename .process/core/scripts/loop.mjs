import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoopError, loopStatus, recordIteration, resumeLoop, startLoop } from '../lib/loop.mjs';

const USAGE = 'Usage: node loop.mjs <projectDir> <cycle> start | status | record --iteration <n> --unit <text> --action <text> --outcome <ok|fail|blocked|waiting> --progress <n> [--failure <signature>] [--spawns <n>] [--cost <n>] [--wait <item>] [--clear <item>] [--decided <text>] [--sweep-round <n>] | resume --by <name>';
const REPEAT = new Set(['wait', 'clear', 'decided']);
const RECORD = new Set(['iteration', 'unit', 'action', 'outcome', 'progress', 'failure', 'spawns', 'cost', 'wait', 'clear', 'decided', 'sweep-round']);

function options(args, allowed) {
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!flag?.startsWith('--') || !allowed.has(flag.slice(2)) || i + 1 >= args.length || args[i + 1].startsWith('--')) throw new Error(`Unknown or incomplete option ${flag ?? '(missing)'}.`);
    const name = flag.slice(2);
    if (REPEAT.has(name)) (result[name] ??= []).push(args[i + 1]);
    else if (Object.hasOwn(result, name)) throw new Error(`Option ${flag} may appear once.`);
    else result[name] = args[i + 1];
  }
  return result;
}

export function runLoop(args, output = console) {
  if (args.length < 3) throw new Error('Expected project directory, cycle and command.');
  const [dir, cycle, command, ...rest] = args;
  const projectDir = resolve(dir);
  if (command === 'start') {
    if (rest.length) throw new Error('start takes no options.');
    const ledger = startLoop(projectDir, cycle);
    output.log(`started: iteration ${ledger.iteration}`);
    return;
  }
  if (command === 'status') {
    if (rest.length) throw new Error('status takes no options.');
    const status = loopStatus(projectDir, cycle);
    output.log(status.verdict === 'continue' || status.verdict === 'done' ? status.verdict : `${status.verdict}: ${status.detail}`);
    for (const note of status.notes) output.log(`note: ${note}`);
    return;
  }
  if (command === 'record') {
    const input = options(rest, RECORD);
    for (const key of ['iteration', 'unit', 'action', 'outcome', 'progress']) if (!Object.hasOwn(input, key)) throw new Error(`record needs --${key}.`);
    const { written, ledger } = recordIteration(projectDir, cycle, {
      iteration: input.iteration, unit: input.unit, action: input.action, outcome: input.outcome,
      progress: input.progress, failure: input.failure, spawns: input.spawns, cost: input.cost,
      wait: input.wait, clear: input.clear, decided: input.decided, sweepRound: input['sweep-round'],
    });
    output.log(written ? `recorded: iteration ${ledger.iteration}` : `already recorded: iteration ${ledger.iteration}`);
    return;
  }
  if (command === 'resume') {
    const input = options(rest, new Set(['by']));
    if (!input.by) throw new Error('resume needs --by <name>.');
    const ledger = resumeLoop(projectDir, cycle, { by: input.by });
    output.log(`resumed: iteration ${ledger.iteration}`);
    return;
  }
  throw new Error(`Unknown loop command ${command}.`);
}

const isMain = (() => {
  try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();

if (isMain) {
  try { runLoop(process.argv.slice(2)); }
  catch (error) {
    console.error(error instanceof LoopError ? error.message : `${error.message} ${USAGE}`);
    process.exit(error instanceof LoopError ? 1 : 2);
  }
}
