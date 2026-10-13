import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { listCards } from './board.mjs';
import { userDocsOf } from './card.mjs';
import { sectionBody } from './contract.mjs';
import { CycleError, cycleEvidence, readCycle } from './cycle.mjs';
import { readFrontmatter } from './frontmatter.mjs';
import { CycleNameError, cyclePaths } from './layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { parseStateRows } from './verdicts.mjs';

export class RcPacketError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'RcPacketError';
  }
}

const DONE = '06_done';
const PACKET = 'rc-packet.md';
const NOT_RECORDS = new Set(['INDEX.md', 'close-review.md', PACKET]);
const cell = (value) => String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim() || '-';
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const table = (header, rows) => [`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`)];

/** The non-empty lines of a `## heading` section, list markers and comments removed; `none` lines dropped. */
function sectionLines(body, heading) {
  const start = body.split('\n').findIndex((line) => line.trimEnd() === `## ${heading}`);
  if (start === -1) return [];
  const lines = body.split('\n').slice(start + 1);
  const end = lines.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? lines : lines.slice(0, end))
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter((line) => line !== '' && !line.startsWith('<!--') && !/^(none|n\/a|no known issues)[.!]?$/i.test(line));
}

/** The rows of a record's Conformance state table (the shape of the verification template). */
const stateRows = (record) => parseStateRows(sectionBody(record.body, 'Conformance') ?? '').filter((row) => row.id !== '' && row.state !== '');

/** A record's evidence tier: the one it declares, else the tiers of its conformance rows, else "not recorded". */
function evidenceTier(record) {
  const declared = text(record.data.evidence_tier);
  if (declared) return declared;
  const tiers = [...new Set(stateRows(record).map((row) => row.tier).filter((tier) => tier !== ''))];
  return tiers.length ? tiers.join(', ') : 'not recorded';
}

/** Locates and reads the cycle's verification records (every Markdown file there except the close review and indexes). */
function readRecords(projectDir, name) {
  const roots = resolveProjectRoots(projectDir);
  const folder = resolveProjectPath(roots, cyclePaths(name).verification);
  let files = [];
  try {
    files = readdirSync(folder, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.md') && !NOT_RECORDS.has(e.name)).map((e) => e.name).sort();
  } catch {
    files = [];
  }
  const read = (file) => readFileSync(resolveProjectPath(roots, `${cyclePaths(name).verification}/${file}`), 'utf8');
  const records = files.map((file) => {
    const body = read(file);
    return { id: file.slice(0, -3), file, body, data: readFrontmatter(body) ?? {} };
  });
  let closeReview = '';
  try {
    closeReview = read('close-review.md');
  } catch {
    closeReview = '';
  }
  return { records, closeReview };
}

function levelsSection(projectDir, name, records) {
  let evidence;
  try {
    evidence = cycleEvidence(projectDir, name);
  } catch (cause) {
    return [`Not computed: ${cause.message}`];
  }
  const { levels, lenses, signoff } = evidence.required;
  if (levels.length === 0 && lenses.length === 0) return ['None required: the cycle selects no level or review lens and its tier requires none.'];
  const rows = [
    ...levels.map((level) => ['level', level, records.filter((r) => r.data.level === level).map((r) => r.id).join(', ') || '-']),
    ...lenses.map((lens) => ['lens', lens, records.filter((r) => r.data.lens === lens).map((r) => r.id).join(', ') || '-']),
  ].map(([kind, item, ran]) => {
    const gaps = evidence.gaps.filter((g) => g.kind === kind && g.name === item).map((g) => g.problem);
    return [kind, item, ran, gaps.length ? gaps.join(', ') : 'met'];
  });
  return [`Human sign-off required: ${signoff ? 'yes' : 'no'}.`, '', ...table(['Kind', 'Required', 'Run in', 'Status'], rows)];
}

/**
 * Composes the release-candidate evidence packet for a cycle as Markdown. Reads only. A user-visible done card gives
 * one changelog draft entry made from its title; the card ids stay in the separate sources section, never in the draft.
 * @param {string} projectDir
 * @param {string} name
 * @returns {string}
 */
export function composeRcPacket(projectDir, name) {
  let cycle;
  try {
    cycle = readCycle(projectDir, name);
  } catch (cause) {
    if (cause instanceof CycleError || cause instanceof CycleNameError) throw new RcPacketError(cause.message, { cause });
    throw cause;
  }
  const { records, closeReview } = readRecords(projectDir, name);
  const cards = listCards(projectDir).filter((entry) => entry.cycle === name);
  const visible = cards.filter((entry) => entry.card.user_visible === true);
  const done = visible.filter((entry) => entry.column === DONE).map((entry) => entry.card).sort((a, b) => (a.id < b.id ? -1 : 1));
  const open = visible.length - done.length;

  const ids = records.flatMap((r) => [
    ...stateRows(r).map((row) => [row.id, row.state, r.id]),
    ...sectionLines(r.body, 'Conformance').flatMap((line) => {
      const match = /^`([^`]+)`\s+([A-Za-z][A-Za-z-]*)/.exec(line);
      return match ? [[match[1], match[2].toLowerCase(), r.id]] : [];
    }),
  ]);
  const issues = [
    ...sectionLines(closeReview, 'Known issues').map((line) => `- ${line} (close review)`),
    ...records.flatMap((r) => sectionLines(r.body, 'Known issues').map((line) => `- ${line} (${r.id})`)),
  ];
  const entries = done.map((card) => {
    const title = text(card.title);
    return title.charAt(0).toUpperCase() + title.slice(1);
  });

  const out = [
    '---',
    `summary: ${`Release-candidate evidence for cycle ${name}: ${records.length} record${records.length === 1 ? '' : 's'}, ${done.length} user-visible card${done.length === 1 ? '' : 's'}.`.slice(0, 160)}`,
    '---',
    `# Release-candidate evidence: ${name}`,
    '',
    `Cycle ${name}, tier ${cycle.tier}, status ${cycle.status}. Generated from the verification records and the close review; regenerate with \`rc-packet.mjs\` rather than editing figures by hand. A person reads this with the close review.`,
    '',
    '## Levels',
    '',
    ...levelsSection(projectDir, name, records),
    '',
    '## Evidence',
    '',
    ...(records.length === 0
      ? ['No verification records in the cycle.']
      : table(['Record', 'Stream', 'Level or lens', 'Verdict', 'Result', 'Evidence tier', 'Ran against'], records.map((r) => [
        r.id, r.data.stream, r.data.level || r.data.lens || '-', r.data.verdict, r.data.result, evidenceTier(r), text(r.data.ran_against).slice(0, 7),
      ]))),
    '',
    '## Checked ids',
    '',
    ...(ids.length === 0 ? ['No checked ids found in the records.'] : table(['Id', 'Status', 'Record'], ids)),
    '',
    '## Known issues',
    '',
    ...(issues.length === 0 ? ['None recorded.'] : issues),
    '',
    '## User-visible cards',
    '',
    ...(done.length === 0 ? ['No done card is marked user visible.'] : table(['Card', 'Title', 'User documents', 'Waiver'], done.map((card) => [card.id, card.title, userDocsOf(card).join(', ') || '-', card.user_docs_waiver || '-']))),
    ...(open > 0 ? ['', `${open} user-visible card${open === 1 ? ' is' : 's are'} not done and ${open === 1 ? 'is' : 'are'} left out of the changelog draft.`] : []),
    '',
    '## Changelog draft',
    '',
    'Published text. Rewrite each entry for the reader from the built documents, as the `changelog` and `release-notes` types of the `deliverables` skill say; keep card ids out of it.',
    '',
    ...(entries.length === 0 ? ['No entries.'] : entries.map((entry, i) => `${i + 1}. ${entry}`)),
    '',
    '## Changelog sources',
    '',
    'Not for publication. The card behind each draft entry.',
    '',
    ...(entries.length === 0 ? ['No entries.'] : done.map((card, i) => `${i + 1}. ${card.id}`)),
    '',
  ];
  return out.join('\n');
}

/**
 * Writes the packet to the cycle's verification folder. An existing packet is kept unless force is set.
 * @param {string} projectDir
 * @param {string} name
 * @param {{ force?: boolean }} [options]
 * @returns {{ path: string }} the project-relative path
 */
export function writeRcPacket(projectDir, name, { force = false } = {}) {
  const content = composeRcPacket(projectDir, name);
  const logical = `${cyclePaths(name).verification}/${PACKET}`;
  const file = resolveProjectPath(resolveProjectRoots(projectDir), logical);
  if (existsSync(file) && !force) throw new RcPacketError(`${logical} already exists. Pass --force to regenerate it; a regenerated packet replaces any edits.`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return { path: logical };
}
