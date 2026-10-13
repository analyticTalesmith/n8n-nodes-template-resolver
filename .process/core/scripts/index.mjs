import { realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findLargeFiles, writeIndexes } from '../lib/index-docs.mjs';
import { checkIndexFresh } from '../lib/checks/index-fresh.mjs';
import { ProjectRootsError } from '../lib/project-roots.mjs';

const BYTES_PER_KB = 1024;
const USAGE = 'Usage: node index.mjs <projectDir> [--check]';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

const isDirectory = (path) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

if (isMain) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const rest = args.filter((arg) => arg !== '--check');
  if (rest.length !== 1 || rest[0].startsWith('--') || args.length - rest.length > 1) {
    console.error(`Expected a project directory and optionally --check. ${USAGE}`);
    process.exit(2);
  }
  const projectDir = resolve(rest[0]);
  if (!isDirectory(projectDir)) {
    console.error(`${rest[0]} is not a directory. ${USAGE}`);
    process.exit(2);
  }
  try {
    let failed = false;
    if (check) {
      const findings = checkIndexFresh({ projectDir });
      for (const { rule, message } of findings) console.log(`${rule}: ${message}`);
      failed = findings.length > 0;
    } else {
      for (const path of writeIndexes(projectDir).written) console.log(`wrote ${path}`);
    }
    for (const { path, bytes } of findLargeFiles(projectDir)) {
      console.log(`warning: ${path} is ${Math.round(bytes / BYTES_PER_KB)} KB; consider splitting it`);
    }
    process.exit(failed ? 1 : 0);
  } catch (error) {
    if (!(error instanceof ProjectRootsError)) throw error;
    console.error(`${error.rule}: ${error.message}`);
    process.exit(1);
  }
}
