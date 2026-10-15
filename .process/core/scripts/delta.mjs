import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeltaError, addDeltas, applyDeltas, listDeltas, validateCycleDocs } from '../lib/delta.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE =
    'Usage: node delta.mjs <projectDir> add <cycle> <slug> --op <op> --target <path> --summary <text> [--body-file <path>] | list <cycle> | apply <cycle> [slug] | validate <cycle>\n' +
    'add: repeat --target to record one delta per document (slugs become <slug>-1, <slug>-2, ...); give --summary once to share it, or repeat --summary once per --target in order. A missing target for op add gets a planned stub from the document template; every target is checked first and nothing is written if any is refused.';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  if (process.argv.slice(2).some((arg) => arg === '--help' || arg === '-h')) {
    console.log(USAGE);
    process.exit(0);
  }
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
    const name = rest[i].slice(2);
    if (name === 'target' || name === 'summary') (options[name] ??= []).push(value);
    else options[name] = value;
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
    const { target: targets, summary: summaries } = options;
    if (summaries.length !== 1 && summaries.length !== targets.length) {
      usage(`Got ${summaries.length} --summary values for ${targets.length} --target values: give one shared summary or one per target.`);
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
      const targets = options.target;
      const entries = targets.map((target, i) => ({
        slug: targets.length === 1 ? slug : `${slug}-${i + 1}`,
        op: options.op,
        target,
        summary: options.summary[options.summary.length === 1 ? 0 : i],
        body,
      }));
      const missing = new Set(targets.filter((target) => !existsSync(resolve(dir, target))));
      for (const delta of addDeltas(dir, cycle, entries)) {
        console.log(`added delta ${delta.slug}: ${delta.op} ${delta.target} (${delta.path})`);
        if (delta.op === 'add' && missing.has(delta.target)) {
          console.log(`created planned stub ${delta.target} from the document template with the delta summary; fill in its Purpose section and refine the summary.`);
        }
      }
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
