import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CARD_FILES, cardFile, isProcessPath } from './card-files.mjs';
import { fileAtCommit } from './git.mjs';
import { readContractFile } from './contract.mjs';
import { BACKLOG_DIR, COLUMNS, cycleColumn } from './layout.mjs';
import { designContextPaths, designContextProblem } from './checks/reviewer-brief.mjs';
import { checkSecrets } from './checks/secrets.mjs';
import { isTestPath } from './checks/test-amendments.mjs';
import { resolveProjectPath } from './project-roots.mjs';

/**
 * The parts a review packet and an evaluator package have in common: the brief text, the design context, the frozen
 * tests, the contract blocks and the secret scan. Both generators build their sections from these, so a change here
 * reaches the Codex reviewer and the verification team together.
 */

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */

export const PACKET_MAX_BYTES = 409600;

export { designContextPaths };
export const lf = (text) => String(text).replaceAll('\r\n', '\n');

/** A fence one backtick longer than the longest run inside the text (three at least). */
export function fenced(text, language = '') {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}${language}\n${text.endsWith('\n') || text === '' ? text : `${text}\n`}${fence}`;
}

/**
 * The reviewer brief of a card read with LF line ends, or '' when it does not exist. The packet and its staleness
 * check both hash this text.
 * @param {string} projectDir
 * @param {string} id
 * @returns {string}
 */
export function readBriefText(projectDir, id) {
  try {
    return lf(readFileSync(cardFile(projectDir, id, CARD_FILES.reviewerBrief), 'utf8'));
  } catch (cause) {
    if (cause.code === 'ENOENT') return '';
    throw new Error(`Cannot read the reviewer brief of ${id} (${cause.message}). Repair or replace it.`, { cause });
  }
}

/**
 * The files the brief lists under Design context, read as committed at the base (or from the local store). A path that
 * is forbidden or not readable is a problem, never a throw.
 * @param {{ projectDir: string, roots: { mode: string }, briefText: string, baseSha: string, run: import('./git.mjs').GitRunner }} input
 * @returns {{ contexts: Array<{ path: string, text: string }>, problems: Finding[] }}
 */
export function readDesignContexts({ projectDir, roots, briefText, baseSha, run }) {
  const shortBase = baseSha.slice(0, 7);
  /** @type {Finding[]} */
  const problems = [];
  /** @type {Array<{ path: string, text: string }>} */
  const contexts = [];
  for (const raw of designContextPaths(briefText)) {
    const forbidden = designContextProblem(raw);
    if (forbidden) {
      problems.push({ ...forbidden, rule: 'packet-context-forbidden' });
      continue;
    }
    const path = raw.replaceAll('\\', '/').replace(/^(\.\/)+/, '');
    const local = roots.mode === 'local' && path.startsWith('docs/');
    const text = local ? (existsSync(resolveProjectPath(/** @type {any} */ (roots), path)) ? readFileSync(resolveProjectPath(/** @type {any} */ (roots), path), 'utf8') : null) : fileAtCommit(projectDir, baseSha, path, run);
    if (text === null) {
      const where = roots.mode === 'local' ? ' Restore the local document store or fix the path.' : existsSync(join(resolve(projectDir), path)) ? ` It exists only in the working tree; commit it before the move to in progress.` : '';
      problems.push({ rule: 'packet-context-missing', message: `Design context path ${raw} is not a file ${local ? 'in the local store' : `at the base commit ${shortBase}`}.${where} Fix the path in the reviewer brief's Design context list.`, path: raw });
    } else contexts.push({ path, text });
  }
  return { contexts, problems };
}

/** The most file text the frozen tests section holds, in bytes. A human decision. */
export const FROZEN_TESTS_MAX_BYTES = 98304;

/** Under this many bytes left, a file is named as not shown instead of being cut to a stub. */
const FROZEN_TESTS_MIN_ROOM = 1024;

const GLOB_CHARACTERS = /[*?[\]{}]/;

/** A project-relative path with forward slashes: no leading dash or slash, no drive or control character, no empty, dot or dot-dot segment. */
const isPlainRelativePath = (path) =>
  path !== '' && !path.startsWith('-') && !path.startsWith('/') && !path.includes(':') && !/[\u0000-\u001f]/.test(path) && path.split('/').every((part) => part !== '' && part !== '.' && part !== '..');

/**
 * The test files a card names, in order: the entries of its gate argv, then the paths of its criteria's traces (the part
 * before "#"). A candidate is kept when isTestPath accepts it, it is project-relative with no glob character, and it is
 * not under docs/ephemeral. Each path once.
 * @param {{ gate?: unknown, criteria?: Array<{ traces?: unknown }> }} card
 * @returns {string[]}
 */
export function frozenTestPaths(card) {
  const gate = Array.isArray(card.gate) ? card.gate : [];
  const traces = (card.criteria ?? []).flatMap((criterion) => (Array.isArray(criterion?.traces) ? criterion.traces : []).map((trace) => (typeof trace === 'string' ? trace.split('#')[0] : trace)));
  const kept = [...gate, ...traces]
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.replaceAll('\\', '/').replace(/^(\.\/)+/, ''))
    .filter((path) => isPlainRelativePath(path) && !GLOB_CHARACTERS.test(path) && !isProcessPath(path) && isTestPath(path));
  return [...new Set(kept)];
}

/**
 * The frozen tests section: each test file the card names, as committed at the base commit (never the working tree),
 * within one cap for the whole section. `text` is null when the card names no test file.
 * @param {string} projectDir
 * @param {unknown} card
 * @param {string} baseSha
 * @param {import('./git.mjs').GitRunner} run
 * @param {string} [wording] the sentence that tells the reader how to use the tests
 * @returns {{ text: string | null, shown: string[], truncated: string[], missing: string[], notShown: string[] }}
 */
export function frozenTestsSection(projectDir, card, baseSha, run, wording = 'Judge the diff against them; a change to one of them in section 4 is a deviation from the plan, so report it.') {
  const result = { text: null, shown: [], truncated: [], missing: [], notShown: [] };
  const named = frozenTestPaths(/** @type {any} */ (card));
  if (named.length === 0) return result;
  let room = FROZEN_TESTS_MAX_BYTES;
  const files = [];
  for (const path of named) {
    const content = fileAtCommit(projectDir, baseSha, path, run);
    if (content === null) {
      result.missing.push(path);
      continue;
    }
    const total = Buffer.byteLength(content, 'utf8');
    if (total <= room) {
      room -= total;
      result.shown.push(path);
      files.push(`### ${path} (frozen)\n\n${fenced(content)}`);
      continue;
    }
    const cut = room < FROZEN_TESTS_MIN_ROOM ? -1 : Buffer.from(content, 'utf8').subarray(0, room).lastIndexOf(10);
    if (cut === -1) {
      result.notShown.push(path);
      room = 0;
      continue;
    }
    const part = Buffer.from(content, 'utf8').subarray(0, cut + 1);
    result.shown.push(path);
    result.truncated.push(path);
    files.push(`### ${path} (frozen, truncated)\n\n${fenced(part.toString('utf8'))}\n\nTruncated: showing the first ${part.length} of ${total} bytes (section cap ${FROZEN_TESTS_MAX_BYTES} bytes).`);
    room = 0;
  }
  const names = (paths) => paths.map((path) => `\`${path}\``).join(', ');
  result.text = [
    '## Frozen tests (read-only)',
    `These test files were committed before the work began, at base ${baseSha.slice(0, 7)}. They are part of the plan, not the builder's reasoning. ${wording}`,
    ...files,
    ...(result.missing.length ? [`Named by the card but not at the base commit (the implementer's own tests, never frozen): ${names(result.missing)}.`] : []),
    ...(result.notShown.length ? [`Not shown, section cap reached: ${names(result.notShown)}.`] : []),
  ].join('\n\n');
  return result;
}

/**
 * The criteria, must-not and manifest blocks both generators print, from the same card and objective, so the labels
 * (c1, m1) mean the same thing in a package and a packet.
 * @param {{ criteria: Array<{ verify: string, text: string }>, manifest: { add: string[], remove: string[], edit: string[] }, files_scope: string[] }} card
 * @param {{ projectGoal: string, cycleGoal: string, cardGoal: string, mustNots: string[] }} objective
 */
export function contractBlocks(card, objective) {
  const list = (name, items) => `- ${name}: ${items.length ? items.map((item) => `\`${item}\``).join(', ') : 'none'}`;
  const criteria = card.criteria.map((c, i) => `- c${i + 1} (verify: ${c.verify}): ${c.text}`);
  const mustNots = objective.mustNots.map((text, i) => `- m${i + 1}: ${text}`);
  return {
    objective: `### Objective\n\nProject goal: ${objective.projectGoal}\nCycle goal: ${objective.cycleGoal}\nCard goal: ${objective.cardGoal}`,
    criteria: `### Criteria\n\n${criteria.length ? criteria.join('\n') : 'No criteria.'}`,
    mustNots: `### Must not\n\n${mustNots.length ? mustNots.join('\n') : 'No must-nots.'}`,
    manifest: `### Manifest and scope\n\n${[list('add', card.manifest.add), list('remove', card.manifest.remove), list('edit', card.manifest.edit), list('files_scope', card.files_scope)].join('\n')}`,
  };
}

/**
 * Secret-shaped text in the sections of a document that may leave this machine, as findings; the caller refuses to
 * write when any come back. `noun` is how the message names the document.
 * @param {Array<{ key: string, number: number | null, text: string }>} sections
 * @param {{ file: string, noun: string, sources: string }} options
 * @returns {Finding[]}
 */
export function secretFindings(sections, { file, noun, sources }) {
  /** @type {Finding[]} */
  const secrets = [];
  let lineNo = 1;
  for (const { key, number, text } of sections) {
    const rows = text.split('\n');
    const hits = checkSecrets({ addedLines: rows.map((row, i) => ({ path: file, line: lineNo + i, text: row })) });
    for (const hit of hits) {
      const [, name = 'secret'] = /looks like a (\S+) secret/.exec(hit.message) ?? [];
      const line = /line (\d+)/.exec(hit.message)?.[1];
      const where = number === null ? key : `section ${number} (${key})`;
      secrets.push({
        rule: 'packet-secret',
        message: `The ${noun} would carry ${name}-shaped text in ${where}, ${noun} line ${line}. Remove it from the source (${sources}) and rotate it if it was ever real; the ${noun} may leave this machine, so nothing was written.`,
        path: file,
      });
    }
    lineNo += rows.length + 1;
  }
  return secrets;
}

/** Project-relative folders the card may have sat in: every column of its cycle, or the global backlog. */
const baseFolders = (cycle, id) => (cycle === null ? [`${BACKLOG_DIR}/${id}`] : COLUMNS.map((column) => `${cycleColumn(cycle, column)}/${id}`));

/**
 * The text of a contract file (card.md) as it stood at the base commit, so the builder cannot change the contract the
 * evaluator judges against; the card folder may have sat in any column of its cycle then. In a local document store the
 * working copy is the only copy. Null when there is none.
 * @param {{ projectDir: string, roots: { mode: string }, id: string, cycle: string | null, name: string, baseSha: string, run: import('./git.mjs').GitRunner }} input
 * @returns {string | null}
 */
export function contractAtBase({ projectDir, roots, id, cycle, name, baseSha, run }) {
  if (roots.mode === 'local') return readContractFile(projectDir, id, name)?.text ?? null;
  return baseFolders(cycle, id).map((folder) => fileAtCommit(projectDir, baseSha, `${folder}/${name}`, run)).find((text) => text !== null) ?? null;
}
