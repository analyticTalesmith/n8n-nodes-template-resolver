import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readFrontmatter } from './frontmatter.mjs';
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

/**
 * Kinds and stages are pack data: one small markdown file each, in the atomic-document format (frontmatter with an
 * id, a type and a one-line summary, then a short body). Installed packs put them under `.process/shapes/<pack>/`;
 * a project's own live in `.process/kinds/` and `.process/stages/` and win over a pack's with the same name.
 */

export const SHAPES_DIR = '.process/shapes';
export const LOCAL_KINDS_DIR = '.process/kinds';
export const LOCAL_STAGES_DIR = '.process/stages';
export const PHASES = Object.freeze(['down', 'implement', 'up', 'release', 'learn']);
export const SKIP_RULES = Object.freeze(['never', 'manual']);

export class ShapeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ShapeError';
  }
}

/**
 * @typedef {{ id: string, name: string, summary: string, values: Record<string, string | string[]>, teams: string[], runs: { stage: string, when: string | null }[], how: string, path: string }} Kind
 * @typedef {{ id: string, code: string, name: string, phase: string, form: string, owner: string | null, who: string, risk: string, skip: string, addWhen: string | null, minimal: boolean, today: string, todayNote: string, pairs: string[], body: string, path: string }} Stage
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
  const lines = content.replace(/^﻿/, '').split(/\r?\n/);
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
          ? `No kinds are installed, so --kind ${kind} cannot be used. Add the shapes pack with: node .process/core/scripts/add.mjs <projectDir> work-profile, or use --kind custom and set each dimension with --set.`
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

export const hasShapeData = (projectDir) => loadShapes(projectDir).stages.size > 0 || existsSync(join(projectDir, LOCAL_STAGES_DIR));

const list = (value) => (Array.isArray(value) ? value.join(', ') : String(value));
const SHAPE_DIMENSIONS = Object.freeze([...Object.keys(CYCLE_DIMENSIONS)]);
export const SHAPE_HEADING = '## Why this shape';
export const STAGES_HEADING = '## Stages';
const STAGE_LINE = /^- (stg-[a-z0-9]+(?:-[a-z0-9]+)*) (todo|done|skipped)(?::[ \t]*(.*))?[ \t]*$/;

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
 * The "Why this shape" and "Stages" sections written into a new cycle's CYCLE.md. Opening the cycle is the intent and
 * profile stage, so that stage starts done; every other stage starts as todo.
 * @param {ReturnType<typeof resolveShape> | null} shape null for a cycle opened with no kind
 */
export function shapeSection(shape) {
  if (shape === null) {
    return [SHAPE_HEADING, '', 'Shape: default (no kind chosen). The tier and approvals come from the project posture and no stage list is kept.', ''].join('\n');
  }
  const lines = [SHAPE_HEADING, '', shapeLine(shape), '', STAGES_HEADING, '',
    '<!-- One line per stage: "- <stage> done: <evidence>" or "- <stage> skipped: <reason>". The reason "rule" means the stage\'s own skip rule holds for this profile. A stage nobody has handled stays todo. -->', ''];
  for (const { stage } of shape.stages) {
    lines.push(stage.code === 'D01' ? `- ${stage.id} done: this shape line, confirmed when the cycle was opened` : `- ${stage.id} todo`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Reads the shape record out of a cycle brief. Pure.
 * @param {string} briefText
 * @returns {{ line: string | null, stages: Map<string, { status: 'todo' | 'done' | 'skipped', text: string }>, hasSection: boolean }}
 */
export function parseShapeRecord(briefText) {
  const lines = briefText.replaceAll('\r\n', '\n').split('\n');
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
      if (match) stages.set(match[1], { status: /** @type {'todo' | 'done' | 'skipped'} */ (match[2]), text: (match[3] ?? '').trim() });
    }
  }
  return { line: shape, stages, hasSection: true };
}

/** The brief text with one stage line set. Returns null when the stage has no line. */
export function setStageLine(briefText, stageId, status, text) {
  const eol = briefText.includes('\r\n') ? '\r\n' : '\n';
  const lines = briefText.split(/\r?\n/);
  const at = lines.findIndex((line) => STAGE_LINE.exec(line)?.[1] === stageId);
  if (at === -1) return null;
  lines[at] = status === 'todo' ? `- ${stageId} todo` : `- ${stageId} ${status}: ${text}`;
  return lines.join(eol);
}
