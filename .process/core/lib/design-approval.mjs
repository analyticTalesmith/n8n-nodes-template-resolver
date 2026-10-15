import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { approverProblem, fileHash } from './approval.mjs';
import { analyzeCycle } from './analyze.mjs';
import { CONFIG_PATH } from './config.mjs';
import { CycleError, readCycle } from './cycle.mjs';
import { readFrontmatter, setFrontmatterField } from './frontmatter.mjs';
import { isSha256, sha256Bytes, sha256Text, toLf, toPosix } from './files.mjs';
import { cyclePaths } from './layout.mjs';
import { requiredAt } from './levels.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { readTierData } from './gate.mjs';
import { GitError, runGit } from './git.mjs';
import { cardPath } from './board.mjs';
import { registerApprovedDesignPaths, registerDesignApprovalProblem } from './checks/reviewer-brief.mjs';
import { isoDate } from './time.mjs';

export const DESIGN_APPROVAL_FILE = 'design-approval.md';
const portablePath = (path) => typeof path === 'string' ? toPosix(path).toLowerCase() : '';
const DECISIONS = ['approved_by', 'approved_on', 'approves', 'cards', 'modules', 'max_iterations', 'max_spawns', 'max_cost', 'cost_unit', 'sweep_rounds'];

export class DesignApprovalError extends Error {
  constructor(message, cause, diff) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'DesignApprovalError';
    this.rule = 'design-approval-refused';
    if (diff !== undefined) this.diff = diff;
  }
}

function pathOf(projectDir, cycle) {
  return resolveProjectPath(resolveProjectRoots(projectDir), `${cyclePaths(cycle).root}/${DESIGN_APPROVAL_FILE}`);
}

function parse(projectDir, cycle) {
  const path = pathOf(projectDir, cycle);
  if (!existsSync(path)) return null;
  const text = readFileSync(path, 'utf8');
  const data = readFrontmatter(text);
  if (data === null) throw new DesignApprovalError(`${DESIGN_APPROVAL_FILE} has no frontmatter. Restore the template and retry.`);
  const end = text.indexOf('\n---', 4);
  if (end < 0) throw new DesignApprovalError(`${DESIGN_APPROVAL_FILE} has no closing frontmatter fence.`);
  const body = text.slice(end + 4);
  return { path, text, data, body };
}

const list = (value) => Array.isArray(value) ? value : [];
const integer = (value) => value === '' || value === undefined ? null : /^\d+$/.test(String(value)) ? Number(value) : NaN;
const numeric = (value) => value === '' || value === undefined ? null : /^\d+(?:\.\d+)?$/.test(String(value)) ? Number(value) : NaN;

function decode(parsed) {
  const { data } = parsed;
  return {
    summary: data.summary ?? '', approved_by: data.approved_by ?? '', approved_on: data.approved_on ?? '',
    approves: list(data.approves).map((entry) => {
      const text = String(entry);
      return isSha256(text.slice(0, 64)) && text[64] === ' ' && text.length > 65 ? { hash: text.slice(0, 64), path: text.slice(65) } : { hash: null, path: entry };
    }),
    cards: list(data.cards), modules: list(data.modules),
    max_iterations: integer(data.max_iterations), max_spawns: integer(data.max_spawns),
    max_cost: numeric(data.max_cost), cost_unit: data.cost_unit || null,
    sweep_rounds: integer(data.sweep_rounds), approval_hash: data.approval_hash || null,
  };
}

export function readDesignApproval(projectDir, cycle) {
  const parsed = parse(projectDir, cycle);
  return parsed === null ? null : decode(parsed);
}

const CYCLE_BRIEF_PATH = /^docs\/ephemeral\/cycles\/[^/]+\/cycle\.md$/;
const STAGES_HEADING = /^## Stages\s*$/;
const INDEX_START = '<!-- generated index';
const INDEX_END = '<!-- end generated index -->';

/**
 * A cycle brief as it was approved: without the records the cycle writes into it while it runs, which are the body of the
 * Stages section (stage records) and the body of the generated index. Their headings and markers stay, so a renamed or moved
 * section still changes the text. Every other line, the frontmatter policy and all prose included, is kept as it is, and the
 * line ends of the input are kept; a brief with neither part comes back unchanged.
 * @param {string} text
 * @returns {string}
 */
export function approvedCycleText(text) {
  const kept = [];
  let skipping = null;
  for (const line of text.split(/(?<=\n)/)) {
    const bare = line.trimEnd();
    if (skipping === 'stages' && !/^#{1,6} /.test(bare) && !bare.startsWith(INDEX_START)) continue;
    if (skipping === 'index' && !bare.includes(INDEX_END)) continue;
    skipping = null;
    kept.push(line);
    if (STAGES_HEADING.test(bare)) skipping = 'stages';
    else if (bare.startsWith(INDEX_START)) skipping = 'index';
  }
  return kept.join('');
}

/** An approves entry as its file and the heading it names, or null for the whole file. */
export function splitApprovedPath(path) {
  const at = path.indexOf('#');
  return at < 0 ? [path, null] : [path.slice(0, at), path.slice(at + 1).replace(/[ 	]+#+$/, '')];
}

/** The unfenced headings of a text, one entry per line: its level and text with any closing hashes removed, or null for other lines. */
function headingsOf(lines) {
  let fence = null;
  return lines.map((line) => {
    const opener = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence !== null) {
      if (opener && opener[1][0] === fence[0] && opener[1].length >= fence.length) fence = null;
      return null;
    }
    if (opener) {
      fence = opener[1];
      return null;
    }
    const match = /^(#{1,6})[ \t]+(.+?)[ \t]*$/.exec(line.trimEnd());
    return match ? { level: match[1].length, text: match[2].replace(/[ \t]+#+$/, '') } : null;
  });
}

/** The 1-based line numbers of every unfenced heading with exactly this text, at any level. */
export function headingLines(text, heading) {
  return headingsOf(text.split(/(?<=\n)/)).flatMap((found, index) => found?.text === heading ? [index + 1] : []);
}

/**
 * The section a heading names: its heading line and everything up to the next heading of the same or a higher level.
 * Null when no heading has that text, and also when more than one has, since the section would then be ambiguous.
 * @param {string} text
 * @param {string} heading
 * @returns {string | null}
 */
export function sectionText(text, heading) {
  const lines = text.split(/(?<=\n)/);
  const headings = headingsOf(lines);
  const starts = headings.flatMap((found, index) => found?.text === heading ? [index] : []);
  if (starts.length !== 1) return null;
  const [start] = starts;
  const level = headings[start].level;
  let end = start + 1;
  while (end < lines.length && !((headings[end]?.level ?? 7) <= level)) end += 1;
  return lines.slice(start, end).join('');
}

/** The text of a file that a signed approval holds a hash of: the named section, or a cycle brief as approvedCycleText. Null when the section is missing. */
export function approvedBody(path, text) {
  const heading = splitApprovedPath(path)[1];
  if (heading !== null) return sectionText(text, heading);
  return CYCLE_BRIEF_PATH.test(portablePath(path)) ? approvedCycleText(text) : text;
}

/** The hash of a text's exact bytes, which earlier approvals were signed with. */
const sha256 = (text) => sha256Bytes(Buffer.from(text, 'utf8'));
/** The hash newly signed for a text: over its text with line endings as LF, so a checkout that changes them does not stale an approval. */
const textHash = sha256Text;
/** Both hashes a text may be recorded under: the normalised one, and the one over its exact bytes that earlier approvals were signed with. */
const textHashes = (text) => [textHash(text), sha256(text)];

/**
 * The hash a signed approval holds for a path, and every hash that still counts as unchanged. A whole file records its exact
 * bytes and a cycle brief its approved text as it is; a named section records its text with line endings as LF. `accepted`
 * also holds the exact and LF-normalised hashes of the text, so an approval stays fresh when only line endings differ.
 */
function approvedHashes(projectDir, path) {
  const [file] = splitApprovedPath(path);
  const raw = fileHash(projectDir, file);
  if (raw === 'missing') return { current: raw, accepted: [raw] };
  const text = readFileSync(resolveProjectPath(resolveProjectRoots(projectDir), file), 'utf8');
  const heading = splitApprovedPath(path)[1];
  if (heading !== null && headingLines(text, heading).length > 1) return { current: 'ambiguous', accepted: ['ambiguous'] };
  const body = approvedBody(path, text);
  if (body === null) return { current: 'missing', accepted: ['missing'] };
  const section = splitApprovedPath(path)[1] !== null;
  const whole = !section && !CYCLE_BRIEF_PATH.test(portablePath(path));
  const current = whole ? raw : section ? textHash(body) : sha256(body);
  return { current, accepted: [...new Set([current, ...textHashes(body), ...(whole ? [raw] : [])])] };
}

const approvedHash = (projectDir, path) => approvedHashes(projectDir, path).current;

function decisionHash(data, body, cycle) {
  const decision = Object.fromEntries(DECISIONS.map((key) => [key, data[key] ?? null]));
  return sha256Text(JSON.stringify({ decision, body, cycle: {
    tier: cycle.tier, approvals: cycle.approvals,
    verification_levels: cycle.verification_levels, review_sweeps: cycle.review_sweeps,
  } }));
}

function validPath(path) {
  if (typeof path !== 'string') return false;
  const [file, heading] = splitApprovedPath(path);
  return file.startsWith('docs/') && file !== 'docs/' && !file.includes('#') && (heading === null || heading.trim() !== '');
}

/** Selected verification records that cite an approved local document must attest its current bytes. */
function localReviewProblems(projectDir, cycle, approved) {
  const roots = resolveProjectRoots(projectDir);
  if (roots.mode !== 'local') return [];
  const tier = readTierData(projectDir);
  if (tier.findings.length) return tier.findings.map((finding) => finding.message);
  const levels = new Set([...cycle.verification_levels, ...requiredAt(tier.data.test_levels, cycle.tier)]);
  const lenses = new Set([...cycle.review_sweeps, ...requiredAt(tier.data.sweeps, cycle.tier)]);
  if (!levels.size && !lenses.size) return [];
  const folder = resolveProjectPath(roots, cyclePaths(cycle.name).verification);
  const approvedPaths = new Map(approved.map(({ path }) => [portablePath(splitApprovedPath(path)[0]), splitApprovedPath(path)[0]]));
  const problems = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || ['close-review.md', 'INDEX.md'].includes(entry.name)) continue;
    const record = `${cyclePaths(cycle.name).verification}/${entry.name}`;
    const data = readFrontmatter(readFileSync(resolveProjectPath(roots, record), 'utf8')) ?? {};
    if (!(levels.has(data.level) || lenses.has(data.lens))) continue;
    const cited = new Set([
      ...(Array.isArray(data.local_docs) ? data.local_docs : []),
      ...(Array.isArray(data.validates) ? data.validates.map((path) => path.split('#')[0]) : []),
      ...(String(data.scope ?? '').match(/docs\/[A-Za-z0-9_./-]+/g) ?? []),
    ]);
    const relevant = [...new Set([...cited].map((path) => approvedPaths.get(portablePath(path))).filter(Boolean))];
    if (!relevant.length) continue;
    const entries = Array.isArray(data.local_docs_sha256) ? data.local_docs_sha256 : [];
    for (const path of relevant) {
      const recorded = entries.filter((item) => typeof item === 'string' && portablePath(item.slice(0, item.indexOf('='))) === portablePath(path));
      const hash = recorded.length === 1 ? recorded[0].slice(recorded[0].indexOf('=') + 1) : null;
      const current = fileHash(projectDir, path);
      if (!isSha256(hash) || hash !== current) problems.push(`${record}: ${path} has no current local_docs_sha256 attestation`);
    }
  }
  return problems;
}

/** Return the exact reason a signed design no longer applies, without changing it. */
export function designApprovalState(projectDir, cycle) {
  const parsed = parse(projectDir, cycle);
  if (parsed === null) return { state: 'absent', stale: [] };
  const approval = decode(parsed);
  if (!approval.approval_hash || !approval.approved_by || !approval.approved_on) return { state: 'unapproved', stale: [] };
  const stale = [];
  const approver = approverProblem(projectDir, approval.approved_by);
  if (approver) stale.push(`${CONFIG_PATH} (approved_by: ${approver})`);
  const cycleData = readCycle(projectDir, cycle);
  if (decisionHash(parsed.data, parsed.body, cycleData) !== approval.approval_hash) {
    // Distinguish cycle policy drift from edits to the approval where possible.
    const policy = approvedHashes(projectDir, cyclePaths(cycle).brief);
    const brief = approval.approves.find((item) => item.path === cyclePaths(cycle).brief);
    stale.push(brief && !policy.accepted.includes(brief.hash) ? 'CYCLE.md' : DESIGN_APPROVAL_FILE);
  }
  for (const item of approval.approves) {
    if (!validPath(item.path) || !isSha256(item.hash)) {
      stale.push(`${item.path || 'approved path'} (invalid)`);
      continue;
    }
    const { current, accepted } = approvedHashes(projectDir, item.path);
    if (!accepted.includes(item.hash)) stale.push(`${item.path} (${current === 'missing' ? 'missing' : current === 'ambiguous' ? `ambiguous: the heading "${splitApprovedPath(item.path)[1]}" appears more than once` : 'changed'})`);
  }
  stale.push(...localReviewProblems(projectDir, cycleData, approval.approves));
  return { state: stale.length ? 'stale' : 'fresh', stale: [...new Set(stale)] };
}

/**
 * The documents a fresh signed approval covers, keyed by portable file path: who signed, when, and the sections named
 * (null for the whole file). Empty when the cycle has no fresh signed approval.
 * @param {string} projectDir
 * @param {string} cycle
 * `covered(text)` is the part of a file's text the approval signed, or null when a named section is not in it.
 * @returns {Map<string, { by: string, on: string, path: string, headings: Array<string | null>, covered: (text: string) => string | null }>}
 */
export function approvedDesignDocs(projectDir, cycle) {
  const docs = new Map();
  try {
    if (designApprovalState(projectDir, cycle).state !== 'fresh') return docs;
  } catch {
    return docs;
  }
  const { approved_by: by, approved_on: on, approves } = readDesignApproval(projectDir, cycle);
  for (const { path } of approves) {
    const [file, heading] = splitApprovedPath(path);
    const key = portablePath(file);
    const doc = docs.get(key) ?? { by, on, path: file, headings: [], covered: (text) => coveredText(doc.path, doc.headings, text) };
    doc.headings.push(heading);
    docs.set(key, doc);
  }
  return docs;
}

/**
 * Why the cycle's approval state cannot be read, or null when it can (fresh, stale or unapproved alike).
 * @param {string} projectDir
 * @param {string} cycle
 * @returns {string | null}
 */
export function designApprovalProblem(projectDir, cycle) {
  try {
    designApprovalState(projectDir, cycle);
    return null;
  } catch (cause) {
    return plainCause(cause);
  }
}

/** An already-worded error keeps its message; any other failure gets a plain word, with no path, errno text or stack. */
function plainCause(cause) {
  if (cause instanceof CycleError || cause instanceof DesignApprovalError) return cause.message;
  if (cause?.code === 'ENOENT') return `${DESIGN_APPROVAL_FILE} is missing.`;
  if (typeof cause?.code === 'string') return `${DESIGN_APPROVAL_FILE} is unreadable.`;
  return `${DESIGN_APPROVAL_FILE} is malformed.`;
}

function coveredText(path, headings, text) {
  const parts = headings.map((heading) => approvedBody(heading === null ? path : `${path}#${heading}`, text));
  return parts.includes(null) ? null : parts.join('\n');
}

/**
 * The portable, lower-cased files of the fresh signed design approval of the cycle a card belongs to; empty when it has
 * no cycle or no such approval.
 * @param {string} projectDir
 * @param {string} id
 * @returns {Set<string>}
 */
export function approvedDesignPaths(projectDir, id) {
  const cycle = cardPath(projectDir, id)?.cycle ?? null;
  return new Set(cycle === null ? [] : approvedDesignDocs(projectDir, cycle).keys());
}

/**
 * Why the approval state of the cycle a card belongs to cannot be read, or null when it can or the card has no cycle.
 * The one place that turns an approval-state failure into the cause every refusal of a design context path names.
 * @param {string} projectDir
 * @param {string} id
 * @returns {string | null}
 */
export function designApprovalProblemOfCard(projectDir, id) {
  const cycle = cardPath(projectDir, id)?.cycle ?? null;
  return cycle === null ? null : designApprovalProblem(projectDir, cycle);
}

registerApprovedDesignPaths(approvedDesignPaths);
registerDesignApprovalProblem(designApprovalProblemOfCard);

const CONTEXT_LINES = 3;

/** A unified diff of two texts, empty when they match. */
function unifiedDiff(from, to, fromLabel, toLabel) {
  const lines = (text) => toLf(text).replace(/\n$/, '').split('\n');
  const a = lines(from);
  const b = lines(to);
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1;
  const am = a.slice(head, a.length - tail);
  const bm = b.slice(head, b.length - tail);
  const table = Array.from({ length: am.length + 1 }, () => new Uint32Array(bm.length + 1));
  for (let i = am.length - 1; i >= 0; i -= 1) {
    for (let j = bm.length - 1; j >= 0; j -= 1) table[i][j] = am[i] === bm[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const ops = a.slice(0, head).map((line) => [' ', line]);
  let i = 0;
  let j = 0;
  while (i < am.length || j < bm.length) {
    if (i < am.length && j < bm.length && am[i] === bm[j]) {
      ops.push([' ', am[i]]);
      i += 1;
      j += 1;
    } else if (j < bm.length && (i === am.length || table[i][j + 1] >= table[i + 1][j])) ops.push(['+', bm[j++]]);
    else ops.push(['-', am[i++]]);
  }
  ops.push(...a.slice(a.length - tail).map((line) => [' ', line]));
  const changed = ops.flatMap(([kind], index) => (kind === ' ' ? [] : [index]));
  const hunks = [];
  for (const index of changed) {
    const last = hunks.at(-1);
    if (last && index - last.end <= 2 * CONTEXT_LINES + 1) last.end = index;
    else hunks.push({ start: index, end: index });
  }
  const body = hunks.map(({ start, end }) => {
    const first = Math.max(0, start - CONTEXT_LINES);
    const slice = ops.slice(first, Math.min(ops.length, end + CONTEXT_LINES + 1));
    const before = ops.slice(0, first);
    const count = (list, skip) => list.filter(([kind]) => kind !== skip).length;
    return [`@@ -${count(before, '+') + 1},${count(slice, '+')} +${count(before, '-') + 1},${count(slice, '-')} @@`, ...slice.map(([kind, line]) => `${kind}${line}`)].join('\n');
  });
  return body.length ? [`--- ${fromLabel}`, `+++ ${toLabel}`, ...body].join('\n') : '';
}

/** The text an approves entry had when it was signed, found in the git history of its file by the hash recorded then; null when no commit holds it. */
function earlierBody(projectDir, path, hash) {
  const [file] = splitApprovedPath(path);
  try {
    for (const commit of runGit(projectDir, ['log', '--format=%H', '--', file]).split('\n').filter(Boolean)) {
      const body = approvedBody(path, runGit(projectDir, ['show', `${commit}:./${file}`]));
      if (body !== null && textHashes(body).includes(hash)) return body;
    }
  } catch (cause) {
    if (!(cause instanceof GitError)) throw cause;
  }
  return null;
}

/** What changed in one approved document or section since it was signed: a unified diff, or the two hashes when the old text is gone. */
function changeDiff(projectDir, { hash, path }, current) {
  const earlier = earlierBody(projectDir, path, hash);
  if (earlier === null) return `${path}: no earlier text found for the approved hash ${hash}; it now hashes to ${current}.`;
  const [file] = splitApprovedPath(path);
  const now = approvedBody(path, readFileSync(resolveProjectPath(resolveProjectRoots(projectDir), file), 'utf8'));
  return unifiedDiff(earlier, now, `${path} (approved)`, `${path} (now)`)
    || `${path}: only whitespace, line endings or the final newline changed since it was approved; the approved hash ${hash} is now ${textHash(now)}.`;
}

function replaceList(text, key, entries) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${key}:`).test(line));
  if (start < 0) throw new DesignApprovalError(`${DESIGN_APPROVAL_FILE} needs ${key} in its frontmatter.`);
  let end = start + 1;
  if (lines[start].trimEnd().endsWith('[') && !lines[start].includes(']')) {
    while (end < lines.length && !lines[end].includes(']')) end += 1;
    end += 1;
  } else if (lines[start].replace(/^[^:]+:\s*/, '').trim() === '') {
    while (end < lines.length && /^\s*-\s/.test(lines[end])) end += 1;
  }
  lines.splice(start, end - start, `${key}:`, ...entries.map((entry) => `- ${entry}`));
  return lines.join(text.includes('\r\n') ? '\r\n' : '\n');
}

/** The explicit human step. It changes only the approval document. */
export function approveDesign(projectDir, cycle, { by, now = () => new Date(), acceptChanges = false }) {
  const selected = readCycle(projectDir, cycle);
  if (selected.approvals !== 'front') throw new DesignApprovalError(`Cycle ${cycle} uses approvals ${selected.approvals}; design approval requires front placement.`);
  const problem = approverProblem(projectDir, by);
  if (problem) throw new DesignApprovalError(problem);
  const parsed = parse(projectDir, cycle);
  if (parsed === null) throw new DesignApprovalError(`Create ${DESIGN_APPROVAL_FILE} from the template before approving.`);
  const approval = decode(parsed);
  for (const key of ['approves', 'cards', 'modules']) {
    if (!Array.isArray(parsed.data[key]) || parsed.data[key].some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
      throw new DesignApprovalError(`${key} in design-approval.md must be a list of non-empty names or paths.`);
    }
  }
  if (!Number.isSafeInteger(approval.max_iterations) || approval.max_iterations <= 0 ||
      !Number.isSafeInteger(approval.max_spawns) || approval.max_spawns <= 0) {
    throw new DesignApprovalError('Set positive max_iterations and max_spawns in design-approval.md before approving.');
  }
  if (!Number.isSafeInteger(approval.sweep_rounds) || approval.sweep_rounds <= 0) throw new DesignApprovalError('Set positive sweep_rounds before approving.');
  if (approval.max_cost !== null && (!Number.isFinite(approval.max_cost) || approval.max_cost <= 0 || !approval.cost_unit)) {
    throw new DesignApprovalError('max_cost needs a positive amount and cost_unit, or leave both blank.');
  }
  if (approval.max_cost === null && approval.cost_unit) throw new DesignApprovalError('cost_unit needs max_cost, or leave both blank.');
  if (approval.approves.length === 0) throw new DesignApprovalError('List the approved documents in approves before approval.');
  if (!approval.approves.some(({ path }) => path === cyclePaths(cycle).brief)) {
    throw new DesignApprovalError(`List ${cyclePaths(cycle).brief} in approves so the cycle policy is bound to its approved bytes.`);
  }
  const findings = analyzeCycle(projectDir, cycle);
  if (findings.length) throw new DesignApprovalError(`Analyze ${cycle} reports: ${findings.map((finding) => `${finding.rule}: ${finding.message}`).join('; ')}. Resolve these before approval.`);
  const seen = new Set();
  const approved = approval.approves.map(({ path }) => {
    const portable = typeof path === 'string' ? toPosix(path).toLowerCase() : '';
    if (!validPath(path) || seen.has(portable)) throw new DesignApprovalError(`Approved path ${String(path)} must be a unique logical docs/... file.`);
    seen.add(portable);
    let hashes;
    try { hashes = approvedHashes(projectDir, path); }
    catch (cause) { throw new DesignApprovalError(`Cannot approve ${path}: ${cause.message}`, cause); }
    if (hashes.current === 'ambiguous') {
      const [file, heading] = splitApprovedPath(path);
      const lines = headingLines(readFileSync(resolveProjectPath(resolveProjectRoots(projectDir), file), 'utf8'), heading);
      throw new DesignApprovalError(`Approved section ${path} is ambiguous: the heading "${heading}" appears on lines ${lines.join(' and ')}. Make it unique before approval.`);
    }
    if (hashes.current === 'missing') throw new DesignApprovalError(`Approved ${splitApprovedPath(path)[1] === null ? 'document' : 'section (heading)'} ${path} is missing. Restore it before approval.`);
    return { hash: hashes.current, path, accepted: hashes.accepted };
  });
  if (approval.approval_hash && !acceptChanges) {
    const diffs = approval.approves
      .map((item, index) => ({ item, current: approved[index].hash, accepted: approved[index].accepted }))
      .filter(({ item, accepted }) => isSha256(item.hash) && !accepted.includes(item.hash))
      .map(({ item, current }) => changeDiff(projectDir, item, current));
    if (diffs.length) {
      const diff = diffs.join('\n\n');
      throw new DesignApprovalError(`Approved text changed since the last approval:\n\n${diff}\n\nRun again with --accept-changes to sign these changes.`, undefined, diff);
    }
  }
  const reviewProblems = localReviewProblems(projectDir, selected, approved);
  if (reviewProblems.length) throw new DesignApprovalError(`Local document review attestation is stale or missing: ${reviewProblems.join('; ')}. Update the selected verification record before approval.`);
  const date = typeof now === 'function' ? now() : now;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new DesignApprovalError('The approval date must be a valid date.');
  let next = replaceList(parsed.text, 'approves', approved.map(({ hash, path }) => `${hash} ${path}`));
  next = setFrontmatterField(next, 'approved_by', by.trim());
  next = setFrontmatterField(next, 'approved_on', isoDate(date));
  const data = readFrontmatter(next);
  const signed = decode({ data });
  const body = next.slice(next.indexOf('\n---', 4) + 4);
  const hash = decisionHash(data, body, selected);
  next = setFrontmatterField(next, 'approval_hash', hash);
  writeFileSync(parsed.path, next);
  return { ...signed, approval_hash: hash };
}
