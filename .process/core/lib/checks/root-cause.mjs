import { readFileSync } from 'node:fs';
import { toLf } from '../files.mjs';
import { PLACEHOLDERS } from '../approval.mjs';
import { CARD_FILES, WORK_ROOT, workFile } from '../card-files.mjs';
import { sectionBody } from '../contract.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

/** The level-2 sections a bug card's root-cause record must fill. */
export const ROOT_CAUSE_SECTIONS = Object.freeze(['Hypotheses tested', 'Evidence', 'Cause']);

const TEMPLATE = 'core/templates/root-cause.md';
const finding = (rule, message) => ({ rule, message });

/** True when a section body holds nothing but whitespace, list markers or one placeholder word (comments are already stripped). */
function isEmpty(body) {
  const text = body.split('\n').map((line) => line.replace(/^\s*(?:[-*+]|\d+[.)])(?:\s+|$)/, '')).join(' ').trim();
  return text === '' || PLACEHOLDERS.includes(text.toLowerCase());
}

/**
 * The root-cause record of a bug card: present, with each required section holding something. Nothing about the
 * content is judged. A card of another type is never read.
 * @param {{ projectDir: string, card: import('../card.mjs').Card }} input
 * @returns {Finding[]}
 */
export function checkRootCause({ projectDir, card }) {
  if (card.type !== 'bug') return [];
  const path = `${WORK_ROOT}/${card.id}/${CARD_FILES.rootCause}`;
  let text;
  try {
    text = toLf(readFileSync(workFile(projectDir, card.id, CARD_FILES.rootCause), 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    return [finding('root-cause-missing', `A bug card needs its root-cause record, and ${path} does not exist. Copy ${TEMPLATE} there and fill in ${ROOT_CAUSE_SECTIONS.join(', ')}; three short lines are enough.`)];
  }
  const empty = ROOT_CAUSE_SECTIONS.filter((name) => {
    const body = sectionBody(text, name);
    return body === null || isEmpty(body);
  });
  if (empty.length === 0) return [];
  return [finding('root-cause-incomplete', `${path} has no text under ${empty.map((name) => `"${name}"`).join(', ')}. Fill each section; three short lines are enough.`)];
}
