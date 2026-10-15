import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { toPosix } from '../lib/files.mjs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_JSON, CARD_MD, CYCLES_DIR, PROJECT_DIRS, STAGE, STARTED, TIERS, humanColumn, isCycleName } from '../lib/layout.mjs';
import { validateCycle } from '../lib/cycle.mjs';
import { readFrontmatter } from '../lib/frontmatter.mjs';
import { validateCard } from '../lib/card.mjs';
import { LEARNINGS_ROOT, checkLearning } from '../lib/learnings.mjs';
import { CONFIG_PATH, ConfigError, readConfig } from '../lib/config.mjs';
import { ApprovalError, readApprovers } from '../lib/approval.mjs';
import { readPosture } from '../lib/posture.mjs';
import { listCardFolders } from '../lib/board.mjs';
import { parseCardId } from '../lib/card-id.mjs';
import { checkTypedCriteria, usesTypedLines } from '../lib/checks/typed-criteria.mjs';
import { resolveProjectPath, resolveProjectRoots } from '../lib/project-roots.mjs';
import { readAtoms, readRetiredIds } from '../lib/atom.mjs';
import { checkLinksResolve } from '../lib/checks/links-resolve.mjs';
import { workProfileProblems } from '../lib/profile.mjs';

/**
 * A single problem found in a project. `rule` is a stable id, `message` says what to do,
 * `path` (forward slashes, relative to the project) is set when the problem is about a file or directory.
 * @typedef {{ rule: string, message: string, path?: string }} Finding
 */

const SEMVER = /^\d+\.\d+\.\d+$/;

const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};


/**
 * Reports cards whose column disagrees with their recorded state (a card moved by hand past card-move) and cards
 * whose card.json cannot be read as a card. Folders without card.json are skipped. Never throws for card content
 * and never writes.
 * @param {string} projectDir
 * @returns {Finding[]}
 */
export function checkCardStates(projectDir) {
  /** @type {Finding[]} */
  const findings = [];
  for (const { column, dir } of listCardFolders(projectDir)) {
    const file = join(dir, CARD_JSON);
    if (!existsSync(file)) continue;
    const path = `${toPosix(relative(resolve(projectDir), dir))}/${CARD_JSON}`;
    const invalid = (reason) =>
      findings.push({ rule: 'card-invalid', message: `${path} is not a valid card: ${reason} Repair or restore the file.`, path });
    let card;
    try {
      card = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      invalid(`it cannot be read as JSON (${err.message}).`);
      continue;
    }
    const [first] = validateCard(card);
    if (first) {
      invalid(`${first.rule}. ${first.message}`);
      continue;
    }
    const mismatch = (problem) =>
      findings.push({
        rule: 'card-state-mismatch',
        message: `Card ${card.id} is in ${humanColumn(column)} but ${problem}. Move it with card-move, or correct started and ended in ${path}.`,
        path,
      });
    if (STARTED.includes(column) && card.started === null) mismatch('has no started time');
    if (column === STAGE.done && card.ended === null) mismatch('has no ended time');
    if (column !== STAGE.done && card.ended !== null) mismatch('has an ended time');
  }
  return findings;
}

/**
 * Reports each folder under the cycles folder that is not a usable cycle: a name that breaks the cycle-name rule, a
 * missing or unreadable CYCLE.md, and every problem validateCycle finds in a readable brief. Cards in such a folder
 * still count on the board, so these findings are the only signal. Never throws and never writes.
 * @param {string} projectDir
 * @returns {Finding[]}
 */
export function checkCycleFolders(projectDir) {
  const root = resolveProjectPath(resolveProjectRoots(projectDir), CYCLES_DIR);
  if (!isDir(root)) return [];
  /** @type {Finding[]} */
  const findings = [];
  const names = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const name of names) {
    const folder = `${CYCLES_DIR}/${name}`;
    if (!isCycleName(name)) {
      findings.push({
        rule: 'cycle-name-invalid',
        message: `${folder} is not a valid cycle folder name: a cycle name is kebab-case (lowercase letters, digits and single hyphens), 1 to 48 characters, and not a Windows device name. Rename the folder and set the name field in its CYCLE.md to match.`,
        path: folder,
      });
    }
    const brief = `${folder}/CYCLE.md`;
    let text;
    try {
      text = readFileSync(join(root, name, 'CYCLE.md'), 'utf8');
    } catch (err) {
      findings.push({
        rule: 'cycle-brief-missing',
        message: `${brief} is missing or cannot be read (${err.code ?? err.message}), so the cards in ${folder} belong to no readable cycle. Restore the brief from version control, or recreate it from core/templates/cycle.md.`,
        path: brief,
      });
      continue;
    }
    const fields = readFrontmatter(text);
    if (typeof fields?.name === 'string' && fields.name !== name) {
      findings.push({
        rule: 'cycle-name-mismatch',
        message: `${brief}: the name field is "${fields.name}" but the folder is "${name}". Set the name field to ${name}, or rename the folder.`,
        path: brief,
      });
    }
    for (const f of validateCycle(fields)) findings.push({ rule: f.rule, message: `${brief}: ${f.message}`, path: brief });
  }
  return findings;
}

/**
 * Runs the learning note shape check over every `.md` file in docs/ephemeral/learnings, tagging each finding with its file.
 * An unreadable file is reported as a missing frontmatter note would be. Never throws and never writes.
 * @param {string} projectDir
 * @returns {Finding[]}
 */
export function checkLearningNotes(projectDir) {
  const dir = resolveProjectPath(resolveProjectRoots(projectDir), LEARNINGS_ROOT);
  if (!isDir(dir)) return [];
  const names = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name).sort();
  return names.flatMap((name) => {
    let text = '';
    try {
      text = readFileSync(join(dir, name), 'utf8');
    } catch {
      // checkLearning reports an empty note as having no frontmatter
    }
    return checkLearning(text).map((f) => ({ ...f, path: `${LEARNINGS_ROOT}/${name}` }));
  });
}

/**
 * Runs the typed requirement line check over every cycle brief and every card.md (global backlog and every cycle
 * column). Only a document that already holds a typed line is checked. An unreadable or absent file is skipped.
 * Never throws and never writes.
 * @param {string} projectDir
 * @returns {Finding[]}
 */
export function checkRequirementLines(projectDir) {
  const root = resolve(projectDir);
  /** @type {Array<{ file: string, path: string }>} */
  const documents = [];
  const cyclesRoot = resolveProjectPath(resolveProjectRoots(projectDir), CYCLES_DIR);
  if (isDir(cyclesRoot)) {
    const names = readdirSync(cyclesRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    for (const name of names) documents.push({ file: join(cyclesRoot, name, 'CYCLE.md'), path: `${CYCLES_DIR}/${name}/CYCLE.md` });
  }
  for (const { dir } of listCardFolders(projectDir)) {
    const file = join(dir, CARD_MD);
    documents.push({ file, path: toPosix(relative(root, file)) });
  }
  return documents.flatMap(({ file, path }) => {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      return [];
    }
    return usesTypedLines(text) ? checkTypedCriteria({ text, path }) : [];
  });
}

/**
 * Reads every atom under docs/living, the cycle folders and the archived cycles, reports each file's shape problems,
 * and checks that links and atom-id sources resolve across all of them together. Documents that are not atoms are
 * ignored. Never throws for file content and never writes.
 * @param {string} projectDir
 * @returns {Finding[]}
 */
export function checkAtoms(projectDir) {
  const { atoms, findings } = readAtoms(projectDir);
  const { retired, findings: registryFindings } = readRetiredIds(projectDir);
  return [...findings, ...registryFindings, ...checkLinksResolve({ atoms, retired })];
}

/**
 * Reports backlog tickets (folders directly under the backlog with a readable card.json) that share a title, ignoring
 * case and spacing, or an id number: the counter for an old id, the date, swarm, agent and counter for a new one.
 * One finding per group. Folders without a readable card.json are skipped, and names that are not card ids are
 * skipped for the id rule. Never throws for card content and never writes.
 * @param {string} projectDir
 * @returns {Finding[]}
 */
export function checkBacklogTickets(projectDir) {
  const root = resolve(projectDir);
  const tickets = [];
  for (const { cycle, id, dir } of listCardFolders(projectDir)) {
    if (cycle !== null) continue;
    let card;
    try {
      card = JSON.parse(readFileSync(join(dir, CARD_JSON), 'utf8'));
    } catch {
      continue;
    }
    tickets.push({ id, title: typeof card?.title === 'string' ? card.title : null, path: toPosix(relative(root, dir)) });
  }
  const groupBy = (keyOf) => {
    const groups = new Map();
    for (const ticket of tickets) {
      const key = keyOf(ticket);
      if (key !== null) groups.set(key, [...(groups.get(key) ?? []), ticket]);
    }
    return [...groups.values()].filter((group) => group.length > 1);
  };
  const idNumber = ({ id }) => {
    const parsed = parseCardId(id);
    if (parsed === null) return null;
    return parsed.shape === 'old' ? `old:${parsed.counter}` : `new:${parsed.date}-${parsed.swarm}-${parsed.agent}${parsed.counter}`;
  };
  const titleKey = ({ title }) => (title === null ? null : title.trim().replace(/\s+/g, ' ').toLowerCase());
  const finding = (rule, group, shared) => ({
    rule,
    message: `Backlog tickets ${group.map((t) => t.path).join(' and ')} share ${shared}. Keep one and close the other with ticket.mjs close.`,
    path: group[0].path,
  });
  return [
    ...groupBy(titleKey).map((group) => finding('backlog-duplicate-title', group, 'a title')),
    ...groupBy(idNumber).map((group) => finding('backlog-duplicate-id', group, 'an id number')),
  ];
}

/**
 * Checks the config shape and the required directories. Never modifies the project.
 * @param {string} projectDir
 * @returns {{ ok: boolean, findings: Finding[] }}
 */
export function validate(projectDir) {
  /** @type {Finding[]} */
  const findings = [];

  const roots = resolveProjectRoots(projectDir);
  for (const rel of PROJECT_DIRS) {
    if (!isDir(resolveProjectPath(roots, rel))) {
      findings.push({
        rule: 'dir-missing',
        message: `Required directory ${rel} is missing. Create it, or run init in a fresh directory.`,
        path: rel,
      });
    }
  }

  try {
    const config = readConfig(projectDir);
    if (!TIERS.includes(config.tier)) {
      const problem =
        config.tier === undefined
          ? `tier is missing; set it to one of: ${TIERS.join(', ')}.`
          : `Unknown tier "${config.tier}". Allowed tiers: ${TIERS.join(', ')}. Set tier in ${CONFIG_PATH} to one of them.`;
      findings.push({ rule: 'tier-unknown', message: problem, path: CONFIG_PATH });
    }
    const packs = config.packs;
    if ('packs' in config && (packs === null || typeof packs !== 'object' || Array.isArray(packs))) {
      findings.push({
        rule: 'config-invalid',
        message: 'packs must be an object mapping pack names to versions, for example {"core": "1.0.0"}.',
        path: CONFIG_PATH,
      });
    } else {
      for (const [name, version] of Object.entries(packs ?? {})) {
        if (typeof version !== 'string' || !SEMVER.test(version)) {
          findings.push({
            rule: 'pack-version-format',
            message: `Pack "${name}" has version "${version}". Use MAJOR.MINOR.PATCH, for example 1.2.3.`,
            path: CONFIG_PATH,
          });
        }
      }
    }
    findings.push(...readPosture(projectDir).findings.map((item) => ({ ...item, path: CONFIG_PATH })));
    for (const message of workProfileProblems(config)) findings.push({ rule: 'work-profile-invalid', message, path: CONFIG_PATH });
    try {
      readApprovers(projectDir);
    } catch (cause) {
      if (!(cause instanceof ApprovalError)) throw cause;
      findings.push({ rule: 'config-invalid', message: cause.message, path: CONFIG_PATH });
    }
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    findings.push({ rule: err.rule, message: err.message, path: CONFIG_PATH });
  }

  findings.push(...checkCycleFolders(projectDir));
  findings.push(...checkCardStates(projectDir));
  findings.push(...checkLearningNotes(projectDir));
  findings.push(...checkRequirementLines(projectDir));
  findings.push(...checkAtoms(projectDir));
  findings.push(...checkBacklogTickets(projectDir));

  const key = (f) => f.path ?? '';
  findings.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  return { ok: findings.length === 0, findings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node validate.mjs <projectDir>');
    process.exit(2);
  }
  let findings;
  try {
    ({ findings } = validate(target));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  for (const f of findings) console.log(`${f.rule}: ${f.message}`);
  if (findings.length === 0) console.log('ok: 0 findings');
  process.exit(findings.length === 0 ? 0 : 1);
}
