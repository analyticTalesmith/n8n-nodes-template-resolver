import { toPosix } from './files.mjs';
/** @typedef {import('./card.mjs').Card} Card */

/**
 * Finds one dependency cycle. Iterative, so a very deep chain cannot overflow the stack.
 * Dependencies on ids that are not in `nodes` are ignored.
 * @param {Array<{ id: string, depends_on: string[] }>} nodes
 * @returns {string[] | null} the ids on one cycle in dependency order, or null
 */
export function findCycle(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const onPath = new Set();
  const finished = new Set();
  for (const start of nodes) {
    if (finished.has(start.id)) continue;
    const path = [{ id: start.id, next: 0 }];
    onPath.add(start.id);
    while (path.length) {
      const top = path[path.length - 1];
      const deps = byId.get(top.id).depends_on;
      if (top.next === deps.length) {
        path.pop();
        onPath.delete(top.id);
        finished.add(top.id);
        continue;
      }
      const dep = deps[top.next++];
      if (!byId.has(dep) || finished.has(dep)) continue;
      if (onPath.has(dep)) {
        return path.slice(path.findIndex((p) => p.id === dep)).map((p) => p.id);
      }
      onPath.add(dep);
      path.push({ id: dep, next: 0 });
    }
  }
  return null;
}

/**
 * Scope entries are compared as lowercase, forward-slash paths without a leading "./" or trailing "/"
 * (the project may sit on a case-insensitive filesystem). An entry that normalizes to empty or "."
 * means the whole project and overlaps everything. Two entries overlap when they are equal or one is
 * a path-segment prefix of the other: "src" overlaps "src/a.mjs", but "a/b" does not overlap "a/bc".
 */
export const normalize = (p) => {
  const n = toPosix(p).replace(/^\.\//, '').replace(/\/+$/, '').toLowerCase();
  return n === '.' ? '' : n;
};
export const overlaps = (a, b) => a === '' || b === '' || a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);

/**
 * Groups cards first-fit in the given order so that no two cards in a group share files.
 * Two cards share files when any of their scope entries overlap on whole path segments (see above).
 * A card with an empty files_scope has an unknown footprint and goes alone.
 * @param {Card[]} ready
 * @param {number} [maxGroup]
 * @returns {Card[][]}
 */
export function parallelGroups(ready, maxGroup = 4) {
  /** @type {Array<{ cards: Card[], scopes: string[], sealed: boolean }>} */
  const groups = [];
  for (const card of ready) {
    const scopes = card.files_scope.map(normalize);
    if (scopes.length === 0) {
      groups.push({ cards: [card], scopes, sealed: true });
      continue;
    }
    const target = groups.find(
      (g) => !g.sealed && g.cards.length < maxGroup && !scopes.some((s) => g.scopes.some((t) => overlaps(s, t))),
    );
    if (target) {
      target.cards.push(card);
      target.scopes.push(...scopes);
    } else {
      groups.push({ cards: [card], scopes: [...scopes], sealed: false });
    }
  }
  return groups.map((g) => g.cards);
}
