import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { toPosix } from './files.mjs';
import { isPlainObject } from './types.mjs';
import { basename, dirname, join, resolve } from 'node:path';
import { readFrontmatter } from './frontmatter.mjs';
import { isKebab } from './names.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */

/**
 * @typedef {{
 *   type: string,
 *   name: string,
 *   version: string,
 *   extends?: string,
 *   requires?: string[],
 *   members?: string[],
 *   tags?: string[],
 * }} PackManifest
 */

export const PACK_TYPES = Object.freeze(['team', 'role', 'skill', 'profile', 'tier', 'workflow', 'shape', 'set']);

export const MANIFEST_FILE = 'pack.json';

const SEMVER = /^\d+\.\d+\.\d+$/;

/** The most tags a pack or set may carry. */
export const MAX_TAGS = 12;

export class PackError extends Error {
  /** @param {string} message @param {string} [rule] */
  constructor(message, rule = 'pack-manifest-missing') {
    super(message);
    this.name = 'PackError';
    this.rule = rule;
  }
}

/**
 * Reads pack.json. Throws PackError when it is absent, not JSON, or not an object.
 * Field values are not checked here; validatePack does that.
 * @param {string} packDir
 * @returns {PackManifest}
 */
export function readPack(packDir) {
  const file = join(packDir, MANIFEST_FILE);
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new PackError(`${MANIFEST_FILE} not found in ${packDir}. Add a ${MANIFEST_FILE} with type, name and version.`);
    }
    throw new Error(`Cannot read ${file}: ${err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new PackError(`${MANIFEST_FILE} in ${packDir} is not valid JSON (${err.message}). Fix the syntax.`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new PackError(`${MANIFEST_FILE} in ${packDir} must be a JSON object with type, name and version.`);
  }
  return parsed;
}

/** Returns the frontmatter keys of a markdown file, or an empty object when there is none. */
function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const fields = {};
  if (!match) return fields;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

/** Returns why a set's members are unusable, or null when they are fine. */
function membersProblem({ name, members }) {
  if (!Array.isArray(members) || members.length === 0) return 'A set needs members: a non-empty array of pack names.';
  const bad = members.find((m) => !isKebab(m));
  if (bad !== undefined) return `Set member ${JSON.stringify(bad)} is not a lowercase kebab-case pack name.`;
  const dup = members.find((m, i) => members.indexOf(m) !== i);
  if (dup !== undefined) return `Set member "${dup}" is listed more than once.`;
  if (members.includes(name)) return `A set cannot list itself ("${name}") as a member.`;
  return null;
}

/** Returns why a tag list is unusable, or null when it is absent or fine. Tags are checked for shape only. */
function tagsProblem({ tags }) {
  if (tags === undefined) return null;
  if (!Array.isArray(tags)) return `Tags must be a list of tags, not ${JSON.stringify(tags)}.`;
  const bad = tags.find((t) => !isKebab(t));
  if (bad !== undefined) return `Tag ${JSON.stringify(bad)} is not a lowercase kebab-case tag.`;
  const dup = tags.find((t, i) => tags.indexOf(t) !== i);
  if (dup !== undefined) return `Tag "${dup}" is listed more than once.`;
  if (tags.length > MAX_TAGS) return `${tags.length} tags is more than the limit of ${MAX_TAGS}.`;
  return null;
}

/**
 * Reads a set file `<name>.md`: the name is the file name and the rest comes from its front matter.
 * Throws PackError when the file is absent or has no closed front matter. Values are not checked here.
 * @param {string} file
 * @returns {PackManifest}
 */
export function readSetFile(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') throw new PackError(`Set file ${file} not found. Create it with front matter holding type, version and members.`);
    throw new Error(`Cannot read ${file}: ${err.message}`);
  }
  const fields = readFrontmatter(text);
  if (fields === null) {
    throw new PackError(`Set file ${file} has no closed front matter. Start it with a --- block holding type: set, version and members, and close the block with ---.`);
  }
  const manifest = { type: fields.type, name: basename(file).replace(/\.md$/, ''), version: fields.version, members: fields.members };
  if (fields.description !== undefined) manifest.description = fields.description;
  if (fields.tags !== undefined) manifest.tags = fields.tags;
  return manifest;
}

/**
 * Checks a set file `sets/<name>.md`. Never modifies it.
 * @param {string} file
 * @returns {{ ok: boolean, findings: Finding[] }}
 */
export function validateSetFile(file) {
  const path = basename(file);
  let manifest;
  try {
    manifest = readSetFile(file);
  } catch (err) {
    if (!(err instanceof PackError)) throw err;
    return { ok: false, findings: [{ rule: err.rule, message: err.message, path }] };
  }
  /** @type {Finding[]} */
  const findings = [];
  if (manifest.type !== 'set') {
    findings.push({
      rule: 'pack-type-unknown',
      message: `A file under sets/ must have type: set but ${manifest.type === undefined ? 'type is missing' : `has type ${JSON.stringify(manifest.type)}`}. Set type: set in the front matter, or move the file to its own type folder.`,
      path,
    });
  }
  if (!isKebab(manifest.name)) {
    findings.push({
      rule: 'pack-name-invalid',
      message: `Set file name ${JSON.stringify(path)} is not lowercase kebab-case. Rename it with letters, digits and single hyphens, for example "starter.md".`,
      path,
    });
  }
  if (typeof manifest.version !== 'string' || !SEMVER.test(manifest.version)) {
    findings.push({
      rule: 'pack-version-format',
      message: `Set version ${JSON.stringify(manifest.version)} is not MAJOR.MINOR.PATCH. Set version in the front matter to a version like 1.2.3.`,
      path,
    });
  }
  const problem = membersProblem(manifest);
  if (problem !== null) {
    findings.push({
      rule: 'pack-members-invalid',
      message: `${problem} Set members in the front matter to a list of pack names such as [planning, build].`,
      path,
    });
  }
  const tagProblem = tagsProblem(manifest);
  if (tagProblem !== null) {
    findings.push({
      rule: 'pack-tags-invalid',
      message: `${tagProblem} Set tags in the front matter to a list of up to ${MAX_TAGS} distinct lowercase kebab-case words such as [nextjs, audit], or remove it.`,
      path,
    });
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Checks a pack folder's manifest and, for skill packs, its SKILL.md. Never modifies the pack.
 * @param {string} packDir
 * @returns {{ ok: boolean, findings: Finding[] }}
 */
export function validatePack(packDir) {
  /** @type {Finding[]} */
  const findings = [];
  let manifest;
  try {
    manifest = readPack(packDir);
  } catch (err) {
    if (!(err instanceof PackError)) throw err;
    return { ok: false, findings: [{ rule: err.rule, message: err.message, path: MANIFEST_FILE }] };
  }

  if (!PACK_TYPES.includes(manifest.type)) {
    findings.push({
      rule: 'pack-type-unknown',
      message: `Unknown pack type ${JSON.stringify(manifest.type)}. Set type in ${MANIFEST_FILE} to one of: ${PACK_TYPES.join(', ')}.`,
      path: MANIFEST_FILE,
    });
  }
  if (!isKebab(manifest.name)) {
    findings.push({
      rule: 'pack-name-invalid',
      message: `Pack name ${JSON.stringify(manifest.name)} is not lowercase kebab-case. Use letters, digits and single hyphens, for example "skeleton-probe".`,
      path: MANIFEST_FILE,
    });
  }
  if (typeof manifest.version !== 'string' || !SEMVER.test(manifest.version)) {
    findings.push({
      rule: 'pack-version-format',
      message: `Pack version ${JSON.stringify(manifest.version)} is not MAJOR.MINOR.PATCH. Use a version like 1.2.3.`,
      path: MANIFEST_FILE,
    });
  }

  if (manifest.type === 'set') {
    const problem = membersProblem(manifest);
    if (problem !== null) {
      findings.push({
        rule: 'pack-members-invalid',
        message: `${problem} Set members in ${MANIFEST_FILE} to a list of pack names such as ["planning", "build"].`,
        path: MANIFEST_FILE,
      });
    }
  }

  const tagProblem = tagsProblem(manifest);
  if (tagProblem !== null) {
    findings.push({
      rule: 'pack-tags-invalid',
      message: `${tagProblem} Set tags in ${MANIFEST_FILE} to a list of up to ${MAX_TAGS} distinct lowercase kebab-case words such as ["nextjs", "audit"], or remove it.`,
      path: MANIFEST_FILE,
    });
  }

  if (manifest.type === 'skill') {
    let text;
    try {
      text = readFileSync(join(packDir, 'SKILL.md'), 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw new Error(`Cannot read SKILL.md in ${packDir}: ${err.message}`);
    }
    if (text === undefined) {
      findings.push({
        rule: 'pack-skill-missing',
        message: 'A skill pack needs a SKILL.md next to pack.json, with name and description in its frontmatter.',
        path: 'SKILL.md',
      });
    } else {
      const fm = frontmatter(text);
      const absent = ['name', 'description'].filter((k) => !fm[k]);
      if (absent.length > 0) {
        findings.push({
          rule: 'pack-skill-missing',
          message: `SKILL.md frontmatter is missing ${absent.join(' and ')}. Add a --- block at the top with name and description.`,
          path: 'SKILL.md',
        });
      }
    }
  }

  return { ok: findings.length === 0, findings };
}

/** Skill descriptions are always in the harness's context; past its share it drops the least-used skills. */
export const SKILL_DESCRIPTION_WARN_CHARS = 250;
export const SKILL_DESCRIPTIONS_BUDGET_CHARS = 3072;

/** Returns the SKILL.md description in a folder, or undefined when there is none to read. */
function skillDescription(dir) {
  let text;
  try {
    text = readFileSync(join(dir, 'SKILL.md'), 'utf8');
  } catch {
    return undefined;
  }
  return frontmatter(text).description || undefined;
}

const subdirs = (dir) => {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => join(dir, e.name));
  } catch {
    return [];
  }
};

/**
 * Warnings for a skill pack's context cost: its SKILL.md description over SKILL_DESCRIPTION_WARN_CHARS,
 * and, when packDir sits at <store>/packs/<channel>/skills/<name>, every SKILL.md description in that
 * store together over SKILL_DESCRIPTIONS_BUDGET_CHARS. Empty for other pack types. Never fails a pack.
 * @param {string} packDir
 * @returns {{ rule: 'skill-description-long' | 'skill-descriptions-over-budget', message: string, path: string }[]}
 */
export function skillDescriptionWarnings(packDir) {
  let manifest;
  try {
    manifest = readPack(packDir);
  } catch (err) {
    if (err instanceof PackError) return []; // validatePack reports the manifest
    throw err;
  }
  if (manifest.type !== 'skill') return [];
  const warnings = [];
  const own = skillDescription(packDir);
  if (own !== undefined && own.length > SKILL_DESCRIPTION_WARN_CHARS) {
    warnings.push({
      rule: 'skill-description-long',
      message: `SKILL.md description is ${own.length} characters, over the ${SKILL_DESCRIPTION_WARN_CHARS}-character budget. Shorten it to what tells the agent when to use the skill.`,
      path: 'SKILL.md',
    });
  }
  const skillsDir = dirname(resolve(packDir));
  const packsDir = dirname(dirname(skillsDir));
  if (basename(skillsDir) === 'skills' && basename(packsDir) === 'packs') {
    const channels = subdirs(packsDir);
    const skillDirs = [
      ...channels.flatMap((c) => subdirs(join(c, 'skills'))),
      ...channels.flatMap((c) => subdirs(join(c, 'teams')).flatMap((t) => subdirs(join(t, 'skills')))),
    ];
    const total = skillDirs.reduce((sum, d) => sum + (skillDescription(d)?.length ?? 0), 0);
    if (total > SKILL_DESCRIPTIONS_BUDGET_CHARS) {
      warnings.push({
        rule: 'skill-descriptions-over-budget',
        message: `The store's ${skillDirs.length} skill descriptions are ${total} characters together, over the ${SKILL_DESCRIPTIONS_BUDGET_CHARS}-character budget. Shorten the longest descriptions so the harness keeps every skill listed.`,
        path: 'SKILL.md',
      });
    }
  }
  return warnings;
}

const canonical = (p) => {
  let real;
  try {
    real = realpathSync.native(p);
  } catch {
    real = resolve(p);
  }
  return process.platform === 'win32' ? real.toLowerCase() : real;
};

const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

/**
 * Checks a harness marketplace file against a pack folder: some entry must resolve to the pack,
 * and every local entry must point at a folder that exists. Entry sources resolve against the
 * marketplace root, the directory that holds `.claude-plugin/`.
 * @param {string} packDir
 * @param {string} marketplaceFile
 * @returns {Finding[]}
 */
export function checkMarketplace(packDir, marketplaceFile) {
  const rule = 'marketplace-entry-missing';
  const invalid = 'marketplace-invalid';
  const path = toPosix(marketplaceFile);
  let text;
  try {
    text = readFileSync(marketplaceFile, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read ${marketplaceFile}: ${err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return [{ rule: invalid, message: `${marketplaceFile} is not valid JSON (${err.message}). Fix the syntax.`, path }];
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) || !Array.isArray(parsed.plugins)) {
    return [{ rule: invalid, message: `${marketplaceFile} must be an object with a plugins array of {name, source} entries.`, path }];
  }

  const root = dirname(dirname(resolve(marketplaceFile)));
  const target = canonical(packDir);
  /** @type {Finding[]} */
  const findings = [];
  let listed = false;
  for (const entry of parsed.plugins) {
    const label = entry !== null && typeof entry === 'object' ? JSON.stringify(entry.name) : JSON.stringify(entry);
    if (entry === null || typeof entry !== 'object' || typeof entry.name !== 'string' || entry.source === undefined) {
      findings.push({ rule: invalid, message: `Marketplace entry ${label} needs a name and a source. Add both.`, path });
      continue;
    }
    const { source } = entry;
    if (isPlainObject(source)) continue; // remote source: nothing local to check
    if (typeof source !== 'string') {
      findings.push({
        rule: invalid,
        message: `Marketplace entry "${entry.name}" has a source that is neither a relative path string nor a remote source object. Fix the source.`,
        path,
      });
      continue;
    }
    const folder = resolve(root, source);
    if (!existsSync(folder) || !isDir(folder)) {
      findings.push({
        rule,
        message: `Marketplace entry "${entry.name}" points at ${entry.source}, which is not an existing folder. Fix the source or remove the entry.`,
        path,
      });
    } else if (canonical(folder) === target) {
      listed = true;
    }
  }
  if (!listed) {
    findings.push({
      rule,
      message: `No marketplace entry has a source that resolves to ${packDir}. Add an entry with a relative source such as "./packs/...".`,
      path,
    });
  }
  return findings;
}
