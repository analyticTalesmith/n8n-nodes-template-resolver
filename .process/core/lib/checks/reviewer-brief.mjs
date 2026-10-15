import { existsSync, readFileSync } from 'node:fs';
import { toLf, toPosix } from '../files.mjs';
import { isAbsolute, relative, resolve } from 'node:path';
import { cardPath, readCard } from '../board.mjs';
import { CARD_FILES, cardFile, isProcessPath } from '../card-files.mjs';
import { CONTRACT_FILES, readContractFile, sectionBody } from '../contract.mjs';
import { DOCS_ROOT, EPHEMERAL_DIR, LIVING_DIR, PROCESS_CORE } from '../layout.mjs';
import { lighterCycleOf } from '../shapes.mjs';
import { readFrontmatter } from '../frontmatter.mjs';
import { FREEZE_FIELDS, SCOPE_PARTS, changedFreezeFields, changedScopeParts, freezeHashes, validateFreeze } from '../freeze.mjs';
import { resolveProjectPath, resolveProjectRoots } from '../project-roots.mjs';
import { scriptCommand } from '../script-command.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {{ projectGoal: string, cycleGoal: string, cardGoal: string, mustNots: string[] }} Objective */

const TEMPLATE = `${PROCESS_CORE}/templates/reviewer-brief.md`;
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
  const rows = toLf(String(briefText)).split('\n');
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

let approvedDesignSource = () => new Set();
let approvalProblemSource = () => null;

/**
 * design-approval.mjs registers how the reason a card's cycle approval cannot be read is found.
 * @param {(projectDir: string, id: string) => string | null} source
 */
export function registerDesignApprovalProblem(source) {
  approvalProblemSource = source;
}

/**
 * design-approval.mjs registers how the approved design paths of a card are found; it cannot be imported here, since it
 * reaches gate.mjs, which reaches this module.
 * @param {(projectDir: string, id: string) => Set<string>} source
 */
export function registerApprovedDesignPaths(source) {
  approvedDesignSource = source;
}

/**
 * Project-relative paths listed under the brief's `## Design context` heading, one per list item.
 * @param {string} briefText
 * @returns {string[]}
 */
export function designContextPaths(briefText) {
  const rows = toLf(String(briefText)).split('\n');
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
 * the ephemeral docs folder (the implementer's rationale) without being listed in the cycle's fresh signed design-approval.md.
 * The packet builder and the shaping check share this rule.
 * @param {string} raw
 * @param {ReadonlySet<string>} [approved] the portable, lower-cased paths of a fresh signed approval
 * @param {string | null} [unreadable] why the approval state could not be read, when it could not
 * @returns {Finding | null}
 */
export function designContextProblem(raw, approved, unreadable = null) {
  const rule = 'reviewer-brief-design-context-forbidden';
  const p = toPosix(raw);
  if (/^\//.test(p) || /^[A-Za-z]:/.test(p) || p.split('/').includes('..')) {
    return { rule, message: `Design context path ${raw} resolves outside the project. List project-relative paths only.`, path: raw };
  }
  const plain = p.replace(/^(\.\/)+/, '');
  // The paths git can cite: no dash start, colon, control character, or empty or dot segment.
  if (plain.startsWith('-') || plain.includes(':') || /[\u0000-\u001f]/.test(plain) || plain.split('/').some((part) => part === '' || part === '.')) {
    return { rule, message: `Design context path ${raw} is not a plain project-relative file path (no colon, no empty or "." segment, no trailing slash, no leading dash). Fix the path in the reviewer brief's Design context list.`, path: raw };
  }
  if (isProcessPath(plain) && !approved?.has(plain.toLowerCase())) {
    return {
      rule,
      message: `Design context path ${raw} lies under ${EPHEMERAL_DIR}/, which holds the implementer's rationale. Design context must be a living doc or source file committed at the base, or a path listed in the cycle's design-approval.md while that approval is signed and fresh.${unreadable === null ? '' : ` The approval could not be read: ${unreadable}`}`,
      path: raw,
    };
  }
  return null;
}

const LIST_BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;
const oneLine = (text) => String(text).replace(/\s+/g, ' ').trim();
const withoutType = (text) => text.replace(/^`[a-z-]+`\s+`[^`]+`\s+(?:[a-z-]+:\s+)?/, '');

/** The project goal a project records in its product vision summary, or the sentence that says it records none. */
function projectGoalOf(roots) {
  try {
    const file = resolveProjectPath(roots, `${LIVING_DIR}/product/vision.md`);
    const summary = readFrontmatter(readFileSync(file, 'utf8'))?.summary;
    if (typeof summary === 'string' && summary.trim() !== '') return oneLine(summary);
  } catch {
    // no vision document: say so below
  }
  return 'not recorded in this project; judge the work against the cycle goal and the card goal';
}

/**
 * The living documents a card.md links to, as project-relative paths: files that exist, outside the process folder.
 * @param {string} cardText
 * @param {string} cardDir absolute folder the links resolve from
 * @param {ReturnType<typeof resolveProjectRoots>} roots
 * @param {string} projectDir
 */
function linkedDocuments(cardText, cardDir, roots, projectDir) {
  const found = [];
  for (const [, raw] of (sectionBody(cardText, 'Context links') ?? '').matchAll(/\]\(([^)\s#?]+)/g)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    const absolute = resolve(cardDir, decodeURI(raw));
    if (!existsSync(absolute)) continue;
    const inDocs = relative(roots.docsRoot, absolute);
    const inCheckout = relative(projectDir, absolute);
    const inside = (rel) => rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
    const path = toPosix(roots.mode === 'local' && inside(inDocs) ? `${DOCS_ROOT}/${inDocs}` : inside(inCheckout) ? inCheckout : '');
    if (path !== '' && designContextProblem(path) === null && !found.includes(path)) found.push(path);
  }
  return found;
}

/**
 * The reviewer brief of a card in a one-card feature, built from card.md and card.json: the objective chain, the
 * criteria as the rubric and the living documents the card links to. It holds nothing the builder wrote about how
 * the work was done. Null when the card is not in a lighter cycle or card.md cannot be read.
 * @param {string} projectDir
 * @param {string} id card id
 * @returns {string | null}
 */
export function generateBrief(projectDir, id) {
  const cycle = lighterCycleOf(projectDir, id);
  const located = cardPath(projectDir, id);
  const contract = readContractFile(projectDir, id, CONTRACT_FILES.card);
  if (cycle === null || located === null || contract?.text == null) return null;
  const card = readCard(projectDir, id);
  const roots = resolveProjectRoots(projectDir);
  const mustNots = (sectionBody(contract.text, 'Must-nots') ?? '').split('\n').flatMap((row) => LIST_BULLET.exec(row)?.[1] ?? []).map((item) => oneLine(withoutType(item))).filter((item) => item !== '');
  return [
    '## Objective',
    '',
    `Project goal: ${projectGoalOf(roots)}`,
    `Cycle goal: ${oneLine(cycle.goal)}`,
    `Card goal: ${oneLine(sectionBody(contract.text, 'Goal and why') ?? '') || card.title}`,
    ...(mustNots.length === 0 ? ['Must not: none'] : ['Must not:', ...mustNots.map((item) => `- ${item}`)]),
    '',
    '## Questions',
    '',
    'goal-critical: does the work meet every criterion in the rubric, and break none of the must-nots?',
    '',
    '## Rubric',
    '',
    ...card.criteria.map((criterion) => `- ${criterion.text} (verify: ${criterion.verify})`),
    '',
    '## Design context',
    '',
    ...linkedDocuments(contract.text, located.dir, roots, projectDir).map((path) => `- ${path}`),
    '',
  ].join('\n');
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
  if (text.trim() === '') text = generateBrief(projectDir, card.id) ?? '';
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
  const approved = approvedDesignSource(projectDir, card.id);
  const unreadable = approvalProblemSource(projectDir, card.id);
  const context = designContextPaths(text).flatMap((path) => designContextProblem(path, approved, unreadable) ?? []);
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
  if (freeze[FREEZE_FIELDS.scope] === undefined) {
    return stale(`The freeze record has no ${FREEZE_FIELDS.scope}, so it predates locking ${SCOPE_PARTS.join(', ')}. Re-run ${command} to freeze the current state.`);
  }
  const current = freezeHashes(card, text);
  const changed = changedFreezeFields(freeze, current).flatMap((name) => (name === 'scope' ? changedScopeParts(freeze, current) : [name]));
  if (changed.length) return stale(`The ${changed.join(', ')} changed after the freeze. Re-run ${command} to freeze the current state.`);
  return [];
}
