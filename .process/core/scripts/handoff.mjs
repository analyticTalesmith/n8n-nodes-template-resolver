import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, listCards } from '../lib/board.mjs';
import { claimStatus } from '../lib/claim.mjs';
import { GitError, changedFiles, headCommit, runGit } from '../lib/git.mjs';
import { HANDOFF_ROOT, checkHandoff, renderHandoff } from '../lib/handoff.mjs';
import { ACTIVE, DOCS_ROOT, humanColumn } from '../lib/layout.mjs';
import { SESSION_RULES, checkSession } from '../lib/session-check.mjs';
import { resolveProjectPath, resolveProjectRoots } from '../lib/project-roots.mjs';
import { PathError, toPosix } from '../lib/files.mjs';
import { sessionFacts } from './session-check.mjs';
import { checkCardStates } from './validate.mjs';
import { isoDate } from '../lib/time.mjs';
import { isKebab } from '../lib/names.mjs';

/** @typedef {import('./validate.mjs').Finding} Finding */
/** @typedef {import('../lib/handoff.mjs').HandoffFields} HandoffFields */
/** @typedef {import('../lib/git.mjs').GitRunner} GitRunner */

const NAME_MAX = 60;
const DEVICE_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/;
const BOARD_LINES_MAX = 8;
const NEXT_MIN = 1;
const NEXT_MAX = 3;
const URL_START = /^https?:\/\//;
const GENERATED_LINE_MAX = 190;

/** Keeps a generated line under the raw-log limit; a long board error must not stop the handoff being written. */
const clip = (text) => (text.length > GENERATED_LINE_MAX ? `${text.slice(0, GENERATED_LINE_MAX - 3)}...` : text);

export class HandoffError extends Error {
  /**
   * @param {'handoff-name-invalid' | 'handoff-exists' | 'handoff-git-failed' | 'handoff-invalid'} rule
   * @param {string} message
   * @param {Finding[]} [findings] set for handoff-invalid
   * @param {ErrorOptions} [options]
   */
  constructor(rule, message, findings = [], options) {
    super(message, options);
    this.name = 'HandoffError';
    this.rule = rule;
    this.findings = findings;
  }
}

const blank = (value) => typeof value !== 'string' || value.trim() === '';
const list = (value) => (Array.isArray(value) ? value : []);

/** True when the project-relative path resolves inside the project (symlinks followed) and exists. */
function existsInside(roots, path) {
  if (blank(path) || isAbsolute(path) || toPosix(path).split('/').some((part) => part === '' || part === '.' || part === '..')) return false;
  let target;
  try {
    target = resolveProjectPath(roots, path);
  } catch (cause) {
    if (cause instanceof PathError) return false;
    throw cause;
  }
  if (!existsSync(target)) return false;
  const logical = toPosix(path);
  const home = roots.mode === 'local' && (logical === DOCS_ROOT || logical.startsWith(`${DOCS_ROOT}/`)) ? roots.docsRoot : roots.checkoutRoot;
  const inside = relative(realpathSync(home), realpathSync(target));
  return (inside !== '' || logical === DOCS_ROOT) && !inside.startsWith('..') && !isAbsolute(inside) && !`${inside}${sep}`.startsWith(`..${sep}`);
}

/** @param {string} root @param {HandoffFields} fields @returns {Finding[]} */
function checkFields(roots, fields) {
  /** @type {Finding[]} */
  const findings = [];
  const add = (rule, message) => findings.push({ rule, message });
  const required = [
    ['goal', fields.goal],
    ['plan', fields.plan],
    ['verify.command', fields.verify?.command],
    ['verify.result', fields.verify?.result],
  ];
  for (const [field, value] of required) {
    if (blank(value)) add('handoff-section-missing', `The handoff field ${field} is empty. Give it a value.`);
  }
  const next = list(fields.next);
  if (next.length < NEXT_MIN || next.length > NEXT_MAX) {
    add('handoff-next-actions', `The handoff has ${next.length} next actions; give ${NEXT_MIN} to ${NEXT_MAX}.`);
  }

  /** @type {Array<[string, unknown]>} */
  const values = [
    ['goal', fields.goal],
    ['plan', fields.plan],
    ['verify.command', fields.verify?.command],
    ['verify.result', fields.verify?.result],
    ...['state', 'next', 'blockers', 'readFirst', 'doNotRedo'].flatMap((name) => list(fields[name]).map((v, i) => [`${name}[${i}]`, v])),
    ...list(fields.decisions).flatMap((d, i) => [[`decisions[${i}].text`, d?.text], [`decisions[${i}].link`, d?.link]]),
  ];
  for (const [field, value] of values) {
    if (typeof value === 'string' && /[\r\n]/.test(value)) {
      add('handoff-raw-log', `The handoff field ${field} spans several lines. Use one line per entry and summarize pasted output.`);
    }
  }

  /** @type {Array<[string, unknown, string?]>} */
  const links = [
    ['plan', fields.plan],
    ...list(fields.readFirst).map((p, i) => [`readFirst[${i}]`, p]),
    ...list(fields.decisions).map((d, i) => [`decisions[${i}]`, d?.link, d?.text]),
  ];
  for (const [field, link, text] of links) {
    if (field === 'plan' && blank(link)) continue;
    const label = text === undefined ? `"${link}"` : `"${text}" (${link === '' || link === undefined ? 'no link' : `"${link}"`})`;
    if (typeof link !== 'string' || /[\r\n]/.test(link) || (!URL_START.test(link) && !existsInside(roots, link))) {
      add('handoff-link-missing', `The handoff ${field} ${label} must be an http(s) URL or an existing path inside the project. Fix the path or link an existing file.`);
    }
  }
  return findings;
}

/** The board lines and auto blockers for the Board and Blockers sections. */
function boardFacts(projectDir, now) {
  /** @type {string[]} */
  const autoBlockers = [];
  /** @type {string[]} */
  let board = [];
  /** @type {Array<{ column: string, card: import('../lib/card.mjs').Card }>} */
  let cards = [];
  try {
    cards = listCards(projectDir);
  } catch (err) {
    if (!(err instanceof BoardError)) throw err;
    board = [clip(`board unreadable: ${err.message}`)];
    autoBlockers.push(board[0]);
  }
  for (const f of checkCardStates(projectDir)) autoBlockers.push(clip(`${f.rule}: ${f.message}`));

  const claimText = (card) => {
    const status = claimStatus(card, now);
    const owner = status.owner ?? 'unknown';
    if (status.state === 'free') return 'free';
    if (status.state === 'held') return `held by ${owner}`;
    return `stale claim of ${owner}${status.minutes === undefined ? '' : `, ${status.minutes} min`}`;
  };
  const active = cards.filter(({ column }) => ACTIVE.includes(column));
  if (board.length === 0) {
    board = active.slice(0, BOARD_LINES_MAX).map(({ column, card }) => `${card.id} (${humanColumn(column)}): ${claimText(card)}, review rounds ${card.review_rounds}`);
    if (active.length > BOARD_LINES_MAX) board.push(`and ${active.length - BOARD_LINES_MAX} more active cards`);
  }
  for (const { card } of cards) {
    const status = claimStatus(card, now);
    if (status.state === 'stale') {
      autoBlockers.push(`stale claim on ${card.id} held by ${status.owner ?? 'unknown'}: propose release to the human`);
    }
  }
  return { board, autoBlockers };
}

/**
 * The session-check findings as blocker lines. Uncommitted work is left out because the Uncommitted changes line
 * already counts it; a git or filesystem failure is one blocker, never a reason not to write the handoff.
 */
function sessionReport(root, decisions, run) {
  try {
    const report = checkSession(root, sessionFacts(root, { run, decisions }));
    return {
      blockers: report.findings.filter((f) => f.rule !== SESSION_RULES.uncommitted).map((f) => clip(`${f.rule}: ${f.message}`)),
      info: report.info.filter((line) => line.startsWith('unverifiable-local-docs:')).map(clip),
    };
  } catch (err) {
    if (err instanceof GitError) return { blockers: [clip(`${SESSION_RULES.git}: ${err.message}`)], info: [] };
    // A filesystem error carries a code; a bug without one still surfaces.
    if (typeof err?.code === 'string') return { blockers: [clip(`${SESSION_RULES.failed}: ${err.message}`)], info: [] };
    throw err;
  }
}

/**
 * Writes <HANDOFF_ROOT>/<name>.md from the caller's fields and the facts read from git and the board.
 * Nothing is written when any check fails. Never runs the verify command.
 * @param {string} projectDir
 * @param {string} name
 * @param {HandoffFields} fields
 * @param {{ overwrite?: boolean, now?: Date, run?: GitRunner }} [options]
 * @returns {{ path: string, lines: number, overwrote: boolean }}
 */
export function writeHandoff(projectDir, name, fields, { overwrite = false, now = new Date(), run = runGit } = {}) {
  if (!isKebab(name) || name.length > NAME_MAX || DEVICE_NAME.test(name)) {
    throw new HandoffError(
      'handoff-name-invalid',
      `"${name}" is not a usable handoff name. Use lowercase letters, digits and single hyphens, at most ${NAME_MAX} characters, and not a Windows device name such as con or lpt1.`,
    );
  }
  const root = resolve(projectDir);
  const roots = resolveProjectRoots(root);
  if (fields === null || typeof fields !== 'object') fields = {};
  const fieldFindings = checkFields(roots, fields);

  let facts;
  try {
    const branch = run(root, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
    facts = {
      name,
      date: isoDate(now),
      branch: branch === 'HEAD' ? 'detached HEAD' : branch,
      commit: headCommit(root, { run }),
      uncommitted: changedFiles(root, 'HEAD', run).length,
    };
  } catch (err) {
    if (!(err instanceof GitError)) throw err;
    throw new HandoffError('handoff-git-failed', `Cannot read the git state: ${err.message} The handoff points at a commit, so run it in a git repository with at least one commit.`, [], { cause: err });
  }

  const decisions = list(fields.decisions).map((d) => ({ text: d?.text ?? '', link: d?.link ?? '' }));
  const { board, autoBlockers } = boardFacts(root, now);
  const session = sessionReport(root, decisions, run);
  const text = renderHandoff(
    { ...fields, verify: { command: '', result: '', ...fields.verify }, state: list(fields.state), blockers: list(fields.blockers), decisions, readFirst: list(fields.readFirst), doNotRedo: list(fields.doNotRedo), next: list(fields.next) },
    { ...facts, board, autoBlockers: [...autoBlockers, ...session.blockers], sessionInfo: session.info },
  );
  const file = resolveProjectPath(roots, `${HANDOFF_ROOT}/${name}.md`);
  const findings = [...fieldFindings, ...checkHandoff(text, { path: `${HANDOFF_ROOT}/${name}.md` })];
  if (findings.length) {
    throw new HandoffError('handoff-invalid', `The handoff was not written: ${findings.length} problem(s). ${findings.map((f) => `${f.rule}: ${f.message}`).join(' ')}`, findings);
  }

  mkdirSync(resolveProjectPath(roots, HANDOFF_ROOT), { recursive: true });
  const existed = existsSync(file);
  try {
    writeFileSync(file, text, { flag: overwrite ? 'w' : 'wx' });
  } catch (cause) {
    if (cause.code !== 'EEXIST') throw cause;
    throw new HandoffError('handoff-exists', `${HANDOFF_ROOT}/${name}.md already exists. Pass overwrite (CLI --overwrite) to replace it; git keeps the old one.`, [], { cause });
  }
  return { path: toPosix(file), lines: text.replace(/\n$/, '').split('\n').length, overwrote: overwrite && existed };
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE =
    'Usage: node handoff.mjs <projectDir> <name> --goal <text> --plan <path> --next <text>... --verify <command> --verify-result <text> ' +
    '[--state <text>]... [--blocker <text>]... [--decision "<text> -> <path or url>"]... [--read <path>]... [--do-not-redo <text>]... [--overwrite] ' +
    '(--goal, --plan, --verify and --verify-result may be given once)';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const SINGLE = { '--goal': 'goal', '--plan': 'plan', '--verify': 'command', '--verify-result': 'result' };
  const MANY = { '--next': 'next', '--state': 'state', '--blocker': 'blockers', '--decision': 'decisions', '--read': 'readFirst', '--do-not-redo': 'doNotRedo' };
  const single = {};
  const many = { next: [], state: [], blockers: [], decisions: [], readFirst: [], doNotRedo: [] };
  let overwrite = false;
  const positional = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
    } else if (arg === '--overwrite') {
      overwrite = true;
    } else if (arg in SINGLE || arg in MANY) {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) usage(`${arg} requires a value.`);
      i++;
      if (arg in SINGLE) {
        if (SINGLE[arg] in single) usage(`${arg} given more than once.`);
        single[SINGLE[arg]] = value;
      } else {
        many[MANY[arg]].push(value);
      }
    } else {
      usage(`Unknown option ${arg}.`);
    }
  }
  if (positional.length !== 2) usage('Expected a project directory and a handoff name.');
  const decisions = many.decisions.map((entry) => {
    const at = entry.indexOf(' -> ');
    return at === -1 ? { text: entry, link: '' } : { text: entry.slice(0, at), link: entry.slice(at + 4) };
  });
  const fields = {
    goal: single.goal ?? '',
    plan: single.plan ?? '',
    state: many.state,
    next: many.next,
    blockers: many.blockers,
    decisions,
    verify: { command: single.command ?? '', result: single.result ?? '' },
    readFirst: many.readFirst,
    doNotRedo: many.doNotRedo,
  };
  try {
    const result = writeHandoff(positional[0], positional[1], fields, { overwrite });
    console.log(`${result.overwrote ? 'overwrote' : 'wrote'} ${result.path} (${result.lines} lines)`);
  } catch (err) {
    if (!(err instanceof HandoffError)) {
      console.error(err.message);
      process.exit(2);
    }
    if (err.rule === 'handoff-invalid') for (const f of err.findings) console.error(`${f.rule}: ${f.message}`);
    else console.error(`${err.rule}: ${err.message}`);
    process.exit(1);
  }
}
