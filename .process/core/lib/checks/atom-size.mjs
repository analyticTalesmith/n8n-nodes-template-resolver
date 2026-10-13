/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./design-atoms.mjs').DesignAtom} DesignAtom */

/** About one screen. The limit is advisory: the gate lists the finding as a warning and never blocks on it. */
export const ATOM_MAX_LINES = 60;

/**
 * Flags an atom file longer than the advisory limit, since a long atom usually holds a second concept.
 * Pure; quiet when there are no atoms.
 * Rule: atom-size.
 * @param {{ atoms: DesignAtom[], max?: number }} input
 * @returns {Finding[]}
 */
export function checkAtomSize({ atoms, max = ATOM_MAX_LINES }) {
  return atoms
    .filter((atom) => atom.lines > max)
    .map((atom) => ({
      rule: 'atom-size',
      message: `${atom.path}: atom ${atom.id} has ${atom.lines} lines; about ${max} fits one screen. Split it when it holds a second concept.`,
      path: atom.path,
    }));
}
