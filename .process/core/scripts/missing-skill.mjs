import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KINDS, MissingSkillError, listMissing, recordMissing } from '../lib/missing-skills.mjs';
import { ProjectRootsError } from '../lib/project-roots.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = `Usage: node missing-skill.mjs <projectDir> add --wanted <name> --kind <${KINDS.join('|')}> --doing <text> | list`;
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const [projectDir, command, ...rest] = process.argv.slice(2);
  if (!projectDir || projectDir.startsWith('--')) usage('Missing project directory.');
  if (!['add', 'list'].includes(command)) usage(`Unknown command ${command ?? '(none)'}.`);
  const FLAGS = command === 'add' ? ['--wanted', '--kind', '--doing'] : [];
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!FLAGS.includes(rest[i])) usage(`Unknown option ${rest[i]}.`);
    const value = rest[i + 1];
    if (value === undefined || value.startsWith('--')) usage(`${rest[i]} requires a value.`);
    options[rest[i].slice(2)] = value;
  }
  if (command === 'add') {
    for (const required of ['wanted', 'kind', 'doing']) if (options[required] === undefined) usage(`--${required} is required.`);
  }
  try {
    const dir = resolve(projectDir);
    if (command === 'add') {
      const row = recordMissing(dir, options);
      console.log(`recorded ${row.wanted} (${row.times} ${row.times === 1 ? 'time' : 'times'})`);
    } else {
      for (const row of listMissing(dir)) console.log(`${row.times}  ${row.kind}  ${row.wanted}  last ${row.lastAsked}  ${row.doing}`);
    }
  } catch (err) {
    if (!(err instanceof MissingSkillError || err instanceof ProjectRootsError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}
