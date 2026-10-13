import { isSettled, linked } from './design-atoms.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./design-atoms.mjs').DesignAtom} DesignAtom */

/**
 * A built or validated rule needs a verified-by link to a test, or a Waiver section with a reason. A rule of form
 * non-goal says what the product will not do and needs neither. Planned rules are not checked. Pure; quiet when there are no atoms.
 * Rule: rule-no-test.
 * @param {{ atoms: DesignAtom[] }} input
 * @returns {Finding[]}
 */
export function checkRuleHasTest({ atoms }) {
  return atoms
    .filter((atom) => atom.type === 'rule' && isSettled(atom) && atom.form !== 'non-goal' && linked(atom, 'verified-by').length === 0 && atom.waiver === null)
    .map((atom) => ({
      rule: 'rule-no-test',
      message: `${atom.path}: rule ${atom.id} has no test. Add verified-by: <test id>, or write a Waiver section that gives the reason and who accepted it.`,
      path: atom.path,
    }));
}
