import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCardId } from '../lib/board.mjs';
import { ConfigError } from '../lib/config.mjs';
import { PacketError, buildPacket } from '../lib/review-packet.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = 'Usage: node review-packet.mjs <projectDir> <cardId> [--base <ref>]';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const positional = [];
  /** @type {{ base?: string }} */
  const options = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      if (args[i] !== '--base') usage(`Unknown option ${args[i]}.`);
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) usage('--base requires a value.');
      if (options.base !== undefined) usage('--base given more than once.');
      options.base = value;
      i++;
    } else {
      positional.push(args[i]);
    }
  }
  const [projectDir, id] = positional;
  if (positional.length !== 2) usage('Expected a project directory and a card id.');
  if (!isCardId(id)) usage(`"${id}" is not a card id (like 0001-some-title).`);
  try {
    const result = buildPacket(resolve(projectDir), id, options);
    console.log(`packet ${result.path} sha256 ${result.sha256}`);
    console.log(`omitted: ${result.omitted} process paths`);
    for (const [section, bytes] of Object.entries(result.stageBytes)) console.log(`${section}: ${bytes}`);
  } catch (err) {
    if (err instanceof PacketError) {
      for (const f of err.findings) console.error(`${f.rule}: ${f.message}`);
      process.exit(1);
    }
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
}
