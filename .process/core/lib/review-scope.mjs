import { frozenTestPaths } from './packet-parts.mjs';

/**
 * The project-relative paths a card owns for review: its manifest (add, remove, edit), files_scope, docs_impact (when a list),
 * user_docs, and the test files it names (gate command and criterion traces). Folders carry no trailing slash and every
 * entry is read as the path itself or a folder holding it. Sorted, each once.
 * A card that plans no path (a read-only card, or one whose manifest is not filled yet) yields an empty list: its review
 * fingerprint covers no file of the tree, so another card's merge never makes its review stale.
 * Only entries that are plain project-relative paths count; an entry that climbs out with `..` or is absolute is dropped.
 * @param {{ manifest?: { add?: unknown, remove?: unknown, edit?: unknown }, files_scope?: unknown, docs_impact?: unknown, user_docs?: unknown, gate?: unknown, criteria?: unknown }} card
 * @returns {string[]}
 */
export function reviewOwnPaths(card) {
  const lists = [card.manifest?.add, card.manifest?.remove, card.manifest?.edit, card.files_scope, card.docs_impact, card.user_docs];
  const planned = lists.flatMap((list) => (Array.isArray(list) ? list : []));
  const own = [...planned, ...frozenTestPaths(/** @type {any} */ (card))]
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.replaceAll(String.fromCharCode(92), '/').replace(/^(\.\/)+/, '').replace(/\/+$/, ''))
    .filter((entry) => entry !== '' && !entry.startsWith('/') && !entry.split('/').includes('..'));
  return [...new Set(own)].sort();
}

const oneLine = (text) => String(text).replace(/\s+/g, ' ').trim();
const strings = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);
const objectOf = (value) => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {});

/** What one logged manifest amendment changed, as "edit +src/x.mjs, scope -lib" (nothing recorded reads as "no list changed"). */
function describeChange(entry) {
  const from = objectOf(entry.from);
  const to = objectOf(entry.to);
  const lists = [
    ['add', (side) => strings(objectOf(side.manifest).add)],
    ['remove', (side) => strings(objectOf(side.manifest).remove)],
    ['edit', (side) => strings(objectOf(side.manifest).edit)],
    ['scope', (side) => strings(side.files_scope)],
    ['blast radius', (side) => strings(side.blast_radius)],
  ];
  const parts = lists.flatMap(([name, read]) => {
    const before = new Set(read(from));
    const after = new Set(read(to));
    return [...[...after].filter((item) => !before.has(item)).map((item) => `${name} +${item}`), ...[...before].filter((item) => !after.has(item)).map((item) => `${name} -${item}`)];
  });
  return parts.length > 0 ? parts.join(', ') : 'no list changed';
}

/**
 * The deviations from the frozen plan a card logs after its freeze: manifest and scope amendments and added criteria, one
 * line each, for the review packet. A malformed entry reads as far as it can and never throws.
 * @param {{ manifest_amendments?: unknown, criteria_amendments?: unknown }} card
 * @returns {string[]}
 */
export function scopeAmendmentLines(card) {
  const manifest = (Array.isArray(card.manifest_amendments) ? card.manifest_amendments : []).map((raw) => {
    const entry = objectOf(raw);
    return `Manifest amended after the freeze at ${entry.at} by ${entry.by}: ${oneLine(entry.reason)} (${describeChange(entry)})`;
  });
  const criteria = (Array.isArray(card.criteria_amendments) ? card.criteria_amendments : []).flatMap((raw) => {
    const entry = objectOf(raw);
    return (Array.isArray(entry.added) ? entry.added : []).map((added) => `Criterion added after the freeze at ${entry.at} by ${entry.by}: ${oneLine(objectOf(added).text)} (verify ${objectOf(added).verify}); reason: ${oneLine(entry.reason)}`);
  });
  return [...manifest, ...criteria];
}
