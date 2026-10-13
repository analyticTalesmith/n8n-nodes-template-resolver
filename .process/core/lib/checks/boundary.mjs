import { spawnSync } from 'node:child_process';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {{ status: number | null, stdout: string, stderr: string, error?: Error }} CommandResult */
/** @typedef {(argv: string[], options: { cwd: string, timeoutMs: number }) => CommandResult} CommandRunner */

export const BOUNDARY_TIMEOUT_MS = 120000;
export const WINDOWS_LAUNCHER_HINT =
  'run it through its real executable or a node script; npx and .cmd launchers cannot be started without a shell';

const MAX_BUFFER = 64 * 1024 * 1024;
export const OUTPUT_LINES = 20;

/** The parent environment less NODE_TEST_CONTEXT, which makes a child node --test believe it is a subtest: it then prints no TAP and exits 0. */
const childEnv = () => {
  const { NODE_TEST_CONTEXT: _context, ...rest } = process.env;
  return rest;
};

/**
 * Runs a program without a shell, with the parent environment except NODE_TEST_CONTEXT. Never throws; failures land in `error`.
 * @type {CommandRunner}
 */
export const runCommand = (argv, { cwd, timeoutMs }) => {
  try {
    const result = spawnSync(argv[0], argv.slice(1), {
      cwd,
      shell: false,
      env: childEnv(),
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', ...(result.error ? { error: result.error } : {}) };
  } catch (error) {
    return { status: null, stdout: '', stderr: '', error: error instanceof Error ? error : new Error(String(error)) };
  }
};

const isArgv = (value) => Array.isArray(value) && value.length > 0 && value.every((part) => typeof part === 'string' && part !== '');
const finding = (rule, message) => ({ rule, message });

/**
 * Runs the boundary checker the profile configures, after proving with the canary that it can fail.
 * @param {{ projectDir: string, tier: string, gate: unknown, run?: CommandRunner, platform?: string, required?: boolean }} input
 * @returns {Finding[]}
 */
export function checkBoundary({ projectDir, tier, gate, run = runCommand, platform = process.platform, required = tier === 'hardened' }) {
  const settings = gate !== null && typeof gate === 'object' && !Array.isArray(gate) ? /** @type {Record<string, unknown>} */ (gate) : {};
  const boundary = settings.boundary;
  const canary = settings.boundary_canary;
  if (boundary === undefined) {
    return required
      ? [finding('boundary-not-configured', 'The hardened tier needs an architecture boundary checker. Set gate.boundary (an argv array) and gate.boundary_canary in .process/aperture.json.')]
      : [];
  }
  /** @type {Finding[]} */
  const invalid = [];
  if (!isArgv(boundary)) {
    invalid.push(finding('boundary-config-invalid', 'gate.boundary must be a non-empty array of non-empty strings (program, then its arguments). Fix it in .process/aperture.json.'));
  }
  if (canary !== undefined && !isArgv(canary)) {
    invalid.push(finding('boundary-config-invalid', 'gate.boundary_canary must be a non-empty array of non-empty strings (program, then its arguments). Fix it in .process/aperture.json.'));
  }
  if (invalid.length) return invalid;
  if (canary === undefined) {
    return [finding('boundary-canary-missing', 'gate.boundary is set without gate.boundary_canary. Add a canary command that runs the checker on a deliberate violation and exits non-zero, so a checker that passes everything is caught.')];
  }
  if (tier === 'hardened') {
    const baseline = [boundary, canary].flat().some((part) => part === '--ignore-known' || part.startsWith('--ignore-known='));
    if (baseline) {
      return [finding('boundary-baseline-refused', 'The hardened tier allows no baseline of known violations: gate.boundary or gate.boundary_canary passes --ignore-known. Remove it and fix the violations, or change the rules by decision record.')];
    }
  }
  const checkArgv = /** @type {string[]} */ (boundary);
  const canaryArgv = /** @type {string[]} */ (canary);

  const options = { cwd: projectDir, timeoutMs: BOUNDARY_TIMEOUT_MS };
  const canaryResult = run(canaryArgv, options);
  const canaryFailure = failedToRun('canary', canaryArgv, canaryResult, platform);
  if (canaryFailure) return [canaryFailure];
  if (canaryResult.status === 0) {
    return [finding('boundary-canary-passed', `The canary (${canaryArgv.join(' ')}) exited 0 on a deliberate violation, so the boundary checker proves nothing. Fix the checker or the canary so the canary fails.`)];
  }

  const result = run(checkArgv, options);
  const failure = failedToRun('check', checkArgv, result, platform);
  if (failure) return [failure];
  if (result.status === 0) return [];
  const output = `${result.stdout}\n${result.stderr}`.split(/\r?\n/).filter((l) => l.trim() !== '');
  const shown = output.slice(0, OUTPUT_LINES).join('\n');
  const rest = output.length > OUTPUT_LINES ? `\n(${output.length - OUTPUT_LINES} more lines)` : '';
  return [finding('boundary-violation', `The boundary check (${checkArgv.join(' ')}) exited ${result.status}. Fix what it reports.\n${shown}${rest}`)];
}

/**
 * The message when a run could not start, timed out or was ended by a signal; null when the command ran and exited.
 * @param {string} label what ran, as the message names it (for example "canary")
 * @param {string[]} argv
 * @param {CommandResult} result
 * @param {{ platform: string, timeoutMs: number }} options
 * @returns {string | null}
 */
export function describeRunFailure(label, argv, result, { platform, timeoutMs }) {
  const code = /** @type {any} */ (result.error)?.code;
  if (code === 'ETIMEDOUT') {
    return `The ${label} (${argv[0]}) timed out after ${timeoutMs / 1000} s. Make it faster or fix what hangs.`;
  }
  if (result.error) {
    const hint = platform === 'win32' && (code === 'ENOENT' || code === 'EINVAL') ? ` On Windows, ${WINDOWS_LAUNCHER_HINT}.` : '';
    return `The ${label} (${argv[0]}) could not start (${result.error.message}). Check the command in .process/aperture.json.${hint}`;
  }
  if (result.status === null) {
    return `The ${label} (${argv[0]}) ended by a signal before it exited. Run it by hand to see why.`;
  }
  return null;
}

/** A boundary-command-failed finding when the run did not exit; otherwise null. */
function failedToRun(which, argv, result, platform) {
  const message = describeRunFailure(which === 'canary' ? 'canary' : 'boundary check', argv, result, { platform, timeoutMs: BOUNDARY_TIMEOUT_MS });
  return message === null ? null : finding('boundary-command-failed', message);
}
