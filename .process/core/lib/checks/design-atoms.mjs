import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ATOM_ROOTS, readAtoms } from '../atom.mjs';
import { readFrontmatter } from '../frontmatter.mjs';
import { resolveProjectPath, resolveProjectRoots } from '../project-roots.mjs';

/** @typedef {import('../atom.mjs').Atom} Atom */
/** @typedef {Atom & { lines: number, waiver: string | null, form: string | null }} DesignAtom */

const WAIVER_HEADING = /^#{2,3}[ \t]+waiver[ \t]*$/i;
const ANY_HEADING = /^#{1,6}[ \t]/;
const COMMENT_LINE = /^\s*<!--.*-->\s*$/;

/**
 * The text under a Waiver heading, or null when there is none or it is empty.
 * @param {string} text
 * @returns {string | null}
 */
export function waiverOf(text) {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((line) => WAIVER_HEADING.test(line));
  if (at === -1) return null;
  const rest = lines.slice(at + 1);
  const end = rest.findIndex((line) => ANY_HEADING.test(line));
  const body = (end === -1 ? rest : rest.slice(0, end)).filter((line) => !COMMENT_LINE.test(line)).join('\n').trim();
  return body === '' ? null : body;
}

/**
 * The `form` frontmatter value of a rule atom (ears, gwt, invariant, qas, non-goal or constraint), or null.
 * @param {string} text
 * @returns {string | null}
 */
function formOf(text) {
  try {
    const value = readFrontmatter(text)?.form;
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Whether an atom's work has shipped, so its design must hold together. Planned atoms are drafts and are not subjects.
 * @param {{ state: string }} atom
 */
export const isSettled = (atom) => atom.state === 'built' || atom.state === 'validated';

/**
 * Every atom with its line count and waiver text. Planned atoms are read too; each check decides whether a planned
 * atom is a subject. A file that cannot be read has no lines and no waiver. Never throws for file content.
 * @param {string} projectDir
 * @returns {DesignAtom[]}
 */
export function readDesignAtoms(projectDir) {
  const roots = resolveProjectRoots(projectDir);
  return readAtoms(projectDir).atoms.map((atom) => {
    const root = ATOM_ROOTS.find((candidate) => atom.path.startsWith(`${candidate}/`));
    let text = '';
    if (root !== undefined) {
      try {
        text = readFileSync(join(resolveProjectPath(roots, root), atom.path.slice(root.length + 1)), 'utf8');
      } catch {
        text = '';
      }
    }
    return { ...atom, lines: text === '' ? 0 : text.replace(/\r?\n$/, '').split(/\r?\n/).length, waiver: waiverOf(text), form: formOf(text) };
  });
}

/**
 * The targets of one link type on an atom.
 * @param {{ links: { type: string, target: string }[] }} atom
 * @param {string} type
 * @returns {string[]}
 */
export const linked = (atom, type) => atom.links.filter((link) => link.type === type).map((link) => link.target);
