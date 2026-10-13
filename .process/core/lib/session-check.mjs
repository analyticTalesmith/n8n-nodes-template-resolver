import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listCardFolders } from './board.mjs';
import { CycleError, listCycles, readCycle } from './cycle.mjs';
import { reviewedPath } from './delta.mjs';
import { listFeedback } from './feedback.mjs';
import { isText } from './files.mjs';
import { BACKLOG_DIR, COLUMNS, CYCLES_DIR, INBOX_DIR, cyclePaths, isCycleName } from './layout.mjs';
import { checkSecrets } from './checks/secrets.mjs';
import { LIVING_DELTA_FIX_SHORT, livingWithoutDelta } from './checks/living-via-delta.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/**
 * @typedef {{
 *   changed: string[], uncommitted: string[], decisions: Array<{ text: string, link: string }>, base: string | null,
 *   missingBase?: string | null
 * }} SessionFacts
 */

export const SESSION_RULES = Object.freeze({
  decisionHome: 'session-decision-home-unchanged',
  secret: 'session-secret',
  living: 'session-living-without-delta',
  brief: 'session-cycle-brief-empty',
  uncommitted: 'session-uncommitted',
  git: 'session-check-git-failed',
  failed: 'session-check-failed',
});

const SECRET_SCAN_ROOT = 'docs/ephemeral/';
// Keeps the end-of-session check fast; a larger note is not something a session writes by hand.
const SECRET_SCAN_MAX_BYTES = 1024 * 1024;
// Keeps the uncommitted finding one line.
const UNCOMMITTED_PATHS_SHOWN = 5;
const BRIEF_SECTIONS = ['Goal', 'Stories'];
const CARD_RECORDS = ['card.md', 'context.md'];
const INDEX_FILE = 'INDEX.md';
const URL_START = /^https?:\/\//;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * True for record homes: a cycle's CYCLE.md, its deltas/*.md and feedback/*.md, a card's card.md or context.md in a
 * cycle kanban or the global backlog, and inbox files. INDEX.md never.
 * @param {string} path project-relative
 * @returns {boolean}
 */
export function isRecordHome(path) {
  const parts = reviewedPath(String(path)).split('/');
  const name = parts.at(-1);
  if (parts.includes('..') || parts.includes('') || name === INDEX_FILE || !name.endsWith('.md')) return false;
  const under = (root) => parts.slice(0, root.split('/').length).join('/') === root;
  const rest = (root) => parts.slice(root.split('/').length);
  if (under(INBOX_DIR)) return rest(INBOX_DIR).length === 1;
  if (under(BACKLOG_DIR)) return rest(BACKLOG_DIR).length === 2 && CARD_RECORDS.includes(name);
  if (!under(CYCLES_DIR)) return false;
  const [cycle, top, ...inside] = rest(CYCLES_DIR);
  if (!isCycleName(cycle)) return false;
  if (top === 'CYCLE.md') return inside.length === 0;
  if (top === 'deltas' || top === 'feedback') return inside.length === 1;
  return top === 'kanban' && inside.length === 3 && COLUMNS.includes(inside[0]) && CARD_RECORDS.includes(name);
}

/** Whether the home changed: the path itself, or for a folder any changed path inside it. */
const homeChanged = (link, changed) => {
  const home = reviewedPath(String(link ?? '')).replace(/\/+$/, '');
  return home !== '' && changed.some((path) => path === home || path.startsWith(`${home}/`));
};

/** @param {SessionFacts} facts @param {string[]} changed @returns {{ findings: Finding[], info: string[] }} */
function decisionHomes(facts, changed, localDocs) {
  if (facts.base === null) {
    const why = facts.missingBase ? `the previous handoff's commit ${facts.missingBase} is not in this repository` : 'no previous handoff';
    return { findings: [], info: [`${why}: decision homes not checked`] };
  }
  const findings = (facts.decisions ?? [])
    .filter(({ link }) => !URL_START.test(String(link ?? '')))
    .filter(({ link }) => {
      const path = reviewedPath(String(link ?? ''));
      return !localDocs || (path !== 'docs' && !path.startsWith('docs/')) || homeChanged(link, changed);
    })
    .filter(({ link }) => !homeChanged(link, changed))
    .map(({ text, link }) => ({
      rule: SESSION_RULES.decisionHome,
      path: reviewedPath(String(link ?? '')),
      message:
        link === '' || link === undefined
          ? `The decision "${text}" names no home. Record it in the file it belongs to and link that file.`
          : `The decision "${text}" links ${reviewedPath(link)}, unchanged since ${facts.base}. Record it there, or link the file that holds it.`,
    }));
  return { findings, info: [] };
}

const GONE = ['ENOENT', 'ENOTDIR'];
/** An unreadable file is skipped with an info line: the check reports, so one bad file must not stop it. */
const unreadable = (cause, path, what) => {
  if (typeof cause?.code !== 'string') throw cause;
  return `could not read ${path} (${cause.code}): ${what}`;
};

/**
 * Secret-shaped lines in the changed text files under docs/ephemeral/; messages name path, line and pattern only.
 * Symlinks are not followed, so a link cannot pull a file from outside the scanned area into the scan.
 */
function secrets(roots, changed, io, info) {
  const addedLines = [];
  for (const path of changed) {
    if (!path.startsWith(SECRET_SCAN_ROOT) || path.split('/').includes('..')) continue;
    const file = resolveProjectPath(roots, path);
    let bytes;
    try {
      const stat = io.lstat(file);
      if (stat.isSymbolicLink() || !stat.isFile() || stat.size > SECRET_SCAN_MAX_BYTES) continue;
      bytes = io.readFile(file);
    } catch (cause) {
      if (!GONE.includes(cause?.code)) info.push(unreadable(cause, path, 'not scanned for secrets'));
      continue;
    }
    if (!isText(bytes)) continue;
    bytes
      .toString('utf8')
      .split(/\r?\n/)
      .forEach((text, index) => addedLines.push({ path, line: index + 1, text }));
  }
  return checkSecrets({ addedLines }).map((hit) => ({ rule: SESSION_RULES.secret, path: hit.path, message: hit.message }));
}

/** The lines under `## <name>` (trailing spaces on the heading allowed), up to the next heading of level one or two. */
function section(lines, name) {
  const start = lines.findIndex((line) => line.trimEnd() === `## ${name}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##? /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/** Open cycles holding at least one card whose brief leaves Goal or Stories empty (only comments or whitespace). */
function emptyBriefs(projectDir, io, info) {
  const roots = resolveProjectRoots(projectDir);
  const withCards = new Set(listCardFolders(projectDir).filter((f) => f.cycle !== null && existsSync(join(f.dir, 'card.json'))).map((f) => f.cycle));
  const findings = [];
  for (const name of listCycles(projectDir)) {
    if (!withCards.has(name)) continue;
    try {
      if (readCycle(projectDir, name).status !== 'open') continue;
    } catch (cause) {
      // validate reports an unreadable brief; this check only looks at the ones it can read.
      if (cause instanceof CycleError) continue;
      throw cause;
    }
    const brief = cyclePaths(name).brief;
    let lines;
    try {
      lines = io.readFile(resolveProjectPath(roots, brief), 'utf8').replaceAll('\r\n', '\n').split('\n');
    } catch (cause) {
      info.push(unreadable(cause, brief, 'brief not checked'));
      continue;
    }
    const empty = BRIEF_SECTIONS.filter((heading) => (section(lines, heading) ?? '').replace(HTML_COMMENT, '').trim() === '');
    if (empty.length === 0) continue;
    findings.push({
      rule: SESSION_RULES.brief,
      path: brief,
      message: `Cycle ${name} has cards but its brief has an empty ${empty.join(' and ')} section. Write ${empty.length === 1 ? 'it' : 'them'} in ${brief}.`,
    });
  }
  return findings;
}

/** @param {string[]} uncommitted */
function uncommittedWork(uncommitted) {
  if (uncommitted.length === 0) return [];
  const shown = uncommitted.slice(0, UNCOMMITTED_PATHS_SHOWN).join(', ');
  const more = uncommitted.length > UNCOMMITTED_PATHS_SHOWN ? ` and ${uncommitted.length - UNCOMMITTED_PATHS_SHOWN} more` : '';
  return [{ rule: SESSION_RULES.uncommitted, message: `${plural(uncommitted.length, 'uncommitted file')}: ${shown}${more}. Commit the work or say why it stays uncommitted.` }];
}

/**
 * What a session left that does not add up: decisions whose home did not change, secrets in ephemeral notes, living
 * documents edited without a delta, open cycles with cards but an empty brief, and uncommitted work. Reads files
 * only; the git facts come from the caller. Reports and never moves anything.
 * @param {string} projectDir
 * @param {SessionFacts} facts
 * @param {{ io?: { lstat: typeof lstatSync, readFile: typeof readFileSync } }} [options] file access, replaceable in tests
 * @returns {{ findings: Finding[], info: string[] }}
 */
export function checkSession(projectDir, facts, { io = { lstat: lstatSync, readFile: readFileSync } } = {}) {
  const roots = resolveProjectRoots(projectDir);
  const changedPaths = [...new Set((facts.changed ?? []).map((p) => reviewedPath(String(p))))];
  const decisions = decisionHomes(facts, changedPaths, roots.mode === 'local');
  const skipped = roots.mode === 'local'
    ? ['unverifiable-local-docs: Git does not track this project\'s local docs. Decision-home, living-delta and changed-file secret checks cover only paths supplied to this session; review the external docs store directly.']
    : [];
  const findings = [
    ...decisions.findings,
    ...secrets(roots, changedPaths, io, skipped),
    ...livingWithoutDelta(projectDir, changedPaths).map((path) => ({
      rule: SESSION_RULES.living,
      path,
      // The path goes last: the handoff clips a long blocker line from the end, and the fix must survive.
      message: `A living document changed without a delta. ${LIVING_DELTA_FIX_SHORT} Path: ${path}`,
    })),
    ...emptyBriefs(projectDir, io, skipped),
    ...uncommittedWork(facts.uncommitted ?? []),
  ];
  return { findings, info: [`Inbox: ${plural(listFeedback(projectDir).length, 'item')}`, ...decisions.info, ...skipped] };
}
