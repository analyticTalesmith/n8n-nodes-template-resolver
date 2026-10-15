import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSecrets } from './checks/secrets.mjs';
import { toLf, writeFileAtomic } from './files.mjs';
import { EPHEMERAL_DIR } from './layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { isoDate } from './time.mjs';

/** Where any session records a skill, agent or team it needed and did not have. Created on the first record. */
export const MISSING_SKILLS_PATH = `${EPHEMERAL_DIR}/missing-skills.md`;
export const KINDS = Object.freeze(['skill', 'agent', 'team']);

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'missing-skills.md');
const HEADER = '| Wanted | Kind | Times | Last asked | Needed when |';
const WANTED_MAX = 80;
const DOING_MAX = 160;

export class MissingSkillError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'MissingSkillError';
  }
}

/** @typedef {{ wanted: string, kind: string, times: number, lastAsked: string, doing: string }} MissingRow */

const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
const keyOf = ({ kind, wanted }) => `${kind}\u0000${wanted.trim().replace(/\s+/g, ' ').toLowerCase()}`;
const render = ({ wanted, kind, times, lastAsked, doing }) => `| ${wanted} | ${kind} | ${times} | ${lastAsked} | ${doing} |`;

/** A one-line value, with the table separator replaced so it cannot split a cell. */
function oneLine(value, what, max) {
  if (typeof value !== 'string' || value.trim() === '') throw new MissingSkillError(`Say ${what}: it must be one non-empty line.`);
  if (/[\r\n]/.test(value)) throw new MissingSkillError(`The ${what} must be one line.`);
  const text = value.trim().replaceAll('|', '/');
  if (text.length > max) throw new MissingSkillError(`The ${what} must be at most ${max} characters. Shorten it.`);
  return text;
}

/** The table inside the log: the lines around it and its rows (unreadable lines are kept as text). */
function parse(text, path) {
  const lines = toLf(text).split('\n');
  const header = lines.findIndex((line) => line.trim().replace(/\s+/g, ' ') === HEADER);
  if (header === -1 || !/^\|[\s:|-]+$/.test((lines[header + 1] ?? '').trim())) {
    throw new MissingSkillError(`${path} has no table headed ${HEADER}. Restore it from core/templates/missing-skills.md.`);
  }
  const start = header + 2;
  let end = start;
  while (end < lines.length && lines[end].trim().startsWith('|')) end += 1;
  const rows = [];
  for (const line of lines.slice(start, end)) {
    const [wanted = '', kind = '', times = '', lastAsked = '', doing = ''] = cells(line);
    const count = Number(times);
    rows.push(wanted !== '' && Number.isInteger(count) && count >= 0 ? { wanted, kind, times: count, lastAsked, doing } : { raw: line });
  }
  return { before: lines.slice(0, start), rows, after: lines.slice(end) };
}

function load(projectDir) {
  const roots = resolveProjectRoots(projectDir);
  const file = resolveProjectPath(roots, MISSING_SKILLS_PATH);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : readFileSync(TEMPLATE, 'utf8');
  return { file, parsed: parse(text, MISSING_SKILLS_PATH) };
}

/**
 * Records that a skill, agent or team was needed and did not exist. The same request (kind and name, ignoring letter
 * case and spacing) is counted again, with the date and context of the latest ask.
 * @param {string} projectDir
 * @param {{ wanted: string, kind: string, doing: string }} request
 * @param {{ now?: Date }} [options]
 * @returns {MissingRow}
 * @throws {MissingSkillError} on a bad field or a log without its table
 */
export function recordMissing(projectDir, { wanted, kind, doing }, { now = new Date() } = {}) {
  if (!KINDS.includes(kind)) throw new MissingSkillError(`Unknown kind ${JSON.stringify(kind)}. Use one of: ${KINDS.join(', ')}.`);
  const name = oneLine(wanted, 'what was wanted (wanted)', WANTED_MAX);
  const context = oneLine(doing, 'what you were doing when you needed it (doing)', DOING_MAX);
  const [hit] = checkSecrets({ addedLines: [{ path: MISSING_SKILLS_PATH, line: 1, text: `${name} ${context}` }] });
  if (hit) throw new MissingSkillError(`${hit.message} Nothing was recorded.`);
  const { file, parsed } = load(projectDir);
  const lastAsked = isoDate(now);
  const probe = { wanted: name, kind };
  let row = parsed.rows.find((candidate) => candidate.raw === undefined && keyOf(candidate) === keyOf(probe));
  if (row === undefined) {
    row = { wanted: name, kind, times: 0, lastAsked, doing: context };
    parsed.rows.push(row);
  }
  row.times += 1;
  row.lastAsked = lastAsked;
  row.doing = context;
  const body = parsed.rows.map((entry) => (entry.raw === undefined ? render(entry) : entry.raw));
  writeFileAtomic(file, [...parsed.before, ...body, ...parsed.after].join('\n'));
  return { ...row };
}

/**
 * The recorded requests, most asked first, then by name. Empty when nothing was recorded yet.
 * @param {string} projectDir
 * @returns {MissingRow[]}
 */
export function listMissing(projectDir) {
  return load(projectDir).parsed.rows
    .filter((row) => row.raw === undefined)
    .sort((a, b) => b.times - a.times || (a.wanted.toLowerCase() < b.wanted.toLowerCase() ? -1 : 1))
    .map((row) => ({ ...row }));
}
