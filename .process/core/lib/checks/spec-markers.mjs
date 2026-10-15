import { readFileSync } from 'node:fs';
import { CARD_FILES, WORK_ROOT, cardFile, workFile } from '../card-files.mjs';
import { CARD_MD } from '../layout.mjs';
import { lighterCycleOf } from '../shapes.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

export const CLARIFICATION_MARKER = '[NEEDS CLARIFICATION';

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const LIST_ITEM = /^\s*([-*]|\d+\.)\s+/;

/** Spec lines outside fenced code blocks, each with its 1-based line number. */
function proseLines(text) {
  const lines = [];
  let fenced = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (FENCE.test(line)) {
      fenced = !fenced;
    } else if (!fenced) {
      lines.push({ number: i + 1, line });
    }
  });
  return lines;
}

function hasCriteria(lines) {
  for (let i = 0; i < lines.length; i++) {
    const heading = HEADING.exec(lines[i].line);
    if (!heading || !/criteria/i.test(heading[2])) continue;
    for (const { line } of lines.slice(i + 1)) {
      const next = HEADING.exec(line);
      if (next && next[1].length <= heading[1].length) break;
      if (LIST_ITEM.test(line)) return true;
    }
  }
  return false;
}

/**
 * Checks the card's spec: it exists, holds no open clarification marker and lists acceptance criteria. A card of a
 * one-card feature with no spec file has its spec folded into card.md, which is read the same way.
 * Only an unreadable spec throws.
 * @param {{ projectDir: string, card: Card }} input
 * @returns {Finding[]}
 */
export function checkSpec({ projectDir, card }) {
  const path = `${WORK_ROOT}/${card.id}/${CARD_FILES.spec}`;
  const file = workFile(projectDir, card.id, CARD_FILES.spec);
  let text;
  let shown = path;
  try {
    text = readFileSync(file, 'utf8');
  } catch (cause) {
    if (cause.code !== 'ENOENT') throw new Error(`Cannot read the spec at ${file} (${cause.message}). Repair or replace it.`, { cause });
    const folded = lighterCycleOf(projectDir, card.id) === null ? null : cardFile(projectDir, card.id, CARD_MD);
    try {
      if (folded === null) throw cause;
      text = readFileSync(folded, 'utf8');
      shown = `${card.id}/${CARD_MD}`;
    } catch {
      return [{ rule: 'spec-missing', message: `The spec is missing. Write it at ${path}.`, path }];
    }
  }

  /** @type {Finding[]} */
  const findings = [];
  const lines = proseLines(text);
  for (const { number, line } of lines) {
    if (line.replace(/`[^`]*`/g, '').includes(CLARIFICATION_MARKER)) {
      findings.push({
        rule: 'spec-needs-clarification',
        message: `${shown} line ${number} still has an open ${CLARIFICATION_MARKER}] marker. Answer the question in the spec and remove the marker.`,
        path: shown,
      });
    }
  }
  if (!hasCriteria(lines)) {
    findings.push({
      rule: 'spec-no-criteria',
      message: `${shown} has no acceptance criteria. Add a heading containing "criteria" followed by a list of criteria.`,
      path: shown,
    });
  }
  return findings;
}
