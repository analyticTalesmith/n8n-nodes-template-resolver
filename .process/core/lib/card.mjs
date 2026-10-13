/** @typedef {import('../scripts/validate.mjs').Finding} Finding */

import { CONCERNS } from './concerns.mjs';
import { TIERS } from './layout.mjs';
import { TEST_LEVELS } from './levels.mjs';

export const CARD_TYPES = Object.freeze(['task', 'bug', 'security', 'idea', 'improvement', 'decision']);
export const VERIFY_TYPES = Object.freeze(['test', 'tool', 'review', 'manual']);
export const CARD_SCHEMA_VERSION = 1;

/** Pattern every card id must match: four digits, a hyphen, then a kebab-case slug. */
export const CARD_ID = /^\d{4}-[a-z0-9]+(-[a-z0-9]+)*$/;
export const MODULE_NAME = /^(?=.{1,64}$)(?:frontend\/)?[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * @typedef {{ text: string, verify: string, evidence: string | null, status: 'pending' | 'passing' | 'failing', class?: 'goal-critical' | 'polish', level?: string, traces?: string[] }} Criterion
 * @typedef {{
 *   id: string, title: string, type: string, parent: string | null, depends_on: string[], origin?: string | null, tier: string | null,
 *   claimed_in?: string | null, user_visible?: boolean, user_docs?: string[], user_docs_waiver?: string, files_scope: string[], blast_radius?: string[], test_levels?: string[], session_instructions?: string[],
 *   manifest: { add: string[], remove: string[], edit: string[], frozen: boolean },
 *   criteria: Criterion[], gate: string[] | null, claim: { owner: string, heartbeat: string } | null,
 *   blocked_on: string | null, docs_impact: string[] | 'none', started: string | null, ended: string | null,
 *   review_rounds: number, schema_version: number
 * }} Card
 */

/**
 * Builds a fresh card in its initial state. Every call returns new objects and arrays.
 * @param {{ id: string, title: string, type: string }} init
 * @returns {Card}
 */
export function newCard({ id, title, type }) {
  return {
    id,
    title,
    type,
    parent: null,
    depends_on: [],
    origin: null,
    tier: null,
    claimed_in: null,
    files_scope: [],
    manifest: { add: [], remove: [], edit: [], frozen: false },
    criteria: [],
    gate: null,
    claim: null,
    blocked_on: null,
    docs_impact: 'none',
    started: null,
    ended: null,
    review_rounds: 0,
    schema_version: CARD_SCHEMA_VERSION,
  };
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isString = (v) => typeof v === 'string';
const isStringArray = (v) => Array.isArray(v) && v.every(isString);
const isNullableString = (v) => v === null || isString(v);
const unique = (values) => [...new Set(values)].sort();

/** The planned modules; an absent or malformed field means none. */
export function blastRadiusOf(card) {
  return isStringArray(card?.blast_radius) ? unique(card.blast_radius) : [];
}

/** The planned test levels; an absent or malformed field means none. */
export function testLevelsOf(card) {
  return isStringArray(card?.test_levels) ? unique(card.test_levels) : [];
}

/** The user-facing documents the card updates, sorted; an absent or malformed field means none. */
export function userDocsOf(card) {
  return isStringArray(card?.user_docs) ? unique(card.user_docs) : [];
}

/** The dated session instructions on the card; an absent or malformed field means none. */
export function instructionsOf(card) {
  return isStringArray(card?.session_instructions) ? [...card.session_instructions] : [];
}

const validTrace = (trace) => {
  if (!isString(trace) || trace === '' || trace.includes('\\')) return false;
  const parts = trace.split('#');
  if (parts.length > 2 || (parts.length === 2 && parts[1] === '')) return false;
  const path = parts[0];
  return path !== '' && !path.startsWith('/') && !path.includes(':') &&
    !path.split('/').some((part) => part === '' || part === '..' || part === '.');
};

/**
 * Checks an already-parsed card against the card schema. Never throws and never touches the filesystem;
 * unknown extra fields are allowed so older tools keep working on newer cards.
 * @param {unknown} card
 * @returns {Finding[]}
 */
export function validateCard(card) {
  /** @type {Finding[]} */
  const findings = [];
  const missing = (path, expected) =>
    findings.push({
      rule: 'card-field-missing',
      message: `Card field ${path} must be ${expected}. Add or correct it in card.json.`,
      path,
    });

  if (!isObject(card)) {
    missing('card', 'an object');
    return findings;
  }
  const c = /** @type {Record<string, any>} */ (card);

  for (const field of ['id', 'title', 'type']) {
    if (!isString(c[field])) missing(field, 'a string');
  }
  for (const field of ['parent', 'blocked_on']) {
    if (!isNullableString(c[field])) missing(field, 'a string or null');
  }
  if (!(c.gate === null || (isStringArray(c.gate) && c.gate.length > 0 && c.gate.every((part) => part !== '')))) {
    const hint =
      typeof c.gate === 'string'
        ? '; convert a string gate to an argv array such as ["npm","test"]. On Windows the program must be a real executable or `node <script>`, not a .cmd launcher'
        : '';
    missing('gate', `null or an argv array (program, then arguments; no shell)${hint}`);
  }
  for (const field of ['tier', 'origin', 'claimed_in']) {
    if (c[field] !== undefined && !isNullableString(c[field])) missing(field, 'a string or null');
  }
  for (const field of ['depends_on', 'files_scope']) {
    if (!isStringArray(c[field])) missing(field, 'an array of strings');
  }
  for (const field of ['blast_radius', 'test_levels', 'session_instructions']) {
    if (c[field] !== undefined && !isStringArray(c[field])) missing(field, 'an array of strings');
  }
  if (c.user_visible !== undefined && typeof c.user_visible !== 'boolean') missing('user_visible', 'true or false');
  if (c.user_docs !== undefined && !isStringArray(c.user_docs)) missing('user_docs', 'an array of strings');
  if (c.user_docs_waiver !== undefined && !isString(c.user_docs_waiver)) missing('user_docs_waiver', 'a one-line string');
  if (isStringArray(c.blast_radius)) c.blast_radius.forEach((name, i) => {
    if (!MODULE_NAME.test(name)) findings.push({
      rule: 'card-module-name-invalid', path: `blast_radius[${i}]`,
      message: `Module name ${JSON.stringify(name)} must be kebab-case or frontend/<kebab-case>, at most 64 characters. Correct blast_radius in card.json.`,
    });
  });
  if (isStringArray(c.test_levels)) c.test_levels.forEach((level, i) => {
    if (!TEST_LEVELS.includes(level)) findings.push({
      rule: 'card-test-level-unknown', path: `test_levels[${i}]`,
      message: `Unknown test level ${JSON.stringify(level)}. Use one of: ${TEST_LEVELS.join(', ')}.`,
    });
  });
  if (!isObject(c.manifest)) {
    missing('manifest', 'an object with add, remove, edit arrays and a frozen boolean');
  } else {
    for (const field of ['add', 'remove', 'edit']) {
      if (!isStringArray(c.manifest[field])) missing(`manifest.${field}`, 'an array of strings');
    }
    if (typeof c.manifest.frozen !== 'boolean') missing('manifest.frozen', 'a boolean');
  }
  if (!Array.isArray(c.criteria)) missing('criteria', 'an array');
  if (c.claim !== null) {
    if (!isObject(c.claim) || !isString(c.claim.owner) || !isString(c.claim.heartbeat)) {
      missing('claim', 'null or an object with string owner and heartbeat');
    }
  }
  if (!(c.docs_impact === 'none' || isStringArray(c.docs_impact))) {
    missing('docs_impact', 'the string none or an array of strings');
  }
  for (const field of ['started', 'ended']) {
    if (!isNullableString(c[field])) missing(field, 'an ISO 8601 string or null');
  }
  if (!Number.isInteger(c.review_rounds)) missing('review_rounds', 'an integer');
  if (!Number.isInteger(c.schema_version)) missing('schema_version', 'an integer');

  if (isString(c.type) && !CARD_TYPES.includes(c.type)) {
    findings.push({
      rule: 'card-type-unknown',
      message: `Unknown card type "${c.type}". Set type to one of: ${CARD_TYPES.join(', ')}.`,
      path: 'type',
    });
  }
  if (c.concerns !== undefined) {
    if (!isObject(c.concerns)) missing('concerns', 'an object of concern to tier');
    else for (const [concern, value] of Object.entries(c.concerns)) {
      if (!CONCERNS.includes(concern) || !TIERS.includes(value)) findings.push({
        rule: 'card-concern-unknown', path: `concerns.${concern}`,
        message: `Card concern ${JSON.stringify(concern)} set to ${JSON.stringify(value)} is not valid. Use a concern from ${CONCERNS.join(', ')} and a tier from ${TIERS.join(', ')}, or remove it.`,
      });
    }
  }
  if (isString(c.tier) && !TIERS.includes(c.tier)) {
    findings.push({
      rule: 'card-tier-unknown',
      message: `Unknown card tier "${c.tier}". Set tier to one of: ${TIERS.join(', ')}, or remove it.`,
      path: 'tier',
    });
  }
  if (isString(c.id) && !CARD_ID.test(c.id)) {
    findings.push({
      rule: 'card-id-format',
      message: `Card id "${c.id}" must be four digits, a hyphen, then a kebab-case slug, for example 0001-parse-config.`,
      path: 'id',
    });
  }
  if (isString(c.parent) && !CARD_ID.test(c.parent)) {
    findings.push({
      rule: 'card-link-format',
      message: `parent "${c.parent}" is not a card id like 0001-parse-config. Correct it in card.json.`,
      path: 'parent',
    });
  }
  if (isStringArray(c.depends_on)) {
    c.depends_on.forEach((dep, i) => {
      if (!CARD_ID.test(dep)) {
        findings.push({
          rule: 'card-link-format',
          message: `depends_on[${i}] "${dep}" is not a card id like 0001-parse-config. Correct or remove it in card.json.`,
          path: `depends_on[${i}]`,
        });
      }
    });
  }
  if (isString(c.id) && Array.isArray(c.depends_on) && c.depends_on.includes(c.id)) {
    findings.push({
      rule: 'card-depends-self',
      message: `Card ${c.id} lists itself in depends_on. Remove it.`,
      path: 'depends_on',
    });
  }

  if (Array.isArray(c.criteria)) {
    c.criteria.forEach((criterion, i) => {
      const at = `criteria[${i}]`;
      if (!isObject(criterion)) {
        missing(at, 'an object with text, verify, evidence and status');
        return;
      }
      if (!isString(criterion.text)) {
        missing(`${at}.text`, 'a string');
      } else if (criterion.text.trim() === '') {
        findings.push({
          rule: 'criterion-text-empty',
          message: `Criterion ${i} has no text. Describe what must be true for the card to pass.`,
          path: `${at}.text`,
        });
      }
      if (!isString(criterion.verify)) {
        missing(`${at}.verify`, 'a string');
      } else if (!VERIFY_TYPES.includes(criterion.verify)) {
        findings.push({
          rule: 'criterion-verify-unknown',
          message: `Criterion ${i} has unknown verify "${criterion.verify}". Use one of: ${VERIFY_TYPES.join(', ')}.`,
          path: `${at}.verify`,
        });
      }
      if (criterion.level !== undefined && !isString(criterion.level)) missing(`${at}.level`, 'a string');
      else if (isString(criterion.level) && !TEST_LEVELS.includes(criterion.level)) findings.push({
        rule: 'criterion-level-unknown', path: `${at}.level`,
        message: `Criterion ${i} has unknown test level ${JSON.stringify(criterion.level)}. Use one of: ${TEST_LEVELS.join(', ')}.`,
      });
      if (criterion.traces !== undefined && !isStringArray(criterion.traces)) missing(`${at}.traces`, 'an array of strings');
      else if (isStringArray(criterion.traces)) criterion.traces.forEach((trace, j) => {
        if (!validTrace(trace)) findings.push({
          rule: 'criterion-trace-invalid', path: `${at}.traces[${j}]`,
          message: `Criterion ${i} trace ${JSON.stringify(trace)} must be a project-relative path with forward slashes and an optional heading anchor.`,
        });
      });
    });
  }

  if (Number.isInteger(c.schema_version) && c.schema_version !== CARD_SCHEMA_VERSION) {
    findings.push({
      rule: 'card-schema-version',
      message: `Card schema_version ${c.schema_version} is not supported; this tool reads version ${CARD_SCHEMA_VERSION}. Upgrade the tool or migrate the card.`,
      path: 'schema_version',
    });
  }

  /** @type {[string, unknown][]} */
  const timestamps = [
    ['started', c.started],
    ['ended', c.ended],
    ['claim.heartbeat', isObject(c.claim) ? c.claim.heartbeat : null],
  ];
  for (const [path, value] of timestamps) {
    if (isString(value) && !(ISO_TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value)))) {
      findings.push({
        rule: 'card-dates-invalid',
        message: `${path} "${value}" is not an ISO 8601 timestamp such as 2026-10-06T12:00:00.000Z. Correct it.`,
        path,
      });
    }
  }

  return findings;
}
