import { readFileSync } from 'node:fs';
import { MODULE_NAME } from '../card.mjs';
import { PathError } from '../files.mjs';
import { ProjectRootsError, resolveProjectPath, resolveProjectRoots } from '../project-roots.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../git.mjs').Change} Change */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

const OVERVIEW = 'docs/living/architecture/overview.md';
const MODULES = 'docs/living/architecture/modules';
const DECISIONS = 'docs/living/decisions/';
const LAYER_MAP = 'docs/living/architecture/layers.json';
const RULE_FILES = /^\.process\/profiles\/stance-[^/]+\/[^/]+\.cjs$/;
/** The header block every Module contract opens with, above its first heading. */
export const CONTRACT_HEADER = Object.freeze(['Layers present', 'Public entry', 'Ports owned', 'Ports required', 'Used by']);

const slashes = (path) => String(path).replaceAll('\\', '/');

/** A document that exists but cannot be read; reported as a finding, never thrown out of the gate. */
class UnreadableError extends Error {}

function readLogical(roots, path) {
  try {
    return readFileSync(resolveProjectPath(roots, path), 'utf8');
  } catch (cause) {
    if (cause?.code === 'ENOENT') return null;
    if (cause instanceof ProjectRootsError || cause instanceof PathError) throw cause;
    throw new UnreadableError(`${path} cannot be read (${cause?.code ?? cause?.message}). Repair or restore it.`);
  }
}

/**
 * What the hardened tier adds for a project whose architecture overview has a Stance section: a change to the layer map
 * or a rule file travels with a decision record in the same diff, and each module in the card's blast radius has a
 * Module contract with its full header block. The check cannot tell whether a contract's content still matches the
 * code (that needs the tool and a reviewer); it proves the contract exists, was written to the format, and that a
 * rule change was not made quietly. Projects without a Stance section are not touched.
 * @param {{ projectDir: string, card: Card, changes: Change[] }} input
 * @returns {Finding[]}
 */
export function checkStanceHardened({ projectDir, card, changes }) {
  let roots;
  let overview;
  try {
    roots = resolveProjectRoots(projectDir);
    overview = readLogical(roots, OVERVIEW);
  } catch (cause) {
    if (!(cause instanceof ProjectRootsError || cause instanceof PathError || cause instanceof UnreadableError)) throw cause;
    return [{ rule: 'stance-unverifiable', message: cause.message, path: OVERVIEW }];
  }
  if (overview === null || !/^##\s+Stance\b/m.test(overview.replaceAll('\r\n', '\n'))) return [];

  /** @type {Finding[]} */
  const findings = [];
  const touched = changes.flatMap((change) => (change.status === 'R' && change.from !== undefined ? [change.from, change.path] : [change.path])).map(slashes);
  const ruleChanges = touched.filter((path) => path === LAYER_MAP || RULE_FILES.test(path));
  const decided = touched.some((path) => path.startsWith(DECISIONS) && path.endsWith('.md') && path.split('/').at(-1) !== 'INDEX.md');
  if (ruleChanges.length > 0 && !decided) {
    findings.push({
      rule: 'stance-rule-change-without-decision',
      path: ruleChanges[0],
      message: `${[...new Set(ruleChanges)].join(', ')} changed without a decision record. At the hardened tier a change to the layer map or a rule file needs a record under ${DECISIONS} in the same diff: add one saying why the rules change, or revert the edit.`,
    });
  }

  const blast = Array.isArray(card.blast_radius) ? [...new Set(card.blast_radius.filter((name) => typeof name === 'string' && MODULE_NAME.test(name)))] : [];
  for (const name of blast) {
    const path = `${MODULES}/${name}.md`;
    let text;
    try {
      text = readLogical(roots, path);
    } catch (cause) {
      if (!(cause instanceof ProjectRootsError || cause instanceof PathError || cause instanceof UnreadableError)) throw cause;
      findings.push({ rule: 'stance-unverifiable', message: cause.message, path });
      continue;
    }
    if (text === null) continue; // card-contract already reports a missing module document
    const body = text.replaceAll('\r\n', '\n').replace(/^---\n[\s\S]*?\n---\n/, '');
    const head = body.split(/^## /m)[0].toLowerCase();
    const missing = CONTRACT_HEADER.filter((field) => !head.includes(field.toLowerCase()));
    if (missing.length > 0) {
      findings.push({
        rule: 'stance-contract-header',
        path,
        message: `The Module contract for ${name} lacks ${missing.join(', ')} in its header block. At the hardened tier every module in the blast radius needs the full block (${CONTRACT_HEADER.join(', ')}) above its first heading. Bring ${path} up to date with the module-contract skill.`,
      });
    }
  }
  return findings;
}
