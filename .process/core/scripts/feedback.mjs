import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CycleError } from '../lib/cycle.mjs';
import { FeedbackError, addBatch, addFeedback, listFeedback, routeFeedback, sessionFolders, takeFeedback } from '../lib/feedback.mjs';
import { ProjectRootsError } from '../lib/project-roots.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE =
    'Usage: node feedback.mjs <projectDir> add --summary <text> --stream <s> --level <l> --source <text> [--severity <s>] [--priority <p>] [--cycle <name>] [--body-file <path>] | list [--cycle <name>] | session-path [--cycle <name>] | take <file> <cycle> | add-batch <digest> | route --triage <file>';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const [projectDir, command, ...rest] = process.argv.slice(2);
  if (!projectDir || projectDir.startsWith('--')) usage('Missing project directory.');
  if (!['add', 'list', 'session-path', 'take', 'add-batch', 'route'].includes(command)) usage(`Unknown command ${command ?? '(none)'}.`);
  let positional = [];
  let flags = rest;
  if (command === 'take') {
    positional = rest;
    flags = [];
    if (positional.length !== 2) usage('take needs an inbox file and a cycle.');
  }
  if (command === 'add-batch') {
    positional = rest;
    flags = [];
    if (positional.length !== 1) usage('add-batch needs one digest path.');
  }
  const FLAGS = {
    add: ['--summary', '--stream', '--level', '--source', '--severity', '--priority', '--cycle', '--body-file'],
    list: ['--cycle'],
    'session-path': ['--cycle'],
    take: [],
    'add-batch': [],
    route: ['--triage'],
  }[command];
  const options = {};
  for (let i = 0; i < flags.length; i += 2) {
    const flag = flags[i];
    if (!FLAGS.includes(flag)) usage(`Unknown option ${flag}.`);
    const value = flags[i + 1];
    if (value === undefined || value.startsWith('--')) usage(`${flag} requires a value.`);
    options[flag.slice(2)] = value;
  }
  if (command === 'add') {
    for (const required of ['summary', 'stream', 'level', 'source']) {
      if (options[required] === undefined) usage(`--${required} is required.`);
    }
  }
  if (command === 'route' && options.triage === undefined) usage('--triage is required.');
  try {
    const dir = resolve(projectDir);
    if (command === 'add') {
      let body;
      if (options['body-file'] !== undefined) {
        try {
          body = readFileSync(options['body-file'], 'utf8');
        } catch (cause) {
          throw new FeedbackError(`Cannot read the body file ${options['body-file']} (${cause.message}). Check the path.`);
        }
      }
      const { summary, stream, level, source, cycle, severity, priority } = options;
      console.log(`added ${addFeedback(dir, { summary, stream, level, source, cycle, body, severity, priority }).path}`);
    } else if (command === 'list') {
      for (const { path, summary, stream, level, status, severity, priority } of listFeedback(dir, { cycle: options.cycle })) {
        const rated = [severity && `severity ${severity}`, priority && `priority ${priority}`].filter(Boolean).join(', ');
        console.log(`${path}  ${stream}  ${level}  ${status}  ${summary}${rated ? `  (${rated})` : ''}`);
      }
    } else if (command === 'session-path') {
      const { session, digest } = sessionFolders(dir, { cycle: options.cycle });
      console.log(`session: ${session}`);
      console.log(`digest: ${digest}`);
    } else if (command === 'take') {
      console.log(`moved to ${takeFeedback(dir, positional[0], positional[1]).path}`);
    } else if (command === 'add-batch') {
      const { paths, questions } = addBatch(dir, positional[0]);
      for (const path of paths) console.log(`added ${path}`);
      for (const question of questions) console.log(`question: ${question}`);
    } else {
      for (const { item, status, routed_to } of routeFeedback(dir, options.triage).routed) {
        console.log(`routed ${item} -> ${status} ${routed_to}`.trimEnd());
      }
    }
  } catch (err) {
    if (!(err instanceof FeedbackError || err instanceof CycleError || err instanceof ProjectRootsError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}
