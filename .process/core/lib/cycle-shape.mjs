import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { approverProblem } from './approval.mjs';
import { cardPath, listCards } from './board.mjs';
import { CARD_FILES, workFile } from './card-files.mjs';
import { parseRedEvidence } from './checks/red-evidence.mjs';
import { CONCERNS, CONCERN_WORDS } from './concerns.mjs';
import { CycleError, readCycle } from './cycle.mjs';
import { readFrontmatter } from './frontmatter.mjs';
import { readTierData } from './gate.mjs';
import { PROCESS_CORE, PROCESS_DIR, RED_FIRST, STAGE, TIERS, cyclePaths } from './layout.mjs';
import { APPROVAL_MEANING } from './posture.mjs';
import { ProfileError, factsOf, parseSettings, readProjectProfile } from './profile.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';
import { ShapeError, listedTiers, loadShapes, neverSkipped, parseShapeRecord, resolveShape, setStageLine, shapeLine, skipHolds, stageTiers } from './shapes.mjs';
import { parseTestPlan, planFindings, readCyclePlan, selectedLevelsOf } from './test-plan.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */

const briefPath = (projectDir, name) => resolveProjectPath(resolveProjectRoots(projectDir), cyclePaths(name).brief);

const STAGE_FIX = (name) => `Record each with: node ${PROCESS_CORE}/scripts/cycle.mjs <projectDir> stage ${name} <stage> done "<evidence>". A spine stage cannot be skipped.`;

/** The columns whose cards are held to their red evidence: ready and later; a card still in the backlog or shaping has none yet. */
const RED_WAIVER = /^\s*-\s*red-first waived:\s*\S/m;

/**
 * The per-card state of a stage with the card grain: which cards of the cycle need its artifact (a test-verified criterion,
 * from ready on) and which of those lack it. A cycle below the tier that proves tests first has no card that needs one. A card has its red evidence when a valid log is on disk, when its context.md
 * records a line `- red-first waived: <reason>`, or when it is done (it passed the gate that checks the log).
 * @param {string} projectDir
 * @param {string} name cycle name
 * @returns {{ needing: string[], lacking: string[] }}
 */
export function perCardEvidence(projectDir, name) {
  const needing = [];
  const lacking = [];
  // Below the tier that proves tests first nothing writes a red log, so no card of such a cycle needs one.
  const minimum = readTierData(projectDir).data.checks['tests-fail-first'];
  if (typeof minimum !== 'string' || TIERS.indexOf(readCycle(projectDir, name).tier) < TIERS.indexOf(minimum)) return { needing, lacking };
  for (const { cycle, column, card } of listCards(projectDir)) {
    if (cycle !== name || !RED_FIRST.includes(column)) continue;
    const criteria = Array.isArray(card.criteria) ? card.criteria : [];
    if (!criteria.some((c) => c !== null && typeof c === 'object' && /** @type {any} */ (c).verify === 'test')) continue;
    needing.push(card.id);
    if (column === STAGE.done) continue;
    const log = workFile(projectDir, card.id, CARD_FILES.redEvidence);
    const has = existsSync(log) && parseRedEvidence(readFileSync(log, 'utf8')).evidence !== null;
    const context = cardPath(projectDir, card.id)?.dir;
    const waived = context !== undefined && existsSync(`${context}/context.md`) && RED_WAIVER.test(readFileSync(`${context}/context.md`, 'utf8'));
    if (!has && !waived) lacking.push(card.id);
  }
  return { needing, lacking };
}

/**
 * Whether the artifact a stage names (its `evidence-from` field) exists and passes its own check, so the stage is done
 * without a recorded line. A stage with no such field is never derived. Reads only.
 * @param {string} projectDir
 * @param {string} name cycle name
 * @param {{ evidenceFrom: string | null }} stage
 * @returns {{ done: boolean, source: string | null, cards?: { have: number, need: number } }}
 */
export function derivedStageStatus(projectDir, name, stage) {
  const source = stage.evidenceFrom;
  if (source === null) return { done: false, source: null };
  let done = false;
  if (stage.grain === 'card') {
    const { needing, lacking } = perCardEvidence(projectDir, name);
    return { done: lacking.length === 0, source, cards: { have: needing.length - lacking.length, need: needing.length } };
  }
  if (source === 'shape-line') {
    done = parseShapeRecord(readFileSync(briefPath(projectDir, name), 'utf8')).line !== null;
  } else if (source === 'test-plan') {
    const selected = selectedLevelsOf(readCycle(projectDir, name), readTierData(projectDir).data);
    const found = readCyclePlan(projectDir, name, selected);
    // A plan counts once it has a section that covers a criterion or is waived with a reason, and every selected level is answered.
    const answered = (section) => (section.status === 'waived' ? section.reason !== null : section.criteria.length > 0);
    done = found !== null && found.plan.sections.some(answered) && planFindings({ plan: found.plan, selectedLevels: selected, briefIds: found.briefIds }).length === 0;
  } else if (source === 'close-review') {
    const file = resolveProjectPath(resolveProjectRoots(projectDir), `${cyclePaths(name).verification}/close-review.md`);
    done = existsSync(file) && approverProblem(projectDir, readFrontmatter(readFileSync(file, 'utf8'))?.approved_by) === null;
  }
  return { done, source };
}

/** The stage tiers of a cycle and, when they cannot be resolved, why: no kind, no profile, or a stage set that fails to resolve. */
function resolveTiers(projectDir, cycle, data) {
  if (cycle.kind === undefined) return { tiers: null, reason: 'the cycle brief records no kind' };
  if (cycle.profile === undefined) return { tiers: null, reason: `the cycle brief records no profile for kind ${cycle.kind}` };
  try {
    return { tiers: stageTiers(resolveShape(projectDir, { kind: cycle.kind, set: cycle.profile }), data.stages), reason: null };
  } catch (cause) {
    if (cause instanceof ShapeError) return { tiers: null, reason: cause.message };
    throw cause;
  }
}

/** The stage tiers of a cycle, or null when its stage set cannot be resolved. */
const tiersOf = (projectDir, cycle, data) => resolveTiers(projectDir, cycle, data).tiers;

/** The warning for lines left from before the stage model; closing a cycle ignores it. */
export const LEGACY_SHAPE_RULE = 'cycle-shape-legacy';
const DEFAULT_SHAPE = /^Shape: default \(no kind chosen\)/;

/**
 * What the cycle's shape record still lacks. Only the spine is a hard gate: a spine stage whose phase is one of
 * `phases` must be recorded done or derived done from its artifact. Every recorded line is checked: a stage unknown to
 * the catalog, a done with no evidence, a skip with no valid reason and an added stage with no reason are findings.
 * A suggested or available stage nobody touched is never a finding. Reads only.
 * @param {string} projectDir
 * @param {string} name cycle name
 * @param {{ phases?: string[] }} [options] default every phase
 * @returns {Finding[]}
 */
export function shapeFindings(projectDir, name, { phases } = {}) {
  const path = cyclePaths(name).brief;
  const text = readFileSync(briefPath(projectDir, name), 'utf8');
  const record = parseShapeRecord(text);
  const cycle = readCycle(projectDir, name);
  // A cycle opened with no kind keeps no stage list: it has no shape section (an older brief) or says it is the default.
  if (cycle.kind === undefined && (!record.hasSection || (record.line !== null && DEFAULT_SHAPE.test(record.line)))) return [];
  if (!record.hasSection || record.line === null) {
    return [{ rule: 'cycle-shape-missing', path, message: `Cycle ${name} has no "Why this shape" line. Add a "Shape:" line under a "## Why this shape" heading in ${path} (cycle.mjs new writes one), or re-open the cycle with --kind.` }];
  }
  const data = loadShapes(projectDir);
  const facts = factsOf(cycle.profile ?? {}, readProjectProfile(projectDir));
  const inPhase = (stage) => phases === undefined || phases.includes(stage.phase);
  // A Stages section written before the stage model has a todo line for a stage; its leftovers are warned about, not blocking.
  const legacy = [...record.stages.values()].some((entry) => entry.status === 'todo');
  const old = [];
  const unknown = [];
  const noEvidence = [];
  const badSkip = [];
  const badAdd = [];
  for (const [id, entry] of [...record.stages].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const stage = data.stages.get(id);
    if (stage === undefined) {
      (legacy ? old : unknown).push(legacy ? `${id} (not a stage of the catalog)` : id);
    } else if (inPhase(stage)) {
      if (entry.status === 'done' && entry.text === '') noEvidence.push(id);
      else if (entry.status === 'added' && entry.text === '') badAdd.push(id);
      else if (entry.status === 'skipped') {
        if (entry.text === '') badSkip.push(`${id} (no reason)`);
        else if (neverSkipped(stage)) (legacy ? old : badSkip).push(`${id} (${legacy ? 'an old skip of a stage that is spine now; it must be done' : 'this stage is never skipped'})`);
        else if (entry.text === 'rule' && !entry.override && !skipHolds(stage, facts)) badSkip.push(`${id} (its skip rule does not hold for this profile)`);
      }
    }
  }
  const { tiers, reason } = resolveTiers(projectDir, cycle, data);
  const spine = tiers === null ? [] : tiers.spine.map(({ stage }) => stage);
  const open = [];
  // A per-card stage applies to every cycle that lists it, spine or suggested, and its status comes from the cards alone: a hand-written line for it is ignored.
  const perCard = tiers === null ? [] : tiers.suggested.map(({ stage }) => stage).filter((stage) => stage.grain === 'card' && !spine.includes(stage));
  for (const stage of [...spine, ...perCard].filter(inPhase).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const entry = record.stages.get(stage.id);
    if (stage.grain !== 'card' && entry?.status === 'done') continue;
    if (derivedStageStatus(projectDir, name, stage).done) continue;
    open.push(stage.id);
  }
  /** @type {Finding[]} */
  const findings = [];
  if (tiers === null) findings.push({ rule: 'cycle-shape-unreadable', path, message: `Cycle ${name}'s stage set cannot be read (kind ${cycle.kind ?? 'none'}): ${reason}. The spine cannot be checked until it resolves: correct the kind in ${path}, or install the pack that has it.` });
  if (open.length > 0) {
    const perCardOpen = open.filter((id) => data.stages.get(id)?.grain === 'card');
    const manualOpen = open.filter((id) => !perCardOpen.includes(id));
    const lacking = perCardOpen.length > 0 ? perCardEvidence(projectDir, name).lacking.join(', ') : '';
    findings.push({ rule: 'cycle-shape-stage-open', path, message: `Cycle ${name} has ${manualOpen.length > 0 ? 'spine stages' : 'stages'} not done: ${open.join(', ')}.${manualOpen.length > 0 ? ` ${STAGE_FIX(name)}` : ''}${perCardOpen.length > 0 ? ` ${perCardOpen.join(', ')} cannot be recorded: it is done when every card has its evidence (cards still lacking it: ${lacking}).` : ''}` });
  }
  if (noEvidence.length > 0) findings.push({ rule: 'cycle-shape-evidence-missing', path, message: `Cycle ${name} marks stages done with no evidence: ${noEvidence.join(', ')}. Say what shows it: a file, a commit or a card.` });
  if (badSkip.length > 0) findings.push({ rule: 'cycle-shape-skip-invalid', path, message: `Cycle ${name} skips stages without a valid reason: ${badSkip.join(', ')}. Give a one-line reason, or use "rule" only where the stage's skip rule holds.` });
  if (badAdd.length > 0) findings.push({ rule: 'cycle-shape-added-invalid', path, message: `Cycle ${name} adds stages with no reason: ${badAdd.join(', ')}. Say in one line why the stage was chosen.` });
  if (unknown.length > 0) findings.push({ rule: 'cycle-shape-stage-unknown', path, message: `Cycle ${name} records stages that are in neither the catalog nor the project's own stages: ${unknown.join(', ')}. Correct the id, or add the stage under ${PROCESS_DIR}/stages/.` });
  if (old.length > 0) findings.push({ rule: LEGACY_SHAPE_RULE, path, message: `Cycle ${name} has lines from before the stage model: ${old.join(', ')}. They no longer count; spine stages must still be recorded done.` });
  return findings;
}

/**
 * Decides how a skip is recorded. A never-skipped stage is refused, and so is a stage the cycle does not run. Where the
 * stage's own skip rule holds, the skip is recorded as given ("rule" or a reason). Where it does not hold, the skip
 * needs a real reason, which is recorded as an override so the record and `cycle shape` show it; the bare word "rule"
 * is not a reason there. Judgment stays with the human or lead: no justification is demanded beyond the stated reason.
 * @returns {{ text: string, override: boolean }} the text to record
 */
function skipRecord(projectDir, name, stage, reason) {
  if (neverSkipped(stage)) throw new CycleError(`Stage ${stage.id} is never skipped. Record it done with its evidence.`);
  const cycle = readCycle(projectDir, name);
  const tiers = tiersOf(projectDir, cycle, loadShapes(projectDir));
  const known = tiers === null ? [] : [...tiers.spine, ...tiers.suggested, ...tiers.notNeeded];
  if (!known.some((entry) => entry.stage.id === stage.id)) throw new CycleError(`Stage ${stage.id} is not one of this cycle's stages, so there is nothing to skip. See them with: node ${PROCESS_CORE}/scripts/cycle.mjs <projectDir> shape ${name}.`);
  if (skipHolds(stage, factsOf(cycle.profile ?? {}, readProjectProfile(projectDir)))) return { text: reason, override: false };
  if (reason.toLowerCase() === 'rule') throw new CycleError(`The skip rule of ${stage.id} does not hold for this cycle's profile, so "rule" is not a reason. Give a one-line reason of your own (it is recorded as an override), or do the stage.`);
  return { text: reason.replace(/^override:\s*/, ''), override: true };
}

/**
 * Sets one stage line of a cycle's record. A done, skipped or added stage gets a line; todo removes it.
 * @param {string} projectDir
 * @param {string} name
 * @param {string} stageId
 * @param {'todo' | 'done' | 'skipped' | 'added'} status
 * @param {string} [text] the evidence or the reason
 */
export function recordStage(projectDir, name, stageId, status, text = '') {
  if (!['todo', 'done', 'skipped', 'added'].includes(status)) throw new CycleError(`Unknown stage status "${status}". Use done, skipped, added or todo.`);
  if (status !== 'todo' && (typeof text !== 'string' || text.trim() === '' || /[\r\n]/.test(text))) {
    throw new CycleError(`A stage ${status === 'done' ? 'needs its evidence' : 'needs its reason'} on one line. Say ${status === 'done' ? 'what shows it was done' : status === 'added' ? 'why the stage was chosen' : 'why it is skipped, or "rule"'}.`);
  }
  const file = briefPath(projectDir, name);
  const stage = loadShapes(projectDir).stages.get(stageId);
  if (stage === undefined) throw new CycleError(`Stage ${stageId} is in neither the catalog nor the project's own stages. See the cycle's stages with: node ${PROCESS_CORE}/scripts/cycle.mjs <projectDir> shape ${name}.`);
  let recorded = { text: text.trim(), override: false };
  if (status === 'skipped') recorded = skipRecord(projectDir, name, stage, text.trim());
  if (status === 'added') {
    const tiers = tiersOf(projectDir, readCycle(projectDir, name), loadShapes(projectDir));
    if (tiers !== null && [...tiers.spine, ...tiers.suggested].some((entry) => entry.stage.id === stageId)) throw new CycleError(`Stage ${stageId} already applies to this cycle, so it is not added. Record it done with its evidence.`);
  }
  if (stage.grain === 'card') {
    const { lacking } = perCardEvidence(projectDir, name);
    throw new CycleError(`Stage ${stageId} is derived from the cards, so it is not recorded by hand. ${lacking.length === 0 ? 'Every card that needs it has it.' : `These cards still lack its evidence: ${lacking.join(', ')}. Run red-evidence.mjs for each, or record a line "- red-first waived: <reason>" in its context.md.`}`);
  }
  const next = setStageLine(readFileSync(file, 'utf8'), stageId, status, recorded.text, recorded.override);
  if (next === null) throw new CycleError(`Cycle ${name} has no Stages section to record ${stageId} in (it was opened with no kind).`);
  writeFileSync(file, next);
}

/** How one stage reads in `cycle shape` once something is recorded or derived: done, waived, skipped or added. */
function stageState(entry, derived) {
  if (derived?.cards !== undefined) return derived.done ? `done (derived: ${derived.source}) ${derived.cards.have} of ${derived.cards.need} cards` : `open: ${derived.cards.have} of ${derived.cards.need} cards have their ${derived.source === 'red-evidence' ? 'red evidence' : 'evidence'}`;
  if (entry?.status === 'done' && entry.text !== '') return `done: ${entry.text}`;
  if (derived?.done) return `done (derived: ${derived.source})`;
  if (entry?.status === 'skipped') return entry.override ? `waived: ${entry.text}` : `skipped: ${entry.text}`;
  if (entry?.status === 'added') return `added: ${entry.text}`;
  return null;
}

/**
 * The printable parts of a resolved shape: profile, project dimensions, approvals and the stages in three groups, the
 * spine, the suggested set and a count of the rest, then the recorded deviations. A stage is a question the cycle asks:
 * it applies unless the rule says it does not, and only a surprising answer is recorded.
 * @param {ReturnType<typeof resolveShape>} shape
 * @param {{ record?: ReturnType<typeof parseShapeRecord> | null, derive?: ((stage: object) => { done: boolean, source: string | null }) | null, catalog: Map<string, object> }} context
 */
function shapeLines(shape, { record = null, derive = null, catalog }) {
  const lines = [(record?.line ?? shapeLine(shape)).replace(/^Shape: /, 'profile: ')];
  const project = shape.project;
  lines.push(`project: ${Object.keys(project).length === 0 ? 'no project dimensions are set (audience, governance, deployment, executor, independence, criticality)' : Object.entries(project).map(([key, value]) => `${key} ${value}`).join(', ')}`);
  const a = shape.derived.approvals;
  lines.push(`approvals: plan ${a.plan}, merge ${a.merge}${a.before_irreversible_step ? ', approval before the irreversible step' : ''}${a.risk_acceptance ? ', risk acceptance' : ''}`);
  const tiers = listedTiers(shape, catalog);
  lines.push('A stage is a question the cycle asks. Record an answer only when it is surprising: a waived stage, an added one, or a done stage with no artifact to derive it from.');
  lines.push(`spine (${tiers.spine.length}): always run, the only hard gate, never skipped`);
  lines.push(`suggested (${tiers.suggested.length}): the kind's set for this profile, run unless waived with a reason`);
  lines.push(`available (${tiers.available}): ${tiers.notNeeded.length} of the kind's own are not needed because their skip rule holds, ${tiers.other.length} more are in the catalog; not listed. Add one on purpose with: stage <cycle> <stage> added "<reason>"`);
  const shown = new Set();
  const stageLines = (group, tierName) => {
    for (const { stage } of group) {
      shown.add(stage.id);
      const state = record === null ? 'proposed' : (stageState(record.stages.get(stage.id), derive?.(stage) ?? null) ?? 'applies');
      lines.push(`stage ${stage.code} ${stage.id} (${tierName})${neverSkipped(stage) ? ' [never skipped]' : ''}: ${state}`);
    }
  };
  stageLines(tiers.spine, 'spine');
  stageLines(tiers.suggested, 'suggested');
  if (tiers.dropped.length > 0) {
    lines.push(`lighter path: a one-card feature (size card, reversibility trivial) keeps the spine, a red-first test and a blind review; ${tiers.dropped.length} stages of the full feature are dropped, each with its reason`);
    for (const { stage, reason } of tiers.dropped) lines.push(`dropped ${stage.id}: ${reason}`);
  }
  if (record !== null) {
    const rest = [...record.stages].filter(([id, entry]) => !shown.has(id) && entry.status !== 'todo').sort(([x], [y]) => (x < y ? -1 : 1));
    for (const [id, entry] of rest) {
      const stage = catalog.get(id);
      lines.push(`stage ${stage?.code ?? '?'} ${id} (${stage === undefined ? 'not in the catalog' : 'available'}): ${stageState(entry, null) ?? entry.status}`);
    }
    const deviations = [...record.stages].filter(([, entry]) => entry.status === 'added' || (entry.status === 'skipped' && entry.override));
    for (const [id, entry] of deviations) lines.push(`deviation: ${id} ${entry.status === 'added' ? 'added' : 'skipped (override)'}: ${entry.text}`);
    if (deviations.length === 0) lines.push('deviations: none recorded');
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
  return [`proposed shape: kind ${named}${shape.kind === null ? '' : ` (${shape.kind.summary})`}`, ...shapeLines(shape, { catalog: loadShapes(projectDir).stages }), `tier if opened now: ${shape.derived.unknown.includes('purpose') ? 'from the posture' : shape.derived.rigor}`];
}

/** The kinds the project has, one line each, and where each came from. */
export function listKinds(projectDir) {
  const { kinds, findings } = loadShapes(projectDir);
  return { lines: [...kinds.values()].map((kind) => `${kind.name}: ${kind.summary}`), findings };
}

/**
 * The printable shape of a cycle: its profile, the derived values, the spine and suggested stages with their state,
 * the recorded deviations and the concern settings the cycle layer gives.
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
      const shown = shapeLines(shape, { record, derive: (stage) => derivedStageStatus(projectDir, name, stage), catalog: loadShapes(projectDir).stages });
      // The meaning of the cycle's approvals mode goes on the line after the approvals line, once.
      const at = shown.findIndex((line) => line.startsWith('approvals: '));
      if (at >= 0 && APPROVAL_MEANING[cycle.approvals] !== undefined) shown.splice(at + 1, 0, `approvals ${cycle.approvals} means ${APPROVAL_MEANING[cycle.approvals]}.`);
      lines.push(...shown);
    } catch (cause) {
      if (!(cause instanceof ShapeError)) throw cause;
      lines.push(`the stage set cannot be read: ${cause.message}`);
    }
  }
  const planFile = resolveProjectPath(resolveProjectRoots(projectDir), `${cyclePaths(name).root}/test-plan.md`);
  if (existsSync(planFile)) {
    for (const section of parseTestPlan(readFileSync(planFile, 'utf8')).sections.filter((entry) => entry.status === 'waived')) lines.push(`test plan: ${section.level} level waived: ${section.reason ?? 'no reason recorded'}`);
  }
  const tier = cycle.concerns ?? {};
  lines.push(`tier: ${cycle.tier}${Object.keys(tier).length === 0 ? '' : ` (concerns set on the cycle: ${CONCERNS.filter((c) => tier[c] !== undefined).map((c) => `${CONCERN_WORDS[c]} ${tier[c]}`).join(', ')})`}`);
  for (const concern of CONCERNS) lines.push(`concern ${concern}: ${tier[concern] ?? cycle.tier}${tier[concern] === undefined ? ' (the cycle tier)' : ' (set on the cycle)'}`);
  return lines;
}
