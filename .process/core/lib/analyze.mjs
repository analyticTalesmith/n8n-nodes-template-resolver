import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { posix } from 'node:path';
import { blastRadiusOf, MODULE_NAME } from './card.mjs';
import { checkTestLevels } from './checks/test-levels.mjs';
import { parseRequirementLines } from './checks/typed-criteria.mjs';
import { proseOnly } from './contract.mjs';
import { CycleError, readCycle, validateCycle } from './cycle.mjs';
import { listDeltas } from './delta.mjs';
import { readFrontmatter } from './frontmatter.mjs';
import { readTierData } from './gate.mjs';
import { findCycle } from './graph.mjs';
import { COLUMNS, cyclePaths } from './layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { cardLevelFindings, contractCoverageFindings, planFindings, readCyclePlan, selectedLevelsOf } from './test-plan.mjs';

const LINK = /\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const finding = (rule, message, path) => ({ rule, message, path });
const section = (text, heading) => new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm').exec(text)?.[1] ?? '';

/** A Markdown link resolved from its document into a logical project docs path. */
function linkedDocs(text, from) {
  const out = [];
  for (const [, raw] of proseOnly(text).matchAll(LINK)) {
    if (raw.startsWith('#') || raw.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    let target;
    try { target = decodeURI(raw.split('#', 1)[0].split('?', 1)[0]); } catch { continue; }
    const path = posix.normalize(posix.join(posix.dirname(from), target));
    if (path.startsWith('docs/') && !path.includes('\\') && path.endsWith('.md')) out.push(path);
  }
  return out;
}

/** Read only card folders in this cycle, in column and card order. */
function cycleCards(roots, name) {
  const cards = [];
  for (const column of COLUMNS) {
    const parent = `${cyclePaths(name).kanban}/${column}`;
    const folder = resolveProjectPath(roots, parent);
    for (const entry of readdirSync(folder, { withFileTypes: true }).filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const logical = `${parent}/${entry.name}`;
      const cardFile = resolveProjectPath(roots, `${logical}/card.json`);
      if (!existsSync(cardFile)) continue;
      const card = JSON.parse(readFileSync(cardFile, 'utf8'));
      const links = new Set();
      for (const file of ['card.md', 'context.md']) {
        const path = `${logical}/${file}`;
        const absolute = resolveProjectPath(roots, path);
        if (existsSync(absolute)) for (const linked of linkedDocs(readFileSync(absolute, 'utf8'), path)) links.add(linked);
      }
      cards.push({ card, links });
    }
  }
  return cards;
}

/** The valid cycle plus selection findings, so an unknown selected depth is reported by analyze. */
function cycleWithSelections(projectDir, name, roots) {
  try { return { cycle: readCycle(projectDir, name), findings: [] }; }
  catch (error) {
    if (!(error instanceof CycleError) || !/cycle-(verification-level|review-sweep)-unknown/.test(error.message)) throw error;
    const brief = resolveProjectPath(roots, cyclePaths(name).brief);
    const data = readFrontmatter(readFileSync(brief, 'utf8'));
    const issues = validateCycle(data);
    if (issues.some((issue) => !['cycle-verification-level-unknown', 'cycle-review-sweep-unknown'].includes(issue.rule))) throw error;
    return { cycle: { ...data, verification_levels: Array.isArray(data.verification_levels) ? data.verification_levels : [], review_sweeps: Array.isArray(data.review_sweeps) ? data.review_sweeps : [] }, findings: issues.map((issue) => finding('analyze-test-levels', issue.message, cyclePaths(name).brief)) };
  }
}

/** Deterministic, read-only cross-artifact audit of one cycle's plan. */
export function analyzeCycle(projectDir, name) {
  const roots = resolveProjectRoots(projectDir);
  const { cycle, findings } = cycleWithSelections(projectDir, name, roots);
  const paths = cyclePaths(name);
  const brief = readFileSync(resolveProjectPath(roots, paths.brief), 'utf8');
  const stories = [...new Set(linkedDocs(section(brief, 'Stories'), paths.brief))];
  const must = [...new Set(linkedDocs(section(brief, 'Must-haves'), paths.brief))];
  const cards = cycleCards(roots, name);
  if (!cards.length) findings.push(finding('analyze-no-cards', `Cycle ${name} has no cards. Add cards before approving the design.`, paths.kanban));

  for (const story of stories) {
    if (!cards.some(({ card, links }) => links.has(story) || card.criteria?.some((criterion) => criterion.traces?.some((trace) => trace.split('#')[0] === story)))) {
      findings.push(finding('analyze-story-unlinked', `Story ${story} has no card link. Link it from card.md or context.md, or trace it from a criterion.`, story));
    }
  }
  for (const doc of must) {
    if (!cards.some(({ card }) => card.criteria?.some((criterion) => criterion.traces?.some((trace) => trace.split('#')[0] === doc)))) {
      findings.push(finding('analyze-must-untraced', `Must-have document ${doc} has no criterion trace. Add a criterion traces entry.`, doc));
    }
  }

  const ids = new Set(cards.map(({ card }) => card.id));
  for (const { card } of cards) for (const dep of card.depends_on ?? []) {
    if (!ids.has(dep)) findings.push(finding('analyze-depends-missing', `Card ${card.id} depends on missing card ${dep} in cycle ${name}.`, card.id));
  }
  const loop = findCycle(cards.map(({ card }) => ({ id: card.id, depends_on: card.depends_on ?? [] })));
  if (loop) findings.push(finding('analyze-depends-loop', `Cards form a dependency loop: ${[...loop, loop[0]].join(' -> ')}.`, paths.kanban));

  const adds = new Set(listDeltas(projectDir, name).filter((delta) => delta.op === 'add' && delta.status === 'open').map((delta) => delta.target));
  const traced = cards.flatMap(({ card }) => (card.criteria ?? []).flatMap((criterion) => criterion.traces ?? []))
    .filter((trace) => typeof trace === 'string')
    .map((trace) => trace.split('#')[0])
    .filter((path) => path.startsWith('docs/living/') && path.endsWith('.md') && !path.split('/').includes('..'));
  for (const doc of new Set([...stories, ...must, ...cards.flatMap(({ links }) => [...links]), ...traced])) {
    const absolute = resolveProjectPath(roots, doc);
    if (existsSync(absolute) && readFrontmatter(readFileSync(absolute, 'utf8'))?.state === 'planned' && !adds.has(doc)) {
      findings.push(finding('analyze-planned-no-delta', `Planned document ${doc} needs an open add delta in cycle ${name}.`, doc));
    }
  }

  const modules = 'docs/living/architecture/modules';
  if (existsSync(resolveProjectPath(roots, modules))) for (const { card } of cards) for (const module of blastRadiusOf(card)) {
    if (MODULE_NAME.test(module) && !existsSync(resolveProjectPath(roots, `${modules}/${module}.md`))) {
      findings.push(finding('analyze-module-unknown', `Card ${card.id} names module ${module}, but ${modules}/${module}.md is missing.`, card.id));
    }
  }
  const tier = readTierData(projectDir);
  for (const issue of tier.findings) findings.push(finding('analyze-test-levels', issue.message, '.process/tiers/rigor/tiers.json'));
  for (const { card } of cards) for (const issue of checkTestLevels({ card, tier: card.tier ?? cycle.tier, tierData: tier.data }).findings) {
    findings.push(finding('analyze-test-levels', `Card ${card.id}: ${issue.message}`, card.id));
  }

  // The plan is held to its brief only once the brief has a contract line, so older untyped cycles are unaffected.
  const contractIds = parseRequirementLines(brief).lines.filter((line) => line.type === 'contract').map((line) => line.id);
  const cyclePlan = readCyclePlan(projectDir, name, selectedLevelsOf(cycle, tier.data));
  const planIssues = contractCoverageFindings({ plan: cyclePlan?.plan ?? null, contractIds });
  if (cyclePlan && contractIds.length > 0) {
    planIssues.push(...planFindings({ plan: cyclePlan.plan, selectedLevels: cyclePlan.selectedLevels, briefIds: cyclePlan.briefIds }));
  }
  for (const issue of planIssues) findings.push(finding('analyze-test-plan', issue.message, `${paths.root}/test-plan.md`));
  if (cyclePlan) for (const { card } of cards) for (const issue of cardLevelFindings({ card, plan: cyclePlan.plan })) {
    findings.push(finding('analyze-test-plan', `Card ${card.id}: ${issue.message}`, card.id));
  }
  return findings;
}
