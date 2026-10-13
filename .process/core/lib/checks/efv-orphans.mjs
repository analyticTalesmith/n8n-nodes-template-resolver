import { isSettled, linked } from './design-atoms.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./design-atoms.mjs').DesignAtom} DesignAtom */

/**
 * The entity-feature-view lens, read from links. A built object no action acts on is dead data; a built action shown
 * on no surface is unreachable; a built surface no action shows, or whose actions act on no object, is decoration.
 * Planned atoms are not checked. Pure; quiet when there are no atoms.
 * Rules: efv-object-no-action, efv-action-no-surface, efv-surface-no-object.
 * @param {{ atoms: DesignAtom[] }} input
 * @returns {Finding[]}
 */
export function checkEfvOrphans({ atoms }) {
  /** @type {Finding[]} */
  const findings = [];
  const actions = atoms.filter((atom) => atom.type === 'action');
  const objectIds = new Set(atoms.filter((atom) => atom.type === 'object').map((atom) => atom.id));
  const acted = new Set(actions.flatMap((action) => linked(action, 'acts-on')));
  const shown = new Set(actions.flatMap((action) => linked(action, 'shown-on')));
  const surfacesWithObject = new Set(actions.filter((action) => linked(action, 'acts-on').some((id) => objectIds.has(id))).flatMap((action) => linked(action, 'shown-on')));
  for (const atom of atoms.filter(isSettled)) {
    if (atom.type === 'object' && !acted.has(atom.id)) {
      findings.push({ rule: 'efv-object-no-action', message: `${atom.path}: object ${atom.id} has no action that acts on it, so it is dead data. Add an action with acts-on: ${atom.id}, or remove the object.`, path: atom.path });
    }
    if (atom.type === 'action' && linked(atom, 'shown-on').length === 0) {
      findings.push({ rule: 'efv-action-no-surface', message: `${atom.path}: action ${atom.id} is shown on no surface, so a person cannot reach it. Add a shown-on link to the surface that offers it.`, path: atom.path });
    }
    if (atom.type === 'surface' && !shown.has(atom.id)) {
      findings.push({ rule: 'efv-surface-no-object', message: `${atom.path}: no action is shown on surface ${atom.id}, so it offers nothing. Add an action with shown-on: ${atom.id}, or remove the surface.`, path: atom.path });
    } else if (atom.type === 'surface' && !surfacesWithObject.has(atom.id)) {
      findings.push({ rule: 'efv-surface-no-object', message: `${atom.path}: no action shown on surface ${atom.id} acts on an object, so the surface shows no object. Link an action that acts on an object.`, path: atom.path });
    }
  }
  return findings;
}
