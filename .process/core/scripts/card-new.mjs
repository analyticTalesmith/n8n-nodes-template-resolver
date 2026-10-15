import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { toLf, toPosix } from '../lib/files.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError, cardExists, cardFolder, nextCardId, readCard, siblingIds } from '../lib/board.mjs';
import { cardIdPrefix, isAgentCode } from '../lib/card-id.mjs';
import { CARD_TYPES, VERIFY_TYPES, newCard } from '../lib/card.mjs';
import { applyScopeBlock } from '../lib/card-scope.mjs';
import { generateBrief } from '../lib/checks/reviewer-brief.mjs';
import { CycleError, readCycle } from '../lib/cycle.mjs';
import { planIndexes } from '../lib/index-docs.mjs';
import { CARD_JSON, CARD_MD, CONTEXT_MD, LIVING_DIR, STAGE, TIERS } from '../lib/layout.mjs';
import { resolveProjectPath, resolveProjectRoots } from '../lib/project-roots.mjs';
import { lighterCycleOf } from '../lib/shapes.mjs';

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const PERMISSIONS = ['add', 'edit', 'remove'];
const TESTING_GUIDE = `${LIVING_DIR}/testing.md`;

/**
 * Creates the project's testing guide, TESTING_GUIDE, from core/templates/testing-guide.md when the project has
 * none, and lists it in the living index. Never overwrites a guide and never fails the caller (a failure is a warning on stderr): the guide is guidance.
 * @param {string} projectDir
 * @param {{ dataRoot?: string }} [options]
 * @returns {boolean} whether it wrote the guide
 */
export function ensureTestingGuide(projectDir, { dataRoot } = {}) {
  try {
    const roots = resolveProjectRoots(projectDir, { dataRoot });
    const file = resolveProjectPath(roots, TESTING_GUIDE);
    if (existsSync(file)) return false;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, toLf(readFileSync(join(TEMPLATES, 'testing-guide.md'), 'utf8')), { flag: 'wx' });
    for (const plan of planIndexes(projectDir).filter((entry) => entry.path === `${LIVING_DIR}/INDEX.md`)) {
      if (plan.text !== plan.current) writeFileSync(resolveProjectPath(roots, plan.path), plan.text);
    }
    return true;
  } catch (cause) {
    process.stderr.write(`warning: could not create ${TESTING_GUIDE} (${cause.message}); the leads read it, so add it from core/templates/testing-guide.md.
`);
    return false;
  }
}
const DEFAULT_INTERFACE = 'none: the form names no public surface; the change stays inside the files listed in Scope.';

/** A ticket template (card.md or context.md) with its {{title}} filled in, read with LF line ends. */
function fromTemplate(name, title) {
  return toLf(readFileSync(join(TEMPLATES, name), 'utf8')).replace('{{title}}', () => title);
}

/**
 * Reads and checks a short card form: a JSON file with title, goal, criteria (id, text, verify), writes (path,
 * permission) and optionally type, interface, must_nots, links, blast_radius and gate. core/templates/card-form.json
 * is a filled example.
 * @param {string} file
 * @returns {{ title: string, type: string, goal: string, criteria: Array<{ id: string, text: string, verify: string }>, writes: Array<{ path: string, permission: string }>, interface: string, mustNots: string[], links: Array<{ label: string, target: string }>, blastRadius: string[], gate: string[] | null }}
 */
export function readCardForm(file) {
  let form;
  try {
    form = JSON.parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    throw new BoardError(cause.code === 'ENOENT' ? `The card form ${file} does not exist.` : `The card form ${file} is not valid JSON (${cause.message}).`, { cause });
  }
  const refuse = (problem) => {
    throw new BoardError(`The card form ${file} ${problem} See core/templates/card-form.json for a filled example.`);
  };
  const text = (value) => typeof value === 'string' && value.trim() !== '';
  const list = (value) => (Array.isArray(value) ? value : []);
  if (form === null || typeof form !== 'object' || Array.isArray(form)) refuse('must be a JSON object.');
  if (!text(form.title)) refuse('needs a title.');
  const type = form.type ?? 'improvement';
  if (!CARD_TYPES.includes(type)) refuse(`has the type "${type}". Use one of: ${CARD_TYPES.join(', ')}.`);
  if (!text(form.goal)) refuse('needs a one-line goal.');
  if (list(form.criteria).length === 0) refuse('needs at least one criterion (id, text, verify).');
  list(form.criteria).forEach((criterion, index) => {
    if (!text(criterion?.id) || /\s/.test(criterion.id)) refuse(`has criterion ${index} with no id (one word, such as raw-01).`);
    if (!text(criterion.text)) refuse(`has criterion ${criterion.id} with no text.`);
    if (!VERIFY_TYPES.includes(criterion.verify)) refuse(`has criterion ${criterion.id} with the verify type "${criterion.verify}". Use one of: ${VERIFY_TYPES.join(', ')}.`);
  });
  if (list(form.writes).length === 0) refuse('needs at least one write (path, permission).');
  list(form.writes).forEach((write, index) => {
    if (!text(write?.path)) refuse(`has write ${index} with no path.`);
    if (!PERMISSIONS.includes(write.permission)) refuse(`has the write permission "${write.permission}" for ${write.path}. Use one of: ${PERMISSIONS.join(', ')}.`);
  });
  const gate = form.gate ?? null;
  if (gate !== null && (!Array.isArray(gate) || gate.length === 0 || !gate.every(text))) refuse('has a gate that is not an argv (a list of strings such as ["node", "--test", "x.test.mjs"]).');
  for (const key of ['must_nots', 'blast_radius']) if (form[key] !== undefined && !(Array.isArray(form[key]) && form[key].every(text))) refuse(`has ${key} that is not a list of strings.`);
  if (form.links !== undefined && !(Array.isArray(form.links) && form.links.every((link) => text(link?.label) && text(link?.target)))) refuse('has links that are not a list of { label, target } with a path relative to the card folder.');
  return {
    title: form.title.trim(),
    type,
    goal: form.goal.trim(),
    criteria: form.criteria.map(({ id, text: body, verify }) => ({ id, text: body.trim(), verify })),
    writes: form.writes.map(({ path, permission }) => ({ path: toPosix(path, { trim: true }), permission })),
    interface: text(form.interface) ? form.interface.trim() : DEFAULT_INTERFACE,
    mustNots: form.must_nots ?? [],
    links: form.links ?? [],
    blastRadius: form.blast_radius?.length > 0 ? form.blast_radius : ['none'],
    gate,
  };
}

/** Replaces the body of one level-2 section of a card.md template. */
const withSection = (text, name, body) => text.replace(new RegExp(`(^## ${name}\\n\\n)[\\s\\S]*?(?=\\n## |(?![\\s\\S]))`, 'm'), (_, heading) => `${heading}${body}\n`);

/** A card.md from the template with the form's goal, typed criteria, must-nots, links and interface filled in; the criteria are listed again under Acceptance criteria, which is the folded spec of a one-card feature. */
function cardTextFromForm(form) {
  let text = fromTemplate(CARD_MD, form.title);
  text = withSection(text, 'Goal and why', form.goal);
  text = withSection(text, 'Must-haves', form.criteria.map(({ id, text: body }) => `- \`contract\` \`${id}\` ${body}`).join('\n'));
  text = text.replace('\n## Must-nots', () => `\n## Acceptance criteria\n\n${form.criteria.map(({ id, text: body }) => `- ${id}: ${body}`).join('\n')}\n\n## Must-nots`);
  if (form.mustNots.length > 0) text = withSection(text, 'Must-nots', form.mustNots.map((item) => `- ${item}`).join('\n'));
  if (form.links.length > 0) text = withSection(text, 'Context links', form.links.map(({ label, target }) => `- [${label}](${target})`).join('\n'));
  return withSection(text, 'Interface contract', form.interface);
}

/**
 * Creates a card in the first column of an open cycle, or in the global backlog when no cycle is given. Everything
 * is checked before anything is written.
 * @param {string} projectDir
 * card.md and context.md are written first (from core/templates) and card.json last: a folder without card.json is not a card, so card.json is
 * the commit point. If anything fails after the folder exists, the folder is removed again.
 * @param {{ title: string, type: string, cycle?: string, origin?: string | null, tier?: string, parent?: string, dependsOn?: string[], agent?: string }} init
 *   origin is where the card came from (a cycle name or null); it defaults to the cycle the card is created in, or null;
 *   agent is the agent code (one or two lowercase letters, default a) that owns the id counter
 * @param {{ writeFile?: typeof writeFileSync, now?: Date, swarm?: string }} [io] replaceable file writer, clock and already-derived swarm id, for tests
 * @returns {import('../lib/card.mjs').Card}
 */
export function createCard(projectDir, { title, type, cycle, origin = cycle ?? null, tier, parent, dependsOn = [], form, agent }, { writeFile = writeFileSync, dataRoot, now, swarm } = {}) {
  if (form !== undefined) ({ title, type } = form);
  if (!CARD_TYPES.includes(type)) {
    throw new BoardError(`Unknown card type "${type}". Use one of: ${CARD_TYPES.join(', ')}.`);
  }
  if (tier !== undefined && !TIERS.includes(tier)) {
    throw new BoardError(`Unknown card tier "${tier}". Use one of: ${TIERS.join(', ')}.`);
  }
  if (origin !== null && (typeof origin !== 'string' || origin === '')) {
    throw new BoardError(`A card origin is a non-empty string or null, not ${JSON.stringify(origin)}.`);
  }
  for (const id of [...(parent ? [parent] : []), ...dependsOn]) {
    if (!cardExists(projectDir, id, { dataRoot })) {
      throw new BoardError(`Card ${id} does not exist on the board or in the archive. Create it first or fix the id.`);
    }
  }
  if (cycle !== undefined) {
    let existing;
    try {
      existing = readCycle(projectDir, cycle);
    } catch (cause) {
      if (!(cause instanceof CycleError)) throw cause;
      throw new BoardError(`Cycle ${cycle} cannot take the card: ${cause.message}`, { cause });
    }
    if (existing.status !== 'open') {
      throw new BoardError(`Cycle ${cycle} is closed, so it takes no new cards. Pick an open cycle, or leave --cycle out to file the card in the global backlog.`);
    }
  }
  const id = nextCardId(projectDir, title, { dataRoot, agent, now, swarm });
  const card = newCard({ id, title, type });
  card.parent = parent ?? null;
  card.depends_on = [...dependsOn];
  card.origin = origin;
  card.tier = tier ?? null;
  if (form !== undefined) {
    card.criteria = form.criteria.map(({ id: criterion, text, verify }) => ({ text: `${criterion}: ${text}`, verify, evidence: null, status: 'pending' }));
    for (const permission of PERMISSIONS) card.manifest[permission] = form.writes.filter((write) => write.permission === permission).map((write) => write.path);
    card.files_scope = [...new Set(form.writes.map((write) => write.path))];
    card.blast_radius = form.blastRadius;
    card.gate = form.gate;
  }

  const dir = cardFolder(projectDir, cycle ?? null, STAGE.backlog, id, { dataRoot });
  mkdirSync(dirname(dir), { recursive: true });
  try {
    mkdirSync(dir);
  } catch (cause) {
    if (cause.code === 'EEXIST') {
      throw new BoardError(`${id} already exists at ${dir}, probably created at the same moment. Run the command again.`, {
        cause,
      });
    }
    throw cause;
  }
  try {
    const rivals = siblingIds(projectDir, id, { dataRoot });
    if (rivals.length) {
      throw new BoardError(
        `Another card with the id prefix ${cardIdPrefix(id)} (${rivals.join(', ')}) appeared at the same moment, so ${id} was not created. Run the command again.`,
      );
    }
    writeFile(join(dir, CARD_MD), applyScopeBlock(form === undefined ? fromTemplate(CARD_MD, title) : cardTextFromForm(form), card).text);
    writeFile(join(dir, CONTEXT_MD), fromTemplate(CONTEXT_MD, title));
    writeFile(join(dir, CARD_JSON), JSON.stringify(card, null, 2) + '\n');
    const brief = form !== undefined && lighterCycleOf(projectDir, id) !== null ? generateBrief(projectDir, id) : null;
    if (brief !== null) writeFile(join(dir, 'reviewer-brief.md'), brief);
  } catch (cause) {
    rmSync(dir, { recursive: true, force: true });
    if (cause instanceof BoardError) throw cause;
    throw new BoardError(`Could not create ${id} (${cause.message}). Nothing was kept; run the command again.`, { cause });
  }
  ensureTestingGuide(projectDir, { dataRoot });
  return card;
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
    'Usage: node card-new.mjs <projectDir> (--title <title> --type <type> | --from-form <file>) [--cycle <name> | --origin <cycle>] [--tier <tier>] [--parent <id>] [--depends-on <id>]... [--agent <letters> | --from-card <id>] (--agent is the agent code, one or two lowercase letters, default a; --from-card takes the agent from claim.agent on that card and --agent wins; the form file carries the title, type, goal, criteria and writes: see core/templates/card-form.json)';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const [projectDir, ...args] = process.argv.slice(2);
  if (!projectDir || projectDir.startsWith('--')) usage('Missing project directory.');
  const FLAGS = ['--title', '--type', '--from-form', '--cycle', '--origin', '--tier', '--parent', '--depends-on', '--agent', '--from-card'];
  const options = { dependsOn: [] };
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!FLAGS.includes(flag)) usage(`Unknown option ${flag}.`);
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) usage(`${flag} requires a value.`);
    if (flag === '--depends-on') options.dependsOn.push(value);
    else options[flag === '--from-form' ? 'fromForm' : flag === '--from-card' ? 'fromCard' : flag.slice(2)] = value;
  }
  if (options.fromForm !== undefined && (options.title !== undefined || options.type !== undefined)) usage('--from-form carries the title and type, so leave --title and --type out.');
  if (options.fromForm === undefined && options.title === undefined) usage('--title is required.');
  if (options.fromForm === undefined && options.type === undefined) usage('--type is required.');
  if (options.cycle !== undefined && options.origin !== undefined) {
    usage('Give one of --cycle or --origin: --cycle files the card in that cycle, --origin files it in the global backlog noting the cycle it came from.');
  }
  if (options.agent !== undefined && !isAgentCode(options.agent)) usage(`--agent ${JSON.stringify(options.agent)} is not an agent code: use one or two lowercase letters.`);
  try {
    // Checked here, not in createCard: its other callers pass origins of their own.
    if (options.origin !== undefined) {
      try {
        readCycle(projectDir, options.origin);
      } catch (cause) {
        if (!(cause instanceof CycleError)) throw cause;
        throw new BoardError(`--origin ${options.origin} names no usable cycle: ${cause.message}`, { cause });
      }
    }
    const { fromForm, fromCard, ...init } = options;
    if (init.agent === undefined && fromCard !== undefined) {
      const held = readCard(projectDir, fromCard).claim?.agent;
      if (held !== undefined) init.agent = held;
    }
    console.log(createCard(projectDir, fromForm === undefined ? init : { ...init, form: readCardForm(fromForm) }).id);
  } catch (err) {
    if (!(err instanceof BoardError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}
