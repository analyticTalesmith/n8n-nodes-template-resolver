import { readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, cardFolder, cardPath, isCardId, readCard, writeCard } from '../lib/board.mjs';
import { ConfigError } from '../lib/config.mjs';
import { COLUMNS, TIERS } from '../lib/layout.mjs';
import { registerGateChecks } from '../lib/gate.mjs';
import { GitError, headCommit } from '../lib/git.mjs';
import { checkMove, humanColumn } from '../lib/moves.mjs';
import { effectiveConcerns, effectiveTier } from '../lib/tier.mjs';
import { localDocsHashes, localLivingHashes } from '../lib/local-docs-attestation.mjs';
import { localCharterHashes } from '../lib/local-charters.mjs';

/** @typedef {import('./validate.mjs').Finding} Finding */

export class MoveError extends Error {
  /** @param {Finding[]} findings */
  constructor(findings) {
    super(findings.map((f) => `${f.rule}: ${f.message}`).join('\n'));
    this.name = 'MoveError';
    this.findings = findings;
  }
}

/** Card fields a move may set through `options.set`. */
export const SETTABLE_FIELDS = Object.freeze(['base_commit', 'tier']);

/**
 * The fields to merge into the card, after checking each against SETTABLE_FIELDS.
 * @param {unknown} set
 * @returns {Record<string, string>}
 */
function settableFields(set) {
  if (set === undefined) return {};
  if (set === null || typeof set !== 'object' || Array.isArray(set)) {
    throw new BoardError(`options.set must be an object of card fields (allowed: ${SETTABLE_FIELDS.join(', ')}).`);
  }
  for (const [key, value] of Object.entries(set)) {
    if (!SETTABLE_FIELDS.includes(key)) {
      throw new BoardError(`A move cannot set ${key}; only ${SETTABLE_FIELDS.join(', ')} can be set with a move.`);
    }
    if (typeof value !== 'string' || value === '') {
      throw new BoardError(`A move can set ${key} only to a non-empty string, not ${JSON.stringify(value)}.`);
    }
    if (key === 'tier' && !TIERS.includes(value)) {
      throw new BoardError(`A move can set tier only to one of: ${TIERS.join(', ')}, not ${JSON.stringify(value)}.`);
    }
  }
  return /** @type {Record<string, string>} */ (set);
}

/**
 * Moves a card to another column when every guard passes; otherwise nothing changes.
 * @param {string} projectDir
 * @param {string} id
 * @param {string} to column folder name
 * A move into shaping or done clears the card's claim; moves between in progress, review and gate keep it.
 * @param {{ reason?: string, now?: Date, set?: Record<string, string>, io?: { rename?: typeof renameSync, writeFile?: typeof writeFileSync } }} [options]
 *   set merges extra card fields (SETTABLE_FIELDS only) into the same write as started, ended and claim, before the
 *   rename, and they are restored with the rest when the rename fails; io replaces the file operations, for tests
 * @returns {{ from: string, to: string }}
 */
export function moveCard(projectDir, id, to, options = {}) {
  if (!isCardId(id)) {
    throw new BoardError(`"${id}" is not a card id (like 0001-some-title). Check the id with the board listing.`);
  }
  const extra = settableFields(options.set);
  const card = readCard(projectDir, id);
  const { cycle, column: from, dir } = cardPath(projectDir, id);
  if (!COLUMNS.includes(to)) {
    throw new BoardError(`Unknown column "${to}". Use one of: ${COLUMNS.map(humanColumn).join(', ')}.`);
  }
  if (cycle === null) {
    throw new MoveError([
      {
        rule: 'move-not-selected',
        message: `Card ${id} is in the global backlog; cards move only between the columns of their own cycle. Select it into an open cycle first.`,
      },
    ]);
  }
  let tier;
  let concerns;
  try {
    const resolved = effectiveTier(projectDir, card);
    ({ tier } = resolved);
    concerns = effectiveConcerns(projectDir, card).tiers;
    if (resolved.warning !== null && resolved.source !== 'card') {
      throw new BoardError(
        `Cannot move ${id}: its cycle ${cycle} cannot be read, so a stricter cycle tier could be dropped. ${resolved.warning} ` +
          `Fix the cycle brief, or set a tier on the card.`,
      );
    }
  } catch (cause) {
    if (cause instanceof ConfigError || cause instanceof BoardError) throw cause;
    throw new BoardError(cause.message, { cause });
  }
  const findings = checkMove({ projectDir, card, from, to, tier, concerns, reason: options.reason });
  if (findings.length) throw new MoveError(findings);

  const file = `${dir}/card.json`;
  const previous = readFileSync(file, 'utf8');
  const stamp = (options.now ?? new Date()).toISOString();
  const { rename = renameSync, writeFile = writeFileSync } = options.io ?? {};
  const updated = { ...card, ...extra };
  if (card.type === 'bug' && from === '00_backlog' && to === '02_ready' && card.freeze === undefined) {
    const docs = localDocsHashes(projectDir, Array.isArray(card.docs_impact) ? card.docs_impact : []);
    if (docs !== null) {
      updated.local_baseline = {
        at: stamp,
        local_docs_sha256: docs,
        local_living_sha256: localLivingHashes(projectDir),
        local_charters_sha256: localCharterHashes(projectDir),
      };
    }
  }
  if (to === '03_in_progress' && updated.started === null) updated.started = stamp;
  if (to === '06_done') updated.ended = stamp;
  if (to === '01_shaping' || to === '06_done') updated.claim = null;
  const changed =
    updated.started !== card.started ||
    updated.ended !== card.ended ||
    updated.claim !== card.claim ||
    Object.keys(extra).some((key) => updated[key] !== card[key]) ||
    updated.local_baseline !== card.local_baseline;
  if (changed) writeCard(projectDir, id, updated);

  try {
    rename(dir, cardFolder(projectDir, cycle, to, id));
  } catch (cause) {
    const stays = `The card stays in ${humanColumn(from)}`;
    let message = `Could not move ${id} to ${humanColumn(to)} (${cause.message}). ${stays}; close anything using its folder and retry.`;
    if (changed) {
      try {
        writeFile(file, previous);
      } catch (restoreError) {
        const undo = Object.keys(extra).map((key) => (card[key] === undefined ? `, remove ${key}` : `, set ${key} to ${JSON.stringify(card[key])}`));
        message =
          `Could not move ${id} to ${humanColumn(to)} (${cause.message}), and putting card.json back failed too (${restoreError.message}). ${stays}, ` +
          `but ${file} was already changed. Restore card.json by hand: set started to ${JSON.stringify(card.started)}, ended to ${JSON.stringify(card.ended)} and claim to ${JSON.stringify(card.claim)}${undo.join('')}.`;
      }
    }
    throw new MoveError([{ rule: 'move-failed', message }]);
  }
  return { from, to };
}

/**
 * Resolves a folder name or human form (`in-progress`, `in_progress`, `ready`) to a column folder name.
 * @param {string} text
 * @returns {string | undefined}
 */
export function parseColumn(text) {
  const norm = (s) => s.toLowerCase().replace(/[-_ ]/g, '');
  return COLUMNS.find((c) => c === text || norm(humanColumn(c)) === norm(text));
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
    'Usage: node card-move.mjs <projectDir> <id> <column> [--reason <text>] [--base <ref>] (the --reason=text and --base=ref forms are not supported; each option may be given once)';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const positional = [];
  const options = {};
  let base;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const name = args[i];
      if (name !== '--reason' && name !== '--base') usage(`Unknown option ${name}.`);
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) usage(`${name} requires a value.`);
      if (name === '--reason') {
        if (options.reason !== undefined) usage('--reason given more than once.');
        options.reason = value;
      } else {
        if (base !== undefined) usage('--base given more than once.');
        base = value;
      }
      i++;
    } else {
      positional.push(args[i]);
    }
  }
  const [projectDir, id, column] = positional;
  if (positional.length !== 3) usage('Expected a project directory, a card id and a column.');
  if (!isCardId(id)) usage(`"${id}" is not a card id (like 0001-some-title).`);
  const to = parseColumn(column);
  if (!to) usage(`Unknown column "${column}". Use one of: ${COLUMNS.map(humanColumn).join(', ')}.`);
  const root = resolve(projectDir);
  try {
    registerGateChecks({
      base,
      onSkipped: (list) => list.forEach((s) => console.error(`skipped ${s.check}: ${s.reason}`)),
      onWarnings: (list) => list.forEach((w) => console.error(`warning ${w.rule}: ${w.message}`)),
    });
    const current = cardPath(root, id) ? readCard(root, id) : null;
    const starting =
      cardPath(root, id)?.column === '02_ready' &&
      to === '03_in_progress' &&
      !(typeof current.base_commit === 'string' && current.base_commit !== '');
    let head = null;
    let notRecorded = null;
    if (starting) {
      try {
        head = headCommit(root, { short: false });
      } catch (err) {
        if (!(err instanceof GitError)) throw err;
        notRecorded = err.message.replace(/\s+/g, ' ');
      }
    }
    const { from, to: moved } = moveCard(root, id, to, head === null ? options : { ...options, set: { base_commit: head } });
    console.log(`${id}: ${humanColumn(from)} -> ${humanColumn(moved)}`);
    if (notRecorded !== null) console.error(`warning: base commit not recorded (${notRecorded}); pass --base <ref> at review`);
  } catch (err) {
    if (err instanceof MoveError) {
      for (const f of err.findings) console.error(`${f.rule}: ${f.message}`);
      process.exit(1);
    }
    if (err instanceof BoardError || err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
