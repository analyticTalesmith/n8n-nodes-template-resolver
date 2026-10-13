import { readFileSync } from 'node:fs';
import { CARD_FILES, cardFile, isProcessPath } from '../card-files.mjs';
import { SCOPE_PARTS, changedFreezeFields, changedScopeParts, freezeHashes, validateFreeze } from '../freeze.mjs';
import { scriptCommand } from '../script-command.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {{ projectGoal: string, cycleGoal: string, cardGoal: string, mustNots: string[] }} Objective */

const TEMPLATE = '.process/core/templates/reviewer-brief.md';
const GOALS = Object.freeze([
  { label: 'Project goal', key: 'projectGoal' },
  { label: 'Cycle goal', key: 'cycleGoal' },
  { label: 'Card goal', key: 'cardGoal' },
]);
const LEVEL_ONE_OR_TWO = /^#{1,2}(?!#)\s/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(\S.*)$/;

/**
 * Reads the objective chain from a reviewer brief: the first level-2 heading must be `## Objective` and hold
 * non-empty `Project goal:`, `Cycle goal:` and `Card goal:` lines and a `Must not:` line with list items
 * (or `Must not: none`). `missing` names every part that is absent or empty; `objective` is null unless none is.
 * @param {string} briefText
 * @returns {{ objective: Objective | null, missing: string[] }}
 */
export function parseObjective(briefText) {
  const rows = String(briefText).replaceAll('\r\n', '\n').split('\n');
  const first = rows.findIndex((row) => /^##(?!#)\s/.test(row));
  const names = [...GOALS.map((goal) => goal.label), 'Must not'];
  if (first === -1 || !/^##\s+objective\s*$/i.test(rows[first])) return { objective: null, missing: names };
  const end = rows.findIndex((row, index) => index > first && LEVEL_ONE_OR_TWO.test(row));
  const body = rows.slice(first + 1, end === -1 ? rows.length : end);

  /** @type {Record<string, string>} */
  const goals = {};
  let mustNot = null;
  let collecting = false;
  for (const row of body) {
    const item = LIST_ITEM.exec(row);
    if (collecting && item) {
      mustNot.items.push(item[1].trim());
      continue;
    }
    if (row.trim() === '') continue;
    collecting = false;
    const goal = GOALS.find(({ label }) => row.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    if (goal) {
      goals[goal.key] ??= row.slice(goal.label.length + 1).trim();
    } else if (/^must not:/i.test(row) && mustNot === null) {
      mustNot = { inline: row.slice('must not:'.length).trim(), items: [] };
      collecting = true;
    }
  }
  const missing = GOALS.filter(({ key }) => !goals[key]).map(({ label }) => label);
  const none = mustNot !== null && /^none\.?$/i.test(mustNot.inline);
  if (mustNot === null || (!none && mustNot.items.length === 0)) missing.push('Must not');
  if (missing.length) return { objective: null, missing };
  return {
    objective: { projectGoal: goals.projectGoal, cycleGoal: goals.cycleGoal, cardGoal: goals.cardGoal, mustNots: none ? [] : mustNot.items },
    missing,
  };
}

/**
 * Project-relative paths listed under the brief's `## Design context` heading, one per list item.
 * @param {string} briefText
 * @returns {string[]}
 */
export function designContextPaths(briefText) {
  const rows = String(briefText).replaceAll('\r\n', '\n').split('\n');
  const start = rows.findIndex((row) => /^##\s+design context\s*$/i.test(row));
  if (start === -1) return [];
  const paths = [];
  for (const row of rows.slice(start + 1)) {
    if (LEVEL_ONE_OR_TWO.test(row)) break;
    const item = LIST_ITEM.exec(row);
    if (item === null) continue;
    const path = item[1].trim().replace(/^`+|`+$/g, '').trim();
    if (path !== '') paths.push(path);
  }
  return paths;
}

/**
 * Why a design context path may not reach the reviewer: it resolves outside the project, or lies under
 * docs/ephemeral/ (the implementer's rationale). The packet builder and the shaping check share this rule.
 * @param {string} raw
 * @returns {Finding | null}
 */
export function designContextProblem(raw) {
  const rule = 'reviewer-brief-design-context-forbidden';
  const p = raw.replaceAll('\\', '/');
  if (/^\//.test(p) || /^[A-Za-z]:/.test(p) || p.split('/').includes('..')) {
    return { rule, message: `Design context path ${raw} resolves outside the project. List project-relative paths only.`, path: raw };
  }
  const plain = p.replace(/^(\.\/)+/, '');
  // The paths git can cite: no dash start, colon, control character, or empty or dot segment.
  if (plain.startsWith('-') || plain.includes(':') || /[\u0000-\u001f]/.test(plain) || plain.split('/').some((part) => part === '' || part === '.')) {
    return { rule, message: `Design context path ${raw} is not a plain project-relative file path (no colon, no empty or "." segment, no trailing slash, no leading dash). Fix the path in the reviewer brief's Design context list.`, path: raw };
  }
  if (isProcessPath(plain)) {
    return {
      rule,
      message: `Design context path ${raw} lies under docs/ephemeral/, which holds the implementer's rationale. Design context must be a living doc or source file committed at the base.`,
      path: raw,
    };
  }
  return null;
}

/**
 * Checks the reviewer brief exists and that the card's freeze record matches the brief, manifest, criteria and scope.
 * Only an unreadable brief throws.
 * @param {{ projectDir: string, card: Card }} input
 * @returns {Finding[]}
 */
export function checkReviewerBrief({ projectDir, card }) {
  const file = cardFile(projectDir, card.id, CARD_FILES.reviewerBrief);
  let text = '';
  if (file !== null) {
    try {
      text = readFileSync(file, 'utf8');
    } catch (cause) {
      if (cause.code !== 'ENOENT') {
        throw new Error(`Cannot read the reviewer brief at ${file} (${cause.message}). Repair or replace it.`, { cause });
      }
    }
  }
  if (text.trim() === '') {
    return [
      {
        rule: 'reviewer-brief-missing',
        message: `The reviewer brief is missing or empty. Write ${CARD_FILES.reviewerBrief} in the card folder, then freeze it.`,
        path: CARD_FILES.reviewerBrief,
      },
    ];
  }

  const { missing } = parseObjective(text);
  /** @type {Finding[]} */
  const objective = missing.length
    ? [
        {
          rule: 'reviewer-brief-objective-missing',
          message: `The reviewer brief has no complete objective chain: missing ${missing.join(', ')}. Start the brief with an "## Objective" section holding the project, cycle and card goals and the must-nots; copy ${TEMPLATE} (in the Aperture checkout: core/templates/reviewer-brief.md).`,
          path: CARD_FILES.reviewerBrief,
        },
      ]
    : [];
  const context = designContextPaths(text).flatMap((path) => designContextProblem(path) ?? []);
  return [...objective, ...context, ...freezeFindings(card, text, projectDir)];
}

/**
 * @param {Card} card
 * @param {string} text
 * @returns {Finding[]}
 */
function freezeFindings(card, text, projectDir) {
  const freeze = /** @type {any} */ (card).freeze;
  const command = `${scriptCommand(projectDir, 'freeze.mjs')} <projectDir> ${card.id}`;
  if (freeze === undefined) {
    return [
      {
        rule: 'reviewer-brief-not-frozen',
        message: `The reviewer brief is not frozen. Run ${command}.`,
        path: 'freeze',
      },
    ];
  }
  const invalid = validateFreeze(freeze, projectDir);
  if (invalid.length) return invalid;

  const stale = (message) => [{ rule: 'freeze-stale', message, path: 'freeze' }];
  if (freeze.scope_sha256 === undefined) {
    return stale(`The freeze record has no scope_sha256, so it predates locking ${SCOPE_PARTS.join(', ')}. Re-run ${command} to freeze the current state.`);
  }
  const current = freezeHashes(card, text);
  const changed = changedFreezeFields(freeze, current).flatMap((name) => (name === 'scope' ? changedScopeParts(freeze, current) : [name]));
  if (changed.length) return stale(`The ${changed.join(', ')} changed after the freeze. Re-run ${command} to freeze the current state.`);
  return [];
}
