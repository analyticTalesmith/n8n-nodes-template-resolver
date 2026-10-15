import { spawnSync } from 'node:child_process';
import { CONFIG_PATH } from './config.mjs';

/** @typedef {import('../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./checks/boundary.mjs').CommandResult} CommandResult */
/** @typedef {{ reviewer: string[], model: string | null, effort: string | null, fallbackOnly: boolean }} ReviewSettings */
/** @typedef {(argv: string[], options: { cwd: string, input: string, timeoutMs: number }) => CommandResult} ReviewRunner */

export const REVIEW_TIMEOUT_MS = 900000;
export const REVIEW_OUTPUT_MAX_BYTES = 1048576;
export const REVIEW_STDERR_MAX_BYTES = 8388608;
/**
 * Codex features that give the model a way to run a command or open a local file (shell, unified exec, code mode,
 * local image viewing, browser and computer use). The read-only sandbox blocks writes, not reads, so each is disabled.
 * Verified on codex-cli 0.153.4; Codex accepts an unknown feature name silently, so a rename upstream would not fail.
 */
export const CODEX_DISABLED_FEATURES = Object.freeze(['shell_tool', 'unified_exec', 'code_mode_host', 'view_image', 'browser_use', 'browser_use_external', 'computer_use', 'in_app_browser']);
export const FALLBACK_LABEL = 'opus fallback (same model family as the builder; has repository access)';

export const REVIEW_PREAMBLE = `You are a blind, read-only reviewer: run no commands; read no files: everything you may use is in this prompt.

First restate the objective in your own words. If you disagree with the brief, put that in \`brief_mismatch\`; it is a brief defect for the lead, not a finding.
At product tier and up, write your verification plan from section 1 before you read section 3.
Tie every finding to the objective chain with \`serves\` and a \`class\`. Only \`defect\` and \`goal-risk\` ask for a fix, and each asks for the smallest change that restores the criterion. File out-of-scope problems as \`drift\`.
Before answering, re-read every finding against the chain and withdraw any whose \`serves\` does not hold.
Write every backslash in a JSON string as two backslashes, and give file paths with forward slashes.
Answer with the JSON object only.`;

export class ReviewerError extends Error {
  /** @param {'review-config-invalid' | 'review-not-pinned' | 'review-codex-failed' | 'review-output-invalid' | 'review-no-packet' | 'review-output-stale'} rule @param {Finding[]} findings */
  constructor(rule, findings) {
    super(findings.map((f) => `${f.rule}: ${f.message}`).join('\n'));
    this.name = 'ReviewerError';
    this.rule = rule;
    this.findings = findings;
  }
}

/** @returns {ReviewerError} */
export const reviewerError = (rule, message, path) => new ReviewerError(rule, [{ rule, message, ...(path === undefined ? {} : { path }) }]);

/**
 * Runs a program without a shell, prompt on stdin. Stdout is ignored (the answer comes through a file) and stderr is
 * capped. Never throws; failures land in `error`.
 * @type {ReviewRunner}
 */
export const runReviewer = (argv, { cwd, input, timeoutMs }) => {
  try {
    const result = spawnSync(argv[0], argv.slice(1), {
      cwd,
      input,
      timeout: timeoutMs,
      shell: false,
      encoding: 'utf8',
      stdio: ['pipe', 'ignore', 'pipe'],
      maxBuffer: REVIEW_STDERR_MAX_BYTES,
      windowsHide: true,
    });
    return { status: result.status, stdout: '', stderr: result.stderr ?? '', ...(result.error ? { error: result.error } : {}) };
  } catch (cause) {
    return { status: null, stdout: '', stderr: '', error: cause instanceof Error ? cause : new Error(String(cause)) };
  }
};

/**
 * @param {unknown} config the whole project config; only its `review` object is read
 * @returns {ReviewSettings}
 */
export function readReviewSettings(config) {
  const raw = /** @type {any} */ (config)?.review;
  const bad = (key, expected) =>
    reviewerError('review-config-invalid', `${key === 'review' ? 'review' : `review.${key}`} in ${CONFIG_PATH} must be ${expected}. Fix it there.`, key);
  if (raw === undefined) return { reviewer: ['codex'], model: null, effort: null, fallbackOnly: false };
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw bad('review', 'an object');
  const { reviewer = ['codex'], model = null, effort = null, fallback_only: fallbackOnly = false } = raw;
  if (!Array.isArray(reviewer) || reviewer.length === 0 || !reviewer.every((part) => typeof part === 'string' && part !== '')) {
    throw bad('reviewer', 'a non-empty list of non-empty strings (a command prefix, such as ["codex"])');
  }
  if (model !== null && !(typeof model === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(model))) throw bad('model', 'a model name of letters, digits, ".", "_", ":" and "-"');
  if (effort !== null && !(typeof effort === 'string' && /^[a-z]+$/.test(effort))) throw bad('effort', 'lowercase letters only, such as "medium"');
  if (typeof fallbackOnly !== 'boolean') throw bad('fallback_only', 'true or false');
  return { reviewer: [...reviewer], model, effort, fallbackOnly };
}

/**
 * @param {ReviewSettings} settings
 * @param {{ workDir: string, outFile: string }} paths
 * @returns {string[]}
 */
export function codexArgs(settings, { workDir, outFile }) {
  if (settings.model === null || settings.effort === null) {
    throw reviewerError('review-not-pinned', `A Codex review needs both review.model and review.effort in ${CONFIG_PATH} (the spec pins them in project config). Set them, then run again.`);
  }
  return [
    'exec', '--model', settings.model, '--config', `model_reasoning_effort="${settings.effort}"`, '--sandbox', 'read-only',
    ...CODEX_DISABLED_FEATURES.flatMap((feature) => ['--disable', feature]), '--ephemeral',
    '--skip-git-repo-check', '--ignore-user-config', '--ignore-rules', '--cd', workDir, '--color', 'never', '--output-last-message', outFile, '-',
  ];
}

/** @param {string} packetText @returns {string} */
export const buildReviewPrompt = (packetText) => `${REVIEW_PREAMBLE}\n\n${packetText}`;

/**
 * Accepts text that is one JSON object, optionally inside a single fenced block. Only when the strict parse fails, every
 * backslash that does not start a valid JSON escape is doubled and the text is parsed once more.
 * @param {string} text
 * @returns {{ value: object, repaired: number }} repaired is how many backslashes were doubled
 */
export function parseReviewMessageWithNotes(text) {
  const trimmed = String(text).trim();
  const fence = /^```[^\n]*\n([\s\S]*?)\n?```$/.exec(trimmed);
  const body = fence ? fence[1] : trimmed;
  let value;
  let repaired = 0;
  try {
    value = JSON.parse(body);
  } catch (strict) {
    const fixed = body.replace(/\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})|\\/g, (match, offset) => {
      if (match.length > 1) {
        const separator = /^\\[bfnrt]$/.test(match) && /[A-Za-z0-9_-]/.test(body[offset - 1] ?? '') && /[A-Za-z_]/.test(body[offset + 2] ?? '');
        const drive = /^\\[bfnrt]$/.test(match) && /(?:^|[^A-Za-z0-9_-])[A-Za-z]:$/.test(body.slice(Math.max(0, offset - 3), offset)) && /[A-Za-z_]/.test(body[offset + 2] ?? '');
        if (!separator && !drive) return match;
        repaired++;
        return `\\\\${match[1]}`;
      }
      repaired++;
      return '\\\\';
    });
    try {
      value = JSON.parse(fixed);
    } catch {
      const position = /position (\d+)/.exec(strict instanceof Error ? strict.message : '')?.[1];
      throw reviewerError(
        'review-output-invalid',
        `The reviewer reply is not one JSON object (optionally inside a single fenced block)${position === undefined ? '' : `; the parse failed at position ${position}`}. Ask for the JSON object only; if the reply contains a backslash, write it as two.`,
      );
    }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw reviewerError('review-output-invalid', 'The reviewer reply must be one JSON object. Ask for the JSON object only.');
  }
  return { value, repaired };
}

/**
 * @param {string} text
 * @returns {unknown}
 */
export const parseReviewMessage = (text) => parseReviewMessageWithNotes(text).value;
