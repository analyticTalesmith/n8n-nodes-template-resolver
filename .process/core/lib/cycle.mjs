import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approverProblem } from './approval.mjs';
import { CONFIG_PATH, ConfigError, readConfig } from './config.mjs';
import { designApprovalState } from './design-approval.mjs';
import { readFrontmatter, setFrontmatterField } from './frontmatter.mjs';
import { changedSince, headCommit, isAncestorCommit, runGit } from './git.mjs';
import { readTierData } from './gate.mjs';
import { planIndexes } from './index-docs.mjs';
import { COLUMNS, CYCLES_DIR, CycleNameError, TIERS, cycleColumn, cyclePaths } from './layout.mjs';
import { concernKey, CONCERNS } from './concerns.mjs';
import { CYCLE_LEVELS, requiredAt, SWEEP_LENSES } from './levels.mjs';
import { localDocsHashes, validLocalDocsHashes } from './local-docs-attestation.mjs';
import { PLACEMENTS, proposeCycle } from './posture.mjs';
import { DECLARED_KEYS, MULTI, ProfileError, parseSettings, profileProblems } from './profile.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { shapeFindings } from './cycle-shape.mjs';
import { ShapeError, resolveShape, shapeSection } from './shapes.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {{ name: string, goal: string, summary: string, tier: string, stage: string, approvals: 'card' | 'cycle' | 'front', status: 'open' | 'closed', verification_levels: string[], review_sweeps: string[], kind?: string, profile?: Record<string, string | string[]>, concerns?: Record<string, string> }} Cycle */

/** The stage names a project gets unless its config lists its own under `stages`. */
export const STAGES = Object.freeze(['concept', 'alpha', 'beta', 'mvp', 'ga']);

export class CycleError extends Error {
  /**
   * @param {string} message
   * @param {{ cause?: unknown }} [options]
   */
  constructor(message, options) {
    super(message, options);
    this.name = 'CycleError';
  }
}

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const TEMPLATE = join(TEMPLATES, 'cycle.md');
const PLAN_TEMPLATE = join(TEMPLATES, 'test-plan.md');
const SUMMARY_MAX = 160;
const STATUSES = ['open', 'closed'];
const FIELDS = ['name', 'goal', 'summary', 'tier', 'stage', 'status'];
// Tiers whose close needs a person's approval recorded in the close review.
const REVIEWED_TIERS = ['product', 'hardened'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CLOSE_REVIEW = 'verification/close-review.md';
const DONE = '06_done';
const INDEX_FILE = 'INDEX.md';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const humanColumn = (column) => column.replace(/^\d+_/, '').replaceAll('_', ' ');

/**
 * Where a cycle's files live, as absolute paths; a bad name is a CycleError.
 * @param {string} projectDir
 * @param {unknown} name
 */
function locate(projectDir, name) {
  let paths;
  try {
    paths = cyclePaths(/** @type {string} */ (name));
  } catch (cause) {
    if (!(cause instanceof CycleNameError)) throw cause;
    throw new CycleError(`${cause.message}. Pass a valid cycle name.`, { cause });
  }
  const roots = resolveProjectRoots(projectDir);
  return { paths, roots, brief: resolveProjectPath(roots, paths.brief) };
}

/**
 * The stage names a project uses: the `stages` list in its config, or the defaults when the config has no such key
 * or there is no config.
 * @param {string} projectDir
 * @returns {string[]}
 * @throws {CycleError} when the stages key is present but not a non-empty list of kebab-case names
 */
export function stagesOf(projectDir) {
  let config;
  try {
    config = readConfig(projectDir);
  } catch (cause) {
    if (cause instanceof ConfigError && cause.rule === 'config-missing') return [...STAGES];
    throw cause;
  }
  if (!('stages' in config)) return [...STAGES];
  const { stages } = config;
  const usable = Array.isArray(stages) && stages.length > 0 && stages.every((s) => typeof s === 'string' && KEBAB.test(s));
  if (!usable) {
    throw new CycleError(
      `The stages key in ${CONFIG_PATH} is ${JSON.stringify(stages)}; it must be a non-empty list of kebab-case stage names. Correct the list, or remove the key to use the defaults (${STAGES.join(', ')}).`,
    );
  }
  return [...stages];
}

/**
 * Checks an already-parsed cycle. Never throws. Whether a stage is in the project's list is checked when a cycle is
 * created, not here, so a project can rename its stages without invalidating old cycles.
 * @param {unknown} value
 * @returns {Finding[]}
 */
export function validateCycle(value) {
  /** @type {Finding[]} */
  const findings = [];
  const missing = (path, expected) =>
    findings.push({
      rule: 'cycle-field-missing',
      message: `Cycle field ${path} must be ${expected}. Add or correct it in the CYCLE.md frontmatter.`,
      path,
    });
  if (!isObject(value)) {
    missing('cycle', 'an object');
    return findings;
  }
  const o = /** @type {Record<string, any>} */ (value);
  for (const field of FIELDS) {
    if (typeof o[field] !== 'string' || o[field].trim() === '') missing(field, 'a non-empty string');
  }
  if (typeof o.tier === 'string' && o.tier.trim() !== '' && !TIERS.includes(o.tier)) {
    findings.push({
      rule: 'cycle-tier-unknown',
      message: `Unknown tier "${o.tier}". Set it to one of: ${TIERS.join(', ')}.`,
      path: 'tier',
    });
  }
  if (typeof o.status === 'string' && o.status.trim() !== '' && !STATUSES.includes(o.status)) {
    findings.push({
      rule: 'cycle-status-unknown',
      message: `Unknown status "${o.status}". Set it to open or closed.`,
      path: 'status',
    });
  }
  if (o.approvals !== undefined && !PLACEMENTS.includes(o.approvals)) {
    findings.push({ rule: 'cycle-approvals-unknown', message: `Unknown approvals placement ${JSON.stringify(o.approvals)}. Use one of: ${PLACEMENTS.join(', ')}.`, path: 'approvals' });
  }
  const profileValues = Object.fromEntries(DECLARED_KEYS.filter((key) => o[key] !== undefined).map((key) => [key, o[key]]));
  for (const problem of profileProblems(profileValues)) findings.push({ rule: 'cycle-profile-invalid', message: `${problem} Correct it in the CYCLE.md frontmatter.`, path: 'profile' });
  if (o.kind !== undefined && (typeof o.kind !== 'string' || o.kind.trim() === '')) missing('kind', 'a non-empty string when present');
  for (const concern of CONCERNS) {
    const value = o[concernKey(concern)];
    if (value !== undefined && !TIERS.includes(value)) {
      findings.push({ rule: 'cycle-concern-unknown', message: `Unknown ${concern} tier ${JSON.stringify(value)}. Set ${concernKey(concern)} to one of: ${TIERS.join(', ')}.`, path: concernKey(concern) });
    }
  }
  for (const [field, allowed, rule] of [['verification_levels', CYCLE_LEVELS, 'cycle-verification-level-unknown'], ['review_sweeps', SWEEP_LENSES, 'cycle-review-sweep-unknown']]) {
    const values = o[field] ?? [];
    if (!Array.isArray(values)) findings.push({ rule, message: `${field} must be a list of ${allowed.join(', ')}.`, path: field });
    else for (const item of values) if (!allowed.includes(item)) findings.push({ rule, message: `Unknown ${field} entry ${JSON.stringify(item)}. Choose from ${allowed.join(', ')}.`, path: field });
  }
  return findings;
}

/** The kind and the declared profile as frontmatter lines. */
function profileFrontmatter(cycle) {
  const value = (key) => (MULTI.includes(key) ? `[${[].concat(cycle.profile[key]).join(', ')}]` : cycle.profile[key]);
  return [`kind: ${cycle.kind}`, ...Object.keys(cycle.profile).map((key) => `${key}: ${value(key)}`)].join('\n');
}

const summaryOf = (goal) => (goal.length <= SUMMARY_MAX ? goal : `${goal.slice(0, SUMMARY_MAX - 1).trimEnd()}…`);

/**
 * Creates an open cycle: its folders, then CYCLE.md last so a half-made cycle is never listed. Everything is checked
 * before anything is written. If the brief cannot be written, the plan this call wrote is removed again so a retry
 * does not hit it.
 * @param {string} projectDir
 * @param {{ name: string, goal: string, tier?: string, stage?: string, approvals?: string, verificationLevels?: string[], reviewSweeps?: string[], kind?: string, settings?: string[] }} init
 * @param {{ writeFileSync: typeof writeFileSync, rmSync: typeof rmSync }} [io] file-system functions, replaceable so a test can make a write fail
 * @returns {Cycle}
 */
export function createCycle(projectDir, { name, goal, tier, stage, approvals, verificationLevels = [], reviewSweeps = [], kind, settings = [] }, io = { writeFileSync, rmSync }) {
  const { paths, roots, brief } = locate(projectDir, name);
  if (typeof goal !== 'string' || goal.trim() === '') {
    throw new CycleError('A cycle needs a goal. Pass a non-empty goal.');
  }
  const text = goal.trim();
  if (/[\r\n]/.test(text)) {
    throw new CycleError('A cycle goal is one line. Write the goal on one line and put the detail under Who and why.');
  }
  if (!existsSync(resolveProjectPath(roots, CONFIG_PATH))) {
    throw new CycleError(`${roots.checkoutRoot} is not an Aperture project: run init or adopt there first (${CONFIG_PATH} is missing).`);
  }
  const stages = stagesOf(projectDir);
  const chosen = stage ?? stages[0];
  if (!stages.includes(chosen)) {
    throw new CycleError(`Unknown stage "${chosen}". Pass one of: ${stages.join(', ')}.`);
  }
  let proposal;
  try {
    proposal = proposeCycle(projectDir, chosen);
  } catch (cause) {
    throw new CycleError(cause.message, { cause });
  }
  let shape = null;
  if (kind !== undefined || settings.length > 0) {
    try {
      shape = resolveShape(projectDir, { kind: kind ?? 'custom', set: parseSettings(settings) });
    } catch (cause) {
      if (!(cause instanceof ProfileError || cause instanceof ShapeError)) throw cause;
      throw new CycleError(cause.message, { cause });
    }
    if (shape.values.oracle === undefined || shape.values.oracle.length === 0) {
      throw new CycleError('A cycle needs an oracle: how will anyone know it is done? Pass --set oracle=<existing-tests|new-tests|metric|rubric|person|finding>, or pick a kind that sets one.');
    }
  }
  const fromShape = shape !== null && !shape.derived.unknown.includes('purpose') ? shape.derived.rigor : undefined;
  const chosenTier = tier ?? fromShape ?? proposal.tier;
  if (typeof chosenTier !== 'string' || !TIERS.includes(chosenTier)) {
    const given = typeof chosenTier === 'string' && chosenTier !== '' ? `; "${chosenTier}" is not one` : '';
    throw new CycleError(`A cycle needs a tier for stage ${chosen}${given}. Pass --tier with one of: ${TIERS.join(', ')}.`);
  }
  const chosenApprovals = approvals ?? proposal.approvals;
  if (!PLACEMENTS.includes(chosenApprovals)) {
    throw new CycleError(`Unknown approvals placement ${JSON.stringify(chosenApprovals)}. Pass --approvals with one of: ${PLACEMENTS.join(', ')}.`);
  }
  if (existsSync(brief)) {
    throw new CycleError(`Cycle ${name} already exists at ${brief}. Pick another name or edit that file.`);
  }

  /** @type {Cycle} */
  const cycle = { name, goal: text, summary: summaryOf(text), tier: chosenTier, stage: chosen, approvals: chosenApprovals, status: 'open', verification_levels: verificationLevels, review_sweeps: reviewSweeps };
  if (shape !== null) {
    cycle.kind = shape.kind === null ? 'custom' : shape.kind.name;
    cycle.profile = Object.fromEntries(DECLARED_KEYS.filter((key) => shape.values[key] !== undefined && !(key === 'lens' && shape.values.lens.length === 0)).map((key) => [key, shape.values[key]]));
  }
  const [bad] = validateCycle(cycle);
  if (bad) throw new CycleError(bad.message);
  const folders = [paths.deltas, paths.feedback, paths.verification, ...COLUMNS.map((c) => cycleColumn(name, c))];
  const plan = join(dirname(brief), 'test-plan.md');
  let planWritten = false;
  try {
    for (const folder of folders) {
      const physical = resolveProjectPath(roots, folder);
      mkdirSync(physical, { recursive: true });
      writeFileSync(join(physical, '.gitkeep'), '');
    }
    const body = readFileSync(TEMPLATE, 'utf8')
      .replaceAll('\r\n', '\n')
      .replace(/\{\{(name|goal|summary|tier|stage|approvals)\}\}/g, (_, key) => cycle[key])
      .replace('{{verification_levels}}', `[${verificationLevels.join(', ')}]`)
      .replace('{{review_sweeps}}', `[${reviewSweeps.join(', ')}]`)
      .replace('{{shape_fields}}\n', () => (shape === null ? '' : `${profileFrontmatter(cycle)}\n`))
      .replace('{{shape_section}}', () => shapeSection(shape));
    io.writeFileSync(plan, readFileSync(PLAN_TEMPLATE, 'utf8').replaceAll('\r\n', '\n'), { flag: 'wx' });
    planWritten = true;
    io.writeFileSync(brief, body, { flag: 'wx' });
  } catch (cause) {
    let leftover = '';
    if (planWritten) {
      try {
        io.rmSync(plan, { force: true });
      } catch {
        leftover = ` The test plan ${plan} was written and could not be removed; delete it before running the command again.`;
      }
    }
    throw new CycleError(`Could not create cycle ${name} (${cause.message}). Check the folder is writable and run the command again.${leftover}`, { cause });
  }
  writeCyclesIndex(projectDir, name, io);
  return cycle;
}

/**
 * Lists the new cycle in the cycles folder index and lists its test plan in the brief's own index; no other index is
 * touched, so a new cycle leaves the indexes fresh.
 * @param {string} root absolute project directory
 * @param {string} name
 * @param {{ writeFileSync: typeof writeFileSync }} [io]
 */
function writeCyclesIndex(projectDir, name, io = { writeFileSync }) {
  const path = `${CYCLES_DIR}/${INDEX_FILE}`;
  try {
    const roots = resolveProjectRoots(projectDir);
    for (const plan of planIndexes(projectDir).filter((p) => p.path === path || p.path === cyclePaths(name).brief)) {
      if (plan.text !== plan.current) io.writeFileSync(resolveProjectPath(roots, plan.path), plan.text);
    }
  } catch (cause) {
    throw new CycleError(`Cycle ${name} was created, but ${path} could not be updated (${cause.message}). Run node .process/core/scripts/index.mjs <projectDir> to list it.`, { cause });
  }
}

/**
 * @param {string} projectDir
 * @param {string} name
 * @returns {Cycle}
 */
export function readCycle(projectDir, name) {
  const { brief } = locate(projectDir, name);
  let text;
  try {
    text = readFileSync(brief, 'utf8');
  } catch (cause) {
    throw new CycleError(
      `Cannot read cycle brief ${brief} (${cause.message}). Create the cycle with node core/scripts/cycle.mjs <projectDir> new ${name} or fix the cycle name.`,
      { cause },
    );
  }
  const data = readFrontmatter(text);
  if (data === null) {
    throw new CycleError(`${brief} has no frontmatter. Start it with a --- block holding ${FIELDS.join(', ')}.`);
  }
  const [first] = validateCycle(data);
  if (first) throw new CycleError(`${brief} is not a valid cycle: ${first.rule}. ${first.message}`);
  if (data.name !== name) {
    throw new CycleError(`${brief} has name "${data.name}" but "${name}" was requested. Make the folder name and the name field match.`);
  }
  /** @type {Cycle} */
  const cycle = { ...Object.fromEntries(FIELDS.map((field) => [field, data[field]])), approvals: data.approvals ?? 'card', verification_levels: data.verification_levels ?? [], review_sweeps: data.review_sweeps ?? [] };
  if (data.kind !== undefined) cycle.kind = data.kind;
  const profile = Object.fromEntries(DECLARED_KEYS.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
  if (Object.keys(profile).length > 0) cycle.profile = profile;
  const concerns = Object.fromEntries(CONCERNS.filter((concern) => data[concernKey(concern)] !== undefined).map((concern) => [concern, data[concernKey(concern)]]));
  if (Object.keys(concerns).length > 0) cycle.concerns = concerns;
  return cycle;
}

/**
 * The names of the cycles in the project, sorted. A folder without a CYCLE.md is not a cycle.
 * @param {string} projectDir
 * @returns {string[]}
 */
export function listCycles(projectDir) {
  const folder = resolveProjectPath(resolveProjectRoots(projectDir), CYCLES_DIR);
  let entries;
  try {
    entries = readdirSync(folder, { withFileTypes: true });
  } catch (cause) {
    if (cause.code === 'ENOENT') return [];
    throw cause;
  }
  return entries
    .filter((e) => e.isDirectory() && existsSync(join(folder, e.name, 'CYCLE.md')))
    .map((e) => e.name)
    .sort();
}

/** Whether a card folder holds a card.json that can be read and parsed. */
function readableCard(folder) {
  try {
    JSON.parse(readFileSync(join(folder, 'card.json'), 'utf8'));
    return true;
  } catch {
    return false;
  }
}

/** The folders in the columns outside done that hold no readable card.json, in column then name order. */
function strayFolders(projectDir, name) {
  const roots = resolveProjectRoots(projectDir);
  return COLUMNS.filter((column) => column !== DONE).flatMap((column) => {
    const folder = resolveProjectPath(roots, cycleColumn(name, column));
    let entries = [];
    try {
      entries = readdirSync(folder, { withFileTypes: true });
    } catch (cause) {
      if (cause.code !== 'ENOENT') throw cause;
    }
    return entries
      .filter((e) => e.isDirectory() && !readableCard(join(folder, e.name)))
      .map((e) => e.name)
      .sort()
      .map((id) => ({ id, column }));
  });
}

/** The cards of a cycle by column: the folders holding a card.json, in name order. */
function cardsByColumn(projectDir, name) {
  const roots = resolveProjectRoots(projectDir);
  return COLUMNS.map((column) => {
    const folder = resolveProjectPath(roots, cycleColumn(name, column));
    let entries = [];
    try {
      entries = readdirSync(folder, { withFileTypes: true });
    } catch (cause) {
      if (cause.code !== 'ENOENT') throw cause;
    }
    const ids = entries
      .filter((e) => e.isDirectory() && existsSync(join(folder, e.name, 'card.json')))
      .map((e) => e.name)
      .sort();
    return { column, ids };
  });
}

/**
 * Read-only view of a cycle: its card count per column and its cards outside the done column.
 * @param {string} projectDir
 * @param {string} name
 * @returns {{ cycle: Cycle, projectTier: string, counts: Record<string, number>, open: { id: string, column: string }[] }}
 */
export function cycleStatus(projectDir, name) {
  const cycle = readCycle(projectDir, name);
  const cards = cardsByColumn(projectDir, name);
  const counts = Object.fromEntries(cards.map(({ column, ids }) => [column, ids.length]));
  return { cycle, projectTier: readConfig(projectDir).tier, counts, open: unfinished(cards), needed: cycleEvidence(projectDir, name).gaps };
}

/** The cards outside the done column. */
const unfinished = (cards) => cards.filter(({ column }) => column !== DONE).flatMap(({ column, ids }) => ids.map((id) => ({ id, column })));

/** Throws unless the close review's approved_by names an allowed person. */
function requireApproval(projectDir, roots, name) {
  const file = resolveProjectPath(roots, `${cyclePaths(name).verification}/close-review.md`);
  const fix = `Have a person read the review and fill approved_by in ${CLOSE_REVIEW}, then close again.`;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (cause) {
    if (cause.code !== 'ENOENT') throw new CycleError(`Cannot read ${file} (${cause.message}). ${fix}`, { cause });
    throw new CycleError(`Cycle ${name} cannot close without ${CLOSE_REVIEW}. Write the close review; its approved_by field must name the approver. ${fix}`);
  }
  const approved = readFrontmatter(text)?.approved_by;
  const problem = approverProblem(projectDir, approved);
  if (problem) throw new CycleError(`${CLOSE_REVIEW} approved_by is invalid: ${problem} ${fix}`);
}

/** @typedef {{ kind: 'level' | 'lens', name: string, problem: 'missing' | 'failed' | 'stale-code' | 'stale-local-docs' | 'unverifiable-local-docs' | 'unsigned' | 'signer-not-listed' | 'duplicate' | 'unknown', files: string[], reason?: string }} EvidenceGap */

/** Paths a verification run does not cover: everything under docs/, and .process/ except the installed process code. */
const outsideRun = (path) => path.startsWith('docs/') || (path.startsWith('.process/') && !/^\.process\/(core|tiers|hooks|skills|agents)\//.test(path));

/**
 * Whether a record that ran against `ranAgainst` is still current for the code: that commit is in this history and no
 * file outside the run's coverage changed since it, committed or not. Returns null when current, else why not and the
 * changed files. A commit that cannot be found or is not an ancestor is stale; git that cannot be read throws.
 * @param {string} checkoutRoot
 * @param {string} ranAgainst
 * @returns {{ reason: string, files: string[] } | null}
 */
function staleness(checkoutRoot, ranAgainst) {
  const again = 'Rerun verification against the current code.';
  if (ranAgainst === '') return { reason: `ran_against is empty. ${again}`, files: [] };
  if (!/^[0-9a-f]{7,40}$/i.test(ranAgainst)) return { reason: `ran_against ${JSON.stringify(ranAgainst)} is not a commit id. ${again}`, files: [] };
  let commit;
  try {
    commit = runGit(checkoutRoot, ['rev-parse', '--verify', '--quiet', `${ranAgainst}^{commit}`]).trim();
  } catch {
    return { reason: `ran_against ${ranAgainst} is not a commit in this repository. ${again}`, files: [] };
  }
  try {
    if (!isAncestorCommit(checkoutRoot, commit)) return { reason: `ran_against ${ranAgainst} is not an ancestor of HEAD (another branch, or rewritten history). ${again}`, files: [] };
    const { paths, untracked } = changedSince(checkoutRoot, commit, outsideRun);
    if (paths.length === 0) return null;
    const one = untracked.length === 1;
    const advice = untracked.length === 0 ? '' : ` ${untracked.join(', ')} ${one ? 'is' : 'are'} untracked: commit ${one ? 'it' : 'them'}, delete ${one ? 'it' : 'them'}, or add ${one ? 'it' : 'them'} to .git/info/exclude.`;
    return { reason: `Files changed since the run: ${paths.join(', ')}. ${again}${advice}`, files: paths };
  } catch (cause) {
    throw new CycleError(`Cannot check current code for cycle evidence (${cause.message}). Commit the code in this checkout and run status again.`, { cause });
  }
}

/** Read the cycle's explicit depth plus tier minimums and list every unmet requirement. */
export function cycleEvidence(projectDir, name, { sweepRound } = {}) {
  if (sweepRound !== undefined && (!Number.isSafeInteger(sweepRound) || sweepRound < 0)) throw new CycleError('Sweep round override must be a non-negative integer.');
  const cycle = readCycle(projectDir, name);
  const tier = readTierData(projectDir);
  if (tier.findings.length) throw new CycleError(tier.findings.map((finding) => finding.message).join('\n'));
  const levels = [...new Set([...cycle.verification_levels, ...requiredAt(tier.data.test_levels, cycle.tier).filter((level) => CYCLE_LEVELS.includes(level))])];
  const lenses = [...new Set([...cycle.review_sweeps, ...requiredAt(tier.data.sweeps, cycle.tier)])];
  const signoff = tier.data.signoff_required !== null && TIERS.indexOf(cycle.tier) >= TIERS.indexOf(tier.data.signoff_required);
  /** @type {EvidenceGap[]} */
  const gaps = [];
  if (!levels.length && !lenses.length) return { required: { levels, lenses, signoff }, gaps };
  const roots = resolveProjectRoots(projectDir);
  const folder = resolveProjectPath(roots, cyclePaths(name).verification);
  try {
    headCommit(roots.checkoutRoot, { short: false });
  } catch (cause) {
    throw new CycleError(`Cannot check current code for cycle evidence (${cause.message}). Commit the code in this checkout and run status again.`, { cause });
  }
  /** @type {Map<string, { reason: string, files: string[] } | null>} */
  const freshness = new Map();
  const staleOf = (ranAgainst) => {
    const key = String(ranAgainst ?? '').trim();
    if (!freshness.has(key)) freshness.set(key, staleness(roots.checkoutRoot, key));
    return freshness.get(key);
  };
  const records = readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !['close-review.md', 'INDEX.md'].includes(entry.name))
    .map((entry) => ({ file: `${cyclePaths(name).verification}/${entry.name}`, data: readFrontmatter(readFileSync(resolveProjectPath(roots, `${cyclePaths(name).verification}/${entry.name}`), 'utf8')) ?? {} }));
  const ledgerPath = resolveProjectPath(roots, `${cyclePaths(name).root}/loop.md`);
  const ledgerRound = sweepRound ?? (existsSync(ledgerPath) ? Number(readFrontmatter(readFileSync(ledgerPath, 'utf8'))?.sweep_round) : null);
  if (ledgerRound !== null && (!Number.isInteger(ledgerRound) || ledgerRound < 0)) throw new CycleError(`Cycle ${name} has an invalid loop.md sweep_round. Repair the ledger before closing.`);
  const closeReview = resolveProjectPath(roots, `${cyclePaths(name).verification}/close-review.md`);
  const knownIssues = (recordFile) => {
    let body;
    try { body = readFileSync(closeReview, 'utf8'); } catch (cause) { if (cause.code === 'ENOENT') return false; throw cause; }
    if (approverProblem(projectDir, readFrontmatter(body)?.approved_by)) return false;
    const section = /^## Known issues\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(body)?.[1] ?? '';
    const lines = section.split('\n').map((line) => line.replace(/^\s*[-*]\s*/, '').trim()).filter((line) => line && !line.startsWith('<!--'));
    return lines.some((line) => line.includes(recordFile) && !/^(none|n\/a|no known issues)[.!]?$/i.test(line));
  };
  const gap = (kind, item, problem, files, reason) => gaps.push({ kind, name: item, problem, files, ...(reason === undefined ? {} : { reason }) });
  for (const { file, data } of records) {
    if (data.level && !CYCLE_LEVELS.includes(data.level)) gap('level', String(data.level), 'unknown', [file]);
    if (data.lens && !SWEEP_LENSES.includes(data.lens)) gap('lens', String(data.lens), 'unknown', [file]);
    if (data.lens && (!Number.isInteger(Number(data.sweep_round)) || Number(data.sweep_round) < 1)) gap('lens', String(data.lens), 'unknown', [file]);
  }
  const check = (kind, item) => {
    const key = kind === 'level' ? 'level' : 'lens';
    const matches = records.filter(({ data }) => data[key] === item);
    if (!matches.length) return gap(kind, item, 'missing', []);
    const latest = kind === 'lens' ? (ledgerRound === null ? Math.max(...matches.map(({ data }) => Number(data.sweep_round) || 0)) : ledgerRound) : 0;
    const applicable = kind === 'lens' ? matches.filter(({ data }) => (Number(data.sweep_round) || 0) === latest) : matches;
    if (!applicable.length) return gap(kind, item, 'missing', matches.map(({ file }) => file));
    if (applicable.length > 1) return gap(kind, item, 'duplicate', applicable.map(({ file }) => file));
    const [{ file, data }] = applicable;
    if (!['pass', 'mixed'].includes(data.result) || data.verdict !== 'accept' || data.tier !== cycle.tier || typeof data.scope !== 'string' || data.scope.trim() === '') gap(kind, item, 'failed', [file]);
    if ((kind === 'level' && data.stream !== `${item}-test`) || (kind === 'lens' && data.stream !== 'ai-qa')) gap(kind, item, 'failed', [file]);
    if (data.result === 'mixed' && !knownIssues(file)) gap(kind, item, 'failed', [file, `${cyclePaths(name).verification}/close-review.md`]);
    const stale = staleOf(data.ran_against);
    if (stale !== null) gap(kind, item, 'stale-code', [file, ...stale.files], stale.reason);
    const cited = [...new Set([...(Array.isArray(data.local_docs) ? data.local_docs : []), ...(String(data.scope ?? '').match(/docs\/[A-Za-z0-9_./-]+/g) ?? [])])];
    if (roots.mode === 'local' && cited.length) {
      const entries = data.local_docs_sha256;
      const map = Array.isArray(entries) ? Object.fromEntries(entries.filter((entry) => typeof entry === 'string' && entry.includes('=')).map((entry) => [entry.slice(0, entry.lastIndexOf('=')), entry.slice(entry.lastIndexOf('=') + 1)])) : null;
      if (!validLocalDocsHashes(map) || cited.some((path) => !Object.hasOwn(map, path)) || Object.keys(map).some((path) => !cited.includes(path))) gap(kind, item, 'unverifiable-local-docs', [file, ...cited]);
      else {
        try {
          const current = localDocsHashes(projectDir, cited);
          const stale = cited.filter((path) => map[path] !== current[path]);
          if (stale.length) gap(kind, item, 'stale-local-docs', [file, ...stale]);
        } catch {
          gap(kind, item, 'unverifiable-local-docs', [file, ...cited]);
        }
      }
    }
    if (signoff) {
      const signer = approverProblem(projectDir, data.signed_off_by);
      if (signer) gap(kind, item, signer.includes('not listed') ? 'signer-not-listed' : 'unsigned', [file]);
    }
  };
  for (const level of levels) check('level', level);
  for (const lens of lenses) check('lens', lens);
  return { required: { levels, lenses, signoff }, gaps };
}

/**
 * Closes a cycle once none of its cards is outside the done column and no folder outside it lacks a readable
 * card.json; a product or hardened cycle also needs an approved close review. The exit text is not checked. There is no way back to open.
 * @param {string} projectDir
 * @param {string} name
 * @returns {Cycle}
 */
export function closeCycle(projectDir, name) {
  const cycle = readCycle(projectDir, name);
  if (cycle.status === 'closed') throw new CycleError(`Cycle ${name} is already closed. Nothing to do.`);
  const listed = (folders) => folders.map(({ id, column }) => `${id} (${humanColumn(column)})`).join(', ');
  const strays = strayFolders(projectDir, name);
  if (strays.length) {
    throw new CycleError(`Cycle ${name} has folders on its board that are not valid cards (no readable card.json): ${listed(strays)}. Repair their card.json or remove the folders, then close again.`);
  }
  const open = unfinished(cardsByColumn(projectDir, name));
  if (open.length) {
    throw new CycleError(`Cycle ${name} still has unfinished cards: ${listed(open)}. Finish or move them, then close again.`);
  }
  if (cycle.kind !== undefined) {
    const unrecorded = shapeFindings(projectDir, name);
    if (unrecorded.length) throw new CycleError(`Cycle ${name} cannot close with its shape unrecorded.\n${unrecorded.map((f) => `- ${f.message}`).join('\n')}`);
  }
  if (cycle.approvals === 'front') {
    let approval;
    try { approval = designApprovalState(projectDir, name); }
    catch (cause) { throw new CycleError(`Cannot verify cycle ${name}'s front design approval (${cause.message}). Repair it before closing.`, { cause }); }
    if (approval.state !== 'fresh') {
      throw new CycleError(`Cycle ${name} has ${approval.state} front design approval${approval.stale.length ? ` (${approval.stale.join(', ')})` : ''}. Ask a person to approve the current design before closing.`);
    }
  }
  const { roots, brief } = locate(projectDir, name);
  if (cycle.approvals !== 'card' || REVIEWED_TIERS.includes(cycle.tier)) requireApproval(projectDir, roots, name);
  const { gaps } = cycleEvidence(projectDir, name);
  if (gaps.length) throw new CycleError(`Cycle ${name} still needs verification before close:\n${gaps.map((gap) => `- ${gap.kind} ${gap.name}: ${gap.problem}${gap.files.length ? ` (${gap.files.join(', ')})` : ''}. ${gap.reason ?? (gap.problem === 'missing' ? 'Add a current passing verification record.' : 'Repair the record and run status again.')}`).join('\n')}`);
  try {
    writeFileSync(brief, setFrontmatterField(readFileSync(brief, 'utf8'), 'status', 'closed'));
  } catch (cause) {
    throw new CycleError(`Could not update ${brief} (${cause.message}). Check the file is writable and close again.`, { cause });
  }
  return { ...cycle, status: 'closed' };
}
