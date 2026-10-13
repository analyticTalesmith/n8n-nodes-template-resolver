import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { checkSecrets } from './checks/secrets.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/**
 * @typedef {{
 *   goal: string, plan: string, state: string[], next: string[], blockers: string[],
 *   decisions: Array<{ text: string, link: string }>, verify: { command: string, result: string },
 *   readFirst: string[], doNotRedo: string[]
 * }} HandoffFields
 * @typedef {{
 *   name: string, date: string, branch: string, commit: string, uncommitted: number, board: string[], autoBlockers: string[], sessionInfo?: string[]
 * }} HandoffFacts
 */

export const HANDOFF_ROOT = 'docs/ephemeral/handoffs';
export const HANDOFF_MAX_LINES = 60;
export const AUTO_BLOCKERS_MAX = 3;
export const HANDOFF_SECTIONS = Object.freeze([
  'Goal',
  'Plan',
  'Branch and commit',
  'State',
  'Next actions',
  'Blockers',
  'Decisions',
  'Verify',
  'Read first',
  'Do not redo',
  'Board',
]);

const FENCE_MAX_LINES = 10;
const LINE_MAX_CHARS = 200;
const DEFAULT_PATH = `${HANDOFF_ROOT}/handoff.md`;

const items = (entries) => (entries.length ? entries.map((entry) => `- ${entry}`) : ['- none']);

/**
 * The handoff text: a title, then every section of HANDOFF_SECTIONS in order. Auto blockers beyond
 * AUTO_BLOCKERS_MAX collapse into one count line.
 * @param {HandoffFields} fields
 * @param {HandoffFacts} facts
 * @returns {string}
 */
export function renderHandoff(fields, facts) {
  const auto = facts.autoBlockers;
  const blockers = [
    ...fields.blockers,
    ...auto.slice(0, AUTO_BLOCKERS_MAX),
    ...(auto.length > AUTO_BLOCKERS_MAX ? [`and ${auto.length - AUTO_BLOCKERS_MAX} more: run validate and session-check`] : []),
  ];
  /** @type {Record<string, string[]>} */
  const body = {
    Goal: [fields.goal],
    Plan: [fields.plan],
    'Branch and commit': [
      `Branch: ${facts.branch}`,
      `Commit: ${facts.commit} (read git log from here; later changes are authoritative)`,
      `Uncommitted changes: ${facts.uncommitted} files`,
    ],
    State: items([...fields.state, ...(facts.sessionInfo ?? [])]),
    'Next actions': items(fields.next),
    Blockers: items(blockers),
    Decisions: items(fields.decisions.map(({ text, link }) => `${text} (${link})`)),
    Verify: [`Command: ${fields.verify.command}`, `Last result: ${fields.verify.result}`],
    'Read first': items(fields.readFirst),
    'Do not redo': items(fields.doNotRedo),
    Board: items(facts.board),
  };
  const lines = [`# Handoff: ${facts.name}, ${facts.date}`, ''];
  HANDOFF_SECTIONS.forEach((section, index) => {
    lines.push(`## ${section}`, ...body[section]);
    if (index < HANDOFF_SECTIONS.length - 1) lines.push('');
  });
  return `${lines.join('\n')}\n`;
}

/**
 * Checks the shape of a handoff text: length, sections, raw logs and secrets. Pure; also usable on a hand-edited file.
 * @param {string} text
 * @param {{ path?: string }} [options] the path named in secret findings
 * @returns {Finding[]}
 */
export function checkHandoff(text, { path = DEFAULT_PATH } = {}) {
  /** @type {Finding[]} */
  const findings = [];
  const lines = String(text).replaceAll('\r\n', '\n').replace(/\n$/, '').split('\n');

  if (lines.length > HANDOFF_MAX_LINES) {
    findings.push({
      rule: 'handoff-too-long',
      message: `The handoff has ${lines.length} lines; the maximum is ${HANDOFF_MAX_LINES}. Cut it to what the next session needs and link the rest instead of restating it.`,
      path,
    });
  }

  for (const section of HANDOFF_SECTIONS) {
    if (!lines.includes(`## ${section}`)) {
      findings.push({ rule: 'handoff-section-missing', message: `The handoff has no "## ${section}" section. Add it.`, path });
    }
  }

  let fenceStart = null;
  lines.forEach((line, index) => {
    const number = index + 1;
    if (line.trimStart().startsWith('```')) {
      if (fenceStart === null) {
        fenceStart = number;
      } else {
        const inside = number - fenceStart - 1;
        if (inside > FENCE_MAX_LINES) {
          findings.push({
            rule: 'handoff-raw-log',
            message: `The fenced block at line ${fenceStart} holds ${inside} lines; the maximum is ${FENCE_MAX_LINES}. Remove the pasted output and keep a one-line summary.`,
            path,
          });
        }
        fenceStart = null;
      }
    }
    if (line.length > LINE_MAX_CHARS) {
      findings.push({
        rule: 'handoff-raw-log',
        message: `Line ${number} is ${line.length} characters; the maximum is ${LINE_MAX_CHARS}. Shorten it to a summary.`,
        path,
      });
    }
  });

  const addedLines = lines.map((lineText, index) => ({ path, line: index + 1, text: lineText }));
  for (const hit of checkSecrets({ addedLines })) {
    findings.push({ rule: 'handoff-secret', message: hit.message, path });
  }
  return findings;
}

const TITLE_DATE = /^# Handoff: .*, (\d{4}-\d{2}-\d{2})\s*$/;
const BYTE_ORDER_MARK = 0xfeff;

/** The lines under a `## <name>` heading, up to the next `## ` heading. */
const sectionLines = (lines, name) => {
  const start = lines.indexOf(`## ${name}`);
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return end === -1 ? rest : rest.slice(0, end);
};

/**
 * Commit and next actions read from a handoff's text (sections 'Branch and commit', 'Next actions'). A lone
 * `- none` item reads as no next actions.
 * @param {string} text
 * @returns {{ commit: string | null, next: string[] }}
 */
export function readHandoffFacts(text) {
  const lines = String(text).replaceAll('\r\n', '\n').split('\n');
  const commitLine = sectionLines(lines, 'Branch and commit').find((line) => line.startsWith('Commit:'));
  const commit = commitLine?.match(/^Commit:\s*(\S+)/)?.[1] ?? null;
  const next = sectionLines(lines, 'Next actions')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
  return { commit, next: next.length === 1 && next[0] === 'none' ? [] : next };
}

/**
 * The newest handoff under HANDOFF_ROOT: by the date in its '# Handoff: <name>, <date>' title, then file mtime; a
 * file without a title date ranks after every dated one. null when the folder is missing or holds no .md file.
 * Reads no git, so it stays cheap for a hook that runs at every session start.
 * @param {string} projectDir
 * @returns {{ path: string, commit: string | null, next: string[] } | null}
 */
export function latestHandoff(projectDir) {
  const dir = resolveProjectPath(resolveProjectRoots(projectDir), HANDOFF_ROOT);
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (cause) {
    if (cause.code === 'ENOENT') return null;
    throw cause;
  }
  const candidates = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => {
      const file = join(dir, e.name);
      const text = readFileSync(file, 'utf8');
      const title = text.split(/\r?\n/, 1)[0];
      // An editor may save the file with a UTF-8 byte order mark before the title.
      const date = (title.charCodeAt(0) === BYTE_ORDER_MARK ? title.slice(1) : title).match(TITLE_DATE)?.[1] ?? '';
      return { name: e.name, text, date, mtime: statSync(file).mtimeMs };
    });
  if (candidates.length === 0) return null;
  const [newest] = candidates.sort(
    (a, b) => b.date.localeCompare(a.date) || b.mtime - a.mtime || b.name.localeCompare(a.name),
  );
  return { path: `${HANDOFF_ROOT}/${newest.name}`, ...readHandoffFacts(newest.text) };
}
