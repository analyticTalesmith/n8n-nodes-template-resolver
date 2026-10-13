import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, cardPath, readCard } from '../lib/board.mjs';
import { CycleError, readCycle } from '../lib/cycle.mjs';
import { CONCERNS } from '../lib/concerns.mjs';
import { DepthError, addInstruction, resolveDepth, setConcern, setTier } from '../lib/depth.mjs';
import { designApprovalState } from '../lib/design-approval.mjs';
import { readTierData } from '../lib/gate.mjs';
import { TEST_LEVELS } from '../lib/levels.mjs';
import { TierError, concernLabel, effectiveTier } from '../lib/tier.mjs';
import { scriptCommand } from '../lib/script-command.mjs';

const USAGE = [
  'Usage: node depth.mjs <projectDir> show <card|cycle> <id|name>',
  '       node depth.mjs <projectDir> tier <card|cycle> <id|name> <tier|inherit> [--note <text>]',
  '       node depth.mjs <projectDir> concern <card|cycle> <id|name> <concern> <tier|inherit> [--note <text>]',
  `       concerns: ${CONCERNS.join(', ')}`,
  '       node depth.mjs <projectDir> instruct <card|cycle> <id|name> <text>',
].join('\n');

/** The effective tier and the four levels of a card or cycle, as printable lines. */
function show(projectDir, target) {
  const { data } = readTierData(projectDir);
  let layer;
  let verificationLevels = [];
  let card;
  let cycleConcerns = null;
  /** @type {Record<string, string> | null} */
  let concernTiers = null;
  if (target.kind === 'card') {
    card = readCard(projectDir, target.id);
    layer = effectiveTier(projectDir, card);
    const cycleName = cardPath(projectDir, target.id)?.cycle ?? null;
    if (cycleName !== null) verificationLevels = readCycle(projectDir, cycleName).verification_levels;
    concernTiers = Object.fromEntries(CONCERNS.map((concern) => [concern, effectiveTier(projectDir, card, concern).tier]));
  } else {
    const cycle = readCycle(projectDir, target.name);
    layer = { tier: cycle.tier, source: 'cycle' };
    verificationLevels = cycle.verification_levels;
    cycleConcerns = cycle.concerns ?? {};
  }
  if (concernTiers === null) concernTiers = Object.fromEntries(CONCERNS.map((concern) => [concern, cycleConcerns?.[concern] ?? layer.tier]));
  const depthLayer = target.kind === 'card' ? effectiveTier(projectDir, card, 'test-depth') : { tier: concernTiers['test-depth'], source: layer.source };
  const { levels } = resolveDepth({ tierData: data, tier: depthLayer.tier, source: depthLayer.source, verificationLevels, card });
  const label = concernLabel(concernTiers, layer.tier);
  return [
    `tier: ${layer.tier} (${layer.source})`,
    ...(label === layer.tier ? [] : [`concerns: ${label}`]),
    ...TEST_LEVELS.map((level) => `${level}: ${levels[level].selected ? `selected (${levels[level].source})` : 'not selected'}`),
  ];
}

/**
 * Lines telling a person what a cycle tier change did to a signed design. Empty unless the cycle uses front approvals and
 * its signed design is now stale; one line when the approval state cannot be read. Never writes anything.
 * @returns {string[]}
 */
function approvalNotice(projectDir, name) {
  try {
    if (readCycle(projectDir, name).approvals !== 'front') return [];
    const { state, stale } = designApprovalState(projectDir, name);
    if (state !== 'stale') return [];
    return [
      `Design approval for cycle ${name} is now stale (changed: ${stale.join(', ')}). A person must re-approve it: ${scriptCommand(projectDir, 'approve-design.mjs')} ${projectDir} ${name} --by <name>`,
    ];
  } catch (err) {
    return [`The tier change is done, but the design approval state of cycle ${name} could not be read (${err.message}).`];
  }
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const usage = (message) => {
    console.error(`${message}\n${USAGE}`);
    process.exit(2);
  };
  const args = process.argv.slice(2);
  const at = args.indexOf('--note');
  let note;
  if (at !== -1) {
    if (!['tier', 'concern'].includes(args[1]) || at + 1 >= args.length) usage('--note takes text and belongs to the tier and concern subcommands.');
    note = args[at + 1];
    args.splice(at, 2);
  }
  const flag = args.find((a) => a.startsWith('--'));
  if (flag) usage(`Unknown option ${flag}.`);
  const [dir, command, kind, name, value, ...extra] = args;
  const takesValue = { show: false, tier: true, instruct: true, concern: true }[command];
  if (!dir || takesValue === undefined || !['card', 'cycle'].includes(kind) || !name || takesValue !== (value !== undefined) || extra.length !== (command === 'concern' ? 1 : 0)) {
    usage('Expected a project directory, a subcommand, a target and its arguments.');
  }
  const projectDir = resolve(dir);
  const target = kind === 'card' ? { kind: 'card', id: name } : { kind: 'cycle', name };
  try {
    if (command === 'show') console.log(show(projectDir, target).join('\n'));
    else if (command === 'concern') {
      setConcern(projectDir, target, value, extra[0], { note });
      console.log(`${kind} ${name}: ${value} ${extra[0]}`);
    } else if (command === 'tier') {
      setTier(projectDir, target, value, { note });
      console.log([`${kind} ${name}: tier ${value}`, ...(kind === 'cycle' ? approvalNotice(projectDir, name) : [])].join('\n'));
    } else console.log(addInstruction(projectDir, target, value));
  } catch (err) {
    if (err instanceof DepthError || err instanceof BoardError || err instanceof CycleError || err instanceof TierError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
