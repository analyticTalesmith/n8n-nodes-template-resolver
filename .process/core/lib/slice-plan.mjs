import { toPosix } from './files.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative as relativePath, resolve } from 'node:path';
import { cardExists, cardPath, isCardId, listCards } from './board.mjs';
import { WORK_ROOT } from './card-files.mjs';
import { CARD_MD, DOCS_ROOT, LIVING_DIR, isCycleName } from './layout.mjs';
import { proseOnly } from './contract.mjs';
import { findCycle, normalize, overlaps, parallelGroups } from './graph.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/** @typedef {import('./card.mjs').Card} Card */
/** @typedef {{ a: string, b: string, path: string, reason: string }} ScopeConflict */

const LIVING_ROOT = `${LIVING_DIR}/`;
const LINK = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export class SlicePlanError extends Error {
  /**
   * @param {'selector' | 'no-cards' | 'cycle' | 'missing-dependency' | 'exists' | 'unreadable'} detail
   * @param {string} message
   * @param {ErrorOptions} [options]
   */
  constructor(detail, message, options) {
    super(message, options);
    this.name = 'SlicePlanError';
    this.detail = detail;
  }
}

/**
 * Orders cards into dependency waves: every card sits one wave after the latest wave it depends on.
 * Dependencies on ids outside `nodes` are ignored here (the caller decides whether they are missing).
 * @param {Array<{ id: string, depends_on: string[] }>} nodes
 * @returns {string[][]}
 * @throws {SlicePlanError} detail `cycle`, naming the cards on the cycle
 */
export function computeWaves(nodes) {
  const cycle = findCycle(nodes);
  if (cycle) {
    throw new SlicePlanError('cycle', `The cards depend on each other in a loop: ${[...cycle, cycle[0]].join(' -> ')}. Remove one of these depends_on links.`);
  }
  const ids = new Set(nodes.map((n) => n.id));
  /** @type {Map<string, number>} */
  const level = new Map();
  const levelOf = (id) => {
    const known = level.get(id);
    if (known !== undefined) return known;
    const node = nodes.find((n) => n.id === id);
    const value = 1 + Math.max(-1, ...node.depends_on.filter((d) => ids.has(d)).map(levelOf));
    level.set(id, value);
    return value;
  };
  /** @type {string[][]} */
  const waves = [];
  for (const { id } of nodes) (waves[levelOf(id)] ??= []).push(id);
  return waves;
}

/**
 * Finds the pairs of cards whose write scopes overlap, and the path they share.
 * A card with no declared scope has an unknown footprint, so it conflicts with every other card.
 * @param {Array<{ id: string, scope: string[] }>} cards
 * @returns {ScopeConflict[]}
 */
export function findScopeConflicts(cards) {
  /** @type {ScopeConflict[]} */
  const conflicts = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const [x, y] = [cards[i], cards[j]];
      const unknown = x.scope.length === 0 ? x : y.scope.length === 0 ? y : null;
      if (unknown) {
        conflicts.push({ a: x.id, b: y.id, path: '', reason: `${unknown.id} has no declared scope, so its footprint is unknown` });
        continue;
      }
      let shared = null;
      for (const p of x.scope) {
        for (const q of y.scope) {
          if (!overlaps(normalize(p), normalize(q))) continue;
          const specific = normalize(p).length >= normalize(q).length ? p : q;
          if (shared === null || specific.length > shared.length) shared = specific;
        }
      }
      if (shared !== null) conflicts.push({ a: x.id, b: y.id, path: shared, reason: `both write ${shared}` });
    }
  }
  return conflicts;
}

/**
 * Relative links in a card.md that lead into the living docs folder, as project-relative paths, once each, in order.
 * @param {string} body
 * @param {string} cardDir project-relative folder of the card, forward slashes
 * @returns {string[]}
 */
export function extractLivingLinks(body, cardDir) {
  /** @type {string[]} */
  const found = [];
  for (const match of proseOnly(String(body)).matchAll(LINK)) {
    let target = match[1].split('#')[0];
    if (target === '' || SCHEME.test(target)) continue;
    try {
      target = decodeURI(target);
    } catch {
      // keep the raw text
    }
    const slashed = toPosix(target);
    const path = slashed.startsWith('/') ? posix.normalize(slashed.replace(/^\/+/, '')) : posix.normalize(posix.join(cardDir, slashed));
    if (path.startsWith(LIVING_ROOT) && !found.includes(path)) found.push(path);
  }
  return found;
}

const cell = (text) => String(text).replace(/\s+/g, ' ').replaceAll('|', '\\|');
const list = (items) => (items.length === 0 ? 'none' : items.join(', '));

/**
 * Renders the plan skeleton. It carries ids, titles, paths and links only, never a card's body.
 * @param {{ slice: string, entries: Array<{ card: Card, cardMd: string, links: string[], scope: string[] }>, waves: string[][] }} input
 * @returns {{ markdown: string, conflicts: ScopeConflict[], flagged: string[] }}
 */
function render({ slice, entries, waves }) {
  const byId = new Map(entries.map((e) => [e.card.id, e]));
  const flagged = entries.filter((e) => e.links.length === 0).map((e) => e.card.id);
  /** @type {ScopeConflict[]} */
  const allConflicts = [];
  const lines = [`# Slice plan: ${slice}`, '', 'Generated from the tickets by reference. The tickets and the living documents are the source of truth; edit them, not this file.', ''];

  lines.push('## Cards', '', '| Card | Title | Path | Type | Depends on | Review tier/model/effort |', '| --- | --- | --- | --- | --- | --- |');
  for (const { card, cardMd } of entries) {
    lines.push(`| ${card.id} | ${cell(card.title)} | ${cardMd} | ${card.type} | ${list(card.depends_on)} | |`);
  }

  lines.push('', '## Waves', '');
  waves.forEach((wave, i) => {
    const members = wave.map((id) => byId.get(id));
    const conflicts = findScopeConflicts(members.map((e) => ({ id: e.card.id, scope: e.scope })));
    allConflicts.push(...conflicts);
    lines.push(`### Wave ${i + 1}`, '', `Cards: ${list(wave)}`, '');
    if (wave.length === 1) {
      lines.push('Parallel: a single card, nothing to run beside it.');
    } else {
      const groups = parallelGroups(members.map((e) => ({ id: e.card.id, files_scope: e.scope })), wave.length);
      const together = groups.filter((g) => g.length > 1);
      lines.push(together.length === 0 ? 'Parallel: no two cards have disjoint write scopes.' : `Parallel (disjoint write scopes): ${together.map((g) => `[${g.map((c) => c.id).join(', ')}]`).join(' ')}`);
    }
    lines.push('', conflicts.length === 0 ? 'Conflicts: none.' : 'Conflicts:');
    for (const c of conflicts) lines.push(`- ${c.a} and ${c.b}: ${c.reason}`);
    lines.push('');
  });

  lines.push('## Context links', '');
  for (const { card, links } of entries) {
    lines.push(`### ${card.id}`, '');
    if (links.length === 0) lines.push('FLAG: no context links. Add links to the living documents in the ticket.');
    for (const link of links) lines.push(`- ${link}`);
    lines.push('');
  }
  return { markdown: lines.join('\n'), conflicts: allConflicts, flagged };
}

/**
 * Builds the plan text for a set of cards. Pure: card.md bodies and project-relative card folders are passed in.
 * @param {{ slice: string, cards: Array<{ card: Card, dir: string, body: string }>, isKnown?: (id: string) => boolean }} input
 * @returns {{ markdown: string, waves: string[][], conflicts: ScopeConflict[], flagged: string[] }}
 * @throws {SlicePlanError} detail `missing-dependency` or `cycle`
 */
export function buildSlicePlan({ slice, cards, isKnown = () => false }) {
  const inSlice = new Set(cards.map((c) => c.card.id));
  for (const { card } of cards) {
    const missing = card.depends_on.filter((d) => !inSlice.has(d) && !isKnown(d));
    if (missing.length > 0) {
      throw new SlicePlanError('missing-dependency', `Card ${card.id} depends on ${list(missing)}, which is not on the board or in the archive. Correct depends_on in its card.json.`);
    }
  }
  const waves = computeWaves(cards.map((c) => ({ id: c.card.id, depends_on: c.card.depends_on })));
  const entries = cards.map(({ card, dir, body }) => {
    const scope = [...card.files_scope, ...card.manifest.add, ...card.manifest.remove, ...card.manifest.edit];
    return { card, cardMd: `${dir}/${CARD_MD}`, links: extractLivingLinks(body, dir), scope };
  });
  return { ...render({ slice, entries, waves }), waves };
}

/**
 * Reads the cards of a cycle (or a parent's children) and writes the slice-plan.md of the slice's work folder (never a
 * card's own plan.md). Refuses to replace an existing slice plan unless `force`.
 * @param {string} projectDir
 * @param {{ cycle: string } | { parent: string }} selector
 * @param {{ force?: boolean }} [options]
 * @returns {{ path: string, waves: string[][], conflicts: ScopeConflict[], flagged: string[] }}
 */
export function generateSlicePlan(projectDir, selector, options = {}) {
  const parent = 'parent' in selector ? selector.parent : null;
  const slice = 'parent' in selector ? selector.parent : selector.cycle;
  if (parent !== null ? !isCardId(parent) : !isCycleName(slice)) {
    throw new SlicePlanError('selector', parent !== null ? `"${parent}" is not a card id (like 0001-some-title).` : `"${slice}" is not a cycle name (lowercase letters, digits and hyphens).`);
  }
  const root = resolve(projectDir);
  const roots = resolveProjectRoots(root);
  const entries = listCards(root).filter(({ cycle, card }) => (parent !== null ? card.parent === parent : cycle === slice));
  if (entries.length === 0) {
    throw new SlicePlanError('no-cards', parent !== null ? `Card ${parent} has no children on the board.` : `Cycle "${slice}" has no cards. Check the cycle name.`);
  }

  const relative = `${WORK_ROOT}/${slice}/slice-plan.md`;
  const target = resolveProjectPath(roots, relative);
  if (existsSync(target) && !options.force) {
    throw new SlicePlanError('exists', `${relative} already exists. Pass --force to replace it.`);
  }

  const cards = entries.map(({ card }) => {
    const folder = cardPath(root, card.id).dir;
    const file = `${folder}/${CARD_MD}`;
    try {
      return { card, dir: `${DOCS_ROOT}/${toPosix(relativePath(roots.docsRoot, folder))}`, body: existsSync(file) ? readFileSync(file, 'utf8') : '' };
    } catch (cause) {
      throw new SlicePlanError('unreadable', `Cannot read ${file} (${cause.message}). Fix the file or its permissions.`, { cause });
    }
  });
  const plan = buildSlicePlan({ slice, cards, isKnown: (id) => cardExists(root, id) });
  try {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${plan.markdown}\n`, { flag: options.force ? 'w' : 'wx' });
  } catch (cause) {
    throw new SlicePlanError('unreadable', `Cannot write ${relative} (${cause.message}).`, { cause });
  }
  return { path: relative, waves: plan.waves, conflicts: plan.conflicts, flagged: plan.flagged };
}
