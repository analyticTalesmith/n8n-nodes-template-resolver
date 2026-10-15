import { existsSync } from 'node:fs';
import { blastRadiusOf, testLevelsOf } from '../card.mjs';
import { resolveDepth } from '../depth.mjs';
import { DOCS_ROOT, MODULES_DIR, PROCESS_DIR } from '../layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from '../project-roots.mjs';
import { cardLevelFindings, planFindings } from '../test-plan.mjs';

/** Whether the project has module pages to name in a blast radius; true when it cannot tell, the stricter reading. */
function projectHasModulePages(projectDir) {
  try {
    return existsSync(resolveProjectPath(resolveProjectRoots(projectDir), MODULES_DIR));
  } catch {
    return true;
  }
}

/**
 * Checks the verification plan on a card; execution remains the card gate's job. With a cycle plan it also reports the
 * plan's own gaps and the card levels the plan has no section for; a null cyclePlan skips those.
 * A blast radius of none says the card reaches no module. It is accepted without a word when the project has no module
 * pages; with module pages it needs `blast_radius_reason`, one line saying why. An empty list is accepted only without module pages.
 * @param {{ card: object, tier: string, tierData: object, cyclePlan?: import('../test-plan.mjs').CyclePlan | null, projectDir?: string, hasModulePages?: boolean }} input
 * Without projectDir (or an explicit hasModulePages) the project is not looked at: an empty radius is missing and none passes, as before.
 */
export function checkTestLevels({ card, tier, tierData, cyclePlan = null, projectDir, hasModulePages = projectDir === undefined ? undefined : projectHasModulePages(projectDir) }) {
  const paths = ['add', 'edit', 'remove'].flatMap((kind) =>
    Array.isArray(card?.manifest?.[kind]) ? card.manifest[kind] : []);
  if (paths.length === 0) return { findings: [], skipped: 'the card changes no file' };
  if (paths.every((path) => typeof path === 'string' && (path.startsWith(`${DOCS_ROOT}/`) || path.startsWith(`${PROCESS_DIR}/`)))) {
    return { findings: [], skipped: `the card changes only ${DOCS_ROOT}/ and ${PROCESS_DIR}/ files` };
  }

  const findings = [];
  const radius = blastRadiusOf(card);
  const levels = testLevelsOf(card);
  const reason = /** @type {any} */ (card)?.blast_radius_reason;
  const hasReason = typeof reason === 'string' && reason.trim() !== '';
  if (radius.length === 0 && hasModulePages !== false) {
    findings.push({ rule: 'blast-radius-missing', message: `A code-changing card needs blast_radius in card.json. Name the modules it may affect: the names of the module documents under ${MODULES_DIR}/ (without .md). A card that reaches none of them writes ["none"] together with blast_radius_reason, one line saying why. Only a project with no module pages may leave it empty, use ["none"] alone or name a plain area such as a directory.` });
  } else if (radius.includes('none') && hasModulePages === true && !hasReason) {
    findings.push({ rule: 'blast-radius-missing', message: `blast_radius says none, but the project has module pages under ${MODULES_DIR}/. Add blast_radius_reason to card.json, one line saying why no module is affected, or name the modules.` });
  }
  const depth = resolveDepth({ tierData, tier, card });
  if (radius.length >= 2 && depth.levels.integration.selected && !levels.includes('integration')) {
    findings.push({ rule: 'test-level-unplanned', message: 'The card spans two or more modules. Add integration to test_levels and plan an integration test criterion.' });
  }
  const criteria = Array.isArray(card?.criteria) ? card.criteria : [];
  for (const level of levels) {
    if (!criteria.some((criterion) => criterion?.verify === 'test' && criterion.level === level)) {
      findings.push({ rule: 'test-level-no-criterion', message: `test_levels includes ${level}, but no test criterion has level ${level}. Add one to card.json.` });
    }
  }
  if (cyclePlan) {
    findings.push(...planFindings({ plan: cyclePlan.plan, selectedLevels: cyclePlan.selectedLevels, briefIds: cyclePlan.briefIds }));
    findings.push(...cardLevelFindings({ card, plan: cyclePlan.plan }));
  }
  return { findings, skipped: null };
}
