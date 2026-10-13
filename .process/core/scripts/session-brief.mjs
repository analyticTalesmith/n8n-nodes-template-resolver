import { existsSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The libraries load at run time, not as static imports: a missing or mismatched file after a partial upgrade must
// end hook mode with exit 0, and a static import fails before any code here can catch it.
let lib = null;
let loadError = null;
try {
  const [config, files, brief, hook] = await Promise.all([
    import('../lib/config.mjs'),
    import('../lib/files.mjs'),
    import('../lib/session-brief.mjs'),
    import('../lib/session-hook.mjs'),
  ]);
  lib = { config, files, brief, hook };
} catch (cause) {
  loadError = cause;
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

/**
 * SessionStart: the brief goes to stdout, and the working tree is recorded in the session's scratchpad so Stop can
 * tell what one turn changed. A baseline that cannot be written still leaves the brief.
 */
const sessionStart = ({ root, input, check }) => {
  const text = lib.brief.renderSessionBrief(root);
  const target = lib.hook.baselinePath(root, input);
  if (target !== null) {
    try {
      lib.files.writeFileAtomic(target, JSON.stringify(lib.hook.takeSnapshot(root, null, { check })));
    } catch {
      // Without a baseline, Stop checks only that the captured paths exist.
    }
  }
  return text;
};

const args = process.argv.slice(2);
if (isMain && args.length === 1 && args[0] === '--hook') {
  if (lib === null) {
    if (process.env.APERTURE_DEBUG) process.stderr.write(`aperture hook: ${String(loadError?.message ?? loadError).replace(/\s+/g, ' ').trim()}\n`);
    process.exit(0);
  }
  lib.hook.runHook(sessionStart, { scriptPath: fileURLToPath(import.meta.url) });
} else if (isMain) {
  const USAGE = 'Usage: node session-brief.mjs <projectDir> | --hook';
  const flag = args.find((a) => a.startsWith('--'));
  if (flag || args.length !== 1) {
    console.error(`${flag ? `Unknown option ${flag}.` : 'Expected a project directory.'} ${USAGE}`);
    process.exit(2);
  }
  if (lib === null) {
    console.error(`Cannot load the Aperture libraries next to this script: ${loadError?.message ?? loadError}. Run upgrade to repair the installation.`);
    process.exit(1);
  }
  const { CONFIG_PATH } = lib.config;
  const dir = resolve(args[0]);
  if (!existsSync(join(dir, CONFIG_PATH))) {
    console.error(`${dir} is not an Aperture project (${CONFIG_PATH} is missing). Run init or adopt there first.`);
    process.exit(1);
  }
  try {
    process.stdout.write(lib.brief.renderSessionBrief(dir));
  } catch (err) {
    console.error(`Cannot read the repository state of ${dir}: ${err.message}`);
    process.exit(1);
  }
}
