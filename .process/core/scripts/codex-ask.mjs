import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WINDOWS_LAUNCHER_HINT } from '../lib/checks/boundary.mjs';
import { ALLOW_SECRET_MARKER, checkSecrets } from '../lib/checks/secrets.mjs';
import { ConfigError, readConfig } from '../lib/config.mjs';
import { REVIEW_OUTPUT_MAX_BYTES, REVIEW_TIMEOUT_MS, ReviewerError, codexArgs, readReviewSettings, runReviewer } from '../lib/reviewer.mjs';

/** @typedef {import('./validate.mjs').Finding} Finding */
/** @typedef {import('../lib/reviewer.mjs').ReviewRunner} ReviewRunner */

export const ASK_PREAMBLE = 'Run no commands and read no files: everything you may use is in this prompt. Follow the instructions below, then answer the brief in Markdown.';
export const ASK_PROMPT_MAX_BYTES = 409600;
export const ASK_PURPOSES = Object.freeze(['claim-check']);

const STDERR_LINES = 20;
const baseName = (path) => String(path).split(/[\\/]/).pop();
const tail = (text) => String(text).split(/\r?\n/).filter((line) => line.trim() !== '').slice(-STDERR_LINES).join('\n');

export class AskError extends Error {
  /**
   * @param {'ask-refused' | 'ask-failed'} rule
   * @param {'fallback-only' | 'not-opted-in' | 'input' | 'secret' | 'codex' | 'output'} detail
   * @param {Finding[]} findings
   */
  constructor(rule, detail, findings) {
    super(findings.map((f) => `${f.rule}: ${f.message}`).join('\n'));
    this.name = 'AskError';
    this.rule = rule;
    this.detail = detail;
    this.findings = findings;
  }
}

const askError = (rule, detail, message) => new AskError(rule, detail, [{ rule, message }]);

/**
 * Drops a leading `---` block (a byte order mark and CRLF tolerated); text without one is returned unchanged.
 * @param {string} text
 * @returns {string}
 */
export function stripFrontmatter(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0] !== '---') return text;
  const end = lines.indexOf('---', 1);
  return end === -1 ? text : lines.slice(end + 1).join('\n');
}

/** Reads the answer the run wrote; missing, empty or oversized is ask-failed detail output. */
function readAnswer(outFile) {
  let size;
  try {
    size = statSync(outFile).size;
  } catch (cause) {
    if (cause.code === 'ENOENT') size = 0;
    else throw new Error(`Cannot read the Codex output file (${cause.message}).`, { cause });
  }
  if (size === 0) throw askError('ask-failed', 'output', 'Codex wrote no answer. Ask again.');
  if (size > REVIEW_OUTPUT_MAX_BYTES) throw askError('ask-failed', 'output', `The Codex answer is over the ${REVIEW_OUTPUT_MAX_BYTES} byte cap. Ask again with a narrower brief.`);
  const text = readFileSync(outFile, 'utf8');
  if (text.trim() === '') throw askError('ask-failed', 'output', 'Codex wrote no answer. Ask again.');
  return text;
}

/**
 * A blind Codex run: the prompt is all it sees (empty working directory, tools disabled). Tells the user through
 * `notify` before anything is sent; never falls back on its own.
 * @param {string} projectDir
 * @param {{ instructions: string, brief: string, purpose?: 'claim-check' }} input
 * @param {{ runner?: ReviewRunner, notify?: (message: string, label: string) => void, platform?: string }} [options]
 * @returns {{ label: string, answer: string }}
 */
export function askCodex(projectDir, input, { runner = runReviewer, notify, platform = process.platform } = {}) {
  const config = readConfig(projectDir);
  const settings = readReviewSettings(config);
  if (settings.fallbackOnly) {
    throw askError('ask-refused', 'fallback-only', 'This repository keeps briefs local through review.fallback_only. Spawn the role as a subagent, which is the labelled same-family fallback.');
  }
  if (input.purpose !== undefined && !ASK_PURPOSES.includes(input.purpose)) {
    throw askError('ask-refused', 'input', `Unknown ask purpose. Use ${ASK_PURPOSES.join(', ')} or omit purpose.`);
  }
  if (input.purpose === 'claim-check') {
    const choice = config.review?.claim_check_codex;
    if (choice !== true) {
      const repair = choice === undefined || choice === false
        ? 'Set review.claim_check_codex to true in .process/aperture.json'
        : 'Set review.claim_check_codex to true or false in .process/aperture.json';
      throw askError('ask-refused', 'not-opted-in', `Claim checks stay local unless explicitly opted in. ${repair}, or spawn the claim checker as a subagent. Nothing was sent.`);
    }
  }
  const instructions = stripFrontmatter(String(input.instructions));
  const brief = String(input.brief);
  if (instructions.trim() === '') throw askError('ask-refused', 'input', 'The instructions are blank. Give the role its instructions.');
  if (brief.trim() === '') throw askError('ask-refused', 'input', 'The brief is blank. Write the brief first.');
  const prompt = `${ASK_PREAMBLE}\n\n${instructions}\n\n${brief}`;
  if (Buffer.byteLength(prompt, 'utf8') > ASK_PROMPT_MAX_BYTES) {
    throw askError('ask-refused', 'input', `The prompt is over ${ASK_PROMPT_MAX_BYTES} bytes. Shorten the brief or the instructions.`);
  }
  const secrets = checkSecrets({ addedLines: prompt.split(/\r?\n/).map((text, index) => ({ path: 'prompt', line: index + 1, text: text.replaceAll(ALLOW_SECRET_MARKER, '') })) });
  if (secrets.length > 0) {
    throw new AskError(
      'ask-refused',
      'secret',
      secrets.map((f) => ({ rule: 'ask-refused', message: `${f.message.split('. ')[0]}. Remove it from the brief or instructions; nothing was sent.`, path: 'prompt' })),
    );
  }
  codexArgs(settings, { workDir: '', outFile: '' }); // throws review-not-pinned before any directory is made

  const root = mkdtempSync(join(tmpdir(), 'aperture-ask-'));
  try {
    const workDir = join(root, 'work');
    mkdirSync(workDir);
    const outFile = join(root, 'out.txt');
    const argv = [...settings.reviewer, ...codexArgs(settings, { workDir, outFile })];
    const name = baseName(settings.reviewer.at(-1));
    const label = `${/^codex(\.(exe|cmd|bat))?$/i.test(name) ? 'codex' : name} ${settings.model} (${settings.effort})`;
    notify?.(`running ${baseName(argv[0])}; expected to send the brief to OpenAI; set review.fallback_only to true in .process/aperture.json to keep it local`, label);
    const result = runner(argv, { cwd: workDir, input: prompt, timeoutMs: REVIEW_TIMEOUT_MS });
    if (result.error || result.status !== 0) {
      const code = /** @type {any} */ (result.error)?.code;
      let reason;
      if (code === 'ETIMEDOUT') reason = `timed out after ${REVIEW_TIMEOUT_MS / 1000} s`;
      else if (code === 'ENOBUFS') reason = 'stderr passed 8 MiB, so the run was stopped';
      else if (result.error) reason = `could not start (${result.error.message})`;
      else if (result.status === null) reason = 'ended by a signal before it exited';
      else reason = `exited ${result.status}`;
      const hint = platform === 'win32' && (code === 'ENOENT' || code === 'EINVAL') ? ` On Windows, ${WINDOWS_LAUNCHER_HINT}.` : '';
      const stderr = tail(result.stderr);
      throw askError('ask-failed', 'codex', `Codex (${settings.reviewer[0]}) ${reason}.${hint}${stderr === '' ? '' : `\n${stderr}`}`);
    }
    return { label, answer: readAnswer(outFile) };
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5 });
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
  const USAGE = 'Usage: node codex-ask.mjs <projectDir> --instructions <file> --brief <file> --out <file> [--purpose claim-check]';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const args = process.argv.slice(2);
  const positional = [];
  /** @type {Record<string, string>} */
  const given = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    if (!['--instructions', '--brief', '--out', '--purpose'].includes(arg)) usage(`Unknown option ${arg}.`);
    const key = arg.slice(2);
    if (given[key] !== undefined) usage(`${arg} given more than once.`);
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) usage(`${arg} requires a value.`);
    given[key] = value;
    i++;
  }
  if (positional.length !== 1) usage('Expected one project directory.');
  for (const key of ['instructions', 'brief', 'out']) if (given[key] === undefined) usage(`--${key} is required.`);
  const readText = (path) => {
    try {
      return readFileSync(path, 'utf8');
    } catch (cause) {
      return usage(`Cannot read ${path} (${cause.message}).`);
    }
  };
  const instructions = readText(given.instructions);
  const brief = readText(given.brief);
  try {
    const notify = (message, label) => {
      console.log(`asked: ${label}`);
      console.log(message);
    };
    const { label, answer } = askCodex(resolve(positional[0]), { instructions, brief, purpose: given.purpose }, { notify });
    const out = resolve(given.out);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `Answered by ${label}.\n\n${answer.replace(/\n+$/, '')}\n`);
    console.log(`answer: ${out}`);
  } catch (err) {
    if (err instanceof AskError || err instanceof ReviewerError) {
      for (const f of err.findings) console.error(`${f.rule}: ${f.message}`);
      process.exit(1);
    }
    if (err instanceof ConfigError) {
      console.error(`${err.rule}: ${err.message}`);
      process.exit(1);
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
}
