import { ATOM_ID, LINK_TYPES } from '../atom.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('../atom.mjs').Atom} Atom */

const withArticle = (word) => `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`;

/**
 * Checks that every atom link and atom-id source points at an atom that exists and, for a link, at a type the link
 * type allows, and that no atom id is used by two files. Pure; does not change its input.
 * Rules: atom-id-duplicate (one per extra file), atom-id-retired (an atom whose id is in the retired set), link-target-missing, link-target-type, source-target-missing.
 * @param {{ atoms: Atom[], retired?: Map<string, { note: string }> }} input
 * @returns {Finding[]}
 */
export function checkLinksResolve({ atoms, retired = new Map() }) {
  /** @type {Finding[]} */
  const findings = [];
  /** @type {Map<string, Atom>} */
  const byId = new Map();
  for (const atom of atoms) {
    const old = retired.get(atom.id);
    if (old !== undefined) {
      findings.push({
        rule: 'atom-id-retired',
        message: `${atom.path}: the atom id ${atom.id} was retired${old.note === '' ? '' : ` (${old.note})`} and an id is never reused. Choose a new id, or restore the old atom on purpose by removing ${atom.id} from the retired ids document.`,
        path: atom.path,
      });
    }
    const first = byId.get(atom.id);
    if (first === undefined) {
      byId.set(atom.id, atom);
    } else {
      findings.push({
        rule: 'atom-id-duplicate',
        message: `${atom.path}: the atom id ${atom.id} is already used by ${first.path}. Give one of the two atoms a different id.`,
        path: atom.path,
      });
    }
  }
  for (const atom of atoms) {
    const allowedByLink = Object.hasOwn(LINK_TYPES, atom.type) ? LINK_TYPES[atom.type] : {};
    for (const link of atom.links) {
      const target = byId.get(link.target);
      if (target === undefined) {
        findings.push({
          rule: 'link-target-missing',
          message: `${atom.path}: atom ${atom.id} has the link ${link.type}: ${link.target}, but no atom has the id ${link.target}. Fix the id, add the atom, or remove the link.`,
          path: atom.path,
        });
        continue;
      }
      const allowed = Object.hasOwn(allowedByLink, link.type) ? allowedByLink[link.type] : null;
      if (allowed !== null && !allowed.includes(target.type)) {
        findings.push({
          rule: 'link-target-type',
          message: `${atom.path}: atom ${atom.id} has the link ${link.type}: ${link.target}, but a ${link.type} link goes to ${allowed.join(' or ')} and ${link.target} is ${withArticle(target.type)}. Link to the right atom or change the link type.`,
          path: atom.path,
        });
      }
    }
    if (atom.source !== null && ATOM_ID.test(atom.source) && !byId.has(atom.source)) {
      findings.push({
        rule: 'source-target-missing',
        message: `${atom.path}: atom ${atom.id} has the source ${atom.source}, but no atom has that id. Fix the source, add the atom, or use a file:line or assumption.`,
        path: atom.path,
      });
    }
  }
  return findings;
}
