import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, cardPath, isCardId, readCard, writeCard } from '../lib/board.mjs';
import { CARD_FILES, cardFile } from '../lib/card-files.mjs';
import { designContextPaths, designContextProblem } from '../lib/checks/reviewer-brief.mjs';
import { approvedDesignPaths, designApprovalProblemOfCard } from '../lib/design-approval.mjs';
import { FreezeError, changedFreezeFields, freezeHashes, validateFreeze } from '../lib/freeze.mjs';
import { amendCriteria, amendManifest } from '../lib/freeze-amend.mjs';
import { localDocsHashes, localLivingHashes } from '../lib/local-docs-attestation.mjs';
import { localCharterHashes } from '../lib/local-charters.mjs';
import { AMENDABLE, CARD_JSON, CARD_MD, STAGE, humanColumn } from '../lib/layout.mjs';
import { scriptCommand } from '../lib/script-command.mjs';

/** @typedef {import('../lib/card.mjs').Card} Card */

export { FreezeError, amendCriteria, amendManifest };

/**
 * Records the hashes of the reviewer brief, manifest, criteria and scope (files_scope, docs_impact, docs_deferred, gate) in
 * card.json and marks the manifest frozen.
 * Works only on a card in shaping and replaces any earlier record.
 * @param {string} projectDir
 * @param {string} id
 * @param {{ now?: Date }} [options]
 * @returns {Card}
 */
export function freezeCard(projectDir, id, options = {}) {
  const card = readCard(projectDir, id);
  const { column } = cardPath(projectDir, id);
  if (column !== STAGE.shaping) {
    throw new FreezeError(
      'freeze-not-shaping',
      `Card ${id} is in ${humanColumn(column)}; only a card in shaping can be frozen. Move it back to shaping first.`,
    );
  }
  let briefText = '';
  try {
    briefText = readFileSync(cardFile(projectDir, id, CARD_FILES.reviewerBrief), 'utf8');
  } catch (cause) {
    if (cause.code !== 'ENOENT') throw cause;
  }
  if (briefText.trim() === '') {
    throw new FreezeError(
      'freeze-brief-missing',
      `Card ${id} has no reviewer brief. Write ${CARD_FILES.reviewerBrief} in the card folder, then freeze.`,
    );
  }
  const localHashes = localDocsHashes(projectDir, Array.isArray(card.docs_impact) ? card.docs_impact : []);
  const livingHashes = localLivingHashes(projectDir);
  const charterHashes = localCharterHashes(projectDir);
  const frozen = {
    ...card,
    manifest: { ...card.manifest, frozen: true },
    freeze: { at: (options.now ?? new Date()).toISOString(), ...freezeHashes(card, briefText),
      ...(localHashes === null ? {} : { local_docs_sha256: localHashes, local_living_sha256: livingHashes, local_charters_sha256: charterHashes }) },
  };
  writeCard(projectDir, id, frozen);
  return frozen;
}

/**
 * Re-freezes only the brief hash of a card in progress or in review, for a change confined to the brief's Design
 * context section: the manifest, criteria and scope must still match the record, and the brief with that section removed
 * must match the hash stored at the freeze. The change is appended to `freeze.brief_amendments` with the reason.
 * Does not run the red evidence check and moves nothing.
 * @param {string} projectDir
 * @param {string} id
 * @param {string} reason
 * @param {{ now?: Date }} [options]
 * @returns {Card}
 */
export function amendBrief(projectDir, id, reason, options = {}) {
  const card = readCard(projectDir, id);
  const { column } = cardPath(projectDir, id);
  const toShaping = `Take the card back to shaping (${scriptCommand(projectDir, 'card-move.mjs')} <projectDir> ${id} shaping --reason <text>), edit there and run ${scriptCommand(projectDir, 'freeze.mjs')} <projectDir> ${id}.`;
  if (!AMENDABLE.includes(column)) {
    throw new FreezeError('freeze-wrong-column', `Card ${id} is in ${humanColumn(column)}; a brief-only re-freeze works only on a card in progress or in review. In shaping run ${scriptCommand(projectDir, 'freeze.mjs')} <projectDir> ${id}; from ready, gate or done go back to shaping first.`);
  }
  if (String(reason).trim() === '') {
    throw new FreezeError('freeze-reason-missing', 'A brief-only re-freeze needs a reason. Pass --reason <text> saying what changed in the Design context list and why.');
  }
  const freeze = /** @type {any} */ (card).freeze;
  if (freeze === undefined || validateFreeze(freeze).length > 0) {
    throw new FreezeError('freeze-not-frozen', `Card ${id} has no valid freeze record to amend. ${toShaping}`);
  }
  if (freeze.brief_core_sha256 === undefined) {
    throw new FreezeError('freeze-record-old', `The freeze record of card ${id} predates the brief core hash, so a brief-only re-freeze cannot prove that only the Design context changed. ${toShaping}`);
  }
  const briefText = readFileSync(cardFile(projectDir, id, CARD_FILES.reviewerBrief), 'utf8');
  const current = freezeHashes(card, briefText);
  const changed = changedFreezeFields(freeze, current).filter((name) => name !== 'brief');
  if (changed.length > 0) {
    throw new FreezeError('freeze-changed-beyond-brief', `The ${changed.join(', ')} changed after the freeze, which a brief-only re-freeze does not cover. ${toShaping}`);
  }
  if (current.brief_core_sha256 !== freeze.brief_core_sha256) {
    throw new FreezeError('freeze-brief-outside-design-context', `The reviewer brief of card ${id} changed outside its Design context section, and the objective, questions and rubric stay locked after the freeze. Restore them, or ${toShaping.charAt(0).toLowerCase()}${toShaping.slice(1)}`);
  }
  if (current.brief_sha256 === freeze.brief_sha256) {
    throw new FreezeError('freeze-brief-unchanged', `The reviewer brief of card ${id} already matches its freeze record; there is nothing to amend.`);
  }
  const approved = approvedDesignPaths(projectDir, id);
  const approvalProblem = designApprovalProblemOfCard(projectDir, id);
  const forbidden = designContextPaths(briefText).flatMap((path) => designContextProblem(path, approved, approvalProblem) ?? []);
  if (forbidden.length > 0) {
    throw new FreezeError(forbidden[0].rule, `${forbidden.map((f) => f.message).join(' ')} Fix the Design context list, then run this again.`);
  }
  const entry = { at: (options.now ?? new Date()).toISOString(), reason: String(reason).trim(), from_sha256: freeze.brief_sha256, to_sha256: current.brief_sha256 };
  const amended = { ...card, freeze: { ...freeze, brief_sha256: current.brief_sha256, brief_amendments: [...(freeze.brief_amendments ?? []), entry] } };
  writeCard(projectDir, id, amended);
  return amended;
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE =
    'Usage: node freeze.mjs <projectDir> <cardId> [--brief-only --reason <text>] | [--amend-manifest --reason <text> [--add <path>] [--edit <path>] [--remove <path>] [--drop <path>] [--scope <folder>] [--unscope <folder>] [--blast-radius <module>] [--by <name>]] | [--amend-criteria --reason <text> --criterion <text> --verify <type> [--level <level>] [--type <contract|constraint>] [--by <name>]] (each path option may be repeated)';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const FLAGS = new Set(['--brief-only', '--amend-manifest', '--amend-criteria']);
  const LIST_OPTIONS = { '--add': 'add', '--edit': 'edit', '--remove': 'remove', '--drop': 'drop', '--scope': 'scope', '--unscope': 'unscope', '--blast-radius': 'blast_radius' };
  const SINGLE_OPTIONS = ['--reason', '--by', '--criterion', '--verify', '--level', '--type'];
  const args = process.argv.slice(2);
  const flags = new Set();
  const singles = {};
  const changes = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (FLAGS.has(arg)) {
      flags.add(arg);
    } else if (arg in LIST_OPTIONS || SINGLE_OPTIONS.includes(arg)) {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) usage(`${arg} requires a value.`);
      if (arg in LIST_OPTIONS) {
        (changes[LIST_OPTIONS[arg]] ??= []).push(value);
      } else {
        if (singles[arg] !== undefined) usage(`${arg} given more than once.`);
        singles[arg] = value;
      }
      i++;
    } else if (arg.startsWith('--')) {
      usage(`Unknown option ${arg}.`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 2) usage('Expected a project directory and a card id.');
  if (flags.size > 1) usage('Give only one of --brief-only, --amend-manifest and --amend-criteria.');
  const mode = [...flags][0];
  const reason = singles['--reason'];
  if (mode === undefined && (reason !== undefined || Object.keys(changes).length > 0 || Object.keys(singles).length > 0)) {
    usage('--reason and the amendment options belong with --brief-only, --amend-manifest or --amend-criteria.');
  }
  if (mode !== undefined && reason === undefined) usage(`${mode} needs --reason <text>.`);
  if (mode === '--amend-criteria' && (singles['--criterion'] === undefined || singles['--verify'] === undefined)) usage('--amend-criteria needs --criterion <text> and --verify <type>.');
  if (mode !== '--amend-criteria' && ['--criterion', '--verify', '--level', '--type'].some((name) => singles[name] !== undefined)) usage('--criterion, --verify, --level and --type belong with --amend-criteria.');
  if (mode !== '--amend-manifest' && Object.keys(changes).length > 0) usage('--add, --edit, --remove, --drop, --scope, --unscope and --blast-radius belong with --amend-manifest.');
  if (mode !== '--amend-manifest' && mode !== '--amend-criteria' && singles['--by'] !== undefined) usage('--by belongs with an amendment.');
  const [projectDir, id] = positional;
  if (!isCardId(id)) usage(`"${id}" is not a card id (like 0001-some-title).`);
  const root = resolve(projectDir);
  try {
    if (mode === '--brief-only') {
      const card = amendBrief(root, id, /** @type {string} */ (reason));
      console.log(`re-froze the brief of ${id} at ${card.freeze.brief_amendments.at(-1).at}`);
    } else if (mode === '--amend-manifest') {
      const card = amendManifest(root, id, /** @type {string} */ (reason), changes, { by: singles['--by'] });
      console.log(`amended the manifest of ${id} at ${card.manifest_amendments.at(-1).at}; the review packet shows it as a deviation from the frozen plan. ${CARD_MD}'s scope table was rewritten from ${CARD_JSON}.`);
    } else if (mode === '--amend-criteria') {
      const card = amendCriteria(root, id, /** @type {string} */ (reason), [{ text: singles['--criterion'], verify: singles['--verify'], ...(singles['--level'] === undefined ? {} : { level: singles['--level'] }) }], { by: singles['--by'], type: singles['--type'] });
      const { at, files } = card.criteria_amendments.at(-1);
      const left = [[CARD_MD, `Must-haves in ${CARD_MD}`], [CARD_FILES.spec, 'Acceptance criteria in spec.md'], [CARD_FILES.reviewerBrief, `Rubric in ${CARD_FILES.reviewerBrief}`]]
        .filter(([name]) => !files.some((file) => file.endsWith(`/${name}`) || file === name)).map(([, what]) => `add the line to ${what}`);
      if (singles['--verify'] === 'test') left.push('give it a test row');
      console.log(`added a criterion to ${id} at ${at}; wrote ${files.join(', ') || 'no file'}.${left.length ? ` Left for the lead: ${left.join('; ')}.` : ''}`);
    } else {
      const card = freezeCard(root, id);
      console.log(`frozen ${id} at ${card.freeze.at}`);
    }
  } catch (err) {
    if (err instanceof FreezeError) {
      console.error(`${err.rule}: ${err.message}`);
      process.exit(1);
    }
    if (err instanceof BoardError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
