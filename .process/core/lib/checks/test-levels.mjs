import { blastRadiusOf, testLevelsOf } from '../card.mjs';
import { resolveDepth } from '../depth.mjs';
import { cardLevelFindings, planFindings } from '../test-plan.mjs';

/**
 * Checks the verification plan on a card; execution remains the card gate's job. With a cycle plan it also reports the
 * plan's own gaps and the card levels the plan has no section for; a null cyclePlan skips those.
 * @param {{ card: object, tier: string, tierData: object, cyclePlan?: import('../test-plan.mjs').CyclePlan | null }} input
 */
export function checkTestLevels({ card, tier, tierData, cyclePlan = null }) {
  const paths = ['add', 'edit', 'remove'].flatMap((kind) =>
    Array.isArray(card?.manifest?.[kind]) ? card.manifest[kind] : []);
  if (paths.length === 0) return { findings: [], skipped: 'the card changes no file' };
  if (paths.every((path) => typeof path === 'string' && (path.startsWith('docs/') || path.startsWith('.process/')))) {
    return { findings: [], skipped: 'the card changes only docs/ and .process/ files' };
  }

  const findings = [];
  const radius = blastRadiusOf(card);
  const levels = testLevelsOf(card);
  if (radius.length === 0) {
    findings.push({ rule: 'blast-radius-missing', message: 'A code-changing card needs blast_radius in card.json. Name the modules it may affect.' });
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
