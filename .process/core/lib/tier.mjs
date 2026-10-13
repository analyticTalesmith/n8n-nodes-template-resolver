import { cardPath } from './board.mjs';
import { readConfig } from './config.mjs';
import { CONCERNS, CONCERN_WORDS } from './concerns.mjs';
import { CycleError, readCycle } from './cycle.mjs';
import { TIERS } from './layout.mjs';

/**
 * @typedef {{
 *   tier: string,
 *   source: 'card' | 'cycle' | 'project',
 *   layers: { card: string | null, cycle: string | null, project: string },
 *   warning: string | null,
 *   concern?: string,
 * }} EffectiveTier
 */

export class TierError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TierError';
  }
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** One layer's setting for a concern: its own concern setting, else the layer's general tier. */
function layerValue(map, general, concern, where) {
  if (concern === undefined || !isObject(map) || map[concern] === undefined) return general;
  const value = map[concern];
  if (!TIERS.includes(value)) {
    throw new TierError(`${where} sets ${concern} to ${JSON.stringify(value)}. Use one of: ${TIERS.join(', ')}.`);
  }
  return value;
}

/**
 * Resolves the tier a card is held to: its own tier, else the tier of the cycle it sits in, else the project's.
 * With a concern, each layer may set that concern on its own and the nearest layer that sets it wins, so a card can
 * raise or lower one concern against its cycle and project. Without a concern the result is the layer tier alone.
 * Reads only. A card in the global backlog or not on the board has no cycle layer. An unreadable cycle is reported
 * in warning and skipped; a missing project config throws the ConfigError.
 * @param {string} projectDir
 * @param {import('./card.mjs').Card} card
 * @param {string} [concern] one of CONCERNS
 * @returns {EffectiveTier}
 */
export function effectiveTier(projectDir, card, concern) {
  if (concern !== undefined && !CONCERNS.includes(concern)) {
    throw new TierError(`Unknown concern "${concern}". Use one of: ${CONCERNS.join(', ')}.`);
  }
  const cardTier = card.tier ?? null;
  if (cardTier !== null && !TIERS.includes(cardTier)) {
    throw new TierError(`Card ${card.id} has unknown tier "${cardTier}". Set tier to one of: ${TIERS.join(', ')}, or remove it.`);
  }
  const config = readConfig(projectDir);
  const project = config.tier;

  let cycleTier = null;
  let cycleConcerns = null;
  let warning = null;
  const cycle = cardPath(projectDir, card.id)?.cycle ?? null;
  if (cycle !== null) {
    try {
      const read = readCycle(projectDir, cycle);
      cycleTier = read.tier;
      cycleConcerns = read.concerns ?? null;
    } catch (err) {
      if (!(err instanceof CycleError)) throw err;
      warning = `Cycle ${cycle} could not be used, so its tier is ignored: ${err.message}`;
    }
  }

  const cardLayer = layerValue(/** @type {any} */ (card).concerns, cardTier, concern, `Card ${card.id}`);
  const cycleLayer = layerValue(cycleConcerns, cycleTier, concern, `Cycle ${cycle}`);
  const projectLayer = layerValue(config.concerns, project, concern, '.process/aperture.json');
  const layers = { card: cardLayer, cycle: cycleLayer, project: projectLayer };
  const extra = concern === undefined ? {} : { concern };
  if (cardLayer !== null) return { tier: cardLayer, source: 'card', layers, warning, ...extra };
  if (cycleLayer !== null) return { tier: cycleLayer, source: 'cycle', layers, warning, ...extra };
  return { tier: projectLayer, source: 'project', layers, warning, ...extra };
}

/**
 * One line saying where a tier that differs from the project tier came from; null when the effective tier equals the project tier.
 * @param {EffectiveTier} t
 * @returns {string | null}
 */
export function describeTier(t) {
  if (t.tier === t.layers.project) return null;
  const others = [];
  if (t.source === 'card' && t.layers.cycle !== null) others.push(`cycle ${t.layers.cycle}`);
  others.push(`project ${t.layers.project}`);
  return `tier: ${t.tier} (${t.source}; ${others.join(', ')})`;
}

/**
 * The tier of every concern for a card, with the layer that set each, and the label printed for conversation.
 * @param {string} projectDir
 * @param {import('./card.mjs').Card} card
 * @returns {{ concerns: Record<string, EffectiveTier>, tiers: Record<string, string>, label: string }}
 */
export function effectiveConcerns(projectDir, card) {
  const concerns = Object.fromEntries(CONCERNS.map((concern) => [concern, effectiveTier(projectDir, card, concern)]));
  const tiers = Object.fromEntries(CONCERNS.map((concern) => [concern, concerns[concern].tier]));
  return { concerns, tiers, label: concernLabel(tiers, effectiveTier(projectDir, card).tier) };
}

/**
 * The derived label: the tier name when every concern agrees, else the tier most concerns hold followed by each
 * concern that differs, as "product, spike docs". Ties for the most concerns go to the tier of the whole.
 * @param {Record<string, string>} tiers concern to tier
 * @param {string} [whole] the tier with no concern asked
 * @returns {string}
 */
export function concernLabel(tiers, whole) {
  const values = CONCERNS.map((concern) => tiers[concern]);
  if (values.every((value) => value === values[0])) return values[0];
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const best = Math.max(...counts.values());
  const leaders = [...counts].filter(([, count]) => count === best).map(([value]) => value);
  const base = leaders.includes(whole) ? whole : leaders.sort((a, b) => TIERS.indexOf(b) - TIERS.indexOf(a))[0];
  const rest = CONCERNS.filter((concern) => tiers[concern] !== base).map((concern) => `${tiers[concern]} ${CONCERN_WORDS[concern]}`);
  return [base, ...rest].join(', ');
}
