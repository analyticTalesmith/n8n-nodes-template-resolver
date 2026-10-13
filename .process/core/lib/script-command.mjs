import { existsSync } from 'node:fs';
import { join } from 'node:path';

const INSTALLED_SCRIPTS = '.process/core/scripts';
const CHECKOUT_SCRIPTS = 'core/scripts';

/**
 * Where a project runs an Aperture script from: `.process/core/scripts` when the project has its own installed copy,
 * the source checkout's `core/scripts` otherwise (a project not installed yet, or no project known).
 * @param {string | undefined} projectDir
 * @returns {string}
 */
export function scriptsFolder(projectDir) {
  return typeof projectDir === 'string' && projectDir !== '' && existsSync(join(projectDir, INSTALLED_SCRIPTS)) ? INSTALLED_SCRIPTS : CHECKOUT_SCRIPTS;
}

/**
 * The command that runs one script for a project, as `node <folder>/<name>`, for messages that tell a person what to run.
 * @param {string | undefined} projectDir
 * @param {string} name script file name, such as freeze.mjs
 * @returns {string}
 */
export const scriptCommand = (projectDir, name) => `node ${scriptsFolder(projectDir)}/${name}`;

/**
 * Where a project keeps a document template: `.process/core/templates` when the project has its own installed copy,
 * the source checkout's `core/templates` otherwise.
 * @param {string | undefined} projectDir
 * @param {string} name template file name, such as close-review.md
 * @returns {string}
 */
export const templateFile = (projectDir, name) => `${scriptsFolder(projectDir).replace(/scripts$/, 'templates')}/${name}`;
