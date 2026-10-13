import { TIERS } from './layout.mjs';

export const TEST_LEVELS = Object.freeze(['unit', 'integration', 'system', 'acceptance']);
export const CARD_LEVELS = Object.freeze(['unit', 'integration']);
export const CYCLE_LEVELS = Object.freeze(['system', 'acceptance']);
export const REGRESSION_MODES = Object.freeze(['selection', 'full-suite']);
export const SWEEP_LENSES = Object.freeze(['red-team', 'security', 'unhappy-path', 'malicious-path']);

/** Which entries of a tier map are required at this tier, in map order. */
export function requiredAt(map, tier) {
  const current = TIERS.indexOf(tier);
  if (current < 0) throw new RangeError(`unknown tier ${JSON.stringify(tier)}`);
  return Object.entries(map)
    .filter(([, minimum]) => minimum !== null && TIERS.indexOf(minimum) <= current)
    .map(([name]) => name);
}
