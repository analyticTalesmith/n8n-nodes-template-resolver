import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONCERNS } from './concerns.mjs';
import { ConfigError, readConfig, writeConfig } from './config.mjs';
import { TIERS } from './layout.mjs';

/**
 * The work profile: a small set of dimensions, each set on its own. Eight are declared per cycle, one is inferred
 * and confirmed, five are declared once for the project, and the rest are derived and never asked. There is no map
 * over combinations: a kind only fills defaults, and any value can be changed one at a time.
 */

export const CYCLE_DIMENSIONS = Object.freeze({
  intent: Object.freeze(['correct', 'add', 'change', 'remove', 'restructure', 'adapt', 'harden', 'document', 'learn']),
  purpose: Object.freeze(['answer', 'demonstrate', 'prove-structure', 'validate', 'ship']),
  compatibility: Object.freeze(['none', 'additive', 'preserved', 'breaking']),
  uncertainty: Object.freeze(['none', 'partly', 'unknown']),
  reversibility: Object.freeze(['trivial', 'costly', 'one-way']),
  size: Object.freeze(['trivial', 'card', 'several', 'batch', 'program']),
  oracle: Object.freeze(['existing-tests', 'new-tests', 'metric', 'rubric', 'person', 'finding']),
  trigger: Object.freeze(['planned', 'reactive', 'forced']),
});

/** Code legibility is inferred from the repository and then confirmed by a person. */
export const INFERRED_DIMENSIONS = Object.freeze({
  legibility: Object.freeze(['documented', 'undocumented', 'unknown']),
});

/** A quality lens selects extra stages; it is a setting on a cycle, not a shape dimension. */
export const LENSES = Object.freeze(['security', 'performance', 'accessibility', 'reliability', 'i18n']);

export const PROJECT_DIMENSIONS = Object.freeze({
  audience: Object.freeze(['nobody', 'team', 'other-teams', 'public']),
  governance: Object.freeze(['none', 'contractual', 'regulated']),
  deployment: Object.freeze(['none', 'served', 'library', 'store-gated', 'customer-run']),
  executor: Object.freeze(['supervised', 'unattended']),
  independence: Object.freeze(['same-session', 'other-agent', 'other-model', 'human']),
  criticality: Object.freeze(['comfort', 'money', 'essential', 'life-or-law']),
});

/** The dimensions and the lens that may hold more than one value. */
export const MULTI = Object.freeze(['intent', 'oracle', 'lens']);

const ALLOWED = Object.freeze({ ...CYCLE_DIMENSIONS, ...INFERRED_DIMENSIONS, lens: LENSES });
const ALL_KEYS = Object.freeze({ ...ALLOWED, ...PROJECT_DIMENSIONS });

export class ProfileError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProfileError';
  }
}

/** Every value a declared or inferred cycle setting can take, one array per dimension (multi-valued ones hold a list). */
export const DECLARED_KEYS = Object.freeze([...Object.keys(CYCLE_DIMENSIONS), 'legibility', 'lens']);

/**
 * Checks values for cycle settings: each key a known dimension, each value one of its levels, only the multi-valued
 * dimensions holding a list. Returns problems, never throws.
 * @param {Record<string, unknown>} values
 * @returns {string[]}
 */
export function profileProblems(values) {
  const problems = [];
  for (const [key, value] of Object.entries(values)) {
    if (!Object.hasOwn(ALLOWED, key)) {
      problems.push(`Unknown dimension "${key}". Use one of: ${DECLARED_KEYS.join(', ')}.`);
      continue;
    }
    const list = Array.isArray(value) ? value : [value];
    if (Array.isArray(value) && !MULTI.includes(key)) problems.push(`${key} takes one value, not a list. Use one of: ${ALLOWED[key].join(', ')}.`);
    if (list.length === 0 && key !== 'lens') problems.push(`${key} is empty. Use one of: ${ALLOWED[key].join(', ')}.`);
    for (const item of list) {
      if (!ALLOWED[key].includes(item)) problems.push(`${key} cannot be ${JSON.stringify(item)}. Use one of: ${ALLOWED[key].join(', ')}.`);
    }
  }
  return problems;
}

/**
 * Turns repeated `dimension=value` settings (a value may list several, comma separated, for the multi-valued
 * dimensions) into values. Later settings of a single-valued dimension replace earlier ones.
 * @param {string[]} settings
 * @returns {Record<string, string | string[]>}
 */
export function parseSettings(settings) {
  /** @type {Record<string, string | string[]>} */
  const values = {};
  for (const setting of settings) {
    const at = typeof setting === 'string' ? setting.indexOf('=') : -1;
    if (at < 1) throw new ProfileError(`"${setting}" is not dimension=value. Write it as, for example, purpose=ship.`);
    const key = setting.slice(0, at).trim();
    const value = setting.slice(at + 1).trim();
    if (!Object.hasOwn(ALLOWED, key)) throw new ProfileError(`Unknown dimension "${key}". Use one of: ${DECLARED_KEYS.join(', ')}.`);
    if (MULTI.includes(key)) {
      const items = value.split(',').map((item) => item.trim()).filter((item) => item !== '');
      values[key] = [...new Set([...(Array.isArray(values[key]) ? values[key] : []), ...items])];
    } else {
      if (value.includes(',')) throw new ProfileError(`${key} takes one value. Use one of: ${ALLOWED[key].join(', ')}.`);
      values[key] = value;
    }
  }
  const problems = profileProblems(values);
  if (problems.length > 0) throw new ProfileError(problems[0]);
  return values;
}

const RISK_POINTS = Object.freeze({
  reversibility: { trivial: 0, costly: 1, 'one-way': 2 },
  criticality: { comfort: 0, money: 1, essential: 2, 'life-or-law': 3 },
});
const BLAST_BY_SIZE = Object.freeze({ trivial: 'local', card: 'local', several: 'module', batch: 'wide', program: 'wide' });
const PURPOSE_TIER = Object.freeze({ answer: 'spike', demonstrate: 'prototype', 'prove-structure': 'prototype', validate: 'product', ship: 'product' });

/**
 * Values worked out from the declared ones and the project's: never asked. A dimension nobody set counts for nothing
 * and is named in `unknown`, so a missing answer is visible and never invented.
 * Risk adds points for reversibility and the criticality floor and one for a breaking effect (0-1 low, 2-3 medium, 4+
 * high). Blast radius is estimated from size and a breaking effect until an impact map exists. The rigor label starts
 * from the purpose and rises to hardened for high risk. Approvals follow reversibility; a person always reviews a diff
 * before it reaches main.
 * @param {Record<string, unknown>} values the cycle's values
 * @param {Record<string, unknown>} [project] the project's dimensions
 * @returns {{ risk: string, blast: string, rigor: string, approvals: { plan: 'auto' | 'human', merge: 'human', before_irreversible_step: boolean, risk_acceptance: boolean }, unknown: string[] }}
 */
export function derive(values, project = {}) {
  const unknown = [];
  const point = (dimension, from) => {
    const value = from[dimension];
    if (typeof value !== 'string') {
      unknown.push(dimension);
      return 0;
    }
    return RISK_POINTS[dimension][value] ?? 0;
  };
  const points = point('reversibility', values) + point('criticality', project) + (values.compatibility === 'breaking' ? 1 : 0);
  const risk = points >= 4 ? 'high' : points >= 2 ? 'medium' : 'low';
  const size = typeof values.size === 'string' ? values.size : null;
  if (size === null) unknown.push('size');
  let blast = size === null ? 'unknown' : BLAST_BY_SIZE[size];
  if (values.compatibility === 'breaking') blast = 'wide';
  const purpose = typeof values.purpose === 'string' ? values.purpose : null;
  if (purpose === null) unknown.push('purpose');
  const base = purpose === null ? 'prototype' : PURPOSE_TIER[purpose];
  const rigor = risk === 'high' ? 'hardened' : base;
  const reversibility = values.reversibility;
  return {
    risk,
    blast,
    rigor,
    approvals: {
      plan: reversibility === 'trivial' ? 'auto' : 'human',
      merge: 'human',
      before_irreversible_step: reversibility === 'one-way',
      risk_acceptance: reversibility === 'one-way',
    },
    unknown: [...new Set(unknown)],
  };
}

/**
 * Guesses code legibility from the living architecture documents: module pages mean the code is documented, none mean
 * nobody has recorded what it does. It is only a first answer and a person confirms or corrects it.
 * @param {string} projectDir
 * @returns {'documented' | 'unknown'}
 */
export function inferLegibility(projectDir) {
  const modules = join(projectDir, 'docs', 'living', 'architecture', 'modules');
  try {
    if (existsSync(modules) && readdirSync(modules).some((name) => name.endsWith('.md') && name !== 'INDEX.md')) return 'documented';
  } catch {
    // An unreadable folder is the same as no documents.
  }
  return 'unknown';
}

/**
 * The project's own dimensions from .process/aperture.json (`profile`), with only the keys that are set. A missing
 * config reads as none.
 * @param {string} projectDir
 * @returns {Record<string, string>}
 */
export function readProjectProfile(projectDir) {
  let config;
  try {
    config = readConfig(projectDir);
  } catch (cause) {
    if (cause instanceof ConfigError && cause.rule === 'config-missing') return {};
    throw cause;
  }
  const profile = config.work_profile;
  if (profile === undefined) return {};
  if (profile === null || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new ProfileError('work_profile in .process/aperture.json must be an object of project dimensions (audience, governance, deployment, executor, independence, criticality).');
  }
  const problems = [];
  for (const [key, value] of Object.entries(profile)) {
    if (!Object.hasOwn(PROJECT_DIMENSIONS, key)) problems.push(`Unknown project dimension "${key}". Use one of: ${Object.keys(PROJECT_DIMENSIONS).join(', ')}.`);
    else if (!PROJECT_DIMENSIONS[key].includes(value)) problems.push(`Project ${key} cannot be ${JSON.stringify(value)}. Use one of: ${PROJECT_DIMENSIONS[key].join(', ')}.`);
  }
  if (problems.length > 0) throw new ProfileError(`work_profile in .process/aperture.json is not valid: ${problems[0]}`);
  return { ...profile };
}

export { ALL_KEYS as PROFILE_LEVELS };

/** @typedef {{ test: (facts: Record<string, unknown>) => boolean, manual: boolean, never: boolean, text: string }} Predicate */

const TOKEN = /\s*(\[|\]|,|!=|=|[a-z][a-z0-9-]*)/y;

/**
 * Parses a rule over dimensions: clauses `dimension = value`, `dimension != value`, `dimension in [a, b]`,
 * `dimension has value` and `dimension lacks value` (for a multi-valued dimension), joined by `and`, with `or` between groups. The words
 * `never` (the rule never holds) and `manual` (a person judges it) stand alone. A clause about a dimension nobody
 * has set is false, so an unanswered dimension never triggers a skip or an addition.
 * @param {string} text
 * @returns {Predicate}
 */
export function parsePredicate(text) {
  const source = String(text).trim();
  if (source === 'never' || source === 'manual') {
    return { test: () => false, manual: source === 'manual', never: source === 'never', text: source };
  }
  const tokens = [];
  TOKEN.lastIndex = 0;
  let at = 0;
  while (at < source.length) {
    TOKEN.lastIndex = at;
    const match = TOKEN.exec(source);
    if (match === null) {
      if (source.slice(at).trim() === '') break;
      throw new ProfileError(`Cannot read the rule "${source}" near "${source.slice(at).trim().slice(0, 12)}".`);
    }
    tokens.push(match[1]);
    at = TOKEN.lastIndex;
  }
  let i = 0;
  const next = () => tokens[i++];
  const expect = (what) => {
    const token = next();
    if (token === undefined) throw new ProfileError(`The rule "${source}" ends early; expected ${what}.`);
    return token;
  };
  const clause = () => {
    const key = expect('a dimension');
    if (!Object.hasOwn(ALL_KEYS, key) && key !== 'risk' && key !== 'blast') throw new ProfileError(`The rule "${source}" names "${key}", which is not a dimension. Use one of: ${Object.keys(ALL_KEYS).join(', ')}, risk, blast.`);
    const op = expect('=, !=, in, has or lacks');
    let values;
    if (op === 'in') {
      if (expect('[') !== '[') throw new ProfileError(`The rule "${source}" needs [ after in.`);
      values = [];
      for (let token = expect('a value'); token !== ']'; token = expect(']')) if (token !== ',') values.push(token);
    } else if (['=', '!=', 'has', 'lacks'].includes(op)) {
      values = [expect('a value')];
    } else {
      throw new ProfileError(`The rule "${source}" uses "${op}"; use =, !=, in, has or lacks.`);
    }
    return { key, op, values };
  };
  const groups = [[clause()]];
  while (i < tokens.length) {
    const word = next();
    if (word === 'and') groups.at(-1).push(clause());
    else if (word === 'or') groups.push([clause()]);
    else throw new ProfileError(`The rule "${source}" has "${word}" where and or or belongs.`);
  }
  const holds = ({ key, op, values }, facts) => {
    const have = facts[key];
    if (have === undefined || have === null) return false;
    const held = Array.isArray(have) ? have : [have];
    if (op === 'has') return held.includes(values[0]);
    if (op === 'lacks') return !held.includes(values[0]);
    if (op === 'in') return held.some((item) => values.includes(item));
    if (op === '=') return held.length === 1 && held[0] === values[0];
    return held.length > 0 && !held.includes(values[0]);
  };
  return { test: (facts) => groups.some((group) => group.every((c) => holds(c, facts))), manual: false, never: false, text: source };
}

/**
 * The facts a rule is judged against: the cycle's values, the project's dimensions and the derived risk and blast.
 * @param {Record<string, unknown>} values
 * @param {Record<string, unknown>} project
 * @returns {Record<string, unknown>}
 */
export function factsOf(values, project) {
  const { risk, blast } = derive(values, project);
  return { ...project, lens: [], ...values, risk, blast };
}

/**
 * Sets or clears project dimensions in .process/aperture.json (`work_profile`). A setting is `dimension=value`; a value
 * of `unset` removes the dimension, so it is asked again rather than guessed.
 * @param {string} projectDir
 * @param {string[]} settings
 * @returns {Record<string, string>} the project dimensions after the change
 */
export function setProjectProfile(projectDir, settings) {
  const next = { ...readProjectProfile(projectDir) };
  for (const setting of settings) {
    const at = typeof setting === 'string' ? setting.indexOf('=') : -1;
    if (at < 1) throw new ProfileError(`"${setting}" is not dimension=value. Write it as, for example, audience=team.`);
    const key = setting.slice(0, at).trim();
    const value = setting.slice(at + 1).trim();
    if (!Object.hasOwn(PROJECT_DIMENSIONS, key)) throw new ProfileError(`Unknown project dimension "${key}". Use one of: ${Object.keys(PROJECT_DIMENSIONS).join(', ')}.`);
    if (value === 'unset') delete next[key];
    else if (!PROJECT_DIMENSIONS[key].includes(value)) throw new ProfileError(`Project ${key} cannot be ${JSON.stringify(value)}. Use one of: ${PROJECT_DIMENSIONS[key].join(', ')}, or unset.`);
    else next[key] = value;
  }
  const config = { ...readConfig(projectDir) };
  if (Object.keys(next).length === 0) delete config.work_profile;
  else config.work_profile = next;
  writeConfig(projectDir, config);
  return next;
}

/**
 * Problems in the config's `work_profile` and `concerns` keys, as messages. Pure; an absent key is fine.
 * @param {Record<string, unknown>} config
 * @returns {string[]}
 */
export function workProfileProblems(config) {
  const problems = [];
  if (config.work_profile !== undefined) {
    const profile = config.work_profile;
    if (profile === null || typeof profile !== 'object' || Array.isArray(profile)) problems.push('work_profile must be an object of project dimensions.');
    else {
      for (const [key, value] of Object.entries(profile)) {
        if (!Object.hasOwn(PROJECT_DIMENSIONS, key)) problems.push(`work_profile has the unknown dimension "${key}". Use one of: ${Object.keys(PROJECT_DIMENSIONS).join(', ')}.`);
        else if (!PROJECT_DIMENSIONS[key].includes(value)) problems.push(`work_profile ${key} is ${JSON.stringify(value)}. Use one of: ${PROJECT_DIMENSIONS[key].join(', ')}.`);
      }
    }
  }
  if (config.concerns !== undefined) {
    const concerns = config.concerns;
    if (concerns === null || typeof concerns !== 'object' || Array.isArray(concerns)) problems.push('concerns must be an object mapping a concern to a tier.');
    else {
      for (const [key, value] of Object.entries(concerns)) {
        if (!CONCERNS.includes(key)) problems.push(`concerns has the unknown concern "${key}". Use one of: ${CONCERNS.join(', ')}.`);
        else if (!TIERS.includes(value)) problems.push(`concerns ${key} is ${JSON.stringify(value)}. Use one of: ${TIERS.join(', ')}.`);
      }
    }
  }
  return problems;
}
