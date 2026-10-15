import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PROCESS_TEAMS } from './layout.mjs';

/**
 * The advisory line printed after a cycle closes: run a retro, which ends with one to three owned, dated actions.
 * It names who to spawn when the process team is installed and how to add it when not. It never blocks a close.
 * @param {string} projectDir
 * @param {string} cycle
 * @returns {string}
 */
export function retroSuggestion(projectDir, cycle) {
  const installed = existsSync(join(resolve(projectDir), PROCESS_TEAMS, 'process', 'charter.md'));
  const how = installed
    ? 'ask the project lead to spawn process:process-engineer'
    : 'add the team first with aperture add <project> process';
  return `suggestion: run a retro for ${cycle} (${how}); it ends with one to three actions, each with an owner and a date, for the human to confirm. It is optional: skip it when nothing went wrong.`;
}
