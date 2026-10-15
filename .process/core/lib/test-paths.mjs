const TEST_FOLDERS = new Set(['test', 'tests', '__tests__']);
const TEST_FILE = [/\.(test|spec|acceptance)\.[a-z0-9]+$/, /_test\.[a-z0-9]+$/, /^test_.+\.py$/];

/**
 * True when a project-relative path (forward slashes) is a test file: under a test folder or named like a test.
 * An acceptance script counts by file name (`<name>.acceptance.<ext>`), never by folder.
 * @param {string} path
 * @returns {boolean}
 */
export function isTestPath(path) {
  const parts = String(path).toLowerCase().split('/');
  const name = parts.pop() ?? '';
  return parts.some((part) => TEST_FOLDERS.has(part)) || TEST_FILE.some((pattern) => pattern.test(name));
}
