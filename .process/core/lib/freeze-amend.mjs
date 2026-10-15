import { detectEol, toPosix } from './files.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { cardPath, readCard, writeCard } from './board.mjs';
import { VERIFY_TYPES } from './card.mjs';
import { CARD_FILES, cardFile, workFile } from './card-files.mjs';
import { applyScopeBlock, unsafeScopePath } from './card-scope.mjs';
import { FreezeError, changedFreezeFields, freezeHashes, validateFreeze } from './freeze.mjs';
import { AMENDABLE, CARD_JSON, CARD_MD, humanColumn } from './layout.mjs';
import { scriptCommand } from './script-command.mjs';

/** @typedef {import('./card.mjs').Card} Card */
/** @typedef {{ add?: string[], remove?: string[], edit?: string[], drop?: string[], scope?: string[], unscope?: string[], blast_radius?: string[] }} ManifestChanges */
/** @typedef {{ text: string, verify: string, level?: string }} CriterionAddition */

/** The columns a lead may amend a frozen card in: working or in review. Shaping re-freezes the usual way; later columns are closed. */
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
  if (!AMENDABLE.includes(column)) {
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
    throw new FreezeError('freeze-amend-changed-beyond', `The ${changed.join(', ')} of card ${id} no longer match the freeze record, so ${what} cannot tell what it is amending. Restore the frozen values and pass the change to ${command} instead of editing ${CARD_JSON} by hand; or take the card back to shaping.`);
  }
  return { card, freeze, briefText };
}

/** Writes card.md's generated scope table from the amended card.json when card.md has a Scope section to put it in. */
function syncScopeTable(projectDir, id, card) {
  const file = cardFile(projectDir, id, CARD_MD);
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

/**
 * The text with one list line added to the end of a "## heading" section (up to the next level 1 or 2 heading), in the
 * file's own line ending; null when the text has no such section.
 */
function appendToSection(text, heading, line) {
  const eol = detectEol(text);
  const rows = text.split(eol);
  const start = rows.findIndex((row) => row.trim().toLowerCase() === `## ${heading}`);
  if (start === -1) return null;
  const next = rows.findIndex((row, index) => index > start && /^#{1,2}\s/.test(row));
  const end = next === -1 ? rows.length : next;
  let last = end - 1;
  while (last > start && rows[last].trim() === '') last--;
  const lead = last > start && !rows[last].startsWith('- ') ? ['', line] : [line];
  rows.splice(last + 1, 0, ...lead);
  if (next !== -1 && rows[last + 1 + lead.length].trim() !== '') rows.splice(last + 1 + lead.length, 0, '');
  return rows.join(eol);
}

/** Appends the lines to a document's section when the file and section exist; returns whether it wrote. */
function appendToDocument(file, heading, lines) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const next = lines.reduce((acc, line) => acc === null ? null : appendToSection(acc, heading, line), text);
  if (next === null) return null;
  writeFileSync(file, next);
  return next;
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
  const both = given.add.find((path) => given.edit.includes(path));
  if (both !== undefined) throw new FreezeError('freeze-amend-path', `"${both}" is given to both --add and --edit; a path is an add or an edit, not both. Give it to one of them.`);
  const old = listsOf(card);
  const dropped = new Set(given.drop);
  const unscoped = new Set(given.unscope);
  const next = {
    manifest: Object.fromEntries(['add', 'remove', 'edit'].map((kind) => [kind, sorted(unique([...old.manifest[kind].filter((path) => !dropped.has(path)), ...given[kind]]))])),
    files_scope: sorted(unique([...old.files_scope, ...given.scope])).filter((path) => !unscoped.has(path)),
    blast_radius: sorted(unique([...old.blast_radius, ...given.blast_radius])),
  };
  const overlap = next.manifest.add.find((path) => next.manifest.edit.includes(path));
  if (overlap !== undefined) throw new FreezeError('freeze-amend-path', `"${overlap}" would be in both the add and the edit list; a path is an add or an edit, not both. Drop it first (--drop ${overlap}), then add or edit it.`);
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

const MUST_HAVE_TYPES = ['contract', 'constraint'];
const CRITERION_ID = /^([a-z]+-\d+):\s*(.+)$/i;

/**
 * A lead-owned addition of criteria to a frozen card (a sustained review finding that needs one more check). Never a change
 * or removal of an existing criterion. The same conditions as amendManifest; the criteria hash is written again and the
 * addition is appended to card.json `criteria_amendments` and shown in the review packet as a deviation.
 * @param {string} projectDir
 * @param {string} id
 * @param {string} reason
 * @param {CriterionAddition[]} added
 * @param {{ now?: Date, by?: string, type?: string }} [options] type is the card.md line type for a criterion that starts with an id (contract by default)
 * @returns {Card}
 */
export function amendCriteria(projectDir, id, reason, added, options = {}) {
  const { card, freeze, briefText } = loadFrozen(projectDir, id, reason, 'a criteria amendment');
  if (!Array.isArray(added) || added.length === 0) {
    throw new FreezeError('freeze-amend-empty', `Nothing to add to card ${id}. Pass --criterion <text> --verify <${VERIFY_TYPES.join('|')}>.`);
  }
  const type = options.type ?? 'contract';
  if (!MUST_HAVE_TYPES.includes(type)) throw new FreezeError('freeze-amend-criterion', `A must-have line has a type, one of: ${MUST_HAVE_TYPES.join(', ')}; not ${JSON.stringify(type)}.`);
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
  const at = (options.now ?? new Date()).toISOString();
  const lines = fresh.map(({ text }) => `- ${text}`);
  const mustHaveLines = fresh.map(({ text }) => {
    const [, criterionId, rest] = text.match(CRITERION_ID) ?? [];
    return criterionId === undefined ? `- ${text}` : `- \`${type}\` \`${criterionId}\` ${rest}`;
  });
  const targets = [
    [cardFile(projectDir, id, CARD_MD), 'must-haves', mustHaveLines],
    [workFile(projectDir, id, CARD_FILES.spec), 'acceptance criteria', lines],
    [cardFile(projectDir, id, CARD_FILES.reviewerBrief), 'rubric', lines],
  ];
  const written = [];
  let newBrief = briefText;
  for (const [file, heading, rows] of targets) {
    const text = file === null ? null : appendToDocument(file, heading, rows);
    if (text === null) continue;
    written.push(toPosix(relative(resolve(projectDir), file)));
    if (heading === 'rubric') newBrief = text;
  }
  const hashes = freezeHashes(/** @type {any} */ (amended), newBrief);
  const briefChanged = newBrief !== briefText;
  const entry = { at, by: options.by ?? 'lead', reason: String(reason).trim(), added: fresh.map(({ text, verify }) => ({ text, verify })), files: written };
  const result = {
    ...amended,
    freeze: {
      ...freeze,
      criteria_sha256: hashes.criteria_sha256,
      ...(briefChanged ? { brief_sha256: hashes.brief_sha256, brief_core_sha256: hashes.brief_core_sha256, brief_amendments: [...(freeze.brief_amendments ?? []), { at, reason: entry.reason, from_sha256: freeze.brief_sha256, to_sha256: hashes.brief_sha256 }] } : {}),
    },
    criteria_amendments: [.../** @type {any} */ (card).criteria_amendments ?? [], entry],
  };
  writeCard(projectDir, id, result);
  return /** @type {any} */ (result);
}
