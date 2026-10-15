import { realpathSync } from 'node:fs';
import { isPlainObject } from '../lib/types.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, cardPath, isCardId, readCard, writeCard } from '../lib/board.mjs';
import { CONFIG_PATH, ConfigError, readConfig } from '../lib/config.mjs';
import { GitError, assertTopLevel, changedFiles, effectiveBase, runGit } from '../lib/git.mjs';
import { baselineHash, changedBaselines, readBaselineSetting } from '../lib/checks/baselines.mjs';
import { STAGE } from '../lib/layout.mjs';

/** @typedef {import('../lib/git.mjs').GitRunner} GitRunner */
/** @typedef {import('../lib/checks/baselines.mjs').BaselineApproval} BaselineApproval */
/** @typedef {import('./validate.mjs').Finding} Finding */

const APPROVAL_COLUMN = STAGE.gate;

export class BaselineApprovalError extends Error {
  /**
   * @param {'card' | 'wrong-column' | 'config' | 'base-missing' | 'git'} detail
   * @param {string} message
   * @param {{ cause?: unknown }} [options]
   */
  constructor(detail, message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'BaselineApprovalError';
    this.rule = /** @type {const} */ ('baseline-approval-refused');
    this.detail = detail;
    /** @type {Finding[]} */
    this.findings = [{ rule: this.rule, message }];
  }
}

/**
 * Records the human's approval of the visual baselines a card changed: the hash of each changed baseline file as it is
 * now. It works only on a card in the gate column, and never stages, commits or moves anything. Nothing here proves who
 * runs it; the gate column and the convention that the human at the gate runs it are the guard.
 * @param {string} projectDir
 * @param {string} id
 * @param {{ base?: string, run?: GitRunner, now?: () => Date }} [options]
 * @returns {{ files: Record<string, string>, statuses: Record<string, string>, written: boolean }}
 */
export function approveBaselines(projectDir, id, options = {}) {
  const found = cardPath(projectDir, id);
  if (found === null) {
    throw new BaselineApprovalError('card', `"${id}" is not a card on the board. Check the id with the board listing.`);
  }
  if (found.column !== APPROVAL_COLUMN) {
    throw new BaselineApprovalError('wrong-column', `Card ${id} is not in the gate column (it is in ${found.column}). Baselines are approved by the human at the gate, after looking at each image diff.`);
  }
  const card = readCard(projectDir, id);

  let config;
  try {
    config = /** @type {Record<string, any>} */ (readConfig(projectDir));
  } catch (err) {
    if (err instanceof ConfigError) throw new BaselineApprovalError('config', err.message, { cause: err });
    throw err;
  }
  const frontEnd = config.gate?.front_end;
  const { list, problem } = readBaselineSetting(isPlainObject(frontEnd) ? frontEnd : {});
  if (problem !== null || list === null) {
    throw new BaselineApprovalError('config', problem?.message ?? `gate.front_end.baselines is not configured, so there are no baselines to approve. Set it in ${CONFIG_PATH}.`);
  }

  const recorded = /** @type {{ base_commit?: unknown }} */ (card).base_commit;
  const base = options.base ?? (typeof recorded === 'string' && recorded !== '' ? recorded : undefined);
  if (base === undefined) {
    throw new BaselineApprovalError('base-missing', 'There is no commit to compare the baselines against. Pass --base <ref> (the commit the work started from), or move the card from ready to in progress through card-move, which records it.');
  }

  const run = options.run ?? runGit;
  /** @type {import('../lib/git.mjs').Change[]} */
  let changes;
  try {
    assertTopLevel(projectDir, { run });
    changes = changedFiles(projectDir, effectiveBase(projectDir, base, run), run);
  } catch (err) {
    if (err instanceof GitError) throw new BaselineApprovalError('git', err.message, { cause: err });
    throw err;
  }

  const paths = changedBaselines(changes, list);
  if (paths.length === 0) return { files: {}, statuses: {}, written: false };
  /** @type {Record<string, string>} */
  const files = {};
  /** @type {Record<string, string>} */
  const statuses = {};
  for (const path of paths) {
    files[path] = baselineHash(projectDir, path);
    const change = changes.find((c) => c.path === path || (c.status === 'R' && c.from === path));
    statuses[path] = change?.path === path ? change.status : 'D';
  }
  const approval = { at: (options.now ?? (() => new Date()))().toISOString(), files };
  writeCard(projectDir, id, { ...card, baseline_approval: approval });
  return { files, statuses, written: true };
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = 'Usage: node approve-baselines.mjs <projectDir> <cardId> [--base <ref>]';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const args = process.argv.slice(2);
  const positional = [];
  let base;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base') {
      if (base !== undefined || i + 1 >= args.length) usage('--base needs one ref, given once.');
      base = args[++i];
    } else if (args[i].startsWith('--')) {
      usage(`Unknown option ${args[i]}.`);
    } else {
      positional.push(args[i]);
    }
  }
  if (positional.length !== 2) usage('Expected a project directory and a card id.');
  const [projectDir, id] = positional;
  if (!isCardId(id)) usage(`"${id}" is not a card id (like 0001-some-title).`);
  try {
    const { files, statuses, written } = approveBaselines(resolve(projectDir), id, { base });
    if (!written) {
      console.log('No baseline changed; nothing recorded.');
    } else {
      for (const [path, hash] of Object.entries(files)) console.log(`${statuses[path]} ${path} ${hash === 'deleted' ? hash : hash.slice(0, 12)}`);
      console.log('Look at each image diff before you approve; this records exactly these files.');
    }
  } catch (err) {
    if (err instanceof BaselineApprovalError) {
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
