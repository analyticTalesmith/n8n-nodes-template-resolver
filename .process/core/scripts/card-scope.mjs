import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardPath } from '../lib/board.mjs';
import { SCOPE_BEGIN, SCOPE_END, applyScopeBlock, findScopeBlock, unsafeScopePath } from '../lib/card-scope.mjs';

export class ScopeSyncError extends Error {}

/**
 * Writes the Scope table of a card's card.md from its card.json, inside the generated block. card.json is only read;
 * nothing is written unless the whole card can be read first.
 * @param {string} projectDir
 * @param {string} id
 * @returns {{ changed: boolean, path: string }}
 */
export function syncScope(projectDir, id) {
  let located;
  try {
    located = cardPath(projectDir, id);
  } catch (error) {
    throw new ScopeSyncError(`Cannot sync ${id}: ${error.message}`);
  }
  if (!located) throw new ScopeSyncError(`Cannot sync ${id}: no card with that id is on the board.`);
  let card;
  try {
    card = JSON.parse(readFileSync(`${located.dir}/card.json`, 'utf8'));
  } catch (error) {
    throw new ScopeSyncError(`Cannot sync ${id}: card.json cannot be read (${error.message}). Fix card.json first; card.md was not changed.`);
  }
  if (card === null || typeof card !== 'object' || Array.isArray(card)) {
    throw new ScopeSyncError(`Cannot sync ${id}: card.json is not a JSON object. Fix card.json first; card.md was not changed.`);
  }
  const unsafe = unsafeScopePath(card);
  if (unsafe !== null) throw new ScopeSyncError(`Cannot sync ${id}: the path ${JSON.stringify(unsafe)} cannot be written into a table cell (it has a backtick or a line break). Correct it in card.json; card.md was not changed.`);
  const file = `${located.dir}/card.md`;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    throw new ScopeSyncError(`Cannot sync ${id}: card.md cannot be read (${error.message}).`);
  }
  if ((text.includes(SCOPE_BEGIN) || text.includes(SCOPE_END)) && findScopeBlock(text) === null) {
    throw new ScopeSyncError(`Cannot sync ${id}: card.md has an unpaired generated scope marker. Keep the begin marker above the end marker, or delete both and sync again; card.md was not changed.`);
  }
  const next = applyScopeBlock(text, card);
  if (!next.written) throw new ScopeSyncError(`Cannot sync ${id}: card.md has no "## Scope" section to write the table into. Add one; card.md was not changed.`);
  if (next.changed) writeFileSync(file, next.text);
  return { changed: next.changed, path: file };
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const [command, projectDir, id, ...rest] = process.argv.slice(2);
  if (command !== 'sync' || !projectDir || !id || rest.length > 0) {
    console.error('Usage: node card-scope.mjs sync <projectDir> <cardId>');
    process.exit(2);
  }
  try {
    const { changed, path } = syncScope(resolve(projectDir), id);
    console.log(changed ? `Scope table of ${path} written from card.json.` : `Scope table of ${path} already matches card.json.`);
  } catch (error) {
    if (!(error instanceof ScopeSyncError)) throw error;
    console.error(error.message);
    process.exit(1);
  }
}
