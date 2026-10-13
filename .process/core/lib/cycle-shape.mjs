import { readFileSync, writeFileSync } from 'node:fs';
import { CONCERNS, CONCERN_WORDS } from './concerns.mjs';
import { CycleError, readCycle } from './cycle.mjs';
import { cyclePaths } from './layout.mjs';
import { ProfileError, factsOf, parseSettings, readProjectProfile } from './profile.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { ShapeError, loadShapes, parseShapeRecord, resolveShape, setStageLine, shapeLine, skipHolds } from './shapes.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */

const briefPath = (projectDir, name) => resolveProjectPath(resolveProjectRoots(projectDir), cyclePaths(name).brief);

const STAGE_FIX = (name) => `Record each with: node .process/core/scripts/cycle.mjs <projectDir> stage ${name} <stage> done "<evidence>" or skipped "<reason>".`;

/**
 * What the cycle's shape record still lacks. A stage counts when its phase is one of `phases`; a stage the catalog does
 * not know counts only when every phase is asked for. Reads only.
 * @param {string} projectDir
 * @param {string} name cycle name
 * @param {{ phases?: string[] }} [options] default every phase
 * @returns {Finding[]}
 */
export function shapeFindings(projectDir, name, { phases } = {}) {
  const path = cyclePaths(name).brief;
  const text = readFileSync(briefPath(projectDir, name), 'utf8');
  const record = parseShapeRecord(text);
  if (!record.hasSection || record.line === null) {
    return [{ rule: 'cycle-shape-missing', path, message: `Cycle ${name} has no "Why this shape" line. Add a "Shape:" line under a "## Why this shape" heading in ${path} (cycle.mjs new writes one), or re-open the cycle with --kind.` }];
  }
  const cycle = readCycle(projectDir, name);
  const data = loadShapes(projectDir);
  const ids = new Set(record.stages.keys());
  if (cycle.kind !== undefined && cycle.profile !== undefined) {
    try {
      for (const { stage } of resolveShape(projectDir, { kind: cycle.kind, set: cycle.profile }).stages) ids.add(stage.id);
    } catch (cause) {
      if (!(cause instanceof ShapeError)) throw cause;
    }
  }
  const facts = factsOf(cycle.profile ?? {}, readProjectProfile(projectDir));
  const wanted = (id) => {
    const stage = data.stages.get(id);
    return stage === undefined ? phases === undefined : phases === undefined || phases.includes(stage.phase);
  };
  const open = [];
  const noEvidence = [];
  const badSkip = [];
  for (const id of [...ids].filter(wanted).sort()) {
    const stage = data.stages.get(id);
    const entry = record.stages.get(id);
    if (entry === undefined || entry.status === 'todo') open.push(id);
    else if (entry.status === 'done' && entry.text === '') noEvidence.push(id);
    else if (entry.status === 'skipped') {
      if (entry.text === '') badSkip.push(`${id} (no reason)`);
      else if (stage !== undefined && (stage.minimal || stage.skip === 'never')) badSkip.push(`${id} (this stage is never skipped)`);
      else if (stage !== undefined && entry.text === 'rule' && !skipHolds(stage, facts)) badSkip.push(`${id} (its skip rule does not hold for this profile)`);
    }
  }
  /** @type {Finding[]} */
  const findings = [];
  if (open.length > 0) findings.push({ rule: 'cycle-shape-stage-open', path, message: `Cycle ${name} has stages not done or skipped: ${open.join(', ')}. ${STAGE_FIX(name)}` });
  if (noEvidence.length > 0) findings.push({ rule: 'cycle-shape-evidence-missing', path, message: `Cycle ${name} marks stages done with no evidence: ${noEvidence.join(', ')}. Say what shows it: a file, a commit or a card.` });
  if (badSkip.length > 0) findings.push({ rule: 'cycle-shape-skip-invalid', path, message: `Cycle ${name} skips stages without a valid reason: ${badSkip.join(', ')}. Give a one-line reason, or use "rule" only where the stage's skip rule holds.` });
  return findings;
}

/**
 * Sets one stage line of a cycle's record.
 * @param {string} projectDir
 * @param {string} name
 * @param {string} stageId
 * @param {'todo' | 'done' | 'skipped'} status
 * @param {string} [text] the evidence or the reason
 */
export function recordStage(projectDir, name, stageId, status, text = '') {
  if (!['todo', 'done', 'skipped'].includes(status)) throw new CycleError(`Unknown stage status "${status}". Use done, skipped or todo.`);
  if (status !== 'todo' && (typeof text !== 'string' || text.trim() === '' || /[\r\n]/.test(text))) {
    throw new CycleError(`A stage ${status === 'done' ? 'needs its evidence' : 'needs its reason'} on one line. Say ${status === 'done' ? 'what shows it was done' : 'why it is skipped, or "rule"'}.`);
  }
  const file = briefPath(projectDir, name);
  const next = setStageLine(readFileSync(file, 'utf8'), stageId, status, text.trim());
  if (next === null) throw new CycleError(`Cycle ${name} has no line for stage ${stageId}. Stages in this cycle: ${[...parseShapeRecord(readFileSync(file, 'utf8')).stages.keys()].join(', ') || 'none'}.`);
  writeFileSync(file, next);
}

/** The printable parts of a resolved shape: profile, project dimensions, approvals and each stage with its status. */
function shapeLines(shape, record = null) {
  const lines = [(record?.line ?? shapeLine(shape)).replace(/^Shape: /, 'profile: ')];
  const project = shape.project;
  lines.push(`project: ${Object.keys(project).length === 0 ? 'no project dimensions are set (audience, governance, deployment, executor, independence, criticality)' : Object.entries(project).map(([key, value]) => `${key} ${value}`).join(', ')}`);
  const a = shape.derived.approvals;
  lines.push(`approvals: plan ${a.plan}, merge ${a.merge}${a.before_irreversible_step ? ', approval before the irreversible step' : ''}${a.risk_acceptance ? ', risk acceptance' : ''}`);
  const facts = shape.facts;
  for (const { stage, why } of shape.stages) {
    const entry = record?.stages.get(stage.id);
    const status = record === null ? 'proposed' : entry === undefined ? 'not recorded' : entry.status === 'todo' ? 'todo' : `${entry.status}: ${entry.text}`;
    const hint = stage.skip === 'never' || stage.minimal ? ' [never skipped]' : skipHolds(stage, facts) ? ' [skip rule holds]' : '';
    lines.push(`stage ${stage.code} ${stage.id} (${why})${hint}: ${status}`);
  }
  return lines;
}

/**
 * The shape a kind and its settings would give, for the human's one-line confirm. Writes nothing and checks what a new
 * cycle would check.
 * @param {string} projectDir
 * @param {{ kind?: string, settings?: string[] }} input
 * @returns {string[]}
 */
export function proposeShape(projectDir, { kind, settings = [] }) {
  let shape;
  try {
    shape = resolveShape(projectDir, { kind: kind ?? 'custom', set: parseSettings(settings) });
  } catch (cause) {
    if (cause instanceof ProfileError || cause instanceof ShapeError) throw new CycleError(cause.message, { cause });
    throw cause;
  }
  if (shape.values.oracle === undefined || shape.values.oracle.length === 0) {
    throw new CycleError('A cycle needs an oracle: how will anyone know it is done? Add --set oracle=<existing-tests|new-tests|metric|rubric|person|finding>, or pick a kind that sets one.');
  }
  const named = shape.kind === null ? 'custom' : shape.kind.name;
  return [`proposed shape: kind ${named}${shape.kind === null ? '' : ` (${shape.kind.summary})`}`, ...shapeLines(shape), `tier if opened now: ${shape.derived.unknown.includes('purpose') ? 'from the posture' : shape.derived.rigor}`];
}

/** The kinds the project has, one line each, and where each came from. */
export function listKinds(projectDir) {
  const { kinds, findings } = loadShapes(projectDir);
  return { lines: [...kinds.values()].map((kind) => `${kind.name}: ${kind.summary}`), findings };
}

/**
 * The printable shape of a cycle: its profile, the derived values, each stage with its status and the concern settings
 * the cycle layer gives.
 * @param {string} projectDir
 * @param {string} name
 * @returns {string[]}
 */
export function describeShape(projectDir, name) {
  const cycle = readCycle(projectDir, name);
  const record = parseShapeRecord(readFileSync(briefPath(projectDir, name), 'utf8'));
  const lines = [`cycle ${name}: ${cycle.kind === undefined ? 'default shape (no kind)' : `kind ${cycle.kind}`}`];
  if (cycle.kind === undefined) {
    lines.push('no profile is recorded; tier and approvals come from the project posture');
  } else {
    try {
      const shape = resolveShape(projectDir, { kind: cycle.kind, set: cycle.profile ?? {} });
      lines.push(...shapeLines(shape, record));
    } catch (cause) {
      if (!(cause instanceof ShapeError)) throw cause;
      lines.push(`the stage set cannot be read: ${cause.message}`);
    }
  }
  const tier = cycle.concerns ?? {};
  lines.push(`tier: ${cycle.tier}${Object.keys(tier).length === 0 ? '' : ` (concerns set on the cycle: ${CONCERNS.filter((c) => tier[c] !== undefined).map((c) => `${CONCERN_WORDS[c]} ${tier[c]}`).join(', ')})`}`);
  for (const concern of CONCERNS) lines.push(`concern ${concern}: ${tier[concern] ?? cycle.tier}${tier[concern] === undefined ? ' (the cycle tier)' : ' (set on the cycle)'}`);
  return lines;
}
