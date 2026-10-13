import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { approverProblem, fileHash } from './approval.mjs';
import { analyzeCycle } from './analyze.mjs';
import { readCycle } from './cycle.mjs';
import { readFrontmatter, setFrontmatterField } from './frontmatter.mjs';
import { cyclePaths } from './layout.mjs';
import { requiredAt } from './levels.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { readTierData } from './gate.mjs';

export const DESIGN_APPROVAL_FILE = 'design-approval.md';
const HASH = /^[0-9a-f]{64}$/;
const portablePath = (path) => typeof path === 'string' ? path.replaceAll('\\', '/').toLowerCase() : '';
const DECISIONS = ['approved_by', 'approved_on', 'approves', 'cards', 'modules', 'max_iterations', 'max_spawns', 'max_cost', 'cost_unit', 'sweep_rounds'];

export class DesignApprovalError extends Error {
  constructor(message, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'DesignApprovalError';
    this.rule = 'design-approval-refused';
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
      const match = /^([0-9a-f]{64}) (.+)$/.exec(entry);
      return match ? { hash: match[1], path: match[2] } : { hash: null, path: entry };
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

function decisionHash(data, body, cycle) {
  const decision = Object.fromEntries(DECISIONS.map((key) => [key, data[key] ?? null]));
  return createHash('sha256').update(JSON.stringify({ decision, body, cycle: {
    tier: cycle.tier, approvals: cycle.approvals,
    verification_levels: cycle.verification_levels, review_sweeps: cycle.review_sweeps,
  } })).digest('hex');
}

function validPath(path) {
  return typeof path === 'string' && path.startsWith('docs/') && path !== 'docs/' && !path.includes('#');
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
  const approvedPaths = new Map(approved.map(({ path }) => [portablePath(path), path]));
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
      if (!HASH.test(hash ?? '') || hash !== current) problems.push(`${record}: ${path} has no current local_docs_sha256 attestation`);
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
  if (approver) stale.push(`.process/aperture.json (approved_by: ${approver})`);
  const cycleData = readCycle(projectDir, cycle);
  if (decisionHash(parsed.data, parsed.body, cycleData) !== approval.approval_hash) {
    // Distinguish cycle policy drift from edits to the approval where possible.
    const currentPolicy = fileHash(projectDir, cyclePaths(cycle).brief);
    const brief = approval.approves.find((item) => item.path === cyclePaths(cycle).brief);
    stale.push(brief && brief.hash !== currentPolicy ? 'CYCLE.md' : DESIGN_APPROVAL_FILE);
  }
  for (const item of approval.approves) {
    if (!validPath(item.path) || !HASH.test(item.hash ?? '')) {
      stale.push(`${item.path || 'approved path'} (invalid)`);
      continue;
    }
    const current = fileHash(projectDir, item.path);
    if (current !== item.hash) stale.push(`${item.path} (${current === 'missing' ? 'missing' : 'changed'})`);
  }
  stale.push(...localReviewProblems(projectDir, cycleData, approval.approves));
  return { state: stale.length ? 'stale' : 'fresh', stale: [...new Set(stale)] };
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
export function approveDesign(projectDir, cycle, { by, now = () => new Date() }) {
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
    const portable = typeof path === 'string' ? path.replaceAll('\\', '/').toLowerCase() : '';
    if (!validPath(path) || seen.has(portable)) throw new DesignApprovalError(`Approved path ${String(path)} must be a unique logical docs/... file.`);
    seen.add(portable);
    let hash;
    try { hash = fileHash(projectDir, path); }
    catch (cause) { throw new DesignApprovalError(`Cannot approve ${path}: ${cause.message}`, cause); }
    if (hash === 'missing') throw new DesignApprovalError(`Approved document ${path} is missing. Restore it before approval.`);
    return { hash, path };
  });
  const reviewProblems = localReviewProblems(projectDir, selected, approved);
  if (reviewProblems.length) throw new DesignApprovalError(`Local document review attestation is stale or missing: ${reviewProblems.join('; ')}. Update the selected verification record before approval.`);
  const date = typeof now === 'function' ? now() : now;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new DesignApprovalError('The approval date must be a valid date.');
  let next = replaceList(parsed.text, 'approves', approved.map(({ hash, path }) => `${hash} ${path}`));
  next = setFrontmatterField(next, 'approved_by', by.trim());
  next = setFrontmatterField(next, 'approved_on', date.toISOString().slice(0, 10));
  const data = readFrontmatter(next);
  const signed = decode({ data });
  const body = next.slice(next.indexOf('\n---', 4) + 4);
  const hash = decisionHash(data, body, selected);
  next = setFrontmatterField(next, 'approval_hash', hash);
  writeFileSync(parsed.path, next);
  return { ...signed, approval_hash: hash };
}
