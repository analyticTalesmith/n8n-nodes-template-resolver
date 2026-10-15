import { detectEol, stripBom, toLf } from './files.mjs';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cardPath } from './board.mjs';
import { readFrontmatter } from './frontmatter.mjs';
import { PROCESS_CORE, PROCESS_DIR, cyclePaths } from './layout.mjs';
import {
  CYCLE_DIMENSIONS,
  ProfileError,
  derive,
  factsOf,
  inferLegibility,
  parsePredicate,
  profileProblems,
  readProjectProfile,
} from './profile.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/**
 * Kinds and stages are pack data: one small markdown file each, in the atomic-document format (frontmatter with an
 * id, a type and a one-line summary, then a short body). Installed packs put them under `.process/shapes/<pack>/`;
 * a project's own live in `.process/kinds/` and `.process/stages/` and win over a pack's with the same name.
 */

export const SHAPES_DIR = `${PROCESS_DIR}/shapes`;
export const LOCAL_KINDS_DIR = `${PROCESS_DIR}/kinds`;
export const LOCAL_STAGES_DIR = `${PROCESS_DIR}/stages`;
export const PHASES = Object.freeze(['down', 'implement', 'up', 'release', 'learn']);
export const SKIP_RULES = Object.freeze(['never', 'manual']);
/** The artifacts a stage may be derived done from; a stage with none of these is recorded by hand. */
export const EVIDENCE_SOURCES = Object.freeze(['shape-line', 'test-plan', 'close-review', 'red-evidence']);
/** The grains a stage may have: a stage with the card grain is derived from each card of the cycle, never recorded by hand. */
export const STAGE_GRAINS = Object.freeze(['card']);

export class ShapeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ShapeError';
  }
}

/**
 * @typedef {{ id: string, name: string, summary: string, values: Record<string, string | string[]>, teams: string[], runs: { stage: string, when: string | null }[], how: string, path: string }} Kind
 * @typedef {{ id: string, code: string, name: string, phase: string, form: string, owner: string | null, who: string, risk: string, skip: string, addWhen: string | null, minimal: boolean, spine: boolean, evidenceFrom: string | null, grain: 'card' | null, today: string, todayNote: string, pairs: string[], body: string, path: string }} Stage
 */

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const markdownIn = (dir) => {
  try {
    return readdirSync(dir).filter((name) => name.endsWith('.md') && name !== 'INDEX.md').sort().map((name) => join(dir, name));
  } catch {
    return [];
  }
};
const bodyOf = (content) => {
  const lines = stripBom(content).split(/\r?\n/);
  const close = lines.findIndex((line, i) => i > 0 && /^---[ \t]*$/.test(line));
  return lines.slice(close + 1).join('\n');
};
const section = (body, heading) => {
  const lines = body.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return '';
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('## ')) end += 1;
  return lines.slice(start + 1, end).join('\n').trim();
};
const asList = (value) => (Array.isArray(value) ? value.map(String) : typeof value === 'string' && value !== '' ? [value] : []);

/** @returns {Stage | string} the stage, or the problem with the file */
function parseStage(file, content) {
  const fm = readFrontmatter(content);
  if (fm === null || fm.type !== 'stage') return `${file} is not a stage: it needs frontmatter with type: stage.`;
  for (const field of ['id', 'code', 'summary', 'phase', 'skip']) if (text(fm[field]) === '') return `${file} has no ${field}.`;
  if (!PHASES.includes(fm.phase)) return `${file} has the phase "${fm.phase}". Use one of ${PHASES.join(', ')}.`;
  const links = asList(fm.links);
  const pairs = links.map((item) => /^pairs-with:\s*(\S+)$/.exec(item.trim())?.[1]).filter(Boolean);
  const evidenceFrom = text(fm['evidence-from']) || null;
  if (evidenceFrom !== null && !EVIDENCE_SOURCES.includes(evidenceFrom)) return `${file} has the evidence-from "${evidenceFrom}". Use one of ${EVIDENCE_SOURCES.join(', ')}.`;
  const grain = text(fm.grain) || null;
  if (grain !== null && !STAGE_GRAINS.includes(grain)) return `${file} has the grain "${grain}". Use ${STAGE_GRAINS.join(' or ')}, or leave it out.`;
  if (grain === 'card' && evidenceFrom !== 'red-evidence') return `${file} has the card grain but names no per-card evidence. Set evidence-from: red-evidence.`;
  try {
    parsePredicate(fm.skip);
    if (text(fm['add-when']) !== '') parsePredicate(fm['add-when']);
  } catch (cause) {
    if (cause instanceof ProfileError) return `${file}: ${cause.message}`;
    throw cause;
  }
  return {
    id: text(fm.id), code: text(fm.code), name: text(fm.summary), phase: fm.phase, form: text(fm.form), owner: text(fm.owner) || null,
    who: text(fm.who), risk: text(fm.risk), skip: text(fm.skip), addWhen: text(fm['add-when']) || null, minimal: fm.minimal === 'yes',
    spine: fm.spine === 'yes', evidenceFrom, grain,
    today: text(fm.today), todayNote: text(fm['today-note']), pairs, body: bodyOf(content).replace(/^\s*# .*\n/, '').trim(), path: file,
  };
}

/** @returns {Kind | string} the kind, or the problem with the file */
function parseKind(file, content) {
  const fm = readFrontmatter(content);
  if (fm === null || fm.type !== 'kind') return `${file} is not a kind: it needs frontmatter with type: kind.`;
  const id = text(fm.id);
  if (!/^kind-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return `${file} has the id "${id}". A kind id is kind- and a lowercase name.`;
  if (text(fm.summary) === '') return `${file} has no summary.`;
  /** @type {Record<string, string | string[]>} */
  const values = {};
  for (const key of [...Object.keys(CYCLE_DIMENSIONS), 'lens']) {
    if (fm[key] === undefined) continue;
    values[key] = Array.isArray(fm[key]) ? fm[key] : fm[key];
  }
  const problems = profileProblems(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value])));
  if (problems.length > 0) return `${file}: ${problems[0]}`;
  const runs = [];
  for (const item of asList(fm.links)) {
    const match = /^runs:\s*(stg-[a-z0-9]+(?:-[a-z0-9]+)*)(?:\s+when\s+(.+))?$/.exec(item.trim());
    if (match === null) return `${file} has the link "${item}". Write each as "runs: stg-name" or "runs: stg-name when <rule>".`;
    try {
      if (match[2] !== undefined) parsePredicate(match[2]);
    } catch (cause) {
      if (cause instanceof ProfileError) return `${file}: ${cause.message}`;
      throw cause;
    }
    runs.push({ stage: match[1], when: match[2]?.trim() ?? null });
  }
  return { id, name: id.slice('kind-'.length), summary: text(fm.summary), values, teams: asList(fm.teams), runs, how: section(bodyOf(content), 'How this goes'), path: file };
}

/**
 * Reads every kind and stage the project has: installed packs first, the project's own last so they win. A bad file is
 * reported in findings and left out; nothing here throws for file contents.
 * @param {string} projectDir
 * @returns {{ kinds: Map<string, Kind>, stages: Map<string, Stage>, findings: string[] }}
 */
export function loadShapes(projectDir) {
  const kinds = new Map();
  const stages = new Map();
  const findings = [];
  const packs = (() => {
    try {
      return readdirSync(join(projectDir, SHAPES_DIR), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    } catch {
      return [];
    }
  })();
  const sources = [
    ...packs.flatMap((pack) => [['kind', join(projectDir, SHAPES_DIR, pack, 'kinds')], ['stage', join(projectDir, SHAPES_DIR, pack, 'stages')]]),
    ['kind', join(projectDir, LOCAL_KINDS_DIR)],
    ['stage', join(projectDir, LOCAL_STAGES_DIR)],
  ];
  for (const [what, dir] of sources) {
    for (const file of markdownIn(dir)) {
      const result = (what === 'kind' ? parseKind : parseStage)(file, readFileSync(file, 'utf8'));
      if (typeof result === 'string') findings.push(result);
      else if (what === 'kind') kinds.set(result.name, /** @type {Kind} */ (result));
      else stages.set(result.id, /** @type {Stage} */ (result));
    }
  }
  return { kinds, stages, findings };
}

/**
 * The shape of a cycle: the profile (a kind's defaults, then each setting on top, one dimension at a time), the derived
 * values, and the stage set. The stage set is the always-present minimal stages, the stages the kind runs (those with a
 * rule only when it holds) and any stage whose own add rule holds for this profile.
 * @param {string} projectDir
 * @param {{ kind: string | null, set?: Record<string, string | string[]>, legibility?: { value: string, source: string } }} input
 */
export function resolveShape(projectDir, { kind, set = {}, legibility }) {
  const data = loadShapes(projectDir);
  let kindData = null;
  if (kind !== null && kind !== 'custom') {
    kindData = data.kinds.get(kind) ?? data.kinds.get(kind.replace(/^kind-/, '')) ?? null;
    if (kindData === null) {
      const known = [...data.kinds.keys()];
      throw new ShapeError(
        known.length === 0
          ? `No kinds are installed, so --kind ${kind} cannot be used. Add the shapes pack with: node ${PROCESS_CORE}/scripts/add.mjs <projectDir> work-profile, or use --kind custom and set each dimension with --set.`
          : `Unknown kind "${kind}". Use one of: ${known.join(', ')}, or custom.`,
      );
    }
  }
  /** @type {Record<string, string | string[]>} */
  const values = { ...(kindData?.values ?? {}), ...set };
  const overrides = Object.keys(set).filter((key) => kindData === null || JSON.stringify(kindData.values[key]) !== JSON.stringify(set[key]));
  let leg = legibility;
  if (set.legibility !== undefined) leg = { value: String(set.legibility), source: 'confirmed' };
  else if (leg === undefined) leg = { value: inferLegibility(projectDir), source: 'inferred' };
  values.legibility = leg.value;
  const project = readProjectProfile(projectDir);
  const derived = derive(values, project);
  const facts = factsOf(values, project);

  /** @type {{ stage: Stage, why: 'minimal' | 'kind' | 'rule' }[]} */
  const chosen = [];
  const take = (stage, why) => {
    if (!chosen.some((c) => c.stage.id === stage.id)) chosen.push({ stage, why });
  };
  for (const stage of data.stages.values()) if (stage.minimal) take(stage, 'minimal');
  for (const { stage: id, when } of kindData?.runs ?? []) {
    const stage = data.stages.get(id);
    if (stage === undefined) throw new ShapeError(`Kind ${kindData.name} runs ${id}, which is not in the stage catalog. Install the shapes pack again or fix the kind.`);
    if (when === null || parsePredicate(when).test(facts)) take(stage, 'kind');
  }
  for (const stage of data.stages.values()) if (stage.addWhen !== null && parsePredicate(stage.addWhen).test(facts)) take(stage, 'rule');
  const rank = (s) => [PHASES.indexOf(s.phase), s.code];
  chosen.sort((a, b) => {
    const [pa, ca] = rank(a.stage);
    const [pb, cb] = rank(b.stage);
    return pa - pb || (ca < cb ? -1 : ca > cb ? 1 : 0);
  });
  return { kind: kindData, values, overrides, legibility: leg, project, derived, facts, stages: chosen, findings: data.findings };
}

/** True when a stage's own skip rule holds for the facts. */
export const skipHolds = (stage, facts) => parsePredicate(stage.skip).test(facts);

/** A stage that can never be waived: the spine, a minimal stage or one whose own rule is "never". */
export const neverSkipped = (stage) => stage.spine || stage.minimal || stage.skip === 'never';

/** The stages the lighter path keeps beyond the spine, besides any stage that is never skipped: a red-first test and a blind review. */
export const LIGHTER_KEPT = Object.freeze(['stg-red-first-tests', 'stg-independent-review']);

/**
 * Whether a profile is a one-card feature: kind feature, size card, reversibility trivial. Recorded values choose it;
 * uncertainty is not part of it.
 * @param {string | null | undefined} kind
 * @param {Record<string, unknown> | undefined} values
 */
export const isLighter = (kind, values) => kind === 'feature' && values?.size === 'card' && values?.reversibility === 'trivial';

/**
 * The name and goal of the cycle a card sits in when that cycle is a one-card feature (the lighter path); null for any
 * other card or when the cycle brief cannot be read. Reads the brief's own frontmatter, so checks can ask it cheaply.
 * @param {string} projectDir
 * @param {string} id card id
 * @returns {{ name: string, goal: string } | null}
 */
export function lighterCycleOf(projectDir, id) {
  try {
    const name = cardPath(projectDir, id)?.cycle;
    if (name === null || name === undefined) return null;
    const data = readFrontmatter(readFileSync(resolveProjectPath(resolveProjectRoots(projectDir), cyclePaths(name).brief), 'utf8'));
    return data !== null && isLighter(data.kind, data) ? { name, goal: String(data.goal ?? '') } : null;
  } catch {
    return null;
  }
}

/** Why a stage of the full feature is not listed on the lighter path. */
const droppedReason = (stage, facts) =>
  skipHolds(stage, facts) ? 'its own skip rule holds for a one-card change' : 'a one-card change with trivial reversibility runs the spine, a red-first test and a blind review';

/**
 * Sorts the stage catalog into the tiers of one cycle. The spine is the shape's stages that always run; it is the only hard gate. The suggested
 * stages are the shape's stages whose own skip rule does not hold for the profile. A stage of the shape whose skip rule
 * holds is "not needed" and the rest of the catalog is "other"; both are available, silent unless chosen on purpose.
 * @param {ReturnType<typeof resolveShape>} shape
 * @param {Map<string, Stage>} catalog every stage the project has
 */
export function stageTiers(shape, catalog) {
  const inShape = new Set(shape.stages.map(({ stage }) => stage.id));
  const spine = [];
  const suggested = [];
  const notNeeded = [];
  for (const { stage, why } of shape.stages) {
    if (stage.spine) spine.push({ stage, why });
    else if (skipHolds(stage, shape.facts)) notNeeded.push({ stage, why });
    else suggested.push({ stage, why });
  }
  const other = [...catalog.values()].filter((stage) => !inShape.has(stage.id));
  return { spine, suggested, notNeeded, other, available: notNeeded.length + other.length };
}

/**
 * The tiers of a cycle as `cycle shape` lists them: stageTiers for every profile but a one-card feature, where the
 * lighter path lists the spine plus a red-first test and a blind review, and the stages the full feature lists are
 * returned as dropped, each with its reason. `dropped` is empty for every other profile.
 * @param {ReturnType<typeof resolveShape>} shape
 * @param {Map<string, Stage>} catalog
 */
export function listedTiers(shape, catalog) {
  const tiers = stageTiers(shape, catalog);
  if (!isLighter(shape.kind?.name, shape.values)) return { ...tiers, dropped: [] };
  const kept = ({ stage }) => LIGHTER_KEPT.includes(stage.id) || neverSkipped(stage);
  const dropped = shape.stages.filter((entry) => !entry.stage.spine && !kept(entry)).map((entry) => ({ ...entry, reason: droppedReason(entry.stage, shape.facts) }));
  return { ...tiers, suggested: shape.stages.filter((entry) => !entry.stage.spine && kept(entry)), notNeeded: [], dropped, available: dropped.length + tiers.other.length };
}

export const hasShapeData = (projectDir) => loadShapes(projectDir).stages.size > 0 || existsSync(join(projectDir, LOCAL_STAGES_DIR));

const list = (value) => (Array.isArray(value) ? value.join(', ') : String(value));
const SHAPE_DIMENSIONS = Object.freeze([...Object.keys(CYCLE_DIMENSIONS)]);
export const SHAPE_HEADING = '## Why this shape';
export const STAGES_HEADING = '## Stages';
const STAGE_LINE = /^- (stg-[a-z0-9]+(?:-[a-z0-9]+)*) (todo|done|skipped|added)( \(override\))?(?::[ \t]*(.*))?[ \t]*$/;
const OLD_OVERRIDE = /^override:[ \t]*/;
const STAGE_LINE_NOTE = '<!-- A stage is a question the cycle asks; record an answer only when it is surprising. Stages with an artifact are done when it exists. Record only: "- <stage> done: <evidence>" for a stage with no artifact, "- <stage> skipped (override): <reason>" for a skip where its own rule says run, and "- <stage> added: <reason>" for a stage chosen on purpose. A spine stage cannot be skipped. -->';

/** The one "Shape:" line of a cycle: the kind, each value, what was overridden, what was derived. */
export function shapeLine(shape) {
  const { kind, values, overrides, legibility, derived } = shape;
  const parts = SHAPE_DIMENSIONS.filter((key) => values[key] !== undefined).map((key) => `${key} ${list(values[key])}`);
  const lens = Array.isArray(values.lens) && values.lens.length > 0 ? `; lens ${list(values.lens)}` : '';
  const named = kind === null ? 'custom' : kind.name;
  const confirmed = legibility.source === 'confirmed' ? 'confirmed' : 'inferred, unconfirmed';
  const unset = derived.unknown.length > 0 ? `; not set: ${derived.unknown.join(', ')}` : '';
  return `Shape: kind ${named}; ${parts.join('; ')}${lens}; legibility ${values.legibility} (${confirmed}). Overrides: ${overrides.length === 0 ? 'none' : overrides.join(', ')}. Derived: risk ${derived.risk}, blast ${derived.blast}, rigor ${derived.rigor}, plan approval ${derived.approvals.plan}${unset}.`;
}

/**
 * The "Why this shape" and "Stages" sections written into a new cycle's CYCLE.md. The Stages section starts empty: a
 * stage line is written only when something is recorded.
 * @param {ReturnType<typeof resolveShape> | null} shape null for a cycle opened with no kind
 */
export function shapeSection(shape) {
  if (shape === null) {
    return [SHAPE_HEADING, '', 'Shape: default (no kind chosen). The tier and approvals come from the project posture and no stage list is kept.', ''].join('\n');
  }
  return [SHAPE_HEADING, '', shapeLine(shape), '', STAGES_HEADING, '', STAGE_LINE_NOTE, ''].join('\n');
}

/**
 * Reads the shape record out of a cycle brief. Pure.
 * @param {string} briefText
 * @returns {{ line: string | null, stages: Map<string, { status: 'todo' | 'done' | 'skipped' | 'added', text: string, override: boolean }>, hasSection: boolean }}
 */
export function parseShapeRecord(briefText) {
  const lines = toLf(briefText).split('\n');
  const start = lines.findIndex((line) => line.trimEnd() === SHAPE_HEADING);
  const stages = new Map();
  if (start === -1) return { line: null, stages, hasSection: false };
  let end = start + 1;
  while (end < lines.length && !/^## /.test(lines[end]) && !lines[end].startsWith('<!-- generated index')) end += 1;
  let shape = null;
  for (const line of lines.slice(start + 1, end)) if (shape === null && line.startsWith('Shape:')) shape = line.trim();
  let at = lines.findIndex((line) => line.trimEnd() === STAGES_HEADING);
  if (at !== -1) {
    for (at += 1; at < lines.length && !/^## /.test(lines[at]) && !lines[at].startsWith('<!-- generated index'); at += 1) {
      const match = STAGE_LINE.exec(lines[at]);
      if (match) stages.set(match[1], stageEntry(match));
    }
  }
  return { line: shape, stages, hasSection: true };
}

/** One parsed stage line. An old-format skip override ("skipped: override: <reason>") reads as an override too. */
function stageEntry(match) {
  let body = (match[4] ?? '').trim();
  let override = match[3] !== undefined;
  if (match[2] === 'skipped' && !override && OLD_OVERRIDE.test(body)) {
    override = true;
    body = body.replace(OLD_OVERRIDE, '');
  }
  return { status: /** @type {'todo' | 'done' | 'skipped' | 'added'} */ (match[2]), text: body, override };
}

/** The line a stage record is written as. */
export const stageLine = (stageId, status, text, override = false) => `- ${stageId} ${status}${override ? ' (override)' : ''}: ${text}`;

/**
 * The brief text with one stage line set: replaced where the stage already has a line, otherwise added at the end of
 * the Stages section. A status of todo removes the line. Returns null when the brief has no Stages section.
 */
export function setStageLine(briefText, stageId, status, text, override = false) {
  const eol = detectEol(briefText);
  const lines = briefText.split(/\r?\n/);
  const at = lines.findIndex((line) => STAGE_LINE.exec(line)?.[1] === stageId);
  if (at !== -1) {
    if (status === 'todo') lines.splice(at, 1);
    else lines[at] = stageLine(stageId, status, text, override);
    return lines.join(eol);
  }
  if (status === 'todo') return briefText;
  const heading = lines.findIndex((line) => line.trimEnd() === STAGES_HEADING);
  if (heading === -1) return null;
  let end = heading + 1;
  while (end < lines.length && !/^## /.test(lines[end]) && !lines[end].startsWith('<!-- generated index')) end += 1;
  let last = end - 1;
  while (last > heading && lines[last].trim() === '') last -= 1;
  lines.splice(last + 1, 0, stageLine(stageId, status, text, override));
  return lines.join(eol);
}
