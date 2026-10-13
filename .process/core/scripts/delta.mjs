import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeltaError, addDelta, applyDeltas, listDeltas, validateCycleDocs } from '../lib/delta.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE =
    'Usage: node delta.mjs <projectDir> add <cycle> <slug> --op <op> --target <path> --summary <text> [--body-file <path>] | list <cycle> | apply <cycle> [slug] | validate <cycle>';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const [projectDir, command, ...rest] = process.argv.slice(2);
  if (!projectDir || projectDir.startsWith('--')) usage('Missing project directory.');
  if (!['add', 'list', 'apply', 'validate'].includes(command)) usage(`Unknown command ${command ?? '(none)'}.`);
  const positional = [];
  const options = {};
  const FLAGS = command === 'add' ? ['--op', '--target', '--summary', '--body-file'] : [];
  for (let i = 0; i < rest.length; i += 1) {
    if (!rest[i].startsWith('--')) {
      positional.push(rest[i]);
      continue;
    }
    if (!FLAGS.includes(rest[i])) usage(`Unknown option ${rest[i]}.`);
    const value = rest[i + 1];
    if (value === undefined || value.startsWith('--')) usage(`${rest[i]} requires a value.`);
    options[rest[i].slice(2)] = value;
    i += 1;
  }
  const [cycle, slug, ...extra] = positional;
  if (!cycle) usage('Missing cycle name.');
  const MOST = { add: 2, list: 1, apply: 2, validate: 1 }[command];
  if (positional.length > MOST || extra.length > 0) usage(`Too many arguments for ${command}.`);
  if (command === 'add') {
    if (!slug) usage('Missing delta slug.');
    for (const required of ['op', 'target', 'summary']) {
      if (options[required] === undefined) usage(`--${required} is required.`);
    }
  }
  try {
    const dir = resolve(projectDir);
    if (command === 'add') {
      let body;
      if (options['body-file'] !== undefined) {
        try {
          body = readFileSync(resolve(options['body-file']), 'utf8');
        } catch (cause) {
          throw new DeltaError(`Cannot read the body file ${options['body-file']} (${cause.message}). Check the path.`);
        }
      }
      const delta = addDelta(dir, cycle, { slug, op: options.op, target: options.target, summary: options.summary, body });
      console.log(`added delta ${delta.slug}: ${delta.op} ${delta.target} (${delta.path})`);
    } else if (command === 'list') {
      const deltas = listDeltas(dir, cycle);
      if (deltas.length === 0) console.log(`no deltas in cycle ${cycle}`);
      for (const d of deltas) console.log(`${d.slug}\t${d.status}\t${d.op}\t${d.target}\t${d.summary}`);
    } else if (command === 'apply') {
      const { applied } = applyDeltas(dir, cycle, slug);
      if (applied.length === 0) console.log(`no open deltas in cycle ${cycle}`);
      for (const name of applied) console.log(`applied delta ${name}`);
    } else {
      const { validated } = validateCycleDocs(dir, cycle);
      if (validated.length === 0) console.log(`the close review of cycle ${cycle} names no documents`);
      for (const path of validated) console.log(`validated ${path}`);
    }
  } catch (err) {
    if (!(err instanceof DeltaError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}
