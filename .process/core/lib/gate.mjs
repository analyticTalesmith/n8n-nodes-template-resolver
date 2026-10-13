import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readConfig } from './config.mjs';
import { TIERS } from './layout.mjs';
import { CYCLE_LEVELS, REGRESSION_MODES, requiredAt, SWEEP_LENSES, TEST_LEVELS } from './levels.mjs';
import { addedLines, assertTopLevel, changedFiles, commitAddedLines, commitsInRange, effectiveBase, fileAtCommit, GitError } from './git.mjs';
import { registerGuard } from './moves.mjs';
import { readScopeExceptions } from './contract.mjs';
import { checkBoundary } from './checks/boundary.mjs';
import { checkCardContract } from './checks/card-contract.mjs';
import { checkCardGate } from './checks/card-gate.mjs';
import { checkCycleShapeRecorded } from './checks/cycle-shape-recorded.mjs';
import { checkRedEvidence, RED_RECORDED_EARLIER } from './checks/red-evidence.mjs';
import { checkRootCause } from './checks/root-cause.mjs';
import { checkTestAmendments } from './checks/test-amendments.mjs';
import { resolveDepth } from './depth.mjs';
import { checkTestLevels } from './checks/test-levels.mjs';
import { cyclePlanFor } from './test-plan.mjs';
import { checkDocsImpact } from './checks/docs-impact.mjs';
import { checkUserDocsUpdated } from './checks/user-docs-updated.mjs';
import { checkDesignApproved } from './checks/design-approved.mjs';
import { checkClaimChecked } from './checks/claim-checked.mjs';
import { DESIGN_DOC_CHECKS, DESIGN_WARNING_RULES } from './checks/design-checks.mjs';
import { checkEvidenceCited } from './checks/evidence-cited.mjs';
import { checkContrast } from './checks/contrast.mjs';
import { checkBaselines } from './checks/baselines.mjs';
import { checkFrontEndCss } from './checks/front-end-css.mjs';
import { checkFrontEndTools } from './checks/front-end-tools.mjs';
import { checkFrozen } from './checks/frozen.mjs';
import { FROZEN_TEST_MISSING, checkFrozenTestsPresent } from './checks/frozen-tests-present.mjs';
import { checkIndexFresh } from './checks/index-fresh.mjs';
import { checkLivingState } from './checks/living-state.mjs';
import { checkLivingViaDelta } from './checks/living-via-delta.mjs';
import { checkManifest, MANIFEST_ADD_AT_BASE } from './checks/manifest.mjs';
import { generatedIndexChanges } from './index-docs.mjs';
import { checkReviewClear, checkReviewRecorded } from './checks/review-clear.mjs';
import { checkNoIds } from './checks/no-ids.mjs';
import { checkOwnership, readCharters, removedCharterTeams } from './checks/ownership.mjs';
import { checkReviewerBrief } from './checks/reviewer-brief.mjs';
import { checkSecrets } from './checks/secrets.mjs';
import { checkStanceHardened } from './checks/stance-hardened.mjs';
import { checkSpec } from './checks/spec-markers.mjs';
import { VERIFICATION_RECORD, checkVerificationRecorded } from './checks/verification-recorded.mjs';
import { cardPath } from './board.mjs';
import { readCycle } from './cycle.mjs';
import { localLivingChanges, LocalDocsAttestationError } from './local-docs-attestation.mjs';
import { frozenLocalCharters, LocalCharterError } from './local-charters.mjs';
import { resolveProjectRoots } from './project-roots.mjs';
import { readDeltaRecords } from './delta.mjs';
import { CHECK_CONCERN, TIER_BOUND_CHECKS } from './concerns.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./moves.mjs').MoveContext} MoveContext */
/** @typedef {import('./git.mjs').GitRunner} GitRunner */
/** @typedef {import('./checks/boundary.mjs').CommandRunner} CommandRunner */
/** @typedef {'spec' | 'reviewer-brief' | 'design-approved' | 'frozen' | 'manifest' | 'card-contract' | 'test-levels' | 'no-ids' | 'docs-impact' | 'boundary' | 'secrets' | 'review-recorded' | 'review-clear' | 'ownership' | 'tests-fail-first' | 'card-gate' | 'test-amendments' | 'front-end-css' | 'front-end-contrast' | 'front-end-tools' | 'baselines' | 'index-fresh' | 'living-state' | 'living-via-delta' | 'verification-recorded' | 'evidence-cited' | 'claim-checked' | 'stance-hardened' | 'efv-orphans' | 'rule-has-test' | 'actor-has-action' | 'interface-has-contract-test' | 'boundary-covered' | 'atom-size' | 'deliverable-cites' | 'deliverable-fresh' | 'user-docs-updated' | 'cycle-shape-recorded'} GateCheckId */
/** @typedef {{ base?: string, run?: GitRunner, runCommand?: CommandRunner }} GateOptions */
/** @typedef {{ check: GateCheckId, reason: string }} Skipped */
/** @typedef {{ checks: Readonly<Record<GateCheckId, string | null>>, boundary_required: string | null, test_levels: Readonly<Record<string, string | null>>, sweeps: Readonly<Record<string, string | null>>, regression: Readonly<Record<string, string | null>>, signoff_required: string | null }} TierData */

export class GateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GateError';
  }
}

/** The built-in default tier table: the lowest tier at which each check runs. An installed tier pack overlays it. */
export const GATE_CHECK_MIN_TIER = Object.freeze({
  'no-ids': 'spike',
  spec: 'prototype',
  'design-approved': 'spike',
  'reviewer-brief': 'prototype',
  frozen: 'prototype',
  manifest: 'prototype',
  'card-contract': 'prototype',
  'test-levels': 'product',
  'docs-impact': 'product',
  boundary: 'product',
  secrets: 'product',
  'review-recorded': 'prototype',
  'review-clear': 'product',
  ownership: 'product',
  'tests-fail-first': 'product',
  'card-gate': 'prototype',
  'test-amendments': 'prototype',
  'front-end-css': 'product',
  'front-end-contrast': 'product',
  'front-end-tools': 'spike',
  baselines: 'prototype',
  'index-fresh': 'product',
  'living-state': 'product',
  'living-via-delta': 'spike',
  'verification-recorded': 'product',
  'evidence-cited': 'product',
  'claim-checked': 'product',
  'stance-hardened': 'hardened',
  'efv-orphans': 'product',
  'rule-has-test': 'product',
  'actor-has-action': 'product',
  'interface-has-contract-test': 'product',
  'boundary-covered': 'product',
  'atom-size': 'product',
  'deliverable-cites': 'product',
  'deliverable-fresh': 'product',
  'user-docs-updated': 'product',
  'cycle-shape-recorded': 'product',
});

/** Which checks run on each edge, keyed '<from>><to>' with column folder names. */
export const GATE_EDGES = Object.freeze({
  '00_backlog>02_ready': Object.freeze(['tests-fail-first']),
  '01_shaping>02_ready': Object.freeze(['spec', 'reviewer-brief', 'tests-fail-first', 'design-approved', 'cycle-shape-recorded']),
  '03_in_progress>04_review': Object.freeze(['frozen', 'manifest', 'card-contract', 'no-ids', 'docs-impact', 'boundary', 'secrets', 'ownership', 'card-gate', 'test-amendments', 'front-end-css', 'front-end-contrast', 'front-end-tools', 'living-via-delta', 'test-levels', 'evidence-cited', 'user-docs-updated', 'stance-hardened']),
  '04_review>05_gate': Object.freeze(['review-recorded', 'review-clear', 'verification-recorded', 'claim-checked']),
  '05_gate>06_done': Object.freeze(['docs-impact', 'baselines', 'index-fresh', 'living-state', 'evidence-cited', 'efv-orphans', 'rule-has-test', 'actor-has-action', 'interface-has-contract-test', 'boundary-covered', 'atom-size', 'deliverable-cites', 'deliverable-fresh']),
});

const NEEDS_CHANGES = new Set(['user-docs-updated', 'stance-hardened', 'manifest', 'docs-impact', 'ownership', 'test-amendments', 'front-end-css', 'baselines', 'living-via-delta']);
const NEEDS_LINES = new Set(['no-ids', 'secrets', 'front-end-css']);
const NEEDS_COMMITS = new Set(['no-ids']);
const NEEDS_HISTORY = new Set(['secrets']);
const NEEDS_BASE = new Set([...NEEDS_CHANGES, ...NEEDS_LINES, ...NEEDS_COMMITS, ...NEEDS_HISTORY]);

/** Rules reported as warnings: the gate lists them apart from findings and they never block a move. */
export const WARNING_RULES = Object.freeze(new Set(['cycle-shape-legacy', 'scope-exception', 'ownership-exception', 'living-without-delta-warning', 'red-evidence-unparsed-output', MANIFEST_ADD_AT_BASE, RED_RECORDED_EARLIER, FROZEN_TEST_MISSING, ...DESIGN_WARNING_RULES]));

export const TIER_DATA_FILE = '.process/tiers/rigor/tiers.json';

/** @type {Readonly<TierData>} */
export const DEFAULT_TIER_DATA = Object.freeze({
  checks: GATE_CHECK_MIN_TIER,
  boundary_required: 'hardened',
  test_levels: Object.freeze({ unit: 'product', integration: 'product', system: 'hardened', acceptance: 'hardened' }),
  sweeps: Object.freeze({ security: 'hardened', 'unhappy-path': 'hardened', 'malicious-path': 'hardened', 'red-team': 'hardened' }),
  regression: Object.freeze({ selection: 'product', 'full-suite': 'hardened' }),
  signoff_required: 'hardened',
});

/**
 * @param {string} from column folder name
 * @param {string} to column folder name
 * @param {string} tier
 * @param {TierData} [data] the tier data; the built-in default when omitted
 * @param {Record<string, string>} [concerns] the tier of each concern; a check is judged against the tier of its own concern, and every concern not named holds `tier`
 * @returns {{ run: GateCheckId[], skipped: Skipped[] }}
 */
export function selectChecks(from, to, tier, data = DEFAULT_TIER_DATA, concerns = {}) {
  const ids = /** @type {readonly GateCheckId[]} */ (GATE_EDGES[`${from}>${to}`] ?? []);
  /** @type {GateCheckId[]} */
  const run = [];
  /** @type {Skipped[]} */
  const skipped = [];
  for (const check of ids) {
    const need = data.checks[check];
    if (need === null) skipped.push({ check, reason: `turned off in ${TIER_DATA_FILE}` });
    else if (TIERS.indexOf(need) <= Math.max(TIERS.indexOf(concerns[CHECK_CONCERN[check]] ?? tier), TIER_BOUND_CHECKS.has(check) ? TIERS.indexOf(tier) : -1)) run.push(check);
    else skipped.push({ check, reason: `needs ${need} tier or higher` });
  }
  return { run, skipped };
}

const finding = (rule, message) => ({ rule, message });
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Reads the installed rigor tier data. Never throws and never writes. Absent: the built-in default. Invalid: the
 * default plus one gate-tier-data-invalid finding naming the problem.
 * @param {string} projectDir
 * @returns {{ data: TierData, source: 'installed' | 'default', findings: Finding[] }}
 */
export function readTierData(projectDir) {
  const invalid = (problem) => ({
    data: DEFAULT_TIER_DATA,
    source: /** @type {'default'} */ ('default'),
    findings: [finding('gate-tier-data-invalid', `${TIER_DATA_FILE} ${problem}. Fix the file, or delete it to use the built-in tier table.`)],
  });
  let text;
  try {
    text = readFileSync(join(projectDir, TIER_DATA_FILE), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { data: DEFAULT_TIER_DATA, source: 'default', findings: [] };
    return invalid(`cannot be read (${err.message})`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return invalid(`is not valid JSON (${err.message})`);
  }
  if (!isPlainObject(parsed)) return invalid('must be a JSON object with checks, boundary_required, test_levels, sweeps, regression and signoff_required');
  const allowed = ['checks', 'boundary_required', 'test_levels', 'sweeps', 'regression', 'signoff_required'];
  const unknownKey = Object.keys(parsed).find((key) => !allowed.includes(key));
  if (unknownKey !== undefined) return invalid(`has an unknown key "${unknownKey}"; only ${allowed.join(', ')} are allowed`);
  const tierOrNull = (value) => value === null || TIERS.includes(value);
  const overlay = {};
  if ('checks' in parsed) {
    if (!isPlainObject(parsed.checks)) return invalid('checks must be an object mapping a check id to a tier or null');
    for (const [id, value] of Object.entries(parsed.checks)) {
      if (!Object.hasOwn(GATE_CHECK_MIN_TIER, id)) return invalid(`checks names unknown check "${id}"; known checks are ${Object.keys(GATE_CHECK_MIN_TIER).join(', ')}`);
      if (!tierOrNull(value)) return invalid(`checks.${id} is ${JSON.stringify(value)}; use one of ${TIERS.join(', ')} or null`);
      overlay[id] = value;
    }
  }
  let boundaryRequired = DEFAULT_TIER_DATA.boundary_required;
  if ('boundary_required' in parsed) {
    if (!tierOrNull(parsed.boundary_required)) return invalid(`boundary_required is ${JSON.stringify(parsed.boundary_required)}; use one of ${TIERS.join(', ')} or null`);
    boundaryRequired = parsed.boundary_required;
  }
  const tierMap = (key, names) => {
    const value = parsed[key];
    if (value === undefined) return { ...DEFAULT_TIER_DATA[key] };
    if (!isPlainObject(value)) return invalid(`${key} must be an object mapping a name to a tier or null`);
    const result = { ...DEFAULT_TIER_DATA[key] };
    for (const [name, minimum] of Object.entries(value)) {
      if (!names.includes(name)) return invalid(`${key} names unknown entry "${name}"; known entries are ${names.join(', ')}`);
      if (!tierOrNull(minimum)) return invalid(`${key}.${name} is ${JSON.stringify(minimum)}; use one of ${TIERS.join(', ')} or null`);
      result[name] = minimum;
    }
    return result;
  };
  const testLevels = tierMap('test_levels', TEST_LEVELS);
  if ('findings' in testLevels) return testLevels;
  const sweeps = tierMap('sweeps', SWEEP_LENSES);
  if ('findings' in sweeps) return sweeps;
  const regression = tierMap('regression', REGRESSION_MODES);
  if ('findings' in regression) return regression;
  let signoffRequired = DEFAULT_TIER_DATA.signoff_required;
  if ('signoff_required' in parsed) {
    if (!tierOrNull(parsed.signoff_required)) return invalid(`signoff_required is ${JSON.stringify(parsed.signoff_required)}; use one of ${TIERS.join(', ')} or null`);
    signoffRequired = parsed.signoff_required;
  }
  return { data: { checks: { ...GATE_CHECK_MIN_TIER, ...overlay }, boundary_required: boundaryRequired, test_levels: testLevels, sweeps, regression, signoff_required: signoffRequired }, source: 'installed', findings: [] };
}

/** Whether a file is committed at the base commit; a path git cannot look up counts as absent. */
function existsAtBaseCommit(projectDir, base, path, run) {
  try {
    return fileAtCommit(projectDir, base, path, run) !== null;
  } catch (cause) {
    if (cause instanceof GitError) return false;
    throw cause;
  }
}

/**
 * Runs the checks the tier and edge call for. Reads git only when a selected check needs it; never writes.
 * @param {MoveContext} ctx
 * @param {GateOptions} [options]
 * @returns {{ findings: Finding[], skipped: Skipped[], warnings?: Finding[] }} warnings are findings that never block a
 *   move (WARNING_RULES); they are absent on an early return
 */
export function gateFindings(ctx, options = {}) {
  const { projectDir, card, from, to, tier } = ctx;
  /** The tier of one concern; every concern holds the move's tier unless the caller resolved them apart. */
  const at = (concern) => ctx.concerns?.[concern] ?? tier;
  if (!TIERS.includes(tier)) {
    return {
      findings: [finding('gate-tier-unknown', `Tier "${tier}" is not one of ${TIERS.join(', ')}, so no gate checks can be chosen. Fix tier in .process/aperture.json.`)],
      skipped: [],
    };
  }
  if (!Object.hasOwn(GATE_EDGES, `${from}>${to}`)) return { findings: [], skipped: [] };
  const tierData = readTierData(projectDir);
  if (tierData.findings.length > 0) return { findings: tierData.findings, skipped: [] };
  const { data } = tierData;
  const selected = selectChecks(from, to, tier, data, ctx.concerns);
  if (from === '00_backlog' && card.type !== 'bug') selected.run = selected.run.filter((id) => id !== 'tests-fail-first');
  let verificationRequired = false;
  if (from === '04_review' && to === '05_gate' && data.checks['verification-recorded'] !== null) {
    const location = cardPath(projectDir, card.id);
    const cycleName = location?.cycle;
    let selectedDepth = false;
    if (cycleName !== null && cycleName !== undefined) {
      try {
        const cycle = readCycle(projectDir, cycleName);
        selectedDepth = cycle.verification_levels.length > 0 || cycle.review_sweeps.length > 0;
      } catch (cause) {
        return { findings: [finding('verification-cycle-invalid', `Cannot read cycle ${cycleName} to choose card verification (${cause.message}). Repair its CYCLE.md before moving the card.`)], skipped: selected.skipped };
      }
    }
    const depth = resolveDepth({ tierData: data, tier: at('test-depth'), card });
    const floor = CYCLE_LEVELS.some((level) => depth.levels[level].selected) || requiredAt(data.sweeps, at('review')).length > 0;
    verificationRequired = selectedDepth || floor;
    let recordPresent = false;
    if (location !== null) {
      try { lstatSync(join(location.dir, VERIFICATION_RECORD)); recordPresent = true; }
      catch (cause) { recordPresent = cause.code !== 'ENOENT'; }
    }
    if ((verificationRequired || recordPresent) && !selected.run.includes('verification-recorded')) {
      selected.run.push('verification-recorded');
      selected.skipped = selected.skipped.filter(({ check }) => check !== 'verification-recorded');
    }
  }
  const recheckLocalReview = from === '05_gate' && to === '06_done'
    && selectChecks('04_review', '05_gate', tier, data, ctx.concerns).run.includes('review-recorded')
    && resolveProjectRoots(projectDir).mode === 'local';
  if (selected.run.length === 0) {
    return { findings: recheckLocalReview ? checkReviewRecorded({ projectDir, card }) : [], skipped: selected.skipped };
  }

  const config = /** @type {Record<string, unknown>} */ (readConfig(projectDir));
  if ('gate' in config && !isPlainObject(config.gate)) {
    return { findings: [finding('gate-config-invalid', 'gate in .process/aperture.json must be an object (boundary, boundary_canary, front_end). Fix it there.')], skipped: [] };
  }
  const settings = /** @type {Record<string, unknown>} */ (config.gate ?? {});
  let run = selected.run;
  const skipped = [...selected.skipped];
  const boundaryRequired = data.boundary_required !== null && TIERS.indexOf(data.boundary_required) <= TIERS.indexOf(at('code-hygiene'));
  if (run.includes('boundary') && settings.boundary === undefined && !boundaryRequired) {
    run = run.filter((id) => id !== 'boundary');
    skipped.push({ check: 'boundary', reason: 'gate.boundary is not configured' });
  }
  /** @type {Finding[]} */
  const findings = [];
  const frontEnd = settings.front_end;
  const frontEndIds = /** @type {GateCheckId[]} */ (['front-end-css', 'front-end-contrast', 'front-end-tools', 'baselines']).filter((id) => run.includes(id));
  if (frontEndIds.length > 0 && !isPlainObject(frontEnd)) {
    run = run.filter((id) => !frontEndIds.includes(id));
    if (frontEnd === undefined) {
      for (const check of frontEndIds) skipped.push({ check, reason: 'gate.front_end is not configured' });
    } else {
      findings.push(finding('front-end-config-invalid', 'gate.front_end in .process/aperture.json must be an object (token_files, tokens, contrast_pairs, motion_reset, tools, baselines). Fix it there; use {} for the defaults.'));
    }
  } else if (isPlainObject(frontEnd)) {
    const tools = /** @type {Record<string, unknown>} */ (frontEnd).tools;
    const toolsUnset = run.includes('front-end-tools') && (tools === undefined || (Array.isArray(tools) && tools.length === 0));
    const baselinesUnset = run.includes('baselines') && /** @type {Record<string, unknown>} */ (frontEnd).baselines === undefined;
    if (toolsUnset) skipped.push({ check: 'front-end-tools', reason: 'gate.front_end.tools is not configured' });
    if (baselinesUnset) skipped.push({ check: 'baselines', reason: 'gate.front_end.baselines is not configured' });
    run = run.filter((id) => !(id === 'front-end-tools' && toolsUnset) && !(id === 'baselines' && baselinesUnset));
  }
  const cardGate = /** @type {{ gate: unknown, criteria: unknown }} */ (card);
  const isBug = card.type === 'bug';
  /** What a bug card lacks for its failing test: a bug card is never skipped for it, the gap is a finding. */
  let bugMissing = null;
  const needsGateCommand = ['tests-fail-first', 'card-gate'].filter((id) => run.includes(/** @type {GateCheckId} */ (id)) && cardGate.gate === null);
  for (const id of needsGateCommand) {
    if (id === 'tests-fail-first' && isBug) bugMissing = 'gate command (set gate in card.json to the one narrow command that runs the failing regression test)';
    else skipped.push({ check: /** @type {GateCheckId} */ (id), reason: 'the card has no gate command' });
  }
  if (run.includes('tests-fail-first') && !needsGateCommand.includes('tests-fail-first')) {
    const criteria = Array.isArray(cardGate.criteria) ? cardGate.criteria : [];
    if (!criteria.some((c) => c !== null && typeof c === 'object' && c.verify === 'test')) {
      needsGateCommand.push('tests-fail-first');
      if (isBug) bugMissing = 'criterion verified by test (add one to card.json with verify "test" that names the failing regression test)';
      else skipped.push({ check: 'tests-fail-first', reason: 'no criterion is verified by test' });
    }
  }
  run = run.filter((id) => !needsGateCommand.includes(id) || (id === 'tests-fail-first' && isBug));

  const recorded = /** @type {{ base_commit?: unknown }} */ (card).base_commit;
  const base = options.base ?? (typeof recorded === 'string' && recorded !== '' ? recorded : undefined);
  let gitReady = true;
  if (run.some((id) => NEEDS_BASE.has(id)) && base === undefined) {
    findings.push(
      finding(
        'gate-base-missing',
        'The diff checks need the commit the work started from. Pass --base <ref> (that commit), or move the card from ready to in progress through card-move, which records it.',
      ),
    );
    gitReady = false;
  }

  /** @type {any[] | undefined} */
  let changes;
  /** @type {any[] | undefined} */
  let lines;
  /** @type {any[] | undefined} */
  let commits;
  /** @type {any[] | undefined} */
  let history;
  /** @type {any[]} */
  let charters = [];
  /** @type {{ exempt: Set<string>, why: Map<string, string> }} */
  let indexChanges = { exempt: new Set(), why: new Map() };
  /** @type {string | undefined} */
  let baseCommit;
  if (gitReady && base !== undefined) {
    try {
      assertTopLevel(projectDir, { run: options.run });
      const diffBase = effectiveBase(projectDir, base, options.run);
      baseCommit = diffBase;
      if (run.some((id) => NEEDS_CHANGES.has(id))) changes = changedFiles(projectDir, diffBase, options.run);
      if (changes !== undefined) {
        try {
          changes.push(...(localLivingChanges(projectDir, card) ?? []));
        } catch (cause) {
          if (!(cause instanceof LocalDocsAttestationError)) throw cause;
          findings.push(finding('unverifiable-local-docs', `${cause.message} Local document changes cannot be compared with the manifest or ownership rules.`));
        }
      }
      if (changes !== undefined && (run.includes('manifest') || run.includes('ownership'))) indexChanges = generatedIndexChanges(projectDir, /** @type {any[]} */ (changes), diffBase, options.run);
      if (run.some((id) => NEEDS_LINES.has(id))) lines = addedLines(projectDir, diffBase, options.run);
      if (run.some((id) => NEEDS_COMMITS.has(id))) commits = commitsInRange(projectDir, diffBase, options.run);
      if (run.some((id) => NEEDS_HISTORY.has(id))) history = commitAddedLines(projectDir, diffBase, options.run);
      if (run.includes('ownership')) {
        if (resolveProjectRoots(projectDir).mode === 'local') {
          try {
            charters = frozenLocalCharters(projectDir, card.freeze?.local_charters_sha256 ?? (card.type === 'bug' ? card.local_baseline?.local_charters_sha256 : undefined));
          } catch (cause) {
            if (!(cause instanceof LocalCharterError)) throw cause;
            findings.push(finding('unverifiable-local-charters', cause.message));
          }
        } else {
          charters = readCharters(projectDir, diffBase, options.run, removedCharterTeams(changes ?? []));
        }
      }
    } catch (err) {
      if (!(err instanceof GitError)) throw err;
      findings.push(finding('gate-git-failed', err.message));
      gitReady = false;
    }
  }

  for (const id of run) {
    if (NEEDS_BASE.has(id) && !gitReady) continue;
    switch (id) {
      case 'spec':
        findings.push(...checkSpec({ projectDir, card }));
        break;
      case 'design-approved': {
        const result = checkDesignApproved({ projectDir, card });
        findings.push(...result.findings);
        if (result.skipped) skipped.push({ check: 'design-approved', reason: result.skipped });
        break;
      }
      case 'reviewer-brief':
        findings.push(...checkReviewerBrief({ projectDir, card }));
        break;
      case 'frozen':
        findings.push(...checkFrozen({ projectDir, card }));
        break;
      case 'manifest':
        findings.push(...checkManifest({ card, changes: /** @type {any[]} */ (changes), existsAtBase: baseCommit === undefined ? undefined : (path) => existsAtBaseCommit(projectDir, baseCommit, path, options.run), generatedIndexes: indexChanges.exempt, generatedIndexNotes: indexChanges.why, exceptions: readScopeExceptions(projectDir, card.id) }));
        break;
      case 'card-contract':
        findings.push(...checkCardContract({ projectDir, card, tier: at('documentation') }));
        break;
      case 'test-levels':
        findings.push(...checkTestLevels({ card, tier: at('test-depth'), tierData: data, cyclePlan: cyclePlanFor(projectDir, card, data) }).findings);
        break;
      case 'no-ids':
        findings.push(...checkNoIds({ addedLines: lines, commits }));
        break;
      case 'docs-impact':
        findings.push(...checkDocsImpact({ projectDir, card, changes: /** @type {any[]} */ (changes), allowDeferred: to !== '06_done' }));
        break;
      case 'boundary':
        findings.push(...checkBoundary({ projectDir, tier: at('code-hygiene'), gate: settings, run: options.runCommand, required: boundaryRequired }));
        break;
      case 'secrets':
        findings.push(...checkSecrets({ addedLines: /** @type {any[]} */ (lines), commitLines: history }));
        break;
      case 'ownership':
        findings.push(...checkOwnership({ card, charters, changes: /** @type {any[]} */ (changes), generatedIndexes: indexChanges.exempt, generatedIndexNotes: indexChanges.why, exceptions: readScopeExceptions(projectDir, card.id) }));
        break;
      case 'tests-fail-first':
        if (bugMissing !== null) findings.push(finding('bug-no-failing-test', `A bug card needs a failing regression test before it is ready, and this card has no ${bugMissing}.`));
        else findings.push(...checkRedEvidence({ projectDir, card, run: options.runCommand }));
        findings.push(...checkRootCause({ projectDir, card }));
        break;
      case 'card-gate':
        findings.push(...checkCardGate({ projectDir, card, expect: 'pass', run: options.runCommand }));
        break;
      case 'test-amendments':
        findings.push(...checkTestAmendments({ card, changes: /** @type {any[]} */ (changes) }));
        if (baseCommit !== undefined) findings.push(...checkFrozenTestsPresent({ projectDir, card, base: baseCommit, run: options.run }));
        break;
      case 'front-end-css':
        findings.push(...checkFrontEndCss({ projectDir, changes: /** @type {any[]} */ (changes), addedLines: /** @type {any[]} */ (lines), settings: /** @type {Record<string, unknown>} */ (frontEnd) }));
        break;
      case 'front-end-contrast':
        findings.push(...checkContrast({ projectDir, settings: /** @type {Record<string, unknown>} */ (frontEnd) }));
        break;
      case 'front-end-tools':
        findings.push(...checkFrontEndTools({ projectDir, tier: at('code-hygiene'), settings: /** @type {Record<string, unknown>} */ (frontEnd), run: options.runCommand }));
        break;
      case 'baselines':
        findings.push(...checkBaselines({ projectDir, card, changes: /** @type {any[]} */ (changes), settings: /** @type {Record<string, unknown>} */ (frontEnd) }));
        break;
      case 'review-recorded':
        findings.push(...checkReviewRecorded({ projectDir, card }));
        break;
      case 'review-clear':
        findings.push(...checkReviewClear({ projectDir, card }));
        break;
      case 'index-fresh':
        findings.push(...checkIndexFresh({ projectDir }));
        break;
      case 'living-state':
        findings.push(...checkLivingState({ projectDir }));
        break;
      case 'living-via-delta':
        findings.push(...checkLivingViaDelta({ projectDir, changes: /** @type {any[]} */ (changes), tier: at('documentation'), card }));
        break;
      case 'verification-recorded':
        findings.push(...checkVerificationRecorded({ projectDir, card, required: verificationRequired, tier: at('test-depth'), run: options.run }));
        break;
      case 'user-docs-updated':
        findings.push(...checkUserDocsUpdated({ projectDir, card, changes: /** @type {any[]} */ (changes) }));
        break;
      case 'stance-hardened':
        findings.push(...checkStanceHardened({ projectDir, card, changes: /** @type {any[]} */ (changes) }));
        break;
      case 'cycle-shape-recorded':
        findings.push(...checkCycleShapeRecorded({ projectDir, card, from, to }));
        break;
      case 'claim-checked':
        findings.push(...checkClaimChecked({ projectDir, card, records: readDeltaRecords(projectDir) }));
        break;
      case 'evidence-cited':
        findings.push(...checkEvidenceCited({ projectDir, records: readDeltaRecords(projectDir), run: options.run }));
        break;
      default:
        if (Object.hasOwn(DESIGN_DOC_CHECKS, id)) findings.push(...DESIGN_DOC_CHECKS[id]({ projectDir, run: options.run }));
    }
  }
  if (recheckLocalReview) {
    findings.push(...checkReviewRecorded({ projectDir, card }));
  }
  const warnings = findings.filter((f) => WARNING_RULES.has(f.rule));
  return { findings: findings.filter((f) => !WARNING_RULES.has(f.rule)), skipped, warnings };
}

/** @type {(() => void) | null} */
let active = null;

/**
 * Registers one guard per gated edge with the move engine. Explicit, never an import side effect.
 * @param {GateOptions & { onSkipped?: (list: Skipped[]) => void, onWarnings?: (list: Finding[]) => void }} [options] onWarnings receives the warnings of
 *   a guarded move whenever there are any; onSkipped receives the skipped checks of
 *   a guarded move whenever there are any; the guard itself returns only findings
 * @returns {() => void} removes every guard again
 */
export function registerGateChecks(options = {}) {
  if (active !== null) {
    throw new GateError('Gate checks are already registered; registering twice would report every finding twice. Call the function returned by the first registration before registering again.');
  }
  const { onSkipped, onWarnings, ...gateOptions } = options;
  const removers = Object.keys(GATE_EDGES).map((key) => {
    const [from, to] = key.split('>');
    return registerGuard(from, to, (ctx) => {
      const { findings, skipped, warnings = [] } = gateFindings(ctx, gateOptions);
      if (onSkipped && skipped.length) onSkipped(skipped);
      if (onWarnings && warnings.length) onWarnings(warnings);
      return findings;
    });
  });
  const remove = () => {
    for (const undo of removers) undo();
    if (active === remove) active = null;
  };
  active = remove;
  return remove;
}
