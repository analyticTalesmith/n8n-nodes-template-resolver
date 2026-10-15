import { readFileSync } from 'node:fs';
import { CONFIG_PATH, ConfigError, readConfig } from './config.mjs';
import { PathError, sha256Bytes } from './files.mjs';
import { resolveProjectPath, resolveProjectRoots } from './project-roots.mjs';

/** Values that look filled in but name no one; compared trimmed and lowercased. */
export const PLACEHOLDERS = Object.freeze(['', 'false', 'null', '~', 'none', 'no', 'n/a', 'na', 'tbd', 'todo', 'pending', '-']);

/**
 * Whether a recorded approval names a person: a string that, trimmed and lowercased, is not a placeholder.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isApproved(value) {
  return typeof value === 'string' && !PLACEHOLDERS.includes(value.trim().toLowerCase());
}

export class ApprovalError extends Error {
  constructor(message, rule, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ApprovalError';
    this.rule = rule;
  }
}

/** Hash the exact bytes named by a project-relative path. */
export function fileHash(projectDir, logicalPath) {
  const roots = resolveProjectRoots(projectDir);
  let path;
  try {
    path = resolveProjectPath(roots, logicalPath);
  } catch (cause) {
    if (!(cause instanceof PathError)) throw cause;
    throw new ApprovalError(`Approval path ${String(logicalPath)} is unsafe. Use a project-relative path without links.`, 'path-unsafe', cause);
  }
  try {
    return sha256Bytes(readFileSync(path));
  } catch (cause) {
    if (cause.code === 'ENOENT') return 'missing';
    throw cause;
  }
}

/** The optional exact names allowed to record an approval. */
export function readApprovers(projectDir) {
  let config;
  try {
    config = readConfig(projectDir);
  } catch (cause) {
    if (cause instanceof ConfigError && cause.rule === 'config-missing') return null;
    throw cause;
  }
  if (!Object.hasOwn(config, 'approvers')) return null;
  const values = config.approvers;
  if (!Array.isArray(values) || values.length === 0 || values.some(value => typeof value !== 'string' || !isApproved(value) || value.trim() !== value)) {
    throw new ApprovalError(`approvers in ${CONFIG_PATH} must be a non-empty list of non-placeholder person names. Fix the list and retry.`, 'approvers-invalid');
  }
  return values;
}

/** A repair hint when an approval field does not name an allowed person. */
export function approverProblem(projectDir, value) {
  if (!isApproved(value)) return 'Approval is empty or a placeholder. Fill it with a person\'s name.';
  const approvers = readApprovers(projectDir);
  if (approvers !== null && !approvers.includes(value.trim())) return `Approval name is not listed in approvers in ${CONFIG_PATH}. Use a listed person's name.`;
  return null;
}
