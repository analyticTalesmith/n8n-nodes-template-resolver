import { isSettled, linked } from './design-atoms.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./design-atoms.mjs').DesignAtom} DesignAtom */

/**
 * A built or validated actor must perform at least one action, or nobody has a reason to be there. Planned actors are
 * not checked. Pure; quiet when there are no atoms.
 * Rule: actor-no-action.
 * @param {{ atoms: DesignAtom[] }} input
 * @returns {Finding[]}
 */
export function checkActorHasAction({ atoms }) {
  const performers = new Set(atoms.filter((atom) => atom.type === 'action').flatMap((action) => linked(action, 'performed-by')));
  return atoms
    .filter((atom) => atom.type === 'actor' && isSettled(atom) && !performers.has(atom.id))
    .map((atom) => ({
      rule: 'actor-no-action',
      message: `${atom.path}: actor ${atom.id} performs no action. Add an action with performed-by: ${atom.id}, or remove the actor.`,
      path: atom.path,
    }));
}
