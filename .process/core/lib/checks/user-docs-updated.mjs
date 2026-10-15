import { toPosix } from '../files.mjs';
import { readFileSync } from 'node:fs';
import { userDocsOf } from '../card.mjs';
import { readFrontmatter } from '../frontmatter.mjs';
import { DOCS_ROOT, PROCESS_DIR } from '../layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from '../project-roots.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../git.mjs').Change} Change */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

const slashes = (path) => toPosix(String(path), { stripDotSlash: true });
const isRootReadme = (path) => slashes(path) === 'README.md';
const PROGRAM_EXTENSIONS = Object.freeze(new Set(['js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'py', 'sh', 'ps1', 'rb', 'go', 'rs', 'java', 'cs', 'c', 'cpp', 'php']));
const DOCUMENT_NAMES = Object.freeze(new Set(['readme', 'changelog', 'changes', 'license', 'notice', 'authors', 'contributing']));
const inDocumentFolder = (path) => path.startsWith(`${DOCS_ROOT}/`) || path.startsWith(`${PROCESS_DIR}/`);

/** A path is a document when it is markdown, mdx or rst; a .txt file under the docs or process folder or with a known document name; or any non-program file under those folders. */
function isDocumentPath(path) {
  const file = path.slice(path.lastIndexOf('/') + 1);
  const dot = file.lastIndexOf('.');
  const extension = dot < 0 ? '' : file.slice(dot + 1).toLowerCase();
  if (/^(md|mdx|rst)$/.test(extension)) return true;
  if (PROGRAM_EXTENSIONS.has(extension)) return false;
  if (extension === 'txt') return inDocumentFolder(path) || DOCUMENT_NAMES.has(file.slice(0, dot).toLowerCase());
  return inDocumentFolder(path);
}

/** True for the root README by name, or when the document starts with frontmatter that sets user_facing: true. An unreadable document is not user facing. */
function isUserFacing(projectDir, path) {
  if (isRootReadme(path)) return true;
  try {
    const text = readFileSync(resolveProjectPath(resolveProjectRoots(projectDir), slashes(path)), 'utf8');
    return readFrontmatter(text)?.user_facing === 'true';
  } catch {
    return false;
  }
}

/**
 * A card marked user_visible whose manifest holds a code path must change at least one user-facing document (frontmatter `user_facing: true`), or carry
 * a one-line `user_docs_waiver` giving the reason. Each document the card lists in `user_docs` must be tagged and changed.
 * @param {{ projectDir: string, card: Card, changes: Change[] }} input
 * @returns {Finding[]}
 */
export function checkUserDocsUpdated({ projectDir, card, changes }) {
  if (/** @type {{ user_visible?: unknown }} */ (card).user_visible !== true) return [];
  const { add = [], edit = [], remove = [] } = card.manifest ?? {};
  const planned = [...add, ...edit, ...remove].map(slashes);
  if (planned.length > 0 && planned.every(isDocumentPath)) return [];
  const waiver = /** @type {{ user_docs_waiver?: unknown }} */ (card).user_docs_waiver;
  if (waiver !== undefined) {
    if (typeof waiver === 'string' && waiver.trim() !== '' && !/[\r\n]/.test(waiver)) return [];
    return [{ rule: 'user-docs-waiver-invalid', path: 'user_docs_waiver', message: 'user_docs_waiver must be one line of text that says why no user document changes. Fix it in card.json, or remove it and update a user-facing document.' }];
  }
  const touched = new Set(changes.filter((change) => change.status !== 'D').map((change) => slashes(change.path)));
  /** @type {Finding[]} */
  const findings = [];
  for (const doc of userDocsOf(card)) {
    if (!isUserFacing(projectDir, doc)) {
      findings.push({ rule: 'user-docs-not-tagged', path: doc, message: `${doc} is listed in user_docs but is not a user-facing document. Add user_facing: true to its frontmatter, or take it off the list.` });
    } else if (!touched.has(slashes(doc))) {
      findings.push({ rule: 'user-docs-not-updated', path: doc, message: `${doc} is listed in user_docs but was not changed. Update it.` });
    }
  }
  if (findings.length === 0 && ![...touched].some((path) => isUserFacing(projectDir, path))) {
    findings.push({ rule: 'user-docs-not-updated', path: 'user_docs', message: 'The card is user visible but changes no user-facing document. Update one (the root README.md, or a document with user_facing: true in its frontmatter), or add user_docs_waiver to card.json with a one-line reason.' });
  }
  return findings;
}
