import { existsSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { CONTRACT_FILES, parseBlastRadius, parseScope, proseOnly, readContractFile, sectionBody } from '../contract.mjs';
import { MODULE_NAME } from '../card.mjs';
import { PathError } from '../files.mjs';
import { ProjectRootsError, resolveProjectPath, resolveProjectRoots } from '../project-roots.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

const slashes = (path) => String(path).replaceAll('\\', '/').replace(/^(\.\/)+/, '');
const LINK = /\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const KINDS = ['add', 'edit', 'remove'];

/** Relative links of a markdown text that point into the repository and resolve to nothing. */
function brokenLinks(text, fileAbs, projectDir) {
  const roots = resolveProjectRoots(projectDir);
  const broken = [];
  for (const [, raw] of proseOnly(text).matchAll(LINK)) {
    if (raw.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    const target = raw.replace(/[#?].*$/, '');
    if (target === '') continue;
    let decoded = target;
    try {
      decoded = decodeURI(target);
    } catch {
      // keep the raw target
    }
    let abs;
    try {
      abs = decoded.startsWith('/') ? resolveProjectPath(roots, decoded.slice(1)) : resolve(dirname(fileAbs), decoded);
      const codeRel = relative(roots.checkoutRoot, abs);
      const docsRel = relative(roots.docsRoot, abs);
      const inside = (rel) => rel !== '..' && !rel.startsWith('..\\') && !rel.startsWith('../') && !isAbsolute(rel);
      if (!inside(codeRel) && !inside(docsRel)) continue;
      if (inside(docsRel) && roots.mode === 'local' && docsRel !== '') abs = resolveProjectPath(roots, `docs/${slashes(docsRel)}`);
    } catch { broken.push(raw); continue; }
    if (!existsSync(abs)) broken.push(raw);
  }
  return broken;
}

const list = (items) => (items.length ? items.join(', ') : 'nothing');

/**
 * Checks that a card's card.md is a usable contract (goal, interface contract, scope), that its relative links and
 * those of context.md resolve, and that its readable Scope agrees with the card.json manifest and files_scope.
 * Pure over the files it reads; never throws.
 * @param {{ projectDir: string, card: any, tier?: string }} input
 * @returns {Finding[]}
 */
export function checkCardContract({ projectDir, card, tier }) {
  let roots;
  try {
    roots = resolveProjectRoots(projectDir);
  } catch (error) {
    if (!(error instanceof ProjectRootsError)) throw error;
    return [{ rule: 'card-contract-unverifiable', message: error.message, path: CONTRACT_FILES.card }];
  }
  const logicalFile = (abs) => {
    const rel = relative(roots.docsRoot, abs);
    return roots.mode === 'local' && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\') && !isAbsolute(rel)
      ? `docs/${slashes(rel)}` : slashes(relative(projectDir, abs));
  };
  /** @type {Finding[]} */
  const findings = [];
  const id = card !== null && typeof card === 'object' && typeof card.id === 'string' ? card.id : '';
  const file = id === '' ? null : readContractFile(projectDir, id, CONTRACT_FILES.card);
  const path = file ? logicalFile(file.path) : CONTRACT_FILES.card;
  const missing = (what, fix) =>
    findings.push({ rule: 'card-contract-missing', message: `${what}. ${fix}`, path });

  if (file === null || file.text === null) {
    missing(`card.md of ${id || 'this card'} cannot be read`, 'Create it from core/templates/card.md (card-new writes it) and fill the Goal, Interface contract and Scope sections');
    return findings;
  }
  const text = file.text;

  const goal = sectionBody(text, 'Goal and why');
  if (goal === null || goal === '') {
    missing('the "Goal and why" section is empty or absent', 'Write one short paragraph for the model: what must be true when this is done, and why');
  }

  const contract = sectionBody(text, 'Interface contract');
  if (contract === null || contract === '') {
    missing('the "Interface contract" section is empty or absent', 'State the public surface this change adds or changes (signatures, shapes or boundaries, whichever apply), or write `none: <reason>`.');
  } else if (/^`?none`?\s*[:.—–-]*$/i.test(contract.trim())) {
    missing('the "Interface contract" says none without a reason', 'Write "none: <why nothing public changes>"');
  }

  if (tier === 'hardened') {
    const mustNots = sectionBody(text, 'Must-nots');
    const statement = mustNots?.trim().replace(/^(?:[-*+]|\d+[.)])\s+/, '');
    if (!statement || /^`?none`?\s*[:.—–-]*$/i.test(statement)) {
      missing('the "Must-nots" section is empty or has no reason', 'List what must not change, or write `none: <reason>`.');
    }
  }

  const scope = parseScope(text);
  if (Array.isArray(card?.blast_radius) && card.blast_radius.every((name) => typeof name === 'string')) {
    const readable = parseBlastRadius(text);
    const machine = [...new Set(card.blast_radius)].sort();
    if (!readable.found || readable.modules.join('\n') !== machine.join('\n')) {
      findings.push({
        rule: 'card-blast-radius-mismatch', path,
        message: `card.md Scope table Blast radius lists ${readable.found ? list(readable.modules) : 'no column'}; card.json blast_radius lists ${list(machine)}. Use the Scope table and make both module lists agree.`,
      });
    }
    const moduleFolder = 'docs/living/architecture/modules';
    try {
      const folder = resolveProjectPath(roots, moduleFolder);
      if (existsSync(folder)) for (const name of machine.filter((item) => MODULE_NAME.test(item))) {
        if (!existsSync(resolveProjectPath(roots, `${moduleFolder}/${name}.md`))) {
          findings.push({
            rule: 'card-module-unknown', path,
            message: `Module ${name} has no ${moduleFolder}/${name}.md document. Add that document or correct blast_radius.`,
          });
        }
      }
    } catch (error) {
      if (!(error instanceof ProjectRootsError || error instanceof PathError)) throw error;
      findings.push({ rule: 'card-contract-unverifiable', message: error.message, path });
    }
  }
  const scopeUsable = scope.found && (scope.writes.length > 0 || scope.readOnly);
  if (!scopeUsable) {
    missing('the "Scope" section lists no write path and does not say read-only', 'List each file to change with its permission (add, edit or remove), or write "read-only" on its own line');
  }

  /** @type {Array<[string, string]>} */
  const docs = [[CONTRACT_FILES.card, text]];
  const context = id === '' ? null : readContractFile(projectDir, id, CONTRACT_FILES.context);
  if (context?.text) docs.push([CONTRACT_FILES.context, context.text]);
  for (const [name, body] of docs) {
    const abs = name === CONTRACT_FILES.card ? file.path : /** @type {any} */ (context).path;
    for (const raw of brokenLinks(body, abs, projectDir)) {
      findings.push({
        rule: 'card-link-broken',
        message: `${name} links to ${raw}, which is not a file in the project. Fix the link or remove it (links point into docs/living, never copies).`,
        path: logicalFile(abs),
      });
    }
  }

  if (scopeUsable) {
    const manifest = card.manifest !== null && typeof card.manifest === 'object' ? card.manifest : {};
    const strings = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string').map(slashes) : []);
    for (const kind of KINDS) {
      const readable = [...new Set(scope.writes.filter((w) => w.kind === kind).map((w) => w.path))].sort();
      const machine = [...new Set(strings(manifest[kind]))].sort();
      if (readable.join('\n') !== machine.join('\n')) {
        findings.push({
          rule: 'card-scope-mismatch',
          message: `card.md Scope lists ${kind}: ${list(readable)}; the card.json manifest.${kind} lists: ${list(machine)}. Make both say the same; changing an approved contract needs the human's approval.`,
          path,
        });
      }
    }
    const scopePaths = strings(card.files_scope).map((s) => s.replace(/\/+$/, ''));
    const covered = (p) => scopePaths.some((s) => p === s || p.startsWith(`${s}/`));
    const writes = scope.writes.map((w) => w.path);
    const uncovered = writes.filter((p) => !covered(p));
    const idle = scopePaths.filter((s) => !writes.some((p) => p === s || p.startsWith(`${s}/`)));
    if (uncovered.length > 0 || idle.length > 0) {
      findings.push({
        rule: 'card-scope-mismatch',
        message: `card.md Scope lists write paths ${list(writes)}; card.json files_scope lists: ${list(scopePaths)}${uncovered.length ? ` (not covered: ${uncovered.join(', ')})` : ''}${idle.length ? ` (covers no listed path: ${idle.join(', ')})` : ''}. Make both say the same.`,
        path,
      });
    }
  }
  return findings;
}
