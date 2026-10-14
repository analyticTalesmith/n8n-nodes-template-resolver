import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CARD_FILES, WORK_ROOT } from '../card-files.mjs';
import { fileAtCommit, runGit } from '../git.mjs';
import { isFilingNoise, isOwnCycleBrief } from './manifest.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../git.mjs').Change} Change */
/** @typedef {import('../git.mjs').GitRunner} GitRunner */
/** @typedef {import('../contract.mjs').ScopeException} ScopeException */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {{ team: string, path: string, text: string }} Charter */

/** Where teams install their charters; equal to the folder the add script installs teams to. */
export const CHARTER_ROOT = '.process/teams';
export const SURFACES_HEADING = '## Write surfaces';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ENTRY = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*\/?$/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})\s*$/;
const ENTRY_CUT = 80;
const slashes = (path) => String(path).replaceAll('\\', '/');
/** Row-path comparison key: backslashes become slashes, leading ./ is stripped, and the result is always lowercase. */
const rowKey = (path) => slashes(path).replace(/^(\.\/)+/, '').toLowerCase();

/**
 * The entries of a charter's write-surface section: the lines of the first fenced block after the heading and before
 * the next line starting with "## ", trimmed, blank lines skipped.
 * @param {string} text
 * @returns {{ surfaces: string[], problem: null } | { surfaces: null, problem: string }}
 */
export function parseWriteSurfaces(text) {
  const lines = String(text).replaceAll('\r\n', '\n').split('\n');
  const heading = lines.findIndex((line) => line.trimEnd() === SURFACES_HEADING);
  if (heading === -1) return { surfaces: null, problem: `it has no "${SURFACES_HEADING}" heading` };
  let open = -1;
  let marker = '';
  for (let i = heading + 1; i < lines.length && open === -1; i += 1) {
    if (lines[i].startsWith('## ')) break;
    const fence = FENCE_OPEN.exec(lines[i]);
    if (fence !== null) {
      open = i;
      marker = fence[1];
    }
  }
  if (open === -1) return { surfaces: null, problem: `"${SURFACES_HEADING}" has no fenced block (three or more backticks or tildes) before the next "## " heading` };
  const close = lines.findIndex((line, i) => {
    const fence = i > open ? FENCE_CLOSE.exec(line) : null;
    return fence !== null && fence[1][0] === marker[0] && fence[1].length >= marker.length;
  });
  if (close === -1) return { surfaces: null, problem: `the fenced block under "${SURFACES_HEADING}" never closes` };
  const entries = lines.slice(open + 1, close).map((line) => line.trim()).filter((line) => line !== '');
  const seen = new Set();
  for (const entry of entries) {
    const segments = entry.split('/');
    if (!ENTRY.test(entry) || segments.includes('.') || segments.includes('..')) {
      return { surfaces: null, problem: `entry "${entry.slice(0, ENTRY_CUT)}" is not a project-relative path (letters, digits, dot, dash and underscore, "/" between parts, no "." or ".." part)` };
    }
    const key = entry.toLowerCase();
    if (seen.has(key)) return { surfaces: null, problem: `entry "${entry.slice(0, ENTRY_CUT)}" is listed twice (case ignored)` };
    seen.add(key);
  }
  return { surfaces: entries, problem: null };
}

/**
 * The team charters at a commit, by team name. A charter that is absent at that commit is skipped, so one written or
 * edited during a card never decides that card's ownership.
 * @param {string} projectDir
 * @param {string} commit
 * @param {GitRunner} [run]
 * @param {string[]} [extraTeams] teams to read even when the working tree no longer lists them (a charter the card deleted or moved)
 * @returns {Charter[]}
 */
export function readCharters(projectDir, commit, run = runGit, extraTeams = []) {
  let names;
  try {
    names = readdirSync(join(projectDir, CHARTER_ROOT), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') throw new Error(`Cannot read ${CHARTER_ROOT} in ${projectDir} (${err.message}). Fix its permissions, then retry.`);
    names = [];
  }
  /** @type {Charter[]} */
  const charters = [];
  for (const team of [...new Set([...names, ...extraTeams])].filter((name) => KEBAB.test(name)).sort()) {
    const path = `${CHARTER_ROOT}/${team}/charter.md`;
    const text = fileAtCommit(projectDir, commit, path, run);
    if (text !== null) charters.push({ team, path, text });
  }
  return charters;
}

/**
 * Team names whose charter a card deleted or moved, taken from its changes, so that charter is still read at the base.
 * @param {Change[]} changes
 * @returns {string[]}
 */
export function removedCharterTeams(changes) {
  const charterPath = new RegExp(`^${CHARTER_ROOT.replaceAll('.', '\\.')}/([^/]+)/charter\\.md$`);
  const gone = changes.flatMap((c) => (c.status === 'D' ? [c.path] : c.status === 'R' && c.from !== undefined ? [c.from] : []));
  return gone.flatMap((path) => charterPath.exec(slashes(path))?.[1] ?? []);
}
/**
 * Compares the card's changes with the surfaces the team charters list. A path a team owns may change only by that team
 * (the acting team named by the card's claim); another team's path is accepted, as a warning, only when a scope
 * exception row lists the path. Pure.
 * A path in `generatedIndexes` is an index change the caller proved is only generator output, so it is not checked;
 * `generatedIndexNotes` says why a non-exempt index path was not accepted.
 * The gate's own run summary (the card's `gate-run.json` in its work folder, added or modified) is machine output and is never checked.
 * One more path is accepted without a row: the card's own spec.md in its work folder, changed (added or edited) by the build team
 * when the card's manifest or file scope lists that exact path. The planning team owns the work folder otherwise, so no other
 * file of it, no other card's spec, no deletion or rename of the spec and no other acting team gets this.
 * @param {{ card: Card, charters: Charter[], changes: Change[], exceptions?: ScopeException[], generatedIndexes?: Set<string>, generatedIndexNotes?: Map<string, string> }} input
 * @returns {Finding[]}
 */
export function checkOwnership({ card, charters, changes, exceptions = [], generatedIndexes = new Set(), generatedIndexNotes = new Map() }) {
  if (charters.length === 0) return [];
  const ordered = [...charters].sort((a, b) => (a.team < b.team ? -1 : a.team > b.team ? 1 : 0));

  /** @type {Finding[]} */
  const invalid = [];
  const owned = [];
  /** @type {Map<string, { team: string, entry: string }>} */
  const listedBy = new Map();
  for (const { team, path, text } of ordered) {
    const parsed = parseWriteSurfaces(text);
    if (parsed.problem !== null) {
      invalid.push({ rule: 'ownership-charter-invalid', path, message: `${path}: ${parsed.problem}. Restore the charter from its pack with upgrade.` });
      continue;
    }
    for (const entry of parsed.surfaces) {
      const key = entry.toLowerCase();
      const other = listedBy.get(key);
      if (other !== undefined && other.team !== team) {
        invalid.push({
          rule: 'ownership-charter-invalid',
          path,
          message: `${path}: entry "${entry}" is also listed by the ${other.team} team, and a surface has one owner. Restore the charter from its pack with upgrade.`,
        });
        continue;
      }
      listedBy.set(key, { team, entry });
      owned.push({ team, entry, key });
    }
  }
  if (invalid.length > 0) return invalid;

  const claim = card?.claim;
  const claimOwner = claim !== null && typeof claim === 'object' && typeof claim.owner === 'string' ? claim.owner : '';
  const prefix = claimOwner.includes(':') ? claimOwner.slice(0, claimOwner.indexOf(':')) : '';
  const acting = ordered.some((c) => c.team === prefix) ? prefix : null;
  const actor = `the ${acting} team`;

  const ownerOf = (path) => {
    const lower = path.toLowerCase();
    let best = null;
    for (const item of owned) {
      const hit = item.entry.endsWith('/') ? lower.startsWith(item.key) : lower === item.key;
      if (hit && (best === null || item.key.length > best.key.length)) best = item;
    }
    return best;
  };

  const ownGateRun = rowKey(`${WORK_ROOT}/${card.id}/${CARD_FILES.gateRun}`);
  // The gate writes the summary of its own run there; it is machine output, never a write to the planning team's surface.
  const generated = (c) => ((c.status === 'A' || c.status === 'M') && rowKey(c.path) === ownGateRun) || ((c.status === 'A' || c.status === 'M') && generatedIndexes.has(slashes(c.path))) || isFilingNoise(c) || ((c.status === 'A' || c.status === 'M') && isOwnCycleBrief(card, c.path));
  const paths = new Set(changes.filter((c) => !generated(c)).flatMap((c) => [slashes(c.path), ...(c.from === undefined ? [] : [slashes(c.from)])]));
  const sorted = [...paths].sort();

  if (acting === null) {
    if (!sorted.some((path) => ownerOf(path) !== null)) return [];
    return [
      {
        rule: 'ownership-actor-unknown',
        message: `This card changes paths a team owns, but its claim owner is not <team>:<role> of an installed team, so the acting team is unknown. Claim the card as <team>:<role> of an installed team.`,
      },
    ];
  }

  const ownSpec = rowKey(`${WORK_ROOT}/${card.id}/${CARD_FILES.spec}`);
  const listed = [...(card.manifest?.add ?? []), ...(card.manifest?.edit ?? []), ...(card.files_scope ?? [])];
  const specAllowed =
    acting === 'build' &&
    listed.some((entry) => typeof entry === 'string' && rowKey(entry) === ownSpec) &&
    changes.every((c) => (c.status === 'A' || c.status === 'M' ? true : ![c.path, c.from].some((p) => p !== undefined && rowKey(p) === ownSpec)));
  const logged = (path) => exceptions.find((e) => rowKey(e.path) === rowKey(path));

  /** @type {Finding[]} */
  const findings = [];
  for (const path of sorted) {
    const item = ownerOf(path);
    if (item === null || item.team === acting) continue;
    if (specAllowed && rowKey(path) === ownSpec) continue;
    const row = logged(path);
    if (row === undefined) {
      findings.push({
        rule: 'ownership-violation',
        path,
        message: `${path} belongs to the ${item.team} team (its charter lists ${item.entry}), but this card's work is by ${actor}. Undo the change, or have the project lead log it under Scope exceptions in context.md.${generatedIndexNotes.has(path) ? ` Not accepted as a generated index change: ${generatedIndexNotes.get(path)}.` : ''}`,
      });
      continue;
    }
    const approver = String(row.approvedBy).trim() === '' ? '' : `, approved by ${row.approvedBy}`;
    findings.push({
      rule: 'ownership-exception',
      path,
      message: `approved deviation, needs human review: ${path} belongs to the ${item.team} team, but a scope exception logged ${row.date}${approver} lets this card change it. Reason: ${row.reason}`,
    });
  }
  return findings;
}
