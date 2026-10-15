import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCardId, readCard } from '../lib/board.mjs';
import { CARD_FILES, cardFile } from '../lib/card-files.mjs';
import { WINDOWS_LAUNCHER_HINT } from '../lib/checks/boundary.mjs';
import { CONFIG_PATH, ConfigError, readConfig } from '../lib/config.mjs';
import { sha256Bytes } from '../lib/files.mjs';
import { freezeHashes, parseHeader } from '../lib/freeze.mjs';
import { readFrontmatter } from '../lib/frontmatter.mjs';
import { PacketError, buildPacket, readBriefText, validateReview } from '../lib/review-packet.mjs';
import {
  FALLBACK_LABEL,
  REVIEW_OUTPUT_MAX_BYTES,
  REVIEW_TIMEOUT_MS,
  ReviewerError,
  buildReviewPrompt,
  codexArgs,
  parseReviewMessageWithNotes,
  readReviewSettings,
  reviewerError,
  runReviewer,
} from '../lib/reviewer.mjs';
import { currentDiffSha256 } from '../lib/rounds.mjs';
import { localPacketFresh } from '../lib/local-docs-attestation.mjs';
import { resolveProjectRoots } from '../lib/project-roots.mjs';
import { scriptCommand } from '../lib/script-command.mjs';

/** @typedef {import('../lib/gate.mjs').GateOptions} GateOptions */
/** @typedef {import('../lib/review-schema.mjs').ValidReview} ValidReview */
/** @typedef {import('../lib/reviewer.mjs').ReviewRunner} ReviewRunner */
/** @typedef {{ kind: 'codex' | 'custom' | 'fallback', label: string, model?: string, effort?: string }} ReviewLabel */
/** @typedef {ValidReview & { reviewer: ReviewLabel, at: string, card: string, tier: string, packet_sha256: string, diff_sha256: string, dropped: Array<{ index: number, title: string, reason: string }> }} ReviewOutput */

const STDERR_LINES = 20;
/** The last path segment, with either separator. */
const baseName = (path) => String(path).split(/[\\/]/).pop();
/** The notice printed before the packet leaves, naming the program actually run. */
const openAiNotice = (program) => `running ${program}; expected to send the packet to OpenAI; set review.fallback_only to true in ${CONFIG_PATH} to keep it local`;

/**
 * The label for a reviewer command prefix: kind codex only when the last prefix element is codex (an .exe, .cmd or
 * .bat ending aside), otherwise custom with that element's name.
 * @param {string[]} reviewer
 * @param {{ model: string, effort: string }} pins
 * @returns {ReviewLabel}
 */
function commandLabel(reviewer, { model, effort }) {
  const name = baseName(reviewer.at(-1));
  const kind = /^codex(\.(exe|cmd|bat))?$/i.test(name) ? 'codex' : 'custom';
  return { kind, label: `${kind === 'codex' ? 'codex' : name} ${model} (${effort})`, model, effort };
}

const sha256 = (text) => sha256Bytes(Buffer.from(text, 'utf8'));
const tail = (text) => String(text).split(/\r?\n/).filter((line) => line.trim() !== '').slice(-STDERR_LINES).join('\n');

/** @returns {ReviewerError} */
function codexFailure({ settings, result, projectDir, id, platform }) {
  const command = settings.reviewer[0];
  const code = /** @type {any} */ (result.error)?.code;
  let reason;
  if (code === 'ETIMEDOUT') reason = `timed out after ${REVIEW_TIMEOUT_MS / 1000} s`;
  else if (code === 'ENOBUFS') reason = 'stderr passed 8 MiB, so the run was stopped';
  else if (result.error) reason = `could not start (${result.error.message})`;
  else if (result.status === null) reason = 'ended by a signal before it exited';
  else reason = `exited ${result.status}`;
  const hint = platform === 'win32' && (code === 'ENOENT' || code === 'EINVAL') ? ` On Windows, ${WINDOWS_LAUNCHER_HINT}.` : '';
  const stderr = tail(result.stderr);
  const next = settings.fallbackOnly
    ? `review.fallback_only is true, so only the fallback is allowed: ${scriptCommand(projectDir, 'review.mjs')} run ${projectDir} ${id} --fallback`
    : `For the labelled fallback reviewer run: ${scriptCommand(projectDir, 'review.mjs')} run ${projectDir} ${id} --fallback`;
  return reviewerError('review-codex-failed', `Codex (${command}) ${reason}.${hint}${stderr === '' ? '' : `\n${stderr}`}\n${next}`);
}

/** Reads the final message the run wrote; missing, empty or oversized is review-output-invalid. */
function readFinalMessage(outFile) {
  let size;
  try {
    size = statSync(outFile).size;
  } catch (cause) {
    if (cause.code === 'ENOENT') size = 0;
    else throw new Error(`Cannot read the Codex output file (${cause.message}).`, { cause });
  }
  if (size === 0) throw reviewerError('review-output-invalid', 'Codex wrote no final message. Run the review again, or use --fallback.');
  if (size > REVIEW_OUTPUT_MAX_BYTES) throw reviewerError('review-output-invalid', `The Codex final message is over the ${REVIEW_OUTPUT_MAX_BYTES} byte cap. Run the review again, or use --fallback.`);
  const text = readFileSync(outFile, 'utf8');
  if (text.trim() === '') throw reviewerError('review-output-invalid', 'Codex wrote no final message. Run the review again, or use --fallback.');
  return text;
}

/** Parses, validates and saves a review. */
function saveReview({ projectDir, id, text, label, tier, chain, packetSha, diffSha, now }) {
  const { value, repaired } = parseReviewMessageWithNotes(text);
  const { review, dropped, problems } = validateReview(value, { tier, chain });
  if (review === null) throw new ReviewerError('review-output-invalid', problems);
  /** @type {ReviewOutput} */
  const output = { ...review, reviewer: label, at: now.toISOString(), card: id, tier, packet_sha256: packetSha, diff_sha256: diffSha, dropped };
  const outputPath = cardFile(projectDir, id, CARD_FILES.reviewOutput);
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  return { label, outputPath, kept: review.findings.length, dropped: dropped.length, repaired };
}

/**
 * Runs the blind reviewer through Codex, or prepares the prompt for the labelled fallback. Never falls back on its own.
 * @param {string} projectDir
 * @param {string} id
 * @param {GateOptions & { fallback?: boolean, runner?: ReviewRunner, now?: Date, platform?: string, notify?: (message: string, label: string) => void }} [options]
 */
export function runReview(projectDir, id, options = {}) {
  const { fallback = false, runner = runReviewer, now = new Date(), platform = process.platform, notify, ...gateOptions } = options;
  const settings = readReviewSettings(readConfig(projectDir));
  const fallbackMode = fallback || settings.fallbackOnly;
  if (!fallbackMode && (settings.model === null || settings.effort === null)) codexArgs(settings, { workDir: '', outFile: '' }); // throws review-not-pinned before any packet is built

  const packet = buildPacket(projectDir, id, { ...gateOptions, now });
  const prompt = buildReviewPrompt(packet.text);

  if (fallbackMode) {
    const dir = mkdtempSync(join(tmpdir(), 'aperture-review-'));
    const promptPath = join(dir, 'review-prompt.md');
    writeFileSync(promptPath, prompt);
    return { mode: 'fallback', label: { kind: 'fallback', label: FALLBACK_LABEL }, promptPath, reason: fallback ? 'flag' : 'fallback-only' };
  }

  const root = mkdtempSync(join(tmpdir(), 'aperture-codex-'));
  try {
    const workDir = join(root, 'work');
    mkdirSync(workDir);
    const outFile = join(root, 'out.txt');
    const argv = [...settings.reviewer, ...codexArgs(settings, { workDir, outFile })];
    const label = commandLabel(settings.reviewer, /** @type {{ model: string, effort: string }} */ (settings));
    notify?.(openAiNotice(baseName(argv[0])), label.label);
    const result = runner(argv, { cwd: workDir, input: prompt, timeoutMs: REVIEW_TIMEOUT_MS });
    if (result.error || result.status !== 0) throw codexFailure({ settings, result, projectDir, id, platform });
    const text = readFinalMessage(outFile);
    const saved = saveReview({ projectDir, id, text, label, tier: packet.tier, chain: packet.chain, packetSha: packet.sha256, diffSha: packet.diff_sha256, now });
    return { mode: 'codex', ...saved };
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5 });
  }
}

/**
 * Saves a reply produced outside the wrapper. Anything recorded here is labelled fallback. Refuses when the packet on
 * disk was built for other criteria, another reviewer brief or another diff than the card has now.
 * @param {string} projectDir
 * @param {string} id
 * @param {string} text
 * @param {{ now?: Date }} [options]
 */
export function recordReview(projectDir, id, text, { now = new Date() } = {}) {
  const packetFile = cardFile(projectDir, id, CARD_FILES.packet);
  let packetText = null;
  if (packetFile !== null) {
    try {
      packetText = readFileSync(packetFile, 'utf8');
    } catch (cause) {
      if (cause.code !== 'ENOENT') throw new Error(`Cannot read ${packetFile} (${cause.message}).`, { cause });
    }
  }
  if (packetText === null) {
    throw reviewerError('review-no-packet', `Card ${id} has no ${CARD_FILES.packet}. Run ${scriptCommand(projectDir, 'review.mjs')} run ${projectDir} ${id} --fallback first.`);
  }
  const meta = readFrontmatter(packetText);
  const header = parseHeader(packetText);
  const card = readCard(projectDir, id);
  const fresh = freezeHashes(card, readBriefText(projectDir, id));
  const diff = currentDiffSha256(projectDir, card);
  const changed = [
    ...(header.criteria_sha256 === fresh.criteria_sha256 ? [] : ['criteria']),
    ...(header.brief_sha256 === fresh.brief_sha256 ? [] : ['reviewer brief']),
    ...(diff === null || header.diff_sha256 === diff ? [] : ['diff']),
    ...(resolveProjectRoots(projectDir).mode === 'local' && !localPacketFresh(projectDir, packetText) ? ['local documents'] : []),
  ];
  if (changed.length) {
    throw reviewerError(
      'review-output-stale',
      `${CARD_FILES.packet} was built before the ${changed.join(', ')} changed, so a reply to it reviews stale work. Run the review again: ${scriptCommand(projectDir, 'review.mjs')} run ${projectDir} ${id} --fallback, give the new prompt to a fresh reviewer, then record its reply.`,
    );
  }
  return saveReview({
    projectDir,
    id,
    text,
    label: { kind: 'fallback', label: FALLBACK_LABEL },
    tier: String(meta.tier),
    chain: { criteria: Number(meta.criteria_count), mustNots: Number(meta.must_not_count) },
    packetSha: sha256(packetText),
    diffSha: String(header.diff_sha256),
    now,
  });
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = 'Usage: node review.mjs run <projectDir> <cardId> [--fallback] [--base <ref>] | node review.mjs record <projectDir> <cardId> --from <file>';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const printRepair = (count) => {
    if (count > 0) console.log(`repaired ${count} invalid backslash escape${count === 1 ? '' : 's'} in the reply (each backslash was doubled)`);
  };
  const [command, ...args] = process.argv.slice(2);
  if (command !== 'run' && command !== 'record') usage(`Unknown subcommand ${command ?? '(none)'}.`);
  const allowed = command === 'run' ? ['--fallback', '--base'] : ['--from'];
  const positional = [];
  /** @type {{ fallback?: boolean, base?: string, from?: string }} */
  const given = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    if (!allowed.includes(arg)) usage(`Unknown option ${arg}.`);
    const key = arg.slice(2);
    if (given[key] !== undefined) usage(`${arg} given more than once.`);
    if (arg === '--fallback') {
      given.fallback = true;
    } else {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) usage(`${arg} requires a value.`);
      given[key] = value;
      i++;
    }
  }
  if (positional.length !== 2) usage('Expected a project directory and a card id.');
  const [dir, id] = positional;
  if (!isCardId(id)) usage(`"${id}" is not a card id (like 0001-some-title).`);
  if (command === 'record' && given.from === undefined) usage('--from requires a file.');
  const projectDir = resolve(dir);
  try {
    if (command === 'run') {
      let announced = false;
      const notify = (message, label) => {
        announced = true;
        console.log(`reviewer: ${label}`);
        console.log(message);
      };
      const result = runReview(projectDir, id, { notify, ...(given.fallback ? { fallback: true } : {}), ...(given.base === undefined ? {} : { base: given.base }) });
      if (!announced) console.log(`reviewer: ${result.label.label}`);
      if (result.mode === 'codex') {
        console.log(`review saved: ${result.outputPath}`);
        printRepair(result.repaired);
        console.log(`findings: ${result.kept} kept, ${result.dropped} dropped`);
      } else {
        console.log(result.reason === 'fallback-only' ? 'review.fallback_only is true: nothing is sent to OpenAI' : '--fallback given: nothing is sent to OpenAI');
        console.log(`prompt: ${result.promptPath}`);
        console.log(`Give the prompt to a fresh fallback reviewer, save its JSON reply, then run: ${scriptCommand(projectDir, 'review.mjs')} record ${projectDir} ${id} --from <file>`);
      }
    } else {
      let text;
      try {
        text = readFileSync(/** @type {string} */ (given.from), 'utf8');
      } catch (cause) {
        usage(`Cannot read ${given.from} (${cause.message}).`);
      }
      const result = recordReview(projectDir, id, /** @type {string} */ (text));
      console.log(`reviewer: ${result.label.label}`);
      console.log(`review saved: ${result.outputPath}`);
      printRepair(result.repaired);
      console.log(`findings: ${result.kept} kept, ${result.dropped} dropped`);
      console.log(`Next: ${scriptCommand(projectDir, 'rounds.mjs')} record ${projectDir} ${id}  (this review counts as a round only once it is recorded)`);
    }
  } catch (err) {
    if (err instanceof ReviewerError || err instanceof PacketError) {
      for (const f of err.findings) console.error(`${f.rule}: ${f.message}`);
      process.exit(1);
    }
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
}
