import { isCardId } from '../board.mjs';
import { isCardProcessPath, isCycleOwnPath, isNotePath } from '../card-files.mjs';
import { BACKLOG_DIR, COLUMNS, CYCLES_DIR, isCycleName } from '../layout.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../git.mjs').Change} Change */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {'add' | 'remove' | 'edit'} Kind */

const FILL_HINT =
  'Fill manifest and files_scope in card.json (a bug card skips shaping, so its lead fills them before the move to review); a frozen manifest changes only by going back to shaping.';
const KIND_OF_STATUS = { A: 'add', C: 'add', D: 'remove', M: 'edit', T: 'edit', U: 'edit' };
/** Platforms whose filesystems are conventionally case-insensitive. */
const CASE_INSENSITIVE = new Set(['win32', 'darwin']);

const slashes = (path) => String(path).replaceAll('\\', '/').replace(/^(\.\/)+/, '');
const climbs = (path) => slashes(path).split('/').includes('..');
const TICKET_FILES = ['card.json', 'card.md', 'context.md'];
const BACKLOG_COLUMN = COLUMNS[0];

/**
 * True when a path is one of the files a newly filed card starts with, in the global backlog or in the backlog column
 * of a cycle.
 * @param {string} p project-relative, forward slashes, no `..`
 */
function isNewTicketFile(p) {
  const parts = p.split('/');
  const [id, file] = parts.slice(-2);
  if (!TICKET_FILES.includes(file) || !isCardId(id)) return false;
  const parent = parts.slice(0, -2).join('/');
  if (parent === BACKLOG_DIR) return true;
  const [cycle, kanban, column, ...rest] = parent.startsWith(`${CYCLES_DIR}/`) ? parent.slice(CYCLES_DIR.length + 1).split('/') : [];
  return rest.length === 0 && isCycleName(cycle) && kanban === 'kanban' && column === BACKLOG_COLUMN;
}

/**
 * Compares the card's change manifest and file scope with the changes between its base commit and the working tree.
 * Paths compare case-insensitively only on platforms whose filesystems conventionally do.
 * A change outside the manifest or scope is accepted when `exceptions` (the scope exceptions log in context.md) lists its
 * path and kind with a reason; it is then reported once as scope-exception, a warning the gate lists apart from violations.
 * A path in `generatedIndexes` (decided by the caller from file contents: an index change that is only the generator's
 * block) is never unplanned; `generatedIndexNotes` says why a non-exempt index path was not accepted.
 * @param {{ card: Card, changes: Change[], platform?: string, exceptions?: import('../contract.mjs').ScopeException[], generatedIndexes?: Set<string>, generatedIndexNotes?: Map<string, string> }} input
 * @returns {Finding[]}
 */
export function checkManifest({ card, changes, platform = process.platform, exceptions = [], generatedIndexes = new Set(), generatedIndexNotes = new Map() }) {
  const indexNote = (path) => (generatedIndexNotes.has(slashes(path)) ? ` Not accepted as a generated index change: ${generatedIndexNotes.get(slashes(path))}.` : '');
  const key = CASE_INSENSITIVE.has(platform) ? (path) => slashes(path).toLowerCase() : slashes;
  const exemptDocs = new Set((Array.isArray(card.docs_impact) ? card.docs_impact : []).filter((p) => !climbs(p)).map(key));
  const claimedCycle = typeof card.claimed_in === 'string' && isCycleName(card.claimed_in)
    ? `${CYCLES_DIR}/${card.claimed_in}`
    : null;
  const protectedCycleRecord = (path) => /^docs\/ephemeral\/cycles\/[^/]+\/(?:cycle\.md|verification\/close-review\.md)$/i.test(slashes(path));
  // Routine records belong to the card's claimed cycle. Any cycle brief or close review can change a gate, so it must be planned.
  const exempt = (path) =>
    !climbs(path) && (isCardProcessPath(slashes(path), card.id) ||
      (claimedCycle !== null && isCycleOwnPath(slashes(path)) && key(path).startsWith(`${key(claimedCycle)}/`) && !protectedCycleRecord(path)) ||
      (exemptDocs.has(key(path)) && !protectedCycleRecord(path)));

  /**
   * A new card in the global backlog or a cycle's backlog column (filing a ticket: card.json, card.md and context.md)
   * or a new or edited handoff or learning is never an unplanned change.
   */
  const exemptChange = ({ status, path }) => {
    if (climbs(path)) return false;
    const p = slashes(path);
    if ((status === 'A' || status === 'M') && generatedIndexes.has(p)) return true;
    if (status === 'A' && isNewTicketFile(p)) return true;
    return (status === 'A' || status === 'M') && isNotePath(p);
  };

  /** @type {Finding[]} */
  const findings = [];
  /** @type {Array<{ kind: Kind, path: string, status: string }>} */
  const actual = [];
  for (const change of changes) {
    if (!(change.status in KIND_OF_STATUS) && change.status !== 'R') {
      findings.push({
        rule: 'manifest-unplanned',
        message: `${change.path} changed with an unrecognised git status "${change.status}" so it cannot be matched to the manifest. Inspect it with git status, then list it in the manifest or revert it. ${FILL_HINT}`,
        path: change.path,
      });
    } else if (change.status === 'R') {
      actual.push({ kind: 'remove', path: change.from ?? change.path, status: 'R' }, { kind: 'add', path: change.path, status: 'R' });
    } else {
      actual.push({ kind: /** @type {Kind} */ (KIND_OF_STATUS[change.status]), path: change.path, status: change.status });
    }
  }
  const relevant = actual.filter((entry) => !exempt(entry.path) && !exemptChange(entry));

  /** @type {Map<string, Set<Kind>>} */
  const planned = new Map();
  for (const kind of /** @type {Kind[]} */ (['add', 'remove', 'edit'])) {
    for (const path of card.manifest[kind]) {
      if (!planned.has(key(path))) planned.set(key(path), new Set());
      planned.get(key(path)).add(kind);
    }
  }
  const scope = card.files_scope.map((s) => key(s).replace(/\/+$/, ''));
  const inScope = (path) => scope.some((s) => key(path) === s || key(path).startsWith(`${s}/`));

  const logged = (kind, path) => exceptions.find((e) => e.kind === kind && key(e.path) === key(path) && String(e.reason).trim() !== '');

  for (const { kind, path } of relevant) {
    /** @type {Finding[]} */
    const violations = [];
    const listed = planned.get(key(path));
    if (listed === undefined) {
      violations.push({
        rule: 'manifest-unplanned',
        message: `${path} was changed (${kind}) but is not in the manifest. ${FILL_HINT} Or, when the plan clearly implies the change, the lead logs it under Scope exceptions in context.md.${indexNote(path)}`,
        path,
      });
    } else if (!listed.has(kind)) {
      violations.push({
        rule: 'manifest-wrong-kind',
        message: `${path} is listed under ${[...listed].join(' and ')} in the manifest but was changed as ${kind}. ${FILL_HINT}${indexNote(path)}`,
        path,
      });
    }
    if (!inScope(path)) {
      violations.push({
        rule: 'manifest-outside-scope',
        message:
          scope.length === 0
            ? `${path} was changed but files_scope is empty. ${FILL_HINT}`
            : `${path} was changed outside files_scope (${card.files_scope.join(', ')}). ${FILL_HINT}${indexNote(path)}`,
        path,
      });
    }
    const entry = violations.length > 0 ? logged(kind, path) : undefined;
    if (entry === undefined) {
      findings.push(...violations);
    } else {
      findings.push({
        rule: 'scope-exception',
        message: `approved deviation, needs human review: ${path} was changed (${kind}) outside the card's scope; logged ${entry.date}${entry.approvedBy ? ` by ${entry.approvedBy}` : ''}: ${entry.reason}`,
        path,
      });
    }
  }

  const changedKeys = new Set(relevant.map(({ path }) => key(path)));
  for (const kind of /** @type {Kind[]} */ (['add', 'remove', 'edit'])) {
    for (const path of card.manifest[kind]) {
      if (exempt(path) || changedKeys.has(key(path))) continue;
      findings.push({
        rule: 'manifest-not-done',
        message: `${path} is listed to ${kind} in the manifest but has no change. Make the change, or fix the manifest. ${FILL_HINT}`,
        path,
      });
    }
  }

  return findings.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0));
}
