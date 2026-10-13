import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readAtoms } from './atom.mjs';
import { cardPath, listCards, readCard } from './board.mjs';
import { readFrontmatter } from './frontmatter.mjs';
import { findCycle, normalize } from './graph.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {{ name: string, depends_on: string[], paths: string[] }} Module */
/** @typedef {{ id: string, type: string, links: { type: string, target: string }[] }} AtomNode */

export const MODULES_DIR = 'docs/living/architecture/modules';
/** Columns whose cards have built, committed tests worth running again. */
const BUILT_COLUMNS = new Set(['04_review', '05_gate', '06_done']);
const TEST_FILE = /(^|\/)(tests?|__tests__)\/|\.(test|spec)\.[a-z0-9]+$/i;

const slashes = (path) => String(path).replaceAll('\\', '/').replace(/^(\.\/)+/, '');
const listOf = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item !== '') : []);
const isIgnorable = (path) => path.startsWith('docs/') || path.startsWith('.process/') || TEST_FILE.test(path);

/**
 * Reads the module pages and the atoms. A page's frontmatter may hold depends_on (module names) and paths (project
 * relative files or folders the module owns). Never throws for content; an absent folder is no modules.
 * @param {string} projectDir
 * @returns {{ modules: Module[], atoms: AtomNode[], findings: Finding[] }}
 */
export function readModuleGraph(projectDir) {
  const roots = resolveProjectRoots(projectDir);
  const dir = resolveProjectPath(roots, MODULES_DIR);
  /** @type {Module[]} */
  const modules = [];
  /** @type {Finding[]} */
  const findings = [];
  let files = [];
  try {
    files = readdirSync(dir).filter((file) => file.endsWith('.md') && file !== 'INDEX.md').sort();
  } catch {
    files = [];
  }
  for (const file of files) {
    const name = file.slice(0, -3);
    let data = null;
    try {
      data = readFrontmatter(readFileSync(join(dir, file), 'utf8'));
    } catch {
      data = null;
    }
    const read = (key) => {
      const value = data?.[key];
      if (value === undefined || value === '') return [];
      if (!Array.isArray(value)) {
        findings.push({ rule: 'regression-module-invalid', path: `${MODULES_DIR}/${file}`, message: `${MODULES_DIR}/${file} has ${key} that is not a list. Write it as a list of names or paths; it is ignored until then.` });
        return [];
      }
      return listOf(value);
    };
    modules.push({ name, depends_on: read('depends_on'), paths: read('paths') });
  }
  return { modules, atoms: readAtoms(projectDir).atoms, findings };
}

/** The module an atom id names: the id itself, else the id without its type prefix; null when neither is a module. */
const moduleOfAtom = (id, names) => {
  if (names.has(id)) return id;
  const slug = id.slice(id.indexOf('-') + 1);
  return id.includes('-') && names.has(slug) ? slug : null;
};

/**
 * The dependency graph: module page depends_on plus boundary atom depends-on links whose two ids name modules.
 * A dependency on a module with no page and a dependency cycle are problems; an atom that names no module is ignored.
 * @param {{ modules: Module[], atoms: AtomNode[] }} input
 * @returns {{ names: Set<string>, edges: Map<string, Set<string>>, problems: string[] }}
 */
export function buildGraph({ modules, atoms }) {
  const names = new Set(modules.map((m) => m.name));
  /** @type {Map<string, Set<string>>} */
  const edges = new Map(modules.map((m) => [m.name, new Set()]));
  const problems = [];
  for (const m of modules) {
    for (const dep of m.depends_on) {
      if (names.has(dep)) edges.get(m.name).add(dep);
      else problems.push(`module ${m.name} depends on ${dep}, which has no module page`);
    }
  }
  for (const atom of atoms) {
    if (atom.type !== 'boundary') continue;
    const from = moduleOfAtom(atom.id, names);
    if (from === null) continue;
    for (const link of atom.links) {
      const to = link.type === 'depends-on' ? moduleOfAtom(link.target, names) : null;
      if (to !== null && to !== from) edges.get(from).add(to);
    }
  }
  const cycle = findCycle([...edges].map(([id, deps]) => ({ id, depends_on: [...deps] })));
  if (cycle !== null) problems.push(`the module graph has a cycle: ${[...cycle, cycle[0]].join(' -> ')}`);
  return { names, edges, problems };
}

const manifestPaths = (card) => ['add', 'edit', 'remove'].flatMap((kind) => (Array.isArray(card?.manifest?.[kind]) ? card.manifest[kind].filter((p) => typeof p === 'string').map(slashes) : []));
const testsOf = (card) => manifestPaths(card).filter((path) => TEST_FILE.test(path));
const radiusOf = (card) => (Array.isArray(card?.blast_radius) ? card.blast_radius.filter((n) => typeof n === 'string') : []);
const gateOf = (card) => (Array.isArray(card?.gate) ? card.gate : null);

/**
 * Picks the regression run for one card from the module graph. Pure.
 * The changed modules are the card's blast_radius plus the modules whose declared paths hold a manifest path. The
 * closure is those modules and everything that depends on them, directly or not. The selection is the card itself and
 * every built card whose blast_radius meets the closure. It falls back to the full suite, with a reason, when a
 * code path maps to no module, a blast_radius module has no page, the card names nothing, or the graph has a problem.
 * @param {{ modules: Module[], atoms?: AtomNode[], card: object, cards: Array<{ column: string, card: object }> }} input
 * @returns {{ mode: 'selection' | 'full-suite', reasons: string[], changed: string[], closure: string[], cards: Array<{ id: string, gate: string[] | null, tests: string[] }>, tests: string[] }}
 */
export function selectRegression({ modules, atoms = [], card, cards }) {
  const graph = buildGraph({ modules, atoms });
  const full = (reasons) => ({ mode: /** @type {const} */ ('full-suite'), reasons, changed: [], closure: [], cards: [], tests: [] });
  if (graph.problems.length > 0) return full(graph.problems);

  const reasons = [];
  const radius = radiusOf(card);
  for (const name of radius) if (!graph.names.has(name)) reasons.push(`blast_radius names ${name}, which has no module page`);
  const owned = modules.flatMap((m) => m.paths.map((path) => ({ name: m.name, path: normalize(path) })));
  const changed = new Set(radius.filter((name) => graph.names.has(name)));
  const paths = manifestPaths(card);
  for (const path of paths.filter((p) => !isIgnorable(p))) {
    const lower = normalize(path);
    const owner = owned.filter((o) => o.path !== '' && (lower === o.path || lower.startsWith(`${o.path}/`))).sort((a, b) => b.path.length - a.path.length)[0];
    if (owner) changed.add(owner.name);
    else reasons.push(`${path} is in no module's paths`);
  }
  if (reasons.length > 0) return full(reasons);
  if (changed.size === 0) {
    if (paths.length === 0) return full(['the card names no module and changes no listed path, so its footprint is unknown']);
    return { mode: 'selection', reasons: ['the card changes no code (only docs, process and test files)'], changed: [], closure: [], cards: [], tests: [] };
  }

  const dependents = new Map([...graph.names].map((name) => [name, []]));
  for (const [from, deps] of graph.edges) for (const to of deps) dependents.get(to).push(from);
  const closure = new Set(changed);
  const queue = [...changed];
  while (queue.length > 0) {
    for (const next of dependents.get(queue.shift())) {
      if (!closure.has(next)) {
        closure.add(next);
        queue.push(next);
      }
    }
  }
  const picked = new Map([[card.id, card]]);
  for (const { column, card: other } of cards) {
    if (other.id !== card.id && BUILT_COLUMNS.has(column) && radiusOf(other).some((name) => closure.has(name))) picked.set(other.id, other);
  }
  const selected = [...picked.values()].sort((a, b) => (a.id < b.id ? -1 : 1)).map((c) => ({ id: c.id, gate: gateOf(c), tests: testsOf(c) }));
  const tests = [...new Set(selected.flatMap((c) => c.tests))].sort();
  return { mode: 'selection', reasons: [], changed: [...changed].sort(), closure: [...closure].sort(), cards: selected, tests };
}

/**
 * The regression run for a card on the board, read from the project.
 * @param {string} projectDir
 * @param {string} cardId
 */
export function regressionFor(projectDir, cardId) {
  if (cardPath(projectDir, cardId) === null) throw new RegressionError(`Card ${cardId} is not on the board. Check the id.`);
  const card = readCard(projectDir, cardId);
  const graph = readModuleGraph(projectDir);
  return { ...selectRegression({ modules: graph.modules, atoms: graph.atoms, card, cards: listCards(projectDir) }), findings: graph.findings };
}

export class RegressionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RegressionError';
  }
}
