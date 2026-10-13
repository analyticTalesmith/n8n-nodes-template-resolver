import { readFileSync } from 'node:fs';
import { ConfigError, readConfig } from './config.mjs';
import { resolveInside } from './files.mjs';
import { TIERS } from './layout.mjs';

export const PLACEMENTS = Object.freeze(['card', 'cycle', 'front']);
export const DEFAULT_POSTURE = 'hybrid';
export const POSTURES_DIR = '.process/tiers/rigor/postures';

const stageTiers = (concept, alpha, beta, mvp, ga) => Object.freeze({ concept, alpha, beta, mvp, ga });
const loop = (allowed, maxIterations, maxSpawns) => Object.freeze({
  allowed,
  max_iterations: maxIterations,
  max_spawns: maxSpawns,
  no_progress_limit: allowed ? 3 : 0,
  repeat_failure_limit: allowed ? 3 : 0,
  sweep_rounds: allowed ? 3 : 0,
});
const preset = (tiers, approvals, limits) => Object.freeze({ stage_tiers: tiers, approvals, loop: limits, regulated: false });

export const BUILT_IN_POSTURES = Object.freeze({
  sketch: preset(stageTiers('spike', 'prototype', 'prototype', 'product', 'product'), 'cycle', loop(false, 0, 0)),
  agile: preset(stageTiers('spike', 'prototype', 'product', 'product', 'hardened'), 'cycle', loop(false, 0, 0)),
  hybrid: preset(stageTiers('spike', 'prototype', 'product', 'product', 'hardened'), 'card', loop(true, 40, 80)),
  waterfall: preset(stageTiers('prototype', 'product', 'product', 'hardened', 'hardened'), 'front', loop(true, 150, 300)),
});

const finding = (rule, message) => ({ rule, message });
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PRESET_KEYS = ['stage_tiers', 'approvals', 'loop', 'regulated'];
const LOOP_KEYS = ['allowed', 'max_iterations', 'max_spawns', 'no_progress_limit', 'repeat_failure_limit', 'sweep_rounds'];

function presetProblem(value) {
  if (!object(value)) return 'must be a JSON object';
  const extra = Object.keys(value).find((key) => !PRESET_KEYS.includes(key));
  if (extra) return `has unknown key ${JSON.stringify(extra)}; use only ${PRESET_KEYS.join(', ')}`;
  const missing = PRESET_KEYS.find((key) => !Object.hasOwn(value, key));
  if (missing) return `is missing ${missing}`;
  if (!object(value.stage_tiers) || Object.keys(value.stage_tiers).length === 0) return 'stage_tiers must map stage names to tiers';
  for (const [stage, tier] of Object.entries(value.stage_tiers)) {
    if (!KEBAB.test(stage)) return `stage_tiers has invalid stage name ${JSON.stringify(stage)}; use kebab-case`;
    if (!TIERS.includes(tier)) return `stage_tiers.${stage} must be one of ${TIERS.join(', ')}`;
  }
  if (!PLACEMENTS.includes(value.approvals)) return `approvals must be one of ${PLACEMENTS.join(', ')}`;
  if (!object(value.loop)) return 'loop must be an object with explicit budgets';
  const extraLoop = Object.keys(value.loop).find((key) => !LOOP_KEYS.includes(key));
  if (extraLoop) return `loop has unknown key ${JSON.stringify(extraLoop)}; use only ${LOOP_KEYS.join(', ')}`;
  const missingLoop = LOOP_KEYS.find((key) => !Object.hasOwn(value.loop, key));
  if (missingLoop) return `loop is missing ${missingLoop}`;
  if (typeof value.loop.allowed !== 'boolean') return 'loop.allowed must be true or false';
  for (const key of LOOP_KEYS.slice(1)) {
    const budget = value.loop[key];
    if (!Number.isSafeInteger(budget) || budget < 0 || (value.loop.allowed && budget === 0)) {
      return `loop.${key} must be ${value.loop.allowed ? 'a positive' : 'a non-negative'} integer`;
    }
  }
  if (value.regulated !== false) return 'regulated must be false; the regulated profile is not available yet';
  return null;
}

/** Read the selected posture; an installed preset wins and invalid data never falls back silently. */
export function readPosture(projectDir) {
  let config;
  try {
    config = readConfig(projectDir);
  } catch (cause) {
    if (!(cause instanceof ConfigError && cause.rule === 'config-missing')) throw cause;
    config = {};
  }
  const requested = Object.hasOwn(config, 'posture') ? config.posture : DEFAULT_POSTURE;
  const name = typeof requested === 'string' ? requested : String(requested);
  if (typeof requested !== 'string' || !Object.hasOwn(BUILT_IN_POSTURES, name)) {
    const special = name === 'regulated' ? ' The regulated profile is not available yet.' : '';
    return {
      name,
      preset: null,
      source: 'built-in',
      findings: [finding('posture-unknown', `Unknown posture ${JSON.stringify(requested)} in .process/aperture.json.${special} Choose one of: ${Object.keys(BUILT_IN_POSTURES).join(', ')}.`)],
    };
  }
  const path = `${POSTURES_DIR}/${name}.json`;
  let content;
  try {
    content = readFileSync(resolveInside(projectDir, path), 'utf8');
  } catch (cause) {
    if (cause.code === 'ENOENT') return { name, preset: BUILT_IN_POSTURES[name], source: 'built-in', findings: [] };
    return { name, preset: null, source: 'installed', findings: [finding('posture-invalid', `${path} cannot be read (${cause.message}). Repair or reinstall the preset.`)] };
  }
  let installed;
  try {
    installed = JSON.parse(content);
  } catch (cause) {
    return { name, preset: null, source: 'installed', findings: [finding('posture-invalid', `${path} is not valid JSON (${cause.message}). Repair or reinstall the preset.`)] };
  }
  const problem = presetProblem(installed);
  if (problem) return { name, preset: null, source: 'installed', findings: [finding('posture-invalid', `${path} ${problem}. Repair or reinstall the preset.`)] };
  return { name, preset: installed, source: 'installed', findings: [] };
}

/** A cycle proposal from the selected posture. A custom stage may need an explicit --tier. */
export function proposeCycle(projectDir, stage) {
  const { name, preset: selected, findings } = readPosture(projectDir);
  if (!selected) throw new Error(findings[0].message);
  return { tier: selected.stage_tiers[stage] ?? null, approvals: selected.approvals, posture: name };
}
