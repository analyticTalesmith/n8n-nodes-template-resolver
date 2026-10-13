import { isSettled, linked } from './design-atoms.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./design-atoms.mjs').DesignAtom} DesignAtom */

/**
 * A built or validated interface needs a rule that constrains it and has a test, or a Waiver section on the interface.
 * Planned interfaces are not checked. Pure; quiet when there are no atoms.
 * Rule: interface-no-contract-test.
 * @param {{ atoms: DesignAtom[] }} input
 * @returns {Finding[]}
 */
export function checkInterfaceHasContractTest({ atoms }) {
  const tested = new Set(atoms.filter((atom) => atom.type === 'rule' && linked(atom, 'verified-by').length > 0).flatMap((rule) => linked(rule, 'constrains')));
  return atoms
    .filter((atom) => atom.type === 'interface' && isSettled(atom) && !tested.has(atom.id) && atom.waiver === null)
    .map((atom) => ({
      rule: 'interface-no-contract-test',
      message: `${atom.path}: interface ${atom.id} has no contract test. Add a rule with constrains: ${atom.id} and verified-by: <test id>, or write a Waiver section on the interface.`,
      path: atom.path,
    }));
}
