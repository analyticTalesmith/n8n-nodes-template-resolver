import { isSha256, sha256Bytes, toLf } from './files.mjs';
import { scriptCommand } from './script-command.mjs';
import { isPlainObject } from './types.mjs';
import { isIsoTimestamp } from './time.mjs';

/** @typedef {import('./card.mjs').Card} Card */
/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {'files_scope' | 'docs_impact' | 'docs_deferred' | 'gate'} ScopePart */
/** @typedef {Record<ScopePart, string>} ScopePartHashes */
/**
 * @typedef {{ brief_sha256: string, brief_core_sha256: string, manifest_sha256: string, criteria_sha256: string, scope_sha256: string, scope_parts: ScopePartHashes }} FreezeHashes
 */
/** @typedef {{ at: string, reason: string, from_sha256: string, to_sha256: string }} BriefAmendment */
/** @typedef {Partial<FreezeHashes> & { at: string, brief_amendments?: BriefAmendment[] }} FreezeRecord */

/** A refusal of a freeze or an amendment of one; rule names it. */
export class FreezeError extends Error {
  /** @param {string} rule @param {string} message */
  constructor(rule, message) {
    super(message);
    this.name = 'FreezeError';
    this.rule = rule;
  }
}

/** The hash fields a freeze record holds, by the part each locks. */
export const FREEZE_FIELDS = Object.freeze({ brief: 'brief_sha256', manifest: 'manifest_sha256', criteria: 'criteria_sha256', scope: 'scope_sha256' });
/**
 * Every hash field a packet header can carry, in the order the packet writers print them. The review packet writes all
 * of them (local_docs only in local mode); the evaluator package writes the four freeze fields and no diff or local_docs.
 */
export const HASH_FIELDS = Object.freeze([...Object.values(FREEZE_FIELDS), 'diff_sha256', 'local_docs_sha256']);
/** Fields every valid record has; a record without `scope_sha256` is valid in shape but stale. */
const REQUIRED_FIELDS = Object.freeze(['brief_sha256', 'manifest_sha256', 'criteria_sha256']);
/** The card fields the scope hash locks, in message order. */
export const SCOPE_PARTS = Object.freeze(/** @type {ScopePart[]} */ (['files_scope', 'docs_impact', 'docs_deferred', 'gate']));
/** The parts older records already carry; `gate` is newer, so a record without it is simply stale. */
const LEGACY_SCOPE_PARTS = SCOPE_PARTS.filter((part) => part !== 'gate');

/**
 * The brief with its Design context section (heading and body, up to the next level 1 or 2 heading) removed and blank
 * lines dropped, CRLF read as LF. A change confined to that section leaves this text, and so its hash, unchanged.
 * @param {string} briefText
 * @returns {string}
 */
export function briefWithoutDesignContext(briefText) {
  const rows = toLf(briefText).split('\n');
  const start = rows.findIndex((row) => /^##\s+design context\s*$/i.test(row));
  const end = start === -1 ? -1 : rows.findIndex((row, index) => index > start && /^#{1,2}(?!#)\s/.test(row));
  const kept = start === -1 ? rows : [...rows.slice(0, start), ...(end === -1 ? [] : rows.slice(end))];
  return kept.filter((row) => row.trim() !== '').join('\n');
}

// Raw UTF-8 bytes, no second line-ending pass: a stored freeze must keep verifying.
const sha256 = (text) => sha256Bytes(Buffer.from(text, 'utf8'));
const sorted = (list) => [...list].sort();
const isHash = isSha256;

/**
 * The scope values a freeze locks: sorted files_scope, `none` or the sorted docs_impact list, docs_deferred as a
 * boolean, and the gate argv in order (`none` when null or absent), so the command the gate runs cannot be swapped.
 */
const scopeValues = (card) => ({
  files_scope: sorted(card.files_scope),
  docs_impact: Array.isArray(card.docs_impact) ? sorted(card.docs_impact) : 'none',
  docs_deferred: /** @type {{ docs_deferred?: unknown }} */ (card).docs_deferred === true,
  gate: Array.isArray(card.gate) ? [...card.gate] : 'none',
});

/**
 * Hashes of what a freeze locks: the reviewer brief text (CRLF read as LF), the sorted manifest lists, the criteria
 * text and verify type in card order, and the scope (files_scope, docs_impact, docs_deferred, gate). `scope_parts` holds one
 * hash per scope field so a change can be named; only `scope_sha256` decides whether the scope changed.
 * @param {Card} card
 * @param {string} briefText
 * @returns {FreezeHashes}
 */
export function freezeHashes(card, briefText) {
  const { add, remove, edit } = card.manifest;
  const scope = scopeValues(card);
  return {
    brief_sha256: sha256(toLf(briefText)),
    brief_core_sha256: sha256(briefWithoutDesignContext(briefText)),
    manifest_sha256: sha256(JSON.stringify({ add: sorted(add), remove: sorted(remove), edit: sorted(edit) })),
    criteria_sha256: sha256(JSON.stringify(card.criteria.map((c) => [c.text, c.verify]))),
    scope_sha256: sha256(JSON.stringify(scope)),
    scope_parts: {
      files_scope: sha256(JSON.stringify(scope.files_scope)),
      docs_impact: sha256(JSON.stringify(scope.docs_impact)),
      docs_deferred: sha256(JSON.stringify(scope.docs_deferred)),
      gate: sha256(JSON.stringify(scope.gate)),
    },
  };
}

/**
 * Checks the shape of a card's freeze record. A missing `scope_sha256` passes here (the checks report it as stale);
 * a present but malformed `scope_sha256` or `scope_parts` does not. Never throws.
 * @param {unknown} value
 * @returns {Finding[]}
 */
export function validateFreeze(value, projectDir) {
  const problem = (expected) => [
    {
      rule: 'freeze-invalid',
      message: `The freeze record in card.json must be ${expected}. Re-run ${scriptCommand(projectDir, 'freeze.mjs')} <projectDir> <id> to write a fresh one.`,
      path: 'freeze',
    },
  ];
  if (!isPlainObject(value)) {
    return problem('an object with at, brief_sha256, manifest_sha256, criteria_sha256 and scope_sha256');
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  if (!isIsoTimestamp(record.at)) return problem('an object whose at is an ISO 8601 timestamp');
  for (const field of REQUIRED_FIELDS) {
    if (!isHash(record[field])) return problem(`an object whose ${field} is 64 lowercase hex characters`);
  }
  if (record.scope_sha256 !== undefined && !isHash(record.scope_sha256)) {
    return problem('an object whose scope_sha256 is 64 lowercase hex characters');
  }
  if (record.brief_core_sha256 !== undefined && !isHash(record.brief_core_sha256)) {
    return problem('an object whose brief_core_sha256 is 64 lowercase hex characters');
  }
  if (record.brief_amendments !== undefined) {
    const entries = record.brief_amendments;
    const sound = (entry) => isPlainObject(entry) && isIsoTimestamp(entry.at) && typeof entry.reason === 'string' && isHash(entry.from_sha256) && isHash(entry.to_sha256);
    if (!Array.isArray(entries) || !entries.every(sound)) {
      return problem('an object whose brief_amendments is a list of entries with at, reason, from_sha256 and to_sha256');
    }
  }
  if (record.scope_parts !== undefined) {
    const parts = record.scope_parts;
    const hashes = /** @type {Record<string, unknown>} */ (parts);
    if (!isPlainObject(parts) || !LEGACY_SCOPE_PARTS.every((part) => isHash(hashes[part])) || (hashes.gate !== undefined && !isHash(hashes.gate))) {
      return problem(`an object whose scope_parts holds ${LEGACY_SCOPE_PARTS.join(', ')} (and gate, once present) as 64 lowercase hex characters each`);
    }
  }
  return [];
}

/**
 * Which frozen parts differ between a record and the current hashes. A record without `scope_sha256` reports `scope`.
 * @param {FreezeRecord} record
 * @param {FreezeHashes} current
 * @returns {Array<'brief' | 'manifest' | 'criteria' | 'scope'>}
 */
export function changedFreezeFields(record, current) {
  return /** @type {Array<'brief' | 'manifest' | 'criteria' | 'scope'>} */ (
    Object.entries(FREEZE_FIELDS)
      .filter(([, field]) => record[field] !== current[field])
      .map(([name]) => name)
  );
}

/**
 * Which scope fields differ, by the record's per-field hashes. Without usable `scope_parts` every scope field is named,
 * because one hash cannot say which field changed.
 * @param {FreezeRecord} record
 * @param {FreezeHashes} current
 * @returns {ScopePart[]}
 */
export function changedScopeParts(record, current) {
  const parts = record.scope_parts;
  if (!isPlainObject(parts) || !SCOPE_PARTS.every((part) => isHash(parts[part]))) return [...SCOPE_PARTS];
  const changed = SCOPE_PARTS.filter((part) => parts[part] !== current.scope_parts[part]);
  return changed.length ? changed : [...SCOPE_PARTS];
}

/**
 * The `field: value` header lines for the hash fields in HASH_FIELDS, in that order. A field the caller does not give
 * (undefined or null) is left out, and so is any other key, so a writer prints exactly the fields it holds.
 * @param {Record<string, unknown>} hashes
 * @returns {string[]}
 */
export function headerLines(hashes) {
  return HASH_FIELDS.filter((field) => hashes[field] !== undefined && hashes[field] !== null).map((field) => `${field}: ${hashes[field]}`);
}

/**
 * The hash fields of a packet header, the reverse of headerLines. Reads only the front matter fenced by `---` lines
 * and only fields in HASH_FIELDS. Text with no fence has no header, so a line in a packet body never counts. Never throws.
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseHeader(text) {
  const normal = toLf(String(text));
  const fenced = /^---\n([\s\S]*?)\n---/.exec(normal);
  if (fenced === null) return {};
  const lines = fenced[1].split('\n');
  const header = {};
  for (const field of HASH_FIELDS) {
    const line = lines.find((row) => row.startsWith(`${field}: `));
    if (line !== undefined) header[field] = line.slice(field.length + 2);
  }
  return header;
}
