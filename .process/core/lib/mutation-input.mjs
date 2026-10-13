import { isTestPath } from './checks/test-amendments.mjs';

/**
 * A small helper for the test reviewer's mutation review: it lists the added lines worth mutating, with a mutation to
 * try on each. The reviewer applies the mutations in a scratch copy and records which survive. It is not a mutation
 * engine: it makes no change, runs no test and judges no result.
 */

export const DEFAULT_MAX = 40;

const CODE_FILE = /\.(?:mjs|cjs|js|jsx|ts|tsx|py|go|rs|java|rb|kt|cs|php)$/i;
const SKIPPED_LINE = /^\s*(?:\/\/|\/\*|\*|#|import\s|export\s+\*\s+from|$)/;

/** Mutation rules in the order they are tried on a line; `weight` ranks a line when the cap cuts the list. */
const RULES = [
  { from: '===', to: '!==', pattern: /===/, weight: 5 },
  { from: '!==', to: '===', pattern: /!==/, weight: 5 },
  { from: '>=', to: '>', pattern: />=/, weight: 5 },
  { from: '<=', to: '<', pattern: /<=/, weight: 5 },
  { from: '>', to: '>=', pattern: /(?<![=>-])>(?![=>])/, weight: 4 },
  { from: '<', to: '<=', pattern: /(?<![=<])<(?![=<])/, weight: 4 },
  { from: '&&', to: '||', pattern: /&&/, weight: 5 },
  { from: '||', to: '&&', pattern: /\|\|/, weight: 5 },
  { from: 'return true;', to: 'return false;', pattern: /\breturn true;/, weight: 4 },
  { from: 'return false;', to: 'return true;', pattern: /\breturn false;/, weight: 4 },
  { from: '+', to: '-', pattern: / \+ /, weight: 2 },
  { from: '-', to: '+', pattern: / - /, weight: 2 },
  { from: 'throw', to: '(delete the throw)', pattern: /^\s*throw\b/, weight: 4 },
];

/** The line with string contents and a trailing comment blanked, so an operator inside either is never matched. */
function code(text) {
  return text
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""')
    .replace(/\s\/\/.*$/, '');
}

/**
 * The added lines worth mutating, strongest first when a cap cuts the list, then in file order, numbered m1, m2, ...
 * Test files, other file types, comments, imports and blank lines are left out.
 * @param {Array<{ path: string, line: number, text: string }>} lines
 * @param {{ max?: number }} [options]
 * @returns {Array<{ id: string, path: string, line: number, text: string, mutations: Array<{ from: string, to: string }>, weight: number }>}
 */
export function mutationCandidates(lines, { max = DEFAULT_MAX } = {}) {
  const found = [];
  for (const { path, line, text } of lines) {
    if (!CODE_FILE.test(path) || isTestPath(path) || SKIPPED_LINE.test(text)) continue;
    const visible = code(text);
    const hits = RULES.filter((rule) => rule.pattern.test(visible));
    if (hits.length === 0) continue;
    found.push({ path, line, text: text.trim(), mutations: hits.map(({ from, to }) => ({ from, to })), weight: Math.max(...hits.map((rule) => rule.weight)) + (hits.length > 1 ? 1 : 0) });
  }
  const kept = found
    .map((candidate, order) => ({ candidate, order }))
    .sort((a, b) => b.candidate.weight - a.candidate.weight || a.order - b.order)
    .slice(0, Math.max(0, max))
    .sort((a, b) => a.order - b.order);
  return kept.map(({ candidate }, index) => ({ id: `m${index + 1}`, ...candidate }));
}

const cell = (text) => text.replaceAll('|', '\\|');

/**
 * The Markdown the reviewer works from: one row per candidate with the mutation to try and a result column that starts
 * as not-run.
 * @param {ReturnType<typeof mutationCandidates>} candidates
 * @param {{ base: string, considered: number }} context
 * @returns {string}
 */
export function renderMutationInput(candidates, { base, considered }) {
  const head = `# Mutation review input\n\nBase ${base}. The scope is the ${considered} added lines since the base in non-test source files; ${candidates.length} of them are worth a mutation.`;
  if (candidates.length === 0) return `${head}\n\nNo line in the diff is worth mutating: no comparison, logical operator, returned boolean, arithmetic or throw was added.\n`;
  const rows = candidates.map((c) => `| ${c.id} | ${c.path}:${c.line} | \`${cell(c.text)}\` | ${c.mutations.map((m) => `\`${cell(m.from)}\` to \`${cell(m.to)}\``).join('; ')} | not-run |`);
  return [
    head,
    '| Id | Location | Line | Mutation to try | Result |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    "How to use it: in a scratch copy outside the repository apply one mutation at a time, run the card's gate command, then restore the line. Set Result to `killed` when a test failed, `survived` when every test still passed, or `equivalent` when the mutation cannot change behavior (say why). Every `survived` row names a test that is missing or too weak, and goes into the review report with the test that should have caught it.",
  ].join('\n\n').concat('\n');
}
