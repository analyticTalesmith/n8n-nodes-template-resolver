import { readFileSync, readdirSync } from 'node:fs';
import { isApproved } from '../approval.mjs';
import { VALIDATED_IN, readDeltaRecords, reviewedPath } from '../delta.mjs';
import { DOC_STATES, readFrontmatter } from '../frontmatter.mjs';
import { CYCLES_DIR, CYCLE_ARCHIVE_DIR } from '../layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from '../project-roots.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

const LIVING_DIR = 'docs/living';
const CLOSE_REVIEW = 'close-review.md';

const byName = (a, b) => (a.name < b.name ? -1 : 1);
const entriesOf = (dir) => {
  try {
    return readdirSync(dir, { withFileTypes: true }).sort(byName);
  } catch (cause) {
    if (cause.code === 'ENOENT') return [];
    throw cause;
  }
};
const textOf = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch (cause) {
    if (cause.code === 'ENOENT' || cause.code === 'EISDIR') return null;
    throw cause;
  }
};

/**
 * Entries named *.md under a folder, as project-relative paths. A folder with such a name is listed and searched
 * too, since it stands where a document should be. Symbolic links are not followed.
 */
function markdownUnder(roots, rel) {
  const found = [];
  for (const entry of entriesOf(resolveProjectPath(roots, rel))) {
    const next = `${rel}/${entry.name}`;
    if (entry.name.endsWith('.md') && (entry.isFile() || entry.isDirectory())) found.push(next);
    if (entry.isDirectory()) found.push(...markdownUnder(roots, next));
  }
  return found;
}

/**
 * The documents each cycle's approved close review lists under validates, by cycle name, over active and archived
 * cycles. A cycle without an approved review is absent.
 * @returns {Map<string, Set<string>>}
 */
function validatedByCycle(roots) {
  const byCycle = new Map();
  for (const base of [CYCLES_DIR, CYCLE_ARCHIVE_DIR]) {
    for (const cycle of entriesOf(resolveProjectPath(roots, base))) {
      if (!cycle.isDirectory()) continue;
      const data = readFrontmatter(textOf(resolveProjectPath(roots, `${base}/${cycle.name}/verification/${CLOSE_REVIEW}`)) ?? '');
      if (data === null || !isApproved(data.approved_by) || !Array.isArray(data.validates)) continue;
      const named = byCycle.get(cycle.name) ?? new Set();
      for (const path of data.validates) named.add(reviewedPath(path));
      byCycle.set(cycle.name, named);
    }
  }
  return byCycle;
}

/** Why a validated document lacks its evidence, or null when the cycle in its validated_in approved it. */
function validationGap(path, cycle, byCycle) {
  if (typeof cycle !== 'string' || cycle === '') {
    return `${path} is validated but names no cycle in its ${VALIDATED_IN} field, so no approved close review is tied to its content. Validate it through the close review (delta.mjs validate), or set state back to built.`;
  }
  const named = byCycle.get(cycle);
  if (named === undefined) {
    return `${path} is validated in cycle ${cycle}, but that cycle has no close review whose approved_by names a person. Have a person approve that close review, or set state back to built.`;
  }
  if (!named.has(path)) {
    return `${path} is validated in cycle ${cycle}, but that cycle's approved close review does not list it under validates. List it there and validate again, or set state back to built.`;
  }
  return null;
}

/**
 * Checks that each living document's `state` has the evidence it claims: a planned document has an open add delta,
 * a built one an applied add or modify delta, a validated one a `validated_in` naming a cycle whose approved close
 * review lists it. A .md entry that cannot be read as a file is reported; documents without a `state` field are
 * ignored. Never throws for document content and never writes.
 * @param {{ projectDir: string }} input
 * @returns {Finding[]}
 */
export function checkLivingState({ projectDir }) {
  const roots = resolveProjectRoots(projectDir);
  const records = readDeltaRecords(projectDir);
  const targets = (status, ops) => new Set(records.filter((r) => r.status === status && ops.includes(r.op)).map((r) => r.target));
  const openAdds = targets('open', ['add', 'recover']);
  const appliedChanges = targets('applied', ['add', 'modify', 'recover']);
  const byCycle = validatedByCycle(roots);
  /** @type {Finding[]} */
  const findings = [];
  for (const path of markdownUnder(roots, LIVING_DIR)) {
    const add = (rule, message) => findings.push({ rule, message, path });
    const text = textOf(resolveProjectPath(roots, path));
    if (text === null) {
      add('living-doc-unreadable', `${path} cannot be read as a document file, so its state cannot be checked. Restore the document, or rename the entry so it no longer ends in .md.`);
      continue;
    }
    const data = readFrontmatter(text);
    if (data === null || data.state === undefined) continue;
    const state = data.state;
    if (typeof state !== 'string' || !DOC_STATES.includes(state)) {
      add('living-state-invalid', `${path} has a state that is not one of ${DOC_STATES.join(', ')}. Set state to one of them.`);
    } else if (state === 'planned' && !openAdds.has(path)) {
      add('living-planned-without-delta', `${path} is planned but no open add or recover delta names it. Record one in the open cycle (delta.mjs add with --op add, or --op recover for a recovered document), or remove the document.`);
    } else if (state === 'built' && !appliedChanges.has(path)) {
      add('living-built-without-delta', `${path} is built but no applied add, modify or recover delta names it. Apply its delta (at merge, or by slug when an archaeology card is done), or set state back to planned.`);
    } else if (state === 'validated') {
      const gap = validationGap(path, data[VALIDATED_IN], byCycle);
      if (gap !== null) add('living-validated-without-review', gap);
    }
  }
  return findings;
}
