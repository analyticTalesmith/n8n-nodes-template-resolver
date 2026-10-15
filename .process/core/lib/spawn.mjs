import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { cardPath, readCard } from './board.mjs';
import { WINDOWS_LAUNCHER_HINT } from './checks/boundary.mjs';
import { readFrontmatter } from './frontmatter.mjs';
import { PROCESS_TEAMS } from './layout.mjs';
import { GitError, runGit } from './git.mjs';

/** The commands a write-capable member may run: its own git work and node, never push, delete or anything on a network. */
export const BASH_ALLOWLIST = Object.freeze(['git status *', 'git diff *', 'git add *', 'git commit *', 'git log *', 'node *', 'npm test *'].map((command) => `Bash(${command})`));
/** Commands a member is denied even when its settings or a parent session would allow them: deny rules win over allow rules. */
export const DENY_COMMANDS = Object.freeze(['git push', 'git push *', 'rm *', 'curl *', 'wget *'].map((command) => `Bash(${command})`));
/** Role tools that pass through unchanged; every other tool (web search and fetch, agents, ...) is withheld. */
const PASS_THROUGH = Object.freeze(['Read', 'Grep', 'Glob', 'Write', 'Edit']);
const NAME = /^[a-z0-9][a-z0-9-]*$/;
const SAFE_ARG = /^[\w@%+=:,./\\-]+$/;

/** Raised for a refusal the caller can fix; the message is one line naming the cause. */
export class SpawnError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message.replace(/\s+/g, ' ').trim());
    this.name = 'SpawnError';
  }
}

/**
 * The tool allowlist a role's own tools list allows. Read, Grep, Glob, Write and Edit pass through when listed; Bash
 * becomes the fixed allowlist plus one entry for the card's gate; everything else is withheld.
 * @param {string[]} tools
 * @param {string[] | null} [gate] the card's gate argv
 * @returns {{ allowed: string[], withheld: string[] }}
 */
export function allowedTools(tools, gate = null) {
  /** @type {string[]} */
  const allowed = [];
  /** @type {string[]} */
  const withheld = [];
  for (const tool of tools) {
    if (PASS_THROUGH.includes(tool)) allowed.push(tool);
    else if (tool === 'Bash') {
      allowed.push(...BASH_ALLOWLIST);
      if (Array.isArray(gate) && gate[0] === 'node' && gate.every((part) => typeof part === 'string' && SAFE_ARG.test(part))) allowed.push(`Bash(${gate.join(' ')} *)`);
    } else withheld.push(tool);
  }
  return { allowed, withheld };
}

const bodyOf = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();

/**
 * The claude argument list and system prompt for one member. Pure: nothing is read or started.
 * @param {{ role: { text: string, model?: string, effort?: string, tools: string[] }, charter: string, brief: string, cwd: string, gate?: string[] | null, claude?: string }} input
 * @returns {{ argv: string[], systemPrompt: string, withheld: string[], input: string, cwd: string }}
 */
export function buildSpawnArgs({ role, charter, brief, cwd, gate = null, claude = 'claude' }) {
  const { allowed, withheld } = allowedTools(role.tools, gate);
  if (allowed.length === 0) throw new SpawnError(`Every tool the role lists is withheld (${withheld.join(', ')}), so it would have none. Only ${PASS_THROUGH.join(', ')} and Bash pass through; list at least one.`);
  const systemPrompt = `${charter.trim()}\n\n${bodyOf(role.text)}\n`;
  const argv = [claude, '-p', '--no-session-persistence'];
  if (role.model) argv.push('--model', role.model);
  if (role.effort) argv.push('--effort', role.effort);
  argv.push('--append-system-prompt', systemPrompt, '--disallowedTools', ...withheld, ...DENY_COMMANDS, '--allowedTools', ...allowed);
  return { argv, systemPrompt, withheld, input: brief, cwd };
}

/**
 * The claude executable on the path. Windows can start only a real executable without a shell, so a .cmd or .ps1 launcher
 * alone is a refusal that says so.
 * @param {{ path?: string, platform?: string }} [options]
 * @returns {string}
 */
export function findClaude({ path = process.env.PATH ?? process.env.Path ?? '', platform = process.platform } = {}) {
  const names = platform === 'win32' ? ['claude.exe'] : ['claude'];
  const launchers = platform === 'win32' ? ['claude.cmd', 'claude.ps1', 'claude.bat'] : [];
  let launcherOnly = false;
  for (const dir of path.split(delimiter).filter((part) => part !== '')) {
    for (const name of names) {
      const file = join(dir, name);
      if (existsSync(file) && statSync(file).isFile()) return file;
    }
    if (launchers.some((name) => existsSync(join(dir, name)))) launcherOnly = true;
  }
  throw new SpawnError(launcherOnly ? `claude was found only as a launcher script; ${WINDOWS_LAUNCHER_HINT}.` : 'The claude executable was not found on the path. Install Claude Code or add it to PATH.');
}

/** Starts the member without a shell, feeding it the brief on stdin and sharing this terminal. */
const runMember = (argv, { cwd, input }) => {
  const result = spawnSync(argv[0], argv.slice(1), { cwd, input, shell: false, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] });
  return { status: result.status, ...(result.error ? { error: result.error } : {}) };
};

function readText(file, what) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    throw new SpawnError(`The ${what} ${file} cannot be read. Check the path.`);
  }
}

/**
 * Launches a team member from its role file, or with print only describes the launch.
 * @param {{ projectDir: string, team: string, role: string, briefFile: string, cwd?: string, cardId?: string, print?: boolean, which?: () => string, run?: (argv: string[], options: { cwd: string, input: string }) => { status: number | null, error?: Error } }} input
 * @returns {{ status: number | null, print?: { argv: string[], systemPrompt: string, withheld: string[], cwd: string } }}
 */
export function launchMember({ projectDir, team, role, briefFile, cwd, cardId, print = false, which = () => findClaude(), run = runMember }) {
  if (!NAME.test(team) || !NAME.test(role)) throw new SpawnError(`"${team}:${role}" is not a team and role name: use lowercase letters, digits and -.`);
  const root = resolve(projectDir);
  const teamDir = join(root, PROCESS_TEAMS, team);
  const roleFile = join(teamDir, 'roles', `${role}.md`);
  if (!existsSync(roleFile)) throw new SpawnError(`The role file ${PROCESS_TEAMS}/${team}/roles/${role}.md does not exist in ${root}. Check the team and role names.`);
  const text = readText(roleFile, 'role file');
  const data = readFrontmatter(text);
  const tools = data?.tools;
  if (!Array.isArray(tools) || tools.length === 0) throw new SpawnError(`The role ${team}:${role} has no tools list in its frontmatter. Add tools: [Read, ...] to the role file.`);
  const charterFile = join(teamDir, 'charter.md');
  if (!existsSync(charterFile)) throw new SpawnError(`The charter ${PROCESS_TEAMS}/${team}/charter.md does not exist. Install the team first.`);
  const brief = readText(briefFile, 'brief');
  const claude = print ? 'claude' : which();
  const work = resolve(cwd ?? root);
  try {
    if (runGit(work, ['rev-parse', '--is-inside-work-tree']).trim() !== 'true') throw new SpawnError(`${work} is not a git work tree, so the member would have nowhere to commit.`);
  } catch (cause) {
    if (cause instanceof GitError) throw new SpawnError(`${work} is not a git work tree, so the member would have nowhere to commit. Pass --cwd with the card's worktree.`);
    throw cause;
  }
  let gate = null;
  if (cardId !== undefined) {
    if (cardPath(root, cardId) === null) throw new SpawnError(`Card ${cardId} is not on the board of ${root}.`);
    const card = readCard(root, cardId);
    gate = Array.isArray(card.gate) ? card.gate : null;
  }
  const model = typeof data.model === 'string' ? data.model : undefined;
  const effort = typeof data.effort === 'string' ? data.effort : undefined;
  const built = buildSpawnArgs({ role: { text, model, effort, tools }, charter: readText(charterFile, 'charter'), brief, cwd: work, gate, claude });
  if (print) return { status: 0, print: { argv: built.argv, systemPrompt: built.systemPrompt, withheld: built.withheld, cwd: work } };
  const result = run(built.argv, { cwd: work, input: brief });
  if (result.error) throw new SpawnError(`claude could not be started (${result.error.message}). ${WINDOWS_LAUNCHER_HINT}.`);
  return { status: result.status };
}
