import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, cardPath, isCardId, readCard } from '../lib/board.mjs';
import { ConfigError } from '../lib/config.mjs';
import { GateError, gateFindings } from '../lib/gate.mjs';
import { COLUMNS, FORWARD, humanColumn } from '../lib/layout.mjs';
import { checkMove } from '../lib/moves.mjs';
import { TierError, describeTier, effectiveConcerns, effectiveTier } from '../lib/tier.mjs';
import { scriptCommand } from '../lib/script-command.mjs';
import { parseColumn } from './card-move.mjs';

/** @typedef {import('./validate.mjs').Finding} Finding */
/** @typedef {import('../lib/gate.mjs').GateOptions} GateOptions */
/** @typedef {import('../lib/gate.mjs').Skipped} Skipped */

/**
 * Answers whether a move would pass, without moving anything or registering any guard.
 * @param {string} projectDir
 * @param {string} id
 * @param {GateOptions & { to?: string }} [options] `to` is a column folder name; default is the forward edge
 * @returns {{ from: string, to: string, findings: Finding[], skipped: Skipped[], warnings: Finding[], effective: import('../lib/tier.mjs').EffectiveTier }}
 */
export function gate(projectDir, id, options = {}) {
  if (!isCardId(id)) {
    throw new BoardError(`"${id}" is not a card id (like 0001-some-title). Check the id with the board listing.`);
  }
  const card = readCard(projectDir, id);
  const { column: from } = cardPath(projectDir, id);
  const to = options.to ?? FORWARD[from];
  if (to === undefined) {
    throw new GateError(`Card ${id} is in ${humanColumn(from)}; there is nothing to check because no move leaves it.`);
  }
  if (!COLUMNS.includes(to)) {
    throw new BoardError(`Unknown column "${to}". Use one of: ${COLUMNS.map(humanColumn).join(', ')}.`);
  }
  const effective = effectiveTier(projectDir, card);
  const { tier } = effective;
  const resolvedConcerns = effectiveConcerns(projectDir, card);
  const ctx = { projectDir, card, from, to, tier, concerns: resolvedConcerns.tiers };
  const findings = checkMove(ctx);
  if (findings.some((f) => f.rule === 'move-not-allowed')) return { from, to, findings, skipped: [], warnings: [], effective, label: resolvedConcerns.label };
  const gated = gateFindings(ctx, options);
  return { from, to, findings: [...findings, ...gated.findings], skipped: gated.skipped, warnings: gated.warnings ?? [], effective, label: resolvedConcerns.label };
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = 'Usage: node gate.mjs <projectDir> <cardId> [--to <column>] [--base <ref>] (each option may be given once)';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const positional = [];
  const given = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const name = args[i];
      if (name !== '--to' && name !== '--base') usage(`Unknown option ${name}.`);
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) usage(`${name} requires a value.`);
      if (given[name] !== undefined) usage(`${name} given more than once.`);
      given[name] = value;
      i++;
    } else {
      positional.push(args[i]);
    }
  }
  const [projectDir, id] = positional;
  if (positional.length !== 2) usage('Expected a project directory and a card id.');
  if (!isCardId(id)) usage(`"${id}" is not a card id (like 0001-some-title).`);
  const options = {};
  if (given['--base'] !== undefined) options.base = given['--base'];
  if (given['--to'] !== undefined) {
    options.to = parseColumn(given['--to']);
    if (!options.to) usage(`Unknown column "${given['--to']}". Use one of: ${COLUMNS.map(humanColumn).join(', ')}.`);
  }
  try {
    const { from, to, findings, skipped, warnings, effective, label } = gate(resolve(projectDir), id, options);
    const tierLine = describeTier(effective);
    if (tierLine !== null) console.log(tierLine);
    if (label !== effective.tier) console.log(`concerns: ${label}`);
    if (effective.warning !== null) console.log(`warning tier-cycle-unreadable: ${effective.warning}`);
    for (const f of findings) console.log(`${f.rule}: ${f.message}`);
    for (const w of warnings) console.log(`warning ${w.rule}: ${w.message}`);
    for (const s of skipped) console.log(`skipped ${s.check}: ${s.reason}`);
    if (findings.length === 0) {
      console.log(`gate clean: ${humanColumn(from)} -> ${humanColumn(to)}`);
      console.log(`check only, nothing moved: card-move moves the card (${scriptCommand(resolve(projectDir), 'card-move.mjs')} ${projectDir} ${id} ${to})`);
    }
    process.exit(findings.length ? 1 : 0);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    if (err instanceof BoardError || err instanceof GateError || err instanceof TierError) {
      console.error(err.message);
      process.exit(2);
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
}
