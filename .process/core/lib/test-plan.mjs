import { existsSync, readFileSync } from 'node:fs';
import { cardPath } from './board.mjs';
import { testLevelsOf } from './card.mjs';
import { parseRequirementLines, REQUIREMENT_ID } from './checks/typed-criteria.mjs';
import { CycleError, readCycle } from './cycle.mjs';
import { resolveDepth } from './depth.mjs';
import { cyclePaths } from './layout.mjs';
import { TEST_LEVELS } from './levels.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {{ id: string, covers: string[], proves: string }} PlanTest */
/** @typedef {{ level: string, pairsWith: string | null, depth: string | null, approval: string | null, status: string | null, reason: string | null, tests: PlanTest[], criteria: string[] }} PlanSection */
/** @typedef {{ sections: PlanSection[], tests: PlanTest[], findings: Finding[], dataRows: number }} TestPlan */
/** @typedef {{ plan: TestPlan, briefIds: Set<string>, contractIds: string[], selectedLevels: string[], cycleName: string }} CyclePlan */

export const PLAN_FILE = 'test-plan.md';
export const PLAN_STATUSES = Object.freeze(['planned', 'red', 'green', 'waived']);
export const PLAN_APPROVALS = Object.freeze(['human', 'auto']);

const MAX_RANGE = 1000;
const TEST_ID = /^t-[A-Za-z0-9-]+$/;
const COMMENT = /<!--[\s\S]*?-->/g;
const finding = (rule, message) => ({ rule, message });
const unique = (items) => [...new Set(items)];
const unquote = (value) => value.replaceAll('`', '').trim();
const cellsOf = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
const isSeparator = (cells) => cells.every((cell) => /^:?-+:?$/.test(cell));
const capitalised = (word) => word[0].toUpperCase() + word.slice(1);

/** The value after `label:` on the first line that has it, ended where a `endsAt` label starts; null when absent or empty. */
function fieldOf(lines, label, endsAt = []) {
  const stops = endsAt.map((stop) => `${stop}:`).join('|');
  const pattern = new RegExp(`${label}:\\s*(.*?)\\s*(?=${stops === '' ? '$' : `(?:${stops})|$`})`);
  for (const line of lines) {
    const found = pattern.exec(line);
    if (found) return unquote(found[1]) || null;
  }
  return null;
}

const wordOf = (value) => (value === null ? null : (/^[A-Za-z-]+/.exec(value)?.[0] ?? null));

/**
 * The ids a Covers cell names: a comma list, `and`, or `X to Y` over one prefix and a numeric tail, expanded inclusive.
 * @param {string} cell
 * @returns {{ ids: string[], bad: string[] }}
 */
function coveredIds(cell) {
  const ids = [];
  const bad = [];
  const parts = unquote(cell).replace(/\s+and\s+/g, ',').split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) bad.push('(empty)');
  for (const part of parts) {
    const range = /^(\S+)\s+to\s+(\S+)$/.exec(part);
    if (!range) {
      if (REQUIREMENT_ID.test(part)) ids.push(part);
      else bad.push(part);
      continue;
    }
    const from = /^(.*?)(\d+)$/.exec(range[1]);
    const to = /^(.*?)(\d+)$/.exec(range[2]);
    if (!from || !to || from[1] !== to[1] || !REQUIREMENT_ID.test(range[1]) || Number(to[2]) < Number(from[2])) {
      bad.push(part);
      continue;
    }
    if (Number(to[2]) - Number(from[2]) >= MAX_RANGE) {
      bad.push(`${part} (a range may name at most ${MAX_RANGE} ids)`);
      continue;
    }
    for (let n = Number(from[2]); n <= Number(to[2]); n += 1) ids.push(`${from[1]}${String(n).padStart(from[2].length, '0')}`);
  }
  return { ids, bad };
}

/**
 * The tests of every table in a section whose header starts with `header`; a bad Covers cell, a row whose first cell is
 * not a test id and a table with another header are reported against `where`. `rows` counts every table line that is
 * neither a matching header nor a separator, so a plan whose rows do not parse is still known to hold data.
 */
function tablesOf(lines, header, lastColumn, findings, where) {
  /** @type {PlanTest[]} */
  const tests = [];
  let rows = 0;
  let table = 'none';
  for (const line of lines) {
    if (!line.trim().startsWith('|')) {
      table = 'none';
      continue;
    }
    const cells = cellsOf(line);
    if (table === 'none') {
      if (cells[0].toLowerCase().startsWith(header)) table = 'known';
      else {
        table = 'other';
        rows += 1;
        findings.push(finding('test-plan-row-invalid', `${where}: the table header "${line.trim()}" does not start with "${capitalised(header)}". Start the header row with the ${capitalised(header)} column.`));
      }
      continue;
    }
    if (isSeparator(cells) || table === 'other') continue;
    rows += 1;
    const id = unquote(cells[0]);
    if (!TEST_ID.test(id)) {
      findings.push(finding('test-plan-row-invalid', `${where}: the row "${line.trim()}" has no test id. The first cell must be a test id: t- followed by letters, digits and hyphens.`));
      continue;
    }
    const { ids, bad } = coveredIds(cells[1] ?? '');
    for (const part of bad) {
      findings.push(finding('test-plan-covers-invalid', `${where}: test ${id} has a Covers entry "${part}" that is not an id, a comma list or a range such as vf-01 to vf-07. Write ids with one shared prefix.`));
    }
    tests.push({ id, covers: ids, proves: (lastColumn ? cells[cells.length - 1] : cells.slice(2).join(' | ')) ?? '' });
  }
  return { tests, rows };
}

/**
 * Reads a cycle test plan. Never throws; a section that is not a level and has no plan fields is ordinary prose.
 * @param {unknown} text
 * @returns {TestPlan}
 */
export function parseTestPlan(text) {
  /** @type {Finding[]} */
  const findings = [];
  /** @type {PlanSection[]} */
  const sections = [];
  /** @type {PlanTest[]} */
  const judged = [];
  let dataRows = 0;
  const source = typeof text === 'string' ? text.replace(COMMENT, '') : '';
  const blocks = [];
  for (const line of source.split(/\r?\n/)) {
    if (line.startsWith('## ')) blocks.push({ heading: line.slice(3).trim(), lines: [] });
    else if (blocks.length > 0) blocks[blocks.length - 1].lines.push(line);
  }

  for (const { heading, lines } of blocks) {
    const name = heading.toLowerCase();
    if (name.startsWith('judged')) {
      const read = tablesOf(lines, 'check', true, findings, heading);
      judged.push(...read.tests);
      dataRows += read.rows;
      continue;
    }
    const prose = lines.filter((line) => !line.trim().startsWith('|'));
    const pairsWith = fieldOf(prose, 'Pairs with');
    const depth = fieldOf(prose, 'Depth', ['Writer', 'Approval']);
    const approval = wordOf(fieldOf(prose, 'Approval'));
    const status = wordOf(fieldOf(prose, 'Status'));
    const reason = fieldOf(prose, 'Reason', ['Approval']);
    if (!TEST_LEVELS.includes(name)) {
      if ([pairsWith, depth, approval, status].some((value) => value !== null)) {
        findings.push(finding('test-plan-level-unknown', `Section "${heading}" has plan fields but is not a level. Rename it to one of ${TEST_LEVELS.map(capitalised).join(', ')}, or remove the plan fields.`));
      }
      continue;
    }
    const required = [['Pairs with', pairsWith], ['Approval', approval], ['Status', status], ...(status === 'waived' ? [] : [['Depth', depth]])];
    for (const [label] of required.filter(([, value]) => value === null)) {
      findings.push(finding('test-plan-field-missing', `The ${heading} section has no ${label}: line. Add "${label}: ..." under the heading.`));
    }
    if (approval !== null && !PLAN_APPROVALS.includes(approval)) {
      findings.push(finding('test-plan-approval-unknown', `The ${heading} section has the approval "${approval}". Use one of: ${PLAN_APPROVALS.join(', ')}.`));
    }
    if (status !== null && !PLAN_STATUSES.includes(status)) {
      findings.push(finding('test-plan-status-unknown', `The ${heading} section has the status "${status}". Use one of: ${PLAN_STATUSES.join(', ')}.`));
    }
    if (status === 'waived' && reason === null) {
      findings.push(finding('test-plan-waiver-no-reason', `The ${heading} section is waived with no reason. Add a "Reason: ..." line saying why the level does not apply.`));
    }
    if (sections.some((section) => section.level === name)) {
      findings.push(finding('test-plan-section-duplicate', `The ${heading} section appears more than once. Keep one section per level.`));
    }
    const read = tablesOf(lines, 'test', false, findings, heading);
    const tests = read.tests;
    dataRows += read.rows;
    sections.push({ level: name, pairsWith, depth, approval, status, reason, tests, criteria: unique(tests.flatMap((t) => t.covers)) });
  }
  const tests = [...sections.flatMap((section) => section.tests), ...judged];
  return { sections, tests, findings, dataRows };
}

/** The ids a brief defines (every typed requirement line and every story id) and the ids of its contract lines. */
function briefDefinitions(briefText) {
  const typed = parseRequirementLines(briefText).lines;
  const stories = [];
  let inStories = false;
  for (const line of briefText.replace(COMMENT, '').split(/\r?\n/)) {
    if (line.startsWith('## ')) inStories = line.slice(3).trim() === 'Stories';
    else if (inStories) {
      const story = /^\s*[-*]\s+`([^`]+)`/.exec(line);
      if (story) stories.push(story[1]);
    }
  }
  return {
    briefIds: new Set([...typed.map((line) => line.id), ...stories]),
    contractIds: typed.filter((line) => line.type === 'contract').map((line) => line.id),
  };
}

/** The reason a new cycle's plan gives for a level the cycle does not select. */
export const seededReason = (level) => `this cycle does not select the ${level} level.`;

/**
 * True only for the untouched plan createCycle writes: all four level sections once each, every one planned or waived
 * with the reason createCycle seeds, no table row anywhere and nothing the parser reports. Any other plan has been
 * started, even with no rows.
 * @param {TestPlan} plan
 * @returns {boolean}
 */
export function isBlankPlan(plan) {
  return plan.dataRows === 0
    && plan.findings.length === 0
    && plan.sections.length === TEST_LEVELS.length
    && TEST_LEVELS.every((level) => plan.sections.some((section) => section.level === level))
    && plan.sections.every((section) => section.status === 'planned' || (section.status === 'waived' && section.reason === seededReason(section.level)));
}

/**
 * A cycle's plan with what the checks compare it to; null when the cycle has no test-plan.md, or when the file is the
 * untouched blank template, so a cycle that has not started planning is not held to a plan. A plan with no rows that
 * is not the blank template has been started and is always returned, so its gaps are reported.
 * @param {string} projectDir
 * @param {string} cycleName
 * @param {string[]} selectedLevels
 * @returns {CyclePlan | null}
 */
export function readCyclePlan(projectDir, cycleName, selectedLevels) {
  const roots = resolveProjectRoots(projectDir);
  const paths = cyclePaths(cycleName);
  const planFile = resolveProjectPath(roots, `${paths.root}/${PLAN_FILE}`);
  if (!existsSync(planFile)) return null;
  const briefFile = resolveProjectPath(roots, paths.brief);
  const { briefIds, contractIds } = briefDefinitions(existsSync(briefFile) ? readFileSync(briefFile, 'utf8') : '');
  const plan = parseTestPlan(readFileSync(planFile, 'utf8'));
  if (isBlankPlan(plan)) return null;
  return { plan, briefIds, contractIds, selectedLevels: [...selectedLevels], cycleName };
}

/**
 * The levels a cycle selects: its tier's levels plus its chosen verification levels.
 * @param {{ tier: string, verification_levels?: string[] }} cycle
 * @param {{ test_levels: Record<string, string | null> }} tierData
 * @returns {string[]}
 */
export function selectedLevelsOf(cycle, tierData) {
  const { levels } = resolveDepth({ tierData, tier: cycle.tier, source: 'cycle', verificationLevels: cycle.verification_levels ?? [] });
  return TEST_LEVELS.filter((level) => levels[level].selected);
}

/**
 * The blank plan with every level the cycle does not select set to waived and a reason recorded, so a lead writes no
 * waiver for a level the cycle never selected.
 * @param {string} template the blank plan text
 * @param {string[]} selectedLevels
 * @returns {string}
 */
export function seedWaivers(template, selectedLevels) {
  return template.split(/^(?=## )/m).map((section) => {
    const level = TEST_LEVELS.find((name) => section.startsWith(`## ${capitalised(name)}\n`));
    if (level === undefined || selectedLevels.includes(level)) return section;
    return section.replace('Status: planned.', `Status: waived.\nReason: ${seededReason(level)}`);
  }).join('');
}

/**
 * The plan of the card's cycle; null for a card outside a cycle, a cycle with no plan, or a cycle brief that cannot be
 * read (validate reports that on its own).
 * @param {string} projectDir
 * @param {{ id: string }} card
 * @param {{ test_levels: Record<string, string | null> }} tierData
 * @returns {CyclePlan | null}
 */
export function cyclePlanFor(projectDir, card, tierData) {
  const cycleName = cardPath(projectDir, card.id)?.cycle;
  if (cycleName === null || cycleName === undefined) return null;
  let cycle;
  try {
    cycle = readCycle(projectDir, cycleName);
  } catch (cause) {
    if (cause instanceof CycleError) return null;
    throw cause;
  }
  return readCyclePlan(projectDir, cycleName, selectedLevelsOf(cycle, tierData));
}

/**
 * Parser findings, a selected level with no section, a non-waived section with no ids and an id the brief does not define.
 * @param {{ plan: TestPlan, selectedLevels: string[], briefIds: Iterable<string> }} input
 * @returns {Finding[]}
 */
export function planFindings({ plan, selectedLevels, briefIds }) {
  const defined = new Set(briefIds);
  const found = [...plan.findings];
  for (const level of selectedLevels) {
    if (!plan.sections.some((section) => section.level === level)) {
      found.push(finding('test-plan-level-no-section', `The cycle selects the ${level} level, but ${PLAN_FILE} has no ${level} section. Add a "## ${capitalised(level)}" section, or waive it with a reason.`));
    }
  }
  for (const section of plan.sections) {
    // A waiver the template seeded for a level the cycle did not select is not an answer once the cycle selects that level.
    const seeded = section.status === 'waived' && selectedLevels.includes(section.level) && section.reason === seededReason(section.level);
    if ((section.status !== 'waived' || seeded) && section.criteria.length === 0) {
      found.push(finding('test-plan-section-no-criteria', `The ${section.level} section of ${PLAN_FILE} covers no criteria id. Add a test row naming the ids it proves (the ids are the typed lines under ## Must-haves in the cycle brief, CYCLE.md), or set Status: waived with a Reason.`));
    }
  }
  for (const id of unique(plan.tests.flatMap((test) => test.covers))) {
    if (!defined.has(id)) found.push(finding('test-plan-criterion-unknown', `The plan covers ${id}, which the cycle brief (CYCLE.md) does not define. Correct the id, or add a typed line for it under ## Must-haves in CYCLE.md, a line of the form: - contract ${id} what must be true (contract and the id each in backticks).`));
  }
  return found;
}

/**
 * A card test level the plan has no section for.
 * @param {{ card: object, plan: TestPlan }} input
 * @returns {Finding[]}
 */
export function cardLevelFindings({ card, plan }) {
  return testLevelsOf(card)
    .filter((level) => !plan.sections.some((section) => section.level === level))
    .map((level) => finding('test-plan-card-level-no-section', `The card plans ${level} tests, but ${PLAN_FILE} has no ${level} section. Add the section to the cycle plan.`));
}

/**
 * A missing plan when the brief has a contract id, and each contract id no test covers.
 * @param {{ plan: TestPlan | null, contractIds: string[] }} input
 * @returns {Finding[]}
 */
export function contractCoverageFindings({ plan, contractIds }) {
  if (contractIds.length === 0) return [];
  if (plan === null) {
    return [finding('test-plan-missing', `The brief has contract lines (${contractIds.join(', ')}) but the cycle has no ${PLAN_FILE} that names a test. Fill the plan in the cycle folder (copy core/templates/${PLAN_FILE} if it is missing) and name a test for each.`)];
  }
  const covered = new Set(plan.tests.flatMap((test) => test.covers));
  return contractIds.filter((id) => !covered.has(id))
    .map((id) => finding('test-plan-contract-untested', `Contract line ${id} has no test id in ${PLAN_FILE}. Add a test row that covers ${id}.`));
}
