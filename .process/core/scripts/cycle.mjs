import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigError } from '../lib/config.mjs';
import { analyzeCycle } from '../lib/analyze.mjs';
import { CycleError, closeCycle, createCycle, cycleStatus, listCycles } from '../lib/cycle.mjs';
import { retroSuggestion } from '../lib/retro-suggestion.mjs';
import { describeShape, listKinds, proposeShape, recordStage } from '../lib/cycle-shape.mjs';
import { COLUMNS } from '../lib/layout.mjs';
import { PLACEMENTS, proposeCycle } from '../lib/posture.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE =
    'Usage: node cycle.mjs <projectDir> new <name> --goal <text> [--tier <tier>] [--stage <stage>] [--approvals <card|cycle|front>] [--verification-level <system|acceptance>] [--review-sweep <lens>] [--kind <kind>] [--set <dimension>=<value>]... | kinds | propose [--kind <kind>] [--set <dimension>=<value>]... | shape <name> | stage <name> <stage> <done|skipped|added|todo> [evidence or reason] | close <name> | status <name> | analyze <name> | list';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const humanColumn = (column) => column.replace(/^\d+_/, '').replaceAll('_', ' ');
  const [projectDir, command, ...rest] = process.argv.slice(2);
  if (!projectDir || projectDir.startsWith('--')) usage('Missing project directory.');
  if (!['new', 'close', 'status', 'analyze', 'list', 'shape', 'stage', 'kinds', 'propose'].includes(command)) usage(`Unknown command ${command ?? '(none)'}.`);
  const [name, ...flags] = ['list', 'kinds', 'propose'].includes(command) ? [undefined, ...rest] : rest;
  if (command === 'stage') {
    const [stageId, status, ...words] = flags;
    if (!name || !stageId || !status) usage('stage needs a cycle, a stage and done, skipped, added or todo.');
    try {
      recordStage(resolve(projectDir), name, stageId, status, words.join(' '));
      console.log(`cycle ${name}: ${stageId} ${status}`);
    } catch (err) {
      if (!(err instanceof CycleError || err instanceof ConfigError)) throw err;
      console.error(err.message);
      process.exit(1);
    }
    process.exit(0);
  }
  if (command === 'shape' && flags.length) usage(`shape takes only a cycle name, got ${flags[0]}.`);
  if (command === 'kinds' && flags.length) usage(`kinds takes no arguments, got ${flags[0]}.`);
  if (command === 'list' && flags.length) usage(`list takes no arguments, got ${flags[0]}.`);
  if (!['list', 'kinds', 'propose'].includes(command) && (!name || name.startsWith('--'))) usage('Missing cycle name.');
  const FLAGS = command === 'propose' ? ['--kind', '--set'] : command === 'new' ? ['--goal', '--tier', '--stage', '--approvals', '--verification-level', '--review-sweep', '--kind', '--set'] : [];
  const options = {};
  for (let i = 0; i < flags.length; i += 2) {
    const flag = flags[i];
    if (!FLAGS.includes(flag)) usage(`Unknown option ${flag}.`);
    const value = flags[i + 1];
    if (value === undefined || value.startsWith('--')) usage(`${flag} requires a value.`);
    if (flag === '--verification-level' || flag === '--review-sweep' || flag === '--set') (options[flag.slice(2)] ??= []).push(value);
    else options[flag.slice(2)] = value;
  }
  if (command === 'new') {
    for (const required of ['goal']) {
      if (options[required] === undefined) usage(`--${required} is required.`);
    }
    if (options.approvals !== undefined && !PLACEMENTS.includes(options.approvals)) {
      usage(`--approvals must be one of ${PLACEMENTS.join(', ')}.`);
    }
  }
  try {
    const dir = resolve(projectDir);
    if (command === 'new') {
      const c = createCycle(dir, { name, goal: options.goal, tier: options.tier, stage: options.stage, approvals: options.approvals, verificationLevels: options['verification-level'] ?? [], reviewSweeps: options['review-sweep'] ?? [], kind: options.kind, settings: options.set ?? [] });
      const proposal = proposeCycle(dir, c.stage);
      const tierSource = options.tier ? '--tier' : c.profile?.purpose !== undefined ? `profile purpose ${c.profile.purpose}` : `posture ${proposal.posture}`;
      const sources = options.tier || options.approvals || c.profile?.purpose !== undefined
        ? `tier ${tierSource}, approvals ${options.approvals ? '--approvals' : `posture ${proposal.posture}`}`
        : `posture ${proposal.posture}`;
      console.log(`created cycle ${c.name}: ${c.tier}, ${c.stage}, approvals ${c.approvals} (from ${sources})`);
      console.log(`verification levels: ${c.verification_levels.join(', ') || 'none'}; review sweeps: ${c.review_sweeps.join(', ') || 'none'} (cycle selection)`);
      if (c.kind !== undefined) console.log(`shape: kind ${c.kind}; the shape line is in CYCLE.md and stage lines appear only when something is recorded. See the stages with: shape ${c.name}`);
    } else if (command === 'kinds') {
      const { lines, findings } = listKinds(dir);
      for (const line of lines) console.log(line);
      for (const finding of findings) console.error(`kind data: ${finding}`);
      if (lines.length === 0) console.log('no kinds are installed; add the work-profile pack, or write your own in .process/kinds/');
    } else if (command === 'propose') {
      console.log(proposeShape(dir, { kind: options.kind, settings: options.set ?? [] }).join('\n'));
    } else if (command === 'shape') {
      console.log(describeShape(dir, name).join('\n'));
    } else if (command === 'close') {
      console.log(`closed cycle ${closeCycle(dir, name).name}`);
      console.log(retroSuggestion(dir, name));
    } else if (command === 'list') {
      for (const listed of listCycles(dir)) console.log(listed);
    } else if (command === 'analyze') {
      const findings = analyzeCycle(dir, name);
      if (findings.length) {
        for (const issue of findings) console.log(`${issue.rule}: ${issue.message}`);
        process.exitCode = 1;
      } else console.log(`analyze ${name}: clean`);
    } else {
      const { cycle, projectTier, counts, open, needed } = cycleStatus(dir, name);
      console.log(`cycle ${cycle.name}: ${cycle.status}`);
      console.log(`goal: ${cycle.goal}`);
      console.log(`tier: ${cycle.tier} (project ${projectTier})`);
      console.log(`stage: ${cycle.stage}`);
      console.log(`approvals: ${cycle.approvals}`);
      if (cycle.verification_levels.length) console.log(`verification levels: ${cycle.verification_levels.join(', ')}`);
      if (cycle.review_sweeps.length) console.log(`review sweeps: ${cycle.review_sweeps.join(', ')}`);
      console.log(`cards: ${COLUMNS.map((c) => `${humanColumn(c)} ${counts[c]}`).join(', ')}`);
      for (const { id, column } of open) console.log(`open: ${id} (${humanColumn(column)})`);
      for (const gap of needed) console.log(`still needed before close: ${gap.kind} ${gap.name} (${gap.problem})`);
    }
  } catch (err) {
    if (!(err instanceof CycleError || err instanceof ConfigError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}
