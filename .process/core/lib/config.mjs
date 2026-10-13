import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @typedef {{
 *   aperture_version: string,
 *   tier: string,
 *   profile: string,
 *   packs: Record<string, string>,
 *   ejected: string[],
 *   requested?: string[],
 *   sets?: Record<string, { version: string, members: string[] }>,
 * }} Config
 */

export const CONFIG_PATH = '.process/aperture.json';

export class ConfigError extends Error {
  /**
   * @param {string} message
   * @param {'config-missing' | 'config-invalid'} rule
   */
  constructor(message, rule) {
    super(message);
    this.name = 'ConfigError';
    this.rule = rule;
  }
}

/** @param {string} projectDir @returns {Config} */
export function readConfig(projectDir) {
  const file = join(projectDir, CONFIG_PATH);
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new ConfigError(`${CONFIG_PATH} not found. Run init to create it.`, 'config-missing');
    }
    throw new Error(`Cannot read ${file}: ${err.message}`, { cause: err });
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new ConfigError(
      `${CONFIG_PATH} is not valid JSON (${err.message}). Fix the syntax or restore it from version control.`,
      'config-invalid',
    );
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ConfigError(
      `${CONFIG_PATH} must be a JSON object. Restore it from version control or re-create it with init.`,
      'config-invalid',
    );
  }
  return parsed;
}

/** @param {string} projectDir @param {Config} config */
export function writeConfig(projectDir, config) {
  writeFileSync(join(projectDir, CONFIG_PATH), JSON.stringify(config, null, 2) + '\n');
}
