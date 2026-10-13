import { sectionBody } from './contract.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */

/** What one check reported, with receipts: ran and passed, ran and failed, could not run, or was not checked. */
export const VERIFICATION_STATES = Object.freeze(['proven', 'failed', 'could-not-run', 'not-checked']);

/** How strong a piece of evidence is: a fixed result, an agent watching, a model scoring, or a named person confirming. */
export const EVIDENCE_TIERS = Object.freeze(['deterministic', 'agent-observed', 'llm-judged', 'human-confirmed']);

/** The verdict of a verification run. */
export const VERDICTS = Object.freeze(['accept', 'revise', 'blocked']);

/** The verdict of a validation: the verdicts, or not assessed when no one judged whether the work meets the real need. */
export const VALIDATION_VERDICTS = Object.freeze([...VERDICTS, 'not-assessed']);

/** The sections of a record that hold a state table, with the field that carries the section's verdict. */
export const STATE_SECTIONS = Object.freeze([
  { heading: 'Conformance', field: 'verification_verdict', allowed: VERDICTS },
  { heading: 'Validation', field: 'validation_verdict', allowed: VALIDATION_VERDICTS },
]);

const cellsOf = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim().replaceAll('`', ''));
const isSeparator = (cells) => cells.every((cell) => /^:?-+:?$/.test(cell) || cell === '');

/**
 * The rows of a section's state table: id, state, tier, evidence or reason. The header and separator rows are skipped.
 * @param {string} body
 * @returns {Array<{ id: string, state: string, tier: string, evidence: string }>}
 */
export function parseStateRows(body) {
  const rows = [];
  for (const line of body.split('\n')) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = cellsOf(line);
    if (isSeparator(cells) || /^id$/i.test(cells[0])) continue;
    rows.push({ id: cells[0] ?? '', state: cells[1] ?? '', tier: cells[2] ?? '', evidence: cells.slice(3).join('|').trim() });
  }
  return rows;
}

const missing = (path, message) => ({ rule: 'verification-states-missing', path, message });
const invalid = (path, message) => ({ rule: 'verification-state-invalid', path, message });
const inconsistent = (path, message) => ({ rule: 'verification-verdict-inconsistent', path, message });

/**
 * Checks the four-state, two-verdict shape of a record that is accepted: both verdict fields, at least one row in the
 * conformance table, a known state and tier on every row with its evidence or reason, no model-scored validation proof,
 * and an accept that no failed row, non-accepting verdict or all-unproven table contradicts. Messages never print the record body.
 * @param {{ data: Record<string, unknown>, text: string, path: string }} record
 * @returns {Finding[]}
 */
export function stateFindings({ data, text, path }) {
  /** @type {Finding[]} */
  const findings = [];
  const field = (key) => (typeof data[key] === 'string' ? data[key].trim() : '');
  const accepted = field('verdict') === 'accept';
  const fix = 'Write the record from .process/core/templates/verification.md; below product tier the older shape is still accepted.';

  const absent = STATE_SECTIONS.filter(({ field: key, allowed }) => !allowed.includes(field(key)));
  if (absent.length) {
    findings.push(missing(path, `${path} needs ${absent.map(({ field: key, allowed }) => `${key} (one of ${allowed.join(', ')})`).join(' and ')} at this tier. ${fix}`));
  }

  const rowsOf = (heading) => parseStateRows(sectionBody(text, heading) ?? '');
  const conformance = rowsOf('Conformance');
  if (conformance.length === 0) {
    findings.push(missing(path, `The Conformance section of ${path} has no rows, so nothing was reported. List every criterion, story and requirement in scope with a state (${VERIFICATION_STATES.join(', ')}), an evidence tier and its evidence or reason; an item not checked is a row with the reason, never an omission.`));
  }

  for (const { heading } of STATE_SECTIONS) {
    for (const row of rowsOf(heading)) {
      const name = row.id === '' ? '(no id)' : row.id;
      const problems = [];
      if (!VERIFICATION_STATES.includes(row.state)) problems.push(`state ${JSON.stringify(row.state)} is not one of ${VERIFICATION_STATES.join(', ')}`);
      if (!EVIDENCE_TIERS.includes(row.tier)) problems.push(`tier ${JSON.stringify(row.tier)} is not one of ${EVIDENCE_TIERS.join(', ')}`);
      if (row.evidence === '') problems.push(row.state === 'proven' || row.state === 'failed' ? 'it has no evidence (the command and what it showed)' : 'it has no reason');
      if (heading === 'Validation' && row.state === 'proven' && row.tier !== 'human-confirmed') problems.push('a validation claim is proven only by a named human confirmation, so its tier must be human-confirmed');
      if (problems.length) findings.push(invalid(path, `${heading} row ${name} in ${path}: ${problems.join('; ')}.`));
      if (accepted && row.state === 'failed') findings.push(inconsistent(path, `${heading} row ${name} in ${path} is failed, but the verdict is accept. Record revise, or fix the failure and verify again.`));
    }
  }

  if (accepted) {
    if (conformance.length > 0 && !conformance.some((row) => row.state === 'proven')) {
      findings.push(inconsistent(path, `No Conformance row in ${path} is proven, but the verdict is accept. An unchecked or could-not-run item is never a pass: prove at least one item, or record revise or blocked.`));
    }
    for (const { field: key, allowed } of STATE_SECTIONS) {
      const value = field(key);
      if (allowed.includes(value) && value !== 'accept' && value !== 'not-assessed') findings.push(inconsistent(path, `${key} is ${value} in ${path}, but the verdict is accept. The overall verdict cannot be more favourable than either part.`));
    }
  }
  return findings;
}
