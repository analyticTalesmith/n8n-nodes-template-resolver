import { ATOM_ID } from '../atom.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('../atom.mjs').Atom} Atom */
/** @typedef {import('../deliverable.mjs').Deliverable} Deliverable */

/**
 * Every section of a composed deliverable cites atom ids, and each cited id names an atom that exists and is built or
 * validated. A section headed "Exempt: <name>" needs no citation; the heading is the visible record of the exemption.
 * Pure; quiet when there are no deliverables.
 * Rules: deliverable-no-sections, deliverable-section-uncited, deliverable-cite-malformed, deliverable-cite-unknown,
 * deliverable-cite-planned, deliverable-exempt-unnamed.
 * @param {{ deliverables: Deliverable[], atoms: Atom[] }} input
 * @returns {Finding[]}
 */
export function checkDeliverableCites({ deliverables, atoms }) {
  /** @type {Finding[]} */
  const findings = [];
  const byId = new Map(atoms.map((atom) => [atom.id, atom]));
  for (const { path, sections } of deliverables) {
    const add = (rule, message) => findings.push({ rule, message: `${path}: ${message}`, path });
    if (sections.length === 0) {
      add('deliverable-no-sections', 'has no ## sections, so no claim can cite an atom. Compose it in sections and cite each one with [cites: <atom id>].');
      continue;
    }
    for (const section of sections) {
      const where = `section "${section.heading}" (line ${section.line})`;
      if (section.exempt !== null) {
        if (section.exempt === '') add('deliverable-exempt-unnamed', `${where} is an exemption with no name. Write "## Exempt: <name>" or cite atoms.`);
        continue;
      }
      if (section.ids.length === 0) {
        add('deliverable-section-uncited', `${where} cites no atom. Add [cites: <atom id>] for each claim, or send the missing fact to its owning team as a delta.`);
        continue;
      }
      for (const id of new Set(section.ids)) {
        const atom = byId.get(id);
        if (!ATOM_ID.test(id)) add('deliverable-cite-malformed', `${where} cites "${id}", which is not an atom id. Use lowercase words joined by hyphens.`);
        else if (atom === undefined) add('deliverable-cite-unknown', `${where} cites ${id}, but no atom has that id. Fix the id or add the atom by delta.`);
        else if (atom.state === 'planned') add('deliverable-cite-planned', `${where} cites ${id}, which is still planned. Cite built or validated atoms only; wait until it ships.`);
      }
    }
  }
  return findings;
}
