import { readFileSync, writeFileSync } from 'node:fs';
import { cardPath, readCard, writeCard } from './board.mjs';
import { VERIFY_TYPES } from './card.mjs';
import { CARD_FILES, cardFile } from './card-files.mjs';
import { applyScopeBlock, unsafeScopePath } from './card-scope.mjs';
import { FreezeError, changedFreezeFields, freezeHashes, validateFreeze } from './freeze.mjs';
import { humanColumn } from './moves.mjs';
import { scriptCommand } from './script-command.mjs';

/** @typedef {import('./card.mjs').Card} Card */
/** @typedef {{ add?: string[], remove?: string[], edit?: string[], drop?: string[], scope?: string[], unscope?: string[], blast_radius?: string[] }} ManifestChanges */
/** @typedef {{ text: string, verify: string, level?: string }} CriterionAddition */

/** The columns a lead may amend a frozen card in: working or in review. Shaping re-freezes the usual way; later columns are closed. */
const AMENDABLE_COLUMNS = Object.freeze(['03_in_progress', '04_review']);
const CHANGE_KEYS = Object.freeze(['add', 'remove', 'edit', 'drop', 'scope', 'unscope', 'blast_radius']);
const unique = (items) => [...new Set(items)];
const sorted = (items) => [...items].sort();
const slashes = (path) => String(path).replaceAll(String.fromCharCode(92), '/').replace(/^(\.\/)+/, '').replace(/\/+$/, '');

/**
 * What both amendments check first: the card is in work or review, the reason is given, the freeze record is valid and
 * still describes the card exactly (so the old lists are the frozen ones and nothing else was edited by hand).
 */
function loadFrozen(projectDir, id, reason, what) {
  const card = readCard(projectDir, id);
  const { column } = cardPath(projectDir, id);
  const freeze = /** @type {any} */ (card).freeze;
  const command = scriptCommand(projectDir, 'freeze.mjs');
  if (!AMENDABLE_COLUMNS.includes(column)) {
    throw new FreezeError('freeze-amend-wrong-column', `Card ${id} is in ${humanColumn(column)}; ${what} works only on a card in progress or in review. In shaping edit the card and run ${command} <projectDir> ${id}; from ready, gate or done go back to shaping first.`);
  }
  if (String(reason ?? '').trim() === '') {
    throw new FreezeError('freeze-reason-missing', `${what} needs a reason. Pass --reason <text> saying what is added or changed and why.`);
  }
  if (freeze === undefined || validateFreeze(freeze, projectDir).length > 0) {
    throw new FreezeError('freeze-not-frozen', `Card ${id} has no valid freeze record to amend. Take it back to shaping (${scriptCommand(projectDir, 'card-move.mjs')} <projectDir> ${id} shaping --reason <text>), correct it and run ${command} <projectDir> ${id}.`);
  }
  let briefText = '';
  try {
    briefText = readFileSync(cardFile(projectDir, id, CARD_FILES.reviewerBrief), 'utf8');
  } catch (cause) {
    if (cause.code !== 'ENOENT') throw cause;
  }
  const changed = changedFreezeFields(freeze, freezeHashes(card, briefText));
  if (changed.length > 0) {
    throw new FreezeError('freeze-amend-changed-beyond', `The ${changed.join(', ')} of card ${id} no longer match the freeze record, so ${what} cannot tell what it is amending. Restore the frozen values and pass the change to ${command} instead of editing card.json by hand; or take the card back to shaping.`);
  }
  return { card, freeze, briefText };
}

/** Writes card.md's generated scope table from the amended card.json when card.md has a Scope section to put it in. */
function syncScopeTable(projectDir, id, card) {
  const file = cardFile(projectDir, id, 'card.md');
  if (file === null || unsafeScopePath(card) !== null) return;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  const next = applyScopeBlock(text, card);
  if (next.written && next.changed) writeFileSync(file, next.text);
}

const listsOf = (card) => ({
  manifest: { add: sorted(card.manifest.add), remove: sorted(card.manifest.remove), edit: sorted(card.manifest.edit) },
  files_scope: sorted(card.files_scope),
  blast_radius: Array.isArray(card.blast_radius) ? sorted(card.blast_radius) : [],
});

/**
 * A lead-owned correction of a frozen card's manifest, files_scope and blast_radius lists, for a plan that missed a file.
 * Only a card in progress or in review, whose freeze record still matches it, can be amended. The criteria, tests, gate and
 * reviewer brief never change. The change (add, remove or edit paths; drop a path from every manifest list; add or remove a
 * scope folder; add a module to the blast radius) is applied, the manifest and scope hashes are written again, card.md's
 * generated scope table follows, and the amendment (who, why, old and new lists, when) is appended to card.json
 * `manifest_amendments`; the review packet shows it as a deviation.
 * @param {string} projectDir
 * @param {string} id
 * @param {string} reason
 * @param {ManifestChanges} changes
 * @param {{ now?: Date, by?: string }} [options]
 * @returns {Card}
 */
export function amendManifest(projectDir, id, reason, changes, options = {}) {
  const { card, freeze, briefText } = loadFrozen(projectDir, id, reason, 'a manifest amendment');
  const given = Object.fromEntries(CHANGE_KEYS.map((key) => [key, (changes[key] ?? []).map((item) => (key === 'blast_radius' ? String(item).trim() : slashes(item)))]));
  for (const [key, items] of Object.entries(given)) {
    for (const item of items) {
      const bad = item === '' || item.startsWith('/') || /^[a-zA-Z]:/.test(item) || item.split('/').includes('..') || /[`\r\n|]/.test(item);
      if (bad) throw new FreezeError('freeze-amend-path', `"${item}" cannot be used as a ${key.replace('_', ' ')} entry: give a project-relative path with no "..", backtick, pipe or line break.`);
    }
  }
  const old = listsOf(card);
  const dropped = new Set(given.drop);
  const unscoped = new Set(given.unscope);
  const next = {
    manifest: Object.fromEntries(['add', 'remove', 'edit'].map((kind) => [kind, sorted(unique([...old.manifest[kind], ...given[kind]])).filter((path) => !dropped.has(path))])),
    files_scope: sorted(unique([...old.files_scope, ...given.scope])).filter((path) => !unscoped.has(path)),
    blast_radius: sorted(unique([...old.blast_radius, ...given.blast_radius])),
  };
  if (JSON.stringify(old) === JSON.stringify(next)) {
    throw new FreezeError('freeze-amend-empty', `The change leaves the manifest, files_scope and blast_radius of card ${id} as they are, so there is nothing to amend. Pass the paths to add (--add, --edit, --remove), drop (--drop) or scope (--scope, --unscope).`);
  }
  const amended = {
    ...card,
    manifest: { ...next.manifest, frozen: true },
    files_scope: next.files_scope,
    ...(next.blast_radius.length > 0 || Array.isArray(card.blast_radius) ? { blast_radius: next.blast_radius } : {}),
  };
  const hashes = freezeHashes(/** @type {any} */ (amended), briefText);
  const entry = { at: (options.now ?? new Date()).toISOString(), by: options.by ?? 'lead', reason: String(reason).trim(), from: old, to: next };
  const result = {
    ...amended,
    freeze: { ...freeze, manifest_sha256: hashes.manifest_sha256, scope_sha256: hashes.scope_sha256, scope_parts: hashes.scope_parts },
    manifest_amendments: [.../** @type {any} */ (card).manifest_amendments ?? [], entry],
  };
  writeCard(projectDir, id, result);
  syncScopeTable(projectDir, id, result);
  return /** @type {any} */ (result);
}

/**
 * A lead-owned addition of criteria to a frozen card (a sustained review finding that needs one more check). Never a change
 * or removal of an existing criterion. The same conditions as amendManifest; the criteria hash is written again and the
 * addition is appended to card.json `criteria_amendments` and shown in the review packet as a deviation.
 * @param {string} projectDir
 * @param {string} id
 * @param {string} reason
 * @param {CriterionAddition[]} added
 * @param {{ now?: Date, by?: string }} [options]
 * @returns {Card}
 */
export function amendCriteria(projectDir, id, reason, added, options = {}) {
  const { card, freeze, briefText } = loadFrozen(projectDir, id, reason, 'a criteria amendment');
  if (!Array.isArray(added) || added.length === 0) {
    throw new FreezeError('freeze-amend-empty', `Nothing to add to card ${id}. Pass --criterion <text> --verify <${VERIFY_TYPES.join('|')}>.`);
  }
  const taken = new Set(card.criteria.map((criterion) => criterion.text));
  for (const item of added) {
    const text = typeof item?.text === 'string' ? item.text.trim() : '';
    if (text === '' || /[\r\n]/.test(text)) throw new FreezeError('freeze-amend-criterion', 'A criterion must be one non-empty line of text.');
    if (!VERIFY_TYPES.includes(item.verify)) throw new FreezeError('freeze-amend-criterion', `A criterion needs a verify type, one of: ${VERIFY_TYPES.join(', ')}; not ${JSON.stringify(item.verify)}.`);
    if (taken.has(text)) throw new FreezeError('freeze-amend-criterion', `Card ${id} already has the criterion "${text}". An amendment adds a criterion; it never changes or repeats an existing one.`);
    taken.add(text);
  }
  const fresh = added.map((item) => ({ text: item.text.trim(), verify: item.verify, ...(item.level === undefined ? {} : { level: item.level }), evidence: null, status: 'pending' }));
  const amended = { ...card, criteria: [...card.criteria, ...fresh] };
  const hashes = freezeHashes(/** @type {any} */ (amended), briefText);
  const entry = { at: (options.now ?? new Date()).toISOString(), by: options.by ?? 'lead', reason: String(reason).trim(), added: fresh.map(({ text, verify }) => ({ text, verify })) };
  const result = {
    ...amended,
    freeze: { ...freeze, criteria_sha256: hashes.criteria_sha256 },
    criteria_amendments: [.../** @type {any} */ (card).criteria_amendments ?? [], entry],
  };
  writeCard(projectDir, id, result);
  return /** @type {any} */ (result);
}
