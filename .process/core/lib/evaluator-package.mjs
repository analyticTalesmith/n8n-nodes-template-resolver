import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { BoardError, cardPath, isCardId, listCards, readCard } from './board.mjs';
import { CARD_FILES, WORK_ROOT, cardFile, workFile } from './card-files.mjs';
import { CONTRACT_FILES, parseBlastRadius, parseScope, sectionBody, stripComments } from './contract.mjs';
import { CycleError, readCycle } from './cycle.mjs';
import { freezeHashes, validateFreeze } from './freeze.mjs';
import { effectiveBase, fileAtCommit, headCommit, runGit } from './git.mjs';
import { cyclePaths, isCycleName } from './layout.mjs';
import {
  PACKET_MAX_BYTES, contractAtBase, contractBlocks, fenced, frozenTestsSection, readBriefText, readDesignContexts, secretFindings,
} from './packet-parts.mjs';
import { parseObjective } from './checks/reviewer-brief.mjs';
import { parseRequirementLines } from './checks/typed-criteria.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { PLAN_FILE, parseTestPlan } from './test-plan.mjs';
import { effectiveTier } from './tier.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/**
 * @typedef {{
 *   path: string, text: string, sha256: string, scope: 'card' | 'cycle', tier: string, base: string | null,
 *   stageBytes: Record<string, number>, criterionIds: string[], requirementIds: string[],
 *   frozenTests: { shown: string[], truncated: string[], missing: string[], notShown: string[] }
 * }} PackageResult
 */

/** The file a card's package is written to is CARD_FILES.evaluatorPackage; a cycle's is under its verification folder. */
export const CYCLE_PACKAGE_FILE = 'evaluator-package.md';

/** What an evaluator never receives, said in the package itself so a reader knows the absence is deliberate. */
export const LEFT_OUT = "the implementer's session: its report, notes, working memory, reasons, review record and review rounds, and the diff. A deviation from what is written here is a finding; an explanation you were not shown does not change it.";

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

export class PackageError extends Error {
  /** @param {string} rule @param {Finding[]} findings */
  constructor(rule, findings) {
    super(findings.map((f) => `${f.rule}: ${f.message}`).join('\n'));
    this.name = 'PackageError';
    this.rule = rule;
    this.findings = findings;
  }
}

const refuse = (rule, message, path) => new PackageError(rule, [{ rule, message, ...(path === undefined ? {} : { path }) }]);

const FRONT_WORDING = "Judge the work against them. A change to one of them is a deviation from the plan, so report it.";

const REPORT = `## Report

Report each criterion and requirement id above in one of four states, each with its evidence:

- \`proven\`: the check ran and passed. Give the command and what it showed.
- \`failed\`: the check ran and did not pass. Give the command, expected and actual.
- \`could-not-run\`: the check could not be run. Say why.
- \`not-checked\`: you chose not to or had no way to check it. Say why.

Tag each piece of evidence with a tier: \`deterministic\` (a command or test with a fixed result), \`agent-observed\` (an agent watched the running system), \`llm-judged\` (a model scored it against a rubric) or \`human-confirmed\` (a named person confirmed it). Verification (the work conforms to the documents above) and validation (the work meets the real need) get separate verdicts. Never turn an unchecked item into a pass.`;

const section = (key, number, text) => ({ key, number, text });

/** The body of a card.md section as one block, or a plain line saying it is empty. */
function cardSection(cardText, name, empty) {
  const body = cardText === null ? null : sectionBody(cardText, name);
  return `### ${name}\n\n${body === null || body === '' ? empty : body}`;
}

/** The ids a card's typed Must-haves carry, with their type and kind, as list lines. */
function requirementLines(cardText) {
  const lines = cardText === null ? [] : parseRequirementLines(cardText).lines;
  return { ids: lines.map((line) => line.id), rows: lines.map((line) => `- \`${line.id}\` (${line.type}${line.kind === null ? '' : `, ${line.kind}`}): ${line.text}`) };
}

/** One line per criterion that names a level or traces, to follow the shared criteria list. */
function criterionDetails(card) {
  return card.criteria.flatMap((c, i) => {
    const parts = [c.id ? `id ${c.id}` : null, c.level ? `level ${c.level}` : null, Array.isArray(c.traces) && c.traces.length ? `traces ${c.traces.join(', ')}` : null].filter(Boolean);
    return parts.length ? [`- c${i + 1}: ${parts.join('; ')}`] : [];
  });
}

/** The cycle's test plan with template guidance removed, or null when the cycle has none. */
function cyclePlanText(projectDir, cycleName) {
  const file = resolveProjectPath(resolveProjectRoots(projectDir), `${cyclePaths(cycleName).root}/${PLAN_FILE}`);
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, 'utf8');
  return parseTestPlan(raw).dataRows === 0 ? null : stripComments(raw).replace(/\n{3,}/g, '\n\n').trim();
}

const planBlock = (text, selected) =>
  text === null
    ? 'No cycle test plan was written for this cycle.'
    : `The cycle's test plan, one section per level with its status and the tests that cover each requirement id.${selected.length ? ` Levels this scope plans: ${selected.join(', ')}.` : ''}\n\n${fenced(text)}`;

/** Writes the sections after the secret and size checks; returns the result fields shared by both scopes. */
function finish({ file, sections, now, base, scope, tier, extra }) {
  const secrets = secretFindings(sections, { file, noun: 'package', sources: 'a design context doc, the spec, the brief, the card or the test plan' });
  if (secrets.length) throw new PackageError('package-secret', secrets);
  const text = `${sections.map((s) => s.text).join('\n\n')}\n`;
  const stageBytes = Object.fromEntries(sections.map(({ key, text: t }) => [key, Buffer.byteLength(t, 'utf8')]));
  if (Buffer.byteLength(text, 'utf8') > PACKET_MAX_BYTES) {
    const sizes = Object.entries(stageBytes).map(([key, bytes]) => `${key} ${bytes}`).join(', ');
    throw refuse('package-too-large', `The package is ${Buffer.byteLength(text, 'utf8')} bytes, over the ${PACKET_MAX_BYTES} limit an evaluator reads whole. Section sizes in bytes: ${sizes}. Trim the design context list, split the card, or narrow the cycle; nothing was written.`, file);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return { path: file, text, sha256: sha256(text), scope, tier, base, stageBytes, ...extra };
}

/**
 * Builds the bare package an evaluator receives for one card or one cycle and writes it: what was meant to change and
 * why, what was not allowed, the expected files, the requirement and criterion ids, the test plan, the frozen tests and
 * the warnings from planning. It never holds the implementer's session or its reasons, and no diff. Written only after
 * every refusal check passed.
 * @param {string} projectDir
 * @param {{ card: string } | { cycle: string }} target
 * @param {{ now?: Date, base?: string, run?: import('./git.mjs').GitRunner }} [options]
 * @returns {PackageResult}
 */
export function buildEvaluatorPackage(projectDir, target, options = {}) {
  if ('card' in target) return buildCardPackage(projectDir, target.card, options);
  return buildCyclePackage(projectDir, target.cycle, options);
}

function buildCardPackage(projectDir, id, { now = new Date(), base, run = runGit } = {}) {
  if (!isCardId(id)) throw new BoardError(`"${id}" is not a card id (like 0001-some-title). Check the id with the board listing.`);
  const roots = resolveProjectRoots(projectDir);
  const card = readCard(projectDir, id);
  const located = cardPath(projectDir, id);
  const recorded = /** @type {any} */ (card).base_commit;
  const given = base ?? recorded;
  if (typeof given !== 'string' || given === '') {
    throw refuse('package-no-base', `Card ${id} has no base commit, so its frozen tests cannot be read as they stood before the work. Claim the card, or pass --base <ref>.`);
  }
  const baseSha = run(projectDir, ['rev-parse', '--verify', `${effectiveBase(projectDir, given, run)}^{commit}`]).trim();
  const { tier } = effectiveTier(projectDir, card);

  const briefText = readBriefText(projectDir, id);
  const { objective, missing } = parseObjective(briefText);
  if (objective === null) {
    throw refuse('package-objective-missing', `The reviewer brief has no complete objective chain: missing ${missing.join(', ')}. Finish its "## Objective" section, then build the package again.`, CARD_FILES.reviewerBrief);
  }
  const record = /** @type {any} */ (card).freeze;
  const frozen = record !== undefined && validateFreeze(record).length === 0;
  const hashes = freezeHashes(card, briefText);

  const cardText = contractAtBase({ projectDir, roots, id, cycle: located.cycle, name: CONTRACT_FILES.card, baseSha, run });
  const specPath = `${WORK_ROOT}/${id}/${CARD_FILES.spec}`;
  const specText = roots.mode === 'local' ? (existsSync(workFile(projectDir, id, CARD_FILES.spec)) ? readFileSync(workFile(projectDir, id, CARD_FILES.spec), 'utf8') : null) : fileAtCommit(projectDir, baseSha, specPath, run);
  const { contexts, problems } = readDesignContexts({ projectDir, roots, briefText, baseSha, run });
  if (problems.length) throw new PackageError(problems[0].rule, problems);

  const blocks = contractBlocks(card, objective);
  const requirements = requirementLines(cardText);
  const scope = cardText === null ? { writes: [] } : parseScope(cardText);
  const blast = cardText === null ? [] : parseBlastRadius(cardText).modules;
  const planText = located.cycle === null ? null : cyclePlanText(projectDir, located.cycle);
  const cycleText = located.cycle === null ? '' : safeCycleText(projectDir, located.cycle);
  const wontHaves = sectionBody(cycleText, "Won't-haves");
  const frozenTests = frozenTestsSection(projectDir, card, baseSha, run, FRONT_WORDING);
  const levels = /** @type {any} */ (card).test_levels ?? [];
  const docsImpact = Array.isArray(card.docs_impact) ? card.docs_impact : [];
  const file = cardFile(projectDir, id, CARD_FILES.evaluatorPackage);

  const frontmatter = [
    '---',
    'type: evaluator-package',
    'scope: card',
    `card: ${id}`,
    `tier: ${tier}`,
    `built_at: ${now.toISOString()}`,
    `base: ${baseSha}`,
    `head: ${headCommit(projectDir, { short: false, run })}`,
    `frozen: ${frozen}`,
    `brief_sha256: ${hashes.brief_sha256}`,
    `manifest_sha256: ${hashes.manifest_sha256}`,
    `criteria_sha256: ${hashes.criteria_sha256}`,
    `scope_sha256: ${hashes.scope_sha256}`,
    `criteria_count: ${card.criteria.length}`,
    '---',
  ].join('\n');

  const sections = [
    section('header', null, [frontmatter, `# Evaluator package: ${id}`, `Read the sections in order. This package holds what the work was meant to do and what it must not do. It leaves out ${LEFT_OUT}`].join('\n\n')),
    section('goal', 1, ['## 1. What was meant to change and why', blocks.objective, cardSection(cardText, 'Goal and why', 'The card states no goal beyond the objective above.')].join('\n\n')),
    section('anti-goals', 2, [
      '## 2. What was not allowed',
      blocks.mustNots,
      cardSection(cardText, 'Must-nots', 'The card lists no must-nots of its own.'),
      ...(wontHaves ? [`### Cycle won't-haves\n\n${wontHaves}`] : []),
      `### Forbidden files\n\nEvery path not listed in section 3 is read-only for this work, and so is every frozen test below. A change to one of them is a deviation, whatever its reason.`,
    ].join('\n\n')),
    section('expected-files', 3, [
      '## 3. Expected files',
      blocks.manifest,
      `### Permissions (card.md scope)\n\n${scope.writes.length ? scope.writes.map((w) => `- \`${w.path}\`: ${w.kind}`).join('\n') : 'No write rows are listed.'}`,
      `### Documents that may change\n\n${docsImpact.length ? docsImpact.map((d) => `- \`${d}\``).join('\n') : 'none'}`,
      `### Blast radius (modules the change may reach)\n\n${blast.length ? blast.map((m) => `- ${m}`).join('\n') : 'none'}`,
    ].join('\n\n')),
    section('ids', 4, [
      '## 4. Requirement and criterion ids',
      blocks.criteria,
      ...(criterionDetails(card).length ? [`### Levels and traces\n\n${criterionDetails(card).join('\n')}`] : []),
      `### Requirement lines in the card's Must-haves\n\n${requirements.rows.length ? requirements.rows.join('\n') : 'The card has no typed requirement lines.'}`,
      `Planned test levels: ${levels.length ? levels.join(', ') : 'none'}.`,
    ].join('\n\n')),
    section('test-plan', 5, ['## 5. Test plan', planBlock(planText, levels)].join('\n\n')),
    section('planning', 6, [
      '## 6. Warnings from planning',
      cardSection(cardText, 'Interface contract', 'The card states no interface contract.'),
      `### Planning brief\n\nWritten before the work began.\n\n${fenced(briefText)}`,
      specText === null ? 'No spec.md for this card.' : `### spec.md\n\n${fenced(specText)}`,
      ...(contexts.length ? contexts.map(({ path, text }) => `### Design context: ${path}\n\n${fenced(text)}`) : ['No design context was listed in the reviewer brief.']),
    ].join('\n\n')),
    ...(frozenTests.text === null ? [] : [section('frozen-tests', null, frozenTests.text)]),
    section('report', null, REPORT),
  ];

  const { text: _unused, ...frozenResult } = frozenTests;
  return finish({
    file, sections, now, base: baseSha, scope: 'card', tier,
    extra: { criterionIds: card.criteria.map((_, i) => `c${i + 1}`), requirementIds: requirements.ids, frozenTests: frozenResult },
  });
}

/** The cycle brief text, or '' when it cannot be read (the cycle error is raised where the brief is required). */
function safeCycleText(projectDir, name) {
  try {
    return readFileSync(resolveProjectPath(resolveProjectRoots(projectDir), cyclePaths(name).brief), 'utf8').replaceAll('\r\n', '\n');
  } catch {
    return '';
  }
}

function buildCyclePackage(projectDir, name, { now = new Date(), run = runGit } = {}) {
  if (!isCycleName(name)) throw new BoardError(`"${name}" is not a cycle name. Check it with the cycle listing.`);
  let cycle;
  try {
    cycle = readCycle(projectDir, name);
  } catch (err) {
    if (err instanceof CycleError) throw refuse('package-cycle-unreadable', err.message);
    throw err;
  }
  const text = safeCycleText(projectDir, name);
  const body = (heading) => {
    const found = sectionBody(text, heading);
    return found === null || found === '' ? null : found;
  };
  const typed = parseRequirementLines(text).lines;
  const planText = cyclePlanText(projectDir, name);
  const cards = listCards(projectDir).filter((entry) => entry.cycle === name).map((entry) => entry.card);
  const roots = resolveProjectRoots(projectDir);

  const frozenParts = [];
  const frozenResult = { shown: [], truncated: [], missing: [], notShown: [] };
  for (const card of cards) {
    const recorded = /** @type {any} */ (card).base_commit;
    if (typeof recorded !== 'string' || recorded === '') continue;
    let baseSha;
    try {
      baseSha = run(projectDir, ['rev-parse', '--verify', `${effectiveBase(projectDir, recorded, run)}^{commit}`]).trim();
    } catch {
      continue;
    }
    const planned = frozenTestsSection(projectDir, card, baseSha, run, FRONT_WORDING);
    if (planned.text === null) continue;
    frozenParts.push(`### Card ${card.id}\n\n${planned.text.replace(/^## /, '#### ')}`);
    for (const key of Object.keys(frozenResult)) frozenResult[key].push(...planned[key]);
  }
  const cardRows = cards.map((card) => {
    const m = card.manifest;
    const files = [...m.add.map((p) => `add \`${p}\``), ...m.edit.map((p) => `edit \`${p}\``), ...m.remove.map((p) => `remove \`${p}\``)];
    return `### ${card.id}\n\n${card.title}\n\n- Criteria: ${card.criteria.length ? card.criteria.map((c, i) => `c${i + 1} (${c.verify}) ${c.text}`).join('; ') : 'none'}\n- Expected files: ${files.length ? files.join(', ') : 'none'}`;
  });
  const hash = sha256(text);
  const file = resolveProjectPath(roots, `${cyclePaths(name).verification}/${CYCLE_PACKAGE_FILE}`);
  const frontmatter = [
    '---',
    'type: evaluator-package',
    'scope: cycle',
    `cycle: ${name}`,
    `tier: ${cycle.tier}`,
    `built_at: ${now.toISOString()}`,
    `head: ${headCommit(projectDir, { short: false, run })}`,
    `brief_sha256: ${hash}`,
    `cards: ${cards.length}`,
    '---',
  ].join('\n');

  const sections = [
    section('header', null, [frontmatter, `# Evaluator package: cycle ${name}`, `Read the sections in order. This package holds what the cycle was meant to do and what it must not do. It leaves out ${LEFT_OUT}`].join('\n\n')),
    section('goal', 1, ['## 1. What was meant to change and why', `Cycle goal: ${cycle.goal}\nTier: ${cycle.tier}. Stage: ${cycle.stage}.`, ...['Who and why', 'Stories', 'Exit'].filter(body).map((h) => `### ${h}\n\n${body(h)}`)].join('\n\n')),
    section('anti-goals', 2, ['## 2. What was not allowed', `### Won't-haves\n\n${body("Won't-haves") ?? 'The cycle lists none.'}`, '### Forbidden files\n\nFor each card, every path not listed in its expected files is read-only, and so is every frozen test below.'].join('\n\n')),
    section('expected-files', 3, ['## 3. Expected files, by card', ...(cardRows.length ? cardRows : ['The cycle has no cards.'])].join('\n\n')),
    section('ids', 4, ['## 4. Requirement and criterion ids', `### Cycle must-haves\n\n${typed.length ? typed.map((line) => `- \`${line.id}\` (${line.type}${line.kind === null ? '' : `, ${line.kind}`}): ${line.text}`).join('\n') : 'The cycle brief has no typed requirement lines.'}`, `Selected verification levels: ${cycle.verification_levels?.length ? cycle.verification_levels.join(', ') : 'none'}. Review sweeps: ${cycle.review_sweeps?.length ? cycle.review_sweeps.join(', ') : 'none'}.`].join('\n\n')),
    section('test-plan', 5, ['## 5. Test plan', planBlock(planText, cycle.verification_levels ?? [])].join('\n\n')),
    section('planning', 6, ['## 6. Warnings from planning', `### Areas touched\n\n${body('Areas touched') ?? 'The cycle lists none.'}`].join('\n\n')),
    ...(frozenParts.length ? [section('frozen-tests', null, ['## Frozen tests (read-only)', ...frozenParts].join('\n\n'))] : []),
    section('report', null, REPORT),
  ];
  return finish({
    file, sections, now, base: null, scope: 'cycle', tier: cycle.tier,
    extra: { criterionIds: [], requirementIds: typed.map((line) => line.id), frozenTests: frozenResult },
  });
}
