import { isSettled, linked } from './design-atoms.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./design-atoms.mjs').DesignAtom} DesignAtom */

/**
 * A crossing is a built or validated interface provided by one boundary and consumed by something else. Each crossing
 * needs a risk that threatens it, or a Waiver section on the interface. Planned interfaces are not checked.
 * Pure; quiet when there are no atoms.
 * Rule: boundary-crossing-no-risk.
 * @param {{ atoms: DesignAtom[] }} input
 * @returns {Finding[]}
 */
export function checkBoundaryCovered({ atoms }) {
  const threatened = new Set(atoms.filter((atom) => atom.type === 'risk').flatMap((risk) => linked(risk, 'threatens')));
  return atoms
    .filter((atom) => {
      if (atom.type !== 'interface' || !isSettled(atom) || atom.waiver !== null || threatened.has(atom.id)) return false;
      const providers = linked(atom, 'provided-by');
      return providers.length > 0 && linked(atom, 'consumed-by').some((consumer) => !providers.includes(consumer));
    })
    .map((atom) => ({
      rule: 'boundary-crossing-no-risk',
      message: `${atom.path}: interface ${atom.id} crosses a boundary and no risk threatens it. Add a risk atom with threatens: ${atom.id}, or write a Waiver section on the interface.`,
      path: atom.path,
    }));
}
