import { runGit, GitError } from '../git.mjs';
import { readAtoms } from '../atom.mjs';
import { readDeliverables } from '../deliverable.mjs';
import { resolveProjectRoots } from '../project-roots.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('../git.mjs').GitRunner} GitRunner */
/** @typedef {import('../atom.mjs').Atom} Atom */
/** @typedef {import('../deliverable.mjs').Deliverable} Deliverable */

const COMMIT = /^[0-9a-f]{7,40}$/;

/**
 * A composed deliverable records each atom id it used with the commit the id was verified at. The section is stale
 * when the atom's file now differs from that commit, whether a delta committed the change or it is still uncommitted.
 * Pure apart from the git runner; quiet when there are no deliverables. Projects whose documents live outside the
 * checkout have no history to compare and are skipped by checkDeliverableFreshness.
 * Rules: deliverable-record-malformed, deliverable-record-missing, deliverable-commit-unknown, deliverable-stale,
 * deliverable-git-failed.
 * @param {{ deliverables: Deliverable[], atoms: Atom[], projectDir: string, run?: GitRunner }} input
 * @returns {Finding[]}
 */
export function checkDeliverableFresh({ deliverables, atoms, projectDir, run = runGit }) {
  /** @type {Finding[]} */
  const findings = [];
  const byId = new Map(atoms.map((atom) => [atom.id, atom]));
  for (const { path, records, sections } of deliverables) {
    const add = (rule, message) => findings.push({ rule, message: `${path}: ${message}`, path });
    /** @type {Map<string, string>} */
    const recorded = new Map();
    for (const record of records) {
      if (record.id === '' || !COMMIT.test(record.commit)) add('deliverable-record-malformed', `the cites entry "${record.raw}" is not "<atom id>: <commit>". Write the id and the 7 to 40 character lowercase hex commit it was verified at.`);
      else recorded.set(record.id, record.commit);
    }
    const used = new Set(sections.filter((section) => section.exempt === null).flatMap((section) => section.ids));
    for (const id of used) {
      if (!recorded.has(id) && !records.some((record) => record.id === id)) add('deliverable-record-missing', `cites ${id} in the text but the front matter records no commit for it. Add "${id}: <commit>" under cites.`);
    }
    for (const [id, commit] of recorded) {
      const atom = byId.get(id);
      if (atom === undefined) continue;
      try {
        run(projectDir, ['cat-file', '-e', `${commit}^{commit}`]);
      } catch (cause) {
        if (!(cause instanceof GitError)) throw cause;
        add('deliverable-commit-unknown', `the recorded commit ${commit} for ${id} is not in this repository. Record the commit the atom was verified at.`);
        continue;
      }
      let changed;
      try {
        changed = run(projectDir, ['diff', '--name-only', '--no-color', '--no-ext-diff', commit, '--', atom.path]).trim() !== '';
      } catch (cause) {
        if (!(cause instanceof GitError)) throw cause;
        add('deliverable-git-failed', `git could not compare ${atom.path} with ${commit}: ${cause.message}`);
        continue;
      }
      if (!changed) continue;
      const stale = sections.filter((section) => section.ids.includes(id)).map((section) => `"${section.heading}"`);
      add('deliverable-stale', `${atom.path} changed after ${commit}, so ${stale.length === 0 ? 'the record for' : `section${stale.length === 1 ? '' : 's'} ${stale.join(', ')} citing`} ${id} must be recomposed. Recompose only those sections, then record the new commit for ${id}.`);
    }
  }
  return findings;
}

/**
 * Reads the project's deliverables and atoms and runs checkDeliverableFresh. A project that keeps its documents in a
 * local store has no history for them, so nothing is compared there.
 * @param {{ projectDir: string, run?: GitRunner }} input
 * @returns {Finding[]}
 */
export function checkDeliverableFreshness({ projectDir, run }) {
  const deliverables = readDeliverables(projectDir);
  if (deliverables.length === 0 || resolveProjectRoots(projectDir).mode === 'local') return [];
  return checkDeliverableFresh({ deliverables, atoms: readAtoms(projectDir).atoms, projectDir, run });
}
