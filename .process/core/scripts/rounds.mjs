import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, isCardId } from '../lib/board.mjs';
import { RULINGS } from '../lib/review-schema.mjs';
import { MISMATCH_PREFIX, REPLY_TEXT_MAX, RoundsError, closeVerifiedByGate, fileAllDrift, fileDrift, readRounds, recordRound, replyToFinding, roundsReport, ruleOnFinding, syncReviewLog } from '../lib/rounds.mjs';

/** @typedef {import('../lib/rounds.mjs').RoundsReport} RoundsReport */

/**
 * The report as the lines the CLI prints.
 * @param {RoundsReport} report
 * @param {boolean} [withMismatch] whether the brief mismatch paragraph is printed; only record and status do
 * @returns {string[]}
 */
export function reportLines(report, withMismatch = false) {
  const list = (items) => (items.length ? items.join(', ') : 'none');
  return [
    `round: ${report.round}`,
    `fix requests: ${list(report.fixRequests)}`,
    `undecided drift: ${list(report.undecided)}`,
    `stalled: ${report.stalled ? 'yes' : 'no'}`,
    `back to shaping: ${list(report.backToShaping)}`,
    `clear: ${report.clear ? 'yes' : 'no'}`,
    ...report.messages.filter((m) => withMismatch || !m.startsWith(MISMATCH_PREFIX)),
  ];
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = [
    'Usage: node rounds.mjs record <projectDir> <cardId>',
    '       node rounds.mjs reply <projectDir> <cardId> --finding <label> --action <fixed|rebut> --restate <text> --verify <text> [--ground <evidence|drift>] [--evidence <kind:ref>]...',
    '       node rounds.mjs rule <projectDir> <cardId> --finding <label> --ruling <sustain|withdraw|drift> --note <text>',
    '       node rounds.mjs file <projectDir> <cardId> --finding <label> [--type <improvement|bug>]',
    '       node rounds.mjs file-drift <projectDir> <cardId> [--type <improvement|bug>]',
    '       node rounds.mjs close <projectDir> <cardId> --verified-by-gate --by <name> --scope-unchanged --test <path> [--file <path>]... <finding>...',
    '       node rounds.mjs status <projectDir> <cardId>',
  ].join('\n');
  const usage = (message) => {
    console.error(`${message}\n${USAGE}`);
    process.exit(2);
  };
  const FLAGS = {
    record: [],
    status: [],
    reply: ['--finding', '--action', '--restate', '--verify', '--ground', '--evidence'],
    rule: ['--finding', '--ruling', '--note'],
    file: ['--finding', '--type'],
    'file-drift': ['--type'],
    close: ['--by', '--test', '--file'],
  };
  const SWITCHES = { close: ['--verified-by-gate', '--scope-unchanged'] };
  const FILES = '--file';
  const [command, projectDir, id, ...args] = process.argv.slice(2);
  if (!Object.hasOwn(FLAGS, command)) usage(`Unknown subcommand ${command === undefined ? '(none)' : command}.`);
  if (!projectDir || projectDir.startsWith('--')) usage('Missing project directory.');
  if (!isCardId(id)) usage(`"${id}" is not a card id (like 0001-some-title).`);
  const given = { '--evidence': [], [FILES]: [] };
  const switches = new Set();
  const findings = [];
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!flag.startsWith('--') && command === 'close') {
      findings.push(flag);
    } else if (SWITCHES[command]?.includes(flag)) {
      switches.add(flag);
    } else {
      if (!FLAGS[command].includes(flag)) usage(`Unknown option ${flag}.`);
      const value = args[++i];
      if (value === undefined || value.startsWith('--')) usage(`${flag} requires a value.`);
      if (flag === '--evidence' || flag === FILES) given[flag].push(value);
      else if (given[flag] !== undefined) usage(`${flag} given more than once.`);
      else given[flag] = value;
    }
  }
  const oneOf = (flag, values) => {
    if (given[flag] !== undefined && !values.includes(given[flag])) usage(`${flag} must be one of ${values.join(', ')}.`);
  };
  const need = (...flags) => {
    for (const flag of flags) if (given[flag] === undefined) usage(`${flag} is required.`);
  };
  for (const flag of ['--restate', '--verify', '--note']) {
    if (given[flag] !== undefined && given[flag].length > REPLY_TEXT_MAX) usage(`${flag} is ${given[flag].length} characters; the limit is ${REPLY_TEXT_MAX}. Shorten it.`);
  }
  if (command === 'reply') {
    need('--finding', '--action', '--restate', '--verify');
    oneOf('--action', ['fixed', 'rebut']);
    oneOf('--ground', ['evidence', 'drift']);
  } else if (command === 'rule') {
    need('--finding', '--ruling', '--note');
    oneOf('--ruling', RULINGS);
  } else if (command === 'file') {
    need('--finding');
    oneOf('--type', ['improvement', 'bug']);
  } else if (command === 'file-drift') {
    oneOf('--type', ['improvement', 'bug']);
  } else if (command === 'close') {
    for (const flag of SWITCHES.close) if (!switches.has(flag)) usage(`${flag} is required.`);
    need('--by', '--test');
    if (findings.length === 0) usage('Name at least one finding to close.');
  }
  const dir = resolve(projectDir);
  try {
    if (command === 'record') {
      console.log(reportLines(recordRound(dir, id), true).join('\n'));
    } else if (command === 'reply') {
      const input = { finding: given['--finding'], action: given['--action'], restate: given['--restate'], verify: given['--verify'], evidence: given['--evidence'] };
      if (given['--ground'] !== undefined) input.ground = given['--ground'];
      console.log(reportLines(replyToFinding(dir, id, input)).join('\n'));
    } else if (command === 'rule') {
      console.log(reportLines(ruleOnFinding(dir, id, { finding: given['--finding'], ruling: given['--ruling'], note: given['--note'] })).join('\n'));
      console.log('Warning: the note is shown to the next blind reviewer; it must state the decision and its evidence, not the implementer argument.');
    } else if (command === 'file') {
      const { report, ticket, root } = fileDrift(dir, id, { finding: given['--finding'], ...(given['--type'] === undefined ? {} : { type: given['--type'] }) });
      console.log(`filed ${given['--finding']} as ${ticket.id}${root === dir ? '' : ` in the backlog of ${root}`}`);
      console.log(reportLines(report).join('\n'));
    } else if (command === 'file-drift') {
      const { report, tickets, root } = fileAllDrift(dir, id, given['--type'] === undefined ? {} : { type: given['--type'] });
      if (tickets.length === 0) console.log('no open drift finding to file');
      for (const { finding, ticket } of tickets) console.log(`filed ${finding} as ${ticket.id}${root === dir ? '' : ` in the backlog of ${root}`}`);
      console.log(reportLines(report).join('\n'));
    } else if (command === 'close') {
      const input = { findings, by: given['--by'], scopeUnchanged: true, test: given['--test'] };
      if (given[FILES].length > 0) input.files = given[FILES];
      console.log(reportLines(closeVerifiedByGate(dir, id, input)).join('\n'));
    } else {
      const regenerated = syncReviewLog(dir, id);
      console.log(reportLines(roundsReport(readRounds(dir, id)), true).join('\n'));
      if (regenerated) console.log('review.md regenerated');
    }
  } catch (err) {
    if (err instanceof RoundsError) {
      console.error(`${err.rule}: ${err.message}`);
      process.exit(1);
    }
    if (err instanceof BoardError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
