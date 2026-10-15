import { readFileSync } from 'node:fs';
import { CARD_FILES, cardFile } from '../card-files.mjs';
import { FREEZE_FIELDS, SCOPE_PARTS, changedFreezeFields, changedScopeParts, freezeHashes, validateFreeze } from '../freeze.mjs';
import { localDocsHashes, validLocalDocsHashes } from '../local-docs-attestation.mjs';
import { scriptCommand } from '../script-command.mjs';

/** @typedef {import('../card.mjs').Card} Card */
/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */

const RECOVERY = 'Restore the frozen value, or take the card back to shaping (card-move <id> shaping --reason <text>, allowed from in progress and from review), correct it and run freeze.mjs again.';

/**
 * Checks that the brief, manifest, criteria and scope still match the freeze record. Only an unreadable brief throws.
 * @param {{ projectDir: string, card: Card }} input
 * @returns {Finding[]}
 */
export function checkFrozen({ projectDir, card }) {
  const freeze = /** @type {any} */ (card).freeze;
  if (freeze === undefined) {
    if (card.type === 'bug') return [];
    return [
      {
        rule: 'freeze-missing',
        message: `Card ${card.id} was never frozen. Freeze it in shaping (${scriptCommand(projectDir, 'freeze.mjs')} <projectDir> ${card.id}) before building.`,
        path: 'freeze',
      },
    ];
  }
  const invalid = validateFreeze(freeze, projectDir);
  if (invalid.length) return invalid;
  const localHashes = localDocsHashes(projectDir, Array.isArray(card.docs_impact) ? card.docs_impact : []);
  if (localHashes !== null && (!validLocalDocsHashes(freeze.local_docs_sha256) || !validLocalDocsHashes(freeze.local_living_sha256))) {
    return [{ rule: 'unverifiable-local-docs', message: 'The freeze record has no valid local document baseline. Return the card to shaping and freeze it again before review.', path: 'freeze.local_docs_sha256' }];
  }

  const file = cardFile(projectDir, card.id, CARD_FILES.reviewerBrief);
  let text = null;
  if (file !== null) {
    try {
      text = readFileSync(file, 'utf8');
    } catch (cause) {
      if (cause.code !== 'ENOENT') {
        throw new Error(`Cannot read the reviewer brief at ${file} (${cause.message}). Repair or replace it.`, { cause });
      }
    }
  }

  const current = freezeHashes(card, text ?? '');
  const changed = changedFreezeFields(freeze, current);
  /** @type {Finding[]} */
  const findings = [];
  if (freeze[FREEZE_FIELDS.scope] === undefined) {
    findings.push({
      rule: 'freeze-stale',
      message: `The freeze record has no ${FREEZE_FIELDS.scope}, so it predates locking ${SCOPE_PARTS.join(', ')}. Re-freeze in shaping: take the card back through review to shaping and run ${scriptCommand(projectDir, 'freeze.mjs')} <projectDir> ${card.id}.`,
      path: 'freeze',
    });
  }
  if (text === null) {
    findings.push({
      rule: 'frozen-brief-changed',
      message: `The frozen reviewer brief was deleted. ${RECOVERY}`,
      path: CARD_FILES.reviewerBrief,
    });
  } else if (changed.includes('brief')) {
    findings.push({
      rule: 'frozen-brief-changed',
      message: `The reviewer brief changed after the freeze. ${RECOVERY}`,
      path: CARD_FILES.reviewerBrief,
    });
  }
  if (changed.includes('manifest')) {
    findings.push({
      rule: 'frozen-manifest-changed',
      message: `The manifest changed after the freeze. ${RECOVERY}`,
      path: 'manifest',
    });
  }
  if (changed.includes('criteria')) {
    findings.push({
      rule: 'frozen-criteria-changed',
      message: `The criteria text or verify type changed after the freeze (evidence and status may change freely). ${RECOVERY}`,
      path: 'criteria',
    });
  }
  if (freeze.scope_sha256 !== undefined && changed.includes('scope')) {
    const parts = changedScopeParts(freeze, current);
    findings.push({
      rule: 'frozen-scope-changed',
      message: `The ${parts.join(', ')} changed after the freeze. Revert it in card.json, or take the card back to shaping through review and re-freeze it there.`,
      path: parts[0],
    });
  }
  return findings;
}
