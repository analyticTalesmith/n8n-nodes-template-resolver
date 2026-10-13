import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigError } from '../lib/config.mjs';
import { PROJECT_DIMENSIONS, ProfileError, readProjectProfile, setProjectProfile } from '../lib/profile.mjs';

const USAGE = [
  'Usage: node profile.mjs <projectDir> show',
  '       node profile.mjs <projectDir> set <dimension>=<value>... (a value of unset asks it again later)',
  `       project dimensions: ${Object.entries(PROJECT_DIMENSIONS).map(([key, levels]) => `${key} (${levels.join(', ')})`).join('; ')}`,
].join('\n');

/** The project dimensions as printable lines; one that is not set says so and is never guessed. */
export function show(projectDir) {
  const set = readProjectProfile(projectDir);
  return Object.keys(PROJECT_DIMENSIONS).map((key) => `${key}: ${set[key] ?? 'not set'}`);
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const [dir, command, ...settings] = process.argv.slice(2);
  const usage = (message) => {
    console.error(`${message}\n${USAGE}`);
    process.exit(2);
  };
  if (!dir || !['show', 'set'].includes(command)) usage('Expected a project directory and show or set.');
  if (command === 'show' && settings.length > 0) usage('show takes no arguments.');
  if (command === 'set' && settings.length === 0) usage('set needs at least one dimension=value.');
  const projectDir = resolve(dir);
  try {
    if (command === 'set') setProjectProfile(projectDir, settings);
    console.log(show(projectDir).join('\n'));
  } catch (err) {
    if (!(err instanceof ProfileError || err instanceof ConfigError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}
