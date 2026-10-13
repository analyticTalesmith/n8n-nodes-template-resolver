import { readFileSync, writeFileSync } from 'node:fs';
import { BoardError, cardPath, readCard, writeCard } from './board.mjs';
import { instructionsOf, testLevelsOf } from './card.mjs';
import { CONCERNS, concernKey } from './concerns.mjs';
import { CycleError, readCycle } from './cycle.mjs';
import { setFrontmatterField } from './frontmatter.mjs';
import { CycleNameError, TIERS, cyclePaths } from './layout.mjs';
import { CARD_LEVELS, CYCLE_LEVELS, REGRESSION_MODES, TEST_LEVELS, requiredAt } from './levels.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { scriptCommand } from './script-command.mjs';

/** @typedef {{ selected: boolean, source: 'card' | 'cycle' | 'project' | 'selection' }} DepthLevel */
/** @typedef {{ kind: 'card', id: string } | { kind: 'cycle', name: string }} DepthTarget */

export class DepthError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'DepthError';
  }
}

const DONE = '06_done';
const HEADING = '## Session instructions';
const INDEX_START = '<!-- generated index';

/**
 * The four levels a card is held to and the layer that set each. Pure.
 * A level is selected when the tier requires it (source is the layer that set the tier), when the card lists a card
 * level in test_levels (source card), or when the cycle selects a cycle level in verificationLevels (source selection).
 * @param {{ tierData: { test_levels: Record<string, string | null>, regression?: Record<string, string | null> }, tier: string, source?: 'card' | 'cycle' | 'project', verificationLevels?: string[], card?: object }} input
 * @returns {{ levels: Record<'unit' | 'integration' | 'system' | 'acceptance', DepthLevel>, regression: Record<'selection' | 'full-suite', DepthLevel> }}
 */
export function resolveDepth({ tierData, tier, source = 'project', verificationLevels = [], card }) {
  const byTier = requiredAt(tierData.test_levels, tier);
  const planned = testLevelsOf(card);
  const levels = Object.fromEntries(TEST_LEVELS.map((level) => {
    if (byTier.includes(level)) return [level, { selected: true, source }];
    if (CARD_LEVELS.includes(level) && planned.includes(level)) return [level, { selected: true, source: 'card' }];
    if (CYCLE_LEVELS.includes(level) && verificationLevels.includes(level)) return [level, { selected: true, source: 'selection' }];
    return [level, { selected: false, source }];
  }));
  const byRegression = requiredAt(tierData.regression ?? {}, tier);
  const regression = Object.fromEntries(REGRESSION_MODES.map((mode) => [mode, { selected: byRegression.includes(mode), source }]));
  return { levels, regression };
}

const splitLines = (text) => text.split(/\r?\n/);
const isBoundary = (line) => line.startsWith('## ') || line.startsWith(INDEX_START);

/**
 * The items of a cycle brief's Session instructions section. Never throws; an absent section reads as empty.
 * @param {unknown} briefText
 * @returns {string[]}
 */
export function parseCycleInstructions(briefText) {
  if (typeof briefText !== 'string') return [];
  const lines = splitLines(briefText);
  const start = lines.findIndex((line) => line.trimEnd() === HEADING);
  if (start === -1) return [];
  const items = [];
  for (let i = start + 1; i < lines.length && !isBoundary(lines[i]); i += 1) {
    const item = /^- (\S.*)$/.exec(lines[i].trimEnd());
    if (item) items.push(item[1]);
  }
  return items;
}

/** The instructions written in a cycle's brief. */
export function readCycleInstructions(projectDir, name) {
  const roots = resolveProjectRoots(projectDir);
  return parseCycleInstructions(readFileSync(resolveProjectPath(roots, cyclePaths(name).brief), 'utf8'));
}

/** The brief text with one list item added to the Session instructions section, created before the generated index when absent. */
function withInstruction(text, line) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = splitLines(text);
  const start = lines.findIndex((entry) => entry.trimEnd() === HEADING);
  const item = `- ${line}`;
  if (start === -1) {
    const index = lines.findIndex((entry) => entry.startsWith(INDEX_START));
    const at = index === -1 ? lines.length : index;
    const block = ['', HEADING, '', item, ''];
    if (at === 0 || lines[at - 1].trim() === '') block.shift();
    lines.splice(at, 0, ...block);
    return lines.join(eol);
  }
  let end = start + 1;
  while (end < lines.length && !isBoundary(lines[end])) end += 1;
  let last = end - 1;
  while (last > start && lines[last].trim() === '') last -= 1;
  const add = /^- /.test(lines[last]) ? [item] : ['', item];
  lines.splice(last + 1, 0, ...add);
  const after = last + 1 + add.length;
  if (after < lines.length && lines[after].trim() !== '') lines.splice(after, 0, '');
  return lines.join(eol);
}

const oneLine = (value, what) => {
  if (typeof value !== 'string' || value.trim() === '') throw new DepthError(`The ${what} is empty. Give it one line of text.`);
  if (/[\r\n]/.test(value)) throw new DepthError(`The ${what} has more than one line. Give it one line of text.`);
  return value.trim();
};

const dated = (now, text) => `${now.toISOString().slice(0, 10)} ${text}`;

/** Resolves and checks a target; returns what the writers need. */
function locate(projectDir, target) {
  if (target?.kind === 'card') {
    let found;
    try {
      found = cardPath(projectDir, target.id);
    } catch (cause) {
      if (cause instanceof BoardError) throw new DepthError(cause.message, { cause });
      throw cause;
    }
    if (found === null) throw new DepthError(`Card ${target.id} is not on the board. Check the id.`);
    if (found.column === DONE) throw new DepthError(`Card ${target.id} is done, so its depth is not changed. Open a new card instead.`);
    return { kind: 'card', id: target.id };
  }
  if (target?.kind === 'cycle') {
    let cycle;
    try {
      cycle = readCycle(projectDir, target.name);
    } catch (cause) {
      if (cause instanceof CycleError || cause instanceof CycleNameError) throw new DepthError(cause.message, { cause });
      throw cause;
    }
    if (cycle.status !== 'open') throw new DepthError(`Cycle ${target.name} is closed, so its depth is not changed. Closed cycles are history; to change depth for work still ahead, open a new cycle with ${scriptCommand(projectDir, 'cycle.mjs')} ${projectDir} new <name> --goal <text> --tier <tier>, or set a tier on one card with ${scriptCommand(projectDir, 'depth.mjs')} ${projectDir} tier card <id> <tier>.`);
    return { kind: 'cycle', brief: resolveProjectPath(resolveProjectRoots(projectDir), cyclePaths(target.name).brief) };
  }
  throw new DepthError('The target must be a card or a cycle.');
}

/**
 * Sets the tier of a card (or 'inherit' to remove it) or of a cycle, with an optional note kept as a dated instruction.
 * @param {string} projectDir
 * @param {DepthTarget} target
 * @param {string} tier
 * @param {{ note?: string, now?: Date }} [options]
 */
export function setTier(projectDir, target, tier, { note, now = new Date() } = {}) {
  const where = locate(projectDir, target);
  const allowed = where.kind === 'card' ? [...TIERS, 'inherit'] : TIERS;
  if (!allowed.includes(tier)) {
    throw new DepthError(where.kind === 'cycle' && tier === 'inherit'
      ? `A cycle has no layer to inherit from. Set it to one of: ${TIERS.join(', ')}.`
      : `Unknown tier ${JSON.stringify(tier)}. Use one of: ${allowed.join(', ')}.`);
  }
  const line = note === undefined ? null : dated(now, `tier ${tier}: ${oneLine(note, 'note')}`);
  if (where.kind === 'card') {
    const card = readCard(projectDir, where.id);
    const next = { ...card, tier: tier === 'inherit' ? null : tier };
    if (line !== null) next.session_instructions = [...instructionsOf(card), line];
    writeCard(projectDir, where.id, next);
    return;
  }
  let text = setFrontmatterField(readFileSync(where.brief, 'utf8'), 'tier', tier);
  if (line !== null) text = withInstruction(text, line);
  writeFileSync(where.brief, text);
}

/**
 * Records a dated one-line instruction in the card's card.json or the cycle brief.
 * @param {string} projectDir
 * @param {DepthTarget} target
 * @param {string} text
 * @param {{ now?: Date }} [options]
 * @returns {string} the stored line
 */
export function addInstruction(projectDir, target, text, { now = new Date() } = {}) {
  const where = locate(projectDir, target);
  const line = dated(now, oneLine(text, 'instruction'));
  if (where.kind === 'card') {
    const card = readCard(projectDir, where.id);
    writeCard(projectDir, where.id, { ...card, session_instructions: [...instructionsOf(card), line] });
  } else {
    writeFileSync(where.brief, withInstruction(readFileSync(where.brief, 'utf8'), line));
  }
  return line;
}

const FRONTMATTER_FENCE = /^---[ \t]*$/;

/** The brief text with one scalar frontmatter line removed; the text unchanged when there is none. */
function withoutFrontmatterKey(text, key) {
  const lines = text.split('\n');
  const close = lines.findIndex((line, i) => i > 0 && FRONTMATTER_FENCE.test(line.replace(/\r$/, '')));
  if (close === -1) return text;
  return lines.filter((line, i) => !(i > 0 && i < close && line.startsWith(`${key}:`))).join('\n');
}

/**
 * Sets one concern (code hygiene, test depth, documentation, review, approvals or release) of a card or a cycle, or
 * 'inherit' to remove the setting so the layer above decides. The nearest layer that sets a concern wins, raising or
 * lowering, and no reason is required; an optional note is kept as a dated instruction.
 * @param {string} projectDir
 * @param {DepthTarget} target
 * @param {string} concern one of CONCERNS
 * @param {string} tier a tier or 'inherit'
 * @param {{ note?: string, now?: Date }} [options]
 */
export function setConcern(projectDir, target, concern, tier, { note, now = new Date() } = {}) {
  if (!CONCERNS.includes(concern)) throw new DepthError(`Unknown concern ${JSON.stringify(concern)}. Use one of: ${CONCERNS.join(', ')}.`);
  if (![...TIERS, 'inherit'].includes(tier)) throw new DepthError(`Unknown tier ${JSON.stringify(tier)}. Use one of: ${TIERS.join(', ')}, inherit.`);
  const where = locate(projectDir, target);
  const line = note === undefined ? null : dated(now, `${concern} ${tier}: ${oneLine(note, 'note')}`);
  if (where.kind === 'card') {
    const card = readCard(projectDir, where.id);
    const concerns = { ...(card.concerns ?? {}) };
    if (tier === 'inherit') delete concerns[concern];
    else concerns[concern] = tier;
    const next = { ...card, concerns };
    if (Object.keys(concerns).length === 0) delete next.concerns;
    if (line !== null) next.session_instructions = [...instructionsOf(card), line];
    writeCard(projectDir, where.id, next);
    return;
  }
  const key = concernKey(concern);
  const original = readFileSync(where.brief, 'utf8');
  let text = tier === 'inherit' ? withoutFrontmatterKey(original, key) : setFrontmatterField(original, key, tier);
  if (line !== null) text = withInstruction(text, line);
  writeFileSync(where.brief, text);
}
