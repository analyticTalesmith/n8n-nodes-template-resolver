import { TIERS } from '../layout.mjs';
import { OUTPUT_LINES, describeRunFailure, runCommand } from './boundary.mjs';

/** @typedef {import('../../scripts/validate.mjs').Finding} Finding */
/** @typedef {import('./boundary.mjs').CommandRunner} CommandRunner */
/** @typedef {{ name: string, argv: string[], min_tier?: string }} ToolEntry */

export const FRONT_END_TOOL_TIMEOUT_MS = 300000;

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const isArgv = (value) => Array.isArray(value) && value.length > 0 && value.every((part) => typeof part === 'string' && part !== '');
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const invalid = (message) => ({ rule: 'front-end-config-invalid', message });

/**
 * Runs the rendered-page tools the project configures in gate.front_end.tools (axe, Playwright, Lighthouse, a design
 * file linter and the like), each as a no-shell argv command. The tools judge; this only runs them and reports a
 * non-zero exit. Every entry at or below the project tier runs, even after an earlier one failed.
 * @param {{ projectDir: string, tier: string, settings: Record<string, unknown>, run?: CommandRunner, platform?: string }} input
 * @returns {Finding[]}
 */
export function checkFrontEndTools({ projectDir, tier, settings, run = runCommand, platform = process.platform }) {
  const tools = settings.tools;
  if (tools === undefined || (Array.isArray(tools) && tools.length === 0)) return [];
  if (!Array.isArray(tools)) {
    return [invalid('gate.front_end.tools must be a list of entries { name, argv, min_tier }. Fix it in .process/aperture.json.')];
  }

  /** @type {Finding[]} */
  const problems = [];
  const seen = new Set();
  tools.forEach((entry, index) => {
    const where = `gate.front_end.tools[${index}]${isPlainObject(entry) && typeof entry.name === 'string' ? ` ("${entry.name}")` : ''}`;
    if (!isPlainObject(entry)) {
      problems.push(invalid(`${where} must be an object { name, argv, min_tier }. Fix it in .process/aperture.json.`));
      return;
    }
    if (typeof entry.name !== 'string' || !KEBAB.test(entry.name)) {
      problems.push(invalid(`${where} needs a kebab-case name (lowercase letters, digits and dashes). Fix it in .process/aperture.json.`));
    } else if (seen.has(entry.name)) {
      problems.push(invalid(`${where} repeats a tool name; each name must be unique. Rename one in .process/aperture.json.`));
    } else {
      seen.add(entry.name);
    }
    if (!isArgv(entry.argv)) {
      problems.push(invalid(`${where} needs argv: a non-empty array of non-empty strings (program, then its arguments, no shell). Fix it in .process/aperture.json.`));
    }
    if (entry.min_tier !== undefined && !TIERS.includes(entry.min_tier)) {
      problems.push(invalid(`${where} has min_tier ${JSON.stringify(entry.min_tier)}; use one of ${TIERS.join(', ')} or leave it out. Fix it in .process/aperture.json.`));
    }
  });
  if (problems.length > 0) return problems;

  const have = TIERS.indexOf(tier);
  const findings = [];
  for (const entry of /** @type {ToolEntry[]} */ (tools)) {
    if (TIERS.indexOf(entry.min_tier ?? 'spike') > have) continue;
    const result = run(entry.argv, { cwd: projectDir, timeoutMs: FRONT_END_TOOL_TIMEOUT_MS });
    const failure = describeRunFailure(`front-end tool ${entry.name}`, entry.argv, result, { platform, timeoutMs: FRONT_END_TOOL_TIMEOUT_MS });
    if (failure !== null) {
      findings.push({ rule: 'front-end-tool-failed', message: failure });
      continue;
    }
    if (result.status === 0) continue;
    const output = `${result.stdout}\n${result.stderr}`.split(/\r?\n/).filter((l) => l.trim() !== '');
    const shown = output.slice(0, OUTPUT_LINES).join('\n');
    const rest = output.length > OUTPUT_LINES ? `\n(${output.length - OUTPUT_LINES} more lines)` : '';
    findings.push({
      rule: 'front-end-tool-failed',
      message: `The front-end tool ${entry.name} (${entry.argv.join(' ')}) exited ${result.status}. Fix what it reports.\n${shown}${rest}`,
    });
  }
  return findings;
}
